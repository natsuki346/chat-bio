import { callClaude, resolveModel } from '@/lib/anthropic';
import { extractJsonArray } from '@/lib/parse';
import { RESOLUTION_SYSTEM_PROMPT } from '@/lib/prompt';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。既定（10秒前後）だと途中で切られる（要約で実測5秒前後）
export const maxDuration = 30;

export async function POST(request: Request) {
  let query: unknown;
  let seen: unknown;
  let chat: unknown;
  let model: unknown;

  try {
    const body = await request.json();
    query = body?.query;
    seen = body?.seen;
    chat = body?.chat;
    model = body?.model;
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (typeof query !== 'string' || !query.trim()) {
    return Response.json({ error: '相談内容がありません' }, { status: 400 });
  }

  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  const seenLines = list(seen);
  const chatLines = list(chat);

  const user = [
    `相談内容：${query.trim()}`,
    seenLines.length > 0
      ? `そのとき返ってきた話：\n${seenLines.join('\n')}`
      : 'そのとき返ってきた話：（記録が残っていない）',
    chatLines.length > 0 ? `相手とのやり取り：\n${chatLines.join('\n')}` : '相手とのやり取り：（まだ無い）',
  ].join('\n\n');

  try {
    const text = await callClaude({
      system: RESOLUTION_SYSTEM_PROMPT,
      user,
      model: resolveModel(model),
      maxTokens: 1024,
    });

    const resolution = extractJsonArray(text)
      .map((raw) => {
        if (typeof raw !== 'object' || raw === null) return null;
        const value = (raw as Record<string, unknown>).resolution;
        return typeof value === 'string' && value.trim() ? value.trim() : null;
      })
      .find((item): item is string => item !== null);

    if (!resolution) {
      return Response.json({ error: 'まとめを作れませんでした' }, { status: 502 });
    }

    return Response.json({ resolution });
  } catch (error) {
    console.error('[api/resolution]', error);
    const message = error instanceof Error ? error.message : '不明なエラー';
    return Response.json({ error: message }, { status: 500 });
  }
}
