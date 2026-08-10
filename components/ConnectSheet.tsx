'use client';

import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet';
import { useRecords } from './RecordsContext';
import { formatDate } from '@/lib/records';
import { sendMessage } from '@/lib/messages';
import type { Person } from '@/types';

/**
 * 「繋がる」を押したときに開くシート。
 * 自分の相談カード（マイカード）を選んで、相手に添えて送る。
 */
export default function ConnectSheet({
  person,
  personKey,
  query,
  about,
  open,
  onClose,
}: {
  person: Person;
  personKey: string;
  /** そのときの相談内容 */
  query?: string;
  /** 見ていた経験談の見出し、または一言 */
  about?: string;
  open: boolean;
  onClose: () => void;
}) {
  const records = useRecords();
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  // 開いた瞬間だけ選択状態を初期化する。
  // 開いている最中に記録が更新されても（ストリーミング完了など）選択や送信済み表示は消さない
  const initialized = useRef(false);
  useEffect(() => {
    if (!open) {
      initialized.current = false;
      return;
    }
    if (initialized.current) return;
    initialized.current = true;
    setSelected(records[0] ? [records[0].id] : []);
    setSent(false);
  }, [open, records]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${person.name} ${person.handle} と繋がる`}
      subtitle={`${about ? `「${about}」を見ていることと、` : ''}選んだ相談カードが相手に伝わります。`}
      footer={
        sent ? (
          <p className="text-[13px] text-black">送りました。サイドバーの「チャット」から確認できます。</p>
        ) : (
          <button
            type="button"
            disabled={records.length === 0}
            onClick={() => {
              sendMessage({
                person: personKey,
                from: 'me',
                text:
                  selected.length > 0
                    ? '相談カードを送ります。同じようなことで悩んでいて、話を聞かせてほしいです。'
                    : '話を聞かせてほしいです。',
                cardIds: selected,
                // 受け手が「どの話を見て来たか」を分かるように文脈も渡す
                context: { about, query },
              });
              setSent(true);
            }}
            className="w-full rounded-full bg-black px-4 py-3 text-[14px] font-medium text-white transition-opacity disabled:opacity-30"
          >
            {selected.length > 0 ? `相談カード${selected.length}件を添えて繋がる` : '繋がる'}
          </button>
        )
      }
    >
      {records.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-[#666666]">
          まだ相談カードがありません。相談の結果の下にある「＋ マイカードに追加」で作れます。
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((record) => {
            const active = selected.includes(record.id);
            return (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => toggle(record.id)}
                  aria-pressed={active}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    active ? 'border-black bg-[#f5f5f5]' : 'border-[#e5e5e5] bg-white hover:border-black'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border text-[10px] ${
                      active ? 'border-black bg-black text-white' : 'border-[#e0e0e0] text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-black">{record.title}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-[#666666]">
                      {record.mode === 'person' ? '人を探す' : '経験談を探す'} ・ {record.count}件 ・{' '}
                      {formatDate(record.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
