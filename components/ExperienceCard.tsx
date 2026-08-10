'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import PersonBadge from './PersonBadge';
import type { Experience, ModelId } from '@/types';

export default function ExperienceCard({
  experience,
  streaming,
  query,
  model,
}: {
  experience: Experience;
  streaming?: boolean;
  /** この経験が返ってきたときの相談内容。カードに使う */
  query?: string;
  model: ModelId;
}) {
  // ストリーミング中に現れたカードは開いた状態で始める。
  // 以後は状態として保持されるので、流し終わっても勝手に畳まれない
  const [open, setOpen] = useState(!!streaming);
  const [maxHeight, setMaxHeight] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 高さの実測はレンダー中ではなくエフェクトで行う（ref はレンダー中に読まない）。
  // 本文がチャンクごとに伸びるので、開いている間は実測値を追従させる。
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const sync = () => setMaxHeight(open ? body.scrollHeight : 0);
    sync();
    if (!open) return;

    const observer = new ResizeObserver(sync);
    observer.observe(body);
    return () => observer.disconnect();
  }, [open]);

  return (
    <article className="border-b border-[#e5e5e5] bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block min-h-[1.2em] text-[11px] tracking-wide text-[#666666]">
            {experience.label}
          </span>
          <span className="mt-1.5 block min-h-[1.2em] text-[15px] leading-snug text-black">
            {experience.title || (streaming ? '…' : '')}
          </span>
        </span>
        <span
          aria-hidden
          className={`mt-0.5 shrink-0 text-lg leading-none text-[#666666] transition-transform duration-300 ${
            open ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div ref={bodyRef} className="pb-5">
          <p className="whitespace-pre-wrap text-[14px] leading-[1.9] text-black">{experience.body}</p>

          {/* ストリーミング中はまだ届いていないことがあるので、空なら出さない */}
          {experience.point && (
            <p className="mt-4 border-l-2 border-[#e5e5e5] pl-3 text-[13px] leading-relaxed text-[#666666]">
              {experience.point}
            </p>
          )}

          <div className="mt-4">
            <PersonBadge person={experience.person} query={query} about={experience.title} model={model} />
          </div>
        </div>
      </div>
    </article>
  );
}
