import { callClaude, resolveModel } from '@/lib/anthropic';
import { extractJsonArray } from '@/lib/parse';
import { REPORT_SYSTEM_PROMPT } from '@/lib/prompt';
import type { MatchReport } from '@/types';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。既定（10秒前後）だと途中で切られる（レポート生成で実測12〜13秒）
export const maxDuration = 60;

function toReport(raw: unknown): MatchReport | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const { matchReason, problem, thinking, reason, greeting } = item;
  if (
    typeof matchReason !== 'string' ||
    typeof problem !== 'string' ||
    typeof thinking !== 'string' ||
    typeof reason !== 'string' ||
    typeof greeting !== 'string'
  ) {
    return null;
  }
  return {
    matchReason: matchReason.trim(),
    card: { problem: problem.trim(), thinking: thinking.trim(), reason: reason.trim() },
    greeting: greeting.trim(),
  };
}

export async function POST(request: Request) {
  let query: unknown;
  let about: unknown;
  let personName: unknown;
  let model: unknown;

  try {
    const body = await request.json();
    query = body?.query;
    about = body?.about;
    personName = body?.personName;
    model = body?.model;
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (typeof query !== 'string' || !query.trim()) {
    return Response.json({ error: '相談内容がありません' }, { status: 400 });
  }

  const user = [
    `相談者が入力した悩み：${query.trim()}`,
    typeof about === 'string' && about.trim()
      ? `相談者に対して出力された相手の経験：${about.trim()}`
      : '相談者に対して出力された相手の経験：（特定の経験ではなく、この人自体に反応した）',
    typeof personName === 'string' && personName.trim() ? `相手の名前：${personName.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const text = await callClaude({
      system: REPORT_SYSTEM_PROMPT,
      user,
      model: resolveModel(model),
      maxTokens: 2048,
    });

    const report = extractJsonArray(text)
      .map(toReport)
      .find((item): item is MatchReport => item !== null);

    if (!report) {
      return Response.json({ error: 'レポートを作れませんでした。もう一度試してください' }, { status: 502 });
    }

    return Response.json({ report });
  } catch (error) {
    console.error('[api/report]', error);
    const message = error instanceof Error ? error.message : '不明なエラー';
    return Response.json({ error: message }, { status: 500 });
  }
}
