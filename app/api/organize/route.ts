import { resolveModel, streamClaude } from '@/lib/anthropic';
import { extractJsonArray, parsePartialJsonArray } from '@/lib/parse';
import { ORGANIZE_SYSTEM_PROMPT, ORGANIZE_TONE_PROMPTS } from '@/lib/prompt';
import type { OrganizeMessage, Tone } from '@/types';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。1往復ぶんの質問とカードだけなので長くはかからない
export const maxDuration = 60;

type Reply = {
  reply: string;
  title: string;
  summary: string;
  background: string;
  problems: string[];
  wants: string[];
  ready: boolean;
};

function texts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 4);
}

function toReply(raw: unknown): Reply | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const reply = text(item.reply);
  if (!reply) return null;

  return {
    reply,
    title: text(item.title),
    summary: text(item.summary),
    background: text(item.background),
    problems: texts(item.problems),
    wants: texts(item.wants),
    ready: item.ready === true,
  };
}

/**
 * ストリーミング途中用。届いていないフィールドは空のままにして、来た分だけ表示させる。
 * ready はまだ書きかけの値を信じて経験者に出していい／悪いを早合点させたくないので、確定するまでは常に false。
 */
function toPartialReply(raw: unknown): Reply | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const reply: Reply = {
    reply: text(item.reply),
    title: text(item.title),
    summary: text(item.summary),
    background: text(item.background),
    problems: texts(item.problems),
    wants: texts(item.wants),
    ready: false,
  };
  const empty = !reply.reply && !reply.title && !reply.summary && !reply.background;
  return empty ? null : reply;
}

function resolveTone(value: unknown): Tone {
  return value === 'friend' || value === 'expert' ? value : 'mentor';
}

/** やり取りを、そのまま読める1本の文章にしてモデルに渡す。 */
function transcript(messages: OrganizeMessage[]): string {
  return messages
    .map((message) => `${message.role === 'user' ? '相談者' : '整理役'}: ${message.text}`)
    .join('\n');
}

export async function POST(request: Request) {
  let messages: OrganizeMessage[] = [];
  let model: unknown;
  let tone: Tone = 'mentor';

  try {
    const body = await request.json();
    model = body?.model;
    tone = resolveTone(body?.tone);
    messages = Array.isArray(body?.messages)
      ? body.messages.filter(
          (item: unknown): item is OrganizeMessage =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as OrganizeMessage).text === 'string',
        )
      : [];
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (messages.length === 0) {
    return Response.json({ error: '整理するやり取りがありません' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // クライアントが切断済み
          closed = true;
        }
      };

      let text = '';
      let lastSent = '';

      try {
        for await (const chunk of streamClaude({
          system: ORGANIZE_SYSTEM_PROMPT,
          // 変えるのは喋り方だけ。聞き手であることは動かさない
          systemSuffix: ORGANIZE_TONE_PROMPTS[tone],
          user: transcript(messages),
          model: resolveModel(model),
          maxTokens: 2048,
          // 何を聞くかを選ぶ仕事なので、引くだけの用途より少し考えさせる
          effort: 'medium',
        })) {
          if (closed) break;
          text += chunk;

          const partialArray = parsePartialJsonArray(text);
          if (!partialArray) continue;

          const partial = partialArray.map(toPartialReply).find((item): item is Reply => item !== null);
          if (!partial) continue;

          // 中身が変わったときだけ流す
          const serialized = JSON.stringify(partial);
          if (serialized === lastSent) continue;
          lastSent = serialized;
          send({ type: 'update', ...partial });
        }

        const parsed = extractJsonArray(text).map(toReply).find((item): item is Reply => item !== null);
        if (!parsed) throw new Error('整理できませんでした。もう一度試してください');

        send({ type: 'done', ...parsed });
      } catch (error) {
        console.error('[api/organize]', error);
        const message = error instanceof Error ? error.message : '不明なエラー';
        send({ type: 'error', error: message });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // すでに閉じている
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // nginx などのバッファリングでチャンクが溜まらないように
      'X-Accel-Buffering': 'no',
    },
  });
}
