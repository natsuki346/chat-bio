'use client';

import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet';
import RequestCardView from './RequestCardView';
import { sendMessage } from '@/lib/messages';
import type { MatchReport, ModelId, Person } from '@/types';

type Phase = 'writing' | 'ready' | 'failed' | 'sent';

/**
 * 「チャットする」で開くレポート。読む人が2人いる1ページ。
 *  ① なぜこの人が出てきたか（送り手が読む）
 *  ② 相手に届く内容（受け手が読む）
 *  ③ 送る挨拶文（編集してから送る）
 */
export default function ReportSheet({
  person,
  personKey,
  query,
  about,
  model,
  open,
  onClose,
}: {
  person: Person;
  personKey: string;
  query?: string;
  about?: string;
  model: ModelId;
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('writing');
  const [report, setReport] = useState<MatchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 開いた瞬間に1回だけ書き起こす（開いている最中に作り直さない）
  const initialized = useRef(false);
  useEffect(() => {
    if (!open) {
      initialized.current = false;
      return;
    }
    if (initialized.current) return;
    initialized.current = true;

    setPhase('writing');
    setReport(null);
    setError(null);

    let cancelled = false;
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, about, personName: person.name, model }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? 'レポートを作れませんでした');
        return data.report as MatchReport;
      })
      .then((next) => {
        if (cancelled) return;
        setReport(next);
        setPhase('ready');
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'レポートを作れませんでした');
        setPhase('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [open, query, about, person.name, model]);

  const editable = phase === 'ready';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${person.name} ${person.handle} へのレポート`}
      subtitle="なぜこの人が出てきたのか、相手に何が届くのかをまとめました。送る前に直せます。"
      footer={
        phase === 'sent' ? (
          <p className="text-[13px] text-ink">
            送りました。サイドバーの「チャット」から状態を確認できます。
          </p>
        ) : phase === 'failed' ? (
          <p className="text-[13px] text-muted">{error}</p>
        ) : (
          <button
            type="button"
            disabled={!editable || !report?.greeting.trim()}
            onClick={() => {
              if (!report) return;
              sendMessage({
                person: personKey,
                from: 'me',
                text: report.greeting.trim(),
                cardIds: [],
                card: report.card,
                cardStatus: 'pending',
              });
              setPhase('sent');
            }}
            className="w-full rounded-full bg-accent-strong px-4 py-3 text-[14px] font-medium text-white transition-opacity disabled:opacity-30"
          >
            {phase === 'writing' ? 'レポートを作っています…' : 'この内容で送る'}
          </button>
        )
      }
    >
      {phase === 'writing' && (
        <p className="text-[13px] leading-relaxed text-muted">
          相談内容と、出力された経験を照らし合わせています…
        </p>
      )}

      {phase === 'failed' && (
        <p className="text-[13px] leading-relaxed text-muted">
          レポートを作れませんでした。閉じてもう一度お試しください。
        </p>
      )}

      {report && (
        <div className="space-y-6">
          {/* ① 送り手が読む */}
          <section>
            <p className="text-[11px] tracking-wide text-muted">なぜこの人が出てきたか</p>
            <p className="mt-1.5 whitespace-pre-wrap rounded-xl border-l-2 border-accent-strong bg-tint px-3 py-2.5 text-[13px] leading-relaxed text-ink">
              {report.matchReason}
            </p>
          </section>

          {/* ② 受け手が読む */}
          <section>
            <p className="text-[11px] tracking-wide text-muted">
              相手に届く内容（{person.name} が読みます）
            </p>
            <div className="mt-1.5">
              <RequestCardView
                card={report.card}
                onChange={editable ? (card) => setReport({ ...report, card }) : undefined}
              />
            </div>
          </section>

          {/* ③ 送る文面 */}
          <section>
            <p className="text-[11px] tracking-wide text-muted">最初のメッセージ</p>
            <textarea
              value={report.greeting}
              onChange={(event) => setReport({ ...report, greeting: event.target.value })}
              rows={5}
              disabled={!editable}
              aria-label="最初のメッセージ"
              /* 16px 固定：iOS の自動ズーム防止 */
              style={{ fontSize: '16px' }}
              className="mt-1.5 w-full resize-none rounded-xl border border-line-strong bg-tint px-3 py-2.5 leading-relaxed text-ink transition-colors focus:border-accent-strong focus:outline-none disabled:opacity-60"
            />
          </section>
        </div>
      )}
    </Sheet>
  );
}
