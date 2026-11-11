// Part of the placementChecks, specifically dedicated to rotateY.
// Tests marked DECISION pin a choice we made; flip the expectation if you decide differently.
// Rules, from the client data and in-game checks:
//  1. Yaw within 0.1 degrees of a multiple of 90 rotates the offsets (dx, dz), y never changes.
// Rotation table (from the client notes), offsets (dx, dz), y is never changed:
//    yaw   0: (dx, dz)
//    yaw  90: (dz, -dx)
//    yaw 180: (-dx, -dz)
//    yaw 270: (-dz, dx)
//  2. Any other yaw: the client's rotation matrix is all zeros for X and Z and keeps Y, so every offset (dx, dy, dz) lands at (0, dy, 0) on the anchor. Duplicates collapse into one cell - i.e. a footprint collapses into a column lined with the anchor point.
//  3. The map position (x, y, z) is the anchor cell (offset 0,0,0).
// Window_Boarded_1x1x1 example from the original notes: offsets (0,0,-1),(0,0,0) at (18,7,90) with yaw 90 -> (17,7,90),(18,7,90).
// canPlaceEntity must read `yaw` from the candidate: type `incoming` as EntityData, not {name,x,y,z}.
// Tests marked DECISION / UNVERIFIED pin a guess that needs a check on the real client.

import { describe, it, expect } from "vitest";
import { canPlaceEntity, footprintCells, EntityCatalogue } from "../src/lib/placementChecks";
import { EntityData } from "../src/lib/entities";

// ---------- fixtures ----------

const catalogue: EntityCatalogue = {
  footprints: {
    Box: [[0, 0, 0]],
    Window: [[0, 0, -1], [0, 0, 0]], // the example from the first notes
    Ell: [[0, 0, 0], [2, 0, 0], [2, 0, 1], [0, 3, 0]], // asymmetric, with a tall part
    Shield: [[0, 0, -1]], // like Hanging_WallShield_A: the cell behind the origin
    Tapestry: [[-1, 0, -1], [0, 0, -1], [1, 0, -1]], // like Hanging_Tapestry_A
    Stone: [ // like Hanging_WallDec_Stone_C: 3 wide, 3 tall, one block thick
      [-1, -2, -1], [-1, -1, -1], [-1, 0, -1],
      [0, -2, -1], [0, -1, -1], [0, 0, -1],
      [1, -2, -1], [1, -1, -1], [1, 0, -1],
    ],
    Mixed: [[0, 2, 0], [1, 0, 0], [0, 1, 0]], // heights are not in ascending order
  },
  singleton: new Set<string>(),
  service: new Set<string>(),
};

// builds the entity without a `yaw` key when no yaw is given
const at = (name: string, x: number, y: number, z: number, yaw?: number): EntityData =>
  yaw === undefined ? { name, x, y, z } : { name, x, y, z, yaw };

const dims = { width: 100, depth: 100, height: 20 };

// ---------- multiples of 90: rotation ----------

