import { clamp, clampBlockId, parseIdList, parseWeightedIdList, WeightedList } from "./numbers";

interface RngParams {
  randMinH: number,
  randMaxH: number,

  randGroundDepth: number,
  randBaseBlock: number,
  randSurfaceBlock: number, // block ID
  randDecoBlocks: string, // id:weight
  randDecoChance: number,

  randIsland: boolean,
  randIslandMode: string, // todo enum "floating"
  randIslandSize: string, // todo enum "large"
  randIslandIrregularity: number,
  randBottomRoughness: number,
  randMaxThickness: number,

  randArchipelago: boolean,
  randIslandCount: number,

  randSeaLevel: number,
  randSeaBlock: number,
  
  randHills: boolean,
  randHillStrength: number, // %
  randMountains: boolean,
  randMountainHeight: number,
  randPlateaus: boolean,
  randPlateauHeight: number,
  randValleys: boolean,
  randValleyDepth: number,

  randRivers: boolean,
  randRiverBlock: number,
  randRiverWidth: number,
  randWaterfalls: boolean,
  randWaterfallDrop: number, // threshold

  randLakes: boolean,
  randLakeBlock: number,
  randLakeSize: number,

  randCaves: boolean,
  randCaveDensity: number, // %
  randCaveGlow: boolean,
  randCaveGlowChance: number,
  randCaveGlowBlock: number, // block ID

  randTrees: boolean,
  randTreeDensity: number,
  randTreeMinHeight: number,
  randTreeMaxHeight: number,
  randTreeWoodBlock: number,
  randTreeLeavesBlock: number,
  randTreeSpacing: number,
  randForests: boolean, // cluster into patches
  randForestDensity: number,

  randBushes: boolean,
  randBushDensity: number,
  randBushBlock: number,
  randBushSpacing: number,

  randAltitudeBlocks: boolean,
  randBeachLevel: number,
  randBeachBlock: number, // block ID
  randSnowLevel: number,
  randSnowBlock: number, // block ID

  randSmoothShore: boolean,
  randShoreRadius: number,
  randShoreBlock: number,
  randShoreCoverage: number, // in  %

  randOres: boolean,
  randOreBlocks: string, // IDs separated by comma
  randOreCount: number, // vein count
  randOreVeinSize: number,
  randOreBigChance: number, // big cluster change, %
  randOreBigSize: number,

  randErosion: boolean,
  randErosionStrength: number,
  randErosionIterations: number,
}

interface NormalizedParams {
  block: {
    base: number,
    surface: number,
  },
  island: {
    isEnabled: boolean,
    isArchipelago: boolean,
    islandCount: number,
    isFloating: boolean,
    groundDepth: number,
    bottomRoughness: number,
    maxThickness: number,
    irregularity: number,
    marginFactor: number,
  },
  height: {
    min: number,
    max: number,
  },
  landscape: {
    hills: {
      isEnabled: boolean;
      strength: number,
    },
    mountains: {
      isEnabled: boolean,
      mountainBoost: number,
    },
    plateaus: {
      isEnabled: boolean,
      height: number,
    },
    valleys: {
      isEnabled: boolean,
      depth: number, 
    }
  },
  altitude: {
    isEnabled: boolean,
    beachLevel: number,
    snowLevel: number,
    beachBlock: number,
    snowBlock: number,
  },
  erosion: {
    isEnabled: boolean,
    strength: number,
    iterations: number,
  }
  water: {
    riverLakeSurfaceH: number,
    seaLevel: number,
    seaBlock: number,
  },
  river: {
    isEnabled: boolean,
    threshold: number,
    isWaterfallEnabled: boolean,
    waterfallDropThreshold: number,
    block: number,
  },
  lake: {
    isEnabled: boolean,
    threshold: number,
    block: number,
  },
  shore: { // shore smoothing
    isEnabled: boolean,
    radius: number,
    threshold: number,
    block: number,
  },
  cave: {
    isEnabled: boolean,
    threshold: number,
    isGlow: boolean,
    glowChance: number,
    glowBlock: number,
  },
  vegetation: {
    trees: {
      isEnabled: boolean,
      isForests: boolean,
      forestDensity: number,
      treeChance: number,
      minH: number,
      maxH: number,
      spacing: number,
      woodBlock: number,
      leavesBlock: number,
    },
    bushes: {
      isEnabled: boolean,
      bushChance: number,
      spacing: number,
      block: number,
    }
  },
  deco: {
    weightedList: WeightedList,
    chance: number,
  }
  ore: {
    isEnabled: boolean,
    blockList: number[],
    countScaled: number,
    veinR: number,
    bigChance: number,
    bigVeinR: number,
  }
}

