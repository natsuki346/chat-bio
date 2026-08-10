import type { ModelId, SearchMode } from '@/types';

/** 入力欄のメニュー用ラベル。クライアントで使うので SDK には依存させない。 */
export const MODE_OPTIONS: { value: SearchMode; label: string; hint: string }[] = [
  { value: 'experience', label: '経験談を探す', hint: '同じ経験をした人の話を3件' },
  { value: 'person', label: '人を探す', hint: '近いことを言っている人を3件' },
];

export const MODEL_OPTIONS: { value: ModelId; label: string; hint: string }[] = [
  { value: 'claude-opus-4-6', label: 'Opus 4.6', hint: 'いちばん丁寧。そのぶん遅い' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6', hint: 'バランス型' },
  { value: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: 'いちばん速い' },
];
