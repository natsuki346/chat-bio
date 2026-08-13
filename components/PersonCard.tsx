'use client';

import PersonBadge from './PersonBadge';
import UpvoteButton from './UpvoteButton';
import type { ModelId, PersonHit } from '@/types';

/** 「人を探す」モードの1件。一言を見せて、その下にアカウントを出す。 */
export default function PersonCard({
  hit,
  streaming,
  query,
  model,
  reactionKey,
}: {
  hit: PersonHit;
  streaming?: boolean;
  /** この一言が返ってきたときの相談内容。カードに使う */
  query?: string;
  model: ModelId;
  /** グッドを覚えておくためのキー */
  reactionKey: string;
}) {
  return (
    <article className="border-b border-line bg-white py-4">
      <p className="text-[15px] leading-relaxed text-ink">
        「{hit.quote}
        {hit.quote || !streaming ? '」' : ''}
      </p>
      <div className="mt-3">
        <PersonBadge
          person={hit.person}
          query={query}
          about={hit.quote}
          model={model}
          leading={
            <UpvoteButton
              target={{
                key: reactionKey,
                query: query ?? '',
                mode: 'person',
                about: hit.quote,
                person: hit.person,
              }}
            />
          }
        />
      </div>
    </article>
  );
}