function normalizeRngParameters(params:RngParams, width: number, depth: number, totalHeight: number):NormalizedParams {
  const minH = clamp(params.randMinH, 0, totalHeight);
  const isFloating = params.randIslandMode !== "island";
  const groundDepth = clamp(params.randGroundDepth, 0, totalHeight);
  const seaLevel = clamp(params.randSeaLevel, 0, totalHeight);
  const treeMinH = clamp(params.randTreeMinHeight, 1, 20);

  const normalizedParams:NormalizedParams = {
    block: {
      base: clampBlockId(params.randBaseBlock),
      surface: clampBlockId(params.randSurfaceBlock),
    },
    island: {
      isEnabled: params.randIsland,
      isArchipelago: params.randArchipelago,
      islandCount: clamp(params.randIslandCount, 1, 8),
      isFloating: isFloating,
      groundDepth: groundDepth,
      bottomRoughness: clamp(params.randBottomRoughness, 0, totalHeight),
      maxThickness: clamp(params.randMaxThickness, 1, totalHeight),
      irregularity: clamp(params.randIslandIrregularity, 0, 100) / 100,
      marginFactor: { small: 0.42, medium: 0.7, large: 0.96 }[params.randIslandSize] || 0.96,
    },
    height: {
      min: minH,
      max: clamp(params.randMaxH, minH, totalHeight),
    },
    landscape: {
      hills: {
        isEnabled: params.randHills,
        strength: clamp(params.randHillStrength, 0, 100) / 100,
      },
      mountains: {
        isEnabled: params.randMountains,
        mountainBoost: clamp(params.randMountainHeight, 0, totalHeight),
      },
      plateaus: {
        isEnabled: params.randPlateaus,
        height: clamp(params.randPlateauHeight, 1, totalHeight),
      },
      valleys: {
        isEnabled: params.randValleys,
        depth: clamp(params.randValleyDepth, 1, totalHeight), 
      }
    },
    altitude: {
      isEnabled: params.randAltitudeBlocks,
      beachLevel: clamp(params.randBeachLevel, 0, totalHeight),
      beachBlock: clampBlockId(params.randBeachBlock),
      snowLevel: clamp(params.randSnowLevel, 0, totalHeight),
      snowBlock: clampBlockId(params.randSnowBlock),
    },
    erosion: {
      isEnabled: params.randErosion,
      strength: clamp(params.randErosionStrength, 0, 100) / 100,
      iterations: clamp(params.randErosionIterations, 1, 5),
    },
    water: {
      riverLakeSurfaceH: isFloating
        ? groundDepth + Math.max(1, Math.round(minH * 0.6))
        : seaLevel,
      seaLevel: seaLevel,
      seaBlock: clampBlockId(params.randSeaBlock),
    },
    river: {
      isEnabled: params.randRivers,
      threshold: clamp(params.randRiverWidth, 1, 40) / 100,
      isWaterfallEnabled: params.randWaterfalls,
      waterfallDropThreshold: clamp(params.randWaterfallDrop, 2, 30),
      block: clampBlockId(params.randRiverBlock),
    },
    lake: {
      isEnabled: params.randLakes,
      threshold: 1 - clamp(params.randLakeSize, 1, 10) / 12,
      block: clampBlockId(params.randLakeBlock),
    },
    shore: { // shore smoothing
      isEnabled: params.randSmoothShore,
      radius: clamp(params.randShoreRadius, 1, 5),
      threshold: 1 - clamp(params.randShoreCoverage, 0, 100) / 100,
      block: clampBlockId(params.randShoreBlock),
    },
    cave: {
      isEnabled: params.randCaves,
      threshold: 1 - clamp(params.randCaveDensity, 0, 100) / 100,
      isGlow: params.randCaveGlow && params.randCaves,
      glowChance: clamp(params.randCaveGlowChance, 0, 100) / 100,
      glowBlock: clampBlockId(params.randCaveGlowBlock),
    },
    vegetation: {
      trees: {
        isEnabled: params.randTrees,
        isForests: params.randForests,
        forestDensity: clamp(params.randForestDensity, 0, 100) / 100,
        treeChance: clamp(params.randTreeDensity, 0, 100) / 100,
        minH: treeMinH,
        maxH: clamp(params.randTreeMaxHeight, treeMinH, 20),
        spacing: clamp(params.randTreeSpacing, 0, 20),
        woodBlock: clampBlockId(params.randTreeWoodBlock),
        leavesBlock: clampBlockId(params.randTreeLeavesBlock),
      },
      bushes: {
        isEnabled: params.randBushes,
        bushChance: clamp(params.randBushDensity, 0, 100) / 100,
        spacing: clamp(params.randBushSpacing, 0, 10),
        block: clampBlockId(params.randBushBlock),
      }
    },
    deco: {
      weightedList: parseWeightedIdList(params.randDecoBlocks),
      chance: clamp(params.randDecoChance, 0, 100) / 100,
    },
    ore: {
      isEnabled: params.randOres,
      blockList: parseIdList(params.randOreBlocks),
      countScaled: Math.round(clamp(params.randOreCount, 0, 500) * ((width * depth) / (128 * 128))),
      veinR: clamp(params.randOreVeinSize, 1, 5),
      bigChance: clamp(params.randOreBigChance, 0, 100) / 100,
      bigVeinR: clamp(params.randOreBigSize, 1, 10),
    }
  };

  return normalizedParams;
}

