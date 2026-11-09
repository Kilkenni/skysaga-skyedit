// tests/EntityStore.test.ts
// Run: npx vitest run tests/EntityStore.test.ts --reporter=verbose
//
// Written against the API in the plan, before the TODO parts (update, translateAll) exist,
// so those blocks will fail until you write them.
// Tests marked DECISION pin a choice from the discussion; flip the expectation if you decide differently.

import { describe, it, expect } from "vitest";
import { EntityStore, EntityStoreEvent } from "../src/lib/EntityStore";
import { EntityData } from "../src/lib/entities";

// ---------- helpers ----------

// factories, so no test shares (or accidentally mutates) another test's input objects
const mkA = (): EntityData => ({ name: "A", x: 1, y: 2, z: 3 });
const mkB = (): EntityData => ({ name: "B", x: 4, y: 5, z: 6, yaw: 90, items: ["sword", "apple"] });
const mkC = (): EntityData => ({ name: "C", x: 7, y: 8, z: 9 });

function watch(store: EntityStore): EntityStoreEvent[] {
  const events: EntityStoreEvent[] = [];
  store.subscribe((e) => events.push(e));
  return events;
}

/** Asserts that exactly one event was announced and that it is a "change"; returns its changes. */
function onlyChanges(events: EntityStoreEvent[]) {
  expect(events).toHaveLength(1);
  const e = events[0];
  if (e.type !== "change") throw new Error(`expected a "change" event, got "${e.type}"`);
  return e.changes;
}

// ---------- reads ----------

describe("EntityStore reads", () => {
  it("starts empty", () => {
    const s = new EntityStore();
    expect(s.size).toBe(0);
    expect(s.list()).toStrictEqual([]);
  });

  it("get() finds a record by id and returns undefined for an unknown id", () => {
    const s = new EntityStore();
    const rec = s.add(mkA());
    expect(s.get(rec.id)).toBe(rec);
    expect(s.get(rec.id + 1000)).toBeUndefined();
  });

  it("size follows adds and removes", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    s.add(mkB());
    expect(s.size).toBe(2);
    s.remove(a.id);
    expect(s.size).toBe(1);
  });
});

// ---------- add ----------

describe("EntityStore.add", () => {
  it("returns the stored record: the data plus an id", () => {
    const s = new EntityStore();
    const rec = s.add(mkB());
    expect(rec).toStrictEqual({ ...mkB(), id: rec.id });
    expect(typeof rec.id).toBe("number");
    expect(s.list()[0]).toBe(rec);
  });

  it("does not add keys the input did not have (no yaw: undefined, no items: undefined)", () => {
    const s = new EntityStore();
    const rec = s.add(mkA());
    expect(Object.keys(rec).sort()).toStrictEqual(["id", "name", "x", "y", "z"]);
  });

  it("gives every entity a different id, increasing", () => {
    const s = new EntityStore();
    const ids = [s.add(mkA()), s.add(mkB()), s.add(mkC())].map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toStrictEqual([...ids].sort((p, q) => p - q));
  });

  it("ignores an id that comes with the data", () => {
    const s = new EntityStore();
    const withId = { ...mkA(), id: 999 } as EntityData; // an EntityDataId passed as EntityData
    const rec = s.add(withId);
    expect(rec.id).not.toBe(999);
  });

  it("does not modify its input", () => {
    const s = new EntityStore();
    const input = mkB();
    s.add(input);
    expect(input).toStrictEqual(mkB());
    expect(input).not.toHaveProperty("id");
  });

  it("copies items: changing the caller's array later does not change the stored record", () => {
    const s = new EntityStore();
    const input = mkB();
    const rec = s.add(input);
    input.items!.push("hacked");
    expect(rec.items).toStrictEqual(["sword", "apple"]);
    expect(s.get(rec.id)!.items).toStrictEqual(["sword", "apple"]);
  });

  it("announces exactly one change event with the new record", () => {
    const s = new EntityStore();
    const events = watch(s);
    const rec = s.add(mkA());
    expect(onlyChanges(events)).toStrictEqual([{ kind: "add", after: rec }]);
  });

  it("keeps insertion order", () => {
    const s = new EntityStore();
    s.add(mkA());
    s.add(mkB());
    s.add(mkC());
    expect(s.list().map((e) => e.name)).toStrictEqual(["A", "B", "C"]);
  });
});

