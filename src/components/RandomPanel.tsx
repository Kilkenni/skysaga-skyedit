import { STRINGS } from "../i18n/strings";
import { inputStyle, actionBtn } from "../styles/inline";
import { colorForId } from "../lib/colors";
import { clamp, parseIdList } from "../lib/numbers";
import { RngParams } from "../lib/mapGenerator";
import React from "react";
import CollapsibleOptionsBlock from "./CollapsibleOptionsBlock";

interface Props {
  randSeed: number,
  setRandSeed: (newSeed:number)=>void,
  rngParams: RngParams,
  onParamChange: <K extends keyof RngParams>(paramName: K, value: RngParams[K])=> void,
  totalHeight: number,
  generateRandomTerrain: (params: RngParams) => void,
  randomizeAllParams: () => void,
}

export default function RandomPanel(props:Props) {
  const t = STRINGS.en;
  // helper to write input-specific helpers using TS type safety. Yay!
  type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

  // helper, autoconverts string from text input to number
  function setNum(key: KeysOfType<RngParams, number>){
    return (event:React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => 
      props.onParamChange(key, Number(event.target.value));
  }

  function setStr(key: KeysOfType<RngParams, string>){
    return (event:React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => 
      props.onParamChange(key, event.target.value);
  }

  function setBool(key: KeysOfType<RngParams, boolean>){
    return (event:React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => 
      props.onParamChange(key, event.target.checked);
  }

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
          value={props.randSeed}
          onChange={(e) => props.setRandSeed(Number(e.target.value))}
          style={{ ...inputStyle, width: 80 }}
        />
      </label>
      <button
        style={actionBtn}
        onClick={() => props.setRandSeed(Math.floor(Math.random() * 1000000))}
        title={t.seedTitle}
      >
        🎲
      </button>
      <button
        style={{ ...actionBtn, background: "#2a1b3a", borderColor: "#5b2f6b" }}
        onClick={props.randomizeAllParams}
        title={t.randomizeAllTitle}
      >
        {t.randomizeAll}
      </button>

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.heightMin}
        <input
          type="number"
          min={0}
          value={props.rngParams.randMinH}
          onChange={setNum("randMinH")}
          style={{ ...inputStyle, width: 46 }}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.heightMax}
        <input
          type="number"
          min={1}
          value={props.rngParams.randMaxH}
          onChange={setNum("randMaxH")}
          style={{ ...inputStyle, width: 46 }}
        />
      </label>

      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.groundDepth}
        <input
          type="number"
          min={0}
          max={64}
          value={props.rngParams.randGroundDepth}
          onChange={setNum("randGroundDepth")}
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
          value={props.rngParams.randBaseBlock}
          onChange={setNum("randBaseBlock")}
          style={{ ...inputStyle, width: 46 }}
        />
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: colorForId(clamp(props.rngParams.randBaseBlock, 1, 255)),
          }}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.surfaceId}
        <input
          type="number"
          min={1}
          max={255}
          value={props.rngParams.randSurfaceBlock}
          onChange={setNum("randSurfaceBlock")}
          style={{ ...inputStyle, width: 46 }}
        />
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: colorForId(clamp(props.rngParams.randSurfaceBlock, 1, 255)),
          }}
        />
      </label>
      <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
        {t.decoId}
        <input
          type="text"
          value={props.rngParams.randDecoBlocks}
          onChange={setStr("randDecoBlocks")}
          placeholder="20:5, 29:1, 35:1"
          style={{ ...inputStyle, width: 90 }}
        />
        <div style={{ display: "flex", gap: 2 }}>
          {parseIdList(props.rngParams.randDecoBlocks)
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
          value={props.rngParams.randDecoChance}
          onChange={setNum("randDecoChance")}
          style={{ ...inputStyle, width: 46 }}
        />
      </label>

      {CollapsibleOptionsBlock({
        key: "island",
        enabled: props.rngParams.randIsland,
        onToggle: setBool("randIsland"),
        label: t.islandShape,
        optionsBody: <>
          <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.islandMode}</div>
          <div style={{ display: "flex", gap: 2 }}>
            {["floating", "island"].map((mode) => (
              <button
                key={mode}
                onClick={() => props.onParamChange("randIslandMode", mode)}
                style={{
                  ...actionBtn,
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 11,
                  border:
                    props.rngParams.randIslandMode === mode
                      ? "1px solid #6ea8fe"
                      : "1px solid #2a2f3a",
                  background: props.rngParams.randIslandMode === mode ? "#22314d" : "#1a1d24",
                }}
              >
                {mode === "floating" ? t.islandModeFloating : t.islandModeSea}
              </button>
            ))}
          </div>
          {props.rngParams.randIslandMode === "island" && (
            <>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.seaLevel}
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={props.rngParams.randSeaLevel}
                  onChange={setNum("randSeaLevel")}
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
                  value={props.rngParams.randSeaBlock}
                  onChange={setNum("randSeaBlock")}
                  style={{ ...inputStyle, width: 46 }}
                />
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: colorForId(clamp(props.rngParams.randSeaBlock, 1, 255)),
                  }}
                />
              </label>
            </>
          )}
          {props.rngParams.randIslandMode === "floating" && (
            <>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.maxThickness}
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={props.rngParams.randMaxThickness}
                  onChange={setNum("randMaxThickness")}
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
                  value={props.rngParams.randBottomRoughness}
                  onChange={setNum("randBottomRoughness")}
                  style={{ ...inputStyle, width: 46 }}
                  title={t.bottomRoughnessTitle}
                />
              </label>
            </>
          )}
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={props.rngParams.randArchipelago}
              onChange={setBool("randArchipelago")}
            />
            {t.archipelago}
          </label>
          {props.rngParams.randArchipelago && (
            <label
              style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
            >
              {t.islandCount}
              <input
                type="number"
                min={1}
                max={8}
                value={props.rngParams.randIslandCount}
                onChange={(e) => props.onParamChange("randIslandCount", clamp(e.target.value, 1, 8))}
                style={{ ...inputStyle, width: 40 }}
              />
            </label>
          )}
          <div style={{ fontSize: 11, color: "#8a91a3" }}>{t.islandSize}</div>
          <div style={{ display: "flex", gap: 2 }}>
            {["small", "medium", "large"].map((sz) => (
              <button
                key={sz}
                onClick={() => props.onParamChange("randIslandSize", sz)}
                style={{
                  ...actionBtn,
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 11,
                  border:
                    props.rngParams.randIslandSize === sz
                      ? "1px solid #6ea8fe"
                      : "1px solid #2a2f3a",
                  background: props.rngParams.randIslandSize === sz ? "#22314d" : "#1a1d24",
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
              value={props.rngParams.randIslandIrregularity}
              onChange={setNum("randIslandIrregularity")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        </>
      })}

      <div style={{ width: 1, height: 20, background: "#2a2f3a", margin: "0 4px" }} />

      {CollapsibleOptionsBlock({
        key: "hills",
        enabled: props.rngParams.randHills,
        onToggle: setBool("randHills"),
        label: t.hills,
        optionsBody:(
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
          {t.hillStrength}
          <input
            type="number"
            min={0}
            max={100}
            value={props.rngParams.randHillStrength}
            onChange={setNum("randHillStrength")}
            style={{ ...inputStyle, width: 46 }}
          />
        </label>
        )
      })}

      {CollapsibleOptionsBlock({
        key: "mountains",
        enabled: props.rngParams.randMountains,
        onToggle: setBool("randMountains"),
        label: t.mountains,
        optionsBody: (
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.mountainHeight}
            <input
              type="number"
              min={1}
              max={64}
              value={props.rngParams.randMountainHeight}
              onChange={setNum("randMountainHeight")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        )
      })}

      {CollapsibleOptionsBlock({
        key: "plateaus",
        enabled: props.rngParams.randPlateaus,
        onToggle: setBool("randPlateaus"),
        label: t.plateaus,
        optionsBody: (
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.plateauHeight}
            <input
              type="number"
              min={1}
              max={64}
              value={props.rngParams.randPlateauHeight}
              onChange={setNum("randPlateauHeight")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        )
      })}

      {CollapsibleOptionsBlock({
        key: "valleys",
        enabled: props.rngParams.randValleys,
        onToggle: setBool("randValleys"),
        label: t.valleys,
        optionsBody: (
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.valleyDepth}
            <input
              type="number"
              min={1}
              max={32}
              value={props.rngParams.randValleyDepth}
              onChange={setNum("randValleyDepth")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        )
      })}

      {CollapsibleOptionsBlock({
        key: "rivers",
        enabled: props.rngParams.randRivers,
        onToggle: setBool("randRivers"),
        label: t.rivers,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.riverBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randRiverBlock}
              onChange={setNum("randRiverBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randRiverBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.riverWidth}
            <input
              type="number"
              min={1}
              max={40}
              value={props.rngParams.randRiverWidth}
              onChange={setNum("randRiverWidth")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={props.rngParams.randWaterfalls}
              onChange={setBool("randWaterfalls")}
            />
            {t.waterfalls}
          </label>
          {props.rngParams.randWaterfalls && (
            <label
              style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
            >
              {t.waterfallDrop}
              <input
                type="number"
                min={2}
                max={30}
                value={props.rngParams.randWaterfallDrop}
                onChange={setNum("randWaterfallDrop")}
                style={{ ...inputStyle, width: 40 }}
              />
            </label>
          )}
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "lakes",
        enabled: props.rngParams.randLakes,
        onToggle: setBool("randLakes"),
        label: t.lakes,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.lakeBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randLakeBlock}
              onChange={setNum("randLakeBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randLakeBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.lakeSize}
            <input
              type="number"
              min={1}
              max={10}
              value={props.rngParams.randLakeSize}
              onChange={setNum("randLakeSize")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "caves",
        enabled: props.rngParams.randCaves,
        onToggle: setBool("randCaves"),
        label: t.caves,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.caveDensity}
            <input
              type="number"
              min={0}
              max={100}
              value={props.rngParams.randCaveDensity}
              onChange={setNum("randCaveDensity")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={props.rngParams.randCaveGlow}
              onChange={setBool("randCaveGlow")}
            />
            {t.caveGlow}
          </label>
          {props.rngParams.randCaveGlow && (
            <>
              <label
                style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
              >
                {t.caveGlowChance}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={props.rngParams.randCaveGlowChance}
                  onChange={setNum("randCaveGlowChance")}
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
                  value={props.rngParams.randCaveGlowBlock}
                  onChange={setNum("randCaveGlowBlock")}
                  style={{ ...inputStyle, width: 46 }}
                />
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: colorForId(clamp(props.rngParams.randCaveGlowBlock, 1, 255)),
                  }}
                />
              </label>
            </>
          )}
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "trees",
        enabled: props.rngParams.randTrees,
        onToggle: setBool("randTrees"),
        label: t.trees,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeDensity}
            <input
              type="number"
              min={0}
              max={100}
              value={props.rngParams.randTreeDensity}
              onChange={setNum("randTreeDensity")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={props.rngParams.randForests}
              onChange={setBool("randForests")}
            />
            {t.forests}
          </label>
          {props.rngParams.randForests && (
            <label
              style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}
            >
              {t.forestDensity}
              <input
                type="number"
                min={0}
                max={100}
                value={props.rngParams.randForestDensity}
                onChange={setNum("randForestDensity")}
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
              value={props.rngParams.randTreeMinHeight}
              onChange={setNum("randTreeMinHeight")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeHeightMax}
            <input
              type="number"
              min={1}
              max={20}
              value={props.rngParams.randTreeMaxHeight}
              onChange={setNum("randTreeMaxHeight")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeWoodId}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randTreeWoodBlock}
              onChange={setNum("randTreeWoodBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randTreeWoodBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeLeavesId}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randTreeLeavesBlock}
              onChange={setNum("randTreeLeavesBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randTreeLeavesBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.treeSpacing}
            <input
              type="number"
              min={0}
              max={20}
              value={props.rngParams.randTreeSpacing}
              onChange={setNum("randTreeSpacing")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "bushes",
        enabled: props.rngParams.randBushes,
        onToggle: setBool("randBushes"),
        label: t.bushes,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.bushDensity}
            <input
              type="number"
              min={0}
              max={100}
              value={props.rngParams.randBushDensity}
              onChange={setNum("randBushDensity")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.bushBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randBushBlock}
              onChange={setNum("randBushBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randBushBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.bushSpacing}
            <input
              type="number"
              min={0}
              max={10}
              value={props.rngParams.randBushSpacing}
              onChange={setNum("randBushSpacing")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "altitude",
        enabled: props.rngParams.randAltitudeBlocks,
        onToggle: setBool("randAltitudeBlocks"),
        label: t.altitudeBlocks,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.beachLevel}
            <input
              type="number"
              min={0}
              max={props.totalHeight}
              value={props.rngParams.randBeachLevel}
              onChange={setNum("randBeachLevel")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.beachBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randBeachBlock}
              onChange={setNum("randBeachBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randBeachBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.snowLevel}
            <input
              type="number"
              min={0}
              max={props.totalHeight}
              value={props.rngParams.randSnowLevel}
              onChange={setNum("randSnowLevel")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.snowBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randSnowBlock}
              onChange={setNum("randSnowBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randSnowBlock, 1, 255)),
              }}
            />
          </label>
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "shore",
        enabled: props.rngParams.randSmoothShore,
        onToggle: setBool("randSmoothShore"),
        label: t.smoothShore,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.shoreRadius}
            <input
              type="number"
              min={1}
              max={5}
              value={props.rngParams.randShoreRadius}
              onChange={setNum("randShoreRadius")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.shoreBlock}
            <input
              type="number"
              min={1}
              max={255}
              value={props.rngParams.randShoreBlock}
              onChange={setNum("randShoreBlock")}
              style={{ ...inputStyle, width: 46 }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colorForId(clamp(props.rngParams.randShoreBlock, 1, 255)),
              }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.shoreCoverage}
            <input
              type="number"
              min={0}
              max={100}
              value={props.rngParams.randShoreCoverage}
              onChange={setNum("randShoreCoverage")}
              style={{ ...inputStyle, width: 46 }}
              title={t.shoreCoverageTitle}
            />
          </label>
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "ores",
        enabled: props.rngParams.randOres,
        onToggle: setBool("randOres"),
        label: t.ores,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreIds}
            <input
              type="text"
              value={props.rngParams.randOreBlocks}
              onChange={setStr("randOreBlocks")}
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
              value={props.rngParams.randOreCount}
              onChange={setNum("randOreCount")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreVeinSize}
            <input
              type="number"
              min={1}
              max={5}
              value={props.rngParams.randOreVeinSize}
              onChange={setNum("randOreVeinSize")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreBigChance}
            <input
              type="number"
              min={0}
              max={100}
              value={props.rngParams.randOreBigChance}
              onChange={setNum("randOreBigChance")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.oreBigSize}
            <input
              type="number"
              min={1}
              max={10}
              value={props.rngParams.randOreBigSize}
              onChange={setNum("randOreBigSize")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      })}

      {CollapsibleOptionsBlock({
        key: "erosion",
        enabled: props.rngParams.randErosion,
        onToggle: setBool("randErosion"),
        label: t.erosion,
        optionsBody: <>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.erosionStrength}
            <input
              type="number"
              min={0}
              max={100}
              value={props.rngParams.randErosionStrength}
              onChange={setNum("randErosionStrength")}
              style={{ ...inputStyle, width: 46 }}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            {t.erosionIterations}
            <input
              type="number"
              min={1}
              max={5}
              value={props.rngParams.randErosionIterations}
              onChange={setNum("randErosionIterations")}
              style={{ ...inputStyle, width: 40 }}
            />
          </label>
        </>
      })}

      <button
        onClick={()=>props.generateRandomTerrain(props.rngParams)}
        style={{ ...actionBtn, background: "#3a2a1b", borderColor: "#6b4f2f" }}
      >
        {t.generate}
      </button>
    </div>
  );
}
