import blocks from "./data/blocks.json" with {type: "json"};
import entities from "./data/entities.json" with {type: "json"};
import serviceEntities from "./data/serviceEntities.json" with {type: "json"};
import deviceCells from "./data/deviceCells.json" with {type: "json"};
import mapSizes from "./data/mapSizes.json" with {type: "json"};

import entDevices from "./data/entity-device.json" with {type: "json"};
import entNpcs from "./data/entity-npc.json" with {type: "json"};
import entObjects from "./data/entity-object.json" with {type: "json"};
import entCreatures from "./data/entity-creature.json" with {type: "json"};


export const CHUNK = 32;
export const CELL_BASE = 14;
// Real biomes confirmed via GeoData.json > Biomes (36731) - exhaustive, all
// 5 that exist. "NPCfriend" is the social-hub biome (not available for home
// islands per its own GeoData entry, but included since it's still a real,
// selectable biome for other purposes).
export const REAL_BIOMES = ["Desert", "Forest", "Jungle", "Mountain", "NPCfriend"];

export const MAX_CHUNKS = { x: 32, y: 7, z: 32 };

export const MAP_SIZES = mapSizes;

export function mapSizeKey(x: number, y: number, z: number) {
  return x + "x" + y + "x" + z;
}

export type EntityCategory = "creature" | "npc" | "device" | "object" | "service";

export interface EntityRegEntry {
  name: string,
  category: EntityCategory,
  icon: string,
}

export const ENTITY_REGISTRY = {
  DEVICE: entDevices as EntityRegEntry[],
  NPC: entNpcs as EntityRegEntry[],
  OBJECT: entObjects as EntityRegEntry[],
  CREATURE: entCreatures as EntityRegEntry[],
}

export interface EntityCatalogue {
  footprints: Readonly<Record<string, readonly (readonly [number, number, number])[]>>;
  categories: ReadonlyMap<string, string>;
  singleton: ReadonlySet<string>;
  service: ReadonlySet<string>;
}

export const ENTITIES = entities as {name: string, category: EntityCategory}[];
export const ENTITY_CATEGORY = new Map(ENTITIES.map((e) => [e.name, e.category]));

export const ENTITY_CATALOGUE: EntityCatalogue = {
  footprints: deviceCells as unknown as EntityCatalogue["footprints"], // trusted because we have deviceCells.test.ts for that - run it when data changes!
  categories: new Map(ENTITIES.map((e) => [e.name, e.category])),
  singleton: new Set(["Airship"]),
  service: new Set(serviceEntities),
}
export const ENTITY_CATEGORIES = [ "device", "object", "creature", "npc"] as const;
export const ENTITY_COLORS:Record<EntityCategory, number> = { creature: 0xff5f5f, npc: 0xffd166, device: 0x5fa8ff, object: 0xb0b6c3 , service: 0xff9ff9};

export const BLOCK_NAMES = blocks;
export const AIR = 255;
export const DEFAULT_PALETTE = Object.keys(BLOCK_NAMES)
  .map(Number)
  .sort((a, b) => a - b);
export const STORAGE_KEY = "terrain-editor-state";
export const TEXTURES_STORAGE_KEY = "terrain-editor-textures";
export const STRUCTURES_STORAGE_KEY = "terrain-editor-structures";
