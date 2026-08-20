import { resolveModel, streamClaude } from '@/lib/anthropic';
import { extractJsonArray, parsePartialJsonArray } from '@/lib/parse';
import { MATCH_SYSTEM_PROMPT, MATCH_TONE_PROMPTS } from '@/lib/prompt';
import { withAttachments } from '@/lib/attachments';
import { getAdminSupabase, one } from '@/lib/supabase';
import type { Attachment, Experience, Tone } from '@/types';

export const runtime = 'nodejs';
// Vercel の関数タイムアウト。既定（10秒前後）だと途中で切られる
export const maxDuration = 60;

/** これ未満のマッチ度は需要者の画面に出さない。代わりに unmatched_logs に残す */
const MATCH_THRESHOLD = 50;
/** 一度にモデルへ渡す経験談の上限。フェーズ1の規模では全件入る */
const MAX_CANDIDATES = 200;

function resolveTone(value: unknown): Tone {
  return value === 'friend' || value === 'expert' ? value : 'mentor';
}

/** 添付は名前と中身だけ受け取る。読めない形で来たものは捨てる。 */
function resolveAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Attachment =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Attachment).name === 'string' &&
        typeof (item as Attachment).text === 'string',
    )
    .slice(0, 5);
}

/** 登録されている経験談1件。モデルには連番で渡す（uuid を書き写させると間違える） */
type Candidate = {
  index: number;
  experienceId: string;
  accountId: string;
  username: string;
  tags: string[];
  content: string;
};

async function loadCandidates(): Promise<Candidate[]> {
  const { data, error } = await getAdminSupabase()
    .from('experiences')
    .select('experience_id, account_id, tags, content, suppliers(username)')
    .order('created_at', { ascending: true })
    .limit(MAX_CANDIDATES);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row, position) => ({
    index: position + 1,
    experienceId: row.experience_id as string,
    accountId: row.account_id as string,
    username: one<{ username: string }>(row.suppliers)?.username ?? '',
    tags: (row.tags as string[] | null) ?? [],
    content: row.content as string,
  }));
}

/** 経験談の一覧を、そのまま読める形にしてモデルに渡す */
function corpus(candidates: Candidate[]): string {
  return candidates
    .map((item) =>
      [
        `--- id: ${item.index}`,
        item.tags.length > 0 ? `タグ: ${item.tags.join('、')}` : 'タグ: （未設定）',
        '本文:',
        item.content,
      ].join('\n'),
    )
    .join('\n\n');
}

/** モデルが返す採点。本文は書かせない（提供者本人の言葉をそのまま出すため） */
type Scored = { index: number; score: number; label: string; title: string; point: string };

function toScore(raw: unknown): number | null {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toIndex(raw: unknown): number | null {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function toScored(raw: unknown): Scored | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const index = toIndex(item.id);
  const score = toScore(item.score);
  if (index === null || score === null) return null;

  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  return {
    index,
    score,
    label: text(item.label),
    title: text(item.title),
    point: text(item.point),
  };
}

/** 採点済みの1件を、画面に出す形に組み立てる。本文は必ずDBのものをそのまま使う */
function toExperience(scored: Scored, candidate: Candidate): Experience {
  return {
    label: scored.label,
    title: scored.title,
    body: candidate.content,
    point: scored.point,
    score: scored.score,
    person: candidate.accountId,
    experienceId: candidate.experienceId,
    personName: candidate.username,
    // 供給者には handle を持たせていないので、表示名から作る
    personHandle: candidate.username ? `@${candidate.username}` : undefined,
  };
}

/** マッチしなかった相談を残す。ここが失敗しても本体は止めない */
async function logUnmatched(query: string, topScore: number | null): Promise<void> {
  try {
    await getAdminSupabase().from('unmatched_logs').insert({ query, top_score: topScore });
  } catch (error) {
    console.error('[api/chat] unmatched_logs', error);
  }
}

export async function POST(request: Request) {
  let query: unknown;
  let model: unknown;
  let tone: Tone = 'mentor';
  let attachments: Attachment[] = [];

  try {
    const body = await request.json();
    query = body?.query;
    model = body?.model;
    tone = resolveTone(body?.tone);
    attachments = resolveAttachments(body?.attachments);
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (typeof query !== 'string' || !query.trim()) {
    return Response.json({ error: '悩みを入力してください' }, { status: 400 });
  }

  const asked = query.trim();
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

      try {
        const candidates = await loadCandidates();
        const byIndex = new Map(candidates.map((item) => [item.index, item]));

        // 経験談がまだ1件も入っていない。何が足りないかだけ残して終わる
        if (candidates.length === 0) {
          await logUnmatched(asked, null);
          send({ type: 'done', experiences: [] });
          return;
        }

        const user = [
          `相談者の悩み：\n${withAttachments(asked, attachments)}`,
          '',
          '登録されている経験談：',
          corpus(candidates),
        ].join('\n');

        let text = '';
        let lastSent = '';

        /** 採点済みを画面用に直す。partial のときは閾値を超えたものだけ流す */
        const pick = (items: unknown[]) => {
          const scored = items
            .map(toScored)
            .filter((item): item is Scored => item !== null)
            .map((item) => {
              const candidate = byIndex.get(item.index);
              return candidate ? { item, candidate } : null;
            })
            .filter((pair): pair is { item: Scored; candidate: Candidate } => pair !== null);

          return scored;
        };

        for await (const chunk of streamClaude({
          system: MATCH_SYSTEM_PROMPT,
          // 語り口は見出しの言い回しにだけ効く。本文は提供者の言葉なので触らない
          systemSuffix: MATCH_TONE_PROMPTS[tone],
          user,
          model: resolveModel(model),
          maxTokens: 2048,
          effort: 'medium',
        })) {
          if (closed) break;
          text += chunk;

          const partial = parsePartialJsonArray(text);
          if (!partial) continue;

          // 流している最中は、見せると決まったもの（閾値以上）だけを出す
          const experiences = pick(partial)
            .filter(({ item }) => item.score >= MATCH_THRESHOLD)
            .slice(0, 3)
            .map(({ item, candidate }) => toExperience(item, candidate));

          const payload = { experiences };
          const serialized = JSON.stringify(payload);
          if (serialized === lastSent) continue;
          lastSent = serialized;
          send({ type: 'update', ...payload });
        }

        const all = pick(extractJsonArray(text));
        const topScore = all.reduce((max, { item }) => Math.max(max, item.score), 0);

        const experiences = all
          .filter(({ item }) => item.score >= MATCH_THRESHOLD)
          .sort((a, b) => b.item.score - a.item.score)
          .slice(0, 3)
          .map(({ item, candidate }) => toExperience(item, candidate));

        // 閾値を超えるものが無かった＝この悩みに応えられる経験談が足りていない
        if (experiences.length === 0) {
          await logUnmatched(asked, all.length > 0 ? topScore : null);
        }

        send({ type: 'done', experiences });
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
