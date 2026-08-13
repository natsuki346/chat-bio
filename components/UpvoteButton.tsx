'use client';

import { useSyncExternalStore } from 'react';
import {
  getReactionsSnapshot,
  getServerReactionsSnapshot,
  subscribeReactions,
  toggleReaction,
} from '@/lib/reactions';
import type { ReactionTarget } from '@/types';

/**
 * 出力された1件に付ける高評価。上向きの矢印ひとつだけで、低評価は置かない。
 * 件数は出さず、自分が押したかどうかだけを持つ。
 * どんな話に反応したかを残しておいて、あとで傾向を見るために使う。
 */
export default function UpvoteButton({ target }: { target: ReactionTarget }) {
  const reactions = useSyncExternalStore(
    subscribeReactions,
    getReactionsSnapshot,
    getServerReactionsSnapshot,
  );
  const on = Boolean(reactions[target.key]);

  return (
    <button
      type="button"
      onClick={() => toggleReaction(target)}
      aria-pressed={on}
      aria-label={on ? '高評価を外す' : '高評価する'}
      title={on ? '高評価を外す' : 'この話が参考になった'}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
        on
          ? 'border-accent-strong bg-accent-strong text-white'
          : 'border-line-strong bg-white text-muted hover:border-accent-strong hover:text-ink'
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M8 2.1l5.4 5.8h-3v5.5H5.6V7.9h-3z" />
      </svg>
    </button>
  );
}
