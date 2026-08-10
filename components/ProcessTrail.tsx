'use client';

import { useState } from 'react';
import type { ProcessStep } from '@/types';

/**
 * そのターンで実際に動いた処理の一覧。履歴を開き直したときに経過を追えるようにする。
 * 実行していないことは書かない（ここに出ていない処理は動いていない）。
 */
export default function ProcessTrail({ steps }: { steps: ProcessStep[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;

  const total = steps[steps.length - 1]?.at ?? 0;

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span aria-hidden className={`text-[9px] text-[#666666] ${open ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className="text-[11px] text-[#666666]">
          プロセス（{steps.length}ステップ・{(total / 1000).toFixed(1)}秒）
        </span>
      </button>

      {open && (
        <ol className="border-t border-[#e5e5e5] px-3 py-2">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 py-1">
              <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-[#666666]">
                {(step.at / 1000).toFixed(1)}s
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] leading-snug text-black">{step.label}</span>
                {step.detail && (
                  <span className="block text-[11px] leading-snug text-[#666666]">{step.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
