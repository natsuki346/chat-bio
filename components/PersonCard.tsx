'use client';

import PersonBadge from './PersonBadge';
import type { ModelId, PersonHit } from '@/types';

/** 「人を探す」モードの1件。一言を見せて、その下にアカウントを出す。 */
export default function PersonCard({
  hit,
  streaming,
  query,
  model,
}: {
  hit: PersonHit;
  streaming?: boolean;
  /** この一言が返ってきたときの相談内容。カードに使う */
  query?: string;
  model: ModelId;
}) {
  return (
    <article className="border-b border-[#e5e5e5] bg-white py-4">
      <p className="text-[15px] leading-relaxed text-black">
        「{hit.quote}
        {hit.quote || !streaming ? '」' : ''}
      </p>
      <div className="mt-3">
        <PersonBadge person={hit.person} query={query} about={hit.quote} model={model} />
      </div>
    </article>
  );
}
