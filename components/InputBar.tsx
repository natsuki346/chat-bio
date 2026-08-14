'use client';

import { useCallback, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import ComposerMenu from './ComposerMenu';
import { MicIcon, SendIcon, SparkIcon, StopIcon } from './Icons';
import { useSpeechInput } from './useSpeechInput';
import { autoGrow, useSubmitKey } from './useSubmitKey';
import { MODEL_OPTIONS, MODE_OPTIONS, TONE_OPTIONS } from '@/lib/options';
import type { ModelId, SearchMode, Tone } from '@/types';

export default function InputBar({
  onSubmit,
  loading,
  model,
  onModelChange,
  mode,
  onModeChange,
  tone,
  onToneChange,
  docked = false,
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  tone: Tone;
  onToneChange: (tone: Tone) => void;
  /** 会話が始まったら下に固定する。最初は画面中央に置く。 */
  docked?: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 話し始めた時点の入力内容。認識結果はこれに足していく
  const baseRef = useRef('');
  const onTranscript = useCallback((text: string) => {
    setValue(baseRef.current ? `${baseRef.current} ${text}` : text);
  }, []);
  const speech = useSpeechInput({ onTranscript });

  // 打っても喋っても、中身に合わせて高さを合わせ直す
  useLayoutEffect(() => {
    autoGrow(textareaRef.current);
  }, [value]);

  const send = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    if (speech.listening) speech.stop();
    baseRef.current = '';
    setValue('');
    onSubmit(trimmed);
  };

  const submitKey = useSubmitKey(() => send(value));

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
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="いま、なにに悩んでる？（Shift+Enter で改行）"
            disabled={loading}
            {...submitKey}
            /* 16px 固定：iOS の自動ズーム防止 */
            style={{ fontSize: '16px' }}
            className="min-h-[76px] w-full resize-none overflow-y-auto bg-transparent px-2 pb-2 pt-2 leading-relaxed text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
          />

          {/* 狭い画面では音声・送信が次の行に折り返す（はみ出させない） */}
          <div className="flex flex-wrap items-center gap-2">
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
              leading={<SparkIcon className="h-3.5 w-3.5 text-accent-strong" />}
              heading={
                // どこのモデルを使っているのかが一目で分かるようにしておく
                <span className="flex items-center gap-1.5">
                  <SparkIcon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
                  <span className="text-[12px] font-medium text-ink">Claude</span>
                  <span className="text-[11px] text-muted">by Anthropic</span>
                </span>
              }
            />

            <div className="ml-auto flex items-center gap-2">
              <ComposerMenu
                label="語り口"
                options={TONE_OPTIONS}
                value={tone}
                onChange={onToneChange}
                disabled={loading}
              />
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
                  title={
                    speech.listening
                      ? '押すと聞き取りを止めます'
                      : '話した内容を文字にして入力します'
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                    speech.listening
                      ? 'border-accent-strong bg-accent-strong text-white'
                      : 'border-line-strong bg-white text-ink hover:border-accent-strong'
                  }`}
                >
                  {speech.listening ? (
                    <StopIcon className="h-4 w-4" />
                  ) : (
                    <MicIcon className="h-4 w-4" />
                  )}
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
