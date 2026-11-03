// tests/generateTerrain.test.ts
import { describe, it, expect } from "vitest";
import { AIR } from "../src/constants";
import { generateTerrain } from "../src/lib/mapGenerator";
import { normalizeRngParameters, type RngParams } from "../src/lib/mapParamNormalizer";
import { DEFAULT_RNG_PARAMS } from "../src/components/TerrainEditor"; 
import { type Structure } from "../src/lib/structures";


const DIMS = { width: 64, depth: 64, totalHeight: 48 };

function run(seed: number, overrides: Partial<RngParams> = {}, structures: Structure[] = []) {
  const params = { ...DEFAULT_RNG_PARAMS, ...overrides };
  const norm = normalizeRngParameters(params, DIMS.width, DIMS.depth, DIMS.totalHeight);
  return generateTerrain(DIMS, seed, norm, structures);
}

const EVERYTHING: Partial<RngParams> = {
  randIsland: true, randArchipelago: true, randHills: true, randMountains: true,
  randPlateaus: true, randValleys: true, randRivers: true, randLakes: true,
  randWaterfalls: true, randCaves: true, randCaveGlow: true, randTrees: true,
  randForests: true, randBushes: true, randOres: true, randErosion: true,
  randSmoothShore: true, randAltitudeBlocks: true,
};

const TEST_STRUCTURE = {
  id: "test", 
  enabled: true, 
  count: 3, 
  minSpacing: 2, 
  rotate: true, 
  requireFlat: false,
  sizeX: 3, sizeY: 2, sizeZ: 3,
  voxels: [
    { x: 0, y: 0, z: 0, block: 1, meta: 0 },
    { x: 2, y: 1, z: 2, block: 0, meta: 0 }, // block 0 (dirt) on purpose
  ],
} as unknown as Structure;

function hashCells(grid: ReturnType<typeof run>["grid"]) {
  let h = 2166136261;
  for (const c of grid.cells()) {
    for (const n of [c.x, c.y, c.z, c.block, c.meta]) h = Math.imul(h ^ n, 16777619);
  }
  return h >>> 0;
}

describe("generateTerrain", () => {
  it("is deterministic for the same seed", () => {
    const a = run(12345, EVERYTHING, [TEST_STRUCTURE]);
    const b = run(12345, EVERYTHING, [TEST_STRUCTURE]);
    expect(Array.from(a.grid.cells())).toEqual(Array.from(b.grid.cells()));
    expect(a.heightMap).toEqual(b.heightMap);
    expect(a.isWaterMap).toEqual(b.isWaterMap);
  });

  it("depends on the seed", () => {
    expect(hashCells(run(1).grid)).not.toBe(hashCells(run(2).grid));
  });

  it.each([1, 2, 3, 42, 99999])("does not throw with every feature on (seed %s)", (seed) => {
    expect(() => run(seed, EVERYTHING, [TEST_STRUCTURE])).not.toThrow();
  });

  it.each([
    ["default", {}],
    ["everything", EVERYTHING],
    ["floating island", { ...EVERYTHING, randIslandMode: "floating" }],
  ] as const)("keeps its invariants (%s)", (_name, overrides) => {
    const { grid, heightMap, isWaterMap } = run(7, overrides as Partial<RngParams>);
    expect(heightMap).toHaveLength(DIMS.width * DIMS.depth);
    expect(isWaterMap).toHaveLength(DIMS.width * DIMS.depth);
    expect(Array.from(grid.cells()).length).toBeGreaterThan(0);

    for (let x = 0; x < DIMS.width; x++) {
      for (let z = 0; z < DIMS.depth; z++) {
        const idx = x * DIMS.depth + z;
        const h = heightMap[idx];
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(DIMS.totalHeight);
        expect(isWaterMap[idx] === 0 || isWaterMap[idx] === 1).toBe(true);
        // the top voxel of every column with ground is never skipped
        if (h > 0) expect(grid.getBlock(x, h - 1, z)).not.toBe(AIR);
      }
    }
  });

  it("matches the golden hash (frozen current behaviour)", () => {
    // First run writes the value into this snapshot. Review it, then commit it.
    expect(hashCells(run(2024, EVERYTHING, [TEST_STRUCTURE]).grid)).toMatchInlineSnapshot(`1073302016`);
  });
});
