'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import ComposerMenu from './ComposerMenu';
import ComposerSettings from './ComposerSettings';
import MoreMenu from './MoreMenu';
import { FileIcon, MicIcon, PlusIcon, SendIcon, SparkIcon, StopIcon } from './Icons';
import { useSpeechInput } from './useSpeechInput';
import { autoGrow, useSubmitKey } from './useSubmitKey';
import { APP_MODE_OPTIONS, MODEL_OPTIONS, TONE_OPTIONS } from '@/lib/options';
import { ACCEPT, MAX_FILES, readAttachments } from '@/lib/attachments';
import type { AppMode, Attachment, ModelId, Tone } from '@/types';

/** 入力欄の最初に置く、変わらない誘い文句。モードによって聞き方を変える */
const PROMPT_BY_MODE: Record<AppMode, string> = {
  organize: '今の状況を話してみましょう',
  consult: 'Brainに頼んでみましょう',
};

/**
 * 誘い文句のうしろに流す「例えばこんな悩み」。
 * 何を書いていい場所なのかが伝わらないので、実際に打てる文面をそのまま流す。
 */
const EXAMPLES = [
  '部活が急にできなくなって苦しい',
  '就活、何から始めればいいか分からない',
  '努力してるのに結果が出ない',
  '本音を言える相手がいない',
  'やりたいことが見つからない',
  '好きだったことが、急に嫌になった',
  '周りに置いていかれている気がする',
  '人に嫌われるのが怖くて動けない',
];

/** 打つ速さ・消す速さ・打ち終わってから消し始めるまでの間（ミリ秒） */
const TYPE_MS = 70;
const ERASE_MS = 30;
const HOLD_MS = 1600;

