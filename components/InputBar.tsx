'use client';

import { useCallback, useRef, useState, type FormEvent } from 'react';
import ComposerMenu from './ComposerMenu';
import { SendIcon } from './Icons';
import { useSpeechInput } from './useSpeechInput';
import { MODEL_OPTIONS, MODE_OPTIONS } from '@/lib/options';
import type { ModelId, SearchMode } from '@/types';

export default function InputBar({
  onSubmit,
  loading,
  model,
  onModelChange,
  mode,
  onModeChange,
  docked = false,
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  /** 会話が始まったら下に固定する。最初は画面中央に置く。 */
  docked?: boolean;
}) {
  const [value, setValue] = useState('');

  // 話し始めた時点の入力内容。認識結果はこれに足していく
  const baseRef = useRef('');
  const onTranscript = useCallback((text: string) => {
    setValue(baseRef.current ? `${baseRef.current} ${text}` : text);
  }, []);
  const speech = useSpeechInput({ onTranscript });

  const send = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    if (speech.listening) speech.stop();
    baseRef.current = '';
    setValue('');
    onSubmit(trimmed);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(value);
  };

  return (
    <div
      className={
        docked
          ? // lg でサイドバーのぶん左を空ける
            'fixed inset-x-0 bottom-0 border-t border-line bg-background/95 backdrop-blur lg:left-[260px]'
          : 'w-full'
      }
      style={docked ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
    >
      <div className={docked ? 'mx-auto w-full max-w-[600px] px-5 pt-3' : 'w-full'}>
        {/* 入力・モード・モデル・送信をひとつの枠にまとめる */}
        <form
          onSubmit={handleSubmit}
          className={`rounded-2xl border border-line-strong bg-tint p-2 transition-colors focus-within:border-accent-strong ${
            docked ? 'mb-3' : ''
          }`}
        >
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="いま、なにに悩んでる？"
            disabled={loading}
            /* 16px 固定：iOS の自動ズーム防止 */
            style={{ fontSize: '16px' }}
            className="w-full bg-transparent px-2 pb-2 pt-1 text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
          />

          <div className="flex items-center gap-2">
            <ComposerMenu
              label="検索モード"
              options={MODE_OPTIONS}
              value={mode}
              onChange={onModeChange}
              disabled={loading}
              leading={
                <span aria-hidden className="text-[13px] leading-none text-ink">
                  +
                </span>
              }
            />
            <ComposerMenu
              label="モデル"
              options={MODEL_OPTIONS}
              value={model}
              onChange={onModelChange}
              disabled={loading}
            />

            <div className="flex-1" />

            {speech.supported && (
              <button
                type="button"
                onClick={() => {
                  if (!speech.listening) baseRef.current = value.trim();
                  speech.toggle();
                }}
                disabled={loading}
                aria-pressed={speech.listening}
                aria-label={speech.listening ? '音声入力を止める' : '音声で入力する'}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                  speech.listening
                    ? 'animate-pulse border-accent-strong bg-accent-strong text-white'
                    : 'border-line-strong bg-white text-ink hover:border-accent-strong'
                }`}
              >
                <span aria-hidden className="text-[13px] leading-none">
                  ●
                </span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !value.trim()}
              aria-label="送る"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white transition-opacity disabled:opacity-30"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
          {speech.listening && (
            <p className="px-2 pt-1.5 text-[11px] text-muted">聞き取り中… もう一度押すと止まります</p>
          )}
          {speech.status === 'denied' && (
            <p className="px-2 pt-1.5 text-[11px] text-muted">
              マイクが使えません。ブラウザの設定で許可してください
            </p>
          )}
          {speech.status === 'error' && (
            <p className="px-2 pt-1.5 text-[11px] text-muted">音声を認識できませんでした</p>
          )}
        </form>
      </div>
    </div>
  );
}
