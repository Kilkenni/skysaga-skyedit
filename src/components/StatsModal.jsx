import { STRINGS } from "../i18n/strings";
import { actionBtn } from "../styles/inline";
import { colorForId } from "../lib/colors";

export default function StatsModal({
  setShowStats,
  statsData,
}) {
  const t = STRINGS.en;
  return (
    <div
      onClick={() => setShowStats(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#12151b",
          border: "1px solid #2a2f3a",
          borderRadius: 10,
          maxWidth: 480,
          width: "100%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #1e222b",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "#6ea8fe" }}>
            {t.statsTitle}
          </div>
          <button onClick={() => setShowStats(false)} style={actionBtn}>
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 16 }}>
          {statsData.total === 0 ? (
            <div style={{ fontSize: 12, color: "#8a91a3" }}>{t.statsNoData}</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#8a91a3", marginBottom: 10 }}>
                {t.statsTotal(statsData.total)}
              </div>
              {statsData.rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "5px 0",
                    borderBottom: "1px solid #1a1d24",
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: colorForId(row.id),
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#8a91a3", width: 28 }}>{row.id}</span>
                  <span style={{ fontSize: 12, flex: 1 }}>{row.name || "—"}</span>
                  <span style={{ fontSize: 12, color: "#dfe3ea" }}>{row.count}</span>
                  <span style={{ fontSize: 11, color: "#8a91a3", width: 44, textAlign: "right" }}>
                    {row.pct}%
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
