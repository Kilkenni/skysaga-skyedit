import { STRINGS } from "../i18n/strings";
import { actionBtn } from "../styles/inline";

export default function HelpModal({
  setShowHelp,
}) {
  const t = STRINGS.en;
  return (
    <div
      onClick={() => setShowHelp(false)}
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
          maxWidth: 720,
          width: "100%",
          maxHeight: "85vh",
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
            {t.helpTitle}
          </div>
          <button onClick={() => setShowHelp(false)} style={actionBtn}>
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 16 }}>
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "#dfe3ea",
              whiteSpace: "pre-line",
            }}
          >
            {t.helpUsage}
          </div>
          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: "1px solid #1e222b",
              fontSize: 12,
              fontWeight: 700,
              color: "#8a91a3",
              letterSpacing: 0.5,
            }}
          >
            {t.helpChangelogTitle}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#b7bcc7",
              whiteSpace: "pre-line",
            }}
          >
            {t.helpChangelog}
          </div>
        </div>
      </div>
    </div>
  );
}
