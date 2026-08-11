import { callClaude, resolveModel } from '@/lib/anthropic';
import { extractJsonArray } from '@/lib/parse';
import { FOLLOWUP_SYSTEM_PROMPT } from '@/lib/prompt';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。短い問いを3件だけなので長くはかからない
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
      system: FOLLOWUP_SYSTEM_PROMPT,
      user,
      model: resolveModel(model),
      maxTokens: 512,
    });

    const followups = extractJsonArray(text)
      .map((raw) => (typeof raw === 'string' ? raw.trim() : ''))
      .filter((item) => item.length > 0)
      .slice(0, 3);

    return Response.json({ followups });
  } catch (error) {
    console.error('[api/followups]', error);
    const message = error instanceof Error ? error.message : '不明なエラー';
    return Response.json({ error: message }, { status: 500 });
  }
}
