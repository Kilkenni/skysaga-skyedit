import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import {
  CHUNK, CELL_BASE, REAL_BIOMES, MAX_CHUNKS, MAP_SIZES, mapSizeKey, ENTITIES, ENTITY_CATEGORY,
  SERVICE_ENTITY_NAMES, DEVICE_CELLS, ENTITY_CATEGORIES, ENTITY_COLORS, SINGLETON_ENTITY_NAMES,
  BLOCK_NAMES, AIR, DEFAULT_PALETTE, STORAGE_KEY, TEXTURES_STORAGE_KEY, STRUCTURES_STORAGE_KEY,
} from "../constants";
import { STRINGS } from "../i18n/strings";
import { colorForId } from "../lib/colors";
import { keyOf } from "../lib/keys";
import { clamp, clampBlockId, isNum, } from "../lib/numbers";
import { rotateStructure90, getRotatedStructure, generateStructureThumbnail, Structure } from "../lib/structures";
import { inputStyle, actionBtn } from "../styles/inline";
import RandomPanel from "./RandomPanel";
import StructuresPanel from "./StructuresPanel";
import BulkTexturePanel from "./BulkTexturePanel";
import SavesPanel from "./SavesPanel";
import PresetsPanel from "./PresetsPanel";
import EntitiesPanel from "./EntitiesPanel";
import HelpModal from "./HelpModal";
import StatsModal from "./StatsModal";
import TopBar from "./TopBar.tsx";
import PaletteSidebar from "./PaletteSidebar";
import ToolbarRow from "./ToolbarRow";
import LayerNav from "./LayerNav";
import { BlockId, VoxelCell, VoxelStore, VoxelStoreEvent } from "../lib/VoxelStore";
import {storage, createNamedStore, writeJson, readJson } from "../lib/storage.ts";
import {Hotbar, PaletteEntry, usePalette} from "../hooks/usePalette.ts"
import PaletteHotbar from "./PaletteHotbar.tsx";
import { NormalizedParams, normalizeRngParameters, RngParams, TreeParams, VegParams } from "../lib/mapParamNormalizer.ts";
import { hotkeyLabel, isFreehand, PAN_KEYS, TOOL_BY_CODE, TOOL_BY_ID } from "../lib/tools.ts";
import { generateTerrain, regenerateDeco, regenerateOre, regenerateVeg } from "../lib/mapGenerator.ts";
import { EntityData, EntityDataId, parseEntities, exportEntity, findAirshipSpot } from "../lib/entities.ts";
import { EntityStore, EntityStoreEvent } from "../lib/EntityStore.ts";
import { useEntityList } from "../hooks/useEntityList.ts";

export interface MapData {
  gridX: number,
  gridY: number,
  gridZ: number,
  biomeName: string,
  gameMode: number
}

const DEFAULT_MAP_DATA:Readonly<MapData> = {
  gridX: 6,
  gridY: 4,
  gridZ: 6,
  biomeName: "Forest",
  gameMode: 1,
}

export interface RngSnapshot {
  width: number,
  depth: number,
  height: number,
  heightMap: Int16Array,
  isWaterMap: Uint8Array
}

export interface LevelData {
  mapSizeChunks: { x:number, y:number, z:number },
  biomeName: string,
  gameMode: number,
  voxels: VoxelCell[],
  entities: EntityData[],
  paletteLabels?: PaletteEntry[],
  hotbar?: Hotbar,
  cameraMode?: "orbit" | "fly",
}

export interface MapDimensions {
  width: number,
  depth: number,
  height: number,
}

type DeepReadonly<T> =
  T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

//explicitly exclude optionals from default to avoid making them readonly
const DEFAULT_LEVEL_DATA:DeepReadonly< Pick<LevelData, "mapSizeChunks" | "biomeName" | "gameMode" | "voxels" | "entities"> > = {
  mapSizeChunks: {
    x: DEFAULT_MAP_DATA.gridX,
    y: DEFAULT_MAP_DATA.gridY,
    z: DEFAULT_MAP_DATA.gridZ,
  },
  biomeName: DEFAULT_MAP_DATA.biomeName,
  gameMode: DEFAULT_MAP_DATA.gameMode,
  voxels: [],
  entities: [],
}

const DEFAULT_SETTINGS = {
  ZOOM_WHEEL_STEP: 1.05,
  ZOOM_ORBIT_STEP: 1.05,
  ZOOM_SHIFT_MULT: 3,         // Shift + wheel zoom multiplier per notch
  ZOOM_GESTURE_MS: 500,       // wheel events closer together than this belong to one gesture, i.e. a throttle on recalc zoom parameters
}

export function getDefaultLevelData():LevelData {
  return {
    ...DEFAULT_LEVEL_DATA,
    mapSizeChunks: { ...DEFAULT_LEVEL_DATA.mapSizeChunks },
    voxels: [],
    entities: [],
  }
}

export const DEFAULT_RNG_PARAMS:Readonly<RngParams> = {
  randMinH: 0,
  randMaxH: 25,

  randGroundDepth: 43,
  randBaseBlock: 24,
  randSurfaceBlock: 1, 
  randDecoBlocks: "", 
  randDecoChance: 0,

  randIsland: true,
  randIslandMode: "floating",
  randIslandSize: "small", 
  randIslandIrregularity: 55,
  randBottomRoughness: 20,
  randMaxThickness: 25,

  randArchipelago: false,
  randIslandCount: 3,

  randSeaLevel: 15,
  randSeaBlock: 50,
  
  randHills: true,
  randHillStrength: 40,
  randMountains: false,
  randMountainHeight: 35,
  randPlateaus: false,
  randPlateauHeight: 20,
  randValleys: false,
  randValleyDepth: 15,

  randRivers: false,
  randRiverBlock: 50,
  randRiverWidth: 3,
  randWaterfalls: false,
  randWaterfallDrop: 5,

  randLakes: false,
  randLakeBlock: 50,
  randLakeSize: 5,

  randCaves: false,
  randCaveDensity: 35,
  randCaveGlow: false,
  randCaveGlowChance: 3,
  randCaveGlowBlock: 21,

  randTrees: false,
  randTreeDensity: 15,
  randTreeMinHeight: 3,
  randTreeMaxHeight: 6,
  randTreeWoodBlock: 5,
  randTreeLeavesBlock: 14,
  randTreeSpacing: 3,
  randForests: false,
  randForestDensity: 45,

  randBushes: false,
  randBushDensity: 15,
  randBushBlock: 14,
  randBushSpacing: 1,

  randAltitudeBlocks: false,
  randBeachLevel: 50,
  randBeachBlock: 24, 
  randSnowLevel: 85,
  randSnowBlock: 10,

  randSmoothShore: false,
  randShoreRadius: 2,
  randShoreBlock: 24,
  randShoreCoverage: 45,

  randOres: false,
  randOreBlocks: "25,26,42",
  randOreCount: 40,
  randOreVeinSize: 2,
  randOreBigChance: 8, 
  randOreBigSize: 5,

  randErosion: false,
  randErosionStrength: 40,
  randErosionIterations: 2,
}

// Tools

export interface RoadParams {
  roadPending: {x: number, z: number}|null,
  roadWidth: number,
  roadBlock: number,
}

