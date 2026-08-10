import { migrateLegacyRecords } from './migrate';
import type { ChatRecord, RecordStatus } from '@/types';

export const STATUS_LABEL: Record<RecordStatus, string> = {
  open: '未解決',
  resolved: '解決済み',
};

const STORAGE_KEY = 'chat-bio:records';

/** 相談内容から「お題」を作る。今はローカルで切り出すだけ（モデルは使わない）。 */
export function deriveTitle(query: string): string {
  const text = query.replace(/\s+/g, ' ').trim();
  if (!text) return '無題の相談';
  // 文の切れ目があればそこまで
  const head = text.split(/[。？！?!\n]/)[0]?.trim() || text;
  return head.length <= 20 ? head : `${head.slice(0, 20)}…`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function read(): ChatRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 壊れた項目は落とす（保存形式が変わっても落ちないように）
    return parsed
      .filter(
        (item): item is ChatRecord =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ChatRecord).id === 'string' &&
          typeof (item as ChatRecord).query === 'string',
      )
      // status は後から足したフィールドなので、古い記録には既定値を入れる
      .map((item) => ({ ...item, status: item.status === 'resolved' ? 'resolved' : 'open' }));
  } catch {
    return [];
  }
}

/*
 * localStorage は React の外にある状態なので、useSyncExternalStore で読む。
 * snapshot は同じ参照を返し続ける必要があるのでキャッシュしておく。
 */
const EMPTY: ChatRecord[] = [];
let snapshot: ChatRecord[] | null = null;
const listeners = new Set<() => void>();

export function subscribeRecords(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRecordsSnapshot(): ChatRecord[] {
  migrateLegacyRecords();
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** SSR とハイドレーション時はこちら。中身は常に空 */
export function getServerRecordsSnapshot(): ChatRecord[] {
  return EMPTY;
}

export function updateRecords(next: (prev: ChatRecord[]) => ChatRecord[]): void {
  snapshot = next(getRecordsSnapshot());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 保存できなくても本体は止めない（カードは軽いので基本は起きない）
  }
  for (const listener of listeners) listener();
}

/** カードを1件消す。対話履歴には影響しない。 */
export function deleteRecord(id: string): void {
  updateRecords((prev) => prev.filter((record) => record.id !== id));
}
