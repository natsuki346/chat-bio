import { getAdminSupabase, hasAdminKey, one } from '@/lib/supabase';
import { addExperience, setConnectStatus } from './actions';
import type { ConnectRequest, StoredExperience, Supplier, UnmatchedLog } from '@/types';

/*
 * 運営者用の管理画面。装飾はしない。データが見えて操作できればよい。
 *
 * サーバー側で直接読む。メールアドレスや押下ログを公開のAPIに載せないための作り
 * （認証を置かない代わりに、読み取り口をブラウザから叩ける場所に作らない）。
 */
export const dynamic = 'force-dynamic';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function load() {
  const supabase = getAdminSupabase();

  const [suppliers, experiences, requests, logs] = await Promise.all([
    supabase
      .from('suppliers')
      .select('account_id, username, email, created_at, experiences(count)')
      .order('created_at', { ascending: false }),
    supabase
      .from('experiences')
      .select('experience_id, account_id, tags, content, created_at, suppliers(username)')
      .order('created_at', { ascending: false }),
    supabase
      .from('connect_requests')
      .select(
        'request_id, experience_id, account_id, requester_note, status, created_at, suppliers(username), experiences(content)',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('unmatched_logs')
      .select('log_id, query, top_score, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const failed = suppliers.error ?? experiences.error ?? requests.error ?? logs.error;
  if (failed) throw new Error(failed.message);

  return {
    suppliers: (suppliers.data ?? []).map(
      (row): Supplier => ({
        accountId: row.account_id as string,
        username: row.username as string,
        email: row.email as string,
        createdAt: row.created_at as string,
        // 埋め込みカウントは [{ count: n }] の形で返る
        experienceCount: one<{ count: number }>(row.experiences)?.count ?? 0,
      }),
    ),
    experiences: (experiences.data ?? []).map(
      (row): StoredExperience => ({
        experienceId: row.experience_id as string,
        accountId: row.account_id as string,
        tags: (row.tags as string[] | null) ?? [],
        content: row.content as string,
        createdAt: row.created_at as string,
        username: one<{ username: string }>(row.suppliers)?.username,
      }),
    ),
    requests: (requests.data ?? []).map(
      (row): ConnectRequest => ({
        requestId: row.request_id as string,
        experienceId: row.experience_id as string,
        accountId: row.account_id as string,
        requesterNote: (row.requester_note as string | null) ?? undefined,
        status: row.status as ConnectRequest['status'],
        createdAt: row.created_at as string,
        username: one<{ username: string }>(row.suppliers)?.username,
        content: one<{ content: string }>(row.experiences)?.content,
      }),
    ),
    logs: (logs.data ?? []).map(
      (row): UnmatchedLog => ({
        logId: row.log_id as string,
        query: row.query as string,
        topScore: (row.top_score as number | null) ?? null,
        createdAt: row.created_at as string,
      }),
    ),
  };
}

export default async function AdminPage(props: PageProps<'/admin'>) {
  const params = await props.searchParams;
  const notice = typeof params.error === 'string' ? params.error : null;
  const saved = params.saved === '1';

  if (!hasAdminKey()) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-5 py-10">
        <h1 className="text-[18px] font-medium text-ink">運営管理</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          この画面には SUPABASE_SECRET_KEY が要ります。
          <br />
          experiences・connect_requests・unmatched_logs は RLS でポリシーを置いていないので、
          公開鍵（publishable）では読み書きできません。
          <br />
          Supabase の Settings → API Keys にある secret key を、.env.local の
          SUPABASE_SECRET_KEY に設定してください（NEXT_PUBLIC_ を付けなければブラウザには出ません）。
        </p>
      </main>
    );
  }

  const { suppliers, experiences, requests, logs } = await load();
  const pending = requests.filter((item) => item.status === 'pending').length;

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 py-10">
      <header className="flex items-baseline justify-between gap-3 pb-6">
        <h1 className="text-[18px] font-medium text-ink">運営管理</h1>
        <a href="/admin" className="text-[12px] text-accent-strong">
          再読み込み
        </a>
      </header>

      {notice && (
        <p className="mb-6 rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-danger">
          {notice}
        </p>
      )}
      {saved && !notice && (
        <p className="mb-6 rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-accent-strong">
          保存しました。
        </p>
      )}

      <div className="space-y-10">
        {/* つながるボタンの押下ログ。いちばん上に置く（新着に気づけるように） */}
        <section>
          <h2 className="pb-2 text-[14px] font-medium text-ink">
            つながるリクエスト
            {pending > 0 && (
              <span className="ml-2 rounded-full bg-accent-strong px-2 py-0.5 text-[11px] font-medium text-white">
                未対応 {pending}
              </span>
            )}
          </h2>
          {requests.length === 0 ? (
            <p className="text-[13px] text-muted">まだありません。</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((item) => (
                <li
                  key={item.requestId}
                  className={`rounded-lg border px-3 py-2.5 ${
                    item.status === 'pending' ? 'border-accent-strong bg-white' : 'border-line bg-tint'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13px] text-ink">{item.username ?? item.accountId} へ</span>
                    <span className="text-[11px] text-muted">{formatWhen(item.createdAt)}</span>
                  </div>
                  {item.content && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">
                      経験談：{item.content}
                    </p>
                  )}
                  {item.requesterNote && (
                    <p className="mt-1 text-[12px] leading-snug text-ink">
                      相談：{item.requesterNote}
                    </p>
                  )}
                  <form action={setConnectStatus} className="mt-2">
                    <input type="hidden" name="requestId" value={item.requestId} />
                    <input
                      type="hidden"
                      name="status"
                      value={item.status === 'pending' ? 'done' : 'pending'}
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-line-strong bg-white px-3 py-1 text-[11px] text-ink"
                    >
                      {item.status === 'pending' ? '対応済みにする' : '未対応に戻す'}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 経験談の投入 */}
        <section>
          <h2 className="pb-2 text-[14px] font-medium text-ink">経験談を入れる</h2>
          {suppliers.length === 0 ? (
            <p className="text-[13px] text-muted">先に供給者を登録してください（/register）。</p>
          ) : (
            <form action={addExperience} className="space-y-3">
              <label className="block">
                <span className="text-[12px] text-ink">提供者</span>
                <select
                  name="accountId"
                  required
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink"
                >
                  <option value="">選んでください</option>
                  {suppliers.map((item) => (
                    <option key={item.accountId} value={item.accountId}>
                      {item.username}（{item.experienceCount ?? 0}件）
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[12px] text-ink">タグ</span>
                <input
                  name="tags"
                  placeholder="就活/自己分析, 就活/意思決定"
                  className="mt-1 w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink"
                />
              </label>

              <label className="block">
                <span className="text-[12px] text-ink">経験談の本文</span>
                <textarea
                  name="content"
                  required
                  rows={8}
                  placeholder="本人の言葉のまま貼り付ける（この文面がそのまま需要者に表示されます）"
                  className="mt-1 w-full resize-y rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] leading-relaxed text-ink"
                />
              </label>

              <button
                type="submit"
                className="rounded-full bg-accent-strong px-4 py-2 text-[13px] font-medium text-white"
              >
                登録する
              </button>
            </form>
          )}
        </section>

        {/* 供給者一覧 */}
        <section>
          <h2 className="pb-2 text-[14px] font-medium text-ink">供給者（{suppliers.length}名）</h2>
          {suppliers.length === 0 ? (
            <p className="text-[13px] text-muted">まだ登録がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] text-muted">
                    <th className="py-1.5 pr-3 font-normal">表示名</th>
                    <th className="py-1.5 pr-3 font-normal">メール</th>
                    <th className="py-1.5 pr-3 font-normal">経験談</th>
                    <th className="py-1.5 font-normal">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((item) => (
                    <tr key={item.accountId} className="border-b border-line">
                      <td className="py-2 pr-3 text-ink">{item.username}</td>
                      <td className="py-2 pr-3 text-muted">{item.email}</td>
                      <td className="py-2 pr-3 text-ink">{item.experienceCount ?? 0}件</td>
                      <td className="py-2 text-muted">{formatWhen(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 入っている経験談 */}
        <section>
          <h2 className="pb-2 text-[14px] font-medium text-ink">
            登録済みの経験談（{experiences.length}件）
          </h2>
          {experiences.length === 0 ? (
            <p className="text-[13px] text-muted">まだありません。</p>
          ) : (
            <ul className="space-y-2">
              {experiences.map((item) => (
                <li
                  key={item.experienceId}
                  className="rounded-lg border border-line bg-white px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13px] text-ink">{item.username ?? item.accountId}</span>
                    <span className="text-[11px] text-muted">{formatWhen(item.createdAt)}</span>
                  </div>
                  {item.tags.length > 0 && (
                    <p className="mt-1 text-[11px] text-accent-strong">{item.tags.join('、')}</p>
                  )}
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">
                    {item.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* マッチしなかった相談 */}
        <section>
          <h2 className="pb-2 text-[14px] font-medium text-ink">
            マッチしなかった相談（{logs.length}件）
          </h2>
          <p className="pb-2 text-[11px] leading-relaxed text-muted">
            マッチ度50%以上の経験談が無かったもの。次に集めるべき経験談を決めるために使う。
          </p>
          {logs.length === 0 ? (
            <p className="text-[13px] text-muted">まだありません。</p>
          ) : (
            <ul className="space-y-1.5">
              {logs.map((item) => (
                <li key={item.logId} className="rounded-lg border border-line bg-white px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[12px] leading-snug text-ink">{item.query}</span>
                    <span className="shrink-0 text-[11px] text-muted">
                      最高 {item.topScore ?? '—'} ／ {formatWhen(item.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
