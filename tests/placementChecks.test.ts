// tests/placementChecks.test.ts
// Run: npx vitest run tests/placementChecks.test.ts --reporter=verbose
//
// Assumes src/lib/placementChecks.ts exports: canPlaceEntity, footprintCells, EntityCatalogue.
// If footprintCells lives elsewhere, change the import.
//
// This step must preserve TODAY's behaviour of placeEntityAt.
// Tests marked "TODAY:" pin a known gap; flip them when footprints/rotation get their own step.

import { describe, it, expect } from "vitest";
import { canPlaceEntity, footprintCells, EntityCatalogue, PlaceCheck, Cell } from "../src/lib/placementChecks";
import { EntityData } from "../src/lib/entities";
import { keyOf } from "../src/lib/keys";

// ---------- fixtures ----------

const dims = { width: 10, depth: 10, height: 10 }; // valid cells: 0..9 on every axis

const catalogue: EntityCatalogue = {
  footprints: {
    Box: [[0, 0, 0]],
    Wide: [[0, 0, 0], [1, 0, 0]], // 2 cells along +x
    Pillar: [[0, 0, 0], [0, 1, 0]], // 2 cells along +y
    Altar: [[0, -1, 0], [0, 0, 0]], // has a cell BELOW its origin
    Airship: [[0, 0, 0]],
  },
  singleton: new Set(["Airship"]),
  service: new Set(["AIPack"]),
};
// "Wolf" is deliberately not in the catalogue: no footprint, like creatures and NPCs.

const at = (name: string, x: number, y: number, z: number): EntityData => ({ name, x, y, z });

const OK:PlaceCheck = { ok: true };
const refused = (reason: string) => ({ ok: false, reason });

// ---------- footprintCells ----------

describe("footprintCells", () => {
  it("adds the offsets to the entity position, in catalogue order", () => {
    expect(footprintCells(at("Wide", 3, 3, 3), catalogue)).toStrictEqual([
      [3, 3, 3],
      [4, 3, 3],
    ]);
  });

  it("handles offsets below and beside the origin", () => {
    expect(footprintCells(at("Altar", 5, 0, 5), catalogue)).toStrictEqual([
      [5, -1, 5],
      [5, 0, 5],
    ]);
  });

  it("returns an empty list for a name without a footprint", () => {
    expect(footprintCells(at("Wolf", 1, 1, 1), catalogue)).toStrictEqual([]);
  });

  it("returns fresh arrays: changing the result does not touch the catalogue", () => {
    const cells = footprintCells(at("Wide", 3, 3, 3), catalogue);
    cells[0][0] = 999;
    cells.push([0, 0, 0]);
    expect(catalogue.footprints.Wide).toStrictEqual([[0, 0, 0], [1, 0, 0]]);
  });
});

// ---------- canPlaceEntity: basics ----------

describe("canPlaceEntity basics", () => {
  it("accepts a placement on an empty map", () => {
    expect(canPlaceEntity(at("Box", 5, 5, 5), [], dims, catalogue)).toStrictEqual(OK);
  });

  it("accepts an entity without a footprint", () => {
    expect(canPlaceEntity(at("Wolf", 5, 5, 5), [], dims, catalogue)).toStrictEqual(OK);
  });

  it("does not modify its inputs", () => {
    const candidate = at("Wide", 4, 3, 3);
    const existing = [at("Wide", 3, 3, 3), at("Airship", 1, 1, 1)];
    const before = structuredClone({ candidate, existing, dims });
    canPlaceEntity(candidate, existing, dims, catalogue);
    expect({ candidate, existing, dims }).toStrictEqual(before);
  });
});

// ---------- bounds ----------

