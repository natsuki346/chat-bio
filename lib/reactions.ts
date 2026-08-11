import type { Reaction, ReactionTarget } from '@/types';

const STORAGE_KEY = 'chat-bio:reactions';

/*
 * 出力された1件に対する「グッド」。押したかどうかだけを持つ（集計や件数は扱わない）。
 * あとでどんな回答を好むのかを見られるように、押した中身そのものも一緒に残す。
 */
const EMPTY: Record<string, Reaction> = {};
let snapshot: Record<string, Reaction> | null = null;
const listeners = new Set<() => void>();

function read(): Record<string, Reaction> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, Reaction] =>
        typeof entry[1] === 'object' &&
        entry[1] !== null &&
        (entry[1] as Reaction).value === 'good',
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function subscribeReactions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getReactionsSnapshot(): Record<string, Reaction> {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** SSR とハイドレーション時はこちら。中身は常に空 */
export function getServerReactionsSnapshot(): Record<string, Reaction> {
  return EMPTY;
}

/** 押したら付く、もう一度押したら外れる。 */
export function toggleReaction(target: ReactionTarget): void {
  const current = getReactionsSnapshot();
  const next = { ...current };
  if (next[target.key]) delete next[target.key];
  else next[target.key] = { ...target, value: 'good', createdAt: new Date().toISOString() };

  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても本体は止めない
  }
  for (const listener of listeners) listener();
}
