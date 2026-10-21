import { useEffect, useRef, useState } from "react";
import { BLOCK_NAMES, DEFAULT_PALETTE } from "../constants";
import { clamp } from "../lib/numbers";

interface PaletteEntry { 
  id: number; 
  label: string 
}

type Hotbar = (number | null)[];   // 10 slots

interface paletteProps {
  onChange: ()=>void,
}

function usePalette({onChange}:paletteProps) {
  const [selectedBlock, setSelectedBlock] = useState(1);
  const selectedBlockRef = useRef(selectedBlock);
  const [hotbar, setHotbar] = useState<Hotbar>(() => {
    const slots = new Array(10).fill(null);
    const ids = DEFAULT_PALETTE.filter((id) => id !== 0);
    for (let i = 0; i < 10 && i < ids.length; i++) slots[i] = ids[i];
    return slots;
  });
  const hotbarRef = useRef(hotbar);
  const [hotbarIndex, setHotbarIndex] = useState(0);

  const hotbarIndexRef = useRef(0);
  const [palette, setPalette] = useState(
    DEFAULT_PALETTE.map((id) => ({ id, label: BLOCK_NAMES[id] || "Block " + id }))
  );
  const paletteRef = useRef(palette);
  const [customIdInput, setCustomIdInput] = useState("");

  useEffect(() => {
    hotbarRef.current = hotbar;
  }, [hotbar]);
  useEffect(() => {
    hotbarIndexRef.current = hotbarIndex;
  }, [hotbarIndex]);
  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);
  useEffect(() => {
      selectedBlockRef.current = selectedBlock;
    }, [selectedBlock]);

  // ---- hotbar ----
  function selectHotbarSlot(i: number) {
    setHotbarIndex(i);
    const id = hotbarRef.current[i];
    if (id) setSelectedBlock(id);
  }

  function assignHotbarSlot(i: number, blockId: number) {
    setHotbar((prev) => {
      const next = [...prev];
      next[i] = blockId;
      return next;
    });
    onChange();
  }

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

  function addCustomBlock() {
    const id = clamp(customIdInput, 1, 255);
    if (!id) return;
    if (!paletteRef.current.find((p) => p.id === id)) {
      setPalette(prev => [...prev, { id, label: BLOCK_NAMES[id] || "Block " + id }]);
    }
    setSelectedBlock(id);
    setCustomIdInput("");
  }

  function renamePaletteEntry(id: number, label: string) {
    if (BLOCK_NAMES[id]) return; // real block names are locked, not user-editable
    setPalette(prev => prev.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  return {
    selectedBlock,
    setSelectedBlock,
    selectedBlockRef,
    hotbar,
    setHotbar,
    hotbarIndex,
    setHotbarIndex,
    hotbarRef,
    hotbarIndexRef,
    palette,
    setPalette,
    paletteRef,
    customIdInput,
    setCustomIdInput,

    selectHotbarSlot,
    assignHotbarSlot,
    cycleHotbar,
    addCustomBlock,
    renamePaletteEntry
  };
}

export type {
  PaletteEntry,
  Hotbar,
}

export { 
  usePalette,
}
