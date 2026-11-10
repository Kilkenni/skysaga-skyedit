import { describe, it, expect } from "vitest";
import {
  getEntityYaw,
  parseEntities,
  exportEntity,
  EntityDataId
} from "../src/lib/entities";

// test data
const full: EntityDataId = {
  id: 123654,
  name: "Muffin",
  x: 3,
  y: 122,
  z: 77,
  yaw: 90,
  items: ["Sword", "Apple"],
};

// key absent (not merely undefined)
function omit<K extends keyof EntityDataId>(e: EntityDataId, key: K) {
  const copy: Partial<EntityDataId> = { ...e };
  delete copy[key];
  return copy as EntityDataId;
}

const noYawAbsent = omit(full, "yaw");
const noYawUndefined: EntityDataId = { ...full, yaw: undefined }; // key present, value undefined
const yawZero: EntityDataId = { ...full, yaw: 0 };
const noItemsAbsent = omit(full, "items");
const emptyItems: EntityDataId = { ...full, items: [] }; // what placeEntityAt creates

// ---------- getEntityYaw ----------

describe("getEntityYaw", () => {
  it("returns yaw if there is one", () => {
    expect(getEntityYaw(full)).toEqual(90);
  });

  it("returns 0 if the key is absent", () => {
    expect(getEntityYaw(noYawAbsent)).toEqual(0);
  });

  it("returns 0 if yaw is undefined", () => {
    expect(getEntityYaw(noYawUndefined)).toBe(0);
  });

  it("returns an explicit 0 as 0", () => {
    expect(getEntityYaw(yawZero)).toBe(0);
  });

  it("passes other values through untouched (no normalisation yet)", () => {
    expect(getEntityYaw({ ...full, yaw: 270 })).toBe(270);
  });
});

// ---------- exportEntity ----------

describe("exportEntity", () => {
  it("does not write the editor id", () => {
    expect(exportEntity(full)).not.toHaveProperty("id");
  });

  it("writes name, coordinates, yaw and items", () => {
    expect(exportEntity(full)).toStrictEqual({
      name: "Muffin",
      x: 3,
      y: 122,
      z: 77,
      yaw: 90,
      items: ["Sword", "Apple"],
    });
  });

  it("writes yaw: 0 when it was set explicitly", () => {
    expect(exportEntity(yawZero)).toHaveProperty("yaw", 0);
  });

  it("omits yaw when the key is absent", () => {
    expect(exportEntity(noYawAbsent)).not.toHaveProperty("yaw");
  });

  it("omits yaw when it is undefined (no yaw key with an undefined value)", () => {
    expect(exportEntity(noYawUndefined)).toStrictEqual(exportEntity(noYawAbsent));
    expect(exportEntity(noYawUndefined)).not.toHaveProperty("yaw");
  });

  it("omits empty items", () => {
    expect(exportEntity(emptyItems)).not.toHaveProperty("items");
  });

  it("omits missing items", () => {
    expect(exportEntity(noItemsAbsent)).not.toHaveProperty("items");
  });

  // unknown fields are dropped on export (whitelist).
  it("drops unknown fields", () => {
    const withExtra = { ...full, somethingElse: "x" }; // a variable, so TS does not flag the extra key
    expect(exportEntity(withExtra)).not.toHaveProperty("somethingElse");
  });

  it("does not mutate its input", () => {
    const before = structuredClone(full);
    exportEntity(full);
    expect(full).toStrictEqual(before);
  });
});

// ---------- parseEntities ----------

const a = { name: "A", x: 1, y: 2, z: 3 };
const b = { name: "B", x: 4, y: 5, z: 6, yaw: 180 };

