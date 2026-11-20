/**
 * Types describing top-level structure of a SkySaga map
 */

import { BIOMES } from "../constants";
import { Hotbar, PaletteEntry } from "../hooks/usePalette";
import { EntityData } from "./entities";
import { VoxelCell } from "./VoxelStore";

type DeepReadonly<T> =
  T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

interface MapData {
  gridX: number,
  gridY: number,
  gridZ: number,
  biomeName: string,
  gameMode: number
}

const DEFAULT_MAP_DATA:Readonly<MapData> = {
  gridX: 6,
  gridY: 4,
  gridZ: 6,
  biomeName: "Forest",
  gameMode: 1,
}

interface LevelData {
  mapSizeChunks: { x:number, y:number, z:number },
  biomeName: string,
  gameMode: number,
  voxels: VoxelCell[],
  entities: EntityData[],
  paletteLabels?: PaletteEntry[],
  hotbar?: Hotbar,
  cameraMode?: "orbit" | "fly",
}

//explicitly exclude optionals from default to avoid making them readonly
const DEFAULT_LEVEL_DATA:DeepReadonly< Pick<LevelData, "mapSizeChunks" | "biomeName" | "gameMode" | "voxels" | "entities"> > = {
  mapSizeChunks: {
    x: DEFAULT_MAP_DATA.gridX,
    y: DEFAULT_MAP_DATA.gridY,
    z: DEFAULT_MAP_DATA.gridZ,
  },
  biomeName: DEFAULT_MAP_DATA.biomeName,
  gameMode: DEFAULT_MAP_DATA.gameMode,
  voxels: [],
  entities: [],
}

function getDefaultLevelData():LevelData {
  return {
    ...DEFAULT_LEVEL_DATA,
    mapSizeChunks: { ...DEFAULT_LEVEL_DATA.mapSizeChunks },
    voxels: [],
    entities: [],
  }
}

export {
  MapData,
  DEFAULT_MAP_DATA,
  LevelData,
  getDefaultLevelData,
}