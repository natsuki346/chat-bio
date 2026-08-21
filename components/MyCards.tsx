'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRecords } from './RecordsContext';
import ConfirmButton from './ConfirmButton';
import { STATUS_LABEL, deleteRecord, formatDate, updateRecords } from '@/lib/records';
import {
  getHistorySnapshot,
  getServerHistorySnapshot,
  historyTurns,
  subscribeHistory,
} from '@/lib/history';
import {
  getMessagesSnapshot,
  getServerMessagesSnapshot,
  subscribeMessages,
} from '@/lib/messages';
import {
  getIssuesSnapshot,
  getServerIssuesSnapshot,
  subscribeIssues,
} from '@/lib/issues';
import type { ChatRecord, IssueCard, ModelId, RecordStatus } from '@/types';

/**
 * 悩みがどこまで進んだか。整理中 → 相談済み → 解決済み の一本道で見る。
 * 「整理で止まっている」と「未解決」を別の軸にすると読み分けが増えるので、
 * ひとつの段階としてまとめている。
 */
type Phase = 'organizing' | 'consulted' | 'resolved';

const PHASE_LABEL: Record<Phase, string> = {
  organizing: '整理中',
  consulted: '相談済み',
  resolved: '解決済み',
};

/*
 * 段階の色。整理はエメラルド、相談はスカイブルー、解決は落ち着いた面。
 * 警戒色（赤・黄）は使わない。急かされている感じを出さないため。
 */
const PHASE_CLASS: Record<Phase, string> = {
  organizing: 'bg-calm text-accent-strong',
  consulted: 'bg-open text-trust-strong',
  resolved: 'border border-line-strong bg-tint text-muted',
};

type Filter = 'all' | Phase;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'organizing', label: '整理中' },
  { value: 'consulted', label: '相談済み' },
  { value: 'resolved', label: '解決済み' },
];

/** 整理カードと相談カードを、1つの悩みとして並べるための形 */
type Card = {
  id: string;
  title: string;
  overview?: string;
  createdAt: string;
  phase: Phase;
  /** 相談まで行ったものだけが持つ */
  record?: ChatRecord;
  /** 整理から始まったものだけが持つ */
  issue?: IssueCard;
};