/*
function generateRandomTerrain(params:RngParams) {
    const seedVal = Number(randSeed) || Math.floor(Math.random() * 1e9);
    const rand = mulberry32(seedVal);
    const noiseCoarse = makeValueNoise(rand, width, depth, 18);
    const noiseFine = makeValueNoise(rand, width, depth, 6);
    const mountainMask = makeValueNoise(rand, width, depth, 40);
    const mountainDetail = makeValueNoise(rand, width, depth, 10);
    const plateauMask = params.randPlateaus ? makeValueNoise(rand, width, depth, 34) : null;
    const valleyMask = params.randValleys ? makeValueNoise(rand, width, depth, 30) : null;
    const valleyDetail = params.randValleys ? makeValueNoise(rand, width, depth, 9) : null;
    const riverNoise = params.randRivers ? makeValueNoise(rand, width, depth, 24) : null;
    const lakeNoise = params.randLakes ? makeValueNoise(rand, width, depth, 30) : null;
    const forestMask = params.randForests ? makeValueNoise(rand, width, depth, 20) : null;
    const islandShapeNoise = params.randIsland ? 
      makeValueNoise(rand, width, depth, Math.max(8, Math.max(width, depth) / 3.2)) : null;
    const raggedBottom = params.randIsland && params.randIslandMode !== "island";
    const bottomNoiseCoarse = raggedBottom
      ? makeValueNoise(rand, width, depth, Math.max(8, Math.max(width, depth) / 4))
      : null;
    const bottomNoiseFine = raggedBottom ? makeValueNoise(rand, width, depth, 6) : null;
    const caveNoise = params.randCaves ? 
      makeValueNoise3D(rand, width, totalHeight, depth, 8) : null;

    const islandCenters:{
      x:number,
      z:number,
      radius:number
    }[] = [];
    if (params.randIsland) {
      if (params.randArchipelago) {
        const baseRadius =
          (Math.min(width, depth) / 2) * islandMarginFactor / Math.sqrt(count);
        for (let i = 0; i < count; i++) {
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
    
    const plantedTrees:{x,z}[] = [];

    function canPlantTree(tx: number, tz: number) {
      const spacing2 = treeSpacing * treeSpacing;
      for (const p of plantedTrees) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < spacing2) return false;
      }
      return true;
    }

    function plantTree(tx: number, groundY: number, tz: number) {
      const trunkHeight = treeMinH + Math.floor(rand() * (treeMaxH - treeMinH + 1));
      const trunkTop = groundY + trunkHeight - 1;
      if (trunkTop + 3 >= totalHeight) return;

      for (let ty = 0; ty < trunkHeight; ty++) {
        setVoxel(tx, groundY + ty, tz, treeWood, 0, true);
      }

      const layers = [
        { dy: -1, radius: 2 },
        { dy: 0, radius: 2 },
        { dy: 1, radius: 1 },
        { dy: 2, radius: 0 },
      ];
      for (const layer of layers) {
        const ly = trunkTop + layer.dy;
        if (ly < 0 || ly >= totalHeight) continue;
        const r = layer.radius;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > r + 0.4) continue;
            if (Math.abs(dx) === r && Math.abs(dz) === r && rand() < 0.5) continue;
            const lx = tx + dx;
            const lz = tz + dz;
            if (lx < 0 || lx >= width || lz < 0 || lz >= depth) continue;
            if (dx === 0 && dz === 0 && ly <= trunkTop) continue;
            setVoxel(lx, ly, lz, treeLeaves, 0, true);
          }
        }
      }
      plantedTrees.push({ x: tx, z: tz });
    }

    const plantedBushes:{
      x: number,
      z: number
    }[] = [];

    function canPlantBush(tx: number, tz: number) {
      const spacing2 = bushSpacing * bushSpacing;
      for (const p of plantedBushes) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < spacing2) return false;
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
        if (ly < 0 || ly >= totalHeight) continue;
        const r = layer.radius;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > r + 0.3) continue;
            if (Math.abs(dx) === r && Math.abs(dz) === r && rand() < 0.5) continue;
            const lx = tx + dx;
            const lz = tz + dz;
            if (lx < 0 || lx >= width || lz < 0 || lz >= depth) continue;
            setVoxel(lx, ly, lz, bushBlock, 0, true);
          }
        }
      }
      plantedBushes.push({ x: tx, z: tz });
    }

    beginStroke();

    for (const voxel of Array.from(terrain.cells())) {
      setVoxel(voxel.x, voxel.y, voxel.z, AIR, 0, true);
    }

    const heightMap = new Array(width * depth).fill(0);
    const isWaterMap = new Uint8Array(width * depth);
    const waterBlockMap = new Array(width * depth).fill(0);
    const falloffMap = raggedBottom ? new Array(width * depth).fill(0) : null;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        let n = params.randHills
          ? noiseCoarse(x, z) * (1 - hillStrength * 0.5) + noiseFine(x, z) * hillStrength
          : noiseCoarse(x, z);

        if (params.randIsland) {
          let shapeVar = 1;
          if (islandShapeNoise) {
            shapeVar = 1 + islandShapeNoise(x, z) * islandIrregularity * 1.6;
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

        let h = Math.floor(minH + n * (maxH - minH));

        if (params.randMountains) {
          const mask = mountainMask(x, z);
          if (mask > 0.6) {
            const ridged = 1 - Math.abs(mountainDetail(x, z) * 2 - 1);
            const strength = (mask - 0.6) / 0.4;
            h += Math.round(ridged * mountainBoost * strength);
          }
        }

        if (params.randPlateaus && plateauMask) {
          const mask = plateauMask(x, z);
          if (mask > 0.62) {
            const strength = (mask - 0.62) / 0.38;
            h = Math.round(h * (1 - strength) + plateauHeight * strength);
          }
        }

        if (params.randValleys && valleyMask) {
          const mask = valleyMask(x, z);
          if (mask > 0.6 && valleyDetail) {
            const ridged = 1 - Math.abs(valleyDetail(x, z) * 2 - 1);
            const strength = (mask - 0.6) / 0.4;
            h -= Math.round(ridged * valleyDepth * strength);
          }
        }

        if (h > 0) h += groundDepth;

        let isWater = false;
        let waterBlock = surfaceBlock;
        if (params.randRivers && riverNoise) {
          const rv = Math.abs(riverNoise(x, z) * 2 - 1);
          if (rv < riverThreshold) {
            isWater = true;
            waterBlock = riverBlock;
            h = Math.min(h, riverLakeSurfaceH);
          }
        }
        if (!isWater && params.randLakes && lakeNoise) {
          const lk = lakeNoise(x, z);
          if (lk > lakeThreshold) {
            isWater = true;
            waterBlock = lakeBlock;
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

    if (params.randErosion) {
      for (let iter = 0; iter < erosionIterations; iter++) {
        const next = heightMap.slice();
        for (let x = 0; x < width; x++) {
          for (let z = 0; z < depth; z++) {
            const idx = x * depth + z;
            const h0 = heightMap[idx];
            if (h0 <= 0 || isWaterMap[idx]) continue;
            let sum = h0;
            let count = 1;
            const nbrs = [
              [x - 1, z],
              [x + 1, z],
              [x, z - 1],
              [x, z + 1],
            ];
            for (const [nx, nz] of nbrs) {
              if (nx < 0 || nx >= width || nz < 0 || nz >= depth) continue;
              const nIdx = nx * depth + nz;
              const nh = heightMap[nIdx];
              if (nh <= 0 || isWaterMap[nIdx]) continue;
              sum += nh;
              count++;
            }
            const avg = sum / count;
            next[idx] = Math.max(1, Math.round(h0 + (avg - h0) * erosionStrength));
          }
        }
        for (let i = 0; i < next.length; i++) heightMap[i] = next[i];
      }
    }

    let shoreMap:Uint8Array|null = null;
    if (params.randSmoothShore) {
      shoreMap = new Uint8Array(width * depth);
      const r2 = shoreRadius * shoreRadius;
      const shoreNoise = makeValueNoise(rand, width, depth, Math.max(6, shoreRadius * 4));

      for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
          const idx = x * depth + z;
          if (heightMap[idx] <= 0 || isWaterMap[idx]) continue;
          let nearWater = false;
          for (let dx = -shoreRadius; dx <= shoreRadius && !nearWater; dx++) {
            for (let dz = -shoreRadius; dz <= shoreRadius && !nearWater; dz++) {
              if (dx * dx + dz * dz > r2) continue;
              const nx = x + dx;
              const nz = z + dz;
              if (nx < 0 || nx >= width || nz < 0 || nz >= depth) continue;
              const nIdx = nx * depth + nz;
              if (isWaterMap[nIdx] || heightMap[nIdx] <= 0) nearWater = true;
            }
          }
          if (nearWater && shoreNoise(x, z) > shoreThreshold) shoreMap[idx] = 1;
        }
      }
    }

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const idx = x * depth + z;
        const height = heightMap[idx];

        if (height <= 0) {
          if (isFloatingIsland) continue;
          for (let y = 0; y < seaLevel && y < totalHeight; y++) {
            setVoxel(x, y, z, seaBlock, 0, true);
          }
          continue;
        }

        const isWater = !!isWaterMap[idx];
        const waterBlock = waterBlockMap[idx];

        let columnSurfaceBlock = surfaceBlock;
        if (altitudeOn) {
          if (height >= snowLevel) columnSurfaceBlock = snowBlock;
          else if (height <= beachLevel) columnSurfaceBlock = beachBlock;
        }
        if (shoreMap && shoreMap[idx] && !isWater) {
          columnSurfaceBlock = shoreBlock;
        }

        let bottomY = 0;
        if (raggedBottom && !isWater) {
          if (bottomRoughness > 0 && falloffMap && bottomNoiseCoarse && bottomNoiseFine) {
            const f = falloffMap[idx];
            const bn = bottomNoiseCoarse(x, z) * 0.6 + bottomNoiseFine(x, z) * 0.4;
            bottomY = Math.round(bn * bottomRoughness * f);
          }
          const minBottomForCap = height - maxThickness;
          if (bottomY < minBottomForCap) bottomY = minBottomForCap;
          bottomY = Math.max(0, Math.min(bottomY, height - 2));
        }

        for (let y = bottomY; y < height; y++) {
          if (
            caveNoise &&
            y < height - 1 &&
            y > bottomY &&
            caveNoise(x, y, z) > caveThreshold
          ) {
            if (caveGlowOn && caveGlowChance > 0 && rand() < caveGlowChance) {
              setVoxel(x, y, z, caveGlowBlock, 0, true);
            }
            continue;
          }
          const isSurface = y === height - 1;
          const block = isSurface ? (isWater ? waterBlock : columnSurfaceBlock) : baseBlock;
          setVoxel(x, y, z, block, 0, true);
        }

        const isSubmerged = !isFloatingIsland && height < seaLevel;
        if (isSubmerged) {
          for (let y = height; y < seaLevel && y < totalHeight; y++) {
            setVoxel(x, y, z, seaBlock, 0, true);
          }
        }

        let treePlanted = false;
        if (!isWater && !isSubmerged && height < totalHeight && params.randTrees) {
          let effectiveTreeChance = treeChance;
          if (params.randForests && forestMask) {
            effectiveTreeChance = forestMask(x, z) > 0.55 ? forestDensity : 0;
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
          params.randBushes &&
          bushChance > 0 &&
          rand() < bushChance &&
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
          decoWeightedList.length
        ) {
          if (decoChance > 0 && rand() < decoChance) {
            const pick = pickWeighted(decoWeightedList, rand);
            setVoxel(x, height, z, pick, 0, true);
          }
        }
      }
    }

    if (params.randWaterfalls && params.randRivers) {
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
          const idx = x * depth + z;
          if (!isWaterMap[idx] || waterBlockMap[idx] !== riverBlock) continue;
          const riverH = heightMap[idx];
          const nbrs = [
            [x - 1, z],
            [x + 1, z],
            [x, z - 1],
            [x, z + 1],
          ];
          for (const [nx, nz] of nbrs) {
            if (nx < 0 || nx >= width || nz < 0 || nz >= depth) continue;
            const nIdx = nx * depth + nz;
            if (isWaterMap[nIdx]) continue;
            const nH = heightMap[nIdx];
            if (nH <= 0) continue;
            if (riverH - nH >= dropThreshold) {
              for (let y = nH; y < riverH && y < totalHeight; y++) {
                setVoxel(nx, y, nz, riverBlock, 0, true);
              }
            }
          }
        }
      }
    }

    if (oresOn && oreBlockList.length && oreCountScaled > 0) {
      function placeOreBlob(cx: number, cy: number, cz: number, oreBlock, r) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dz = -r; dz <= r; dz++) {
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 > r * r + rand() * 1.5) continue;
              if (rand() < 0.3) continue;
              const wx = cx + dx;
              const wy = cy + dy;
              const wz = cz + dz;
              if (wx < 0 || wx >= width || wy < 0 || wy >= totalHeight || wz < 0 || wz >= depth)
                continue;

              const existing = terrain.get(wx, wy, wz);
              if (!existing || existing.block === AIR) continue;
              setVoxel(wx, wy, wz, oreBlock, 0, true);
            }
          }
        }
      }

      for (let i = 0; i < oreCountScaled; i++) {
        const ox = Math.floor(rand() * width);
        const oz = Math.floor(rand() * depth);
        const colH = heightMap[ox * depth + oz];
        if (colH < 3) continue;
        const maxY = Math.min(colH - 2, groundDepth - 1);
        if (maxY < 1) continue;
        const oy = 1 + Math.floor(rand() * maxY);
        const oreBlock = oreBlockList[Math.floor(rand() * oreBlockList.length)];

        if (rand() < oreBigChance) {
          // rare jackpot: a chain of overlapping blobs forming one large,
          // irregular deposit instead of a single small vein
          const blobCount = 3 + Math.floor(rand() * 4);
          let cx = ox;
          let cy = oy;
          let cz = oz;
          for (let b = 0; b < blobCount; b++) {
            placeOreBlob(cx, cy, cz, oreBlock, oreBigR);
            cx = Math.max(
              0,
              Math.min(width - 1, cx + Math.round((rand() - 0.5) * oreBigR))
            );
            cy = Math.max(
              1,
              Math.min(maxY, cy + Math.round((rand() - 0.5) * oreBigR * 0.6))
            );
            cz = Math.max(
              0,
              Math.min(depth - 1, cz + Math.round((rand() - 0.5) * oreBigR))
            );
          }
        } else {
          placeOreBlob(ox, oy, oz, oreBlock, oreVeinR);
        }
      }
    }

    const enabledStructures = structures.filter((s) => s.enabled && s.count > 0);
    if (enabledStructures.length) {
      const placedBoxes:{x0, x1, z0, z1}[] = [];
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
            if (surfaceH <= 0) continue;

            if (st.requireFlat) {
              let minH2 = surfaceH;
              let maxH2 = surfaceH;
              const step = Math.max(1, Math.floor(Math.min(sx, sz) / 4));
              let flatOk = true;
              for (let cx = 0; cx < sx && flatOk; cx += step) {
                for (let cz = 0; cz < sz && flatOk; cz += step) {
                  const hh =
                    heightMap[
                      Math.min(width - 1, ax + cx) * depth + Math.min(depth - 1, az + cz)
                    ];
                  if (hh <= 0) {
                    flatOk = false;
                    break;
                  }
                  if (hh < minH2) minH2 = hh;
                  if (hh > maxH2) maxH2 = hh;
                  if (maxH2 - minH2 > 2) {
                    flatOk = false;
                    break;
                  }
                }
              }
              if (!flatOk) continue;
            }

            const ay = surfaceH;
            if (ay + rotated.sizeY > totalHeight) continue;

            const box = {
              x0: ax - spacing,
              x1: ax + sx + spacing,
              z0: az - spacing,
              z1: az + sz + spacing,
            };
            const overlaps = placedBoxes.some(
              (b) => !(box.x1 <= b.x0 || box.x0 >= b.x1 || box.z1 <= b.z0 || box.z0 >= b.z1)
            );
            if (overlaps) continue;

            for (const v of rotated.voxels) {
              const wx = ax + v.x;
              const wy = ay + v.y;
              const wz = az + v.z;
              if (wx < 0 || wx >= width || wy < 0 || wy >= totalHeight || wz < 0 || wz >= depth)
                continue;
              setVoxel(wx, wy, wz, v.block, v.meta || 0, true);
            }
            placedBoxes.push({ x0: ax, x1: ax + sx, z0: az, z1: az + sz });
            placed = true;
          }
        }
      }
    }

    commitStroke();

    setStatus(STRINGS.en.generatedSeed(seedVal));

    lastHeightMapRef.current = {
      width,
      depth,
      totalHeight,
      heightMap: heightMap.slice(),
      isWaterMap: Array.from(isWaterMap),
    };
  }
*/

export {
  RngParams,
  NormalizedParams,
  normalizeRngParameters
}