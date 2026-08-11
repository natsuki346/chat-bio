/** 星ひとつ分のかたち。塗りは外側の色を継ぐ */
function Star() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
      <path d="M8 1.3l2.06 4.17 4.6.67-3.33 3.25.79 4.58L8 11.81l-4.12 2.16.79-4.58L1.34 6.14l4.6-.67z" />
    </svg>
  );
}

function Row({ className }: { className: string }) {
  return (
    <span className={className}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} />
      ))}
    </span>
  );
}

/**
 * マッチ度を星と数値で見せる。星は0.5刻みに丸めた「レベル」、％は元の数値をそのまま出す。
 * 星だけだと 92% と 88% が同じ見た目になるので、両方を並べて出す。
 */
export default function MatchStars({ score }: { score: number }) {
  const level = Math.round((score / 100) * 10) / 2;

  return (
    <span
      className="flex shrink-0 items-center gap-2"
      aria-label={`マッチ度 ${score}パーセント、星${level}`}
    >
      {/* 灰色の5つを下敷きにして、黒い5つをレベル分だけ幅で見せる（半分の星もそのまま出る） */}
      <span className="relative inline-flex" aria-hidden>
        <Row className="flex text-[#dcdcdc]" />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${(level / 5) * 100}%` }}
        >
          <Row className="flex text-black" />
        </span>
      </span>
      <span className="text-[17px] font-medium tabular-nums leading-none text-black">{score}%</span>
    </span>
  );
}
