/**
 * やり取りから先回りした「次に聞きたいこと」。
 * 押すとそのまま次の相談として送られる。
 */
export default function FollowUps({
  followups,
  onAsk,
}: {
  /** 後から足した項目なので、古い記録には入っていないことがある */
  followups?: string[];
  onAsk: (query: string) => void;
}) {
  if (!followups?.length) return null;

  return (
    <section className="pt-2">
      <p className="text-[11px] tracking-wide text-muted">次に聞くとしたら</p>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {followups.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onAsk(question)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-tint"
            >
              <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink">{question}</span>
              <span
                aria-hidden
                className="shrink-0 text-[16px] leading-none text-faint transition-colors group-hover:text-ink"
              >
                +
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
