import type { Person } from '@/types';

// 外部SNSには繋がず、チャットはこの中で完結させる
export const PEOPLE: Record<string, Person> = {
  natsu: {
    name: 'なつき',
    handle: '@stranger_natsu',
  },
};

export const DEFAULT_PERSON = 'natsu';
