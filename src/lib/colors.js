import { BLOCK_NAMES } from "../constants";

// REWRITTEN (2026-08-21): the old table was keyed by Alpha 3-era block IDs
// with names that no longer match Alpha v10 36731's real Voxels table (IDs
// point at completely different blocks now - e.g. old ID 3 was
// "Sandstone_Rock", real 36731 ID 3 is "Rock_Yellow"). Since most of the
// real 36731 block names already end in a literal color word
// (Stone_Blue, Wood_Red, Metal_Yellow, ...), colors are now derived
// directly from the block's NAME instead of a stale ID table - this also
// means any future additions to BLOCK_NAMES get a sensible color for free,
// no manual upkeep needed.
export const COLOR_WORDS = {
  Black: "#1c1c1c",
  Blue: "#3d6fa8",
  Brown: "#6b4a30",
  Cyan: "#3aa0a0",
  Green: "#3f7d3f",
  Grey: "#8a8a85",
  Lime: "#8fbf3f",
  Orange: "#c9772f",
  Pink: "#c97b9a",
  Purple: "#7d5a9e",
  Red: "#a5402f",
  White: "#e6e6de",
  Yellow: "#c9a227",
};

// Material-category tint applied on top of the base color word (stone
// looks flat/matte, metal slightly brighter/cooler, wood warmer/darker,
// glass lighter, jewel-toned sand more saturated).
export const MATERIAL_TINT = {
  Stone: { sat: 0, light: 0 },
  Rock: { sat: -5, light: -8 },
  Wood: { sat: -10, light: -12 },
  Bark: { sat: -15, light: -20 },
  Leaves: { sat: 10, light: 5 },
  Metal: { sat: -20, light: 10 },
  Grass: { sat: 15, light: 5 },
  Sand: { sat: 20, light: 15 },
  Glass_Voxel: { sat: 10, light: 25 },
};

// Blocks whose real 36731 name has no trailing color word - handled
// explicitly (confirmed exhaustive list via GeoData.json > Voxels).
export const SPECIAL_BLOCK_COLORS = {
  BedRock: "#2a2a2a",
  BlockBuilding_Passable: "#707070",
  Cactus: "#3d7a3d",
  Clay: "#b5651d",
  Dirt: "#5c4a2e",
  Dirt_Path: "#a07d4f",
  Entity: "#ff69b4",
  Entity_Blocks_Ambient: "#cc66cc",
  Entity_Blocks_Fluid: "#66a0cc",
  Entity_Can_Stand_On: "#707070",
  Entity_Hazardous: "#e03030",
  Entity_Passable: "#66cccc",
  Entity_Passable_CameraPassable: "#66cc99",
  Exposed_Dirt_Jungle: "#5c4a2e",
  Fabric: "#c9a94f",
  Glowing_Crystal: "#9be0ff",
  Glowing_Mushroom: "#e0a0ff",
  Gravel: "#8a8a85",
  Hexapus: "#c97b9a",
  Honey: "#f0b429",
  Ice: "#a8e0f0",
  Magma: "#e04020",
  Mud: "#4a3a28",
  Snow: "#f5f8ff",
  Soap: "#dde8ea",
  Teleporter_Base: "#9b4fd0",
  Thatch: "#c9a94f",
  Transparent_Bedrock: "#3a3a3a99",
  Tree: "#4a7c3f",
  Water: "#1e7fd0",
};

export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

export function colorForId(id) {
  const name = BLOCK_NAMES[id];
  if (!name) {
    const hue = (id * 47) % 360;
    const sat = 55 + ((id * 13) % 30);
    const light = 38 + ((id * 7) % 20);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
  if (SPECIAL_BLOCK_COLORS[name]) return SPECIAL_BLOCK_COLORS[name];

  const parts = name.split("_");
  const colorWord = parts[parts.length - 1];
  const base = COLOR_WORDS[colorWord];
  if (!base) {
    const hue = (id * 47) % 360;
    const sat = 55 + ((id * 13) % 30);
    const light = 38 + ((id * 7) % 20);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  const materialKey = parts.slice(0, -1).join("_");
  const tint = MATERIAL_TINT[materialKey] || { sat: 0, light: 0 };
  const [h, s, l] = hexToHsl(base);
  const sat = Math.round(Math.min(100, Math.max(0, s + tint.sat)));
  const light = Math.round(Math.min(100, Math.max(0, l + tint.light)));
  return `hsl(${Math.round(h)}, ${sat}%, ${light}%)`;
}
