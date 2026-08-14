'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import ConfirmButton from './ConfirmButton';
import MoreMenu from './MoreMenu';
import { BubbleIcon, CardsIcon, PaperPlaneIcon } from './Icons';
import { formatDate } from '@/lib/records';
import {
  historyToText,
  renameHistory,
  toggleArchiveHistory,
  togglePinHistory,
} from '@/lib/history';
import {
  getMessagesSnapshot,
  getServerMessagesSnapshot,
  subscribeMessages,
} from '@/lib/messages';
import type { HistoryEntry } from '@/types';

export type SidebarView = 'chat' | 'cards' | 'dm';

/**
 * 左サイドバー。上に「新しいチャット」とナビ、その下は全部履歴。
 * 履歴が主役なので区画で隠さず、常に見えるところに置く。
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
  // 名前を変更中の履歴。id と編集中の文字列を持つ
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // 承認待ちが残っているとナビに数を出す（見落とさないように）
  const messages = useSyncExternalStore(
    subscribeMessages,
    getMessagesSnapshot,
    getServerMessagesSnapshot,
  );
  const pending = messages.filter((message) => message.cardStatus === 'pending').length;

  const commitRename = () => {
    if (renaming) renameHistory(renaming.id, renaming.value);
    setRenaming(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const archived = history.filter((entry) => entry.archived);
  const shown = showArchived ? archived : history.filter((entry) => !entry.archived);
  // ピン留めは上に別枠で出す（アーカイブ側では分けない）
  const pinned = showArchived ? [] : shown.filter((entry) => entry.pinned);
  const listed = showArchived ? shown : shown.filter((entry) => !entry.pinned);

  const row = (entry: HistoryEntry) =>
    renaming?.id === entry.id ? (
      <li key={entry.id}>
        <input
          autoFocus
          value={renaming.value}
          onChange={(event) => setRenaming({ id: entry.id, value: event.target.value })}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitRename();
            if (event.key === 'Escape') setRenaming(null);
          }}
          className="w-full rounded-lg border border-accent-strong bg-white px-2 py-1.5 text-[12px] text-ink outline-none"
        />
      </li>
    ) : (
      <li key={entry.id} className="group relative">
        {/* 開いている相談だけ、左に色の帯を出す */}
        {entry.id === activeHistoryId && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent"
          />
        )}
        <button
          type="button"
          onClick={() => {
            onSelectHistory(entry.id);
            onClose();
          }}
          aria-current={entry.id === activeHistoryId ? 'page' : undefined}
          className={`flex w-full items-center gap-2 rounded-lg py-2 pl-2.5 pr-14 text-left transition-colors ${
            entry.id === activeHistoryId
              ? 'bg-white shadow-[0_1px_2px_rgba(27,46,63,0.06)]'
              : 'hover:bg-white/70'
          }`}
        >
          {/* 付け直した名前があればそれを、無ければ打った文面をそのまま出す */}
          <span
            className={`min-w-0 flex-1 truncate text-[12px] ${
              entry.id === activeHistoryId ? 'font-medium text-accent-strong' : 'text-ink'
            }`}
          >
            {entry.title ?? entry.query}
          </span>
        </button>

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-faint group-hover:opacity-0 group-focus-within:opacity-0 group-has-[[aria-expanded=true]]:opacity-0">
          {formatDate(entry.createdAt)}
        </span>
        {/* メニューを開いている間は、行から離れても出したままにする */}
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-has-[[aria-expanded=true]]:opacity-100">
          <MoreMenu
            label="この相談の操作"
            items={[
              {
                label: entry.pinned ? 'ピン留めを外す' : 'ピン留めする',
                onSelect: () => togglePinHistory(entry.id),
              },
              {
                label: '名前を変更',
                onSelect: () => setRenaming({ id: entry.id, value: entry.title ?? entry.query }),
              },
              {
                label: '内容をコピー',
                onSelect: () => {
                  void navigator.clipboard?.writeText(historyToText(entry)).catch(() => {
                    // コピーできない環境（権限なし・非 HTTPS）では何もしない
                  });
                },
              },
              {
                label: entry.archived ? 'アーカイブから戻す' : 'アーカイブする',
                onSelect: () => toggleArchiveHistory(entry.id),
              },
              {
                label: '削除',
                confirmLabel: '本当に削除する',
                danger: true,
                onSelect: () => onDeleteHistory(entry.id),
              },
            ]}
          />
        </span>
      </li>
    );

  // 選ばれている区画は白く浮かせる（サイドバー自体に色が敷いてあるので白が手前になる）
  const navClass = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
      active
        ? 'bg-white font-medium text-accent-strong shadow-[0_1px_2px_rgba(27,46,63,0.06)]'
        : 'text-ink hover:bg-white/70'
    }`;

  return (
    <>
      {/* スマホで開いているときだけ背面を覆う */}
      {open && (
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      )}

      <aside
        aria-label="サイドバー"
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-line-strong bg-panel transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-4">
          <span className="px-1 text-[13px] font-medium tracking-tight text-accent-strong">
            Brain
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="px-1 text-[16px] leading-none text-muted lg:hidden"
          >
            ×
          </button>
        </div>

        {/* 相談を始めるのは一覧を選ぶのとは別の操作なので、ボタンとして置く */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-strong px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <BubbleIcon className="h-4 w-4" />
            新しいチャット
          </button>
        </div>

        <nav className="space-y-0.5 px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              onViewChange('cards');
              onClose();
            }}
            aria-current={view === 'cards' ? 'page' : undefined}
            className={navClass(view === 'cards')}
          >
            <CardsIcon />
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
            <PaperPlaneIcon />
            DMs
            {pending > 0 && (
              <span
                title="承認待ち"
                className="ml-auto rounded-full bg-accent-strong px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
              >
                {pending}
              </span>
            )}
          </button>
        </nav>

        {/* 履歴だけ一段明るくして、上のナビと面を分ける */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line-strong bg-tint px-3 pb-4 pt-3">
          <p className="flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-accent-strong">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            {showArchived ? 'アーカイブ' : '履歴'}
          </p>

          {history.length === 0 ? (
            <p className="px-2.5 text-[12px] leading-relaxed text-muted">
              相談するとここに残ります。
            </p>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <p className="px-2.5 pb-0.5 pt-1 text-[10px] tracking-wide text-faint">
                    ピン留め
                  </p>
                  <ul>{pinned.map(row)}</ul>
                </>
              )}

              {listed.length === 0 ? (
                <p className="px-2.5 text-[12px] leading-relaxed text-muted">
                  {showArchived ? 'アーカイブはありません。' : 'ここに並ぶ相談はありません。'}
                </p>
              ) : (
                <ul>{listed.map(row)}</ul>
              )}

              <div className="mt-2 space-y-1.5 border-t border-line-strong px-2.5 pt-2">
                {(archived.length > 0 || showArchived) && (
                  <button
                    type="button"
                    onClick={() => setShowArchived((prev) => !prev)}
                    className="block text-left text-[11px] text-accent-strong hover:underline hover:underline-offset-2"
                  >
                    {showArchived ? '履歴に戻る' : `アーカイブを見る（${archived.length}）`}
                  </button>
                )}
                <ConfirmButton
                  label="履歴をすべて消す"
                  confirmLabel="本当に消す（マイカードは残ります）"
                  onConfirm={onClearHistory}
                  className="block text-left text-[11px] text-muted hover:text-ink"
                  confirmClassName="block text-left text-[11px] font-medium text-ink"
                />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
