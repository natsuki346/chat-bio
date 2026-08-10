import type { DirectMessage } from '@/types';

const STORAGE_KEY = 'chat-bio:messages';
const MAX_MESSAGES = 500;

/*
 * DM も localStorage 保存。records と同じく useSyncExternalStore で読む。
 * ※この端末の中だけに残る。相手には届かない（送信バックエンドは未実装）
 */
const EMPTY: DirectMessage[] = [];
let snapshot: DirectMessage[] | null = null;
const listeners = new Set<() => void>();

function read(): DirectMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DirectMessage =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as DirectMessage).id === 'string' &&
        typeof (item as DirectMessage).text === 'string',
    );
  } catch {
    return [];
  }
}

export function subscribeMessages(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMessagesSnapshot(): DirectMessage[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

export function getServerMessagesSnapshot(): DirectMessage[] {
  return EMPTY;
}

export function sendMessage(message: Omit<DirectMessage, 'id' | 'createdAt'>): void {
  const next: DirectMessage = {
    ...message,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  snapshot = [...getMessagesSnapshot(), next].slice(-MAX_MESSAGES);
  persist();
}

/** カードの承認状態を変える。 */
export function updateMessage(id: string, patch: Partial<DirectMessage>): void {
  snapshot = getMessagesSnapshot().map((message) =>
    message.id === id ? { ...message, ...patch } : message,
  );
  persist();
}

/** ある相手とのやり取りをまるごと消す。 */
export function deleteThread(person: string): void {
  snapshot = getMessagesSnapshot().filter((message) => message.person !== person);
  persist();
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 保存できなくても本体は止めない
  }
  for (const listener of listeners) listener();
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}