export default function TerrainEditor() {
  // FIXED (2026-08-21): "Sky_Island" does not exist in Alpha v10 36731's
  // GeoData.json (confirmed via direct search - zero matches). Real biomes
  // for this build: Desert, Forest, Jungle, Mountain, NPCfriend. Using
  // "Forest" as the default since that's what the server currently sends,
  // but this is just a free-text field - change it to whichever real biome
  // name you want per-map.
  const [mapData, setMapData] = useState<MapData>(DEFAULT_MAP_DATA);
  const paletteObj = usePalette({ onChange: scheduleSave })
  const { selectedBlock,
    setSelectedBlock,
    selectedBlockRef,
    hotbar,
    setHotbar,
    hotbarRef,
    palette,
    setPalette,
    assignHotbarSlot,
    selectHotbarSlot,
  } = paletteObj;
  const [cameraMode, setCameraMode] = useState<"orbit"|"fly">("orbit");

  const latestRef = useRef({ mapData, palette, cameraMode });
  latestRef.current = { mapData, palette, cameraMode };   // refreshed on every render

  const [currentLayer, setCurrentLayer] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const zoomAnchorRef = useRef<{ pivot: THREE.Vector3 | null; x: number; y: number; t: number } | null>(null); // Center of zooming
  const panDragRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState("none");
  const clipboardRef = useRef<any>(null);

  // Road Tool
  const [roadParams, setRoadParams] = useState<RoadParams>({roadPending:null, roadWidth: 2, roadBlock: 18});
  function updateRoadParams<K extends keyof RoadParams>(paramName: K, value: RoadParams[K]) {
    setRoadParams(prev => ({...prev, [paramName]: value}) );
  }
  const roadStartRef = useRef<typeof roadParams.roadPending>(null);

  const [clipboardInfo, setClipboardInfo] = useState<{w: number, h: number, d: number, count: number}|null>(null);
  const [copyYFrom, setCopyYFrom] = useState(0);
  const [copyYTo, setCopyYTo] = useState(0);
  const [mirrorX, setMirrorX] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [onionRange, setOnionRange] = useState(1);
  const [mirrorZ, setMirrorZ] = useState(false);
  
  const [hoverCell, setHoverCell] = useState<{x:number, z:number}|null>(null);
  const [voxelCount, setVoxelCount] = useState(0);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [showRandomPanel, setShowRandomPanel] = useState(false);

  const [rngParameters, setRngParameters] = useState<RngParams>({...DEFAULT_RNG_PARAMS});
  function updateRngParameter<K extends keyof RngParams>(paramName: K, value: RngParams[K]) {
    setRngParameters(prev => ({...prev, [paramName]: value}) );
  }

  const [randSeed, setRandSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));

  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<string[]>([]);
  const [newPresetName, setNewPresetName] = useState("Preset 1");

  const lastHeightMapRef = useRef<RngSnapshot>(null);

  const [openPopover, setOpenPopover] = useState<string|null>(null);
  const popoverAnchorRef = useRef<any>(null);

  const [showStructuresPanel, setShowStructuresPanel] = useState(false);
  const [structures, setStructures] = useState<Structure[]>([]);

  const structuresRef = useRef<typeof structures>([]);
  const viewModeRef = useRef<typeof viewMode>("3d");

  const [placingStructureId, setPlacingStructureId] = useState<number|null>(null);
  const [placingRotation, setPlacingRotation] = useState<number>(0);
  const placingStructureRef = useRef<number|null>(null);
  const placingRotationRef = useRef<number>(0);
  const structureThumbsRef = useRef(new Map());
  const [thumbVersion, setThumbVersion] = useState(0);

  const [placingEntityName, setPlacingEntityName] = useState<string|null>(null);
  const placingEntityRef = useRef<string|null>(null);
  const [showEntitiesPanel, setShowEntitiesPanel] = useState(false);
  
  
  
  // Search filter for the block palette - needed once BLOCK_NAMES grew from
  // 48 (Alpha 3-era stub table) to the real 146-entry Alpha v10 36731 list;
  // an unfiltered flat scroll of 146 rows was unusable.
  const entityMarkersGroupRef = useRef<any>(null); // todo: narrow down to correctly defined THREE.Group

  const [viewMode, setViewMode] = useState<"2d"|"3d">("2d");
  
  const [isLocked, setIsLocked] = useState(false);
  const [pointerLockFailed, setPointerLockFailed] = useState(false);
  const [moveSpeed, setMoveSpeed] = useState(16);

  const t = STRINGS.en;

  // const voxelsRef = useRef(new Map<string, any>());
  const [terrain, ] = useState<VoxelStore>(() => new VoxelStore);
  const [entities, ] = useState<EntityStore>(() => new EntityStore);
  const onStoreEventRef = useRef<(event: VoxelStoreEvent) => void>(() => {});
  const onEntityEventRef = useRef<(event: EntityStoreEvent) => void>(()=>{});
  const entityInstances = useEntityList(entities);

  const BULK_REBUILD_THRESHOLD = 100; // tune by feel
  onStoreEventRef.current = (event) => {
    // fresh closure every render, so it can use state, draw(), etc.
    setVoxelCount(terrain.size);
    scheduleSave();

    if (viewModeRef.current === "3d" && threeRef.current.scene) {
      if (event.type === "reset" || event.changes.length > BULK_REBUILD_THRESHOLD) { // for large changes, rebuild entirely
        rebuildInstances();
      }
      else { 
        for(const change of event.changes) //for small, apply incrementally
          syncVoxel3D(change.x, change.y, change.z, change.prevBlock, change.newBlock);
      }
    }
    draw();
  };
  onEntityEventRef.current = () => {
     scheduleSave();
  };
  useEffect(() => entities.subscribe((event) => onEntityEventRef.current(event)), []);

  useEffect(() => {
    return terrain.subscribe((event) => onStoreEventRef.current(event)); // cleanup - unsubscribe
  }, [terrain]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const rectStartRef = useRef<{x:number, z:number}>(null);
  const previewRectRef = useRef<{ x0:number, z0:number, x1:number, z1:number}>(null); // for preview on Rectangle tools
  const roadHoverRef = useRef<{ x: number; z: number } | null>(null); // for preview on Road tool
  // const strokeChangesRef = useRef<any[]>([]);
  // const touchedInStrokeRef = useRef(new Map());
  const saveTimerRef = useRef<number>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);
  const toolRef = useRef(tool);
  
  const dimsRef = useRef<MapDimensions>({ width: 0, depth: 0, height: 0 });
  
  const cameraModeRef = useRef(cameraMode);
  const moveSpeedRef = useRef(moveSpeed);

  const texturesRef = useRef<Map<number, any>>(new Map()); // blockId -> dataURL
  const textureImg2DRef = useRef(new Map()); // blockId -> HTMLImageElement (2D canvas)
  const textureThreeCacheRef = useRef(new Map()); // blockId -> THREE.Texture
  const [textureTargetId, setTextureTargetId] = useState<number|null>(null);
  const [textureVersion, setTextureVersion] = useState(0);

  const bulkFolderInputRef = useRef(null);
  const [showBulkTexturePanel, setShowBulkTexturePanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const [saveSlots, setSaveSlots] = useState<string[]>([]);
  
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<{total:number, rows}|null>(null);
  const [bulkTextureRows, setBulkTextureRows] = useState<{
    file: File;
    name: string;
    id: number | null;
    previewUrl: string;
    include: boolean;
  }[]>([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  interface ThreeGroup {
    mesh: THREE.InstancedMesh, 
    coords: {x:number, y: number, z:number}[], // unused coords in the end are capped by count
    indexMap: Map<string, number>, 
    count: number, 
    capacity: number,
  }

  interface ThreeInstance {
    renderer: THREE.WebGLRenderer | null,
    scene: THREE.Scene | null,
    camera: THREE.PerspectiveCamera | null,
    groups: Map<number, ThreeGroup>,
    planeMesh: THREE.Mesh | null,
    gridHelper: THREE.GridHelper | null,
    raycaster: THREE.Raycaster | null,
    orbit: {
      theta: number,
      phi: number,
      radius: number,
      targetRadius: number,
      thetaDelta: number,
      phiDelta: number,
      target: THREE.Vector3,
      targetGoal: THREE.Vector3,
      initialized: boolean,
    },
    fly: {
      position: THREE.Vector3,
      yaw: number,
      pitch: number,
      velocity: THREE.Vector3,
      initialized: boolean,
    },
    drag: {
      isDown: boolean,
      button: number,
      lastX: number,
      lastY: number,
    },
    keys: {
      forward: boolean,
      back: boolean,
      left: boolean,
      right: boolean,
      up: boolean,
      down: boolean,
    },
    locked: boolean,
    leftDown: boolean,
  }

  const threeRef = useRef<ThreeInstance>({
    renderer: null,
    scene: null,
    camera: null,
    groups: new Map(),
    planeMesh: null,
    gridHelper: null,
    raycaster: null,
    orbit: {
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      radius: 60,
      targetRadius: 60,
      thetaDelta: 0,
      phiDelta: 0,
      target: new THREE.Vector3(0, 0, 0),
      targetGoal: new THREE.Vector3(0, 0, 0),
      initialized: false,
    },
    fly: {
      position: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      pitch: -0.5,
      velocity:new THREE.Vector3(0, 0, 0),
      initialized: false,
    },
    drag: {
      isDown: false,
      button: 0,
      lastX: 0,
      lastY: 0,
    },
    keys: {
      forward: false,
      back: false,
      left: false,
      right: false,
      up: false,
      down: false,
    },
    locked: false,
    leftDown: false,
  });

  const width = mapData.gridX * CHUNK;
  const depth = mapData.gridZ * CHUNK;
  const height = mapData.gridY * CHUNK;
  const cell = CELL_BASE * zoom;

  useEffect(() => {
    toolRef.current = tool;
    if (tool !== "road") {
      roadStartRef.current = null;
      updateRoadParams("roadPending", null);
    }
    if (tool === "copy") {
      setCopyYFrom(currentLayer);
      setCopyYTo(currentLayer);
    }
  }, [tool]);
  
  useEffect(() => {
    dimsRef.current = { width, depth, height };
  }, [width, depth, height]);

  useEffect(() => {
    placingStructureRef.current = placingStructureId;
  }, [placingStructureId]);
  useEffect(() => {
    placingRotationRef.current = placingRotation;
  }, [placingRotation]);
  useEffect(() => {
    structuresRef.current = structures;
  }, [structures]);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  useEffect(() => {
    placingEntityRef.current = placingEntityName;
    if (placingEntityName) setPlacingStructureId(null);
  }, [placingEntityName]);
  useEffect(() => {
    if (placingStructureId) setPlacingEntityName(null);
  }, [placingStructureId]);
  useEffect(() => {
    if (!openPopover) return undefined;
    function onDocMouseDown(event:MouseEvent) {
      if (popoverAnchorRef.current && !popoverAnchorRef.current.contains(event.target)) {
        setOpenPopover(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openPopover]);
  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);
  useEffect(() => {
    moveSpeedRef.current = moveSpeed;
  }, [moveSpeed]);

  useEffect(() => {
    if (viewMode === "3d" && threeRef.current.renderer) {
      rebuildInstances(true);
    }
  }, [width, depth, height]);

  // ---- persistence: load on mount ----
  useEffect(() => {
    (async () => {
      try {
        const result = { STORAGE_KEY, value: await readJson<LevelData>(STORAGE_KEY)};
        if (result && result.value) {
          const data = result.value;
          applyLoadedData(data);
          if (data.cameraMode === "orbit" || data.cameraMode === "fly")
            setCameraMode(data.cameraMode);
          setStatus(STRINGS.en.loadedAutosave);
        }
      } catch (e) {
        // no saved state yet, that's fine
      }
      try {
        const texResult = await storage.get(TEXTURES_STORAGE_KEY);
        if (texResult && texResult.value) {
          const obj = JSON.parse(texResult.value);
          for (const k of Object.keys(obj)) {
            const id = Number(k);
            const dataUrl = obj[k];
            texturesRef.current.set(id, dataUrl);
            const img = new Image();
            img.onload = () => draw();
            img.src = dataUrl;
            textureImg2DRef.current.set(id, img);
          }
          setTextureVersion((v) => v + 1);
        }
      } catch (e) {
        // no saved textures yet, that's fine
      }
      try {
        const structResult = await storage.get(STRUCTURES_STORAGE_KEY);
        if (structResult && structResult.value) {
          const arr = JSON.parse(structResult.value);
          if (Array.isArray(arr))
            setStructures(arr);
        }
      } catch (e) {
        // no saved structures yet, that's fine
      }
      await refreshSaveSlots();
      await refreshPresets();
      setLoaded(true);
    })();
    // eslint-disable-next-line
  }, []);

  // ---- export / import ----
  function buildExportData(terrainVoxels:VoxelCell[], entities: readonly EntityDataId[], mapData: MapData):LevelData {
    const voxels:VoxelCell[] = [];
    for (const voxel of terrainVoxels) {
      voxels.push({...voxel});
    }
    return {
      mapSizeChunks: { x: mapData.gridX, y: mapData.gridY, z: mapData.gridZ },
      biomeName: mapData.biomeName,
      gameMode: mapData.gameMode,
      voxels: voxels,
      entities: entities.map((entity) => exportEntity(entity)),
    };
  }

  function parseLevelData(raw: unknown): LevelData {
    const data:LevelData = getDefaultLevelData();
    if(raw === null || typeof raw === "string")
      return data; // shouldn't we throw here instead?
    const dataPart = raw as Partial<LevelData>;
    if (dataPart.mapSizeChunks) {
      data.mapSizeChunks = {
        x: clamp(dataPart.mapSizeChunks.x, 1, MAX_CHUNKS.x),
        y: clamp(dataPart.mapSizeChunks.y, 1, MAX_CHUNKS.y),
        z: clamp(dataPart.mapSizeChunks.z, 1, MAX_CHUNKS.z),
      }
    }
    if (dataPart.biomeName) 
      data.biomeName = dataPart.biomeName;
    if (typeof dataPart.gameMode === "number") 
      data.gameMode = dataPart.gameMode;

    if(Array.isArray(dataPart.voxels)) {
      for(const rawVoxel of dataPart.voxels) {
        const {x, y, z, block, meta} = rawVoxel;
        if(isNum(x) && isNum(y) && isNum(z) && isNum(block)) // bad voxels are silently skipped for now
          data.voxels.push({...rawVoxel, meta: rawVoxel.meta || 0})
      }
    }

    data.entities = parseEntities(dataPart.entities);

    if (Array.isArray(dataPart.paletteLabels)) {
      data.paletteLabels = [];
      for(const pLabel of dataPart.paletteLabels)
        if(isNum(pLabel.id) && typeof (pLabel.label) === "string")
          data.paletteLabels.push(BLOCK_NAMES[pLabel.id] ? { ...pLabel, label: BLOCK_NAMES[pLabel.id] } : pLabel);
    }

    if (Array.isArray(dataPart.hotbar)) {
      data.hotbar = new Array(10).fill(null);
      for (let i = 0; i < 10; i++)
        if(isNum(dataPart.hotbar[i]))
          data.hotbar[i] = dataPart.hotbar[i] || null;
    }
    
    return data;
  }

  function applyLoadedData(raw:unknown) {
    const data = parseLevelData(raw); // backward compatibility for old saves
    const {x: gridX, y: gridY, z: gridZ} = data.mapSizeChunks;
    const {biomeName, gameMode} = data;
    setMapData({ gridX, gridY, gridZ, biomeName, gameMode });
 
    terrain.replaceAll(data.voxels);
    entities.replaceAll(data.entities);
    
    if (data.paletteLabels && data.paletteLabels.length > 0) {
      setPalette([...data.paletteLabels]);
    }
    if (data.hotbar) {
      setHotbar([...data.hotbar]);
    }   
  }

  function scheduleSave() {
    if (saveTimerRef.current) 
      clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const data = buildExportData(Array.from(terrain.cells()), entities.list(), latestRef.current.mapData);
        data.paletteLabels = latestRef.current.palette;
        data.hotbar = hotbarRef.current;
        data.cameraMode = latestRef.current.cameraMode;
        await writeJson(STORAGE_KEY, data);
        //await storage.set(STORAGE_KEY, JSON.stringify(data));
        setStatus(STRINGS.en.savedAt(new Date().toLocaleTimeString()));
      } catch (error) {
        setStatus(STRINGS.en.saveError);
      }
    }, 700);
  }

  // ---- textures ----
  async function saveTextures() {
    try {
      const obj = {};
      for (const [id, url] of texturesRef.current) obj[id] = url;
      await writeJson(TEXTURES_STORAGE_KEY, obj);
      //await storage.set(TEXTURES_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore, non-critical
    }
  }

  function handleTextureFile(blockId: number, file: File) {
    if (!file)
      return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      texturesRef.current.set(blockId, dataUrl);
      const img = new Image();
      img.onload = () => draw();
      img.src = dataUrl as string;
      textureImg2DRef.current.set(blockId, img);
      textureThreeCacheRef.current.delete(blockId);
      setTextureVersion((v) => v + 1);
      if (viewMode === "3d") 
        rebuildInstances();
      saveTextures();
    };
    reader.readAsDataURL(file);
  }

  function clearTexture(blockId: number) {
    texturesRef.current.delete(blockId);
    textureImg2DRef.current.delete(blockId);
    textureThreeCacheRef.current.delete(blockId);
    setTextureVersion((v) => v + 1);
    draw();
    if (viewMode === "3d")
      rebuildInstances();
    saveTextures();
  }

  // ---- bulk texture import (whole folder, matched by ID in filename) ----
  function parseIdFromFilename(name) {
    const stem = name.replace(/\.[^./\\]+$/, "");
    const match = stem.match(/(\d+)/);
    if (!match) return null;
    const id = parseInt(match[1], 10);
    return id >= 0 && id < AIR ? id : null;
  }

  function handleBulkFolderSelect(fileList:File[]) {
    const files = Array.from(fileList || []).filter((f) =>
      /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(f.name)
    );
    bulkTextureRows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    const rows = files
      .map((f) => ({
        file: f,
        name: f.name,
        id: parseIdFromFilename(f.name),
        previewUrl: URL.createObjectURL(f),
        include: true,
      }))
      .sort((a, b) => (a.id ?? 9999) - (b.id ?? 9999));
    setBulkTextureRows(rows);
  }

  function updateBulkRowId(index: number, id: number|string) {
    setBulkTextureRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, id: id === "" ? null : clampBlockId(id) } : r))
    );
  }

  function toggleBulkRow(index: number) {
    setBulkTextureRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, include: !r.include } : r))
    );
  }

  async function applyBulkTextures() {
    const rows = bulkTextureRows.filter((r) => r.include && r.id !== null);
    if (!rows.length) return;
    setBulkApplying(true);
    for (const row of rows) {
      if(row.id === null)
        continue;
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(row.file);
      });
      texturesRef.current.set(row.id, dataUrl);
      const img = new Image();
      img.onload = () => draw();
      img.src = dataUrl as string;
      textureImg2DRef.current.set(row.id, img);
      textureThreeCacheRef.current.delete(row.id);
    }
    setTextureVersion((v) => v + 1);
    if (viewMode === "3d")
      rebuildInstances();
    await saveTextures();
    setStatus(STRINGS.en.bulkTexturesApplied(rows.length));
    bulkTextureRows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setBulkTextureRows([]);
    setBulkApplying(false);
    setShowBulkTexturePanel(false);
  }

  function buildMaterialForBlock(blockId: number) {
    const dataUrl = texturesRef.current.get(blockId);
    if (dataUrl) {
      let tex = textureThreeCacheRef.current.get(blockId);
      if (!tex) {
        tex = new THREE.TextureLoader().load(dataUrl);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        textureThreeCacheRef.current.set(blockId, tex);
      }
      return new THREE.MeshLambertMaterial({ map: tex });
    }
    return new THREE.MeshLambertMaterial({ color: colorForId(blockId) });
  }

  // ---- structures library ----
  async function saveStructures(list) {
    try {
      await writeJson(STRUCTURES_STORAGE_KEY, list);
      //await storage.set(STRUCTURES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      // ignore, non-critical
    }
  }

  function importStructureFiles(fileList:File[]) {
    const files = Array.from(fileList || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result?.toString() || "");
          if (!Array.isArray(data.voxels))
            return;
          const sizeX = data.sizeX || 1;
          const sizeY = data.sizeY || 1;
          const sizeZ = data.sizeZ || 1;
          const entry:Structure = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: data.name || file.name.replace(/\.json$/i, ""),
            category: ["building", "dungeon", "decoration", "other"].includes(data.category)
              ? data.category
              : "other",
            sizeX,
            sizeY,
            sizeZ,
            voxels: data.voxels,
            enabled: true,
            count: 3,
            rotate: true,
            minSpacing: 2,
            requireFlat: true,
          };
          setStructures((prev) => {
            const next = [...prev, entry];
            saveStructures(next);
            return next;
          });
        } catch (e) {
          setStatus(STRINGS.en.importError((e as Error).message));
        }
      };
      reader.readAsText(file);
    });
  }

  // ---- structure rotation & preview ----

  function ensureStructureThumb(entry) {
    if (!structureThumbsRef.current.has(entry.id)) {
      try {
        structureThumbsRef.current.set(entry.id, generateStructureThumbnail(entry));
        setThumbVersion((v) => v + 1);
      } catch (e) {
        // canvas not available yet, will retry on next render
      }
    }
    return structureThumbsRef.current.get(entry.id);
  }

  function stampStructureAt(anchorX: number, anchorY: number, anchorZ: number, entry: Structure, rotationSteps) {
    const dims = dimsRef.current;
    const rotated = getRotatedStructure(entry, rotationSteps);
    beginStroke();
    for (const v of rotated.voxels) {
      const wx = anchorX + v.x;
      const wy = anchorY + v.y;
      const wz = anchorZ + v.z;
      if (wx < 0 || wx >= dims.width || wy < 0 || wy >= dims.height || wz < 0 || wz >= dims.depth)
        continue;
      const key = keyOf(wx, wy, wz);
      //const oldEntry = voxelsRef.current.get(key);
      const oldEntry = terrain.get(wx, wy, wz);
      const oldBlock = oldEntry ? oldEntry.block : AIR;
      setVoxel(wx, wy, wz, v.block, v.meta || 0);
    }
    commitStroke();
  }

  // ---- entity placement (not voxels - separate marker list) ----
  function placeEntityAt(name:string, x:number, y:number, z:number) {
    const dims = dimsRef.current;
    if (x < 0 || x >= dims.width || y < 0 || y >= dims.height || z < 0 || z >= dims.depth)
      return;
    if (
      SINGLETON_ENTITY_NAMES.has(name) &&
      entities.list().some((ent) => ent.name === name)
    ) {
      setStatus(STRINGS.en.entitySingletonBlocked(name));
      return;
    }
    if (SERVICE_ENTITY_NAMES.has(name)) {
      setStatus(STRINGS.en.entityService(name));
      return;
    }
    const taken = new Set();
    for (const other of entities.list()) {
      if (!DEVICE_CELLS[other.name])
        continue;
      for (const [cx, cy, cz] of DEVICE_CELLS[other.name])
        taken.add(keyOf(other.x + cx, other.y + cy, other.z + cz));
    }
    if (DEVICE_CELLS[name]) {
      for (const [cx, cy, cz] of DEVICE_CELLS[name]) {
        if (taken.has(keyOf(x + cx, y + cy, z + cz))) {
          setStatus(STRINGS.en.entityOverlap(name));
          return;
        }
      }
    }
    const instance:EntityDataId = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name,
      x,
      y,
      z,
      items: [],
    };
    entities.add({ name, x, y, z, items: [] });
  }

  function applyServerEdits(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const edits = JSON.parse(reader.result?.toString() || "");
        if (!Array.isArray(edits)) 
          throw new Error("expected an array of [x, y, z, block]");
        const dims = dimsRef.current;
        beginStroke();
        let n = 0;
        for (const ed of edits) {
          if (!Array.isArray(ed) || ed.length < 4)
            continue;
          const [x, y, z, block] = ed.map(Number) ;
          if(!x || !y || !z || !block) continue;
          if (x < 0 || x >= dims.width || y < 0 || y >= dims.height || z < 0 || z >= dims.depth) continue;
          setVoxel(x, y, z, block, 0);
          n++;
        }
        commitStroke();

        setStatus(STRINGS.en.editsApplied(n));
      } catch (err) {
        setStatus(STRINGS.en.importError((err as Error).message));
      }
    };
    reader.readAsText(file);
  }

  function saveCurrentMapAsStructure(name: string, category: string) {
    // const entries = Array.from(voxelsRef.current.entries());
    const entries = Array.from(terrain.getAllRaw());
    if (!entries.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const [key] of entries) {
      const parts = key.split(",");
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      const z = Number(parts[2]);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    const voxels = entries.map(([key, v]) => {
      const parts = key.split(",");
      return {
        x: Number(parts[0]) - minX,
        y: Number(parts[1]) - minY,
        z: Number(parts[2]) - minZ,
        block: v.block,
        meta: v.meta || 0,
      };
    });
    const entry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: name || "Structure",
      category: ["building", "dungeon", "decoration", "other"].includes(category)
        ? category
        : "other",
      sizeX: maxX - minX + 1,
      sizeY: maxY - minY + 1,
      sizeZ: maxZ - minZ + 1,
      voxels,
      enabled: true,
      count: 3,
      rotate: true,
      minSpacing: 2,
      requireFlat: true,
    };
    setStructures((prev) => {
      const next = [...prev, entry];
      saveStructures(next);
      return next;
    });
    setStatus(STRINGS.en.structureSaved(entry.name));
  }

  

  function deleteStructure(id) {
    setStructures((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStructures(next);
      return next;
    });
  }

  function toggleStructure(id) {
    setStructures((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      saveStructures(next);
      return next;
    });
  }

  function setStructureCount(id, count) {
    setStructures((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, count } : s));
      saveStructures(next);
      return next;
    });
  }

  function updateStructureField(id, field, value) {
    setStructures((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
      saveStructures(next);
      return next;
    });
  }

  // ---- voxel editing ----
  function setVoxel(x:number, y:number, z:number, block:number, meta?: number) {
    terrain.set(x, y, z, block, meta);
  }

  function beginStroke() {
    terrain.begin();
  }

  function commitStroke() {
    terrain.commit();
  }

  // ---- mirror painting ----
  function forEachMirrored(x: number, y: number, z: number, fn: (x: number, y: number, z: number) => void) {
    fn(x, y, z);
    const mx = width - 1 - x;
    const mz = depth - 1 - z;
    if (mirrorX && mx !== x)
      fn(mx, y, z);
    if (mirrorZ && mz !== z)
      fn(x, y, mz);
    if (mirrorX && mirrorZ && (mx !== x || mz !== z))
      fn(mx, y, mz);
  }

  function setVoxelMirrored(x: number, y: number, z: number, block: number, meta: number) {
    forEachMirrored(x, y, z, (a, b, c) => setVoxel(a, b, c, block, meta));
  }

  // For recolor tool
  function paintVoxel(x: number, y: number, z: number, block: number) {
    const v = terrain.get(x, y, z);
    if (!v)
      return;                      // air: nothing to recolor
    terrain.set(x, y, z, block, v.meta); // keep meta, change only the block
  }
  function paintMirrored(x: number, y: number, z: number, block: number) {
    forEachMirrored(x, y, z, (a, b, c) => paintVoxel(a, b, c, block));
  }

  // ---- copy / paste a rectangular volume (spans a Y-layer range) ----
  function copyRegion(x0: number, z0: number, x1: number, z1: number) {
    const minX = Math.max(0, Math.min(x0, x1));
    const maxX = Math.min(width - 1, Math.max(x0, x1));
    const minZ = Math.max(0, Math.min(z0, z1));
    const maxZ = Math.min(depth - 1, Math.max(z0, z1));
    const minY = Math.max(0, Math.min(copyYFrom, copyYTo));
    const maxY = Math.min(height - 1, Math.max(copyYFrom, copyYTo));
    const cells:{
      dx: number,
      dy: number,
      dz: number,
      block: number,
      meta: number
    }[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          // const v = voxelsRef.current.get(keyOf(x, y, z));
          const v = terrain.get(x, y, z);
          if (v)
            cells.push({
              dx: x - minX,
              dy: y - minY,
              dz: z - minZ,
              block: v.block,
              meta: v.meta || 0,
            });
        }
      }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const d = maxZ - minZ + 1;
    clipboardRef.current = { w, h, d, cells };
    setClipboardInfo({ w, h, d, count: cells.length });
    setTool("paste");
  }

  function pasteRegionAt(x0: number, z0: number) {
    const clip = clipboardRef.current;
    if (!clip) return;
    beginStroke();
    for (const c of clip.cells) {
      const x = x0 + c.dx;
      const y = currentLayer + c.dy;
      const z = z0 + c.dz;
      if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) continue;
      setVoxelMirrored(x, y, z, c.block, c.meta);
    }
    commitStroke();
  }

  // ---- road / path tool ----
  function drawRoad(x0: number, z0: number, x1: number, z1: number, widthBlocks: number, pathBlock: number, followSurface = false) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0), 1);
    const r = Math.max(0, Math.floor(widthBlocks / 2));
    beginStroke();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = Math.round(x0 + (x1 - x0) * t);
      const cz = Math.round(z0 + (z1 - z0) * t);
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dz * dz > r * r + 0.5) continue;
          const wx = cx + dx;
          const wz = cz + dz;
          if (wx < 0 || wx >= width || wz < 0 || wz >= depth) continue;
          const wy = followSurface ? terrain.surfaceY(wx, wz, height - 1) : currentLayer;
          if (wy < 0)
            continue;
          setVoxelMirrored(wx, wy, wz, pathBlock, 0);
        }
      }
    }
    commitStroke();
  }

  function randomizeAllParams() {
    const r = (min, max) => Math.round(min + Math.random() * (max - min));
    setRandSeed(Math.floor(Math.random() * 1000000));
    setRngParameters((prev) => ({
      ...prev,
      randMinH: r(0, 5),
      randMaxH: r(15, 40),

      randGroundDepth: r(15, 50),
      randHillStrength: r(20, 70),
      randMountainHeight: r(15, 45),
      randPlateauHeight: r(10, 30),
      randValleyDepth: r(8, 25),
      randRiverWidth: r(2, 15),
      randLakeSize: r(2, 8),
      randCaveDensity: r(15, 50),
      randTreeDensity: r(5, 30),
      randForestDensity: r(30, 70),
      randOreCount: r(10, 80),
      randErosionStrength: r(20, 60),

      randIslandIrregularity: r(20, 80),
      randIslandSize: (["small", "medium", "large"][Math.floor(Math.random() * 3)])!,
      randBottomRoughness: r(10, 35),
      randMaxThickness: r(15, 35),
    }));
    setStatus(STRINGS.en.randomizedAll);
  }


  function generateRandomTerrain(params:RngParams) {
    const seed = Number(randSeed) || Math.floor(Math.random() * 1e9);
    const dimensions = { width, depth, height };
    const normP = normalizeRngParameters(params, width, depth, height);
    const { grid, heightMap, isWaterMap } = generateTerrain(dimensions, seed, normP, structures);
    threeRef.current.orbit.initialized = false; // the rebuild below re-frames the orbit camera
    threeRef.current.fly.initialized = false;   // and the fly camera

    terrain.transaction((store) => {
      // Clear
      for (const cell of Array.from(terrain.cells()))
        store.set(cell.x, cell.y, cell.z, AIR);
      // Rewrite with newly generated terrain
      for (const cell of grid.cells())
        store.set(cell.x, cell.y, cell.z, cell.block, cell.meta);
    });
    
    
    setStatus(STRINGS.en.generatedSeed(seed));

    lastHeightMapRef.current = {
      width,
      depth,
      height,
      heightMap/*: heightMap.slice()*/,
      isWaterMap/*: Array.from(isWaterMap)*/,
    };
  }

  // ---- targeted regeneration (decor / trees / ore only, reuses last heightMap) ----

  function regenerateDecoHandler(params:RngParams) {
    const snap = lastHeightMapRef.current;
    if (!snap || snap.width !== width || snap.depth !== depth || snap.height !== height) {
      setStatus(STRINGS.en.regenNeedsGenerate);
      return;
    }
    const seed = Math.floor(Math.random() * 1e9);
    const normParams = normalizeRngParameters(params, snap.width, snap.depth, snap.height);
    const regenerated = regenerateDeco({width, depth, height}, seed, normParams, snap, terrain);
    if(!regenerated)
      setStatus(STRINGS.en.regenNothingToDo);
    else
      setStatus(STRINGS.en.regenDone);
  }

  function regenerateVegHandler(params:RngParams) {
    const snap = lastHeightMapRef.current;
    if (!snap || snap.width !== width || snap.depth !== depth || snap.height !== height) {
      setStatus(STRINGS.en.regenNeedsGenerate);
      return;
    }
    const seed = Math.floor(Math.random() * 1e9);
    const normParams = normalizeRngParameters(params, width, depth, height);

    const regenerated = regenerateVeg({width, depth, height}, seed, normParams, snap, terrain);
    if(!regenerated)
      setStatus(STRINGS.en.regenNothingToDo);
    else
      setStatus(STRINGS.en.regenDone);
  }

  function regenerateOreHandler(params:RngParams):void {
    
    const snap = lastHeightMapRef.current;
    if (!snap || snap.width !== width || snap.depth !== depth || snap.height !== height) {
      setStatus(STRINGS.en.regenNeedsGenerate);
      return;
    }
    const seed = Math.floor(Math.random() * 1e9);
    const normParams = normalizeRngParameters(params, width, depth, height);

    const regenerated = regenerateOre({width, depth, height}, seed, normParams, snap, terrain);
    if(!regenerated)
      setStatus(STRINGS.en.regenNothingToDo);
    else
      setStatus(STRINGS.en.regenDone);
  }

  // ---- 3D view / builder (Three.js) ----

  function initThree() {
    const canvas = canvas3dRef.current;
    if (!canvas || threeRef.current.renderer) return;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x08090c, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(1, 1.6, 1);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xaabbff, 0.25);
    dirLight2.position.set(-1, -0.4, -1);
    scene.add(dirLight2);

    threeRef.current.renderer = renderer;
    threeRef.current.scene = scene;
    threeRef.current.camera = camera;
    threeRef.current.raycaster = new THREE.Raycaster();
  }

  function clampPhi(p: number) {
    return Math.max(0.15, Math.min(Math.PI - 0.15, p));
  }

  function updateCameraFromOrbit() {
    const st = threeRef.current;
    if (!st.camera) return;
    const { theta, phi, radius, target } = st.orbit;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    st.camera.position.set(x, y, z);
    st.camera.lookAt(target.x, target.y, target.z);
  }

  function updateCameraFromFly() {
    const st = threeRef.current;
    if (!st.camera) return;
    st.camera.rotation.order = "YXZ";
    st.camera.rotation.set(st.fly.pitch, st.fly.yaw, 0);
    st.camera.position.set(st.fly.position.x, st.fly.position.y, st.fly.position.z);
  }

  function rebuildInstances(resetCamera = false) {
    function disposeMesh(mesh: THREE.Mesh) {
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials)
        mat.dispose();
    }
    const st = threeRef.current;
    const scene = st.scene;
    if (!scene) return;
    const dims = dimsRef.current;

    for (const g of st.groups.values()) {
      scene.remove(g.mesh);
      disposeMesh(g.mesh);
    }
    st.groups = new Map();

    if (st.planeMesh) {
      scene.remove(st.planeMesh);
      disposeMesh(st.planeMesh);
      st.planeMesh = null;
    }
    if (st.gridHelper) {
      scene.remove(st.gridHelper);
      st.gridHelper = null;
    }

    const byBlock = new Map<number, {x: number, y: number, z: number}[]>();
    for (const voxel of Array.from(terrain.cells())) {
      let arr = byBlock.get(voxel.block);
      if (!arr) {
        arr = [];
        byBlock.set(voxel.block, arr);
      }
      const {x, y, z} = voxel;
      arr.push({ x, y, z});
    }

    const dummy = new THREE.Object3D();
    for (const [blockId, list] of byBlock) {
      const capacity = Math.max(list.length + 64, 64);
      const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
      const material = buildMaterialForBlock(blockId);
      const mesh = new THREE.InstancedMesh(geometry, material, capacity);
      mesh.userData.blockId = blockId;
      const coords = new Array<{x: number, y: number, z: number}>(capacity);
      const indexMap = new Map<string, number>();
      let i = 0;
      for (const c of list) {
        dummy.position.set(c.x + 0.5, c.y + 0.5, c.z + 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        coords[i] = c;
        indexMap.set(keyOf(c.x, c.y, c.z), i);
        i++;
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      st.groups.set(blockId, { mesh, coords, indexMap, count: i, capacity });
    }
    const planeGeo = new THREE.PlaneGeometry(
      Math.max(dims.width, 1),
      Math.max(dims.depth, 1)
    );
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0e1117,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.set(dims.width / 2, 0, dims.depth / 2);
    scene.add(planeMesh);

    const gridSize = Math.max(dims.width, dims.depth, 1);
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridSize,
      0x2a3550,
      0x1a2030
    );
    gridHelper.position.set(dims.width / 2, 0.01, dims.depth / 2);
    scene.add(gridHelper);

    st.planeMesh = planeMesh;
    st.gridHelper = gridHelper;

    // Camera change
    if(resetCamera || !st.orbit.initialized) {
      st.orbit.target.set(
        dims.width / 2,
        Math.min(dims.height, 20) / 2,
        dims.depth / 2,
      );
      st.orbit.targetGoal = st.orbit.target.clone();
    }
    if (!st.orbit.initialized) {
      st.orbit.radius =
        Math.max(dims.width, dims.depth, dims.height, 4) * 1.3 + 10;
      st.orbit.targetRadius = st.orbit.radius;
      st.orbit.initialized = true;
    }

    if (!st.fly.initialized) {
      const cx = dims.width / 2;
      const cy = Math.min(dims.height, 20) / 2;
      const cz = dims.depth / 2;
      const dist =
        Math.max(dims.width, dims.depth, dims.height, 4) * 0.9 + 12;
      const px = cx;
      const py = cy + dist * 0.45;
      const pz = cz + dist;
      st.fly.position.set(px, py, pz);
      const dx = cx - px;
      const dy = cy - py;
      const dz = cz - pz;
      const horiz = Math.sqrt(dx * dx + dz * dz) || 0.0001;
      st.fly.yaw = Math.atan2(-dx, -dz);
      st.fly.pitch = Math.atan2(dy, horiz);
      st.fly.velocity.set(0, 0, 0);
      st.fly.initialized = true;
    }

    if (cameraModeRef.current === "orbit") updateCameraFromOrbit();
    else updateCameraFromFly();
  }

  function rebuildEntityMarkers() {
    const st = threeRef.current;
    const scene = st.scene;
    if (!scene) return;

    if (entityMarkersGroupRef.current) {
      scene.remove(entityMarkersGroupRef.current);
      entityMarkersGroupRef.current.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      entityMarkersGroupRef.current = null;
    }

    if(entities.size === 0)
      return;
    const instances = entities.list();

    const group = new THREE.Group();
    const markerGeometry = new THREE.BoxGeometry(0.5, 0.9, 0.5);
    const cellGeometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const materials = {};
    function materialFor(category: string, cell: boolean) {
      const key = category + (cell ? ":cell" : "");
      if (!materials[key]) {
        materials[key] = new THREE.MeshLambertMaterial({
          color: ENTITY_COLORS[category] || 0xff5fa2,
          transparent: cell,
          opacity: cell ? 0.35 : 1,
          depthWrite: !cell,
        });
      }
      return materials[key];
    }

    for (const inst of instances) {
      const category = ENTITY_CATEGORY.get(inst.name) || "service";
      if (DEVICE_CELLS[inst.name]) {
        for (const [cx, cy, cz] of DEVICE_CELLS[inst.name]) {
          const cellMesh = new THREE.Mesh(cellGeometry, materialFor(category, true));
          cellMesh.position.set(inst.x + cx + 0.5, inst.y + cy + 0.5, inst.z + cz + 0.5);
          group.add(cellMesh);
        }
      } else {
        const mesh = new THREE.Mesh(markerGeometry, materialFor(category, false));
        mesh.position.set(inst.x + 0.5, inst.y + 0.45, inst.z + 0.5);
        group.add(mesh);
      }
    }

    scene.add(group);
    entityMarkersGroupRef.current = group;
  }

  function getOrCreateGroup(blockId: number) {
    const st = threeRef.current;
    if(!st.scene) 
      return;
    let g = st.groups.get(blockId);
    if (g !== undefined)
      return g;
    const capacity = 64;
    const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const material = buildMaterialForBlock(blockId);
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.userData.blockId = blockId;
    mesh.count = 0;
    st.scene.add(mesh);
    g = { mesh, coords: new Array(capacity), indexMap: new Map(), count: 0, capacity };
    st.groups.set(blockId, g);
    return g;
  }

  function growGroup(blockId: number) {
    const st = threeRef.current;
    if(!st.scene) 
      return;
    const g = st.groups.get(blockId);
    if (!g) return;
    const newCapacity = g.capacity * 2;
    const newMesh = new THREE.InstancedMesh(g.mesh.geometry, g.mesh.material, newCapacity);
    newMesh.userData.blockId = blockId;
    const m = new THREE.Matrix4();
    for (let i = 0; i < g.count; i++) {
      g.mesh.getMatrixAt(i, m);
      newMesh.setMatrixAt(i, m);
    }
    newMesh.count = g.count;
    newMesh.instanceMatrix.needsUpdate = true;
    st.scene.remove(g.mesh);
    st.scene.add(newMesh);
    g.mesh = newMesh;
    g.capacity = newCapacity;
    const newCoords = new Array(newCapacity);
    for (let i = 0; i < g.count; i++) newCoords[i] = g.coords[i];
    g.coords = newCoords;
  }

  function addInstance(blockId: number, x:number, y:number, z:number) {
    if (blockId === AIR)
      return;
    let g = getOrCreateGroup(blockId);
    if (g === undefined) {
      return;
    }
    const key = keyOf(x, y, z);
    if (g.indexMap.has(key))
      return;
    if (g.count >= g.capacity) {
      growGroup(blockId);
      g = threeRef.current.groups.get(blockId);
      if (!g)
        return;
    }
    const idx = g.count;
    const dummy = new THREE.Object3D();
    dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
    dummy.updateMatrix();
    g.mesh.setMatrixAt(idx, dummy.matrix);
    g.coords[idx] = { x, y, z };
    g.indexMap.set(key, idx);
    g.count++;
    g.mesh.count = g.count;
    g.mesh.instanceMatrix.needsUpdate = true;
  }

  function removeInstanceAtCoord(blockId: number, x:number, y:number, z:number) {
    const st = threeRef.current;
    const g = st.groups.get(blockId);
    if (!g)
      return;
    const key = keyOf(x, y, z);
    const idx = g.indexMap.get(key);
    if (idx === undefined)
      return;
    const lastIdx = g.count - 1;
    if (idx !== lastIdx) {
      const lastCoord = g.coords[lastIdx]!;
      const m = new THREE.Matrix4();
      g.mesh.getMatrixAt(lastIdx, m);
      g.mesh.setMatrixAt(idx, m);
      g.coords[idx] = lastCoord;
      g.indexMap.set(keyOf(lastCoord.x, lastCoord.y, lastCoord.z), idx);
    }
    g.indexMap.delete(key);
    //g.coords[lastIdx] = null;
    g.count--;
    g.mesh.count = g.count;
    g.mesh.instanceMatrix.needsUpdate = true;
  }

  function syncVoxel3D(x: number, y: number, z: number, oldBlock: number, newBlock: number) {
    if (oldBlock === newBlock)
      return;
    if (oldBlock !== AIR)
      removeInstanceAtCoord(oldBlock, x, y, z);
    if (newBlock !== AIR)
      addInstance(newBlock, x, y, z);
  }

  function panOrbitByUnits(right: number, forward: number, up: number) {
    const o = threeRef.current.orbit;
    const s = Math.sin(o.theta);
    const c = Math.cos(o.theta);
    // ground-plane basis from the camera heading (theta)
    o.targetGoal.x += right * c - forward * s;
    o.targetGoal.z += -right * s - forward * c;
    o.targetGoal.y += up;
  }

  function panOrbit(dx: number, dy: number) {
    const st = threeRef.current;
    const cam = st.camera;
    if (!cam) return;
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const worldUp = new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3()
      .crossVectors(forward, worldUp)
      .normalize();
    const upVec = new THREE.Vector3()
      .crossVectors(rightVec, forward)
      .normalize();
    const scale = st.orbit.radius * 0.0015;
    st.orbit.targetGoal.x -= rightVec.x * dx * scale - upVec.x * dy * scale;
    st.orbit.targetGoal.y -= rightVec.y * dx * scale - upVec.y * dy * scale;
    st.orbit.targetGoal.z -= rightVec.z * dx * scale - upVec.z * dy * scale;
  }

  function raycastTargets() {
    const st = threeRef.current;
    const targets:any[] = [];
    if (st.planeMesh) targets.push(st.planeMesh);
    for (const g of st.groups.values()) {
      if (g.count > 0) targets.push(g.mesh);
    }
    return targets;
  }

  function pickWorldPoint(ndcX: number, ndcY: number): THREE.Vector3 | null {
    const st = threeRef.current;
    if (!st.camera || !st.raycaster)
      return null;
    st.raycaster.setFromCamera(new THREE.Vector2( ndcX, ndcY ), st.camera);
    const hits = st.raycaster.intersectObjects(raycastTargets(), false);
    const hit = hits.find((h) => h.object !== st.planeMesh); // ignore the invisible ground plane
    return hit ? hit.point.clone() : null;
  }

  function pickBlockAtCenter(): { coord: THREE.Vector3; dist: number } | null {
    const st = threeRef.current;
    if (!st.camera || !st.raycaster)
      return null;
    st.camera.updateMatrixWorld(); // the render loop is stopped by now
    st.raycaster.setFromCamera(new THREE.Vector2(0, 0), st.camera);
    const hits = st.raycaster.intersectObjects(raycastTargets(), false);
    for (const hit of hits) {
      if (hit.object === st.planeMesh)
        continue;
      const cell = coordFromHit(hit);
      if (cell)
        return { coord: new THREE.Vector3(cell.x, cell.y, cell.z), dist: hit.distance };
    }
    return null;
  }

  // cursor first, then the center of the view, else null (= keep the current pivot)
  function pickPivot(clientX: number, clientY: number): THREE.Vector3 | null {
    const canvas = canvas3dRef.current;
    if (!canvas)
      return null;
    const rect = canvas.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((clientY - rect.top) / rect.height) * 2 + 1;
    return pickWorldPoint(mx, my) ?? pickWorldPoint(0, 0);
  }

  function zoomAnchor(clientX: number, clientY: number): THREE.Vector3 | null {
    const now = performance.now();
    const a = zoomAnchorRef.current;
    if (a && now - a.t < DEFAULT_SETTINGS.ZOOM_GESTURE_MS && Math.abs(clientX - a.x) < 4 && Math.abs(clientY - a.y) < 4) {
      a.t = now; // the gesture continues, so reuse the anchor (a null result is cached too)
      return a.pivot;
    }
    const pivot = pickPivot(clientX, clientY);
    zoomAnchorRef.current = { pivot, x: clientX, y: clientY, t: now };
    return pivot;
  }

  function coordFromHit(hit: THREE.Intersection) {
    const st = threeRef.current;
    if (hit.object === st.planeMesh)
      return null;
    const blockId = hit.object.userData ? hit.object.userData.blockId : undefined;
    const g = blockId !== undefined ? st.groups.get(blockId) : null;
    if (!g || hit.instanceId === undefined)
      return null;
    const coord = g.coords[hit.instanceId];
    if (!coord)
      return null;
    return { ...coord, blockId };
  }

  function performMouseRaycastAction(clientX: number, clientY: number, isContinuous: boolean) {
    const st = threeRef.current;
    const canvas = canvas3dRef.current;
    if (!canvas || !st.camera || !st.raycaster) return;
    const dims = dimsRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((clientY - rect.top) / rect.height) * 2 + 1;
    st.raycaster.setFromCamera( new THREE.Vector2(mx, my), st.camera);

    const targets = raycastTargets();
    if (!targets.length)
      return;
    const hits = st.raycaster.intersectObjects(targets, false);
    if (!hits.length)
      return;
    const hit = hits[0]!;
    const isErase = toolRef.current === "eraser";
    const isPaint = toolRef.current === "paint";
    let cx: number, cy: number, cz: number;

    const hitCoord = coordFromHit(hit);
    if (hitCoord !== null) {
      if (isErase || isPaint) {
        cx = hitCoord.x;
        cy = hitCoord.y;
        cz = hitCoord.z;
      } else {
        const n = hit.face?.normal || {x: 0, y:0, z:0};
        cx = hitCoord.x + Math.round(n.x);
        cy = hitCoord.y + Math.round(n.y);
        cz = hitCoord.z + Math.round(n.z);
      }
    } else {
      if (isErase || isPaint)
        return;
      cx = Math.floor(hit.point.x);
      cz = Math.floor(hit.point.z);
      cy = 0;
    }

    if (
      cx < 0 ||
      cx >= dims.width ||
      cz < 0 ||
      cz >= dims.depth ||
      cy < 0 ||
      cy >= dims.height
    )
      return;

    if (!isErase && placingEntityRef.current) {
      if (isContinuous) {
        setCurrentLayer(cy);
        return;
      }
      placeEntityAt(placingEntityRef.current, cx, cy, cz);
      setCurrentLayer(cy);
      return;
    }

    if (!isErase && placingStructureRef.current) {
      if (isContinuous) {
        setCurrentLayer(cy);
        return;
      }
      const entry = structuresRef.current.find((s) => s.id === placingStructureRef.current);
      if (entry) stampStructureAt(cx, cy, cz, entry, placingRotationRef.current);
      setCurrentLayer(cy);
      return;
    }

    if (toolRef.current !== "pencil" && !isErase && !isPaint)
      return; // early exit if no tool is selected
    const oldEntry = terrain.get(cx,cy,cz);
    const oldBlock = oldEntry ? oldEntry.block : AIR;
    const newBlock = isErase ? AIR : selectedBlockRef.current;
    // separate early handler + exit for changing block
    if (isPaint) {
      paintVoxel(cx, cy, cz, selectedBlockRef.current);
      setCurrentLayer(cy);
      return;
    }
    setVoxel(cx, cy, cz, newBlock, 0);
    setCurrentLayer(cy);
  }

  function raycastFromCamera():THREE.Intersection | null {
    const st = threeRef.current;
    if (!st.camera || !st.raycaster)
      return null;
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(st.camera.quaternion);
    st.raycaster.set(st.camera.position, dir);
    const targets = raycastTargets();
    if (!targets.length)
      return null;
    const hits = st.raycaster.intersectObjects(targets, false);
    return hits.length > 0 ? hits[0]! : null;
  }

  function performBreak() {
    const hit = raycastFromCamera();
    if (!hit) return;
    const hitCoord = coordFromHit(hit);
    if (!hitCoord) return;
    const dims = dimsRef.current;
    const { x: cx, y: cy, z: cz, blockId } = hitCoord;
    if (
      cx < 0 ||
      cx >= dims.width ||
      cz < 0 ||
      cz >= dims.depth ||
      cy < 0 ||
      cy >= dims.height
    )
      return;
    setVoxel(cx, cy, cz, AIR, 0);
    setCurrentLayer(cy);
  }

  function performPlace():void {
    const hit = raycastFromCamera();
    if (hit === null)
      return;
    const dims = dimsRef.current;
    let cx: number, cy: number, cz: number;
    const hitCoord = coordFromHit(hit);
    if (hitCoord) {
      const n = hit.face?.normal || {x:0, y:0, z:0};
      cx = hitCoord.x + Math.round(n.x);
      cy = hitCoord.y + Math.round(n.y);
      cz = hitCoord.z + Math.round(n.z);
    } else {
      cx = Math.floor(hit.point.x);
      cz = Math.floor(hit.point.z);
      cy = 0;
    }
    if (
      cx < 0 ||
      cx >= dims.width ||
      cz < 0 ||
      cz >= dims.depth ||
      cy < 0 ||
      cy >= dims.height
    )
      return;

    if (placingEntityRef.current) {
      placeEntityAt(placingEntityRef.current, cx, cy, cz);
      setCurrentLayer(cy);
      return;
    }

    if (placingStructureRef.current) {
      const entry = structuresRef.current.find((s) => s.id === placingStructureRef.current);
      if (entry) stampStructureAt(cx, cy, cz, entry, placingRotationRef.current);
      setCurrentLayer(cy);
      return;
    }

    // const oldEntry = voxelsRef.current.get( keyOf(cx, cy, cz));
    const oldEntry = terrain.get( cx, cy, cz);
    const oldBlock = oldEntry ? oldEntry.block : AIR;
    const newBlock = selectedBlockRef.current;
    setVoxel(cx, cy, cz, newBlock, 0);
    // syncVoxel3D(cx, cy, cz, oldBlock, newBlock);
    setCurrentLayer(cy);
  }

  function attachOrbitListeners(canvas: HTMLCanvasElement) {
    const st = threeRef.current;
    function onMouseDown(event: MouseEvent) {
      st.drag.isDown = true;
      st.drag.button = event.button;
      st.drag.lastX = event.clientX;
      st.drag.lastY = event.clientY;
      // painting on LMB
      if (event.button === 0) {
        beginStroke();
        performMouseRaycastAction(event.clientX, event.clientY, false);
        return;
      }
      // rotating on RMB
      if (event.button === 2 && !event.shiftKey) {
        zoomAnchorRef.current = null; // reset previous zoom anchor ref if we rotate the camera
        const pivot = pickPivot(event.clientX, event.clientY);
        if (pivot)
          setOrbitPivot(pivot);
        return;
      }
    }
    function onMouseMove(event: MouseEvent) {
      if (!st.drag.isDown) return;
      const dx = event.clientX - st.drag.lastX;
      const dy = event.clientY - st.drag.lastY;
      if (st.drag.button === 0) {
        performMouseRaycastAction(event.clientX, event.clientY, true);
      } else if (st.drag.button === 2 && !event.shiftKey) {
        st.orbit.thetaDelta -= dx * 0.008;
        st.orbit.phiDelta -= dy * 0.008;
      } else if (st.drag.button === 1 || (st.drag.button === 2 && event.shiftKey)) {
        panOrbit(dx, dy);
      }
      st.drag.lastX = event.clientX;
      st.drag.lastY = event.clientY;
    }
    function onMouseUp(event: MouseEvent) {
      if (st.drag.isDown && event.button === st.drag.button) {
        if (event.button === 0) commitStroke();
        st.drag.isDown = false;
      }
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const delta = event.deltaY || event.deltaX; // some browsers report Shift+wheel as horizontal
        if (delta === 0) return;
      const dims = dimsRef.current;
      const maxR = Math.max(dims.width, dims.depth, dims.height, 4) * 4 + 20;
      const oldR = st.orbit.targetRadius;
      const step = Math.pow(DEFAULT_SETTINGS.ZOOM_ORBIT_STEP, event.shiftKey ? DEFAULT_SETTINGS.ZOOM_SHIFT_MULT : 1);
      const newR = Math.max(1, Math.min(maxR, oldR * (delta > 0 ? step : 1 / step)));
      const factor = newR / oldR; // the real ratio after clamping, so hitting a limit doesn't drift the view
      if (factor === 1)
        return;
      const pivot = zoomAnchor(event.clientX, event.clientY);   // cursor, then view center, else null
      if (pivot) {
        const g: THREE.Vector3 = st.orbit.targetGoal;
        g.x = pivot.x + (g.x - pivot.x) * factor;
        g.y = pivot.y + (g.y - pivot.y) * factor;
        g.z = pivot.z + (g.z - pivot.z) * factor;
      }
      st.orbit.targetRadius = newR;
    }
    function onContextMenu(event) {
      event.preventDefault();
    }
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }

  function attachFlyListeners(canvas: HTMLCanvasElement) {
    const st = threeRef.current;

    function onCanvasClick() {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    }
    function onPointerLockChange() {
      st.locked = document.pointerLockElement === canvas;
      setIsLocked(st.locked);
      if (st.locked) setPointerLockFailed(false);
      if (!st.locked) {
        st.leftDown = false;
        st.keys.forward = false;
        st.keys.back = false;
        st.keys.left = false;
        st.keys.right = false;
        st.keys.up = false;
        st.keys.down = false;
      }
    }
    function onPointerLockError() {
      setPointerLockFailed(true);
    }
    function onMouseMove(e: MouseEvent) {
      if (!st.locked) return;
      const sens = 0.0022;
      st.fly.yaw -= e.movementX * sens;
      st.fly.pitch -= e.movementY * sens;
      const lim = Math.PI / 2 - 0.02;
      st.fly.pitch = Math.max(-lim, Math.min(lim, st.fly.pitch));
    }
    function onMouseDown(e: MouseEvent) {
      if (!st.locked) return;
      if (e.button === 1) {
        e.preventDefault();
        document.exitPointerLock();
        return;
      }
      if (e.button === 0) {
        beginStroke();
        st.leftDown = true;
        performBreak();
      } else if (e.button === 2) {
        beginStroke();
        performPlace();
        commitStroke();
      }
    }
    function onMouseUp(e: MouseEvent) {
      if (e.button === 0 && st.leftDown) {
        st.leftDown = false;
        commitStroke();
      }
    }
    function onContextMenu(e) {
      e.preventDefault();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (!st.locked) return;
      if (e.code === "KeyW") {
        st.keys.forward = true;
        e.preventDefault();
      } else if (e.code === "KeyS") {
        st.keys.back = true;
        e.preventDefault();
      } else if (e.code === "KeyA") {
        st.keys.left = true;
        e.preventDefault();
      } else if (e.code === "KeyD") {
        st.keys.right = true;
        e.preventDefault();
      } else if (e.code === "Space") {
        st.keys.up = true;
        e.preventDefault();
      } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        st.keys.down = true;
        e.preventDefault();
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "KeyW") 
        st.keys.forward = false;
      else if (event.code === "KeyS") 
        st.keys.back = false;
      else if (event.code === "KeyA") 
        st.keys.left = false;
      else if (event.code === "KeyD") 
        st.keys.right = false;
      else if (event.code === "Space") 
        st.keys.up = false;
      else if (event.code === "ShiftLeft" || event.code === "ShiftRight")
        st.keys.down = false;
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (!st.camera)
        return;
      st.camera.fov = Math.max(15, Math.min(100, st.camera.fov * (1 + event.deltaY * 0.001)));
      st.camera.updateProjectionMatrix();
    }

    canvas.addEventListener("click", onCanvasClick);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("click", onCanvasClick);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("wheel", onWheel);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }

  useEffect(() => {
    if (viewMode === "3d")
      rebuildEntityMarkers();
  }, [entityInstances, viewMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (el === null)
      return undefined;
    function onWheel2d(event:WheelEvent) {
      if (viewModeRef.current !== "2d" || el === null)
        return;
      event.preventDefault();
      const delta = event.deltaY || event.deltaX;
        if (delta === 0) return;
      const step = Math.pow(DEFAULT_SETTINGS.ZOOM_WHEEL_STEP, event.shiftKey ? DEFAULT_SETTINGS.ZOOM_SHIFT_MULT : 1);
      const next = Math.round(clamp(zoomRef.current * (delta > 0 ? 1/step : step), 0.4, 3) * 100) / 100;
      const rect = canvasRef.current?.getBoundingClientRect(); // the canvas fills the container
      if (rect)
        zoomAt(next, event.clientX - rect.left, event.clientY - rect.top);
    }
    el.addEventListener("wheel", onWheel2d, { passive: false });
    return () => el.removeEventListener("wheel", onWheel2d);
  }, []);

  useEffect(() => {
    if (viewMode !== "3d")
      return undefined;
    initThree();
    rebuildInstances();
    rebuildEntityMarkers();
    const canvas = canvas3dRef.current;
    const container = containerRef.current;

    function resize() {
      const st = threeRef.current;
      if (!container || !st.renderer || !st.camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      st.renderer.setSize(w, h, true);
      st.camera.aspect = w / Math.max(h, 1);
      st.camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    const mode = cameraModeRef.current;
      const detach = canvas? (
        mode === "orbit" ? attachOrbitListeners(canvas) : attachFlyListeners(canvas)
      ) : undefined;

    let raf: number;
    let lastTime = performance.now();
    function loop() {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      dt = Math.min(dt, 0.05);

      const st = threeRef.current;

      if (mode === "orbit") {
        const rotFactor = 1 - Math.exp(-dt / 0.09);
        const zoomFactor = 1 - Math.exp(-dt / 0.1);
        const panFactor = 1 - Math.exp(-dt / 0.1);
        const active =
          Math.abs(st.orbit.thetaDelta) > 0.00002 ||
          Math.abs(st.orbit.phiDelta) > 0.00002 ||
          Math.abs(st.orbit.targetRadius - st.orbit.radius) > 0.001 ||
          Math.abs(st.orbit.targetGoal.x - st.orbit.target.x) > 0.001 ||
          Math.abs(st.orbit.targetGoal.y - st.orbit.target.y) > 0.001 ||
          Math.abs(st.orbit.targetGoal.z - st.orbit.target.z) > 0.001;
        if (active) {
          st.orbit.theta += st.orbit.thetaDelta * rotFactor;
          st.orbit.phi = clampPhi(st.orbit.phi + st.orbit.phiDelta * rotFactor);
          st.orbit.thetaDelta *= 1 - rotFactor;
          st.orbit.phiDelta *= 1 - rotFactor;
          st.orbit.radius += (st.orbit.targetRadius - st.orbit.radius) * zoomFactor;
          st.orbit.target.x +=
            (st.orbit.targetGoal.x - st.orbit.target.x) * panFactor;
          st.orbit.target.y +=
            (st.orbit.targetGoal.y - st.orbit.target.y) * panFactor;
          st.orbit.target.z +=
            (st.orbit.targetGoal.z - st.orbit.target.z) * panFactor;
          updateCameraFromOrbit();
        }
      } else {
        if (st.locked) {
          const k = st.keys;
          const fwd = { x: -Math.sin(st.fly.yaw), z: -Math.cos(st.fly.yaw) };
          const right = { x: Math.cos(st.fly.yaw), z: -Math.sin(st.fly.yaw) };
          let ix = 0;
          let iz = 0;
          if (k.forward) {
            ix += fwd.x;
            iz += fwd.z;
          }
          if (k.back) {
            ix -= fwd.x;
            iz -= fwd.z;
          }
          if (k.right) {
            ix += right.x;
            iz += right.z;
          }
          if (k.left) {
            ix -= right.x;
            iz -= right.z;
          }
          const len = Math.hypot(ix, iz);
          if (len > 0.0001) {
            ix /= len;
            iz /= len;
          }
          let iy = 0;
          if (k.up) iy += 1;
          if (k.down) iy -= 1;

          const speed = moveSpeedRef.current;
          const targetVel = { x: ix * speed, y: iy * speed, z: iz * speed };
          const moveFactor = 1 - Math.exp(-dt / 0.08);
          st.fly.velocity.x += (targetVel.x - st.fly.velocity.x) * moveFactor;
          st.fly.velocity.y += (targetVel.y - st.fly.velocity.y) * moveFactor;
          st.fly.velocity.z += (targetVel.z - st.fly.velocity.z) * moveFactor;

          st.fly.position.x += st.fly.velocity.x * dt;
          st.fly.position.y += st.fly.velocity.y * dt;
          st.fly.position.z += st.fly.velocity.z * dt;

          updateCameraFromFly();

          if (st.leftDown) performBreak();
        }
      }

      if (st.renderer && st.scene && st.camera) {
        st.renderer.render(st.scene, st.camera);
      }
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (detach) 
        detach();
    };
    // eslint-disable-next-line
  }, [viewMode, cameraMode]);

  const prevViewModeRef = useRef(viewMode);
  const syncSnapshotRef = useRef<number[] | null>(null);

  useEffect(() => {
    const prev = prevViewModeRef.current;
    prevViewModeRef.current = viewMode;
    if (cameraModeRef.current !== "orbit") // only for 2D and 3D-orbit
      return;
    if (prev === "2d" && viewMode === "3d")
      syncOrbitFrom2D();
    else if (prev === "3d" && viewMode === "2d")
      syncViewFrom3D();
  }, [viewMode]);

  function setOrbitPivot(p: THREE.Vector3):void {
    const st = threeRef.current;
    if(!st.camera)
      return;
    const o = st.orbit;
    const off = st.camera.position.clone().sub(p);
    const r = off.length();
    if (r < 1e-3)
      return;
    o.target = new THREE.Vector3(p.x, p.y, p.z );
    o.targetGoal = o.target.clone();
    o.radius = r;
    o.targetRadius = r;
    o.phi = clampPhi(Math.acos(off.y / r));
    o.theta = Math.atan2(off.x, off.z);
  }

  function syncOrbitFrom2D() {
    const st = threeRef.current;
    const host = containerRef.current;
    if (!st.camera || !host)
      return;
    const dims = dimsRef.current;
    const cell = CELL_BASE * zoomRef.current;
    const { panX, panY } = viewRef.current;
    const o = st.orbit;

    // the center of the 2D view, kept inside the grid, at the middle of the layer being viewed
    const cx = clamp((host.clientWidth / 2 - panX) / cell, 0, dims.width);
    const cz = clamp((host.clientHeight / 2 - panY) / cell, 0, dims.depth);
    const cy = currentLayer + 0.5;

    // a block's on-screen size at the target is viewportH / (2 * tan(fov/2) * distance)
    const fov = (st.camera.fov * Math.PI) / 180;
    const maxR = Math.max(dims.width, dims.depth, dims.height, 4) * 4 + 20;
    const r = clamp(host.clientHeight / (2 * Math.tan(fov / 2) * cell), 1, maxR);

    o.target.set( cx, cy, cz );
    o.targetGoal.set(cx, cy, cz);
    o.theta = 0;                       // camera on the +z side: top = -z, right = +x, same as 2D
    o.thetaDelta = 0;                  // cancel leftover rotation inertia
    o.phiDelta = 0;                    // phi, the tilt, stays as it was
    o.radius = r;

    // do not place the camera inside a block: step outward along its view ray
    const maxRadius = maxR;
    for (let i = 0; i < 400 && o.radius < maxRadius; i++) {
      const px = o.target.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta);
      const py = o.target.y + o.radius * Math.cos(o.phi);
      const pz = o.target.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta);
      if (!terrain.get(Math.floor(px), Math.floor(py), Math.floor(pz)))
        break;
      o.radius += 1;
    }
    o.targetRadius = o.radius;
    o.initialized = true;
    syncSnapshotRef.current = [o.target.x, o.target.y, o.target.z, o.theta, o.phi, o.radius];
    updateCameraFromOrbit();
  }

  function syncViewFrom3D() {
    const st = threeRef.current;
    const host = containerRef.current;
    if (!st.camera || !host)
      return;
    const o = st.orbit;

    // Camera untouched since the 2D→3D sync? Then the 2D view is still exactly as it was left.
    const snap = syncSnapshotRef.current;
    syncSnapshotRef.current = null;
    if (snap) {
      const now = [o.target.x, o.target.y, o.target.z, o.theta, o.phi, o.radius];
      if (now.every((v, i) => Math.abs(v - snap[i]!) < 1e-3))
        return;
    }

    const dims = dimsRef.current;
    const hit = pickBlockAtCenter();
    const cx = hit ? hit.coord.x + 0.5 : o.target.x; // fallback: orbit target
    const cz = hit ? hit.coord.z + 0.5 : o.target.z;
    const layer = hit ? hit.coord.y : Math.floor(o.target.y);
    const dist = hit ? hit.dist : o.radius;

    // the inverse of the '2D to 3D': size of a block on screen at that distance
    const fov = (st.camera.fov * Math.PI) / 180;
    const cellPx = host.clientHeight / (2 * Math.tan(fov / 2) * Math.max(dist, 0.5));
    const zoom = Math.round(clamp(cellPx / CELL_BASE, 0.4, 3) * 100) / 100;

    zoomRef.current = zoom; // zoom first, so setPan clamps with the new cell size
    setZoom(zoom);
    const c = CELL_BASE * zoom;
    setPan(host.clientWidth / 2 - cx * c, host.clientHeight / 2 - cz * c);
    setCurrentLayer(clamp(layer, 0, dims.height - 1));
    drawRef.current();
  }

  function resetCameraView() {
    const st = threeRef.current;
    if (cameraModeRef.current === "orbit") {
      st.orbit.initialized = false;
      st.orbit.theta = Math.PI / 4;
      st.orbit.phi = Math.PI / 3;
      st.orbit.thetaDelta = 0;
      st.orbit.phiDelta = 0;
    } else {
      st.fly.initialized = false;
      st.fly.velocity.set(0, 0, 0);
    }
    rebuildInstances();
  }

  function floodFill(startX:number, startZ:number) {
    // const startVal = voxelsRef.current.get(keyOf(startX, currentLayer, startZ));
    const startVal = terrain.get(startX, currentLayer, startZ);
    const startBlock = startVal ? startVal.block : AIR;
    if (startBlock === selectedBlock) return;
    const stack = [[startX, startZ]];
    const visited = new Set();
    let iterations = 0;
    beginStroke();
    while (stack.length > 0 && iterations < 200000) {
      iterations++;
      const [x, z] = stack.pop()!;
      if (!x  || !z ) continue;
      if (x < 0 || x >= width || z < 0 || z >= depth) continue;
      const vk = x + "," + z;
      if (visited.has(vk)) continue;
      visited.add(vk);
      // const val = voxelsRef.current.get(keyOf(x, currentLayer, z));
      const val = terrain.get(x, currentLayer, z);
      const block = val ? val.block : AIR;
      if (block !== startBlock) continue;
      setVoxelMirrored(x, currentLayer, z, selectedBlock, 0);
      stack.push([x + 1, z]);
      stack.push([x - 1, z]);
      stack.push([x, z + 1]);
      stack.push([x, z - 1]);
    }
    commitStroke();
  }

  function fillRect(x0: number, z0: number, x1: number, z1: number, block: number, hollow = false) {
    beginStroke();
    const minX = Math.max(0, Math.min(x0, x1));
    const maxX = Math.min(width - 1, Math.max(x0, x1));
    const minZ = Math.max(0, Math.min(z0, z1));
    const maxZ = Math.min(depth - 1, Math.max(z0, z1));
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (hollow && x > minX && x < maxX && z > minZ && z < maxZ)
          continue; // skip fill if disabled
        setVoxelMirrored(x, currentLayer, z, block, 0);
      }
    }
    commitStroke();
  }

  function clearLayer() {
    fillRect(0, 0, width - 1, depth - 1, AIR);
  }

  function fillLayer() {
    fillRect(0, 0, width - 1, depth - 1, selectedBlock);
  }

  function copyLayer(direction: number) {
    const target = currentLayer + direction;
    if (target < 0 || target >= height)
      return;
    beginStroke();
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // const val = voxelsRef.current.get(keyOf(x, currentLayer, z));
        const val = terrain.get(x, currentLayer, z);
        setVoxel(x, target, z, val ? val.block : AIR, val ? val.meta : 0);
      }
    }
    commitStroke();
    setStatus(STRINGS.en.layerCopied(target));
  }

  // ---- canvas drawing (2D) ----
  const draw = useCallback(() => {
    // const t0 = performance.now();
    const cell = CELL_BASE * zoomRef.current;   // same source as the pan, never a stale render value

    const canvas = canvasRef.current;
    const host = containerRef.current;
    if (!canvas || !host)
      return;
    const cw = host.clientWidth;
    const ch = host.clientHeight;
    if (cw === 0 || ch === 0)
      return; // no need to draw if there is no place
    if (canvas.width !== cw || canvas.height !== ch) { // assigning width clears the canvas, so only on a real change
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext("2d");
    if(!ctx)
      throw new Error("Canvas has no context `2d`");
    const { panX, panY } = viewRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#08090c";                           // area outside the grid
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(1, 0, 0, 1, panX, panY);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#12151b";                           // the grid itself
    ctx.fillRect(0, 0, width * cell, depth * cell);
    ctx.strokeStyle = "#2a2f3a";                         // replaces the old CSS box-shadow outline
    ctx.lineWidth = 1;
    ctx.strokeRect(-0.5, -0.5, width * cell + 1, depth * cell + 1);
    
    if (onionSkin) {
      for (let off = -onionRange; off <= onionRange; off++) {
        if (off === 0)
          continue;
        const ly = currentLayer + off;
        if (ly < 0 || ly >= height)
          continue;
        const alpha = 0.15 / Math.abs(off);
        ctx.globalAlpha = alpha;
        for (const voxel of terrain.layerCells(ly)) {
          const {x, y, z} = voxel;
          //if (y !== ly) continue;
          if (x < 0 || x >= width || z < 0 || z >= depth) continue;
          ctx.fillStyle = off < 0 ? "#4a90d9" : "#e0954a";
          ctx.fillRect(x * cell, z * cell, cell, cell);
        }
      }
      ctx.globalAlpha = 1;
    }

    for (const voxel of terrain.layerCells(currentLayer)) {
      const {x, y, z} = voxel;
      //if (y !== currentLayer) continue;
      if (x < 0 || x >= width || z < 0 || z >= depth) continue;
      const img = textureImg2DRef.current.get(voxel.block);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x * cell, z * cell, cell, cell);
      } else {
        ctx.fillStyle = colorForId(voxel.block);
        ctx.fillRect(x * cell, z * cell, cell, cell);
      }
    }

    if (cell >= 6) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        if (x % CHUNK === 0) continue;
        ctx.beginPath();
        ctx.moveTo(x * cell + 0.5, 0);
        ctx.lineTo(x * cell + 0.5, depth * cell);
        ctx.stroke();
      }
      for (let z = 0; z <= depth; z++) {
        if (z % CHUNK === 0) continue;
        ctx.beginPath();
        ctx.moveTo(0, z * cell + 0.5);
        ctx.lineTo(width * cell, z * cell + 0.5);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(110,168,254,0.55)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= width; x += CHUNK) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, depth * cell);
      ctx.stroke();
    }
    for (let z = 0; z <= depth; z += CHUNK) {
      ctx.beginPath();
      ctx.moveTo(0, z * cell);
      ctx.lineTo(width * cell, z * cell);
      ctx.stroke();
    }

    if (mirrorX) {
      const gx = (width / 2) * cell;
      ctx.strokeStyle = "rgba(255, 138, 200, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, depth * cell);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (mirrorZ) {
      const gz = (depth / 2) * cell;
      ctx.strokeStyle = "rgba(255, 138, 200, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, gz);
      ctx.lineTo(width * cell, gz);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (previewRectRef.current) {
      const { x0, z0, x1, z1 } = previewRectRef.current;
      const rx = Math.min(x0, x1);
      const rz = Math.min(z0, z1);
      const rw = Math.abs(x1 - x0) + 1;
      const rh = Math.abs(z1 - z0) + 1;
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx * cell, rz * cell, rw * cell, rh * cell);
      ctx.setLineDash([]);
    }

    if (roadParams.roadPending !== null) {
      const a = roadParams.roadPending;
      const r = Math.max(0, Math.floor(roadParams.roadWidth / 2));
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        a.x * cell + cell / 2,
        a.z * cell + cell / 2,
        cell * 0.6,
        0,
        Math.PI * 2
      ); // starting marker, a thick circle
      ctx.stroke();
   
      if(roadHoverRef.current !== null) {
        const b = roadHoverRef.current;
        ctx.save();
        ctx.lineCap = "round";
        ctx.beginPath(); // approx road footprint
        ctx.moveTo((a.x + 0.5) * cell, (a.z + 0.5) * cell);
        ctx.lineTo((b.x + 0.5) * cell, (b.z + 0.5) * cell);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.3)";
        ctx.lineWidth = (2 * r + 1) * cell; // footprint of the road
        ctx.stroke();
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Drawing entities
    for (const inst of entities.list()) {
      if (inst.x < 0 || inst.x >= width || inst.z < 0 || inst.z >= depth)
        continue;
      const onLayer = inst.y === currentLayer;
      const cx2 = inst.x * cell + cell / 2;
      const cz2 = inst.z * cell + cell / 2;
      const r = cell * 0.38;
      ctx.globalAlpha = onLayer ? 1 : 0.35;
      ctx.fillStyle = "#ff5fa2";
      ctx.strokeStyle = "#2a0a17";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx2, cz2 - r);
      ctx.lineTo(cx2 + r, cz2);
      ctx.lineTo(cx2, cz2 + r);
      ctx.lineTo(cx2 - r, cz2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (onLayer && cell >= 18) {
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.max(9, Math.floor(cell * 0.4))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const name = inst.name || "?";
        ctx.fillText(name[0]!.toUpperCase(), cx2, cz2 + 0.5);
      }
      ctx.globalAlpha = 1;
    }

    // const ms = performance.now() - t0;
    // if (ms > 1) console.log(`draw ${ms.toFixed(1)} ms, voxels: ${terrain.size}`);
  }, [width, depth, cell, currentLayer, mirrorX, mirrorZ, roadParams.roadPending, roadParams.roadWidth, onionSkin, onionRange, height, entityInstances]);

  const viewRef = useRef({ panX: 0, panY: 0 }); // screen position of the grid's top-left corner
  const drawRef = useRef(draw);
  drawRef.current = draw;                       // lets handlers with [] deps call a fresh draw()

  function centerView(): void {
    const host = containerRef.current;
    if (!host)
      return;
    const { width, depth } = dimsRef.current;
    const cell = CELL_BASE * zoomRef.current;
    viewRef.current.panX = Math.round((host.clientWidth - width * cell) / 2);  // whole pixels for smooth panning
    viewRef.current.panY = Math.round((host.clientHeight - depth * cell) / 2); // whole pixels
  }

  function setPan(px: number, py: number): void {
    const host = containerRef.current;
    if (!host)
      return;
    const { width, depth } = dimsRef.current;
    const cell = CELL_BASE * zoomRef.current;
    const m = 48; // always keep at least this much of the grid on screen
    viewRef.current.panX = Math.round(clamp(px, m - width * cell, host.clientWidth - m));
    viewRef.current.panY = Math.round(clamp(py, m - depth * cell, host.clientHeight - m));
  }

  function zoomAt(next: number, anchorX: number, anchorY: number) {   // anchor in canvas pixels
    const old = zoomRef.current;
    if (next === old)
      return;
    const k = next / old;
    const { panX, panY } = viewRef.current;
    zoomRef.current = next; // setPan should clamp with the new cell size!
    setPan(anchorX - (anchorX - panX) * k, anchorY - (anchorY - panY) * k);
    setZoom(next);
  }

  function zoomToCenter(next: number) {
    const host = containerRef.current;
    if (host)
      zoomAt(next, host.clientWidth / 2, host.clientHeight / 2);
  }

  useEffect(() => { // declared before the existing `useEffect(() => draw(), [draw])`
    centerView();
    drawRef.current();
  }, [width, depth]);

  useEffect(() => { // redraw whenever the viewport changes size (window, opened panels)
    const host = containerRef.current;
    if (!host) return undefined;
    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  function cellFromPoint(clientX: number, clientY: number) {
    const cell = CELL_BASE * zoomRef.current;
    if (!canvasRef.current) 
      throw new Error("canvasRef is undefined!");
    const rect = canvasRef.current.getBoundingClientRect();
    const { panX, panY } = viewRef.current;
    return {
      x: Math.floor((clientX - rect.left - panX) / cell),
      z: Math.floor((clientY - rect.top  - panY) / cell),
    };
  }
  function cellFromEvent(event: React.MouseEvent<HTMLCanvasElement>) {
    return cellFromPoint(event.clientX, event.clientY);
  }

  function cancelDrag(): boolean {
    if (roadStartRef.current) {            // a pending road start counts as "in progress"
      roadStartRef.current = null;
      updateRoadParams("roadPending", null);
      return true;
    }
    if (!isDrawingRef.current)
      return false;
    isDrawingRef.current = false;
    if (isFreehand(tool))
      commitStroke(); // keeps what was painted, one undo step
    rectStartRef.current = null;
    previewRectRef.current = null;
    draw();
    return true;
  }

  function handleMouseDown(event:React.MouseEvent<HTMLCanvasElement>) {
    // a drag can start outside the grid
    if (event.button === 1) {
      event.preventDefault();
      panDragRef.current = { x: event.clientX, y: event.clientY };
      return;
    }
    if (event.button !== 0)
      return;
    const { x, z } = cellFromEvent(event);
    if (x < 0 || x >= width || z < 0 || z >= depth) return;
    if (placingEntityName) {
      const surfaceY = terrain.surfaceY(x, z, height - 1);
      const y = surfaceY >= 0 ? surfaceY + 1 : currentLayer;
      placeEntityAt(placingEntityName, x, y, z);
      return;
    }
    if (placingStructureId) {
      const entry = structures.find((s) => s.id === placingStructureId);
      if (entry) stampStructureAt(x, currentLayer, z, entry, placingRotation);
      return;
    }
    if (tool === "paste") {
      pasteRegionAt(x, z);
      return;
    }
    if (tool === "road") {
      if (!roadStartRef.current) {
        roadStartRef.current = { x, z };
        roadHoverRef.current = { x, z };   // new: start of the preview line, not the previous road's end
        updateRoadParams("roadPending", { x, z });
      } else {
        const start = roadStartRef.current;
        drawRoad(start.x, start.z, x, z, roadParams.roadWidth, roadParams.roadBlock);
        roadStartRef.current = null;
        updateRoadParams("roadPending", null);
      }
      return;
    }
    if (tool === "eyedropper") {
      const v = terrain.get(x, currentLayer, z);
      if (v && v.block !== AIR) 
        setSelectedBlock(v.block);
      return;
    }
    if (tool === "none")
      return; // early exit if no tool is selected
    isDrawingRef.current = true;
    if (isFreehand(tool)) {
      beginStroke();
      if (tool === "paint")
        paintMirrored(x, currentLayer, z, selectedBlock);
      else
        setVoxelMirrored(x, currentLayer, z, tool === "eraser" ? AIR : selectedBlock, 0);
      draw();
    } else if (tool === "rect-fill" || tool === "rect-hollow" || tool === "rect-erase" || tool === "copy") {
      rectStartRef.current = { x, z };
      previewRectRef.current = { x0: x, z0: z, x1: x, z1: z };
      draw();
    } else if (tool === "bucket") {
      floodFill(x, z);
    }
  }

  function handleMouseMove(event:React.MouseEvent<HTMLCanvasElement>) {
    const pos = cellFromEvent(event);
    const inside = pos.x >= 0 && pos.x < width && pos.z >= 0 && pos.z < depth;
    setHoverCell(inside ? pos : null);
    if (tool === "road" && roadStartRef.current) {
      roadHoverRef.current = { x: clamp(pos.x, 0, width - 1), z: clamp(pos.z, 0, depth - 1) };
      draw(); // road preview
    }
  }

  function handleDragMove(e: MouseEvent) {
    const pd = panDragRef.current;
    if (pd) {
      const v = viewRef.current;
      setPan(v.panX + (e.clientX - pd.x), v.panY + (e.clientY - pd.y));
      pd.x = e.clientX;
      pd.y = e.clientY;
      draw();
      return;
    }

    if (!isDrawingRef.current) 
      return;
    const raw = cellFromPoint(e.clientX, e.clientY);
    const x = clamp(raw.x, 0, width - 1);
    const z = clamp(raw.z, 0, depth - 1);
    if (isFreehand(tool)) {
      if (x !== raw.x || z !== raw.z) 
        return; // freehand only paints inside the grid
      if (tool === "paint") 
        paintMirrored(x, currentLayer, z, selectedBlock);
      else
        setVoxelMirrored(x, currentLayer, z, tool === "eraser" ? AIR : selectedBlock, 0);
      draw();
    } else if (tool === "rect-fill" || tool === "rect-hollow" || tool === "rect-erase" || tool === "copy") {
      if (rectStartRef.current) {
        previewRectRef.current = { x0: rectStartRef.current.x, z0: rectStartRef.current.z, x1: x, z1: z };
        draw();
      }
    }
  }

  function handleMouseUp() {
    if (panDragRef.current) {
      panDragRef.current = null;
      return;
    }
    if (!isDrawingRef.current)
      return; // early exit if cancelled
    isDrawingRef.current = false;
    if (isFreehand(tool)) {
      commitStroke();
    } else if (tool === "rect-fill" || tool === "rect-hollow" || tool === "rect-erase") {
      if (previewRectRef.current) {
        const { x0, z0, x1, z1 } = previewRectRef.current;
        fillRect(x0, z0, x1, z1, tool === "rect-erase" ? AIR : selectedBlock, tool === "rect-hollow");
      }
      rectStartRef.current = null;
      previewRectRef.current = null;
      draw();
    } else if (tool === "copy") {
      if (previewRectRef.current) {
        const { x0, z0, x1, z1 } = previewRectRef.current;
        copyRegion(x0, z0, x1, z1);
      }
      rectStartRef.current = null;
      previewRectRef.current = null;
      draw();
    }
  }

  function handleMouseLeave() {
    setHoverCell(null);
    roadHoverRef.current = null;
    draw();
  }

  const dragHandlersRef = useRef({ 
    move: (event: MouseEvent) => {}, 
    up: () => {} ,
    cancel: () => false as boolean,
  });
  dragHandlersRef.current = { 
    move: handleDragMove, 
    up: handleMouseUp,
    cancel: cancelDrag,
  };

  useEffect(() => {
    const move = (event: MouseEvent) => dragHandlersRef.current.move(event);
    const up = () => dragHandlersRef.current.up();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
        event.preventDefault();
        if (event.shiftKey) 
          terrain.redo();
        else 
          terrain.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
        event.preventDefault();
        terrain.redo();
        return;
      }
      if (placingEntityRef.current) {
        if (event.key === "Escape") {
          event.preventDefault();
          setPlacingEntityName(null);
        }
        return;
      }
      const view = viewModeRef.current;
      const orbit3d = view === "3d" && cameraModeRef.current === "orbit";

      // Panning via hotkeys
      if ((view === "2d" || orbit3d) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          const n = event.shiftKey ? 10 : 1;
          const pan = PAN_KEYS[event.code];
          if (pan) {
            event.preventDefault();
            if (view === "2d") {
              const step = n * CELL_BASE * zoomRef.current;
              const v = viewRef.current;
              setPan(v.panX - pan[0] * step, v.panY - pan[1] * step); // the view goes right, so the content goes left
              drawRef.current();

              // if (containerRef.current) {
              //   const step = n * CELL_BASE * zoomRef.current;
              //   containerRef.current.scrollBy({ left: pan[0] * step, top: pan[1] * step, behavior: "instant" });
              // }
            } else {
              panOrbitByUnits(pan[0] * n, -pan[1] * n, 0); // W/ArrowUp = forward
            }
            return;
          }
          if (event.code === "PageUp" || event.code === "PageDown") {
            event.preventDefault();
            const dir = event.code === "PageUp" ? 1 : -1;
            if (orbit3d) {
              panOrbitByUnits(0, 0, dir * n); // In 3D, pan the camera up/down
            } else if (!isDrawingRef.current) {
              setCurrentLayer((prevLayer) => clamp(prevLayer + dir * n, 0, dimsRef.current.height - 1)); // In 2D, switch layers up/down
            }
            return;
          }
          if (view === "2d" && event.code === "Home") {
            event.preventDefault();
            centerView();
            drawRef.current();
            return;
          }
        }
      }

      if (placingStructureRef.current) {
        const tag = (event.target && event.target instanceof HTMLElement) && event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA")
          return;
        if (event.code === "KeyR") {
          event.preventDefault();
          setPlacingRotation((r) => (r + 1) % 4);
        } else if (event.key === "Escape") {
          event.preventDefault();
          setPlacingStructureId(null);
        }
        return;
      }
      
      if (viewModeRef.current === "2d" || orbit3d) {
        if(!event.ctrlKey && !event.metaKey && !event.altKey) {
          const tag = (event.target as HTMLElement | null)?.tagName;
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            // deselect tool if Esc in 2D and 3D-orbit
            if (event.key === "Escape") {
              event.preventDefault();
              if (!dragHandlersRef.current.cancel())
                setTool("none");
              return;
            }
            const def = TOOL_BY_CODE.get(event.code);
            // Tool hotkey - only in 2D for now
            if (def && def.views.includes(viewModeRef.current)) {
              event.preventDefault();
              setTool(def.id);
              return;
            }
          }
        }
        
      }
      if (/^[0-9]$/.test(event.key)) {
        const tag = (event.target && event.target instanceof HTMLElement) && event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA")
          return;
        const slot = event.key === "0" ? 9 : Number(event.key) - 1;
        event.preventDefault();
        selectHotbarSlot(slot);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, []);

  // ---- grid size changes: clip out-of-bounds voxels ----
  function applyGridResize(nx:number, ny:number, nz:number) {
    const newW = nx * CHUNK;
    const newD = nz * CHUNK;
    const newH = ny * CHUNK;
    
    terrain.transaction((t) => {
      for (const { x, y, z } of Array.from(terrain.cells())) {
        if (x >= newW || y >= newH || z >= newD) t.set(x, y, z, AIR);
      }
    });
    terrain.clearHistory();

    setMapData({...mapData, 
      gridX: nx,
      gridY: ny,
      gridZ: nz,
    })
    if (currentLayer >= newH) 
      setCurrentLayer(newH - 1);
    setVoxelCount(terrain.size);
    scheduleSave();
  }

  // move existing map within the grid limits
  function shiftMap(dx: number, dy: number, dz: number) {
    const cells = Array.from(terrain.cells()); // a snapshot, so we never walk the live map
    if (cells.length === 0 && entities.size === 0) {
      setStatus(STRINGS.en.shiftNothing);
      return;
    }
    const fits = (x: number, y: number, z: number) => {
      return (x + dx >= 0 && x + dx < width &&
        y + dy >= 0 && y + dy < height &&
        z + dz >= 0 && z + dz < depth);
    }
    if (!cells.every((c) => fits(c.x, c.y, c.z)) || !entities.list().every((ent) => fits(ent.x, ent.y, ent.z))) {
      setStatus(STRINGS.en.shiftNoRoom); // refuse; nothing changes
      return;
    }
    entities.translateAll(dx, dy, dz);
    terrain.replaceAll(cells.map((c) => ({ x: c.x + dx, y: c.y + dy, z: c.z + dz, block: c.block, meta: c.meta })));
    lastHeightMapRef.current = null; // the "regenerate trees/ore" snapshot no longer matches
    setCurrentLayer((layer) => clamp(layer + dy, 0, height - 1)); // Follow the Y layer if it shifts
    setStatus(STRINGS.en.shiftDone(dx, dy, dz));
  }

  function ensureAirship() {
    if (entities.list().some((e) => e.name === "Airship"))
      return true;
    const airship = findAirshipSpot(dimsRef.current, (x, z, fromY) => terrain.surfaceY(x, z, fromY), randSeed); // important: keep *this* in method
    if (airship === null) {
      setStatus(STRINGS.en.airshipNoGround);
      return false;
    }
    entities.add(airship);
    // draw();
    return true;
  }

  function exportJson() {
    if (!ensureAirship()) return;
    const data = buildExportData(Array.from(terrain.cells()), entities.list(), mapData);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "worldmap.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus(STRINGS.en.exportedCount(data.voxels.length));
  }

  async function exportJsonCompressed() {
    if (typeof CompressionStream === "undefined") {
      setStatus(STRINGS.en.compressionUnsupported);
      return;
    }
    if (!ensureAirship())
      return;
    const data = buildExportData(Array.from(terrain.cells()), entities.list(), mapData);
    const json = JSON.stringify(data);
    const rawBlob = new Blob([json], { type: "application/json" });
    const cs = new CompressionStream("gzip");
    const compressedStream = rawBlob.stream().pipeThrough(cs);
    const compressedBlob = await new Response(compressedStream).blob();
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "worldmap.json.gz";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const efficiency = json.length > 0 ? Math.round((1 - compressedBlob.size / json.length) * 100) : 0;
    setStatus(STRINGS.en.exportedCompressed(json.length, compressedBlob.size, efficiency));
  }

  // ---- named save slots for the MAP (terrain) in storage ----
  const mapStoragePrefix = "terrain-editor-slot:";
  const mapStorage = createNamedStore<LevelData>(mapStoragePrefix);

  async function refreshSaveSlots() {
    setSaveSlots(await mapStorage.list())
  }

  async function saveNamedSlot(name:string) {
    const normName = name.trim();
    if (!normName) 
      return; //do not save with an empty name
    try {
      const data = buildExportData(Array.from(terrain.cells()), entities.list(), mapData);
      data.paletteLabels = palette;
      await mapStorage.save(normName, data);
      await refreshSaveSlots();
      setStatus(STRINGS.en.slotSaved(normName));
    }
    catch(error) {
      setStatus(STRINGS.en.slotSaveError);
    }
  }

  async function loadNamedSlot(name:string) {
    const data = await mapStorage.load(name);
    if(data) {
      applyLoadedData(data);
      setStatus(STRINGS.en.slotLoaded(name));
    }
  }

  async function deleteNamedSlot(name:string) {
    await mapStorage.delete(name);
    await refreshSaveSlots();
  }

  // ---- generator presets (settings only, not the map itself) ----
  const rngPresetPrefix = "terrain-editor-preset:";
  const rngPresetStorage = createNamedStore<RngParams>(rngPresetPrefix);

  async function refreshPresets() {
    setPresets(await rngPresetStorage.list())
  }

  async function savePreset(name:string) {
    const normName = name.trim();

    rngPresetStorage.save(normName, rngParameters);
    await refreshPresets();
    setStatus(STRINGS.en.presetSaved(normName));
  }

  async function loadPreset(name:string) {
    const preset = await rngPresetStorage.load(name);
    if(preset !== null) {
      setRngParameters(prev => ({
        ...prev,
        ...preset
      }));
      setStatus(STRINGS.en.presetLoaded(name));
    }
  }

  async function deletePreset(name:string) {
    await rngPresetStorage.delete(name);
    await refreshPresets();
  }

  // ---- map statistics ----
  function computeMapStats() {
    const counts = new Map();
    for (const voxel of Array.from(terrain.cells())) {
      counts.set(voxel.block, (counts.get(voxel.block) || 0) + 1);
    }
    // const total = voxelsRef.current.size;
    const total = terrain.size;
    const rows = Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
        name: BLOCK_NAMES[id] || (palette.find((p) => p.id === id) || {}).label || null,
      }))
      .sort((a, b) => b.count - a.count);
    setStatsData({ total, rows });
    setShowStats(true);
  }

  function newMap():void {
    if (!window.confirm("Start a new empty map? The current map and its autosave will be replaced."))
      return;
    terrain.replaceAll([]);
    entities.clear();      // debounced autosave doesn't see the old entities
    lastHeightMapRef.current = null;      // otherwise regenerate* would run on the old map's heightmap
    setCurrentLayer(0);
    setStatus("New map");
  }

  function importJson(event:React.ChangeEvent<HTMLInputElement, HTMLInputElement> ) {
    const file = event.target.files && event.target.files[0];
    if (!file)
      return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result?.toString() || "");
        applyLoadedData(data);

        setStatus(STRINGS.en.importedFrom(file.name));
      } catch (err ) {
        setStatus(STRINGS.en.importError((err as Error).message));
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const chunkY = Math.floor(currentLayer / CHUNK);
  const localY = currentLayer % CHUNK;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
        background: "#0b0d12",
        color: "#e6e8ee",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar
        applyGridResize={applyGridResize}
        applyServerEdits={applyServerEdits}
        cameraMode={cameraMode}
        hasAirship = {entityInstances.some((entity) => entity.name === "Airship")}
        newMap={newMap}
        importJson={importJson}
        exportJson={exportJson}
        exportJsonCompressed={exportJsonCompressed}
        mapData={mapData}
        scheduleSave={scheduleSave}
        setMapData={setMapData}
        setCameraMode={setCameraMode}
        setShowHelp={setShowHelp}
        setViewMode={setViewMode}
        viewMode={viewMode}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <PaletteSidebar
          paletteObj={paletteObj}
          clearTexture={clearTexture}
          handleTextureFile={handleTextureFile}
          setTextureTargetId={setTextureTargetId}
          textureTargetId={textureTargetId}
          textureVersion={textureVersion}
          texturesRef={texturesRef}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <ToolbarRow
            setTool={setTool}
            currentTool={tool}
            cameraMode={cameraMode}
            clearLayer={clearLayer}
            clipboardInfo={clipboardInfo}
            computeMapStats={computeMapStats}
            copyLayer={copyLayer}
            copyYFrom={copyYFrom}
            copyYTo={copyYTo}
            fillLayer={fillLayer}
            mirrorX={mirrorX}
            mirrorZ={mirrorZ}
            moveSpeed={moveSpeed}
            shiftMap={shiftMap}
            onionRange={onionRange}
            onionSkin={onionSkin}
            resetCameraView={resetCameraView}

            roadParams={roadParams}
            updateRoadParams={updateRoadParams}

            setCopyYFrom={setCopyYFrom}
            setCopyYTo={setCopyYTo}
            setMirrorX={setMirrorX}
            setMirrorZ={setMirrorZ}
            setMoveSpeed={setMoveSpeed}
            setOnionRange={setOnionRange}
            setOnionSkin={setOnionSkin}
            setShowBulkTexturePanel={setShowBulkTexturePanel}
            setShowEntitiesPanel={setShowEntitiesPanel}
            setShowPresets={setShowPresets}
            setShowRandomPanel={setShowRandomPanel}
            setShowSaves={setShowSaves}
            setShowStructuresPanel={setShowStructuresPanel}
            setZoom={zoomToCenter}
            showBulkTexturePanel={showBulkTexturePanel}
            showEntitiesPanel={showEntitiesPanel}
            showPresets={showPresets}
            showRandomPanel={showRandomPanel}
            showSaves={showSaves}
            showStructuresPanel={showStructuresPanel}
            totalHeight={height}
            undo={()=>terrain.undo()}
            redo={()=> terrain.redo()}
            viewMode={viewMode}
            zoom={zoom}
            zoomRef={zoomRef}
          />

          {showRandomPanel && (
            <RandomPanel
              randSeed={randSeed}
              setRandSeed={setRandSeed}
              rngParams={rngParameters}
              onParamChange={updateRngParameter}
              totalHeight={height}
              generateRandomTerrain={generateRandomTerrain}
              randomizeAllParams={randomizeAllParams}
            />
          )}

          {showStructuresPanel && (
            <StructuresPanel
              deleteStructure={deleteStructure}
              ensureStructureThumb={ensureStructureThumb}
              importStructureFiles={importStructureFiles}

              openPopover={openPopover}
              placingRotation={placingRotation}
              placingStructureId={placingStructureId}
              popoverAnchorRef={popoverAnchorRef}
              saveCurrentMapAsStructure={saveCurrentMapAsStructure}

              setOpenPopover={setOpenPopover}
              setPlacingRotation={setPlacingRotation}
              setPlacingStructureId={setPlacingStructureId}
              setStructureCount={setStructureCount}
              structures={structures}
              thumbVersion={thumbVersion}
              toggleStructure={toggleStructure}
              updateStructureField={updateStructureField}
            />
          )}

          {showBulkTexturePanel && (
            <BulkTexturePanel
              applyBulkTextures={applyBulkTextures}
              bulkApplying={bulkApplying}
              bulkFolderInputRef={bulkFolderInputRef}
              bulkTextureRows={bulkTextureRows}
              handleBulkFolderSelect={handleBulkFolderSelect}
              toggleBulkRow={toggleBulkRow}
              updateBulkRowId={updateBulkRowId}
            />
          )}

          {showSaves && (
            <SavesPanel
              deleteNamedSlot={deleteNamedSlot}
              loadNamedSlot={loadNamedSlot}
              saveNamedSlot={saveNamedSlot}
              saveSlots={saveSlots}
            />
          )}

          {showPresets && (
            <PresetsPanel
              deletePreset={deletePreset}
              loadPreset={loadPreset}
              newPresetName={newPresetName}
              presets={presets}
              rngParameters={rngParameters}
              regenerateDecorations={regenerateDecoHandler}
              regenerateOre={regenerateOreHandler}
              regenerateTrees={regenerateVegHandler}
              savePreset={savePreset}
              setNewPresetName={setNewPresetName}
            />
          )}

          {showEntitiesPanel && (
            <EntitiesPanel
              entities={entities}
              placingEntityName={placingEntityName}
              setPlacingEntityName={setPlacingEntityName}
            />
          )}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <div
              ref={containerRef}
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                padding: 0,
                background: "#08090c",
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                //onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                  display: viewMode === "2d" ? "block" : "none",
                  width: "100%",
                  height: "100%",
                  cursor: "crosshair",
                  imageRendering: "pixelated",
                  // boxShadow: "0 0 0 1px #2a2f3a",
                }}
              />
              <canvas
                ref={canvas3dRef}
                style={{
                  display: viewMode === "3d" ? "block" : "none",
                  width: "100%",
                  height: "100%",
                  cursor: "crosshair",
                }}
              />
              {viewMode === "3d" && cameraMode === "fly" && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 18,
                      height: 18,
                      marginLeft: -9,
                      marginTop: -9,
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        top: 0,
                        width: 2,
                        height: 18,
                        background: "rgba(255,255,255,0.85)",
                        boxShadow: "0 0 2px rgba(0,0,0,0.8)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 0,
                        width: 18,
                        height: 2,
                        background: "rgba(255,255,255,0.85)",
                        boxShadow: "0 0 2px rgba(0,0,0,0.8)",
                      }}
                    />
                  </div>
                  {!isLocked && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(8,9,12,0.6)",
                        pointerEvents: "none",
                        textAlign: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 16, color: "#e6e8ee", marginBottom: 8 }}>
                          {t.clickToPlay}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8a91a3",
                            lineHeight: 1.6,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {t.controlsFly}
                        </div>
                        {pointerLockFailed && (
                          <div style={{ fontSize: 11, color: "#ff9e9e", marginTop: 10 }}>
                            {t.pointerLockFailedMsg}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <PaletteHotbar
              slots={hotbar}
              // activeIndex={hotbarIndex}
              selectedBlock={selectedBlock}
              hint={t.hotbarHint}
              disabled={viewMode === "3d" && cameraMode === "fly" && isLocked}
              onSelect={selectHotbarSlot}
              onAssign={assignHotbarSlot}
            />
          </div>
          
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "6px 14px",
              borderTop: "1px solid #1e222b",
              fontSize: 11,
              color: "#8a91a3",
              background: "#0e1117",
            }}
          >
            <span>
              {t.cursor}{" "}
              {hoverCell
                ? `X=${hoverCell.x} Z=${hoverCell.z} (${Math.floor(
                    hoverCell.x / CHUNK
                  )},${chunkY},${Math.floor(hoverCell.z / CHUNK)})`
                : "—"}
            </span>
            <span>
              {t.totalVoxels} {voxelCount}
            </span>
            <span>{status}</span>
          </div>
        </div>

        {viewMode === "2d" && (
          <LayerNav
            chunkY={chunkY}
            currentLayer={currentLayer}
            gridY={mapData.gridY}
            localY={localY}
            setCurrentLayer={setCurrentLayer}
            totalHeight={height}
          />
        )}
      </div>

      {showHelp && (
        <HelpModal
          setShowHelp={setShowHelp}
        />
      )}

      {showStats && statsData && (
        <StatsModal
          setShowStats={setShowStats}
          statsData={statsData}
        />
      )}
    </div>
  );
}
