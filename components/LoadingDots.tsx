export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-6" aria-label="読み込み中">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#666666] animate-[chatbio-blink_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}
