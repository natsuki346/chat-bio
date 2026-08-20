import type { Person } from '@/types';

/*
 * 供給者は Supabase の suppliers テーブルで管理する。
 * 経験談には提供者の表示名が添えて返ってくるので、画面ではそれをそのまま使う。
 *
 * ここに残しているのは、DB を入れる前に作られたローカルの記録
 * （マイカード・DM・グッド）を開いたときに名前が出せなくならないための引き当て先。
 */
export const PEOPLE: Record<string, Person> = {
  natsu: {
    name: 'なつき',
    handle: '@stranger_natsu',
  },
};

export const DEFAULT_PERSON = 'natsu';

/**
 * 表示する人を決める。
 * DB から来たもの（name がある）はそれを使い、無ければ旧データとして PEOPLE を引く。
 */
export function resolvePerson(key?: string, name?: string, handle?: string): Person {
  if (name) return { name, handle: handle ?? `@${name}` };
  const found = key ? PEOPLE[key] : undefined;
  return found ?? PEOPLE[DEFAULT_PERSON];
}
