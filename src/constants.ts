import { blocks, entities, serviceEntities, deviceCells, mapSizes } from "./data";

export const CHUNK = 32;
export const CELL_BASE = 14;
// Real biomes confirmed via GeoData.json > Biomes (36731) - exhaustive, all
// 5 that exist. "NPCfriend" is the social-hub biome (not available for home
// islands per its own GeoData entry, but included since it's still a real,
// selectable biome for other purposes).
export const REAL_BIOMES = ["Desert", "Forest", "Jungle", "Mountain", "NPCfriend"];

export const MAX_CHUNKS = { x: 32, y: 7, z: 32 };

export const MAP_SIZES = mapSizes;

export function mapSizeKey(x, y, z) {
  return x + "x" + y + "x" + z;
}

export const ENTITIES = entities;
export const ENTITY_CATEGORY = new Map(ENTITIES.map((e) => [e.name, e.category]));
export const SERVICE_ENTITY_NAMES = new Set(serviceEntities);
export const DEVICE_CELLS = deviceCells;
export const ENTITY_CATEGORIES = ["creature", "npc", "device", "object"];
export const ENTITY_COLORS = { creature: 0xff5f5f, npc: 0xffd166, device: 0x5fa8ff, object: 0xb0b6c3 };

export const SINGLETON_ENTITY_NAMES = new Set(["Airship"]);

export const BLOCK_NAMES = blocks;
export const AIR = 255;
export const DEFAULT_PALETTE = Object.keys(BLOCK_NAMES)
  .map(Number)
  .sort((a, b) => a - b);
export const STORAGE_KEY = "terrain-editor-state";
export const TEXTURES_STORAGE_KEY = "terrain-editor-textures";
export const STRUCTURES_STORAGE_KEY = "terrain-editor-structures";
