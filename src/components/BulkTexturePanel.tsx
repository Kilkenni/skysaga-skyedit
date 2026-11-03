import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { colorForId } from "../lib/colors";

interface Props {
  applyBulkTextures,
  bulkApplying,
  bulkFolderInputRef,
  bulkTextureRows,
  handleBulkFolderSelect,
  toggleBulkRow,
  updateBulkRowId,
}

export default function BulkTexturePanel({
  applyBulkTextures,
  bulkApplying,
  bulkFolderInputRef,
  bulkTextureRows,
  handleBulkFolderSelect,
  toggleBulkRow,
  updateBulkRowId,
}:Props) {
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
        maxHeight: 260,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.bulkImportHeader}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={actionBtn} onClick={() => bulkFolderInputRef.current.click()}>
          {t.chooseFolder}
        </button>
        <input
          type="file"
          accept="image/*"
          webkitdirectory="true"
          multiple
          ref={bulkFolderInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            handleBulkFolderSelect(e.target.files);
            e.target.value = "";
          }}
        />
        {bulkTextureRows.length > 0 && (
          <button
            style={{ ...actionBtn, background: "#1b3a2a", borderColor: "#2f6b48" }}
            onClick={applyBulkTextures}
            disabled={bulkApplying}
          >
            {t.bulkApply(bulkTextureRows.filter((r) => r.include && r.id !== null).length)}
          </button>
        )}
      </div>

      {bulkTextureRows.length === 0 && (
        <div style={{ fontSize: 12, color: "#5c6272" }}>{t.bulkNoFiles}</div>
      )}

      {bulkTextureRows.map((r, i) => (
        <div
          key={r.name + i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 6px",
            borderRadius: 6,
            background: r.include ? "#0e1117" : "transparent",
            opacity: r.include ? 1 : 0.45,
          }}
        >
          <input
            type="checkbox"
            checked={r.include}
            onChange={() => toggleBulkRow(i)}
          />
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              backgroundImage: `url(${r.previewUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              imageRendering: "pixelated",
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "#8a91a3",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={r.name}
          >
            {r.name}
          </span>
          <span style={{ fontSize: 11 }}>→</span>
          <input
            type="number"
            min={1}
            max={255}
            value={r.id ?? ""}
            placeholder={t.bulkIdUnrecognized}
            onChange={(e) => updateBulkRowId(i, e.target.value)}
            style={{ ...inputStyle, width: 60 }}
          />
          {r.id !== null && (
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(r.id),
                flexShrink: 0,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
