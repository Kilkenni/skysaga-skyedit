interface ToolDef {
  id: string;
  codes: string[];                 // KeyboardEvent.code; no code = no hotkey
  views: ("2d" | "3d")[];        // where the tool exists
}

const TOOLS: ToolDef[] = [
  { id: "pencil",     codes: ["KeyN"], views: ["2d", "3d"] },
  { id: "eraser",     codes: ["KeyE"], views: ["2d", "3d"] },
  { id: "eyedropper", codes: ["KeyI"], views: ["2d"] },
  { id: "bucket",     codes: ["KeyG"], views: ["2d"] },
  { id: "rect-fill",  codes: ["KeyR"], views: ["2d"] },
  { id: "rect-hollow",codes: ["KeyH"], views: ["2d"] },
  { id: "rect-erase", codes: ["KeyX"], views: ["2d"] },
  { id: "copy",       codes: ["KeyC"], views: ["2d"] },
  { id: "road",       codes: ["KeyO"], views: ["2d"] },
];

const TOOL_BY_ID = new Map(TOOLS.map((t) => [t.id, t]));
const TOOL_BY_CODE = new Map(
  TOOLS.flatMap((t) => t.codes.map((c) => [c, t] as const))
);
const hotkeyLabel = (codes: string[]) => codes.map((c) => c.replace(/^Key/, "")).join(" / ");

export {
  ToolDef,
  TOOLS,
  TOOL_BY_ID,
  TOOL_BY_CODE,
  hotkeyLabel
}