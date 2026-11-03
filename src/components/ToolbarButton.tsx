import { hotkeyLabel, TOOL_BY_ID } from "../lib/tools";
import { Tool } from "./ToolbarRow";



interface Props {
  tool: Tool,
  setTool: (id: string) => void,
  currentTool: string,
}

export default function ToolButton ({tool, setTool, currentTool}:Props){
  const {id, label, title} = tool;
  const codes = TOOL_BY_ID.get(id)?.codes;
  
  return (<button
    onClick={() => setTool(id)}
    title={codes?.length ? `${title} [${hotkeyLabel(codes)}]` : title}
    style={{
      padding: "6px 10px",
      borderRadius: 6,
      border: currentTool === id ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
      background: currentTool === id ? "#22314d" : "#1a1d24",
      color: "#e6e8ee",
      fontSize: 13,
      cursor: "pointer",
    }}
  >
    {label}
  </button>);
};
