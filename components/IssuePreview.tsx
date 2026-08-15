'use client';

import type { IssueCard } from '@/types';

/**
 * 整理中の悩みカード。対話が進むたびに中身が書き換わる。
 * 埋まっていない項目は出さない（空欄が並ぶと「まだ足りない」ばかりが目に入るため）。
 */
export default function IssuePreview({
  card,
  onApprove,
  onConsult,
  compact = false,
}: {
  card: IssueCard;
  /** 承認する。押すと相談モードへ持っていける状態になる */
  onApprove?: () => void;
  /** このカードを持って相談モードへ */
  onConsult?: () => void;
  compact?: boolean;
}) {
  const approved = card.status !== 'draft';

  return (
    <article className="rounded-2xl border border-line bg-white px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-wide text-faint">
          {approved ? '承認済みの悩みカード' : '整理中の悩みカード'}
        </span>
        {approved && (
          <span className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-medium leading-none text-white">
            承認済み
          </span>
        )}
      </div>

      <h2 className="mt-2 text-[16px] font-medium leading-snug text-ink">
        {card.title || 'まだ見出しが決まっていません'}
      </h2>

      {card.summary && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink">{card.summary}</p>
      )}

      {card.background && !compact && (
        <div className="mt-4">
          <p className="text-[10px] tracking-wide text-faint">背景</p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
            {card.background}
          </p>
        </div>
      )}

      {card.problems.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] tracking-wide text-faint">具体的に困っていること</p>
          <ul className="mt-1 space-y-1">
            {card.problems.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.wants.length > 0 && !compact && (
        <div className="mt-4">
          <p className="text-[10px] tracking-wide text-faint">聞きたいこと</p>
          <ul className="mt-1 space-y-1">
            {card.wants.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-trust" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(onApprove || onConsult) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {!approved && onApprove && (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={!card.title}
                className="rounded-full bg-accent-strong px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
              >
                この内容で承認する
              </button>
              <span className="text-[11px] text-muted">
                {card.ready
                  ? '経験者に相談できる状態です'
                  : 'まだ整理の途中です。続けても、ここで承認しても構いません'}
              </span>
            </>
          )}
          {approved && onConsult && (
            <>
              <button
                type="button"
                onClick={onConsult}
                className="rounded-full bg-accent-strong px-4 py-2 text-[13px] font-medium text-white"
              >
                このまま相談する
              </button>
              <span className="text-[11px] text-muted">
                カードを添えて、同じ経験をした人を探します
              </span>
            </>
          )}
        </div>
      )}
    </article>
  );
}