// ---------- remove ----------

describe("EntityStore.remove", () => {
  it("removes the entity, returns true and announces it", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const b = s.add(mkB());
    const events = watch(s);
    expect(s.remove(a.id)).toBe(true);
    expect(s.list()).toStrictEqual([b]);
    expect(onlyChanges(events)).toStrictEqual([{ kind: "remove", before: a }]);
  });

  it("returns false for an unknown id and announces nothing", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const events = watch(s);
    expect(s.remove(a.id + 1000)).toBe(false);
    expect(events).toHaveLength(0);
  });

  it("a failed remove keeps the same list reference", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const before = s.list();
    s.remove(a.id + 1000);
    expect(s.list()).toBe(before);
  });

  it("keeps the order of the rest", () => {
    const s = new EntityStore();
    s.add(mkA());
    const b = s.add(mkB());
    s.add(mkC());
    s.remove(b.id);
    expect(s.list().map((e) => e.name)).toStrictEqual(["A", "C"]);
  });
});

// ---------- list(): snapshots and references ----------

describe("EntityStore.list snapshots", () => {
  it("returns the same reference until something changes", () => {
    const s = new EntityStore();
    s.add(mkA());
    expect(s.list()).toBe(s.list());
  });

  it("returns a new array after add, remove and update", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const afterAdd = s.list();
    s.update(a.id, { x: 50 });
    const afterUpdate = s.list();
    expect(afterUpdate).not.toBe(afterAdd);
    s.remove(a.id);
    expect(s.list()).not.toBe(afterUpdate);
  });

  it("an old snapshot never changes", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const snapshot = s.list();
    s.add(mkB());
    s.update(a.id, { x: 99 });
    s.remove(a.id);
    s.translateAll(1, 1, 1);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toStrictEqual({ ...mkA(), id: a.id });
  });
});

// ---------- update ----------

describe("EntityStore.update", () => {
  it("returns false for an unknown id and announces nothing", () => {
    const s = new EntityStore();
    s.add(mkA());
    const events = watch(s);
    expect(s.update(12345, { x: 10 })).toBe(false);
    expect(events).toHaveLength(0);
  });

  it("changes the given fields, returns true, and announces before and after", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const events = watch(s);
    expect(s.update(a.id, { x: 10, yaw: 180 })).toBe(true);

    const after = s.get(a.id)!;
    expect(after).toStrictEqual({ ...mkA(), x: 10, yaw: 180, id: a.id });
    expect(onlyChanges(events)).toStrictEqual([{ kind: "update", before: a, after }]);
  });

  it("replaces the record instead of mutating it", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    s.update(a.id, { x: 10 });
    expect(a).toStrictEqual({ ...mkA(), id: a.id }); // the old record is untouched
    expect(s.get(a.id)).not.toBe(a);
  });

  it("keeps the entity at the same position in the list", () => {
    const s = new EntityStore();
    s.add(mkA());
    const b = s.add(mkB());
    s.add(mkC());
    s.update(b.id, { x: 0 });
    expect(s.list().map((e) => e.name)).toStrictEqual(["A", "B", "C"]);
  });

  it("cannot change the id through the patch", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    s.update(a.id, { x: 5, id: 999 } as unknown as Partial<EntityData>);
    expect(s.get(a.id)).toBeDefined();
    expect(s.get(999)).toBeUndefined();
    expect(s.get(a.id)!.x).toBe(5);
  });

  it("allows renaming", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    s.update(a.id, { name: "Renamed" });
    expect(s.get(a.id)!.name).toBe("Renamed");
  });

  it("replaces items", () => {
    const s = new EntityStore();
    const b = s.add(mkB());
    s.update(b.id, { items: ["only"] });
    expect(s.get(b.id)!.items).toStrictEqual(["only"]);
  });

  it("copies items from the patch", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const items = ["x"];
    s.update(a.id, { items });
    items.push("y");
    expect(s.get(a.id)!.items).toStrictEqual(["x"]);
  });

  // DECISION: an update that changes nothing is not a change.
  it("does nothing for a no-op update: false, no event, same list reference", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const before = s.list();
    const events = watch(s);
    expect(s.update(a.id, { x: a.x, name: a.name })).toBe(false);
    expect(s.update(a.id, {})).toBe(false);
    expect(events).toHaveLength(0);
    expect(s.list()).toBe(before);
  });

  it("compares items by value for the no-op check", () => {
    const s = new EntityStore();
    const b = s.add(mkB());
    const events = watch(s);
    expect(s.update(b.id, { items: ["sword", "apple"] })).toBe(false); // equal content, new array
    expect(events).toHaveLength(0);
    expect(s.update(b.id, { items: ["apple", "sword"] })).toBe(true); // order matters
    expect(events).toHaveLength(1);
  });

  // DECISION: `undefined` in a patch removes the key (no key with an undefined value).
  it("removes yaw when the patch sets it to undefined", () => {
    const s = new EntityStore();
    const b = s.add(mkB());
    expect(s.update(b.id, { yaw: undefined })).toBe(true);
    expect(Object.keys(s.get(b.id)!)).not.toContain("yaw");
  });

  it("treats yaw: 0 as a real value, not as 'no yaw'", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    expect(s.update(a.id, { yaw: 0 })).toBe(true);
    expect(s.get(a.id)).toHaveProperty("yaw", 0);
  });
});

