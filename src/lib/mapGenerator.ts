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

export {
  RngParams
}