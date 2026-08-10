export default function QueryBubble({ query }: { query: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-[#e5e5e5] bg-white px-4 py-2.5 text-[14px] leading-relaxed text-black">
        {query}
      </p>
    </div>
  );
}
