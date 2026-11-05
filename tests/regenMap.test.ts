// tests/regenerate.test.ts
import { describe, it, expect } from "vitest";
import { AIR } from "../src/constants";
import { VoxelStore } from "../src/lib/VoxelStore";
import { generateTerrain, regenerateDeco, regenerateVeg, regenerateOre } from "../src/lib/mapGenerator";
import { normalizeRngParameters, RngParams } from "../src/lib/mapParamNormalizer";
import { DEFAULT_RNG_PARAMS } from "../src/components/TerrainEditor";
import type { RngSnapshot } from "../src/components/TerrainEditor";

const DIMS = { width: 64, depth: 64, height: 40 };
const IDS = { deco: 201, wood: 202, leaves: 203, bush: 204, ore: 205 };
const STRAY = { x: 0, y: DIMS.height - 1, z: 0 }; // an air cell high above any terrain
const FEATURES_OFF: Partial<RngParams> = {
  randIslandMode: "island", randIslandSize: "large", randTrees: false, randBushes: false, randOres: false, randForests: false,
  randDecoChance: 0, randGroundDepth: 8,
};

const norm = (overrides: Partial<RngParams> = {}) =>
  normalizeRngParameters({ ...DEFAULT_RNG_PARAMS, ...FEATURES_OFF, ...overrides }, DIMS.width, DIMS.depth, DIMS.height);

function setup(genOverrides: Partial<RngParams> = {}) {
  const { grid, heightMap, isWaterMap } = generateTerrain(DIMS, 1234, norm(genOverrides), []);
  const store = new VoxelStore();
  store.transaction((w) => { for (const c of grid.cells()) w.set(c.x, c.y, c.z, c.block, c.meta); });
  return { store, snapshot: { ...DIMS, heightMap, isWaterMap } as RngSnapshot };
}

const dump = (s: VoxelStore) =>
  Array.from(s.cells()).map((c) => `${c.x},${c.y},${c.z}:${c.block}/${c.meta}`).sort();
const cellsOf = (s: VoxelStore, id: number) => Array.from(s.cells()).filter((c) => c.block === id);
const putStray = (s: VoxelStore, id: number) => {
  expect(s.getBlock(STRAY.x, STRAY.y, STRAY.z)).toBe(AIR); // guard: it must start empty
  s.transaction((w) => w.set(STRAY.x, STRAY.y, STRAY.z, id));
};

const CASES = [
  { name: "regenerateDeco", run: regenerateDeco,
    on: { randDecoBlocks: String(IDS.deco), randDecoChance: 30 }, off: { randDecoChance: 0 } },
  { name: "regenerateVeg", run: regenerateVeg,
    on: { randTrees: true, randBushes: true, randTreeDensity: 15, randBushDensity: 15,
          randTreeWoodBlock: IDS.wood, randTreeLeavesBlock: IDS.leaves, randBushBlock: IDS.bush },
    off: {} },
  { name: "regenerateOre", run: regenerateOre,
    on: { randOres: true, randOreBlocks: String(IDS.ore), randOreCount: 200 }, off: { randOreBlocks: "" } },
];

describe.each(CASES)("$name (common behaviour)", ({ run, on, off }) => {
  it("returns false and changes nothing when there is nothing to do", () => {
    const { store, snapshot } = setup();
    const before = dump(store);
    expect(run(DIMS, 777, norm(off), snapshot, store)).toBe(false);
    expect(dump(store)).toEqual(before);
  });

  it("is deterministic for the same seed", () => {
    const a = setup(), b = setup();
    expect(run(DIMS, 777, norm(on), a.snapshot, a.store)).toBe(true);
    run(DIMS, 777, norm(on), b.snapshot, b.store);
    expect(dump(a.store)).toEqual(dump(b.store));
  });

  it("is exactly one undo step", () => {
    const { store, snapshot } = setup();
    const before = dump(store);
    run(DIMS, 777, norm(on), snapshot, store);
    expect(dump(store)).not.toEqual(before); // guard: something did change
    store.undo();
    expect(dump(store)).toEqual(before);
  });
});

