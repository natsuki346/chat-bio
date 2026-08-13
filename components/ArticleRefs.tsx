import type { Article } from '@/types';

export default function ArticleRefs({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="text-[11px] tracking-wide text-muted">関連する記事</h3>
      <ul className="mt-2 space-y-2">
        {articles.map((article) => (
          // 外部には飛ばさないので、リンクではなく参照の表示だけ
          <li
            key={article.title}
            className="rounded-lg border border-line bg-white px-3 py-2.5"
          >
            <span className="block text-[13px] leading-snug text-ink">{article.title}</span>
            {article.why && <span className="mt-1 block text-[11px] text-muted">{article.why}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