describe("footprintCells rotation", () => {
  it.each([
    [0, [[10, 5, 10], [12, 5, 10], [12, 5, 11], [10, 8, 10]]],
    [90, [[10, 5, 10], [10, 5, 8], [11, 5, 8], [10, 8, 10]]],
    [180, [[10, 5, 10], [8, 5, 10], [8, 5, 9], [10, 8, 10]]],
    [270, [[10, 5, 10], [10, 5, 12], [9, 5, 12], [10, 8, 10]]],
  ])("turns an asymmetric footprint for yaw %i", (yaw, expected) => {
    expect(footprintCells(at("Ell", 10, 5, 10, yaw), catalogue)).toStrictEqual(expected);
  });

  it.each([
    [0, [[18, 7, 89], [18, 7, 90]]],
    [90, [[17, 7, 90], [18, 7, 90]]], // the example from the first notes
    [180, [[18, 7, 91], [18, 7, 90]]],
    [270, [[19, 7, 90], [18, 7, 90]]],
  ])("turns the two-block window for yaw %i", (yaw, expected) => {
    expect(footprintCells(at("Window", 18, 7, 90, yaw), catalogue)).toStrictEqual(expected);
  });

  // The wall stays behind the decoration: it faces +Z at yaw 0, +X at 90, -Z at 180, -X at 270.
  it.each([
    [0, [[4, 6, 3]]],
    [90, [[3, 6, 4]]],
    [180, [[4, 6, 5]]],
    [270, [[5, 6, 4]]],
  ])("keeps the wall cell behind a wall decoration for yaw %i", (yaw, expected) => {
    expect(footprintCells(at("Shield", 4, 6, 4, yaw), catalogue)).toStrictEqual(expected);
  });

  it("treats a missing yaw as 0, and keeps the catalogue order of the cells", () => {
    const none = footprintCells(at("Ell", 10, 5, 10), catalogue);
    expect(none).toStrictEqual(footprintCells(at("Ell", 10, 5, 10, 0), catalogue));
    expect(none[0]).toStrictEqual([10, 5, 10]); // the origin cell stays first
  });

  it.each([
    [360, 0],
    [450, 90],
    [720, 0],
    [-90, 270],
    [-180, 180],
    [-270, 90],
    [540, 180],
  ])("treats yaw %i like yaw %i", (yaw, same) => {
    expect(footprintCells(at("Ell", 10, 5, 10, yaw), catalogue)).toStrictEqual(
      footprintCells(at("Ell", 10, 5, 10, same), catalogue)
    );
  });

  it.each([0, 90, 180, 270])("never changes the heights of the cells (yaw %i)", (yaw) => {
    const heights = footprintCells(at("Ell", 10, 5, 10, yaw), catalogue).map(([, y]) => y);
    expect(heights).toStrictEqual([5, 5, 5, 8]);
  });

  it.each([0, 45, 90, 135, 180, 200, 270, -30])("leaves a one-block entity alone at yaw %i", (yaw) => {
    expect(footprintCells(at("Box", 3, 4, 5, yaw), catalogue)).toStrictEqual([[3, 4, 5]]);
  });

  it("still gives [] for a name without a footprint, whatever the yaw", () => {
    expect(footprintCells(at("Wolf", 1, 1, 1, 90), catalogue)).toStrictEqual([]);
    expect(footprintCells(at("Wolf", 1, 1, 1, 45), catalogue)).toStrictEqual([]);
  });

  it("returns fresh arrays when rotated: changing the result does not touch the catalogue", () => {
    const cells = footprintCells(at("Window", 18, 7, 90, 90), catalogue);
    cells[0]![0] = 999;
    expect(catalogue.footprints.Window).toStrictEqual([[0, 0, -1], [0, 0, 0]]);
  });
});

// ---------- tolerance: the client accepts 0.1 degrees around a multiple of 90 ----------

describe("footprintCells yaw tolerance", () => {
  it.each([
    [90.05, 90],
    [89.95, 90],
    [180.09, 180],
    [270.05, 270],
    [0.05, 0],
    [-0.05, 0], // normalises to 359.95
    [359.95, 0],
  ])("treats yaw %f like yaw %i (inside the tolerance)", (yaw, same) => {
    expect(footprintCells(at("Ell", 10, 5, 10, yaw), catalogue)).toStrictEqual(
      footprintCells(at("Ell", 10, 5, 10, same), catalogue)
    );
  });

  it.each([90.2, 89.8, 0.2, 359.8, 180.3])("does not treat yaw %f as a multiple of 90", (yaw) => {
    // outside the tolerance: the collapsed column, not a rotation
    expect(footprintCells(at("Ell", 10, 5, 10, yaw), catalogue)).toStrictEqual([[10, 5, 10], [10, 8, 10]]);
  });
});

// ---------- any other yaw: every cell lands on the anchor column, heights are kept ----------

