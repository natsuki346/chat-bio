'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Option<T extends string> = { value: T; label: string; hint?: string };

const WIDTH = 240;

/**
 * 入力欄の中に置く小さなプルダウン。モデル・語り口・モードの選択で共用する。
 *
 * パネルは body 直下に fixed で出す（MoreMenu と同じ理由）。
 * 入力欄のボタン列はスマホでは横スクロールにしているので、
 * 素直に absolute で出すと親の overflow に切られてしまうため。
 */
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);

    // 開いた直後にフォーカスで一覧がスクロールすることがあるので、1フレーム遅らせて登録する
    const frame = requestAnimationFrame(() => {
      document.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('scroll', close, true);
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // 見出しと選択肢の数からだいたいの高さを見積もって、入りきらなければ下に出す
      const estimated = (heading ? 44 : 0) + options.length * 52 + 16;
      const above = rect.top - 8 - estimated;
      setPos({
        top: above > 8 ? above : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - WIDTH - 8)),
      });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label}`}
        onClick={toggle}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-accent-strong disabled:opacity-40"
      >
        {leading}
        <span className="whitespace-nowrap">{selected?.label}</span>
        <span aria-hidden className="text-[9px] leading-none text-muted">
          ▾
        </span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            style={{ top: pos.top, left: pos.left, width: WIDTH }}
            className="fixed z-50 overflow-hidden rounded-xl border border-line bg-white shadow-[0_8px_24px_rgba(27,46,63,0.14)]"
          >
            {heading && <div className="border-b border-line bg-tint px-3 py-2">{heading}</div>}
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
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                          {option.hint}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
