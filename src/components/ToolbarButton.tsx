export default function ToolbarButton ({id, label, title}){
  return (<button
    onClick={() => setTool(id)}
    title={title}
    style={{
      padding: "6px 10px",
      borderRadius: 6,
      border: tool === id ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
      background: tool === id ? "#22314d" : "#1a1d24",
      color: "#e6e8ee",
      fontSize: 13,
      cursor: "pointer",
    }}
  >
    {label}
  </button>);
};