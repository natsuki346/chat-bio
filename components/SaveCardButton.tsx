'use client';

import { useRecords } from './RecordsContext';
import { deriveTitle, updateRecords } from '@/lib/records';
import type { ChatTurn } from '@/types';

/**
 * この相談をマイカードにする。履歴は自動で残るが、カードは自分で選んで作る。
 */
export default function SaveCardButton({ turn }: { turn: ChatTurn }) {
  const records = useRecords();
  const saved = records.some((record) => record.historyId === turn.id);

  const count = turn.mode === 'person' ? turn.people.length : turn.experiences.length;
  const summary = turn.mode === 'person' ? turn.people[0]?.quote : turn.experiences[0]?.title;

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1.5 text-[12px] text-[#666666]">
        <span aria-hidden>✓</span> マイカードに追加済み
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        updateRecords((prev) => [
          {
            id: `card-${turn.id}`,
            historyId: turn.id,
            title: deriveTitle(turn.query),
            query: turn.query,
            mode: turn.mode,
            createdAt: new Date().toISOString(),
            count,
            summary,
            status: 'open',
          },
          ...prev,
        ])
      }
      className="rounded-full border border-black bg-white px-4 py-2 text-[12px] font-medium text-black transition-colors hover:bg-[#f5f5f5]"
    >
      ＋ マイカードに追加
    </button>
  );
}
