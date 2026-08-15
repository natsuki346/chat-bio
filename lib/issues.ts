import type { IssueCard } from '@/types';

const STORAGE_KEY = 'chat-bio:issues';

/*
 * 整理モードで育てた悩みカード。
 * 対話しながら draft を書き換え、本人が承認したら approved にする。
 * 相談モードへは、このカードを添付として持っていく。
 */
const EMPTY: IssueCard[] = [];
let snapshot: IssueCard[] | null = null;
const listeners = new Set<() => void>();

function read(): IssueCard[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is IssueCard =>
          typeof item === 'object' && item !== null && typeof (item as IssueCard).id === 'string',
      )
      // 後から足した項目は古い記録に無いので既定値を入れる
      .map((item) => ({
        ...item,
        problems: item.problems ?? [],
        wants: item.wants ?? [],
        messages: item.messages ?? [],
      }));
  } catch {
    return [];
  }
}

export function subscribeIssues(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getIssuesSnapshot(): IssueCard[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** SSR とハイドレーション時はこちら。中身は常に空 */
export function getServerIssuesSnapshot(): IssueCard[] {
  return EMPTY;
}

export function updateIssues(next: (prev: IssueCard[]) => IssueCard[]): void {
  snapshot = next(getIssuesSnapshot());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 保存できなくても本体は止めない
  }
  for (const listener of listeners) listener();
}

/** 空のカードを1枚立てる。整理モードを始めるときに呼ぶ。 */
export function createIssue(): IssueCard {
  const card: IssueCard = {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'draft',
    title: '',
    summary: '',
    background: '',
    problems: [],
    wants: [],
    ready: false,
    messages: [],
    createdAt: new Date().toISOString(),
  };
  updateIssues((prev) => [card, ...prev]);
  return card;
}

export function saveIssue(card: IssueCard): void {
  updateIssues((prev) => {
    const exists = prev.some((item) => item.id === card.id);
    return exists ? prev.map((item) => (item.id === card.id ? card : item)) : [card, ...prev];
  });
}

export function approveIssue(id: string): void {
  updateIssues((prev) =>
    prev.map((item) =>
      item.id === id ? { ...item, status: 'approved', approvedAt: new Date().toISOString() } : item,
    ),
  );
}

export function deleteIssue(id: string): void {
  updateIssues((prev) => prev.filter((item) => item.id !== id));
}

/** 書きかけ（まだ何も入っていない draft）は畳んでおきたいので、中身の有無を見る。 */
export function hasContent(card: IssueCard): boolean {
  return Boolean(card.title || card.summary || card.background || card.problems.length);
}

/**
 * カードを、そのまま相手にも読める文章にする。
 * 相談モードへはこの形で添付として持っていく。
 */
export function issueToMarkdown(card: IssueCard): string {
  const lines: string[] = [];
  if (card.title) lines.push(`# ${card.title}`, '');
  if (card.summary) lines.push('## 概要', card.summary, '');
  if (card.background) lines.push('## 背景', card.background, '');
  if (card.problems.length > 0) {
    lines.push('## 具体的に困っていること');
    for (const item of card.problems) lines.push(`- ${item}`);
    lines.push('');
  }
  if (card.wants.length > 0) {
    lines.push('## 聞きたいこと');
    for (const item of card.wants) lines.push(`- ${item}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}
