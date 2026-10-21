import { STRINGS } from "../i18n/strings";
import { actionBtn } from "../styles/inline";
import { CHUNK } from "../constants";

export default function LayerNav({
  chunkY,
  currentLayer,
  gridY,
  localY,
  setCurrentLayer,
  totalHeight,
}) {
  const t = STRINGS.en;
  return (
    <div
      style={{
        width: 170,
        borderLeft: "1px solid #1e222b",
        padding: 12,
        background: "#0e1117",
      }}
    >
      <div style={{ fontSize: 12, color: "#8a91a3", marginBottom: 8 }}>
        {t.layerY}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#6ea8fe" }}>
        {currentLayer}
      </div>
      <div style={{ fontSize: 11, color: "#8a91a3", marginBottom: 8 }}>
        {t.chunkLocal(chunkY, localY)}
      </div>
      <input
        type="range"
        min={0}
        max={totalHeight - 1}
        value={currentLayer}
        onChange={(e) => setCurrentLayer(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        <button
          style={actionBtn}
          onClick={() => setCurrentLayer(Math.max(0, currentLayer - 1))}
        >
          ↓
        </button>
        <button
          style={actionBtn}
          onClick={() =>
            setCurrentLayer(Math.min(totalHeight - 1, currentLayer + 1))
          }
        >
          ↑
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: "#8a91a3" }}>
        {t.quickJump}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {Array.from({ length: gridY }).map((_, cy) => (
          <button
            key={cy}
            onClick={() => setCurrentLayer(cy * CHUNK)}
            style={{
              ...actionBtn,
              textAlign: "left",
              background: chunkY === cy ? "#22314d" : "#1a1d24",
            }}
          >
            {t.chunkY(cy)}
          </button>
        ))}
      </div>
    </div>
  );
}
