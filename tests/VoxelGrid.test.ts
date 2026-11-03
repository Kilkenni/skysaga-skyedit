import { GridDimensions, VoxelGrid } from "../src/VoxelGrid";
import { AIR } from "../src/constants";
import { describe, it, expect } from "vitest";

// All three sizes differ, so a mixed-up axis can't hide.
const DIMS: GridDimensions = { width: 4, depth: 3, height: 5 };

type Cell = { x: number; y: number; z: number; block: number; meta: number };
const byPosition = (a: Cell, b: Cell) => a.y - b.y || a.z - b.z || a.x - b.x;

describe("VoxelGrid", () => {
  it.each([
    { width: 0, depth: 3, height: 5 },
    { width: 4, depth: -1, height: 5 },
    { width: 4, depth: 3, height: 2.5 },
    { width: NaN, depth: 3, height: 5 },
  ])("rejects invalid dimensions %p", (dims) => {
    expect(() => new VoxelGrid(dims)).toThrow();
  });

  it("reads back what was written, including meta", () => {
    const grid = new VoxelGrid(DIMS);
    grid.set(1, 2, 0, 7, 9);
    expect(grid.get(1, 2, 0)).toEqual({ x: 1, y: 2, z: 0, block: 7, meta: 9 });
    expect(grid.getBlock(1, 2, 0)).toBe(7);
  });

  it("treats untouched cells as empty", () => {
    const grid = new VoxelGrid(DIMS);
    expect(grid.get(0, 0, 0)).toBeUndefined();
    expect(grid.getBlock(0, 0, 0)).toBe(AIR);
  });

  it("gives every coordinate its own slot", () => {
    const { width, depth, height } = DIMS;
    const grid = new VoxelGrid(DIMS);
    const expected = new Map<string, number>();
    let n = 1; // 1..60, a different block id for every cell
    for (let y = 0; y < height; y++)
      for (let z = 0; z < depth; z++)
        for (let x = 0; x < width; x++) {
          grid.set(x, y, z, n);
          expected.set(`${x},${y},${z}`, n++);
        }
    for (const [key, block] of expected) {
      const [x, y, z] = key.split(",").map(Number);
      expect(grid.getBlock(x, y, z)).toBe(block);
    }
    expect(Array.from(grid.cells())).toHaveLength(width * depth * height);
  });

  it("cells() yields exactly the non-empty cells, with correct coordinates", () => {
    const grid = new VoxelGrid(DIMS);
    const written: Cell[] = [
      { x: 0, y: 0, z: 0, block: 1, meta: 0 },
      { x: 3, y: 0, z: 0, block: 3, meta: 0 }, // far end of x
      { x: 0, y: 0, z: 2, block: 4, meta: 1 }, // far end of z
      { x: 0, y: 4, z: 0, block: 5, meta: 2 }, // far end of y
      { x: 3, y: 4, z: 2, block: 2, meta: 5 }, // opposite corner
    ];
    for (const c of written) grid.set(c.x, c.y, c.z, c.block, c.meta);
    expect(Array.from(grid.cells()).sort(byPosition)).toEqual([...written].sort(byPosition));
  });

  it("setting AIR clears a cell", () => {
    const grid = new VoxelGrid(DIMS);
    grid.set(1, 1, 1, 5, 3);
    grid.set(1, 1, 1, AIR);
    expect(grid.get(1, 1, 1)).toBeUndefined();
    expect(Array.from(grid.cells())).toHaveLength(0);
  });

  it.each([
    [-1, 0, 0], [4, 0, 0], [0, -1, 0], [0, 5, 0],
    [0, 0, -1], [0, 0, 3], [1.5, 0, 0], [NaN, 0, 0],
  ])("rejects out-of-range coordinate (%p, %p, %p)", (x, y, z) => {
    const grid = new VoxelGrid(DIMS);
    expect(() => grid.set(x, y, z, 1)).toThrow();
    expect(() => grid.get(x, y, z)).toThrow();
  });

  it("rejects block ids above AIR", () => {
    const grid = new VoxelGrid(DIMS);
    expect(() => grid.set(0, 0, 0, AIR + 1)).toThrow();
  });
});
