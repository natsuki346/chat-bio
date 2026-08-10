import type { ChatRecord, HistoryEntry } from '@/types';

const HISTORY_KEY = 'chat-bio:history';
const RECORDS_KEY = 'chat-bio:records';
const BACKUP_KEY = 'chat-bio:records.bak';

let done = false;

/**
 * 履歴とマイカードを分ける前は、相談ログが records に入っていた。
 * 中身は対話履歴なので、そのまま履歴へ移す（マイカードは自分で作るものなので空にする）。
 * 念のため元データは .bak に退避してから移す。1回だけ動く。
 */
export function migrateLegacyRecords(): void {
  if (done || typeof window === 'undefined') return;
  done = true;

  try {
    // 履歴キーがある＝分離後に動いているので何もしない
    if (window.localStorage.getItem(HISTORY_KEY) !== null) return;

    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return;

    const legacy: unknown = JSON.parse(raw);
    if (!Array.isArray(legacy) || legacy.length === 0) return;

    const history: HistoryEntry[] = legacy
      .filter(
        (item): item is ChatRecord & { turn?: HistoryEntry['turn'] } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ChatRecord).id === 'string' &&
          typeof (item as ChatRecord).query === 'string',
      )
      .map((item) => ({
        id: item.id,
        query: item.query,
        mode: item.mode === 'person' ? 'person' : 'experience',
        createdAt: item.createdAt ?? new Date().toISOString(),
        count: typeof item.count === 'number' ? item.count : 0,
        summary: item.summary,
        turn: item.turn,
      }));

    if (history.length === 0) return;

    window.localStorage.setItem(BACKUP_KEY, raw);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    window.localStorage.setItem(RECORDS_KEY, '[]');
  } catch {
    // 移行に失敗しても本体は止めない
  }
}
