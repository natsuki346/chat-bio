'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/*
 * Web Speech API は TypeScript の DOM 型に入っていないので、使う分だけ宣言する。
 * ブラウザ内蔵の音声認識なので、追加のライブラリも API 呼び出しも要らない。
 */
type SpeechAlternative = { transcript: string };
type SpeechResult = { readonly length: number; isFinal: boolean; [index: number]: SpeechAlternative };
type SpeechResultList = { readonly length: number; [index: number]: SpeechResult };
type SpeechResultEvent = { resultIndex: number; results: SpeechResultList };
type SpeechErrorEvent = { error: string };

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

// 対応状況は React の外の情報なので外部ストアとして読む（SSR とずれないように）
const subscribe = () => () => {};
const getSupported = () => getCtor() !== null;
const getServerSupported = () => false;

export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'error';

/**
 * 音声入力。話した内容を逐次テキストで返す。
 * onTranscript には「今回の発話の全文」が渡るので、呼び出し側で元の文と連結する。
 */
export function useSpeechInput({
  lang = 'ja-JP',
  onTranscript,
}: {
  lang?: string;
  onTranscript: (text: string, isFinal: boolean) => void;
}) {
  const supported = useSyncExternalStore(subscribe, getSupported, getServerSupported);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // 画面を離れるときは確実に止める
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      // 認識済みの全結果をつなげて「今の発話の全文」にする
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result) text += result[0]?.transcript ?? '';
      }
      const last = event.results[event.results.length - 1];
      onTranscript(text, Boolean(last?.isFinal));
    };

    recognition.onerror = (event) => {
      // マイクを拒否された場合と、それ以外の失敗を分ける
      setStatus(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'denied' : 'error');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;
    setStatus('listening');
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus('error');
    }
  }, [lang, onTranscript]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported, status, listening: status === 'listening', start, stop, toggle };
}
