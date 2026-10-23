function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let tt = Math.imul(s ^ (s >>> 15), 1 | s);
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
  };
}

function makeValueNoise(rand:()=>number, w:number, d:number, cellSize:number) {
  const gw = Math.ceil(w / cellSize) + 2;
  const gd = Math.ceil(d / cellSize) + 2;
  const grid = new Array(gw * gd);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  return function (x, z) {
    const gx = x / cellSize;
    const gz = z / cellSize;
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    const tx = gx - x0;
    const tz = gz - z0;
    const v00 = grid[z0 * gw + x0];
    const v10 = grid[z0 * gw + x1];
    const v01 = grid[z1 * gw + x0];
    const v11 = grid[z1 * gw + x1];
    const sx = tx * tx * (3 - 2 * tx);
    const sz = tz * tz * (3 - 2 * tz);
    const a = v00 + (v10 - v00) * sx;
    const b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sz;
  };
}

function makeValueNoise3D(rand:()=>number, w:number, h:number, d:number, cellSize: number) {
  const gw = Math.ceil(w / cellSize) + 2;
  const gh = Math.ceil(h / cellSize) + 2;
  const gd = Math.ceil(d / cellSize) + 2;
  const grid = new Array(gw * gh * gd);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const idx = (xx, yy, zz) => zz * gw * gh + yy * gw + xx;
  return function (x, y, z) {
    const gx = x / cellSize;
    const gy = y / cellSize;
    const gz = z / cellSize;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const z0 = Math.floor(gz);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const z1 = z0 + 1;
    const tx = gx - x0;
    const ty = gy - y0;
    const tz = gz - z0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const sz = tz * tz * (3 - 2 * tz);
    const c000 = grid[idx(x0, y0, z0)];
    const c100 = grid[idx(x1, y0, z0)];
    const c010 = grid[idx(x0, y1, z0)];
    const c110 = grid[idx(x1, y1, z0)];
    const c001 = grid[idx(x0, y0, z1)];
    const c101 = grid[idx(x1, y0, z1)];
    const c011 = grid[idx(x0, y1, z1)];
    const c111 = grid[idx(x1, y1, z1)];
    const c00 = c000 + (c100 - c000) * sx;
    const c10 = c010 + (c110 - c010) * sx;
    const c01 = c001 + (c101 - c001) * sx;
    const c11 = c011 + (c111 - c011) * sx;
    const c0 = c00 + (c10 - c00) * sy;
    const c1 = c01 + (c11 - c01) * sy;
    return c0 + (c1 - c0) * sz;
  };
}

export {
  mulberry32,
  makeValueNoise,
  makeValueNoise3D
}
