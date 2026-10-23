import { AIR } from "../constants";

function clamp(v:string|number, min:number, max:number):number {
  v = Number(v);
  if (isNaN(v))
    return min;
  return Math.max(min, Math.min(max, v));
}

function parseIdList(str: string):number[] {
  if (!str)
    return [];
  const res = String(str)
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < AIR);
  return res;
}

type WeightedList = {
  id: number,
  weight: number
}[];

function parseWeightedIdList(str: string):WeightedList {
  if (!str) return [];
  const res = String(str)
    .split(/[,\s]+/)
    .map((s) => {
      const parts = s.split(":");
      const id = parseInt(parts[0], 10);
      if (!Number.isInteger(id) || id < 0 || id >= AIR) 
        return null;
      const weight = parts[1] ? parseFloat(parts[1]) : 1;
      return { id, weight: weight > 0 ? weight : 1 };
    })
    .filter(Boolean);
  return res.filter((elem) => elem !== null);
}

function pickWeighted(list: WeightedList, randFn:()=> number) {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = randFn() * total;
  for (const elem of list) {
    if (r < elem.weight) return elem.id;
    r -= elem.weight;
  }
  return list[list.length - 1].id;
}

export {
  clamp,
  WeightedList,
  parseIdList,
  parseWeightedIdList,
  pickWeighted
}
