import type { RegisteredAccount } from '@/types';

const STORAGE_KEY = 'chat-bio:account';

/*
 * このブラウザで登録した人を覚えておくだけの入れ物。
 *
 * 認証ではない。ログインもセッションもなく、ただ「登録した」という事実を残して
 * 画面の隅に名前を出すために使う。別の端末で開けば当然からっぽになる。
 */
const listeners = new Set<() => void>();
let snapshot: RegisteredAccount | null | undefined;

function read(): RegisteredAccount | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    /*
     * 中身は accountId で持つが、DB の列名に合わせて account_id で
     * 手で入れられていることがある。どちらの書き方でも読めるようにしておく
     * （名前が出ないと「登録できていない」ように見えてしまうため）。
     */
    const item = parsed as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' && value ? value : '');
    const accountId = text(item.accountId) || text(item.account_id);
    const username = text(item.username);
    if (!accountId || !username) return null;

    return {
      accountId,
      username,
      registeredAt: text(item.registeredAt) || text(item.registered_at),
    };
  } catch {
    return null;
  }
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccountSnapshot(): RegisteredAccount | null {
  if (snapshot === undefined) snapshot = read();
  return snapshot;
}

/** SSR とハイドレーション時はこちら。中身は常に空 */
export function getServerAccountSnapshot(): RegisteredAccount | null {
  return null;
}

export function saveAccount(account: RegisteredAccount): void {
  snapshot = account;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  } catch {
    // 保存できなくても登録自体は済んでいるので止めない
  }
  for (const listener of listeners) listener();
}

export function clearAccount(): void {
  snapshot = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても本体は止めない
  }
  for (const listener of listeners) listener();
}
