import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";

export default function SavesPanel({
  deleteNamedSlot,
  loadNamedSlot,
  saveNamedSlot,
  saveSlots,
}) {
  const [newSlotName, setNewSlotName] = useState("Slot 1");
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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={newSlotName}
          onChange={(e) => setNewSlotName(e.target.value)}
          placeholder={t.slotNamePlaceholder}
          style={{ ...inputStyle, width: 160 }}
        />
        <button style={actionBtn} onClick={() => saveNamedSlot(newSlotName)}>
          {t.saveSlotBtn}
        </button>
      </div>

      {saveSlots.length === 0 && (
        <div style={{ fontSize: 12, color: "#5c6272" }}>{t.noSlots}</div>
      )}

      {saveSlots.map((name) => (
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
          <button style={actionBtn} onClick={() => loadNamedSlot(name)}>
            {t.slotLoad}
          </button>
          <button style={actionBtn} onClick={() => deleteNamedSlot(name)}>
            {t.slotDelete}
          </button>
        </div>
      ))}
    </div>
  );
}