// ---------- clear ----------

describe("EntityStore.clear", () => {
  it("empties the store and announces a reset", () => {
    const s = new EntityStore();
    s.add(mkA());
    s.add(mkB());
    const events = watch(s);
    s.clear();
    expect(s.size).toBe(0);
    expect(s.list()).toStrictEqual([]);
    expect(events).toStrictEqual([{ type: "reset" }]);
  });

  // DECISION: clearing an already empty store announces nothing (saves a pointless autosave).
  it("announces nothing when the store is already empty", () => {
    const s = new EntityStore();
    const events = watch(s);
    s.clear();
    expect(events).toHaveLength(0);
  });

  it("does not reuse ids afterwards", () => {
    const s = new EntityStore();
    const old = [s.add(mkA()), s.add(mkB())].map((e) => e.id);
    s.clear();
    const fresh = s.add(mkC()).id;
    expect(old).not.toContain(fresh);
  });
});

// ---------- replaceAll ----------

describe("EntityStore.replaceAll", () => {
  it("replaces the content, in order, and announces exactly one reset", () => {
    const s = new EntityStore();
    s.add(mkC());
    const events = watch(s);
    s.replaceAll([mkA(), mkB()]);
    expect(s.list().map((e) => e.name)).toStrictEqual(["A", "B"]);
    expect(events).toStrictEqual([{ type: "reset" }]);
  });

  it("assigns unique ids", () => {
    const s = new EntityStore();
    s.replaceAll([mkA(), mkB(), mkC()]);
    expect(new Set(s.list().map((e) => e.id)).size).toBe(3);
  });

  it("ignores ids that come with the data", () => {
    const s = new EntityStore();
    const data = [{ ...mkA(), id: 500 }, { ...mkB(), id: 500 }] as unknown as EntityData[];
    s.replaceAll(data);
    const ids = s.list().map((e) => e.id);
    expect(ids).not.toContain(500);
    expect(new Set(ids).size).toBe(2);
  });

  it("does not reuse ids of the entities it replaced", () => {
    const s = new EntityStore();
    const old = [s.add(mkA()), s.add(mkB()), s.add(mkC())].map((e) => e.id);
    s.replaceAll([mkA(), mkB()]);
    for (const e of s.list()) expect(old).not.toContain(e.id);
  });

  it("accepts an empty list", () => {
    const s = new EntityStore();
    s.add(mkA());
    s.replaceAll([]);
    expect(s.size).toBe(0);
  });

  it("accepts any iterable, not only arrays", () => {
    const s = new EntityStore();
    function* gen() {
      yield mkA();
      yield mkB();
    }
    s.replaceAll(gen());
    expect(s.size).toBe(2);
  });

  it("copies items and does not modify the input", () => {
    const s = new EntityStore();
    const input = mkB();
    s.replaceAll([input]);
    input.items!.push("hacked");
    expect(s.list()[0].items).toStrictEqual(["sword", "apple"]);
    expect(input).not.toHaveProperty("id");
  });
});

// ---------- translateAll ----------

