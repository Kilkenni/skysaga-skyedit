import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { colorForId } from "../lib/colors";
import { BLOCK_NAMES } from "../constants";
import { useRef, useState } from "react";
import { PaletteEntry } from "../hooks/usePalette";

interface Props {
  paletteObj,
  clearTexture,
  handleTextureFile,
  setTextureTargetId: (newId) => void,
  textureTargetId,
  textureVersion,
  texturesRef,
}

export default function PaletteSidebar({
  paletteObj,
  clearTexture,
  handleTextureFile,
  setTextureTargetId,
  textureTargetId,
  textureVersion,
  texturesRef,
}:Props) {
  const {
    addCustomBlock,
    customIdInput,
    palette,
    renamePaletteEntry,
    selectedBlock,
    setCustomIdInput,
    setSelectedBlock,
  } = paletteObj;
  const [blockSearchQuery, setBlockSearchQuery] = useState("");
  const textureFileInputRef = useRef<HTMLInputElement>(null);

  const t = STRINGS.en;
  return (
    <div
      style={{
        width: 210,
        border: "1px solid #1e222b",
        padding: 12,
        overflowY: "auto",
        backgroundColor: "#0e1117",
      }}
    >
      <div style={{ fontSize: 12, color: "#8a91a3", marginBottom: 8 }}>
        {t.palette}
      </div>
      <div style={{ fontSize: 10, color: "#5c6272", marginBottom: 8 }}>
        {t.textureHint}
      </div>
      <input
        type="text"
        value={blockSearchQuery}
        onChange={(e) => setBlockSearchQuery(e.target.value)}
        placeholder={t.blockSearchPlaceholder}
        style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
      />
      {palette
        .filter((p:PaletteEntry) => {
          if (!blockSearchQuery) return true;
          const q = blockSearchQuery.toLowerCase();
          return String(p.id).includes(q) || p.label.toLowerCase().includes(q);
        })
        .map((p:PaletteEntry) => {
        const hasTexture = texturesRef.current.has(p.id);
        void textureVersion;
        return (
          <div
            key={p.id}
            onClick={() => setSelectedBlock(p.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 6px",
              borderRadius: 6,
              marginBottom: 3,
              cursor: "pointer",
              backgroundColor: selectedBlock === p.id ? "#22314d" : "transparent",
              border:
                selectedBlock === p.id
                  ? "1px solid #6ea8fe"
                  : "1px solid transparent",
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setTextureTargetId(p.id);
                textureFileInputRef.current?.click();
              }}
              title={t.textureHint}
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                backgroundColor: hasTexture ? "#000" : colorForId(p.id),
                backgroundImage: hasTexture
                  ? `url(${texturesRef.current.get(p.id)})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                imageRendering: "pixelated",
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 11, color: "#8a91a3", width: 20 }}>
              {p.id}
            </span>
            {BLOCK_NAMES[p.id] ? (
              <span
                style={{
                  flex: 1,
                  color: "#e6e8ee",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                title={t.blockNameLockedHint}
              >
                {p.label}
              </span>
            ) : (
              <input
                value={p.label}
                onChange={(e) => renamePaletteEntry(p.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#e6e8ee",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            )}
            {hasTexture && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearTexture(p.id);
                }}
                title={t.clearTexture}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#8a91a3",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {palette.filter((p) => {
        if (!blockSearchQuery) return true;
        const q = blockSearchQuery.toLowerCase();
        return String(p.id).includes(q) || p.label.toLowerCase().includes(q);
      }).length === 0 && (
        <div style={{ fontSize: 12, color: "#5c6272", padding: 4 }}>
          {t.noBlockMatches}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={textureFileInputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && textureTargetId != null) {
            handleTextureFile(textureTargetId, file);
          }
          e.target.value = "";
        }}
      />

      <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
        <input
          type="number"
          min={1}
          max={255}
          placeholder={t.idPlaceholder}
          value={customIdInput}
          onChange={(e) => setCustomIdInput(e.target.value)}
          style={{ ...inputStyle, width: "100%" }}
        />
        <button onClick={addCustomBlock} style={actionBtn}>
          +
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 8,
          borderRadius: 6,
          backgroundColor: "#161a22",
          fontSize: 11,
          color: "#8a91a3",
          lineHeight: 1.5,
        }}
      >
        {t.selectedBlock} <b style={{ color: "#e6e8ee" }}>{selectedBlock}</b>
        <div
          style={{
            width: "100%",
            height: 20,
            marginTop: 4,
            borderRadius: 4,
            backgroundColor: texturesRef.current.has(selectedBlock)
              ? "#000"
              : colorForId(selectedBlock),
            backgroundImage: texturesRef.current.has(selectedBlock)
              ? `url(${texturesRef.current.get(selectedBlock)})`
              : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}
