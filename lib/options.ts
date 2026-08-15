import type { AppMode, ModelId, Tone } from '@/types';

export const APP_MODE_OPTIONS: { value: AppMode; label: string; hint: string }[] = [
  { value: 'organize', label: '整理', hint: 'AIと対話しながら悩みをカードにする' },
  { value: 'consult', label: '相談', hint: '経験者を探して繋がる' },
];

export const TONE_OPTIONS: { value: Tone; label: string; hint: string }[] = [
  { value: 'friend', label: '友達', hint: 'タメ口で、近い距離から' },
  { value: 'mentor', label: 'メンター', hint: '先を歩いた人として、背中を押す' },
  { value: 'expert', label: '専門家', hint: '落ち着いて、筋道立てて' },
];

/** 入力欄のメニュー用ラベル。クライアントで使うので SDK には依存させない。 */
export const MODEL_OPTIONS: { value: ModelId; label: string; hint: string }[] = [
  { value: 'claude-opus-4-6', label: 'Opus 4.6', hint: 'いちばん丁寧。そのぶん遅い' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6', hint: 'バランス型' },
  { value: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: 'いちばん速い' },
];
