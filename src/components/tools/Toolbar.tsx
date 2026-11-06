import { STRINGS } from "../../i18n/strings";
import { inputStyle, actionBtn } from "../../styles/inline";
import { colorForId } from "../../lib/colors";
import { clamp, clampBlockId } from "../../lib/numbers";
import { RoadParams } from "../TerrainEditor";
import ToolButton from "../ToolbarButton";

export interface Tool {
  id:string,
  label:string,
  title:string,
}

interface Props {
  setTool: (id: string) => void;
  currentTool: string,
  cameraMode: string,
  clearLayer: () => void,
  computeMapStats: () => void,
  copyLayer: (direction: number) => void,
  copyYFrom: number,
  copyYTo: number,
  fillLayer: () => void,
  mirrorX: boolean,
  mirrorZ: boolean,
  moveSpeed: number,
  shiftMap: (dx: number, dy: number, dz: number) => void,
  
  resetCameraView: () => void,
  roadParams: RoadParams,
  updateRoadParams: <K extends keyof RoadParams>(paramName: K, value: RoadParams[K]) => void,

  setMirrorX,
  setMirrorZ,
  setMoveSpeed,
  setShowBulkTexturePanel,
  setShowEntitiesPanel,
  setShowPresets,
  setShowRandomPanel,
  setShowSaves,
  setShowStructuresPanel,
  showBulkTexturePanel: boolean,
  showEntitiesPanel: boolean,
  showPresets: boolean,
  showRandomPanel: boolean,
  showSaves: boolean,
  showStructuresPanel: boolean,
  totalHeight: number,
  viewMode: string,
}

