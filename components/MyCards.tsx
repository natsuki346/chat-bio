'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRecords } from './RecordsContext';
import ConfirmButton from './ConfirmButton';
import { STATUS_LABEL, deleteRecord, formatDate, updateRecords } from '@/lib/records';
import { getHistorySnapshot, getServerHistorySnapshot, subscribeHistory } from '@/lib/history';
import {
  getMessagesSnapshot,
  getServerMessagesSnapshot,
  subscribeMessages,
} from '@/lib/messages';
import type { ChatRecord, ModelId, RecordStatus } from '@/types';

type Filter = 'all' | RecordStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'open', label: '未解決' },
  { value: 'resolved', label: '解決済み' },
];

/**
 * マイカード。相談1件をカードにして並べ、押すと詳細とステータス変更を出す。
 */
export default function MyCards({
  selectedId,
  onSelect,
  onAskAgain,
  model,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAskAgain: (query: string) => void;
  model: ModelId;
}) {
  const records = useRecords();
  const history = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getServerHistorySnapshot);
  const messages = useSyncExternalStore(
    subscribeMessages,
    getMessagesSnapshot,
    getServerMessagesSnapshot,
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [summarizing, setSummarizing] = useState<string | null>(null);

  const visible = filter === 'all' ? records : records.filter((record) => record.status === filter);
  const openCount = records.filter((record) => record.status === 'open').length;

  const setStatus = (id: string, status: RecordStatus) =>
    updateRecords((prev) => prev.map((record) => (record.id === id ? { ...record, status } : record)));

  /**
   * 解決済みにしたときに「何を見てどう解決したか」をまとめる。
   * 材料は履歴に残っているやり取りと、その人とのチャット。作り話をさせないため両方渡す。
   */
  const summarize = async (record: ChatRecord) => {
    setSummarizing(record.id);
    try {
      const turn = history.find((entry) => entry.id === record.historyId)?.turn;
      const seen = turn
        ? turn.mode === 'person'
          ? turn.people.map((hit) => hit.quote)
          : turn.experiences.map((item) => `${item.title}／${item.point}`)
        : [];
      const chat = messages.map(
        (message) => `${message.from === 'me' ? '自分' : '相手'}: ${message.text}`,
      );

      const response = await fetch('/api/resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: record.query, seen, chat, model }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.resolution !== 'string') return;

      updateRecords((prev) =>
        prev.map((item) => (item.id === record.id ? { ...item, resolution: data.resolution } : item)),
      );
    } finally {
      setSummarizing(null);
    }
  };

  return (
    <div>
      <header className="pb-4">
        <h1 className="text-[17px] font-medium tracking-tight text-black">マイカード</h1>
        <p className="mt-1 text-[12px] text-[#666666]">
          相談 {records.length} 件・未解決 {openCount} 件
        </p>
      </header>

      <div className="flex gap-2 pb-4">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
              filter === item.value
                ? 'border-black bg-black text-white'
                : 'border-[#e0e0e0] bg-white text-black hover:border-black'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-[#666666]">
          {records.length === 0
            ? 'まだカードがありません。相談すると、やり取りから見出しを付けて自動で並びます。'
            : '該当するカードはありません。'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((record) => {
            const expanded = record.id === selectedId;
            return (
              <li key={record.id} className="rounded-xl border border-[#e5e5e5] bg-white">
                <button
                  type="button"
                  onClick={() => onSelect(expanded ? null : record.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug text-black">{record.title}</span>
                    {(record.overview ?? record.summary) && (
                      <span className="mt-1 block text-[12px] leading-snug text-[#666666]">
                        {record.overview ?? record.summary}
                      </span>
                    )}
                    {record.resolution && (
                      <span className="mt-1.5 block truncate border-l-2 border-black pl-2 text-[11px] leading-snug text-[#666666]">
                        {record.resolution}
                      </span>
                    )}
                    <span className="mt-1.5 block text-[11px] text-[#666666]">
                      {record.mode === 'person' ? '人を探す' : '経験談を探す'} ・ {record.count}件 ・{' '}
                      {formatDate(record.createdAt)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${
                      record.status === 'open'
                        ? 'bg-black text-white'
                        : 'border border-[#e0e0e0] text-[#666666]'
                    }`}
                  >
                    {STATUS_LABEL[record.status]}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-[#e5e5e5] px-4 py-3">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-black">
                      {record.query}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(['open', 'resolved'] as RecordStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setStatus(record.id, status);
                            // 解決済みにしたときだけ、まだ無ければまとめを作る
                            if (status === 'resolved' && !record.resolution) void summarize(record);
                          }}
                          aria-pressed={record.status === status}
                          className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                            record.status === status
                              ? 'border-black bg-black text-white'
                              : 'border-[#e0e0e0] bg-white text-black hover:border-black'
                          }`}
                        >
                          {STATUS_LABEL[status]}にする
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onAskAgain(record.query)}
                        className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[12px] text-black transition-colors hover:border-black"
                      >
                        もう一度相談する
                      </button>
                      <ConfirmButton
                        label="削除"
                        confirmLabel="本当に削除する"
                        onConfirm={() => {
                          deleteRecord(record.id);
                          if (selectedId === record.id) onSelect(null);
                        }}
                        className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[12px] text-[#666666] transition-colors hover:border-black hover:text-black"
                        confirmClassName="rounded-full bg-black px-3 py-1.5 text-[12px] text-white"
                      />
                    </div>
                    {(record.resolution || summarizing === record.id) && (
                      <div className="mt-3 rounded-lg border-l-2 border-black bg-[#f5f5f5] px-3 py-2.5">
                        <p className="text-[11px] tracking-wide text-[#666666]">どう解決したか</p>
                        {summarizing === record.id ? (
                          <p className="mt-1 text-[12px] text-[#666666]">記録からまとめています…</p>
                        ) : (
                          <>
                            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-black">
                              {record.resolution}
                            </p>
                            <button
                              type="button"
                              onClick={() => void summarize(record)}
                              className="mt-2 text-[11px] text-[#666666] underline underline-offset-2 hover:text-black"
                            >
                              作り直す
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-[11px] text-[#666666]">
                      カードを削除しても対話履歴は残ります。
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
