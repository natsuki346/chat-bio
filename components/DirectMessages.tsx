'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import MoreMenu from './MoreMenu';
import RequestCardView from './RequestCardView';
import { BackIcon, PaperPlaneIcon, SendIcon } from './Icons';
import { autoGrow, useSubmitKey } from './useSubmitKey';
import { useRecords } from './RecordsContext';
import { PEOPLE } from '@/lib/people';
import {
  deleteThread,
  formatTime,
  getMessagesSnapshot,
  getServerMessagesSnapshot,
  sendMessage,
  subscribeMessages,
  updateMessage,
} from '@/lib/messages';
import type { DirectMessage } from '@/types';

/** マイカードを添付として見せる小さなカード */
function CardChips({ ids }: { ids: string[] }) {
  const records = useRecords();
  const attached = ids
    .map((id) => records.find((record) => record.id === id))
    .filter((record): record is NonNullable<typeof record> => Boolean(record));

  if (attached.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {attached.map((record) => (
        <div key={record.id} className="rounded-lg border border-line-strong bg-white px-2.5 py-1.5">
          <span className="block text-[11px] leading-snug text-ink">{record.title}</span>
          {record.summary && (
            <span className="mt-0.5 block truncate text-[10px] leading-snug text-muted">
              {record.summary}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 受け手が「なぜこのリクエストが来たか」を掴むための背景。
 * 送り手が見ていた話と、そのときの相談をそのまま出す（作文はしない）。
 */
function RequestContext({ context }: { context: NonNullable<DirectMessage['context']> }) {
  if (!context.about && !context.query) return null;

  return (
    <div className="mt-1.5 rounded-xl border border-line bg-white p-3">
      <p className="text-[10px] tracking-wide text-muted">このリクエストが来た背景</p>
      {context.about && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink">
          <span className="text-muted">見ていた話：</span>
          「{context.about}」
        </p>
      )}
      {context.query && (
        <p className="mt-1 text-[12px] leading-relaxed text-ink">
          <span className="text-muted">そのときの相談：</span>
          {context.query}
        </p>
      )}
    </div>
  );
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-strong font-medium text-white"
    >
      <span style={{ fontSize: Math.round(size * 0.38) }}>{name.slice(0, 1)}</span>
    </span>
  );
}

function timeOnly(iso: string): string {
  return formatTime(iso).split(' ')[1] ?? '';
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  return sameDay ? '今日' : `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** やり取りの一覧（Instagram でいう受信箱） */
function ThreadList({
  messages,
  onOpen,
}: {
  messages: DirectMessage[];
  onOpen: (person: string) => void;
}) {
  const latest = new Map<string, DirectMessage>();
  for (const message of messages) latest.set(message.person, message);

  const threads = [...latest.entries()].sort(
    (a, b) => Date.parse(b[1].createdAt) - Date.parse(a[1].createdAt),
  );

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-line bg-white px-5 py-10 text-center">
        <PaperPlaneIcon className="h-8 w-8 text-accent" />
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          まだやり取りがありません。
          <br />
          経験カードの「チャットする」からレポートを送ると、ここに並びます。
        </p>
      </div>
    );
  }

  return (
    <ul className="-mx-2">
      {threads.map(([key, last]) => {
        const person = PEOPLE[key];
        if (!person) return null;
        const pending = messages.filter(
          (message) => message.person === key && message.cardStatus === 'pending',
        ).length;

        return (
          <li key={key} className="group relative">
            <button
              type="button"
              onClick={() => onOpen(key)}
              className="flex w-full items-center gap-3 rounded-xl py-3 pl-2 pr-16 text-left transition-colors hover:bg-tint"
            >
              <Avatar name={person.name} />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[14px] ${
                    pending > 0 ? 'font-medium text-ink' : 'text-ink'
                  }`}
                >
                  {person.name}
                </span>
                <span
                  className={`mt-0.5 block truncate text-[12px] ${
                    pending > 0 ? 'font-medium text-accent-strong' : 'text-muted'
                  }`}
                >
                  {last.from === 'me' ? 'あなた: ' : ''}
                  {last.card
                    ? 'レポートを送りました'
                    : last.context
                      ? '繋がるリクエストを送りました'
                      : last.text}
                </span>
              </span>
            </button>

            <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {pending > 0 && (
                <span
                  title="承認待ち"
                  className="rounded-full bg-accent-strong px-1.5 py-0.5 text-[10px] leading-none text-white"
                >
                  {pending}
                </span>
              )}
              <span className="text-[10px] text-muted group-hover:hidden group-focus-within:hidden group-has-[[aria-expanded=true]]:hidden">
                {timeOnly(last.createdAt)}
              </span>
              {/* メニューを開いている間は、行から離れても出したままにする */}
              <span className="hidden group-hover:inline group-focus-within:inline group-has-[[aria-expanded=true]]:inline">
                <MoreMenu
                  label="このやり取りの操作"
                  items={[
                    { label: '開く', onSelect: () => onOpen(key) },
                    {
                      label: '削除',
                      confirmLabel: '本当に削除する',
                      danger: true,
                      onSelect: () => deleteThread(key),
                    },
                  ]}
                />
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Instagram のようなチャット画面。上にヘッダー、真ん中がスクロール、下に入力欄。 */
export default function DirectMessages() {
  const messages = useSyncExternalStore(
    subscribeMessages,
    getMessagesSnapshot,
    getServerMessagesSnapshot,
  );
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // 入力に合わせて高さを合わせ直す
  useLayoutEffect(() => {
    autoGrow(draftRef.current, 120);
  }, [draft]);

  const person = openPerson ? PEOPLE[openPerson] : undefined;
  const thread = openPerson ? messages.filter((message) => message.person === openPerson) : [];
  const threadLength = thread.length;

  // 発言が増えたら一番下へ送る
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [threadLength, openPerson]);

  // 承認されるまで続きは書けない（相手が受けると決めてから会話が始まる）
  const lastCard = [...thread].reverse().find((message) => message.card);
  const gate = lastCard?.cardStatus;
  const locked = gate === 'pending' || gate === 'declined';

  const send = () => {
    const text = draft.trim();
    if (!text || !openPerson || locked) return;
    setDraft('');
    sendMessage({ person: openPerson, from: 'me', text, cardIds: [] });
  };

  const submitKey = useSubmitKey(send);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  // 一覧
  if (!openPerson || !person) {
    return (
      <div className="mx-auto w-full max-w-[600px] px-5 pt-16 pb-20 lg:pt-10">
        <header className="flex items-baseline gap-2 pb-4">
          <h1 className="text-[17px] font-medium tracking-tight text-ink">DMs</h1>
          {/* 承認待ちが残っているなら見出しの横で知らせる */}
          {messages.some((message) => message.cardStatus === 'pending') && (
            <span className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-medium leading-none text-white">
              承認待ち
            </span>
          )}
        </header>
        <ThreadList messages={messages} onOpen={setOpenPerson} />
      </div>
    );
  }

  // スレッド：画面いっぱいを使う
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col" style={{ height: '100dvh' }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setOpenPerson(null)}
          aria-label="DMs一覧に戻る"
          className="-ml-1 rounded-lg p-1 text-ink transition-colors hover:bg-tint"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <Avatar name={person.name} size={32} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] leading-tight text-ink">{person.name}</span>
          <span className="block truncate text-[11px] leading-tight text-muted">
            {person.handle}
          </span>
        </span>
      </header>

      {/* 会話の面は一段沈めて、吹き出しが浮いて見えるようにする */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-panel px-4 py-4">
        {thread.length === 0 ? (
          <p className="text-center text-[12px] text-muted">まだやり取りがありません。</p>
        ) : (
          <ul className="space-y-2">
            {thread.map((message, index) => {
              const mine = message.from === 'me';
              const previous = thread[index - 1];
              const newDay =
                !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);

              return (
                <li key={message.id}>
                  {newDay && (
                    <p className="py-3 text-center text-[10px] text-muted">
                      {dayLabel(message.createdAt)}
                    </p>
                  )}

                  <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && <Avatar name={person.name} size={24} />}
                    <div className="max-w-[78%]">
                      <div
                        className={`rounded-2xl px-3.5 py-2 shadow-[0_1px_2px_rgba(27,46,63,0.08)] ${
                          mine
                            ? 'rounded-br-md bg-accent-strong text-white'
                            : 'rounded-bl-md border border-line bg-white text-ink'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                          {message.text}
                        </p>
                      </div>

                      {message.context && <RequestContext context={message.context} />}

                      {message.card && (
                        <div className="mt-1.5">
                          <RequestCardView card={message.card} compact />

                          {message.cardStatus === 'pending' && (
                            <div className="mt-1.5 rounded-lg border border-line bg-white px-2.5 py-2">
                              <p className="text-[10px] text-muted">
                                受け手として、このレポートを見て決める
                              </p>
                              <div className="mt-1.5 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateMessage(message.id, { cardStatus: 'approved' })}
                                  className="rounded-full bg-accent-strong px-3 py-1.5 text-[11px] text-white"
                                >
                                  承認する
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateMessage(message.id, { cardStatus: 'declined' })}
                                  className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-accent-strong hover:text-ink"
                                >
                                  今回は見送る
                                </button>
                              </div>
                            </div>
                          )}

                          {message.cardStatus === 'approved' && (
                            <p className="mt-1.5 text-[10px] text-muted">承認されました</p>
                          )}
                          {message.cardStatus === 'declined' && (
                            <p className="mt-1.5 text-[10px] text-muted">見送りになりました</p>
                          )}
                        </div>
                      )}

                      <CardChips ids={message.cardIds} />

                      <p className={`mt-1 text-[10px] text-muted ${mine ? 'text-right' : ''}`}>
                        {timeOnly(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="shrink-0 border-t border-line bg-white px-4 py-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {locked ? (
          <p className="text-center text-[11px] leading-relaxed text-muted">
            {gate === 'pending'
              ? 'レポートが承認されるとやり取りを始められます。'
              : '見送りになったので、このやり取りは続けられません。'}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            // 複数行になっても崩れないよう、下端に合わせて伸ばす
            className="flex items-end gap-2 rounded-2xl border border-line-strong bg-tint px-2 py-1.5 transition-colors focus-within:border-accent-strong"
          >
            <textarea
              ref={draftRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="メッセージを入力（Shift+Enter で改行）"
              {...submitKey}
              /* 16px 固定：iOS の自動ズーム防止 */
              style={{ fontSize: '16px' }}
              className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1 leading-relaxed text-ink placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="送る"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white transition-opacity disabled:opacity-30"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        )}
        <p className="mt-2 text-center text-[10px] text-muted">
          ※ この端末の中だけに保存されます。相手には届きません
        </p>
      </div>
    </div>
  );
}
