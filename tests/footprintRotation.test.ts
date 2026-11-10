// Rotation table (from the client notes), offsets (dx, dz), y is never changed:
//    yaw   0: (dx, dz)
//    yaw  90: (dz, -dx)
//    yaw 180: (-dx, -dz)
//    yaw 270: (-dz, dx)
// Worked example from the notes: Window_Boarded_1x1x1 = offsets (0,0,-1) and (0,0,0);
// at (18, 7, 90) with yaw 90 it occupies (17,7,90) and (18,7,90).
//
// Delete the old "TODAY: ignores yaw" test in placementChecks.test.ts, this file replaces it.
// canPlaceEntity must read `yaw` from the candidate: type `incoming` as EntityData, not {name,x,y,z}.
// Tests marked DECISION / UNVERIFIED pin a guess that needs a check on the real client.

import { describe, it, expect } from "vitest";
import { canPlaceEntity, footprintCells, EntityCatalogue } from "../src/lib/placementChecks";
import { EntityData } from "../src/lib/entities";

// ---------- fixtures ----------

const catalogue: EntityCatalogue = {
  footprints: {
    Box: [[0, 0, 0]],
    Window: [[0, 0, -1], [0, 0, 0]], // the example from the notes
    Ell: [[0, 0, 0], [2, 0, 0], [2, 0, 1], [0, 3, 0]], // asymmetric: tells the four turns apart
  },
  singleton: new Set<string>(),
  service: new Set<string>(),
};

// builds the entity without a `yaw` key when no yaw is given
const at = (name: string, x: number, y: number, z: number, yaw?: number): EntityData =>
  yaw === undefined ? { name, x, y, z } : { name, x, y, z, yaw };

const dims = { width: 100, depth: 100, height: 20 };

// ---------- footprintCells ----------

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
    [90, [[17, 7, 90], [18, 7, 90]]], // the example from the client notes
    [180, [[18, 7, 91], [18, 7, 90]]],
    [270, [[19, 7, 90], [18, 7, 90]]],
  ])("turns the two-block window for yaw %i", (yaw, expected) => {
    expect(footprintCells(at("Window", 18, 7, 90, yaw), catalogue)).toStrictEqual(expected);
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
  });

  it("returns fresh arrays when rotated: changing the result does not touch the catalogue", () => {
    const cells = footprintCells(at("Window", 18, 7, 90, 90), catalogue);
    cells[0]![0] = 999;
    expect(catalogue.footprints.Window).toStrictEqual([[0, 0, -1], [0, 0, 0]]);
  });

  // DECISION / UNVERIFIED: the notes say the client collapses all blocks into one at yaw that is not
  // a multiple of 90 (only a one-block barrel at 45 was tested). Guess: the origin cell is the one kept.
  // Check on the real client with a multi-block entity at 45, then fix this expectation if needed.
  it.each([45, 89, 90.5, 359.9, -45])("UNVERIFIED: collapses a multi-block entity to its origin cell at yaw %s", (yaw) => {
    expect(footprintCells(at("Ell", 10, 5, 10, yaw), catalogue)).toStrictEqual([[10, 5, 10]]);
    expect(footprintCells(at("Window", 18, 7, 90, yaw), catalogue)).toStrictEqual([[18, 7, 90]]);
  });
});

// ---------- canPlaceEntity uses the rotated cells ----------

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
});
