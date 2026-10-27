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

export {
  RngParams
}