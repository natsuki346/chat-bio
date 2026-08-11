/**
 * やり取りから先回りした「次に聞きたいこと」。
 * 押すとそのまま次の相談として送られる。
 */
export default function FollowUps({
  followups,
  onAsk,
}: {
  followups: string[];
  onAsk: (query: string) => void;
}) {
  if (followups.length === 0) return null;

  return (
    <section className="pt-2">
      <p className="text-[11px] tracking-wide text-[#666666]">次に聞くとしたら</p>
      <ul className="mt-1 border-t border-[#e5e5e5]">
        {followups.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onAsk(question)}
              className="group flex w-full items-center gap-3 border-b border-[#e5e5e5] py-3 text-left"
            >
              <span className="min-w-0 flex-1 text-[14px] leading-snug text-black">{question}</span>
              <span
                aria-hidden
                className="shrink-0 text-[16px] leading-none text-[#999999] transition-colors group-hover:text-black"
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
