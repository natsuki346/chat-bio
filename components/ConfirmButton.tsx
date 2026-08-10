'use client';

import { useEffect, useState } from 'react';

/**
 * 1回目で確認、2回目で実行する削除用ボタン。誤タップで消えないようにする。
 */
export default function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = '',
  confirmClassName = '',
  title,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  confirmClassName?: string;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);

  // 確認状態のまま放置されないよう、少ししたら戻す
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      className={armed ? confirmClassName || className : className}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
