import { resolveModel, streamClaude } from '@/lib/anthropic';
import { extractJsonArray, parsePartialJsonArray } from '@/lib/parse';
import { PERSON_SYSTEM_PROMPT, SYSTEM_PROMPT } from '@/lib/prompt';
import { DEFAULT_PERSON } from '@/lib/people';
import type { Experience, PersonHit, SearchMode } from '@/types';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。既定（10秒前後）だと途中で切られる（経験談3件のストリーミングで実測15〜17秒）
export const maxDuration = 60;

function resolveMode(value: unknown): SearchMode {
  return value === 'person' ? 'person' : 'experience';
}

/**
 * マッチ度。0〜100の整数に丸める。
 * モデルが数値を出さない／範囲外を出すことがあるので、読めないときは undefined にして表示側に任せる。
 */
function toScore(raw: unknown): number | undefined {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toExperience(raw: unknown): Experience | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const { label, title, body, point } = item;
  if (
    typeof label !== 'string' ||
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    typeof point !== 'string'
  ) {
    return null;
  }
  return {
    label: label.trim(),
    title: title.trim(),
    body: body.trim(),
    point: point.trim(),
    score: toScore(item.score),
    person: typeof item.person === 'string' ? item.person : DEFAULT_PERSON,
  };
}

/** ストリーミング途中用。届いていないフィールドは空文字にして、来た分だけ表示させる。 */
function toPartialExperience(raw: unknown): Experience | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const experience: Experience = {
    label: text(item.label),
    title: text(item.title),
    body: text(item.body),
    point: text(item.point),
    score: toScore(item.score),
    person: typeof item.person === 'string' ? item.person : DEFAULT_PERSON,
  };
  const empty = !experience.label && !experience.title && !experience.body && !experience.point;
  return empty ? null : experience;
}

function toPersonHit(raw: unknown, { partial }: { partial: boolean }): PersonHit | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const quote = typeof item.quote === 'string' ? item.quote : partial ? '' : null;
  if (quote === null) return null;
  if (partial && !quote) return null;
  return {
    quote: quote.trim().replace(/^[「『]|[」』]$/g, ''),
    person: typeof item.person === 'string' ? item.person : DEFAULT_PERSON,
  };
}

export async function POST(request: Request) {
  let query: unknown;
  let model: unknown;
  let mode: SearchMode = 'experience';

  try {
    const body = await request.json();
    query = body?.query;
    model = body?.model;
    mode = resolveMode(body?.mode);
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (typeof query !== 'string' || !query.trim()) {
    return Response.json({ error: '悩みを入力してください' }, { status: 400 });
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

      // モードごとに、プロンプトと1件あたりの形だけが変わる
      const isPerson = mode === 'person';
      const present = <T,>(item: T | null): item is T => item !== null;
      const pick = (items: unknown[], partial: boolean) =>
        isPerson
          ? {
              mode,
              people: items
                .map((item) => toPersonHit(item, { partial }))
                .filter(present)
                .slice(0, 3),
            }
          : {
              mode,
              experiences: items
                .map((item) => (partial ? toPartialExperience(item) : toExperience(item)))
                .filter(present)
                // 並べ替えは確定時だけ。流している最中に入れ替えると読んでいるカードが動く
                .sort((a, b) => (partial ? 0 : (b.score ?? -1) - (a.score ?? -1)))
                .slice(0, 3),
            };

      try {
        for await (const chunk of streamClaude({
          system: isPerson ? PERSON_SYSTEM_PROMPT : SYSTEM_PROMPT,
          user: (query as string).trim(),
          model: resolveModel(model),
          // 一言だけなら出力が短いので上限も絞る
          maxTokens: isPerson ? 1024 : 4096,
        })) {
          if (closed) break;
          text += chunk;

          const partial = parsePartialJsonArray(text);
          if (!partial) continue;

          const payload = pick(partial, true);

          // 中身が変わったときだけ流す
          const serialized = JSON.stringify(payload);
          if (serialized === lastSent) continue;
          lastSent = serialized;
          send({ type: 'update', ...payload });
        }

        const payload = pick(extractJsonArray(text), false);
        const count = (isPerson ? payload.people : payload.experiences)?.length ?? 0;

        if (count === 0) {
          throw new Error(
            isPerson
              ? '一言を取り出せませんでした。もう一度試してください'
              : '経験を取り出せませんでした。もう一度試してください',
          );
        }

        send({ type: 'done', ...payload });
      } catch (error) {
        console.error('[api/chat]', error);
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
