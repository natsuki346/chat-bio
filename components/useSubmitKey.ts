'use client';

import { useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';

/** 変換確定の Enter と、送信の Enter を見分けるための猶予（ミリ秒） */
const AFTER_COMPOSITION_MS = 120;

/**
 * Enter で送信、Shift+Enter で改行。
 *
 * 日本語入力では変換を確定するのにも Enter を使う。この確定の Enter で送信されると
 * 書きかけのまま飛んでしまうので、変換に関わる Enter は必ず送信から外す。
 * 判定を3重にしているのはブラウザごとに挙動が違うため：
 *   - isComposing / keyCode 229 … 変換中に押された Enter（Chrome・Firefox はこれで取れる）
 *   - compositionend からの経過時間 … Safari は確定時に compositionend が keydown より先に来るので、
 *     上の2つでは変換中だと分からない。直後の Enter は確定の分とみなす。
 */
export function useSubmitKey(onSubmit: () => void) {
  const composingRef = useRef(false);
  const endedAtRef = useRef(0);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false;
    endedAtRef.current = Date.now();
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter') return;
      // Shift+Enter は改行。既定の動きに任せる
      if (event.shiftKey) return;

      if (
        composingRef.current ||
        event.nativeEvent.isComposing ||
        event.keyCode === 229 ||
        Date.now() - endedAtRef.current < AFTER_COMPOSITION_MS
      ) {
        return;
      }

      event.preventDefault();
      onSubmit();
    },
    [onSubmit],
  );

  return { onKeyDown, onCompositionStart, onCompositionEnd };
}

/** 入力に合わせて textarea の高さを伸ばす。上限を超えたら中でスクロールさせる。 */
export function autoGrow(element: HTMLTextAreaElement | null, max = 260): void {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${Math.min(element.scrollHeight, max)}px`;
}
