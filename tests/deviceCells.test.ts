import { describe, expect, expectTypeOf, it } from "vitest";
import { deviceCells } from "../src/data";

describe("deviceCells shape", () => {
  it("is a non-empty plain object (POJO)", () => {
    expect(typeof deviceCells).toBe("object");
    expect(Array.isArray(deviceCells)).toBe(false);
    expect(Object.keys(deviceCells).length).toBeGreaterThan(0);
  });

  it("has only valid footprints of [x,y,z]", () => {
    const problems: string[] = [];
    // cast to unknown is intentional to suppress TS inferring types. No peeking!
    for (const [name, cells] of Object.entries(deviceCells) as [string, unknown][]) {
      if (!Array.isArray(cells)) {
        problems.push(`${name}: not an array`);
        continue;
      }
      if (cells.length === 0)
        problems.push(`${name}: empty footprint`);
      const seen = new Set<string>();
      cells.forEach((cell: unknown, i) => {
        if (!Array.isArray(cell) || cell.length !== 3 || !cell.every((c) => Number.isInteger(c))) {
          problems.push(`${name}[${i}]: not an array of three integers`);
          return;
        }
        const key = cell.join(",");
        if (seen.has(key))
          problems.push(`${name}[${i}]: repeats cell ${key} in the same footprint`);
        seen.add(key);
      });
    }
    expect(problems).toStrictEqual([]);
  });
});
