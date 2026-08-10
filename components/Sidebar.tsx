'use client';

import { useEffect } from 'react';
import ConfirmButton from './ConfirmButton';
import { formatDate } from '@/lib/records';
import type { HistoryEntry } from '@/types';

export type SidebarView = 'chat' | 'cards' | 'dm';

/**
 * 左サイドバー。上にナビ（新しい相談／マイカード）、下に履歴を素のリストで並べる。
 * PC は常に表示、スマホは重ねて開閉する。
 */
export default function Sidebar({
  open,
  onClose,
  view,
  onViewChange,
  onNewChat,
  history,
  activeHistoryId,
  onSelectHistory,
  onDeleteHistory,
  onClearHistory,
}: {
  open: boolean;
  onClose: () => void;
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onNewChat: () => void;
  history: HistoryEntry[];
  activeHistoryId: string | null;
  onSelectHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}) {

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const navClass = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
      active ? 'bg-[#f5f5f5] text-black' : 'text-black hover:bg-[#f5f5f5]'
    }`;

  return (
    <>
      {/* スマホで開いているときだけ背面を覆う */}
      {open && (
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <aside
        aria-label="サイドバー"
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[#e5e5e5] bg-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-4">
          <span className="px-1 text-[13px] font-medium text-black">Chat Bio</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="px-1 text-[16px] leading-none text-[#666666] lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="space-y-0.5 px-3 pb-4">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className={navClass(false)}
          >
            <span aria-hidden className="text-[13px] leading-none">
              +
            </span>
            新しい相談
          </button>
          <button
            type="button"
            onClick={() => {
              onViewChange('cards');
              onClose();
            }}
            aria-current={view === 'cards' ? 'page' : undefined}
            className={navClass(view === 'cards')}
          >
            <span aria-hidden className="text-[13px] leading-none">
              ▤
            </span>
            マイカード
          </button>
          <button
            type="button"
            onClick={() => {
              onViewChange('dm');
              onClose();
            }}
            aria-current={view === 'dm' ? 'page' : undefined}
            className={navClass(view === 'dm')}
          >
            <span aria-hidden className="text-[13px] leading-none">
              ✉
            </span>
            チャット
          </button>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2.5 pb-1 text-[11px] text-[#666666]">履歴</p>
          {history.length === 0 ? (
            <p className="px-2.5 text-[12px] leading-relaxed text-[#666666]">
              相談するとここに残ります。
            </p>
          ) : (
            <>
              <ul>
                {history.map((entry) => (
                  <li key={entry.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectHistory(entry.id);
                        onClose();
                      }}
                      aria-current={entry.id === activeHistoryId ? 'page' : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg py-2 pl-2.5 pr-14 text-left transition-colors ${
                        entry.id === activeHistoryId ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
                      }`}
                    >
                      {/* 実際に打った文面をそのまま出す */}
                      <span className="min-w-0 flex-1 truncate text-[12px] text-black">
                        {entry.query}
                      </span>
                    </button>

                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#666666] group-hover:opacity-0 group-focus-within:opacity-0">
                      {formatDate(entry.createdAt)}
                    </span>
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <ConfirmButton
                        label="×"
                        confirmLabel="消す"
                        title="この対話履歴を消す"
                        onConfirm={() => onDeleteHistory(entry.id)}
                        className="rounded px-1.5 py-1 text-[11px] leading-none text-[#666666] hover:bg-white hover:text-black"
                        confirmClassName="rounded bg-black px-1.5 py-1 text-[10px] leading-none text-white"
                      />
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 border-t border-[#e5e5e5] px-2.5 pt-2">
                <ConfirmButton
                  label="履歴をすべて消す"
                  confirmLabel="本当に消す（マイカードは残ります）"
                  onConfirm={onClearHistory}
                  className="text-left text-[11px] text-[#666666] hover:text-black"
                  confirmClassName="text-left text-[11px] font-medium text-black"
                />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