describe("regenerateDeco", () => {
  const on = CASES[0].on;
  it("places decorations only on the ground surface of plantable columns", () => {
    const { store, snapshot } = setup();
    regenerateDeco(DIMS, 777, norm(on), snapshot, store);
    const decos = cellsOf(store, IDS.deco);
    expect(decos.length).toBeGreaterThan(0);
    for (const c of decos) {
      const idx = c.x * DIMS.depth + c.z;
      expect(c.y).toBe(snapshot.heightMap[idx]);
      expect(snapshot.isWaterMap[idx]).toBe(0);
      expect(store.getBlock(c.x, c.y - 1, c.z)).not.toBe(AIR);
    }
  });

  it("removes previous decorations", () => {
    const { store, snapshot } = setup();
    putStray(store, IDS.deco);
    regenerateDeco(DIMS, 777, norm(on), snapshot, store);
    expect(store.getBlock(STRAY.x, STRAY.y, STRAY.z)).toBe(AIR);
  });
});

describe("regenerateVeg", () => {
  const trees = { randTrees: true, randTreeDensity: 15, randTreeSpacing: 4,
                  randTreeWoodBlock: IDS.wood, randTreeLeavesBlock: IDS.leaves };
  const bushes = { randBushes: true, randBushDensity: 15, randBushBlock: IDS.bush };

  it("plants trunks on dry ground and respects the spacing", () => {
    const { store, snapshot } = setup();
    regenerateVeg(DIMS, 777, norm(trees), snapshot, store);   // trees only: bushes could overwrite trunks
    const wood = cellsOf(store, IDS.wood);
    expect(wood.length).toBeGreaterThan(0);
    const bases = wood.filter((c) => c.y === snapshot.heightMap[c.x * DIMS.depth + c.z]);
    for (const c of wood) {
      const idx = c.x * DIMS.depth + c.z;
      expect(snapshot.isWaterMap[idx]).toBe(0);
      expect(c.y).toBeGreaterThanOrEqual(snapshot.heightMap[idx]);
    }
    for (let i = 0; i < bases.length; i++)
      for (let j = i + 1; j < bases.length; j++)
        expect((bases[i].x - bases[j].x) ** 2 + (bases[i].z - bases[j].z) ** 2).toBeGreaterThanOrEqual(16);
  });

  it("clears only the kinds that are enabled", () => {
    const a = setup();
    putStray(a.store, IDS.wood);
    regenerateVeg(DIMS, 777, norm(bushes), a.snapshot, a.store);       // bushes only
    expect(a.store.getBlock(STRAY.x, STRAY.y, STRAY.z)).toBe(IDS.wood); // tree block survives

    const b = setup();
    putStray(b.store, IDS.wood);
    regenerateVeg(DIMS, 777, norm(trees), b.snapshot, b.store);        // trees enabled
    expect(b.store.getBlock(STRAY.x, STRAY.y, STRAY.z)).toBe(AIR);     // tree block cleared
  });
});

describe("regenerateOre", () => {
  const on = CASES[2].on;
  it("only replaces voxels that already exist", () => {
    const { store, snapshot } = setup();
    const solid = new Set(Array.from(store.cells()).map((c) => `${c.x},${c.y},${c.z}`));
    regenerateOre(DIMS, 777, norm(on), snapshot, store);
    const ore = cellsOf(store, IDS.ore);
    expect(ore.length).toBeGreaterThan(0);
    for (const c of ore)
      expect(solid.has(`${c.x},${c.y},${c.z}`)).toBe(true);
  });

  it("removes previous ore", () => {
    const { store, snapshot } = setup();
    putStray(store, IDS.ore);
    regenerateOre(DIMS, 777, norm(on), snapshot, store);
    expect(store.getBlock(STRAY.x, STRAY.y, STRAY.z)).toBe(AIR);
  });
});
