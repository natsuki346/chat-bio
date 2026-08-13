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

/** 新しい相談：これから書く、を表す鉛筆 */
export function ComposeIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M16.5 4.5l3 3" />
      <path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
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

/** チャット：しっぽ付きの吹き出しと、中の3点（会話しているのが一目で分かる形） */
export function ChatIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <circle cx="8.5" cy="10" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.05" fill="currentColor" stroke="none" />
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
