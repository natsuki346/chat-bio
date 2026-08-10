import { callClaude, resolveModel } from '@/lib/anthropic';
import { extractJsonArray } from '@/lib/parse';
import { ARTICLES } from '@/lib/articles';
import type { Article } from '@/types';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。既定（10秒前後）だと途中で切られる（記事選定で実測3秒前後）
export const maxDuration = 30;

const ARTICLE_SYSTEM_PROMPT = `あなたは記事レコメンダー。ユーザーの悩みに対し、下の記事一覧から関連度の高いものを最大3件選ぶ。

■記事一覧（index: タイトル / キーワード）
${ARTICLES.map((article, index) => `${index}: ${article.title} / ${article.keywords}`).join('\n')}

■出力ルール（厳守）
関連する記事だけをJSON配列で返す。関連度が高い順。最大3件。関連が薄いものは無理に入れない（0件なら空配列 []）。
各要素:
"index" 記事一覧の番号（整数）
"why" その悩みにこの記事が刺さる理由を30字以内
JSON配列のみ出力。前置き不要。`;

export async function POST(request: Request) {
  let query: unknown;
  let model: unknown;

  try {
    const body = await request.json();
    query = body?.query;
    model = body?.model;
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (typeof query !== 'string' || !query.trim()) {
    return Response.json({ error: '悩みを入力してください' }, { status: 400 });
  }

  try {
    const text = await callClaude({
      system: ARTICLE_SYSTEM_PROMPT,
      user: query.trim(),
      model: resolveModel(model),
      maxTokens: 1024,
    });

    const seen = new Set<number>();
    const articles: Article[] = [];

    for (const raw of extractJsonArray(text)) {
      if (typeof raw !== 'object' || raw === null) continue;
      const item = raw as Record<string, unknown>;
      const index = typeof item.index === 'number' ? item.index : Number(item.index);
      if (!Number.isInteger(index) || index < 0 || index >= ARTICLES.length || seen.has(index)) continue;
      seen.add(index);
      // URL・タイトルは必ず手元のデータから取る（生成結果は why のみ採用）
      articles.push({
        ...ARTICLES[index],
        why: typeof item.why === 'string' ? item.why.trim() : undefined,
      });
      if (articles.length === 3) break;
    }

    return Response.json({ articles });
  } catch (error) {
    console.error('[api/articles]', error);
    // 記事は補助情報なので、失敗しても空配列で返して本体を止めない
    return Response.json({ articles: [] });
  }
}
