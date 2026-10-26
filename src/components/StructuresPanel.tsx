import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { clamp } from "../lib/numbers";
import { useRef, useState } from "react";

function exportStructure(entry) {
    const data = {
      name: entry.name,
      category: entry.category || "other",
      sizeX: entry.sizeX,
      sizeY: entry.sizeY,
      sizeZ: entry.sizeZ,
      voxels: entry.voxels,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (entry.name || "structure").replace(/\s+/g, "_") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

export default function StructuresPanel({
  deleteStructure,
  ensureStructureThumb,
  importStructureFiles,

  openPopover,
  placingRotation,
  placingStructureId,
  popoverAnchorRef,
  saveCurrentMapAsStructure,

  setOpenPopover,
  setPlacingRotation,
  setPlacingStructureId,
  setStructureCount,
  structures,
  thumbVersion,
  toggleStructure,
  updateStructureField,
}) {
  const [structureCategoryFilter, setStructureCategoryFilter] = useState("all");
  const [newStructureName, setNewStructureName] = useState("Structure");
  const [newStructureCategory, setNewStructureCategory] = useState("other");

  const structureFileInputRef = useRef<HTMLInputElement>(null);
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
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          style={actionBtn}
          onClick={() => structureFileInputRef.current?.click()}
        >
          {t.importStructures}
        </button>
        <input
          type="file"
          accept="application/json"
          multiple
          ref={structureFileInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            importStructureFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          type="text"
          value={newStructureName}
          onChange={(e) => setNewStructureName(e.target.value)}
          placeholder={t.structureNamePlaceholder}
          style={{ ...inputStyle, width: 120 }}
        />
        <select
          value={newStructureCategory}
          onChange={(e) => setNewStructureCategory(e.target.value)}
          style={{ ...inputStyle, width: 100 }}
        >
          <option value="building">{t.catBuilding}</option>
          <option value="dungeon">{t.catDungeon}</option>
          <option value="decoration">{t.catDecoration}</option>
          <option value="other">{t.catOther}</option>
        </select>
        <button
          style={actionBtn}
          onClick={() => saveCurrentMapAsStructure(newStructureName, newStructureCategory)}
        >
          {t.saveCurrentAsStructure}
        </button>
      </div>

      <div style={{ display: "flex", gap: 2 }}>
        {["all", "building", "dungeon", "decoration", "other"].map((cat) => (
          <button
            key={cat}
            onClick={() => setStructureCategoryFilter(cat)}
            style={{
              ...actionBtn,
              padding: "4px 8px",
              fontSize: 11,
              border:
                structureCategoryFilter === cat
                  ? "1px solid #6ea8fe"
                  : "1px solid #2a2f3a",
              background: structureCategoryFilter === cat ? "#22314d" : "#1a1d24",
            }}
          >
            {cat === "all"
              ? t.catAll
              : cat === "building"
              ? t.catBuilding
              : cat === "dungeon"
              ? t.catDungeon
              : cat === "decoration"
              ? t.catDecoration
              : t.catOther}
          </button>
        ))}
      </div>

      {structures.length === 0 && (
        <div style={{ fontSize: 12, color: "#5c6272" }}>{t.noStructures}</div>
      )}

      {structures
        .filter(
          (s) =>
            structureCategoryFilter === "all" ||
            (s.category || "other") === structureCategoryFilter
        )
        .map((s) => {
        void thumbVersion;
        const thumb = ensureStructureThumb(s);
        const isArmed = placingStructureId === s.id;
        const popKey = "struct-" + s.id;
        const isPopOpen = openPopover === popKey;
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 8px",
              borderRadius: 6,
              background: isArmed ? "#22314d" : "#0e1117",
              border: isArmed ? "1px solid #6ea8fe" : "1px solid transparent",
            }}
          >
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={() => toggleStructure(s.id)}
              title={t.structureCount}
            />
            {thumb && (
              <img
                src={thumb}
                alt=""
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  imageRendering: "pixelated",
                  border: "1px solid rgba(255,255,255,0.15)",
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontSize: 12, flex: 1, minWidth: 70 }}>{s.name}</span>
            <span
              style={{
                fontSize: 10,
                color: "#8a91a3",
                border: "1px solid #2a2f3a",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              {s.category === "building"
                ? t.catBuilding
                : s.category === "dungeon"
                ? t.catDungeon
                : s.category === "decoration"
                ? t.catDecoration
                : t.catOther}
            </span>
            <span style={{ fontSize: 11, color: "#8a91a3" }}>
              {s.sizeX}×{s.sizeY}×{s.sizeZ}
            </span>
            <label style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center" }}>
              {t.structureCount}
              <input
                type="number"
                min={0}
                max={50}
                value={s.count}
                onChange={(e) =>
                  setStructureCount(s.id, clamp(e.target.value, 0, 50))
                }
                style={{ ...inputStyle, width: 42 }}
              />
            </label>

            <button
              style={{
                ...actionBtn,
                padding: "4px 8px",
                border: isArmed ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
                background: isArmed ? "#2a3f66" : "#1a1d24",
              }}
              onClick={() => {
                setPlacingStructureId(isArmed ? null : s.id);
                setPlacingRotation(0);
              }}
              title={t.structurePlace}
            >
              📍
            </button>

            <div
              style={{ position: "relative" }}
              ref={isPopOpen ? popoverAnchorRef : null}
            >
              <button
                style={{ ...actionBtn, padding: "4px 8px" }}
                onClick={() => setOpenPopover(isPopOpen ? null : popKey)}
                title={t.settings}
              >
                ⚙
              </button>
              {isPopOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    zIndex: 30,
                    background: "#1a1d24",
                    border: "1px solid #2a2f3a",
                    borderRadius: 8,
                    padding: 10,
                    minWidth: 190,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <label
                    style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
                  >
                    {t.structureCategory}
                    <select
                      value={s.category || "other"}
                      onChange={(e) =>
                        updateStructureField(s.id, "category", e.target.value)
                      }
                      style={{ ...inputStyle, width: 100 }}
                    >
                      <option value="building">{t.catBuilding}</option>
                      <option value="dungeon">{t.catDungeon}</option>
                      <option value="decoration">{t.catDecoration}</option>
                      <option value="other">{t.catOther}</option>
                    </select>
                  </label>
                  <label
                    style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={!!s.rotate}
                      onChange={(e) =>
                        updateStructureField(s.id, "rotate", e.target.checked)
                      }
                    />
                    {t.structureRandomRotate}
                  </label>
                  <label
                    style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={!!s.requireFlat}
                      onChange={(e) =>
                        updateStructureField(s.id, "requireFlat", e.target.checked)
                      }
                    />
                    {t.structureRequireFlat}
                  </label>
                  <label
                    style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
                  >
                    {t.structureSpacing}
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={s.minSpacing}
                      onChange={(e) =>
                        updateStructureField(
                          s.id,
                          "minSpacing",
                          clamp(e.target.value, 0, 20)
                        )
                      }
                      style={{ ...inputStyle, width: 46 }}
                    />
                  </label>
                </div>
              )}
            </div>

            <button
              style={{ ...actionBtn, padding: "4px 8px" }}
              onClick={() => exportStructure(s)}
              title={t.structureExport}
            >
              ⭳
            </button>
            <button
              style={{ ...actionBtn, padding: "4px 8px" }}
              onClick={() => deleteStructure(s.id)}
              title={t.structureDelete}
            >
              ×
            </button>
          </div>
        );
      })}

      {placingStructureId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px",
            borderRadius: 6,
            background: "#22314d",
            border: "1px solid #6ea8fe",
            fontSize: 12,
          }}
        >
          <span>{t.structurePlacingHint}</span>
          <button
            style={actionBtn}
            onClick={() => setPlacingRotation((r) => (r + 1) % 4)}
          >
            ⟲ {placingRotation * 90}°
          </button>
          <button style={actionBtn} onClick={() => setPlacingStructureId(null)}>
            ✕ {t.structureCancelPlacing}
          </button>
        </div>
      )}
    </div>
  );
}