describe("EntityStore.translateAll", () => {
  it("moves every entity and keeps its other fields", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const b = s.add(mkB());
    s.translateAll(10, -1, 100);
    expect(s.get(a.id)).toStrictEqual({ ...mkA(), x: 11, y: 1, z: 103, id: a.id });
    expect(s.get(b.id)).toStrictEqual({ ...mkB(), x: 14, y: 4, z: 106, id: b.id }); // yaw and items kept
  });

  it("announces ONE change event with one update per entity", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    const b = s.add(mkB());
    const c = s.add(mkC());
    const events = watch(s);
    s.translateAll(1, 0, 0);

    const changes = onlyChanges(events);
    expect(changes).toHaveLength(3);
    expect(changes.every((ch) => ch.kind === "update")).toBe(true);
    const befores = changes.map((ch) => (ch.kind === "update" ? ch.before : null));
    expect(befores).toStrictEqual([a, b, c]);
    const afters = changes.map((ch) => (ch.kind === "update" ? ch.after.x : null));
    expect(afters).toStrictEqual([a.x + 1, b.x + 1, c.x + 1]);
  });

  it("does nothing for an empty store", () => {
    const s = new EntityStore();
    const events = watch(s);
    s.translateAll(1, 2, 3);
    expect(events).toHaveLength(0);
  });

  it("does nothing for a zero shift", () => {
    const s = new EntityStore();
    s.add(mkA());
    const before = s.list();
    const events = watch(s);
    s.translateAll(0, 0, 0);
    expect(events).toHaveLength(0);
    expect(s.list()).toBe(before);
  });

  it("replaces the records instead of mutating them", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    s.translateAll(5, 5, 5);
    expect(a).toStrictEqual({ ...mkA(), id: a.id });
  });
});

// ---------- subscribe ----------

describe("EntityStore.subscribe", () => {
  it("calls every listener, in subscription order", () => {
    const s = new EntityStore();
    const calls: string[] = [];
    s.subscribe(() => calls.push("first"));
    s.subscribe(() => calls.push("second"));
    s.add(mkA());
    expect(calls).toStrictEqual(["first", "second"]);
  });

  it("stops calling a listener after unsubscribe, and unsubscribing twice is harmless", () => {
    const s = new EntityStore();
    const events: EntityStoreEvent[] = [];
    const unsubscribe = s.subscribe((e) => events.push(e));
    s.add(mkA());
    unsubscribe();
    unsubscribe();
    s.add(mkB());
    expect(events).toHaveLength(1);
  });

  it("a listener may unsubscribe itself during an event without skipping the others", () => {
    const s = new EntityStore();
    const calls: string[] = [];
    const unsubscribeA = s.subscribe(() => {
      calls.push("A");
      unsubscribeA();
    });
    s.subscribe(() => calls.push("B"));
    s.add(mkA());
    expect(calls).toStrictEqual(["A", "B"]);
    s.add(mkB());
    expect(calls).toStrictEqual(["A", "B", "B"]);
  });

  it("listeners see the new state when they are called", () => {
    const s = new EntityStore();
    let seenSize = -1;
    s.subscribe(() => {
      seenSize = s.size;
    });
    s.add(mkA());
    expect(seenSize).toBe(1);
  });
});

// ---------- immutability (frozen records) ----------
// DECISION: records and their items arrays are frozen when stored.
// Delete this block if you decide not to use Object.freeze.

describe("EntityStore immutability", () => {
  it("freezes stored records and their items", () => {
    const s = new EntityStore();
    const rec = s.add(mkB());
    expect(Object.isFrozen(rec)).toBe(true);
    expect(Object.isFrozen(rec.items)).toBe(true);
  });

  it("freezes records produced by update, translateAll and replaceAll", () => {
    const s = new EntityStore();
    const a = s.add(mkA());
    s.update(a.id, { x: 5 });
    expect(Object.isFrozen(s.get(a.id))).toBe(true);
    s.translateAll(1, 1, 1);
    expect(Object.isFrozen(s.get(a.id))).toBe(true);
    s.replaceAll([mkB()]);
    const fromReplace = s.list()[0];
    expect(Object.isFrozen(fromReplace)).toBe(true);
    expect(Object.isFrozen(fromReplace.items)).toBe(true);
  });

  it("writing to a stored record throws", () => {
    const s = new EntityStore();
    const rec = s.add(mkA());
    expect(() => {
      (rec as { x: number }).x = 99;
    }).toThrow();
  });
});
