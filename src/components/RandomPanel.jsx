import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { colorForId } from "../lib/colors";
import { clamp, parseIdList } from "../lib/numbers";

export default function RandomPanel({
  featureRow,
  generateRandomTerrain,
  randAltitudeBlocks,
  randArchipelago,
  randBaseBlock,
  randBeachBlock,
  randBeachLevel,
  randBottomRoughness,
  randBushBlock,
  randBushDensity,
  randBushSpacing,
  randBushes,
  randCaveDensity,
  randCaveGlow,
  randCaveGlowBlock,
  randCaveGlowChance,
  randCaves,
  randDecoBlocks,
  randDecoChance,
  randErosion,
  randErosionIterations,
  randErosionStrength,
  randForestDensity,
  randForests,
  randGroundDepth,
  randHillStrength,
  randHills,
  randIsland,
  randIslandCount,
  randIslandIrregularity,
  randIslandMode,
  randIslandSize,
  randLakeBlock,
  randLakeSize,
  randLakes,
  randMaxH,
  randMaxThickness,
  randMinH,
  randMountainHeight,
  randMountains,
  randOreBigChance,
  randOreBigSize,
  randOreBlocks,
  randOreCount,
  randOreVeinSize,
  randOres,
  randPlateauHeight,
  randPlateaus,
  randRiverBlock,
  randRiverWidth,
  randRivers,
  randSeaBlock,
  randSeaLevel,
  randSeed,
  randShoreBlock,
  randShoreCoverage,
  randShoreRadius,
  randSmoothShore,
  randSnowBlock,
  randSnowLevel,
  randSurfaceBlock,
  randTreeDensity,
  randTreeLeavesBlock,
  randTreeMaxHeight,
  randTreeMinHeight,
  randTreeSpacing,
  randTreeWoodBlock,
  randTrees,
  randValleyDepth,
  randValleys,
  randWaterfallDrop,
  randWaterfalls,
  randomizeAllParams,
  setRandAltitudeBlocks,
  setRandArchipelago,
  setRandBaseBlock,
  setRandBeachBlock,
  setRandBeachLevel,
  setRandBottomRoughness,
  setRandBushBlock,
  setRandBushDensity,
  setRandBushSpacing,
  setRandBushes,
  setRandCaveDensity,
  setRandCaveGlow,
  setRandCaveGlowBlock,
  setRandCaveGlowChance,
  setRandCaves,
  setRandDecoBlocks,
  setRandDecoChance,
  setRandErosion,
  setRandErosionIterations,
  setRandErosionStrength,
  setRandForestDensity,
  setRandForests,
  setRandGroundDepth,
  setRandHillStrength,
  setRandHills,
  setRandIsland,
  setRandIslandCount,
  setRandIslandIrregularity,
  setRandIslandMode,
  setRandIslandSize,
  setRandLakeBlock,
  setRandLakeSize,
  setRandLakes,
  setRandMaxH,
  setRandMaxThickness,
  setRandMinH,
  setRandMountainHeight,
  setRandMountains,
  setRandOreBigChance,
  setRandOreBigSize,
  setRandOreBlocks,
  setRandOreCount,
  setRandOreVeinSize,
  setRandOres,
  setRandPlateauHeight,
  setRandPlateaus,
  setRandRiverBlock,
  setRandRiverWidth,
  setRandRivers,
  setRandSeaBlock,
  setRandSeaLevel,
  setRandSeed,
  setRandShoreBlock,
  setRandShoreCoverage,
  setRandShoreRadius,
  setRandSmoothShore,
  setRandSnowBlock,
  setRandSnowLevel,
  setRandSurfaceBlock,
  setRandTreeDensity,
  setRandTreeLeavesBlock,
  setRandTreeMaxHeight,
  setRandTreeMinHeight,
  setRandTreeSpacing,
  setRandTreeWoodBlock,
  setRandTrees,
  setRandValleyDepth,
  setRandValleys,
  setRandWaterfallDrop,
  setRandWaterfalls,
  totalHeight,
}) {
  const t = STRINGS.en;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderBottom: "1px solid #1e222b",
        background: "#141822",
      }}
    >
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.seed}
        <input
          type="number"
          value={randSeed}
          onChange={(e) => setRandSeed(e.target.value)}
          style={{ ...inputStyle, width: 80 }}
        />
      </label>
      <button
        style={actionBtn}
        onClick={() => setRandSeed(Math.floor(Math.random() * 1000000))}
        title={t.seedTitle}
      >
        🎲
      </button>
      <button
        style={{ ...actionBtn, background: "#2a1b3a", borderColor: "#5b2f6b" }}
        onClick={randomizeAllParams}
        title={t.randomizeAllTitle}
      >
        {t.randomizeAll}
      </button>

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.heightMin}
        <input
          type="number"
          min={0}
          value={randMinH}
          onChange={(e) => setRandMinH(e.target.value)}
          style={{ ...inputStyle, width: 46 }}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.heightMax}
        <input
          type="number"
          min={1}
          value={randMaxH}
          onChange={(e) => setRandMaxH(e.target.value)}
          style={{ ...inputStyle, width: 46 }}
        />
      </label>

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.groundDepth}
        <input
          type="number"
          min={0}
          max={64}
          value={randGroundDepth}
          onChange={(e) => setRandGroundDepth(e.target.value)}
          style={{ ...inputStyle, width: 46 }}
          title={t.groundDepthTitle}
        />
      </label>

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.groundId}
        <input
          type="number"
          min={1}
          max={255}
          value={randBaseBlock}
          onChange={(e) => setRandBaseBlock(e.target.value)}
          style={{ ...inputStyle, width: 46 }}
        />
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: colorForId(clamp(randBaseBlock, 1, 255)),
          }}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.surfaceId}
        <input
          type="number"
          min={1}
          max={255}
          value={randSurfaceBlock}
          onChange={(e) => setRandSurfaceBlock(e.target.value)}
          style={{ ...inputStyle, width: 46 }}
        />
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: colorForId(clamp(randSurfaceBlock, 1, 255)),
          }}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.decoId}
        <input
          type="text"
          value={randDecoBlocks}
          onChange={(e) => setRandDecoBlocks(e.target.value)}
          placeholder="20:5, 29:1, 35:1"
          style={{ ...inputStyle, width: 90 }}
        />
        <div style={{ display: "flex", gap: 2 }}>
          {parseIdList(randDecoBlocks)
            .slice(0, 6)
            .map((id, i) => (
              <span
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: colorForId(id),
                  flexShrink: 0,
                }}
              />
            ))}
        </div>
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.decoPct}
        <input
          type="number"
          min={0}
          max={100}
          value={randDecoChance}
          onChange={(e) => setRandDecoChance(e.target.value)}
          style={{ ...inputStyle, width: 46 }}
        />
      </label>

      {featureRow(
        "island",
        randIsland,
        (e) => setRandIsland(e.target.checked),
        t.islandShape,
        <>
          <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.islandMode}</div>
          <div style={{ display: "flex", gap: 2 }}>
            {["floating", "island"].map((mode) => (
              <button
                key={mode}
                onClick={() => setRandIslandMode(mode)}
                style={{
                  ...actionBtn,
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 11,
                  border:
                    randIslandMode === mode
                      ? "1px solid #6ea8fe"
                      : "1px solid #2a2f3a",
                  background: randIslandMode === mode ? "#22314d" : "#1a1d24",
                }}
              >
                {mode === "floating" ? t.islandModeFloating : t.islandModeSea}
              </button>
            ))}
          </div>
          {randIslandMode === "island" && (
            <>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.seaLevel}
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={randSeaLevel}
                  onChange={(e) => setRandSeaLevel(e.target.value)}
                  style={{ ...inputStyle, width: 46 }}
                />
              </label>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.seaBlock}
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={randSeaBlock}
                  onChange={(e) => setRandSeaBlock(e.target.value)}
                  style={{ ...inputStyle, width: 46 }}
                />
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: colorForId(clamp(randSeaBlock, 1, 255)),
                  }}
                />
              </label>
            </>
          )}
          {randIslandMode === "floating" && (
            <>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.maxThickness}
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={randMaxThickness}
                  onChange={(e) => setRandMaxThickness(e.target.value)}
                  style={{ ...inputStyle, width: 46 }}
                  title={t.maxThicknessTitle}
                />
              </label>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.bottomRoughness}
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={randBottomRoughness}
                  onChange={(e) => setRandBottomRoughness(e.target.value)}
                  style={{ ...inputStyle, width: 46 }}
                  title={t.bottomRoughnessTitle}
                />
              </label>
            </>
          )}
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={randArchipelago}
              onChange={(e) => setRandArchipelago(e.target.checked)}
            />
            {t.archipelago}
          </label>
          {randArchipelago && (
            <label
              style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
            >
              {t.islandCount}
              <input
                type="number"
                min={1}
                max={8}
                value={randIslandCount}
                onChange={(e) => setRandIslandCount(clamp(e.target.value, 1, 8))}
                style={{ ...inputStyle, width: 40 }}
              />
            </label>
          )}
          <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.islandSize}</div>
          <div style={{ display: "flex", gap: 2 }}>
            {["small", "medium", "large"].map((sz) => (
              <button
                key={sz}
                onClick={() => setRandIslandSize(sz)}
                style={{
                  ...actionBtn,
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 11,
                  border:
                    randIslandSize === sz
                      ? "1px solid #6ea8fe"
                      : "1px solid #2a2f3a",
                  background: randIslandSize === sz ? "#22314d" : "#1a1d24",
                }}
              >
                {t[sz]}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.islandIrregularity}
            <input
              type="number"
              min={0}
              max={100}
              value={randIslandIrregularity}
              onChange={(e) => setRandIslandIrregularity(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        </>
      )}

      <div style={{ width: 1, height: 20, background: "#2a2f3a", margin: "0 4px" }} />

      {featureRow(
        "hills",
        randHills,
        (e) => setRandHills(e.target.checked),
        t.hills,
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          {t.hillStrength}
          <input
            type="number"
            min={0}
            max={100}
            value={randHillStrength}
            onChange={(e) => setRandHillStrength(e.target.value)}
            style={{ ...inputStyle, width: 46 }}
          />
        </label>
      )}

      {featureRow(
        "mountains",
        randMountains,
        (e) => setRandMountains(e.target.checked),
        t.mountains,
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          {t.mountainHeight}
          <input
            type="number"
            min={1}
            max={64}
            value={randMountainHeight}
            onChange={(e) => setRandMountainHeight(e.target.value)}
            style={{ ...inputStyle, width: 46 }}
          />
        </label>
      )}

      {featureRow(
        "plateaus",
        randPlateaus,
        (e) => setRandPlateaus(e.target.checked),
        t.plateaus,
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          {t.plateauHeight}
          <input
            type="number"
            min={1}
            max={64}
            value={randPlateauHeight}
            onChange={(e) => setRandPlateauHeight(e.target.value)}
            style={{ ...inputStyle, width: 46 }}
          />
        </label>
      )}

      {featureRow(
        "valleys",
        randValleys,
        (e) => setRandValleys(e.target.checked),
        t.valleys,
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          {t.valleyDepth}
          <input
            type="number"
            min={1}
            max={32}
            value={randValleyDepth}
            onChange={(e) => setRandValleyDepth(e.target.value)}
            style={{ ...inputStyle, width: 46 }}
          />
        </label>
      )}

      {featureRow(
        "rivers",
        randRivers,
        (e) => setRandRivers(e.target.checked),
        t.rivers,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.riverBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={randRiverBlock}
              onChange={(e) => setRandRiverBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randRiverBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.riverWidth}
            <input
              type="number"
              min={1}
              max={40}
              value={randRiverWidth}
              onChange={(e) => setRandRiverWidth(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={randWaterfalls}
              onChange={(e) => setRandWaterfalls(e.target.checked)}
            />
            {t.waterfalls}
          </label>
          {randWaterfalls && (
            <label
              style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
            >
              {t.waterfallDrop}
              <input
                type="number"
                min={2}
                max={30}
                value={randWaterfallDrop}
                onChange={(e) => setRandWaterfallDrop(e.target.value)}
                style={{ ...inputStyle, width: 40 }}
              />
            </label>
          )}
        </>
      )}

      {featureRow(
        "lakes",
        randLakes,
        (e) => setRandLakes(e.target.checked),
        t.lakes,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.lakeBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={randLakeBlock}
              onChange={(e) => setRandLakeBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randLakeBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.lakeSize}
            <input
              type="number"
              min={1}
              max={10}
              value={randLakeSize}
              onChange={(e) => setRandLakeSize(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        </>
      )}

      {featureRow(
        "caves",
        randCaves,
        (e) => setRandCaves(e.target.checked),
        t.caves,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.caveDensity}
            <input
              type="number"
              min={0}
              max={100}
              value={randCaveDensity}
              onChange={(e) => setRandCaveDensity(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={randCaveGlow}
              onChange={(e) => setRandCaveGlow(e.target.checked)}
            />
            {t.caveGlow}
          </label>
          {randCaveGlow && (
            <>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.caveGlowChance}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={randCaveGlowChance}
                  onChange={(e) => setRandCaveGlowChance(e.target.value)}
                  style={{ ...inputStyle, width: 46 }}
                />
              </label>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.caveGlowBlock}
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={randCaveGlowBlock}
                  onChange={(e) => setRandCaveGlowBlock(e.target.value)}
                  style={{ ...inputStyle, width: 46 }}
                />
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: colorForId(clamp(randCaveGlowBlock, 1, 255)),
                  }}
                />
              </label>
            </>
          )}
        </>
      )}

      {featureRow(
        "trees",
        randTrees,
        (e) => setRandTrees(e.target.checked),
        t.trees,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeDensity}
            <input
              type="number"
              min={0}
              max={100}
              value={randTreeDensity}
              onChange={(e) => setRandTreeDensity(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={randForests}
              onChange={(e) => setRandForests(e.target.checked)}
            />
            {t.forests}
          </label>
          {randForests && (
            <label
              style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
            >
              {t.forestDensity}
              <input
                type="number"
                min={0}
                max={100}
                value={randForestDensity}
                onChange={(e) => setRandForestDensity(e.target.value)}
                style={{ ...inputStyle, width: 46 }}
              />
            </label>
          )}
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeHeightMin}
            <input
              type="number"
              min={1}
              max={20}
              value={randTreeMinHeight}
              onChange={(e) => setRandTreeMinHeight(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeHeightMax}
            <input
              type="number"
              min={1}
              max={20}
              value={randTreeMaxHeight}
              onChange={(e) => setRandTreeMaxHeight(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeWoodId}
            <input
              type="number"
              min={1}
              max={255}
              value={randTreeWoodBlock}
              onChange={(e) => setRandTreeWoodBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randTreeWoodBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeLeavesId}
            <input
              type="number"
              min={1}
              max={255}
              value={randTreeLeavesBlock}
              onChange={(e) => setRandTreeLeavesBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randTreeLeavesBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeSpacing}
            <input
              type="number"
              min={0}
              max={20}
              value={randTreeSpacing}
              onChange={(e) => setRandTreeSpacing(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      )}

      {featureRow(
        "bushes",
        randBushes,
        (e) => setRandBushes(e.target.checked),
        t.bushes,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.bushDensity}
            <input
              type="number"
              min={0}
              max={100}
              value={randBushDensity}
              onChange={(e) => setRandBushDensity(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.bushBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={randBushBlock}
              onChange={(e) => setRandBushBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randBushBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.bushSpacing}
            <input
              type="number"
              min={0}
              max={10}
              value={randBushSpacing}
              onChange={(e) => setRandBushSpacing(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      )}

      {featureRow(
        "altitude",
        randAltitudeBlocks,
        (e) => setRandAltitudeBlocks(e.target.checked),
        t.altitudeBlocks,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.beachLevel}
            <input
              type="number"
              min={0}
              max={totalHeight}
              value={randBeachLevel}
              onChange={(e) => setRandBeachLevel(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.beachBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={randBeachBlock}
              onChange={(e) => setRandBeachBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randBeachBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.snowLevel}
            <input
              type="number"
              min={0}
              max={totalHeight}
              value={randSnowLevel}
              onChange={(e) => setRandSnowLevel(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.snowBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={randSnowBlock}
              onChange={(e) => setRandSnowBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randSnowBlock, 1, 255)),
              }}
            />
          </label>
        </>
      )}

      {featureRow(
        "shore",
        randSmoothShore,
        (e) => setRandSmoothShore(e.target.checked),
        t.smoothShore,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.shoreRadius}
            <input
              type="number"
              min={1}
              max={5}
              value={randShoreRadius}
              onChange={(e) => setRandShoreRadius(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.shoreBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={randShoreBlock}
              onChange={(e) => setRandShoreBlock(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(randShoreBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.shoreCoverage}
            <input
              type="number"
              min={0}
              max={100}
              value={randShoreCoverage}
              onChange={(e) => setRandShoreCoverage(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
              title={t.shoreCoverageTitle}
            />
          </label>
        </>
      )}

      {featureRow(
        "ores",
        randOres,
        (e) => setRandOres(e.target.checked),
        t.ores,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreIds}
            <input
              type="text"
              value={randOreBlocks}
              onChange={(e) => setRandOreBlocks(e.target.value)}
              placeholder="25, 26, 42"
              style={{ ...inputStyle, width: 90 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreCount}
            <input
              type="number"
              min={0}
              max={500}
              value={randOreCount}
              onChange={(e) => setRandOreCount(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreVeinSize}
            <input
              type="number"
              min={1}
              max={5}
              value={randOreVeinSize}
              onChange={(e) => setRandOreVeinSize(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreBigChance}
            <input
              type="number"
              min={0}
              max={100}
              value={randOreBigChance}
              onChange={(e) => setRandOreBigChance(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreBigSize}
            <input
              type="number"
              min={1}
              max={10}
              value={randOreBigSize}
              onChange={(e) => setRandOreBigSize(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      )}

      {featureRow(
        "erosion",
        randErosion,
        (e) => setRandErosion(e.target.checked),
        t.erosion,
        <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.erosionStrength}
            <input
              type="number"
              min={0}
              max={100}
              value={randErosionStrength}
              onChange={(e) => setRandErosionStrength(e.target.value)}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.erosionIterations}
            <input
              type="number"
              min={1}
              max={5}
              value={randErosionIterations}
              onChange={(e) => setRandErosionIterations(e.target.value)}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      )}

      <button
        onClick={generateRandomTerrain}
        style={{ ...actionBtn, background: "#3a2a1b", borderColor: "#6b4f2f" }}
      >
        {t.generate}
      </button>
    </div>
  );
}
