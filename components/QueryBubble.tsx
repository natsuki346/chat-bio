export default function QueryBubble({ query }: { query: string }) {
  return (
    <div className="flex justify-end">
      {/* 自分が打った文面。相手の話（白いカード）と区別できるように色を敷く */}
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-line bg-tint px-4 py-2.5 text-[14px] leading-relaxed text-ink">
        {query}
      </p>
    </div>
  );
}
