import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";

export default function PresetsPanel({
  deletePreset,
  loadPreset,
  newPresetName,
  presets,
  regenerateDecorations,
  regenerateOre,
  regenerateTrees,
  savePreset,
  setNewPresetName,
}) {
  const t = STRINGS.en;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        borderBottom: "1px solid #1e222b",
        background: "#141822",
        maxHeight: 300,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.presetsHint}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          placeholder={t.slotNamePlaceholder}
          style={{ ...inputStyle, width: 160 }}
        />
        <button style={actionBtn} onClick={() => savePreset(newPresetName)}>
          {t.savePresetBtn}
        </button>
      </div>

      {presets.length === 0 && (
        <div style={{ fontSize: 12, color: "#5c6272" }}>{t.noPresets}</div>
      )}

      {presets.map((name) => (
        <div
          key={name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            background: "#0e1117",
          }}
        >
          <span style={{ fontSize: 12, flex: 1 }}>{name}</span>
          <button style={actionBtn} onClick={() => loadPreset(name)}>
            {t.slotLoad}
          </button>
          <button style={actionBtn} onClick={() => deletePreset(name)}>
            {t.slotDelete}
          </button>
        </div>
      ))}

      <div
        style={{
          borderTop: "1px solid #1e222b",
          paddingTop: 8,
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.regenHint}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={actionBtn} onClick={regenerateDecorations}>
            {t.regenDeco}
          </button>
          <button style={actionBtn} onClick={regenerateTrees}>
            {t.regenTrees}
          </button>
          <button style={actionBtn} onClick={regenerateOre}>
            {t.regenOre}
          </button>
        </div>
      </div>
    </div>
  );
}
