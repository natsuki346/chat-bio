import Anthropic from '@anthropic-ai/sdk';
import type { ModelId } from '@/types';

const BACKOFF_MS = [500, 1000, 1500];
const MAX_ATTEMPTS = 3;

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-6';

const MODEL_IDS: ModelId[] = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'];

export function resolveModel(value: unknown): ModelId {
  return MODEL_IDS.includes(value as ModelId) ? (value as ModelId) : DEFAULT_MODEL;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が設定されていません（.env.local を確認）');
  }
  if (!client) {
    // maxRetries: 0 — リトライは下の callClaude が担当する（二重リトライを避ける）
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  }
  return client;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type CallOptions = {
  system: string;
  user: string;
  model?: ModelId;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
};

/**
 * システムプロンプトはリクエストごとに同一なのでキャッシュさせる。
 * 2回目以降は入力の処理をやり直さない分、最初の1文字が出るまでが速くなる。
 * ※キャッシュが効く最小長はモデル依存（Sonnet 4.6 は1024トークン、Haiku 4.5 / Opus 4.6 は4096トークン）。
 *   下回るモデルでは黙って無視されるだけでエラーにはならない。
 */
function cachedSystem(system: string) {
  return [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }];
}

/** 経験を引いて整形するだけの用途なので、既定の high まで考え込ませない。 */
const DEFAULT_EFFORT = 'low' as const;

/** Haiku 4.5 は effort 非対応で、送ると 400 が返る。対応モデルにだけ付ける。 */
const EFFORT_UNSUPPORTED: ModelId[] = ['claude-haiku-4-5'];

function outputConfig(model: ModelId, effort: NonNullable<CallOptions['effort']>) {
  return EFFORT_UNSUPPORTED.includes(model) ? {} : { output_config: { effort } };
}

/** Claude を叩いてテキストを返す。3回までリトライ（バックオフ 500ms / 1000ms / 1500ms）。 */
export async function callClaude({
  system,
  user,
  model,
  maxTokens = 4096,
  effort = DEFAULT_EFFORT,
}: CallOptions): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await getClient().messages.create({
        model: model ?? DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: cachedSystem(system),
        ...outputConfig(model ?? DEFAULT_MODEL, effort),
        messages: [{ role: 'user', content: user }],
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      if (!text.trim()) throw new Error('Claude が空の応答を返した');
      return text;
    } catch (error) {
      lastError = error;
      // 認証・リクエスト不正はリトライしても直らない
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.BadRequestError) {
        throw error;
      }
      if (attempt < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Claude を叩いてテキストの差分を順に流す。
 * リトライは「まだ1文字も流していない」間だけ。流し始めた後はやり直せないのでそのまま投げる。
 */
export async function* streamClaude({
  system,
  user,
  model,
  maxTokens = 4096,
  effort = DEFAULT_EFFORT,
}: CallOptions): AsyncGenerator<string> {
  const client = getClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let emitted = false;

    try {
      const stream = client.messages.stream({
        model: model ?? DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: cachedSystem(system),
        ...outputConfig(model ?? DEFAULT_MODEL, effort),
        messages: [{ role: 'user', content: user }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          emitted = true;
          yield event.delta.text;
        }
      }

      if (!emitted) throw new Error('Claude が空の応答を返した');
      return;
    } catch (error) {
      lastError = error;
      if (emitted) throw error;
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.BadRequestError) {
        throw error;
      }
      if (attempt < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
