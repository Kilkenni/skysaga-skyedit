// Uses a fake ground function, so no VoxelStore is involved.

import { describe, it, expect } from "vitest";
import { findAirshipSpot } from "../src/lib/entities";

const dims = { width: 40, depth: 40, height: 20 };
// insetX = insetZ = round(40 * 0.3) = 12, so the search starts inside [12, 28] on both axes

const flat3 = () => 3; // ground top at y = 3 everywhere
const noGround = () => -1;
const seeds = Array.from({ length: 50 }, (_, i) => i);

describe("findAirshipSpot", () => {
  it("returns an Airship entity standing on the ground, without an id", () => {
    const spot = findAirshipSpot(dims, flat3, 1);
    expect(spot).not.toBeNull();
    expect(spot).toMatchObject({ name: "Airship", y: 4, items: [] }); // one above the top block
    expect(spot).not.toHaveProperty("id");
    expect(Object.keys(spot!).sort()).toStrictEqual(["items", "name", "x", "y", "z"]);
  });

  it("is deterministic: the same seed and ground give an identical result", () => {
    expect(findAirshipSpot(dims, flat3, 42)).toStrictEqual(findAirshipSpot(dims, flat3, 42));
  });

  it("gives different spots for different seeds", () => {
    const spots = new Set(
      seeds.slice(0, 20).map((s) => {
        const p = findAirshipSpot(dims, flat3, s)!;
        return `${p.x},${p.z}`;
      })
    );
    expect(spots.size).toBeGreaterThanOrEqual(3);
  });

  it("starts about 30% in from the map edge, never right on it", () => {
    for (const s of seeds) {
      const p = findAirshipSpot(dims, flat3, s)!;
      expect(p.x).toBeGreaterThanOrEqual(12);
      expect(p.x).toBeLessThanOrEqual(28);
      expect(p.z).toBeGreaterThanOrEqual(12);
      expect(p.z).toBeLessThanOrEqual(28);
    }
  });

  it("puts the airship one block above whatever the ground is at the chosen column", () => {
    const hilly = (x: number, z: number) => (x * 3 + z) % 10; // 0..9, always valid
    for (const s of seeds) {
      const p = findAirshipSpot(dims, hilly, s)!;
      expect(p.y).toBe(hilly(p.x, p.z) + 1);
    }
  });

  it("returns null when the map has no ground", () => {
    expect(findAirshipSpot(dims, noGround, 1)).toBeNull();
  });

  it("returns null when the only ground touches the ceiling (no room above)", () => {
    const ceiling = () => dims.height - 1;
    expect(findAirshipSpot(dims, ceiling, 1)).toBeNull();
  });

  it("accepts ground one block below the ceiling", () => {
    const almost = () => dims.height - 2;
    expect(findAirshipSpot(dims, almost, 1)).toMatchObject({ y: dims.height - 1 });
  });

  it.each([
    ["top-left", 0, 0],
    ["top-right", 39, 0],
    ["bottom-left", 0, 39],
    ["bottom-right", 39, 39],
  ])("still finds ground that only exists in the %s corner", (_label, cx, cz) => {
    const corner = (x: number, z: number) => (x === cx && z === cz ? 5 : -1);
    for (const s of seeds.slice(0, 10)) {
      expect(findAirshipSpot(dims, corner, s)).toStrictEqual({
        name: "Airship",
        x: cx,
        y: 6,
        z: cz,
        items: [],
      });
    }
  });

  it("only asks about cells inside the map, always with fromY = height - 1", () => {
    const calls: [number, number, number][] = [];
    const spy = (x: number, z: number, fromY: number) => {
      calls.push([x, z, fromY]);
      return x === 39 && z === 39 ? 5 : -1; // forces a long search across the whole map
    };
    findAirshipSpot(dims, spy, 7);
    expect(calls.length).toBeGreaterThan(0);
    for (const [x, z, fromY] of calls) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(dims.width);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThan(dims.depth);
      expect(fromY).toBe(dims.height - 1);
    }
  });

  it("works on a non-square map", () => {
    const wide = { width: 64, depth: 16, height: 10 };
    for (const s of seeds) {
      const p = findAirshipSpot(wide, flat3, s)!;
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(wide.width);
      expect(p.z).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeLessThan(wide.depth);
    }
  });

  it.each([0, 1, -5, 123456789, 2 ** 31, 2 ** 40, 0.5])(
    "handles seed %s without throwing and finds a spot",
    (seed) => {
      expect(findAirshipSpot(dims, flat3, seed)).not.toBeNull();
    }
  );

  // Golden values: the first run writes the snapshot into this file; review it, then commit.
  // If it changes later, either the order of rand() calls, the salt or the start rules changed.
  it("pins the result for a few seeds", () => {
    const pinned = [1, 2, 3].map((s) => findAirshipSpot(dims, flat3, s));
    expect(pinned).toMatchInlineSnapshot(`
      [
        {
          "items": [],
          "name": "Airship",
          "x": 12,
          "y": 4,
          "z": 17,
        },
        {
          "items": [],
          "name": "Airship",
          "x": 25,
          "y": 4,
          "z": 27,
        },
        {
          "items": [],
          "name": "Airship",
          "x": 12,
          "y": 4,
          "z": 20,
        },
      ]
    `);
  });
});