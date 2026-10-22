import { colorForId } from "../lib/colors";
import type { Hotbar as HotbarSlots } from "../hooks/usePalette";
import { useEffect, useRef, useState } from "react";

interface PaletteHotbarProps {
  slots: HotbarSlots;               // 10 entries: block id or null
  selectedBlock: number;
  hint: string;
  disabled: boolean;                // true -> pointerEvents: "none" (fly mode, pointer locked)
  onSelect: (index: number) => void;
  onAssign: (index: number, blockId: number) => void;
}

export default function PaletteHotbar({slots, selectedBlock, hint, disabled, onSelect, onAssign}:PaletteHotbarProps) {
  
/* TODO
  function cycleHotbar(direction:1|-1) {
    const st = hotbarRef;
    let idx = hotbarIndexRef.current;
    for (let i = 0; i < 10; i++) {
      idx = (idx + direction + 10) % 10;
      if (st.current[idx])
        break;
    }
    setHotbarIndex(idx);
    if (st.current[idx]) {
      setSelectedBlock(st.current[idx]!);
    }
  }
    */


  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 4,
        background: "rgba(10,12,17,0.85)",
        border: "1px solid #2a2f3a",
        borderRadius: 8,
        padding: 5,
        pointerEvents: disabled ? "none" : "auto",
      }}
      title={hint}
    >
      {slots.map((blockId, index) => (
        <div
          key={index}
          onClick={() => onSelect(index)}
          onContextMenu={(e) => {
            e.preventDefault();
            onAssign(index, selectedBlock);
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 5,
            background: blockId ? colorForId(blockId) : "#1a1d24",
            border:
              blockId === selectedBlock ? "2px solid #6ea8fe" : "1px solid #2a2f3a",
            cursor: "pointer",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              bottom: 1,
              right: 3,
              fontSize: 9,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {index === 9 ? 0 : index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
