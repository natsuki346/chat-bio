import { callClaude, resolveModel } from '@/lib/anthropic';
import { extractJsonArray } from '@/lib/parse';
import { SUMMARY_SYSTEM_PROMPT } from '@/lib/prompt';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。見出しと概要だけなので短い
export const maxDuration = 30;

export async function POST(request: Request) {
  let query: unknown;
  let seen: unknown;
  let model: unknown;

  try {
    const body = await request.json();
    query = body?.query;
    seen = body?.seen;
    model = body?.model;
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (typeof query !== 'string' || !query.trim()) {
    return Response.json({ error: '相談内容がありません' }, { status: 400 });
  }

  const lines = Array.isArray(seen)
    ? seen.filter((item): item is string => typeof item === 'string')
    : [];

  const user = [
    `相談内容：${query.trim()}`,
    lines.length > 0 ? `返ってきた話：\n${lines.join('\n')}` : '返ってきた話：（記録なし）',
  ].join('\n\n');

  try {
    const text = await callClaude({
      system: SUMMARY_SYSTEM_PROMPT,
      user,
      model: resolveModel(model),
      maxTokens: 512,
    });

    const summary = extractJsonArray(text)
      .map((raw) => {
        if (typeof raw !== 'object' || raw === null) return null;
        const item = raw as Record<string, unknown>;
        const { title, overview } = item;
        if (typeof title !== 'string' || !title.trim()) return null;
        return {
          title: title.trim(),
          overview: typeof overview === 'string' ? overview.trim() : '',
        };
      })
      .find((item): item is { title: string; overview: string } => item !== null);

    if (!summary) {
      return Response.json({ error: '見出しを作れませんでした' }, { status: 502 });
    }

    return Response.json(summary);
  } catch (error) {
    console.error('[api/summary]', error);
    const message = error instanceof Error ? error.message : '不明なエラー';
    return Response.json({ error: message }, { status: 500 });
  }
}
