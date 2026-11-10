import { AIR } from "../src/constants";
import { describe, it, expect } from "vitest";
import { VoxelStore } from "../src/lib/VoxelStore";

const store = new VoxelStore();
store.transaction((t) => {
  t.set(1, 5, 1, 0); // Dirt block
  t.set(1, 4, 1, 0); // Dirt block
  t.set(1, 3, 1, 0); // Dirt block
  t.set(1, 1, 1, 0); // Dirt block, with a gap over it
  t.set(1, 5, 2, AIR); // AIR block
  t.set(1, 100, 3, 0); // Dirt block, very high
})


describe("VoxelStore surfaceY", () => {
  it("gives -1 for empty column", () => {
    expect(store.surfaceY(1, 10, 10)).toStrictEqual(-1);
    expect(store.surfaceY(1, 2, 10)).toStrictEqual(-1);
  });
  it("gives top block for non-empty column", () => {
    expect(store.surfaceY(1, 1, 10)).toStrictEqual(5);
  });
  it("ignores the blocks above fromY limit", () => {
    expect(store.surfaceY(1, 3, 10)).toStrictEqual(-1);
    expect(store.surfaceY(1,1,5)).toStrictEqual(5);
    expect(store.surfaceY(1,1,4)).toStrictEqual(4);
    expect(store.surfaceY(1,1,2)).toStrictEqual(1); // mind the gap
  });
});
