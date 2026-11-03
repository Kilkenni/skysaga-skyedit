import { useEffect, useRef, useState } from "react";
import { AIR, BLOCK_NAMES, DEFAULT_PALETTE } from "../constants";
import { clampBlockId } from "../lib/numbers";

interface PaletteEntry { 
  id: number; 
  label: string 
}

/**
 * @returns true if not null and not AIR (255)
 */
function isBlockId(id: number|null):boolean {
  if(id === null)
    return false;
  if(id === AIR)
    return false;
  return true;
}

type Hotbar = (number | null)[];   // 10 slots

interface PaletteProps {
  onChange: ()=>void,
}

function usePalette({onChange}:PaletteProps) {
  const [selectedBlock, setSelectedBlock] = useState(1);
  const selectedBlockRef = useRef(selectedBlock);
  const [hotbar, setHotbar] = useState<Hotbar>(() => {
    const slots = new Array(10).fill(null);
    const ids = DEFAULT_PALETTE.filter((id) => isBlockId(id));
    for (let i = 0; i < 10 && i < ids.length; i++)
      slots[i] = ids[i];
    return slots;
  });
  const hotbarRef = useRef(hotbar);
  
  const [palette, setPalette] = useState<PaletteEntry[]>(
    DEFAULT_PALETTE.map((id) => ({ id, label: BLOCK_NAMES[id] || "Block " + id }))
  );
  const paletteRef = useRef(palette);
  const [customIdInput, setCustomIdInput] = useState("");

  useEffect(() => {
    hotbarRef.current = hotbar;
  }, [hotbar]);
  
  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);
  useEffect(() => {
      selectedBlockRef.current = selectedBlock;
    }, [selectedBlock]);

  // ---- hotbar ----
  function selectHotbarSlot(i: number) {
    const id = hotbarRef.current[i];
    if (id !== null && id !== AIR)
      setSelectedBlock(id);
  }

  function assignHotbarSlot(i: number, blockId: number) {
    setHotbar((prev) => {
      const next = [...prev];
      next[i] = blockId;
      return next;
    });
    onChange();
  }

  function addCustomBlock() {
    const id = clampBlockId(customIdInput);
    if (!isBlockId(id))
      return;
    if (!paletteRef.current.find((p) => p.id === id)) {
      setPalette(prev => [...prev, { id, label: BLOCK_NAMES[id] || "Block " + id }]);
    }
    setSelectedBlock(id);
    setCustomIdInput("");
  }

  function renamePaletteEntry(id: number, label: string) {
    if (BLOCK_NAMES[id])
      return; // real block names are locked, not user-editable
    setPalette(prev => prev.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  return {
    selectedBlock,
    setSelectedBlock,
    selectedBlockRef,
    hotbar,
    setHotbar,
    hotbarRef,
    palette,
    setPalette,
    paletteRef,
    customIdInput,
    setCustomIdInput,

    selectHotbarSlot,
    assignHotbarSlot,
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
  isBlockId,
}
