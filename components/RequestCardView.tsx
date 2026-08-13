'use client';

import type { RequestCard } from '@/types';

const SECTIONS: { key: keyof RequestCard; label: string }[] = [
  { key: 'problem', label: '抱えている悩み' },
  { key: 'thinking', label: '考えていること・経緯' },
  { key: 'reason', label: 'あなたを選んだ理由' },
];

/**
 * 相手に届くカードの見た目。送る前の確認と、DM の中の両方で使う。
 * onChange を渡すと編集できる。
 */
export default function RequestCardView({
  card,
  onChange,
  compact,
}: {
  card: RequestCard;
  onChange?: (card: RequestCard) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-white ${compact ? 'p-3' : 'p-4'} ${
        compact ? 'space-y-2.5' : 'space-y-3.5'
      }`}
    >
      {SECTIONS.map(({ key, label }) => (
        <div key={key}>
          <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} tracking-wide text-muted`}>
            {label}
          </p>
          {onChange ? (
            <textarea
              value={card[key]}
              onChange={(event) => onChange({ ...card, [key]: event.target.value })}
              rows={3}
              aria-label={label}
              /* 16px 固定：iOS の自動ズーム防止 */
              style={{ fontSize: '16px' }}
              className="mt-1 w-full resize-none rounded-lg border border-line-strong bg-tint px-2.5 py-2 leading-relaxed text-ink transition-colors focus:border-accent-strong focus:outline-none"
            />
          ) : (
            <p
              className={`mt-1 whitespace-pre-wrap ${
                compact ? 'text-[12px]' : 'text-[13px]'
              } leading-relaxed text-ink`}
            >
              {card[key]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