/**
 * マイカード。ひとつの悩みを1枚にして並べ、押すと詳細とステータス変更を出す。
 * 整理で止まっているものと、相談まで行ったものを同じ場所で見られるようにする。
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
  const issues = useSyncExternalStore(subscribeIssues, getIssuesSnapshot, getServerIssuesSnapshot);
  const [filter, setFilter] = useState<Filter>('all');
  const [summarizing, setSummarizing] = useState<string | null>(null);
  // まとめを手で直しているカード。id と編集中の文章を持つ
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  /** 手で直したまとめを保存する。空にしたらまとめ自体を消す。 */
  const saveResolution = () => {
    if (!editing) return;
    const text = editing.value.trim();
    updateRecords((prev) =>
      prev.map((item) => (item.id === editing.id ? { ...item, resolution: text || undefined } : item)),
    );
    setEditing(null);
  };

  /*
   * 相談まで行ったものは相談カードを主にし、その元になった整理カードは
   * 別枠に出さない（同じ悩みが2枚に割れて見えるのを防ぐ）。
   */
  const consultedIssueIds = new Set(
    records.map((record) => record.issueId).filter((id): id is string => Boolean(id)),
  );

  const cards: Card[] = [
    ...records.map((record) => ({
      id: record.id,
      title: record.title,
      overview: record.overview ?? record.summary,
      createdAt: record.createdAt,
      // 相談まで行ったものは、解決したかどうかで段階が分かれる
      phase: (record.status === 'resolved' ? 'resolved' : 'consulted') as Phase,
      record,
      issue: issues.find((item) => item.id === record.issueId),
    })),
    ...issues
      .filter((issue) => !consultedIssueIds.has(issue.id))
      // 何も書けていない書きかけは並べない
      .filter((issue) => issue.title || issue.summary)
      .map((issue) => ({
        id: issue.id,
        title: issue.title || '整理中の悩み',
        overview: issue.summary,
        createdAt: issue.createdAt,
        // 承認済みでも、相談していなければ整理の段階
        phase: 'organizing' as Phase,
        issue,
      })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const visible = filter === 'all' ? cards : cards.filter((card) => card.phase === filter);

  const countOf = (phase: Phase) => cards.filter((card) => card.phase === phase).length;

  const setStatus = (id: string, status: RecordStatus) =>
    updateRecords((prev) => prev.map((record) => (record.id === id ? { ...record, status } : record)));

  /**
   * 解決済みにしたときに「何を見てどう解決したか」をまとめる。
   * 材料は履歴に残っているやり取りと、その人とのチャット。作り話をさせないため両方渡す。
   */
  const summarize = async (record: ChatRecord) => {
    setSummarizing(record.id);
    try {
      const entry = history.find((item) => item.id === record.historyId);
      // 続けて聞いたぶんも材料にする
      const seen = (entry ? historyTurns(entry) : []).flatMap((turn) =>
        turn.experiences.map((item) => `${item.title}／${item.point}`),
      );
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
        <h1 className="text-[17px] font-medium tracking-tight text-ink">マイカード</h1>
        <p className="mt-1 text-[12px] text-muted">
          整理中 {countOf('organizing')} 件・相談済み {countOf('consulted')} 件・解決済み{' '}
          {countOf('resolved')} 件
        </p>
      </header>

      <div className="flex flex-wrap gap-2 pb-4">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
              filter === item.value
                ? 'border-accent-strong bg-accent-strong text-white'
                : 'border-line-strong bg-white text-ink hover:border-accent-strong'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted">
          {cards.length === 0
            ? 'まだカードがありません。整理モードで話すか、相談すると自動で並びます。'
            : '該当するカードはありません。'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((card) => {
            const expanded = card.id === selectedId;
            const record = card.record;
            return (
              <li key={card.id} className="rounded-xl border border-line bg-white">
                <button
                  type="button"
                  onClick={() => onSelect(expanded ? null : card.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug text-ink">{card.title}</span>
                    {card.overview && (
                      <span className="mt-1 block text-[12px] leading-snug text-muted">
                        {card.overview}
                      </span>
                    )}
                    {record?.resolution && (
                      <span className="mt-1.5 block truncate border-l-2 border-accent-strong pl-2 text-[11px] leading-snug text-muted">
                        {record.resolution}
                      </span>
                    )}
                    <span className="mt-1.5 block text-[11px] text-muted">
                      {record ? `${record.count}件 ・ ` : ''}
                      {formatDate(card.createdAt)}
                      {/* 整理から相談まで進んだものは、その経緯も見せる */}
                      {card.issue && record ? ' ・ 整理から相談へ' : ''}
                    </span>
                  </span>
                  {/* どこまで進んだか。段階はひとつだけ出す */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      PHASE_CLASS[card.phase]
                    }`}
                  >
                    {PHASE_LABEL[card.phase]}
                  </span>
                </button>

                {expanded && !record && card.issue && (
                  <div className="border-t border-line px-4 py-3">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                      {card.issue.summary || 'まだ整理の途中です。'}
                    </p>
                    {card.issue.problems.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {card.issue.problems.map((item) => (
                          <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-ink">
                            <span aria-hidden className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                            <span className="min-w-0">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-3 text-[11px] leading-relaxed text-muted">
                      {card.issue?.status === 'draft'
                        ? 'まだ整理の途中です。整理モードで続きを話せます。'
                        : '整理は終わっています。相談モードに切り替えると、この内容を添えて経験者を探せます。'}
                    </p>
                  </div>
                )}

                {expanded && record && (
                  <div className="border-t border-line px-4 py-3">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
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
                              ? 'border-accent-strong bg-accent-strong text-white'
                              : 'border-line-strong bg-white text-ink hover:border-accent-strong'
                          }`}
                        >
                          {STATUS_LABEL[status]}にする
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onAskAgain(record.query)}
                        className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-accent-strong"
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
                        className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent-strong hover:text-ink"
                        confirmClassName="rounded-full bg-accent-strong px-3 py-1.5 text-[12px] text-white"
                      />
                    </div>
                    {/* 解決済みなら、まとめが無くても枠は出す（自分で書けるように） */}
                    {(record.resolution ||
                      summarizing === record.id ||
                      record.status === 'resolved') && (
                      <div className="mt-3 rounded-lg border-l-2 border-accent-strong bg-tint px-3 py-2.5">
                        <p className="text-[11px] tracking-wide text-muted">どう解決したか</p>

                        {summarizing === record.id ? (
                          <p className="mt-1 text-[12px] text-muted">記録からまとめています…</p>
                        ) : editing?.id === record.id ? (
                          <>
                            <textarea
                              autoFocus
                              value={editing.value}
                              onChange={(event) =>
                                setEditing({ id: record.id, value: event.target.value })
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') setEditing(null);
                                // 改行を使うので、保存は ⌘/Ctrl + Enter
                                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                  saveResolution();
                                }
                              }}
                              rows={4}
                              className="mt-1.5 w-full resize-y rounded-lg border border-line-strong bg-white px-2.5 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent-strong"
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={saveResolution}
                                className="rounded-full bg-accent-strong px-3 py-1.5 text-[12px] text-white"
                              >
                                保存する
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent-strong hover:text-ink"
                              >
                                やめる
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {record.resolution ? (
                              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                                {record.resolution}
                              </p>
                            ) : (
                              <p className="mt-1 text-[12px] text-muted">
                                まだまとめがありません。
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditing({ id: record.id, value: record.resolution ?? '' })
                                }
                                className="text-[11px] text-muted underline underline-offset-2 hover:text-ink"
                              >
                                {record.resolution ? '編集する' : '自分で書く'}
                              </button>
                              {record.resolution ? (
                                // 手で直した内容が消えるので、作り直しは一度確認する
                                <ConfirmButton
                                  label="作り直す"
                                  confirmLabel="今の内容を捨てて作り直す"
                                  onConfirm={() => void summarize(record)}
                                  className="text-[11px] text-muted underline underline-offset-2 hover:text-ink"
                                  confirmClassName="text-[11px] font-medium text-ink underline underline-offset-2"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void summarize(record)}
                                  className="text-[11px] text-muted underline underline-offset-2 hover:text-ink"
                                >
                                  記録からまとめる
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-[11px] text-muted">
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
