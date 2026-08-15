'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersIcon } from './Icons';
import { APP_MODE_OPTIONS, MODEL_OPTIONS, TONE_OPTIONS } from '@/lib/options';
import type { AppMode, ModelId, Tone } from '@/types';

const WIDTH = 260;

type Option<T extends string> = { value: T; label: string; hint?: string };

/**
 * スマホ用。モデル・語り口・モードの3つのピルを並べると入りきらないので、
 * ひとつのボタンにまとめ、開いたパネルの中に縦に並べる（横スクロールはさせない）。
 * デスクトップでは使わない（InputBar 側で ComposerMenu を3つ並べる）。
 */
export default function ComposerSettings({
  model,
  onModelChange,
  tone,
  onToneChange,
  appMode,
  onAppModeChange,
  disabled,
}: {
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  tone: Tone;
  onToneChange: (tone: Tone) => void;
  appMode: AppMode;
  onAppModeChange: (mode: AppMode) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);

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
      // 3グループぶん、だいたいの高さを見積もって入りきらなければ下に出す
      const estimated = 320;
      const above = rect.top - 8 - estimated;
      setPos({
        top: above > 8 ? above : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8)),
      });
    }
    setOpen(true);
  };

  function group<T extends string>(
    title: string,
    options: Option<T>[],
    value: T,
    onChange: (value: T) => void,
  ) {
    return (
      <div className="border-b border-line py-1 last:border-b-0">
        <p className="px-3 pb-1 pt-1.5 text-[10px] tracking-wide text-faint">{title}</p>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
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
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="モデル・語り口・モードを選ぶ"
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-ink transition-colors hover:border-accent-strong disabled:opacity-40"
      >
        <SlidersIcon className="h-4 w-4" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label="モデル・語り口・モード"
            style={{ top: pos.top, left: pos.left, width: WIDTH }}
            className="fixed z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-white shadow-[0_8px_24px_rgba(27,46,63,0.14)]"
          >
            {group('モデル', MODEL_OPTIONS, model, onModelChange)}
            {group('語り口', TONE_OPTIONS, tone, onToneChange)}
            {group('モード', APP_MODE_OPTIONS, appMode, onAppModeChange)}
          </div>,
          document.body,
        )}
    </>
  );
}
