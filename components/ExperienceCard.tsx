'use client';

import PersonBadge from './PersonBadge';
import MatchStars from './MatchStars';
import UpvoteButton from './UpvoteButton';
import { resolvePerson } from '@/lib/people';
import type { Experience, ModelId } from '@/types';

/**
 * 経験1件。畳まずにそのまま文章として出す。
 * 流れてきた順に読めることを優先して、開閉や別画面は挟まない。
 */
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
  /** 高評価を覚えておくためのキー。開き直しても同じものが付くようにターンから作る */
  reactionKey: string;
}) {
  // 「誰の話か」をカードの主語にするので、名前は本文より先に出す
  const person = resolvePerson(experience.person, experience.personName, experience.personHandle);

  return (
    <article className="rounded-2xl border border-line bg-white px-4 py-4">
      {/* 投稿のヘッダー。左に誰の話か、右にマッチ度 */}
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-[13px] font-medium text-white"
        >
          {person?.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-tight text-ink">
            {person?.name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-muted">
            {person?.handle}
          </span>
        </span>
        {/* マッチ度は確定してから出す。ストリーミング中は届いていないことがある */}
        {typeof experience.score === 'number' && <MatchStars score={experience.score} />}
      </div>

      <p className="mt-4 min-h-[1.2em] text-[11px] tracking-wide text-muted">
        {experience.label}
      </p>
      <h3 className="mt-1.5 min-h-[1.2em] text-[16px] font-medium leading-snug text-ink">
        {experience.title || (streaming ? '…' : '')}
      </h3>

      {/* 本文は畳まずそのまま出す。チャンクが届くたびに伸びていく */}
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.95] text-ink">
        {experience.body}
      </p>

      {/* ストリーミング中はまだ届いていないことがあるので、空なら出さない */}
      {experience.point && (
        <p className="mt-4 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-muted">
          {experience.point}
        </p>
      )}

      <div className="mt-4">
        {/* 名前は上のヘッダーで出しているので、ここはボタンだけ */}
        <PersonBadge
          person={experience.person}
          personName={experience.personName}
          personHandle={experience.personHandle}
          experienceId={experience.experienceId}
          query={query}
          about={experience.title}
          model={model}
          showName={false}
          leading={
            <UpvoteButton
              target={{
                key: reactionKey,
                query: query ?? '',
                about: experience.title,
                point: experience.point,
                score: experience.score,
                person: experience.person,
              }}
            />
          }
        />
      </div>
    </article>
  );
}