export default function InputBar({
  onSubmit,
  loading,
  model,
  onModelChange,
  tone,
  onToneChange,
  appMode,
  onAppModeChange,
  attachments,
  onAttachmentsChange,
  onPickCard,
  docked = false,
}: {
  onSubmit: (query: string, attachments: Attachment[]) => void;
  loading: boolean;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  tone: Tone;
  onToneChange: (tone: Tone) => void;
  appMode: AppMode;
  onAppModeChange: (mode: AppMode) => void;
  /** 添付は親が持つ。整理したカードを外から足せるようにするため */
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  /** 「カードから選択」を押したとき */
  onPickCard: () => void;
  /** 会話が始まったら下に固定する。最初は画面中央に置く。 */
  docked?: boolean;
}) {
  const [value, setValue] = useState('');
  const [example, setExample] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  /*
   * 例文を1文字ずつ打って、消して、次の例文へ。
   * 「ここに書くんだ」というのが手つきで伝わるようにしている。
   * 打っている最中は動かさない（気が散るし、そもそも見えない）。
   */
  useEffect(() => {
    if (value) return;

    // 動きを減らす設定の人には、切り替えるだけで打つ動きは出さない
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const pick = () => setExample(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
      const first = setTimeout(pick, 0);
      const swap = setInterval(pick, HOLD_MS * 2);
      return () => {
        clearTimeout(first);
        clearInterval(swap);
      };
    }

    let index = Math.floor(Math.random() * EXAMPLES.length);
    let cursor = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const full = EXAMPLES[index];
      if (erasing) {
        cursor -= 1;
        setExample(full.slice(0, cursor));
        if (cursor <= 0) {
          erasing = false;
          index = (index + 1) % EXAMPLES.length;
        }
        timer = setTimeout(tick, ERASE_MS);
        return;
      }

      cursor += 1;
      setExample(full.slice(0, cursor));
      if (cursor >= full.length) {
        erasing = true;
        // 打ち終わったら少し置いて、読めるようにする
        timer = setTimeout(tick, HOLD_MS);
        return;
      }
      timer = setTimeout(tick, TYPE_MS);
    };

    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, [value]);

  /** 選ばれたファイルを読んで添付に足す。読めなかったものは名前を控えて知らせる */
  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_FILES - attachments.length;
    const result = await readAttachments([...files].slice(0, Math.max(room, 0)));
    onAttachmentsChange([...attachments, ...result.attachments].slice(0, MAX_FILES));
    setSkipped(result.skipped);
  };

  const send = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    if (speech.listening) speech.stop();
    baseRef.current = '';
    setValue('');
    onSubmit(trimmed, attachments);
    onAttachmentsChange([]);
    setSkipped([]);
  };

  const submitKey = useSubmitKey(() => send(value));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(value);
  };

  const prompt = PROMPT_BY_MODE[appMode];

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
      <div className={docked ? 'mx-auto w-full max-w-[720px] px-5 pt-3' : 'w-full'}>
        {/* 入力・モデル・モード・送信をひとつの枠にまとめる */}
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
            placeholder={example ? `${prompt}　${example}` : prompt}
            disabled={loading}
            {...submitKey}
            /* 16px 固定：iOS の自動ズーム防止 */
            style={{ fontSize: '16px' }}
            className="w-full resize-none overflow-y-auto bg-transparent px-2 py-1.5 leading-relaxed text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
          />

          {attachments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 px-1 pb-2">
              {attachments.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-white py-1 pl-2 pr-1 text-[11px] text-ink"
                >
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
                  <span className="max-w-[160px] truncate">{item.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onAttachmentsChange(attachments.filter((file) => file.name !== item.name))
                    }
                    aria-label={`${item.name} を外す`}
                    className="rounded px-1 leading-none text-muted transition-colors hover:text-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* スマホでも崩れたりスクロールしたりしないよう、1行に収まる分だけ並べる */}
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(event) => {
                void pickFiles(event.target.files);
                // 同じファイルをもう一度選べるように毎回空にする
                event.target.value = '';
              }}
              className="hidden"
            />
            {/* 整理中でも資料を見せながら話したいことがあるので、モードに関わらず出す */}
            <MoreMenu
              label="添える"
              align="left"
              trigger={<PlusIcon className="h-4 w-4" />}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-ink transition-colors hover:border-accent-strong"
              items={[
                { label: 'ファイルを添付', onSelect: () => fileRef.current?.click() },
                { label: 'カードから選択', onSelect: onPickCard },
              ]}
            />

            {/* 選ぶものは右にまとめる。何を選んでいるのかは小さく見出しで示す */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {/*
               * 3つのピルを並べるとスマホ幅では入りきらないので、
               * 640px 以上だけ横並びのピルを出し、それ未満は1つのボタンにまとめる
               */}
              <div className="hidden items-center gap-2 sm:flex">
                {/* 見出しは段を作らず、値の左に添える（チャット系の入力欄の作り方に合わせる） */}
                <ComposerMenu
                  label="モデル"
                  options={MODEL_OPTIONS}
                  value={model}
                  onChange={onModelChange}
                  disabled={loading}
                  leading={<span className="text-[10px] tracking-wide text-faint">モデル</span>}
                  heading={
                    // どこのモデルを使っているのかが一目で分かるようにしておく
                    <span className="flex items-center gap-1.5">
                      <SparkIcon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
                      <span className="text-[12px] font-medium text-ink">Claude</span>
                      <span className="text-[11px] text-muted">by Anthropic</span>
                    </span>
                  }
                />

                <ComposerMenu
                  label="語り口"
                  options={TONE_OPTIONS}
                  value={tone}
                  onChange={onToneChange}
                  disabled={loading}
                  leading={<span className="text-[10px] tracking-wide text-faint">語り口</span>}
                />

                {/* 整理／相談の切り替え。モデル・語り口と並びで置く */}
                <ComposerMenu
                  label="モード"
                  options={APP_MODE_OPTIONS}
                  value={appMode}
                  onChange={onAppModeChange}
                  disabled={loading}
                  leading={<span className="text-[10px] tracking-wide text-faint">モード</span>}
                />
              </div>

              <div className="sm:hidden">
                <ComposerSettings
                  model={model}
                  onModelChange={onModelChange}
                  tone={tone}
                  onToneChange={onToneChange}
                  appMode={appMode}
                  onAppModeChange={onAppModeChange}
                  disabled={loading}
                />
              </div>

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
          {skipped.length > 0 && (
            <p className="px-2 pt-1.5 text-[11px] text-muted">
              {skipped.join('、')} は文字として読めないので添えられません
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