describe("parseEntities", () => {
  it("parses a minimal entity without adding yaw or items keys", () => {
    expect(parseEntities([a])).toStrictEqual([a]);
  });

  it("parses yaw and items", () => {
    expect(parseEntities([{ ...a, yaw: 270, items: ["x"] }])).toStrictEqual([
      { ...a, yaw: 270, items: ["x"] },
    ]);
  });

  it("keeps yaw: 0", () => {
    expect(parseEntities([{ ...a, yaw: 0 }])).toStrictEqual([{ ...a, yaw: 0 }]);
  });

  it.each([
    ["a string", "90"],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["null", null],
    ["an object", {}],
  ])("keeps the entity but ignores yaw that is %s", (_label, badYaw) => {
    expect(parseEntities([{ ...a, yaw: badYaw }])).toStrictEqual([a]);
  });

  it("coerces item elements to strings", () => {
    expect(parseEntities([{ ...a, items: [1, "two", true] }])[0].items).toStrictEqual([
      "1",
      "two",
      "true",
    ]);
  });

  it.each([
    ["a string", "sword"],
    ["a number", 5],
    ["an object", { 0: "sword" }],
  ])("ignores items that are %s", (_label, badItems) => {
    expect(parseEntities([{ ...a, items: badItems }])).toStrictEqual([a]);
  });

  it.each([
    ["null", null],
    ["a number", 42],
    ["a string", "entity"],
    ["an array", [1, 2, 3]],
    ["an empty object", {}],
    ["a non-string name", { ...a, name: 5 }],
    ["a missing name", { x: 1, y: 2, z: 3 }],
    ["a string x", { ...a, x: "1" }],
    ["NaN in y", { ...a, y: NaN }],
    ["Infinity in z", { ...a, z: Infinity }],
    ["a missing z", { name: "A", x: 1, y: 2 }],
    ["a null y", { ...a, y: null }],
  ])("skips an entry that is %s and keeps its neighbours in order", (_label, broken) => {
    expect(parseEntities([a, broken, b])).toStrictEqual([a, b]);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an object", { entities: [a] }],
    ["a string", "entities"],
    ["a number", 5],
    ["an array-like", { length: 1, 0: a }],
  ])("returns [] for input that is %s", (_label, raw) => {
    expect(parseEntities(raw)).toStrictEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(parseEntities([])).toStrictEqual([]);
  });
});

// ---------- round trip through real JSON text ----------

// [label, input entity, what the file should give back after parse]
const roundTripCases: [string, EntityDataId, object][] = [
  ["full entity", full, { name: "Muffin", x: 3, y: 122, z: 77, yaw: 90, items: ["Sword", "Apple"] }],
  ["no yaw (key absent)", noYawAbsent, { name: "Muffin", x: 3, y: 122, z: 77, items: ["Sword", "Apple"] }],
  ["no yaw (undefined)", noYawUndefined, { name: "Muffin", x: 3, y: 122, z: 77, items: ["Sword", "Apple"] }],
  ["yaw: 0 stays 0", yawZero, { name: "Muffin", x: 3, y: 122, z: 77, yaw: 0, items: ["Sword", "Apple"] }],
  ["no items", noItemsAbsent, { name: "Muffin", x: 3, y: 122, z: 77, yaw: 90 }],
  // DECISION: empty items are normalised away on export
  ["empty items are dropped", emptyItems, { name: "Muffin", x: 3, y: 122, z: 77, yaw: 90 }],
];

function viaFile(entities: EntityDataId[]) {
  const text = JSON.stringify(entities.map((e) => exportEntity(e))); // what the export writes
  return parseEntities(JSON.parse(text)); // what the import reads
}

describe("serialize -> JSON text -> parse", () => {
  it.each(roundTripCases)("%s", (_label, input, expected) => {
    expect(viaFile([input])).toStrictEqual([expected]);
  });

  it("keeps order and count for a list", () => {
    const list = [full, noYawAbsent, yawZero, emptyItems].map((e, i) => ({
      ...e,
      id: i,
      name: `E${i}`,
    }));
    expect(viaFile(list).map((e) => e.name)).toStrictEqual(["E0", "E1", "E2", "E3"]);
  });

  it.each(roundTripCases)("is idempotent: %s", (_label, input) => {
    const once = exportEntity(input);
    const parsed = parseEntities(JSON.parse(JSON.stringify([once])));
    const twice = exportEntity({ ...parsed[0], id: 0 });
    expect(twice).toStrictEqual(once);
  });
});
