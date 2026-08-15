'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRecords } from './RecordsContext';
import {
  getIssuesSnapshot,
  getServerIssuesSnapshot,
  issueToMarkdown,
  subscribeIssues,
} from '@/lib/issues';
import { formatDate } from '@/lib/records';
import type { Attachment } from '@/types';

/**
 * 相談に添えるカードを選ぶ。
 * 整理モードで承認した悩みカードと、これまでのマイカードを一緒に並べる。
 * 選んだものは添付として渡すので、送る先の作りは何も変わらない。
 */
export default function CardPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (attachment: Attachment) => void;
}) {
  const records = useRecords();
  const issues = useSyncExternalStore(
    subscribeIssues,
    getIssuesSnapshot,
    getServerIssuesSnapshot,
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const approved = issues.filter((card) => card.status !== 'draft');

  const pick = (attachment: Attachment) => {
    onPick(attachment);
    onClose();
  };

  const empty = approved.length === 0 && records.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="カードから選択"
        className="relative flex max-h-[80dvh] w-full max-w-[520px] flex-col rounded-t-2xl border border-line bg-white shadow-[0_16px_48px_rgba(27,58,56,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-[15px] font-medium text-ink">カードから選択</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-1.5 py-1 text-[12px] text-muted transition-colors hover:text-ink"
          >
            閉じる
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {empty ? (
            <p className="text-[13px] leading-relaxed text-muted">
              まだカードがありません。
              <br />
              整理モードで悩みをまとめるか、相談するとここに並びます。
            </p>
          ) : (
            <div className="space-y-5">
              {approved.length > 0 && (
                <section>
                  <p className="pb-2 text-[10px] tracking-wide text-faint">整理した悩み</p>
                  <ul className="space-y-2">
                    {approved.map((card) => (
                      <li key={card.id}>
                        <button
                          type="button"
                          onClick={() =>
                            pick({ name: `${card.title || '悩みカード'}.md`, text: issueToMarkdown(card) })
                          }
                          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-accent-strong"
                        >
                          <span className="block text-[13px] leading-snug text-ink">
                            {card.title || '無題の悩み'}
                          </span>
                          {card.summary && (
                            <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-muted">
                              {card.summary}
                            </span>
                          )}
                          <span className="mt-1.5 block text-[10px] text-faint">
                            {formatDate(card.createdAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {records.length > 0 && (
                <section>
                  <p className="pb-2 text-[10px] tracking-wide text-faint">マイカード</p>
                  <ul className="space-y-2">
                    {records.map((record) => (
                      <li key={record.id}>
                        <button
                          type="button"
                          onClick={() =>
                            pick({
                              name: `${record.title}.md`,
                              text: [
                                `# ${record.title}`,
                                '',
                                record.overview ?? record.summary ?? '',
                                '',
                                '## 相談したこと',
                                record.query,
                                record.resolution ? `\n## どう解決したか\n${record.resolution}` : '',
                              ]
                                .join('\n')
                                .trim(),
                            })
                          }
                          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-accent-strong"
                        >
                          <span className="block text-[13px] leading-snug text-ink">{record.title}</span>
                          {(record.overview ?? record.summary) && (
                            <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-muted">
                              {record.overview ?? record.summary}
                            </span>
                          )}
                          <span className="mt-1.5 block text-[10px] text-faint">
                            {formatDate(record.createdAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
