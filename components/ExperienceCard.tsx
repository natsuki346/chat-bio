'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import PersonBadge from './PersonBadge';
import MatchStars from './MatchStars';
import UpvoteButton from './UpvoteButton';
import { PEOPLE, DEFAULT_PERSON } from '@/lib/people';
import type { Experience, ModelId } from '@/types';

export default function ExperienceCard({
  experience,
  streaming,
  query,
  model,
  reactionKey,
}: {
  experience: Experience;
  streaming?: boolean;
  /** この経験が返ってきたときの相談内容。カードに使う */
  query?: string;
  model: ModelId;
  /** グッドを覚えておくためのキー。開き直しても同じものが付くようにターンから作る */
  reactionKey: string;
}) {
  // ストリーミング中に現れたカードは開いた状態で始める。
  // 以後は状態として保持されるので、流し終わっても勝手に畳まれない
  const [open, setOpen] = useState(!!streaming);
  const [maxHeight, setMaxHeight] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  // 「誰の話か」をカードの主語にするので、名前は本文より先に出す
  const person = PEOPLE[experience.person ?? DEFAULT_PERSON] ?? PEOPLE[DEFAULT_PERSON];

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
        className="block w-full py-4 text-left"
      >
        {/* 投稿のヘッダー。左に誰の話か、右にマッチ度 */}
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-[13px] font-medium text-white"
          >
            {person?.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium leading-tight text-black">
              {person?.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-[#666666]">
              {person?.handle}
            </span>
          </span>
          {/* マッチ度は確定してから出す。ストリーミング中は届いていないことがある */}
          {typeof experience.score === 'number' && <MatchStars score={experience.score} />}
        </span>

        <span className="mt-3 flex items-start gap-3">
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
            {/* 名前は上のヘッダーで出しているので、ここはボタンだけ */}
            <PersonBadge
              person={experience.person}
              query={query}
              about={experience.title}
              model={model}
              showName={false}
              leading={
                <UpvoteButton
                  target={{
                    key: reactionKey,
                    query: query ?? '',
                    mode: 'experience',
                    about: experience.title,
                    point: experience.point,
                    score: experience.score,
                    person: experience.person,
                  }}
                />
              }
            />
          </div>
        </div>
      </div>
    </article>
  );
}