describe("canPlaceEntity bounds", () => {
  it.each([
    ["x below 0", -1, 5, 5],
    ["x at width", 10, 5, 5],
    ["y below 0", 5, -1, 5],
    ["y at height", 5, 10, 5],
    ["z below 0", 5, 5, -1],
    ["z at depth", 5, 5, 10],
  ])("refuses %s as out-of-bounds", (_label, x, y, z) => {
    expect(canPlaceEntity(at("Box", x, y, z), [], dims, catalogue)).toStrictEqual(refused("out-of-bounds"));
  });

  it.each([
    ["the lowest corner", 0, 0, 0],
    ["the highest corner", 9, 9, 9],
  ])("accepts %s", (_label, x, y, z) => {
    expect(canPlaceEntity(at("Box", x, y, z), [], dims, catalogue)).toStrictEqual(OK);
  });

  it("checks bounds before every other rule", () => {
    const existing = [at("Airship", 1, 1, 1)];
    expect(canPlaceEntity(at("Airship", -1, 0, 0), existing, dims, catalogue)).toStrictEqual(refused("out-of-bounds"));
    expect(canPlaceEntity(at("AIPack", 99, 0, 0), [], dims, catalogue)).toStrictEqual(refused("out-of-bounds"));
  });

  it("uses the map size it is given (non-square, other height)", () => {
    const wide = { width: 20, depth: 4, height: 3 };
    expect(canPlaceEntity(at("Box", 19, 2, 3), [], wide, catalogue)).toStrictEqual(OK);
    expect(canPlaceEntity(at("Box", 19, 2, 4), [], wide, catalogue)).toStrictEqual(refused("out-of-bounds"));
    expect(canPlaceEntity(at("Box", 5, 3, 0), [], wide, catalogue)).toStrictEqual(refused("out-of-bounds"));
  });
});

// ---------- singleton ----------

describe("canPlaceEntity singleton", () => {
  it("allows the first singleton", () => {
    expect(canPlaceEntity(at("Airship", 2, 2, 2), [], dims, catalogue)).toStrictEqual(OK);
  });

  it("refuses a second singleton, wherever the first one is", () => {
    const existing = [at("Airship", 0, 0, 0)];
    expect(canPlaceEntity(at("Airship", 9, 9, 9), existing, dims, catalogue)).toStrictEqual(refused("singleton"));
  });

  it("is not bothered by other entities when there is no airship yet", () => {
    const existing = [at("Box", 1, 1, 1), at("Wolf", 2, 2, 2)];
    expect(canPlaceEntity(at("Airship", 5, 5, 5), existing, dims, catalogue)).toStrictEqual(OK);
  });

  it("allows duplicates of a normal entity", () => {
    const existing = [at("Box", 1, 1, 1)];
    expect(canPlaceEntity(at("Box", 8, 8, 8), existing, dims, catalogue)).toStrictEqual(OK);
  });

  it("reports the singleton rule before overlap", () => {
    const existing = [at("Airship", 5, 5, 5)];
    expect(canPlaceEntity(at("Airship", 5, 5, 5), existing, dims, catalogue)).toStrictEqual(refused("singleton"));
  });
});

// ---------- service names ----------

describe("canPlaceEntity service names", () => {
  it("refuses a service entity", () => {
    expect(canPlaceEntity(at("AIPack", 5, 5, 5), [], dims, catalogue)).toStrictEqual(refused("service"));
  });

  it("still refuses it when the map is crowded", () => {
    const existing = [at("Box", 1, 1, 1), at("Wolf", 2, 2, 2)];
    expect(canPlaceEntity(at("AIPack", 5, 5, 5), existing, dims, catalogue)).toStrictEqual(refused("service"));
  });
});

// ---------- overlap ----------

