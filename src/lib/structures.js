import { colorForId } from "./colors";

export function rotateStructure90(voxels, sizeX, sizeZ) {
  const rotated = voxels.map((v) => ({
    x: v.z,
    y: v.y,
    z: sizeX - 1 - v.x,
    block: v.block,
    meta: v.meta || 0,
  }));
  return { voxels: rotated, sizeX: sizeZ, sizeZ: sizeX };
}

export function getRotatedStructure(entry, rotationSteps) {
  let cur = { voxels: entry.voxels, sizeX: entry.sizeX, sizeZ: entry.sizeZ };
  const steps = ((rotationSteps % 4) + 4) % 4;
  for (let i = 0; i < steps; i++) {
    cur = rotateStructure90(cur.voxels, cur.sizeX, cur.sizeZ);
  }
  return { voxels: cur.voxels, sizeX: cur.sizeX, sizeY: entry.sizeY, sizeZ: cur.sizeZ };
}

export function generateStructureThumbnail(entry) {
  const cell = 4;
  const w = Math.max(1, Math.min(entry.sizeX, 48)) * cell;
  const d = Math.max(1, Math.min(entry.sizeZ, 48)) * cell;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = d;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#12151b";
  ctx.fillRect(0, 0, w, d);
  const topAt = new Map();
  for (const v of entry.voxels) {
    if (v.x < 0 || v.x >= entry.sizeX || v.z < 0 || v.z >= entry.sizeZ) continue;
    const key = v.x + "," + v.z;
    const prev = topAt.get(key);
    if (!prev || v.y > prev.y) topAt.set(key, v);
  }
  for (const [key, v] of topAt) {
    const parts = key.split(",");
    const x = Number(parts[0]);
    const z = Number(parts[1]);
    if (x >= entry.sizeX || z >= entry.sizeZ) continue;
    ctx.fillStyle = colorForId(v.block);
    ctx.fillRect(x * cell, z * cell, cell, cell);
  }
  return canvas.toDataURL();
}
