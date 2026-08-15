'use client';

import { useState } from 'react';
import IssuePreview from './IssuePreview';
import LoadingDots from './LoadingDots';
import QueryBubble from './QueryBubble';
import type { IssueCard } from '@/types';

/**
 * 整理モードの本文。
 * 左から右へ答えを出すのではなく、質問と答えを往復しながらカードを育てる場所。
 * 対話を上に積み、いまのカードを下に置く（打つたびに書き換わるのが見えるように）。
 *
 * カードは裏では毎ターン育っているが、承認の前にまず「ここまでの内容でまとめる」を
 * 押させて、対話とレポートのふたつの区画を分ける（押すまでは対話に集中させる）。
 */
export default function OrganizeView({
  card,
  thinking,
  error,
  onApprove,
  onConsult,
}: {
  card: IssueCard | null;
  /** 次の質問を待っている最中か */
  thinking: boolean;
  error?: string | null;
  onApprove: () => void;
  onConsult: () => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  // 新しい相談カードに切り替わったら、まとめ状態も最初に戻す（レンダー中に直接調整する）
  const [trackedCardId, setTrackedCardId] = useState(card?.id ?? null);
  if (card?.id !== trackedCardId) {
    setTrackedCardId(card?.id ?? null);
    setReviewing(false);
  }

  if (!card || card.messages.length === 0) {
    return null;
  }

  const approved = card.status !== 'draft';
  const hasAgentReply = card.messages.some((message) => message.role === 'agent');
  // 返答の文字が流れ始めたらローディングは引っ込める（吹き出し自体が動いているのが見えるので）
  const showLoading = thinking && !card.messages.some((message) => message.id === 'streaming');

  return (
    <div className="space-y-4">
      <p className="text-[11px] tracking-wide text-muted">悩みを整理する</p>

      <div className="space-y-3">
        {card.messages.map((message) =>
          message.role === 'user' ? (
            <QueryBubble key={message.id} query={message.text} />
          ) : (
            <div key={message.id} className="flex">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-2.5 text-[14px] leading-relaxed text-ink">
                {message.text}
              </p>
            </div>
          ),
        )}
      </div>

      {showLoading && <LoadingDots />}

      {error && (
        <div className="rounded-lg border border-line bg-white px-3 py-2.5">
          <p className="text-[13px] leading-relaxed text-muted">{error}</p>
        </div>
      )}

      {/* 承認の前に、まず「まとめる」を挟む。押すまでは対話だけに集中できる */}
      {!thinking && !reviewing && !approved && hasAgentReply && (
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="rounded-full border border-line-strong bg-white px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent-strong"
        >
          ここまでの内容でまとめる
        </button>
      )}

      {/* まだ何も書けていないうちは出さない。空欄だけのカードは不安にさせる */}
      {(reviewing || approved) && (card.title || card.summary) && (
        <div className="pt-2">
          <IssuePreview card={card} onApprove={onApprove} onConsult={onConsult} />
        </div>
      )}
    </div>
  );
}
