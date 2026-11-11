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
  copyLayer: (direction: number) => void,
  copyYFrom: number,
  copyYTo: number,
  fillLayer: () => void,
  mirrorX: boolean,
  mirrorZ: boolean,
  shiftMap: (dx: number, dy: number, dz: number) => void,
  
  roadParams: RoadParams,
  updateRoadParams: <K extends keyof RoadParams>(paramName: K, value: RoadParams[K]) => void,

  setMirrorX,
  setMirrorZ,
  totalHeight: number,
  viewMode: string,
  style: React.CSSProperties|undefined,
}

export default function ToolbarRow({
  setTool,
  currentTool,
  cameraMode,
  clearLayer,
  copyLayer,
  fillLayer,
  mirrorX,
  mirrorZ,
  shiftMap,
  roadParams,
  updateRoadParams,

  setMirrorX,
  setMirrorZ,
  viewMode,
  style,
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
    <div style={style}>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        height: "40%",
      }}>
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
          </>
        )}
      </div>

      {/* <div style={{ width: 1, height: 20, background: "#2a2f3a", margin: "0 4px" }} /> */}
      <div style={{
        flex: 1,
        gap: 8,
      }}>
        {viewMode === "2d" && (
          <>
            <span style={{
              display: "block",
              fontSize: 11, 
              color: "#8a91a3",
            }}>
              Tool parameters:
            </span>
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
      </div>
      {viewMode === "2d" && ( 
        <>
          <div>
            <button onClick={fillLayer} style={actionBtn}>
              {t.fillLayer}
            </button>
            <button onClick={clearLayer} style={actionBtn}>
              {t.clearLayer}
            </button>
          </div>
          <div>
            <button onClick={() => copyLayer(1)} style={actionBtn}>
              {t.copyLayerUp}
            </button>
            <button onClick={() => copyLayer(-1)} style={actionBtn}>
              {t.copyLayerDown}
            </button>
          </div>
        </>
      )}

      <div>
        <span style={{
          display: "block",
          fontSize: 11, 
          color: "#8a91a3" 
          }}>{t.shiftMap}</span>
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

      </div>
      

      {/* Mirroring */}
      {viewMode === "2d" && (
        <div>
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
        </div>
      )}
    </div>
  );
}
