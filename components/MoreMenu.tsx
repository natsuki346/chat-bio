'use client';

import { useEffect, useRef, useState } from 'react';

export type MoreMenuItem = {
  label: string;
  onSelect: () => void;
  /** 指定すると1回目で確認に変わり、2回目で実行する */
  confirmLabel?: string;
  danger?: boolean;
};

const WIDTH = 168;

/**
 * 行の右端に置く「⋯」メニュー。名称変更や削除をここにまとめる。
 * リストが overflow-y-auto の中にあるので、切れないように fixed で出す。
 */
export default function MoreMenu({
  items,
  label = 'その他の操作',
  className = '',
}: {
  items: MoreMenuItem[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = () => {
      setOpen(false);
      setArmed(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // 開いたまま画面が動くと位置がずれるので閉じる
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      setArmed(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 4,
        // 右端を基準に置きつつ、画面からはみ出さないようにする
        left: Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8)),
      });
    }
    setArmed(null);
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
        className={`rounded px-1.5 py-1 text-[13px] leading-none text-[#666666] transition-colors hover:bg-white hover:text-black ${
          open ? 'bg-white text-black' : ''
        } ${className}`}
      >
        ⋯
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left, width: WIDTH }}
          className="fixed z-50 overflow-hidden rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                // 確認付きの項目は、1回目で文言を差し替えてその場に留める
                if (item.confirmLabel && armed !== index) {
                  setArmed(index);
                  return;
                }
                setOpen(false);
                setArmed(null);
                item.onSelect();
              }}
              className={`block w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#f5f5f5] ${
                item.danger ? 'text-[#c02626]' : 'text-black'
              } ${armed === index ? 'font-medium' : ''}`}
            >
              {armed === index ? item.confirmLabel : item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
