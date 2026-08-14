import { migrateLegacyRecords } from './migrate';
import type { ChatTurn, HistoryEntry } from '@/types';

const STORAGE_KEY = 'chat-bio:history';

/*
 * 「何を打って何を聞いたか」の記録。相談するたびに自動で溜まる。
 * マイカード（lib/records.ts）とは別物で、こちらは消したり印を付けたりしない素のログ。
 */
const EMPTY: HistoryEntry[] = [];
let snapshot: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistoryEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as HistoryEntry).id === 'string' &&
        typeof (item as HistoryEntry).query === 'string',
    );
  } catch {
    return [];
  }
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHistorySnapshot(): HistoryEntry[] {
  migrateLegacyRecords();
  if (snapshot === null) snapshot = read();
  return snapshot;
}

export function getServerHistorySnapshot(): HistoryEntry[] {
  return EMPTY;
}

/**
 * 相談は件数で打ち切らずに全部残す。
 * localStorage が一杯になったときだけ、古いものから順に「やり取り本体」を落として容量を作る。
 * それでも入らなければ古い項目自体を落とす。新しいものは必ず残す。
 */
function persist(entries: HistoryEntry[]): HistoryEntry[] {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return entries;
  } catch {
    // 1. 古い順にやり取り本体を落とす（打った文面と日時は残す）
    const lightened = [...entries];
    for (let i = lightened.length - 1; i >= 0; i--) {
      const entry = lightened[i];
      if (!entry?.turn && !entry?.turns) continue;
      lightened[i] = { ...entry, turn: undefined, turns: undefined };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lightened));
        return lightened;
      } catch {
        // まだ入らない
      }
    }

    // 2. それでも駄目なら古い項目から捨てる
    const kept = [...lightened];
    while (kept.length > 1) {
      kept.pop();
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
        return kept;
      } catch {
        // まだ入らない
      }
    }
    return kept;
  }
}

export function updateHistory(next: (prev: HistoryEntry[]) => HistoryEntry[]): void {
  snapshot = persist(next(getHistorySnapshot()));
  for (const listener of listeners) listener();
}

/**
 * 保存済みのやり取りを、いまの形に揃える。
 * 後から足したフィールド（followups など）は古い記録に無く、
 * そのまま描画すると undefined を読んで落ちるので、ここで既定値を埋める。
 */
function normalize(turn: ChatTurn): ChatTurn {
  return {
    ...turn,
    experiences: turn.experiences ?? [],
    people: turn.people ?? [],
    articles: turn.articles ?? [],
    followups: turn.followups ?? [],
    steps: turn.steps ?? [],
  };
}

/** その相談のやり取りを順に取り出す。1往復だった頃の記録も混ぜて読めるようにする。 */
export function historyTurns(entry: HistoryEntry): ChatTurn[] {
  if (entry.turns?.length) return entry.turns.map(normalize);
  return entry.turn ? [normalize(entry.turn)] : [];
}

/** 履歴の名前を付け直す。空にしたら元の文面に戻す。 */
export function renameHistory(id: string, title: string): void {
  const next = title.trim();
  updateHistory((prev) =>
    prev.map((entry) => (entry.id === id ? { ...entry, title: next || undefined } : entry)),
  );
}

/** 一覧の先頭に固定する／外す。 */
export function togglePinHistory(id: string): void {
  updateHistory((prev) =>
    prev.map((entry) => (entry.id === id ? { ...entry, pinned: !entry.pinned } : entry)),
  );
}

/** アーカイブに寄せる／戻す。中身は消えない。 */
export function toggleArchiveHistory(id: string): void {
  updateHistory((prev) =>
    prev.map((entry) =>
      // アーカイブしたものが先頭に固定されたままだと分かりにくいので、ピンは外す
      entry.id === id ? { ...entry, archived: !entry.archived, pinned: false } : entry,
    ),
  );
}

/** 相談とその結果を、そのまま貼れる文章にする。 */
export function historyToText(entry: HistoryEntry): string {
  const lines: string[] = [];
  if (entry.title) lines.push(entry.title, '');
  lines.push(`相談: ${entry.query}`);

  const turns = historyTurns(entry);
  turns.forEach((turn, index) => {
    // 2件目以降は、どの質問への話なのかが分かるように見出しを挟む
    if (index > 0) lines.push('', `--- ${turn.query}`);
    if (turn.mode === 'person') {
      for (const hit of turn.people) lines.push('', `「${hit.quote}」`);
    } else {
      for (const item of turn.experiences) {
        lines.push('', `【${item.title}】`, item.body, `→ ${item.point}`);
      }
    }
  });
  return lines.join('\n');
}

/** 対話履歴を1件消す。マイカードは別ストアなので影響しない。 */
export function deleteHistory(id: string): void {
  updateHistory((prev) => prev.filter((entry) => entry.id !== id));
}

/** 対話履歴をすべて消す。マイカードは残る。 */
export function clearHistory(): void {
  updateHistory(() => []);
}
