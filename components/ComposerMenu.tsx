'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Option<T extends string> = { value: T; label: string; hint?: string };

/** 入力欄の中に置く小さなプルダウン。モード選択とモデル選択で共用する。 */
export default function ComposerMenu<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  leading,
  heading,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  leading?: ReactNode;
  /** 一覧の先頭に出す見出し。何の一覧なのかを示す */
  heading?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  // 外側クリックと Esc で閉じる
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label}`}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-accent-strong disabled:opacity-40"
      >
        {leading}
        <span className="whitespace-nowrap">{selected?.label}</span>
        <span aria-hidden className="text-[9px] leading-none text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute bottom-full left-0 z-10 mb-2 min-w-[220px] overflow-hidden rounded-xl border border-line bg-white shadow-lg"
        >
          {heading && (
            <div className="border-b border-line bg-tint px-3 py-2">{heading}</div>
          )}
          <div className="py-1">
          {options.map((option) => {
            const active = option.value === selected?.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-tint"
              >
                <span aria-hidden className="mt-[2px] w-3 shrink-0 text-[11px] text-ink">
                  {active ? '✓' : ''}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug text-ink">{option.label}</span>
                  {option.hint && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">{option.hint}</span>
                  )}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
