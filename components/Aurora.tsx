/**
 * 背景の波打つグラデーション。
 *
 * OPEN → CALM → SAFE → TRUST の順に色の塊を重ね、それぞれ違う周期で流す。
 * 外側の span が横、内側の i が縦と回転を担当していて、
 * 周期をずらすことで軌道が曲線になる（動きの作りは globals.css の .aurora 側）。
 *
 * 見た目の主役ではないので、読み上げからは外して操作も受けない。
 */
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span className="orb open">
        <i />
      </span>
      <span className="orb calm">
        <i />
      </span>
      <span className="orb sage">
        <i />
      </span>
      <span className="orb safe">
        <i />
      </span>
      <span className="orb trust">
        <i />
      </span>
    </div>
  );
}
