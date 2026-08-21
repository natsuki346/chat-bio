'use client';

import { APP_MODE_OPTIONS } from '@/lib/options';
import type { AppMode } from '@/types';

/**
 * 整理／相談の切り替え。
 *
 * ドロップダウンだと「押す→開く→選ぶ」の3手が要るうえ、開くまで今どちらに
 * 居るのかが読み取れない。相談に辿り着くまでの摩擦を減らすのが目的の機能なので、
 * 操作自体が摩擦にならないよう、両方を出しっぱなしにして1タップで移れるようにする。
 */
export default function ModeToggle({
  value,
  onChange,
  disabled,
}: {
  value: AppMode;
  onChange: (mode: AppMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="モード"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-line-strong bg-white p-0.5"
    >
      {APP_MODE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            disabled={disabled}
            // 選んでいる側をもう一度押しても何も起きない（切り替えの取りこぼしを防ぐ）
            onClick={() => {
              if (!active) onChange(option.value);
            }}
            className={`rounded-full px-2.5 py-1 text-[12px] leading-none transition-colors disabled:opacity-40 ${
              active
                ? 'bg-accent-strong font-medium text-white'
                : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
