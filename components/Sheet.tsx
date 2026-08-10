'use client';

import { useEffect, type ReactNode } from 'react';

/** 下から出るシートの共通の枠。チャット・繋がるで使い回す。 */
export default function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-black/30" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[80dvh] w-full max-w-[520px] flex-col rounded-t-2xl border border-[#e5e5e5] bg-white sm:rounded-2xl"
      >
        <div className="border-b border-[#e5e5e5] px-5 py-4">
          <p className="text-[15px] font-medium text-black">{title}</p>
          {subtitle && <p className="mt-1 text-[12px] leading-relaxed text-[#666666]">{subtitle}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        <div className="border-t border-[#e5e5e5] px-5 py-4">
          {footer}
          <p className="mt-2 text-center text-[11px] text-[#666666]">
            ※ この端末の中だけに保存されます。相手には届きません
          </p>
        </div>
      </div>
    </div>
  );
}