describe("footprintCells at yaw that is not a multiple of 90", () => {
  it.each([45, 135, 225, 315, 89, 91, 90.5, 359.9, -45, 22.5])("collapses to a column at yaw %s", (yaw) => {
    // Ell offsets have heights 0, 0, 0, 3 -> two distinct cells
    expect(footprintCells(at("Ell", 10, 5, 10, yaw), catalogue)).toStrictEqual([[10, 5, 10], [10, 8, 10]]);
    // Window: both cells are at height 0 -> one cell
    expect(footprintCells(at("Window", 18, 7, 90, yaw), catalogue)).toStrictEqual([[18, 7, 90]]);
    // wall shield: keeps one cell, the anchor
    expect(footprintCells(at("Shield", 4, 6, 4, yaw), catalogue)).toStrictEqual([[4, 6, 4]]);
    // tapestry (3 wide, all at height 0): one cell
    expect(footprintCells(at("Tapestry", 4, 6, 4, yaw), catalogue)).toStrictEqual([[4, 6, 4]]);
    // stone decoration (3x3): keeps one column of three cells
    expect(footprintCells(at("Stone", 20, 10, 20, yaw), catalogue)).toStrictEqual([
      [20, 8, 20],
      [20, 9, 20],
      [20, 10, 20],
    ]);
  });

  // DECISION: cells keep the order of their first appearance in the catalogue (no sorting by height).
  it("lists the column in the order the heights first appear", () => {
    expect(footprintCells(at("Mixed", 5, 5, 5, 45), catalogue)).toStrictEqual([
      [5, 7, 5],
      [5, 5, 5],
      [5, 6, 5],
    ]);
  });

  it("reports no cell twice", () => {
    const cells = footprintCells(at("Stone", 20, 10, 20, 45), catalogue);
    expect(new Set(cells.map((c) => c.join(","))).size).toBe(cells.length);
  });

  // ASSUMPTION: the anchor is the entity's own map cell at every angle. Checked in game at 45 degrees only;
  // the client's anchor formula suggests an even-width footprint (e.g. a 2-wide banner) might shift by one cell
  // at some other angles. Revisit if a test on the real client says so.
  it("ASSUMPTION: the column stands on the entity's own cell", () => {
    expect(footprintCells(at("Shield", 4, 6, 4, 135), catalogue)).toStrictEqual([[4, 6, 4]]);
  });
});

// ---------- canPlaceEntity uses the rotated and collapsed cells ----------

describe("canPlaceEntity with rotated footprints", () => {
  const windowTurned = [at("Window", 18, 7, 90, 90)]; // occupies (17,7,90) and (18,7,90)

  it("refuses a hit on a cell the rotation moved the entity into", () => {
    expect(canPlaceEntity(at("Box", 17, 7, 90), windowTurned, dims, catalogue)).toStrictEqual({
      ok: false,
      reason: "overlap",
      overlaps: [[17, 7, 90]],
    });
  });

  it("accepts the cell the entity would have used without the rotation", () => {
    expect(canPlaceEntity(at("Box", 18, 7, 89), windowTurned, dims, catalogue)).toStrictEqual({ ok: true });
  });

  it("uses the yaw of the candidate too", () => {
    const box = [at("Box", 17, 7, 90)];
    expect(canPlaceEntity(at("Window", 18, 7, 90, 90), box, dims, catalogue)).toStrictEqual({
      ok: false,
      reason: "overlap",
      overlaps: [[17, 7, 90]],
    });
    expect(canPlaceEntity(at("Window", 18, 7, 90, 0), box, dims, catalogue)).toStrictEqual({ ok: true });
  });

  it("handles an asymmetric entity that is turned", () => {
    const ellTurned = [at("Ell", 10, 5, 10, 90)]; // (10,5,10) (10,5,8) (11,5,8) (10,8,10)
    expect(canPlaceEntity(at("Box", 11, 5, 8), ellTurned, dims, catalogue)).toStrictEqual({
      ok: false,
      reason: "overlap",
      overlaps: [[11, 5, 8]],
    });
    expect(canPlaceEntity(at("Box", 12, 5, 10), ellTurned, dims, catalogue)).toStrictEqual({ ok: true }); // unrotated cell
  });

  it("uses the collapsed column for an entity at an odd yaw", () => {
    const stone45 = [at("Stone", 20, 10, 20, 45)]; // column (20,8..10,20)
    expect(canPlaceEntity(at("Box", 20, 9, 20), stone45, dims, catalogue)).toStrictEqual({
      ok: false,
      reason: "overlap",
      overlaps: [[20, 9, 20]],
    });
    expect(canPlaceEntity(at("Box", 21, 9, 20), stone45, dims, catalogue)).toStrictEqual({ ok: true }); // beside the column
    expect(canPlaceEntity(at("Box", 20, 9, 19), stone45, dims, catalogue)).toStrictEqual({ ok: true }); // where the wall would be at yaw 0
  });
});
