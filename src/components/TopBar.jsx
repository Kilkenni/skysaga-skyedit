import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { MAP_SIZES, REAL_BIOMES, MAX_CHUNKS, mapSizeKey } from "../constants";
import { clamp } from "../lib/numbers";

export default function TopBar({
  applyGridResize,
  applyServerEdits,
  biomeName,
  cameraMode,
  editsInputRef,
  entityInstances,
  exportJson,
  exportJsonCompressed,
  fileInputRef,
  gameMode,
  gridX,
  gridY,
  gridZ,
  importJson,
  scheduleSave,
  setBiomeName,
  setCameraMode,
  setGameMode,
  setShowHelp,
  setViewMode,
  viewMode,
}) {
  const t = STRINGS.en;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        flexShrink: 0,
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid #1e222b",
        background: "#10131a",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: "#6ea8fe" }}>
        {t.title}
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          border: "1px solid #2a2f3a",
          borderRadius: 6,
          padding: 2,
        }}
      >
        <button
          onClick={() => setViewMode("2d")}
          style={{
            ...actionBtn,
            border: "none",
            background: viewMode === "2d" ? "#22314d" : "transparent",
          }}
        >
          {t.view2d}
        </button>
        <button
          onClick={() => setViewMode("3d")}
          style={{
            ...actionBtn,
            border: "none",
            background: viewMode === "3d" ? "#22314d" : "transparent",
          }}
        >
          {t.view3d}
        </button>
      </div>

      {viewMode === "3d" && (
        <div
          style={{
            display: "flex",
            gap: 2,
            border: "1px solid #2a2f3a",
            borderRadius: 6,
            padding: 2,
          }}
        >
          <button
            onClick={() => setCameraMode("orbit")}
            style={{
              ...actionBtn,
              border: "none",
              background: cameraMode === "orbit" ? "#22314d" : "transparent",
            }}
          >
            {t.cameraOrbit}
          </button>
          <button
            onClick={() => setCameraMode("fly")}
            style={{
              ...actionBtn,
              border: "none",
              background: cameraMode === "fly" ? "#22314d" : "transparent",
            }}
          >
            {t.cameraFly}
          </button>
        </div>
      )}

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.mapSize}
        <select
          value={
            MAP_SIZES.some((s) => mapSizeKey(s.x, s.y, s.z) === mapSizeKey(gridX, gridY, gridZ))
              ? mapSizeKey(gridX, gridY, gridZ)
              : "custom"
          }
          onChange={(e) => {
            const s = MAP_SIZES.find((m) => mapSizeKey(m.x, m.y, m.z) === e.target.value);
            if (s) applyGridResize(s.x, s.y, s.z);
          }}
          style={{
            ...inputStyle,
            width: 130,
            color: MAP_SIZES.some((s) => mapSizeKey(s.x, s.y, s.z) === mapSizeKey(gridX, gridY, gridZ))
              ? inputStyle.color
              : "#ffb86b",
          }}
          title={t.mapSizeTitle}
        >
          {MAP_SIZES.map((s) => (
            <option key={mapSizeKey(s.x, s.y, s.z)} value={mapSizeKey(s.x, s.y, s.z)} title={s.names}>
              {s.x} × {s.y} × {s.z}
            </option>
          ))}
          <option value="custom" disabled>
            {t.mapSizeCustom}
          </option>
        </select>
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.chunksX}
        <input
          type="number"
          min={1}
          max={MAX_CHUNKS.x}
          value={gridX}
          onChange={(e) => applyGridResize(clamp(e.target.value, 1, MAX_CHUNKS.x), gridY, gridZ)}
          style={inputStyle}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.y}
        <input
          type="number"
          min={1}
          max={MAX_CHUNKS.y}
          value={gridY}
          onChange={(e) => applyGridResize(gridX, clamp(e.target.value, 1, MAX_CHUNKS.y), gridZ)}
          style={inputStyle}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.z}
        <input
          type="number"
          min={1}
          max={MAX_CHUNKS.z}
          value={gridZ}
          onChange={(e) => applyGridResize(gridX, gridY, clamp(e.target.value, 1, MAX_CHUNKS.z))}
          style={inputStyle}
        />
      </label>

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.biome}
        <select
          value={biomeName}
          onChange={(e) => {
            setBiomeName(e.target.value);
            scheduleSave();
          }}
          style={{ ...inputStyle, width: 110 }}
        >
          {REAL_BIOMES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.gameMode}
        <input
          type="number"
          value={gameMode}
          onChange={(e) => {
            setGameMode(Number(e.target.value));
            scheduleSave();
          }}
          style={{ ...inputStyle, width: 50 }}
        />
      </label>

      <div style={{ flex: 1 }} />

      <button onClick={() => setShowHelp(true)} style={actionBtn}>
        {t.helpBtn}
      </button>

      <button onClick={() => fileInputRef.current.click()} style={actionBtn}>
        {t.importJson}
      </button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={importJson}
        style={{ display: "none" }}
      />
      <button onClick={() => editsInputRef.current.click()} style={actionBtn} title={t.applyEditsTitle}>
        {t.applyEdits}
      </button>
      <input
        type="file"
        accept="application/json,.json"
        ref={editsInputRef}
        onChange={(ev) => {
          const f = ev.target.files && ev.target.files[0];
          if (f) applyServerEdits(f);
          ev.target.value = "";
        }}
        style={{ display: "none" }}
      />
      {!entityInstances.some((e) => e.name === "Airship") && (
        <span style={{ fontSize: 12, color: "#ffb86b" }} title={t.airshipRequired}>
          {t.airshipMissing}
        </span>
      )}
      <button onClick={exportJson} style={{ ...actionBtn, background: "#1b3a2a", borderColor: "#2f6b48" }}>
        {t.exportJson}
      </button>
      <button
        onClick={exportJsonCompressed}
        style={{ ...actionBtn, background: "#1b3a2a", borderColor: "#2f6b48" }}
        title={t.exportJsonGzTitle}
      >
        {t.exportJsonGz}
      </button>
    </div>
  );
}
