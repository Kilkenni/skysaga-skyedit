import { MapDimensions } from "../components/TerrainEditor";
import { isNum } from "./numbers";
import { mulberry32 } from "./noise";

interface EntityData {
  name: string,
  x: number,
  y: number,
  z: number,
  yaw?: number,    // in degrees, 0 faces +Z, 180 faces -Z. Prefer multiples of 90. The occupied blocks turn with it.
  items?: string[] // container contents
}

interface EntityDataId extends EntityData {
  id: number,
}

function getEntityYaw(entity: EntityData):number {
  if(isNum(entity.yaw))
    return entity.yaw!;
  else 
    return 0;
}

function parseEntities(rawEntities: unknown):EntityData[] {
  const entities:EntityData[] = [];
  if (Array.isArray(rawEntities)) {
    for (const entity of rawEntities) {
      if(entity === null)
        continue; // skip entirely borked entries
      const {name, x, y, z, yaw, items} = entity;
      if(typeof name === "string" && isNum(x) && isNum(y) && isNum(z)) { // broken entities are silently skipped for now
        const parsed: EntityData = {name, x, y, z};
        if(isNum(yaw))
          parsed.yaw = yaw;
        if(Array.isArray(items) && items.length > 0)
          parsed.items = items.map(String);
        entities.push(parsed);
      }
    }
  }
  return entities;
}

function exportEntity(entity: EntityDataId):EntityData {
  const {name, x, y, z, yaw, items} = entity;
  const ent: EntityData = {name, x, y, z};
  if(isNum(yaw))
    ent.yaw = yaw;
  if(items && items.length > 0)
    ent.items = items;
  return ent;
}

type Coord = {
  x: number,
  y: number,
  z: number,
}

function findAirshipSpot(dims: MapDimensions, surfaceAt:(x: number, z: number, fromY: number) => number, seed: number)
:EntityData|null {
  const rand = mulberry32(seed ^ 0xA1B5); // salty!
  const insetX = Math.round(dims.width * 0.3);
  const insetZ = Math.round(dims.depth * 0.3);
  const side = Math.floor(rand() * 4);
  const along = 0.3 + rand() * 0.4;
  const startX = side === 0 ? insetX : side === 1 ? dims.width - 1 - insetX : Math.round(dims.width * along);
  const startZ = side === 2 ? insetZ : side === 3 ? dims.depth - 1 - insetZ : Math.round(dims.depth * along);
  let spot:Coord|null = null;
  for (let r = 0; r <= Math.max(dims.width, dims.depth) && !spot; r++) {
    for (let dx = -r; dx <= r && !spot; dx++) {
      for (let dz = -r; dz <= r && !spot; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) 
          continue;
        const x = startX + dx;
        const z = startZ + dz;
        if (x < 0 || x >= dims.width || z < 0 || z >= dims.depth) 
          continue;
        const y = surfaceAt(x, z, dims.height - 1);
        if (y >= 0 && y + 1 < dims.height)
          spot = { x, y: y + 1, z };
      }
    }
  }
  if (!spot) {
    return null;
  }
  return { name: "Airship", ...spot, items: [] };
}

export {
  EntityData,
  EntityDataId,
  getEntityYaw,
  parseEntities,
  exportEntity,
  findAirshipSpot,
}