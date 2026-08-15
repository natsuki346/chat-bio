import type { ReactNode } from 'react';

/** ナビで使う線のアイコン。色は currentColor を継ぐので、選択中は自動で色が変わる。 */
function Icon({ children, className = 'h-4 w-4 shrink-0' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

/**
 * 名前の下に置くイラスト。左右の半球としわを線で描いた脳。
 * アイコンより大きく使うので、専用の viewBox で持つ。
 */
export function BrainMark({ className = 'h-16 w-auto' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* 左右を分ける溝 */}
      <path d="M48 14v46" />
      {/* 左半球 */}
      <path d="M48 14c-4-6-14-6-18 0-8-2-14 4-12 11-8 3-9 13-2 18-4 7 2 15 10 14 4 6 14 7 22 2" />
      {/* 右半球 */}
      <path d="M48 14c4-6 14-6 18 0 8-2 14 4 12 11 8 3 9 13 2 18 4 7-2 15-10 14-4 6-14 7-22 2" />
      {/* しわ */}
      <path d="M30 22c6 2 6 8 0 10" />
      <path d="M66 22c-6 2-6 8 0 10" />
      <path d="M20 36c6 0 10 4 6 10" />
      <path d="M76 36c-6 0-10 4-6 10" />
      <path d="M34 50c4 3 10 3 14 0" />
      <path d="M62 50c-4 3-10 3-14 0" />
    </svg>
  );
}

/** 新しいチャット：しっぽ付きの吹き出し */
export function BubbleIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </Icon>
  );
}

/** DMs：Instagram のような紙飛行機 */
export function PaperPlaneIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21.5 2.5L2.5 9.6l8.4 3.5 3.5 8.4z" />
      <path d="M21.5 2.5l-10.6 10.6" />
    </Icon>
  );
}

/** モデル選択の目印。生成にまつわるものだと分かる四芒星 */
export function SparkIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path
        d="M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4-5.4-1.9 5.4-1.9z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M18.6 16.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** マイカード：重なったカード */
export function CardsIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8 4h9.5A2.5 2.5 0 0 1 20 6.5V16" />
      <rect x="3" y="7.5" width="14" height="13" rx="2.5" />
    </Icon>
  );
}

/** 音声入力：マイク（スタンド付きで「録る」ものだと分かる形にする） */
export function MicIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
      <path d="M8.5 21h7" />
    </Icon>
  );
}

/** 音声入力を止める */
export function StopIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** 添付する */
export function PlusIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

/** 添付されたもの */
export function FileIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13.5 3.5H7A2 2 0 0 0 5 5.5v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13.5 3.5V9H19" />
    </Icon>
  );
}

/** 送信 */
export function SendIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 19V5" />
      <path d="M5.5 11.5L12 5l6.5 6.5" />
    </Icon>
  );
}

/** 前の画面へ */
export function BackIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}
