import { MapDimensions } from "../components/TerrainEditor";
import { AIR } from "../constants";
import { VoxelGrid } from "../VoxelGrid";
import { NormalizedParams } from "./mapParamNormalizer";
import { makeValueNoise, makeValueNoise3D, mulberry32 } from "./noise";
import { pickWeighted } from "./numbers";
import { getRotatedStructure, Structure } from "./structures";

function generateTerrain(
    mapDimensions: MapDimensions,
    seed: number, 
    normParams:NormalizedParams,
    structures: Structure[],
  ) : {
    grid: VoxelGrid,
    heightMap: Int16Array,
    isWaterMap: Uint8Array,
  }
  {
    const {width, depth, totalHeight} = mapDimensions;
    const rand = mulberry32(seed);
    const noiseCoarse = makeValueNoise(rand, width, depth, 18);
    const noiseFine = makeValueNoise(rand, width, depth, 6);
    const mountainMask = makeValueNoise(rand, width, depth, 40);
    const mountainDetail = makeValueNoise(rand, width, depth, 10);
    const plateauMask = normParams.landscape.plateaus.isEnabled ? makeValueNoise(rand, width, depth, 34) : null;
    const valleyMask = normParams.landscape.valleys.isEnabled ? makeValueNoise(rand, width, depth, 30) : null;
    const valleyDetail = normParams.landscape.valleys.isEnabled ? makeValueNoise(rand, width, depth, 9) : null;
    const riverNoise = normParams.rivers.isEnabled ? makeValueNoise(rand, width, depth, 24) : null;
    const lakeNoise = normParams.lakes.isEnabled ? makeValueNoise(rand, width, depth, 30) : null;
    const forestMask = normParams.veg.trees.isForests ? makeValueNoise(rand, width, depth, 20) : null;
    const islandShapeNoise = normParams.island.isEnabled ? 
      makeValueNoise(rand, width, depth, Math.max(8, Math.max(width, depth) / 3.2)) : null;
    const raggedBottom = normParams.island.isEnabled && normParams.island.isFloating;
    const bottomNoiseCoarse = raggedBottom
      ? makeValueNoise(rand, width, depth, Math.max(8, Math.max(width, depth) / 4))
      : null;
    const bottomNoiseFine = raggedBottom ? makeValueNoise(rand, width, depth, 6) : null;
    const caveNoise = normParams.caves.isEnabled ? 
      makeValueNoise3D(rand, width, totalHeight, depth, 8) : null;

    const islandMarginFactor =
      { small: 0.42, medium: 0.7, large: 0.96 }[normParams.island.size] || 0.96;
    const riverLakeSurfaceH = normParams.island.isFloating
      ? normParams.island.groundDepth + Math.max(1, Math.round(normParams.height.min * 0.6))
      : normParams.water.seaLevel;
    const islandCenters:{
      x:number,
      z:number,
      radius:number
    }[] = [];
    if (normParams.island.isEnabled) {
      if (normParams.island.isArchipelago) {
        const baseRadius =
          (Math.min(width, depth) / 2) * islandMarginFactor / Math.sqrt(normParams.island.islandCount);
        for (let i = 0; i < normParams.island.islandCount; i++) {
          const r = baseRadius * (0.7 + rand() * 0.6);
          const cx = Math.min(width - r, Math.max(r, r + rand() * (width - 2 * r)));
          const cz = Math.min(depth - r, Math.max(r, r + rand() * (depth - 2 * r)));
          islandCenters.push({ x: cx, z: cz, radius: Math.max(r, 1) });
        }
      } else {
        islandCenters.push({
          x: width / 2,
          z: depth / 2,
          radius: Math.max((Math.min(width, depth) / 2) * islandMarginFactor, 1),
        });
      }
    }
    
    const heightMap = new Int16Array(width * depth).fill(0);
    const isWaterMap = new Uint8Array(width * depth);
    const waterBlockMap = new Uint8Array(width * depth).fill(0);
    const falloffMap = raggedBottom ? new Array<number>(width * depth).fill(0) : null;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        let n = normParams.landscape.hills.isEnabled
          ? noiseCoarse(x, z) * (1 - normParams.landscape.hills.strength * 0.5) + noiseFine(x, z) * normParams.landscape.hills.strength
          : noiseCoarse(x, z);

        if (normParams.island.isEnabled) {
          let shapeVar = 1;
          if (islandShapeNoise) {
            shapeVar = 1 + islandShapeNoise(x, z) * normParams.island.irregularity * 1.6;
          }
          let falloff = 0;
          for (const center of islandCenters) {
            const nx = x - center.x + 0.5;
            const nz = z - center.z + 0.5;
            const dist = Math.sqrt(nx * nx + nz * nz) / center.radius;
            const f = Math.max(0, 1 - dist * shapeVar);
            if (f > falloff) falloff = f;
          }
          n *= falloff;
          if (falloffMap) falloffMap[x * depth + z] = falloff;
        }

        let h = Math.floor(normParams.height.min + n * (normParams.height.max - normParams.height.min));

        if (normParams.landscape.mountains.isEnabled) {
          const mask = mountainMask(x, z);
          if (mask > 0.6) {
            const ridged = 1 - Math.abs(mountainDetail(x, z) * 2 - 1);
            const strength = (mask - 0.6) / 0.4;
            h += Math.round(ridged * normParams.landscape.mountains.mountainBoost * strength);
          }
        }

        if (normParams.landscape.plateaus.isEnabled && plateauMask) {
          const mask = plateauMask(x, z);
          if (mask > 0.62) {
            const strength = (mask - 0.62) / 0.38;
            h = Math.round(h * (1 - strength) + normParams.landscape.plateaus.height * strength);
          }
        }

        if (normParams.landscape.valleys.isEnabled && valleyMask) {
          const mask = valleyMask(x, z);
          if (mask > 0.6 && valleyDetail) {
            const ridged = 1 - Math.abs(valleyDetail(x, z) * 2 - 1);
            const strength = (mask - 0.6) / 0.4;
            h -= Math.round(ridged * normParams.landscape.valleys.depth * strength);
          }
        }

        if (h > 0)
          h += normParams.island.groundDepth;

        let isWater = false;
        let waterBlock = normParams.block.surface;
        if (normParams.rivers.isEnabled && riverNoise) {
          const rv = Math.abs(riverNoise(x, z) * 2 - 1);
          if (rv < normParams.rivers.threshold) {
            isWater = true;
            waterBlock = normParams.rivers.block;
            h = Math.min(h, riverLakeSurfaceH);
          }
        }
        if (!isWater && normParams.lakes.isEnabled && lakeNoise) {
          const lk = lakeNoise(x, z);
          if (lk > normParams.lakes.threshold) {
            isWater = true;
            waterBlock = normParams.lakes.block;
            h = Math.min(h, riverLakeSurfaceH);
          }
        }

        const idx = x * depth + z;
        if (h <= 0) {
          heightMap[idx] = 0;
          continue;
        }
        heightMap[idx] = Math.min(h, totalHeight);
        isWaterMap[idx] = isWater ? 1 : 0;
        waterBlockMap[idx] = waterBlock;
      }
    }

    if (normParams.erosion.isEnabled) {
      for (let iter = 0; iter < normParams.erosion.iterations; iter++) {
        const next = heightMap.slice();
        for (let x = 0; x < width; x++) {
          for (let z = 0; z < depth; z++) {
            const idx = x * depth + z;
            const h0 = heightMap[idx];
            if (h0 <= 0 || isWaterMap[idx])
              continue;
            let sum = h0;
            let count = 1;
            const nbrs = [
              [x - 1, z],
              [x + 1, z],
              [x, z - 1],
              [x, z + 1],
            ];
            for (const [nx, nz] of nbrs) {
              if (nx < 0 || nx >= width || nz < 0 || nz >= depth)   
                continue;
              const nIdx = nx * depth + nz;
              const nh = heightMap[nIdx];
              if (nh <= 0 || isWaterMap[nIdx])
                continue;
              sum += nh;
              count++;
            }
            const avg = sum / count;
            next[idx] = Math.max(1, Math.round(h0 + (avg - h0) * normParams.erosion.strength));
          }
        }
        heightMap.set(next);
        /*for (let i = 0; i < next.length; i++)
          heightMap[i] = next[i];*/
      }
    }

    let shoreMap:Uint8Array|null = null;
    if (normParams.shore.isEnabled) {
      shoreMap = new Uint8Array(width * depth);
      const r2 = normParams.shore.radius * normParams.shore.radius;
      const shoreNoise = makeValueNoise(rand, width, depth, Math.max(6, normParams.shore.radius * 4));
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
          const idx = x * depth + z;
          if (heightMap[idx] <= 0 || isWaterMap[idx])
            continue;
          let nearWater = false;
          for (let dx = -normParams.shore.radius; dx <= normParams.shore.radius && !nearWater; dx++) {
            for (let dz = -normParams.shore.radius; dz <= normParams.shore.radius && !nearWater; dz++) {
              if (dx * dx + dz * dz > r2)
                continue;
              const nx = x + dx;
              const nz = z + dz;
              if (nx < 0 || nx >= width || nz < 0 || nz >= depth) 
                continue;
              const nIdx = nx * depth + nz;
              if (isWaterMap[nIdx] || heightMap[nIdx] <= 0) 
                nearWater = true;
            }
          }
          if (nearWater && shoreNoise(x, z) > normParams.shore.threshold)
            shoreMap[idx] = 1;
        }
      }
    }

    // Let the witchcraft commence
    const grid = new VoxelGrid({ width, depth, height: totalHeight })

    // HELPER FUNCTIONS

    // TREES
    
    const plantedTrees:{x: number, z: number}[] = [];

    function canPlantTree(tx: number, tz: number) {
      const spacing2 = normParams.veg.trees.spacing * normParams.veg.trees.spacing;
      for (const p of plantedTrees) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < spacing2)
          return false;
      }
      return true;
    }

    function plantTree(tx: number, groundY: number, tz: number) {
      const trunkHeight = normParams.veg.trees.minH + Math.floor(rand() * (normParams.veg.trees.maxH - normParams.veg.trees.minH + 1));
      const trunkTop = groundY + trunkHeight - 1;
      if (trunkTop + 3 >= totalHeight)
        return;

      for (let ty = 0; ty < trunkHeight; ty++) {
        grid.set(tx, groundY + ty, tz, normParams.veg.trees.woodBlock);
      }

      const layers = [
        { dy: -1, radius: 2 },
        { dy: 0, radius: 2 },
        { dy: 1, radius: 1 },
        { dy: 2, radius: 0 },
      ];
      for (const layer of layers) {
        const ly = trunkTop + layer.dy;
        if (ly < 0 || ly >= totalHeight)
          continue;
        const r = layer.radius;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > r + 0.4)
              continue;
            if (Math.abs(dx) === r && Math.abs(dz) === r && rand() < 0.5)
              continue;
            const lx = tx + dx;
            const lz = tz + dz;
            if (lx < 0 || lx >= width || lz < 0 || lz >= depth)
              continue;
            if (dx === 0 && dz === 0 && ly <= trunkTop)
              continue;
            grid.set(lx, ly, lz, normParams.veg.trees.leavesBlock);
          }
        }
      }
      plantedTrees.push({ x: tx, z: tz });
    }

    // BUSHES

    const plantedBushes:{
      x: number,
      z: number
    }[] = [];

    function canPlantBush(tx: number, tz: number) {
      const spacing2 = normParams.veg.bushes.spacing * normParams.veg.bushes.spacing;
      for (const p of plantedBushes) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < spacing2)
          return false;
      }
      return true;
    }

    function plantBush(tx: number, groundY: number, tz: number) {
      const layers = [
        { dy: 0, radius: 1 },
        { dy: 1, radius: 1 },
      ];
      for (const layer of layers) {
        const ly = groundY + layer.dy;
        if (ly < 0 || ly >= totalHeight) 
          continue;
        const r = layer.radius;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > r + 0.3) 
              continue;
            if (Math.abs(dx) === r && Math.abs(dz) === r && rand() < 0.5) 
              continue;
            const lx = tx + dx;
            const lz = tz + dz;
            if (lx < 0 || lx >= width || lz < 0 || lz >= depth) 
              continue;
            grid.set(lx, ly, lz, normParams.veg.bushes.block);
          }
        }
      }
      plantedBushes.push({ x: tx, z: tz });
    }

    // Generating
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const idx = x * depth + z;
        const height = heightMap[idx];

        if (height <= 0) {
          if (normParams.island.isFloating)
            continue;
          for (let y = 0; y < normParams.water.seaLevel && y < totalHeight; y++) {
            grid.set(x, y, z, normParams.water.seaBlock);
          }
          continue;
        }

        const isWater = !!isWaterMap[idx];
        const waterBlock = waterBlockMap[idx];

        let columnSurfaceBlock = normParams.block.surface;
        if (normParams.altitude.isEnabled) {
          if (height >= normParams.altitude.snowLevel)
            columnSurfaceBlock = normParams.altitude.snowBlock;
          else if (height <= normParams.altitude.beachLevel)
            columnSurfaceBlock = normParams.altitude.beachBlock;
        }
        if (shoreMap && shoreMap[idx] && !isWater) {
          columnSurfaceBlock = normParams.shore.block;
        }

        let bottomY = 0;
        if (raggedBottom && !isWater) {
          if (normParams.island.bottomRoughness > 0 && falloffMap && bottomNoiseCoarse && bottomNoiseFine) {
            const f = falloffMap[idx];
            const bn = bottomNoiseCoarse(x, z) * 0.6 + bottomNoiseFine(x, z) * 0.4;
            bottomY = Math.round(bn * normParams.island.bottomRoughness * f);
          }
          const minBottomForCap = height - normParams.island.maxThickness;
          if (bottomY < minBottomForCap)
            bottomY = minBottomForCap;
          bottomY = Math.max(0, Math.min(bottomY, height - 2));
        }

        for (let y = bottomY; y < height; y++) {
          if (
            caveNoise &&
            y < height - 1 &&
            y > bottomY &&
            caveNoise(x, y, z) > normParams.caves.threshold
          ) {
            if (normParams.caves.isGlow && normParams.caves.glowChance > 0 && rand() < normParams.caves.glowChance) {
              grid.set(x, y, z, normParams.caves.glowBlock);
            }
            continue;
          }
          const isSurface = y === height - 1;
          const block = isSurface ? (isWater ? waterBlock : columnSurfaceBlock) : normParams.block.base;
          grid.set(x, y, z, block);
        }

        const isSubmerged = !normParams.island.isFloating && height < normParams.water.seaLevel;
        if (isSubmerged) {
          for (let y = height; y < normParams.water.seaLevel && y < totalHeight; y++) {
            grid.set(x, y, z, normParams.water.seaBlock);
          }
        }

        let treePlanted = false;
        if (!isWater && !isSubmerged && height < totalHeight && normParams.veg.trees.isEnabled) {
          let effectiveTreeChance = normParams.veg.trees.treeChance;
          if (normParams.veg.trees.isForests && forestMask) {
            effectiveTreeChance = forestMask(x, z) > 0.55 ? normParams.veg.trees.forestDensity : 0;
          }
          if (effectiveTreeChance > 0 && rand() < effectiveTreeChance && canPlantTree(x, z)) {
            plantTree(x, height, z);
            treePlanted = true;
          }
        }

        let bushPlanted = false;
        if (
          !treePlanted &&
          !isWater &&
          !isSubmerged &&
          height < totalHeight &&
          normParams.veg.bushes.isEnabled &&
          normParams.veg.bushes.bushChance > 0 &&
          rand() < normParams.veg.bushes.bushChance &&
          canPlantBush(x, z)
        ) {
          plantBush(x, height, z);
          bushPlanted = true;
        }

        if (
          !treePlanted &&
          !bushPlanted &&
          !isWater &&
          !isSubmerged &&
          height < totalHeight &&
          normParams.deco.weightedList.length
        ) {
          if (normParams.deco.chance > 0 && rand() < normParams.deco.chance) {
            const pick = pickWeighted(normParams.deco.weightedList, rand);
            grid.set(x, height, z, pick);
          }
        }
      }
    }

    // WATERFALLS
    if (normParams.rivers.isWaterfallEnabled && normParams.rivers.isEnabled) {
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
          const idx = x * depth + z;
          if (!isWaterMap[idx] || waterBlockMap[idx] !== normParams.rivers.block) 
            continue;
          const riverH = heightMap[idx];
          const nbrs: [number, number][] = [
            [x - 1, z],
            [x + 1, z],
            [x, z - 1],
            [x, z + 1],
          ];
          for (const [nx, nz] of nbrs) {
            if (nx < 0 || nx >= width || nz < 0 || nz >= depth) 
              continue;
            const nIdx = nx * depth + nz;
            if (isWaterMap[nIdx]) 
              continue;
            const nH = heightMap[nIdx];
            if (nH <= 0) 
              continue;
            if (riverH - nH >= normParams.rivers.waterfallDropThreshold) {
              for (let y = nH; y < riverH && y < totalHeight; y++) {
                grid.set(nx, y, nz, normParams.rivers.block);
              }
            }
          }
        }
      }
    }

    // ORES
    if (normParams.ore.isEnabled && normParams.ore.blockList.length && normParams.ore.countScaled > 0) {
      function placeOreBlob(cx: number, cy: number, cz: number, oreBlock: number, r: number) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dz = -r; dz <= r; dz++) {
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 > r * r + rand() * 1.5) 
                continue;
              if (rand() < 0.3) 
                continue;
              const wx = cx + dx;
              const wy = cy + dy;
              const wz = cz + dz;
              if (wx < 0 || wx >= width || wy < 0 || wy >= totalHeight || wz < 0 || wz >= depth)
                continue;
              if (grid.getBlock(wx, wy, wz) === AIR) 
                continue;
              grid.set(wx, wy, wz, oreBlock);
            }
          }
        }
      }

      for (let i = 0; i < normParams.ore.countScaled; i++) {
        const ox = Math.floor(rand() * width);
        const oz = Math.floor(rand() * depth);
        const colH = heightMap[ox * depth + oz];
        if (colH < 3) 
          continue;
        const maxY = Math.min(colH - 2, normParams.island.groundDepth - 1);
        if (maxY < 1) 
          continue;
        const oy = 1 + Math.floor(rand() * maxY);
        const oreBlock = normParams.ore.blockList[Math.floor(rand() * normParams.ore.blockList.length)];

        if (rand() < normParams.ore.bigVeinChance) {
          // rare jackpot: a chain of overlapping blobs forming one large,
          // irregular deposit instead of a single small vein
          const blobCount = 3 + Math.floor(rand() * 4);
          let cx = ox;
          let cy = oy;
          let cz = oz;
          for (let b = 0; b < blobCount; b++) {
            placeOreBlob(cx, cy, cz, oreBlock, normParams.ore.bigVeinSize);
            cx = Math.max(
              0,
              Math.min(width - 1, cx + Math.round((rand() - 0.5) * normParams.ore.bigVeinSize))
            );
            cy = Math.max(
              1,
              Math.min(maxY, cy + Math.round((rand() - 0.5) * normParams.ore.bigVeinSize * 0.6))
            );
            cz = Math.max(
              0,
              Math.min(depth - 1, cz + Math.round((rand() - 0.5) * normParams.ore.bigVeinSize))
            );
          }
        } else {
          placeOreBlob(ox, oy, oz, oreBlock, normParams.ore.bigVeinSize);
        }
      }
    }

    // STRUCTURES
    const enabledStructures = structures.filter((s) => s.enabled && s.count > 0);
    if (enabledStructures.length) {
      const placedBoxes:{x0: number, x1: number, z0: number, z1: number}[] = [];
      for (const st of enabledStructures) {
        const spacing = Math.max(0, Number(st.minSpacing) || 0);
        for (let attempt = 0; attempt < st.count; attempt++) {
          let placed = false;
          for (let retry = 0; retry < 25 && !placed; retry++) {
            const rotSteps = st.rotate ? Math.floor(rand() * 4) : 0;
            const rotated = getRotatedStructure(st, rotSteps);
            const sx = rotated.sizeX;
            const sz = rotated.sizeZ;
            const ax = Math.floor(rand() * Math.max(1, width - sx));
            const az = Math.floor(rand() * Math.max(1, depth - sz));
            const surfaceH = heightMap[ax * depth + az];
            if (surfaceH <= 0)
              continue;

            if (st.requireFlat) {
              let minH2 = surfaceH;
              let maxH2 = surfaceH;
              const step = Math.max(1, Math.floor(Math.min(sx, sz) / 4));
              let flatOk = true;
              for (let cx = 0; cx < sx && flatOk; cx += step) {
                for (let cz = 0; cz < sz && flatOk; cz += step) {
                  const hh = heightMap[ 
                    Math.min(width - 1, ax + cx) * depth + Math.min(depth - 1, az + cz) 
                  ];
                  if (hh <= 0) {
                    flatOk = false;
                    break;
                  }
                  if (hh < minH2) 
                    minH2 = hh;
                  if (hh > maxH2) 
                    maxH2 = hh;
                  if (maxH2 - minH2 > 2) {
                    flatOk = false;
                    break;
                  }
                }
              }
              if (!flatOk) 
                continue;
            }

            const ay = surfaceH;
            if (ay + rotated.sizeY > totalHeight) 
              continue;

            const box = {
              x0: ax - spacing,
              x1: ax + sx + spacing,
              z0: az - spacing,
              z1: az + sz + spacing,
            };
            const overlaps = placedBoxes.some(
              (b) => !(box.x1 <= b.x0 || box.x0 >= b.x1 || box.z1 <= b.z0 || box.z0 >= b.z1)
            );
            if (overlaps) 
              continue;

            for (const v of rotated.voxels) {
              const wx = ax + v.x;
              const wy = ay + v.y;
              const wz = az + v.z;
              if (wx < 0 || wx >= width || wy < 0 || wy >= totalHeight || wz < 0 || wz >= depth)
                continue;
              grid.set(wx, wy, wz, v.block, v.meta || 0);
            }
            placedBoxes.push({ x0: ax, x1: ax + sx, z0: az, z1: az + sz });
            placed = true;
          }
        }
      }
    }

    return {
      grid,
      heightMap,
      isWaterMap,
    }
  }

  export {
    generateTerrain,
  }
