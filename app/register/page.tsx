'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BrainMark, CheckCircleIcon } from '@/components/Icons';
import { saveAccount } from '@/lib/account';

/** 登録できたあと、自動でトップへ移るまでの間（ミリ秒） */
const REDIRECT_MS = 1800;

/**
 * 供給者（経験談の提供者）の登録。
 * 運営者の目の前で本人が入力するので、認証もパスワードも置かない。
 * 入れるのは表示名とメールの2つだけ。30秒で終わることを最優先にする。
 */
export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  // 登録できたら、読める間だけ置いてトップへ送る（押したい人のためにボタンも出す）
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.push('/'), REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [done, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? '登録できませんでした');

      // このブラウザが誰なのかを覚える（認証ではない。名前を出すためだけ）
      saveAccount({
        accountId: data.accountId as string,
        username: data.username as string,
        registeredAt: new Date().toISOString(),
      });

      // 出すのは表示名だけ。account_id は本人に見せない
      setDone(data.username as string);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登録できませんでした');
    } finally {
      setSending(false);
    }
  };

  return (
    <main
      className="mx-auto flex w-full max-w-[480px] flex-col justify-center px-5 py-16"
      style={{ minHeight: '100dvh' }}
    >
      <div className="flex items-center gap-1.5 pb-8">
        <BrainMark className="h-6 w-auto text-accent" />
        <span className="text-[13px] font-medium tracking-tight text-accent-strong">Brain</span>
      </div>

      {done ? (
        <div className="flex flex-col items-center rounded-2xl border border-line bg-white px-5 py-10 text-center">
          <CheckCircleIcon className="h-12 w-12 text-accent-strong" />
          <p className="mt-4 text-[18px] font-medium text-ink">登録完了</p>
          <p className="mt-2 text-[15px] text-ink">{done}</p>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            ありがとうございます。
            <br />
            あなたの経験を必要としている人が現れたら、ご連絡します。
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 rounded-full bg-accent-strong px-6 py-2.5 text-[14px] font-medium text-white"
          >
            はじめる
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-[20px] font-medium leading-snug tracking-tight text-ink">
            経験を届ける人として登録する
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            あなたの経験を必要としている人が現れたときに、ご連絡します。
            <br />
            入力はこの2つだけです。
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-[12px] text-ink">表示名</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                経験談を読む人に、この名前で表示されます
              </span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                maxLength={40}
                disabled={sending}
                /* 16px 固定：iOS の自動ズーム防止 */
                style={{ fontSize: '16px' }}
                className="mt-2 w-full rounded-xl border border-line-strong bg-tint px-3 py-2.5 text-ink transition-colors focus:border-accent-strong focus:outline-none disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-[12px] text-ink">メールアドレス</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                ご連絡にのみ使います。他の人には表示されません
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={sending}
                style={{ fontSize: '16px' }}
                className="mt-2 w-full rounded-xl border border-line-strong bg-tint px-3 py-2.5 text-ink transition-colors focus:border-accent-strong focus:outline-none disabled:opacity-60"
              />
            </label>

            {error && <p className="text-[12px] leading-relaxed text-danger">{error}</p>}

            <button
              type="submit"
              disabled={sending || !username.trim() || !email.trim()}
              className="w-full rounded-full bg-accent-strong px-4 py-3 text-[14px] font-medium text-white transition-opacity disabled:opacity-30"
            >
              {sending ? '登録しています…' : '登録する'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
