'use client';

import type { ChatTurn } from '@/types';

/** 相談1件の中の質問に、本文側から飛べるようにするための id */
export function turnAnchorId(turnId: string): string {
  return `turn-${turnId}`;
}

/**
 * いま開いている相談で何を聞いてきたかを右側に並べる。
 * 続けて聞くほど本文が長くなるので、上に戻って探せるようにしておく。
 * 置き場所が取れる広い画面でだけ出す。
 */
export default function ThreadOutline({ turns }: { turns: ChatTurn[] }) {
  // 1問しかないうちは並べる意味がない
  if (turns.length < 2) return null;

  return (
    <nav
      aria-label="この相談の質問"
      className="fixed right-6 top-1/2 hidden w-[200px] -translate-y-1/2 min-[1400px]:block"
    >
      <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-accent-strong">
        質問 {turns.length}件
      </p>
      <ol className="border-l border-line-strong">
        {turns.map((turn, index) => (
          <li key={turn.id}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(turnAnchorId(turn.id))
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="group flex w-full items-baseline gap-2 rounded-r-lg py-1.5 pl-2.5 pr-2 text-left transition-colors hover:bg-tint"
            >
              <span className="shrink-0 text-[10px] tabular-nums text-faint">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] leading-snug text-muted transition-colors group-hover:text-ink">
                {turn.query}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