describe("canPlaceEntity overlap", () => {
  const existing = [at("Wide", 3, 3, 3), at("Wide", 5, 3, 3)]; // occupies (3,3,3) and (4,3,3), then (5,3,3) and (6,3,3)

  it("refuses identical cells", () => {
    const result = canPlaceEntity(at("Box", 3, 3, 3), existing, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[3, 3, 3]] });
  });

  it("refuses a hit on the existing entity's second cell", () => {
    const result = canPlaceEntity(at("Box", 4, 3, 3), existing, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[4, 3, 3]] });
  });

  it("refuses a partial overlap between two multi-cell footprints", () => {
    const result = canPlaceEntity(at("Wide", 2, 3, 3), existing, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[3, 3, 3]] });
  });

  it("refuses a vertical overlap", () => {
    const result = canPlaceEntity(at("Pillar", 3, 2, 3), existing, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[3, 3, 3]] });
  });

  it("accepts touching footprints", () => {
    expect(canPlaceEntity(at("Wide", 1, 3, 3), existing, dims, catalogue)).toStrictEqual(OK); // next to it along x
    expect(canPlaceEntity(at("Box", 3, 4, 3), existing, dims, catalogue)).toStrictEqual(OK); // directly above
    expect(canPlaceEntity(at("Box", 3, 3, 4), existing, dims, catalogue)).toStrictEqual(OK); // next to it along z
  });

  it("checks every existing entity, not just the first", () => {
    const many = [at("Box", 0, 0, 0), at("Box", 1, 0, 0), at("Wide", 6, 6, 6)];
    const result = canPlaceEntity(at("Box", 7, 6, 6), many, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[7, 6, 6]] });
  });

  it("an existing entity without a footprint blocks nothing", () => {
    expect(canPlaceEntity(at("Box", 5, 5, 5), [at("Wolf", 5, 5, 5)], dims, catalogue)).toStrictEqual(OK);
  });

  it("reports all cells for a multi-cell overlap", () => {
    const candidate = at("Wide", 3, 3, 3);
    const result = canPlaceEntity(candidate, existing, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[3, 3, 3], [4, 3, 3]] });
  });

  it("reports all cells when overlapping several entities at once", () => {
    const candidate = at("Wide", 4, 3, 3);
    const result = canPlaceEntity(candidate, existing, dims, catalogue);
    expect(result).toStrictEqual({ ok: false, reason: "overlap", overlaps: [[4, 3, 3], [5, 3, 3]] });
  });

  it("lists cells in the candidate's footprint order, not the order of the existing entities", () => {
    const reversed = [at("Box", 5, 1, 5), at("Box", 5, 0, 5)];
    // Altar at y = 1 occupies (5,0,5) then (5,1,5)
    expect(canPlaceEntity(at("Altar", 5, 1, 5), reversed, dims, catalogue))
      .toStrictEqual({ ok: false, reason: "overlap", overlaps: [[5, 0, 5], [5, 1, 5]] });
  });

  // next 2 are for broken files where entities could be saved with overlapping footprints
  it("reports a cell once even when two existing entities occupy it", () => {
    const stacked = [at("Box", 5, 5, 5), at("Box", 5, 5, 5)]; // possible in a loaded file
    expect(canPlaceEntity(at("Box", 5, 5, 5), stacked, dims, catalogue))
      .toStrictEqual({ ok: false, reason: "overlap", overlaps: [[5, 5, 5]] });
  });

  it("reports each cell once when the existing entities overlap each other", () => {
    const crossing = [at("Wide", 3, 3, 3), at("Wide", 4, 3, 3)]; // both occupy (4,3,3)
    expect(canPlaceEntity(at("Wide", 3, 3, 3), crossing, dims, catalogue))
      .toStrictEqual({ ok: false, reason: "overlap", overlaps: [[3, 3, 3], [4, 3, 3]] });
  });

  // TODAY: only the NEW entity's footprint is tested, so a footprint-less entity can stand inside a device.
  it("TODAY: an entity without a footprint is allowed inside another entity's cells", () => {
    expect(canPlaceEntity(at("Wolf", 4, 3, 3), existing, dims, catalogue)).toStrictEqual(OK);
  });
});

// ---------- known gaps ----------

describe("canPlaceEntity known gaps", () => {
  // TODAY: only the origin is checked against the map, not the footprint cells.
  it("TODAY: accepts a footprint cell below the map (Altar at y = 0 has a cell at y = -1)", () => {
    expect(canPlaceEntity(at("Altar", 5, 0, 5), [], dims, catalogue)).toStrictEqual(OK);
  });

  it("TODAY: accepts a footprint cell beyond the far edge (Wide at x = 9 reaches x = 10)", () => {
    expect(canPlaceEntity(at("Wide", 9, 5, 5), [], dims, catalogue)).toStrictEqual(OK);
  });
});
