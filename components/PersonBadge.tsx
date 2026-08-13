'use client';

import { useState, type ReactNode } from 'react';
import ReportSheet from './ReportSheet';
import ConnectSheet from './ConnectSheet';
import { PEOPLE, DEFAULT_PERSON } from '@/lib/people';
import type { ModelId } from '@/types';

/** 名前・ハンドル・チャット/繋がる導線をまとめた行。経験カードと人カードで共用する。 */
export default function PersonBadge({
  person: key,
  query,
  about,
  model,
  showName = true,
  leading,
}: {
  person?: string;
  /** 何に悩んで相談したか。カードの材料にする */
  query?: string;
  /** 相手のどの話・どの一言に反応したか */
  about?: string;
  model: ModelId;
  /** カードの上部で既に名前を出しているときは false にして重複を避ける */
  showName?: boolean;
  /** ボタンの左に差し込むもの（グッドボタン） */
  leading?: ReactNode;
}) {
  const personKey = key ?? DEFAULT_PERSON;
  const person = PEOPLE[personKey] ?? PEOPLE[DEFAULT_PERSON];
  const [sheet, setSheet] = useState<'chat' | 'connect' | null>(null);

  if (!person) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted">
        {showName && (
          <span>
            {person.name} {person.handle}
          </span>
        )}
        {leading}
        <button
          type="button"
          onClick={() => setSheet('chat')}
          className="rounded-full bg-accent-strong px-4 py-2 text-[13px] font-medium text-white"
        >
          チャットする
        </button>
        <button
          type="button"
          onClick={() => setSheet('connect')}
          className="rounded-full border border-accent-strong bg-white px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-tint"
        >
          繋がる
        </button>
      </div>

      <ReportSheet
        person={person}
        personKey={personKey}
        query={query}
        about={about}
        model={model}
        open={sheet === 'chat'}
        onClose={() => setSheet(null)}
      />
      <ConnectSheet
        person={person}
        personKey={personKey}
        query={query}
        about={about}
        open={sheet === 'connect'}
        onClose={() => setSheet(null)}
      />
    </>
  );
}
