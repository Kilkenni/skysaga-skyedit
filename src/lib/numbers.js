import { AIR } from "../constants";

export function clamp(v, min, max) {
  v = Number(v);
  if (isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function parseIdList(str) {
  if (!str) return [];
  return String(str)
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < AIR);
}

export function parseWeightedIdList(str) {
  if (!str) return [];
  return String(str)
    .split(/[,\s]+/)
    .map((s) => {
      const parts = s.split(":");
      const id = parseInt(parts[0], 10);
      if (!Number.isInteger(id) || id < 0 || id >= AIR) return null;
      const weight = parts[1] ? parseFloat(parts[1]) : 1;
      return { id, weight: weight > 0 ? weight : 1 };
    })
    .filter(Boolean);
}

export function pickWeighted(list, randFn) {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = randFn() * total;
  for (const e of list) {
    if (r < e.weight) return e.id;
    r -= e.weight;
  }
  return list[list.length - 1].id;
}