export default function ToolbarRow({
  setTool,
  currentTool,
  cameraMode,
  clearLayer,
  computeMapStats,
  copyLayer,
  fillLayer,
  mirrorX,
  mirrorZ,
  moveSpeed,
  shiftMap,
  resetCameraView,
  roadParams,
  updateRoadParams,

  setMirrorX,
  setMirrorZ,
  setMoveSpeed,
  setShowBulkTexturePanel,
  setShowEntitiesPanel,
  setShowPresets,
  setShowRandomPanel,
  setShowSaves,
  setShowStructuresPanel,
  showBulkTexturePanel,
  showEntitiesPanel,
  showPresets,
  showRandomPanel,
  showSaves,
  showStructuresPanel,
  viewMode,
}:Props) {
  const t = STRINGS.en;

  const toolsUni:Tool[] = [
    {id: "pencil", label: t.pencil, title: t.pencilTitle},
    {id: "eraser", label: t.eraser, title: t.eraserTitle},
    {id: "paint", label: t.paint, title: t.paintTitle}
  ];

  const tools2D:Tool[] = [
    {id: "rect-fill", label: t.rectFill, title: t.rectFillTitle},
    {id: "rect-hollow", label: t.rectHollow, title: t.rectHollowTitle},
    {id: "rect-erase", label: t.rectErase, title: t.rectEraseTitle},
    {id: "eyedropper", label: t.eyedropper, title: t.eyedropperTitle},
    {id: "bucket", label: t.bucket, title: t.bucketTitle},
    {id: "copy", label: t.copyArea, title: t.copyAreaTitle},
    {id: "road", label: t.roadTool, title: t.roadToolTitle},
  ];

  const clipboardTool:Tool = {
    id: "paste",
    label: t.pasteArea, 
    title: t.pasteAreaTitle
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid #1e222b",
        flexWrap: "wrap",
      }}
    >
      {(viewMode === "2d" || (viewMode === "3d" && cameraMode === "orbit")) && (
        toolsUni.map((tool) => (
          <ToolButton tool={tool} setTool={setTool} currentTool={currentTool} key={tool.id}/>
        ))
      )}
      {viewMode === "2d" && (
        <>
          {tools2D.map((tool) => (
            <ToolButton tool={tool} setTool={setTool} currentTool={currentTool} key={tool.id}/>
          ))}

          {currentTool === "road" && (
            <>
              <label
                style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.roadWidth}
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={roadParams.roadWidth}
                  onChange={(e) => updateRoadParams("roadWidth", clamp(e.target.value, 1, 9))}
                  style={{ ...inputStyle, width: 40 }}
                />
              </label>
              <label
                style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.roadBlock}
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={roadParams.roadBlock}
                  onChange={(e) => updateRoadParams("roadBlock", clampBlockId(e.target.value))}
                  style={{ ...inputStyle, width: 46 }}
                />
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: colorForId(clampBlockId(roadParams.roadBlock)),
                  }}
                />
              </label>
            </>
          )}
        </>
      )}

      <div style={{ width: 1, height: 20, background: "#2a2f3a", margin: "0 4px" }} />

      {viewMode === "2d" && (
        <>
          <button onClick={fillLayer} style={actionBtn}>
            {t.fillLayer}
          </button>
          <button onClick={clearLayer} style={actionBtn}>
            {t.clearLayer}
          </button>
          <button onClick={() => copyLayer(1)} style={actionBtn}>
            {t.copyLayerUp}
          </button>
          <button onClick={() => copyLayer(-1)} style={actionBtn}>
            {t.copyLayerDown}
          </button>
        </>
      )}
      {viewMode === "3d" && (
        <button onClick={resetCameraView} style={actionBtn}>
          {cameraMode === "orbit" ? t.resetCameraOrbit : t.resetCameraFly}
        </button>
      )}

      <div style={{ width: 1, height: 20, background: "#2a2f3a", margin: "0 4px" }} />

      <button
        onClick={() => setShowRandomPanel(!showRandomPanel)}
        style={{
          ...actionBtn,
          border: showRandomPanel ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
          background: showRandomPanel ? "#22314d" : "#1a1d24",
        }}
      >
        {t.randomizer}
      </button>
      <button
        onClick={() => setShowStructuresPanel(!showStructuresPanel)}
        style={{
          ...actionBtn,
          border: showStructuresPanel ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
          background: showStructuresPanel ? "#22314d" : "#1a1d24",
        }}
      >
        {t.structuresBtn}
      </button>
      <button
        onClick={() => setShowEntitiesPanel(!showEntitiesPanel)}
        style={{
          ...actionBtn,
          border: showEntitiesPanel ? "1px solid #ff5fa2" : "1px solid #2a2f3a",
          background: showEntitiesPanel ? "#3a1b2c" : "#1a1d24",
        }}
      >
        {t.entitiesBtn}
      </button>
      <button
        onClick={() => setShowBulkTexturePanel(!showBulkTexturePanel)}
        style={{
          ...actionBtn,
          border: showBulkTexturePanel ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
          background: showBulkTexturePanel ? "#22314d" : "#1a1d24",
        }}
      >
        {t.bulkImportBtn}
      </button>
      <button
        onClick={() => setShowSaves(!showSaves)}
        style={{
          ...actionBtn,
          border: showSaves ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
          background: showSaves ? "#22314d" : "#1a1d24",
        }}
      >
        {t.savesBtn}
      </button>
      <button onClick={computeMapStats} style={actionBtn}>
        {t.statsBtn}
      </button>
      <button
        onClick={() => setShowPresets(!showPresets)}
        style={{
          ...actionBtn,
          border: showPresets ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
          background: showPresets ? "#22314d" : "#1a1d24",
        }}
      >
        {t.presetsBtn}
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ width: 1, height: 20, background: "#2a2f3a", margin: "0 4px" }} />
      <span style={{ fontSize: 11, color: "#8a91a3" }}>{t.shiftMap}</span>
      {([["X-", -1, 0, 0], ["X+", 1, 0, 0], ["Z-", 0, 0, -1], ["Z+", 0, 0, 1], ["Y-", 0, -1, 0], ["Y+", 0, 1, 0]] as const).map(
        ([label, dx, dy, dz]) => (
          <button
            key={label}
            style={actionBtn}
            title={t.shiftMapTitle}
            onClick={(e) => {
              const n = e.shiftKey ? 10 : 1;
              shiftMap(dx * n, dy * n, dz * n);
            }}
          >
            {label}
          </button>
        )
      )}

      {viewMode === "2d" && (
        <>
          <button
            onClick={() => setMirrorX(!mirrorX)}
            style={{
              ...actionBtn,
              border: mirrorX ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
              background: mirrorX ? "#22314d" : "#1a1d24",
            }}
            title={t.mirrorXTitle}
          >
            ⇋ X
          </button>
          <button
            onClick={() => setMirrorZ(!mirrorZ)}
            style={{
              ...actionBtn,
              border: mirrorZ ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
              background: mirrorZ ? "#22314d" : "#1a1d24",
            }}
            title={t.mirrorZTitle}
          >
            ⇋ Z
          </button>
        </>
      )}
      {viewMode === "3d" && cameraMode === "fly" && (
        <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
          {t.speed}
          <input
            type="range"
            min={4}
            max={60}
            step={1}
            value={moveSpeed}
            onChange={(e) => setMoveSpeed(Number(e.target.value))}
          />
        </label>
      )}
      {viewMode === "3d" && (
        <span style={{ fontSize: 11, color: "#8a91a3" }}>
          {cameraMode === "orbit" ? t.hintOrbit : t.hintFly}
        </span>
      )}
    </div>
  );
}
