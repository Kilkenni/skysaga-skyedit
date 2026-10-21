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
import { clamp, parseIdList, parseWeightedIdList, pickWeighted } from "../lib/numbers";
import { mulberry32, makeValueNoise, makeValueNoise3D } from "../lib/noise";
import { rotateStructure90, getRotatedStructure, generateStructureThumbnail } from "../lib/structures";
import { inputStyle, actionBtn } from "../styles/inline";
import RandomPanel from "./RandomPanel";
import StructuresPanel from "./StructuresPanel";
import BulkTexturePanel from "./BulkTexturePanel";
import SavesPanel from "./SavesPanel";
import PresetsPanel from "./PresetsPanel";
import EntitiesPanel from "./EntitiesPanel";
import HelpModal from "./HelpModal";
import StatsModal from "./StatsModal";
import TopBar from "./TopBar";
import PaletteSidebar from "./PaletteSidebar";
import ToolbarRow from "./ToolbarRow";
import LayerNav from "./LayerNav";
import { Voxel, VoxelCell, VoxelStore } from "../VoxelStore";


/* LocalStorage temp */

const ns = (shared) => (shared ? "shared:" : "personal:");
const localStorage = {
  async get(key, shared) {
    const raw = window.localStorage.getItem(ns(shared) + key);
    if (raw === null) throw new Error("key not found: " + key);
    return { key, value: raw, shared: !!shared };
  },
  async set(key, value, shared) {
    window.localStorage.setItem(ns(shared) + key, value);
    return { key, value, shared: !!shared };
  },
  async delete(key, shared) {
    window.localStorage.removeItem(ns(shared) + key);
    return { key, deleted: true, shared: !!shared };
  },
  async list(prefix, shared) {
    const full = ns(shared) + (prefix || "");
    const keys:any[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(full)) keys.push(k.slice(ns(shared).length));
    }
    return { keys, prefix, shared: !!shared };
  },
};

export default function TerrainEditor() {
  const [gridX, setGridX] = useState(6);
  const [gridY, setGridY] = useState(4);
  const [gridZ, setGridZ] = useState(6);
  // FIXED (2026-08-21): "Sky_Island" does not exist in Alpha v10 36731's
  // GeoData.json (confirmed via direct search - zero matches). Real biomes
  // for this build: Desert, Forest, Jungle, Mountain, NPCfriend. Using
  // "Forest" as the default since that's what the server currently sends,
  // but this is just a free-text field - change it to whichever real biome
  // name you want per-map.
  const [biomeName, setBiomeName] = useState("Forest");
  const [gameMode, setGameMode] = useState(1);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [tool, setTool] = useState("pencil");
  const clipboardRef = useRef<any>(null);
  const roadStartRef = useRef<any>(null);
  const [roadPending, setRoadPending] = useState<any>(null);
  const [roadWidth, setRoadWidth] = useState(2);
  const [roadBlock, setRoadBlock] = useState(18);
  const [clipboardInfo, setClipboardInfo] = useState<any>(null);
  const [copyYFrom, setCopyYFrom] = useState(0);
  const [copyYTo, setCopyYTo] = useState(0);
  const [mirrorX, setMirrorX] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [onionRange, setOnionRange] = useState(1);
  const [mirrorZ, setMirrorZ] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(1);
  const [hotbar, setHotbar] = useState(() => {
    const slots = new Array(10).fill(null);
    const ids = DEFAULT_PALETTE.filter((id) => id !== 0);
    for (let i = 0; i < 10 && i < ids.length; i++) slots[i] = ids[i];
    return slots;
  });
  const [hotbarIndex, setHotbarIndex] = useState(0);
  const hotbarRef = useRef(hotbar);
  const hotbarIndexRef = useRef(0);
  const [palette, setPalette] = useState(
    DEFAULT_PALETTE.map((id) => ({ id, label: BLOCK_NAMES[id] || "Block " + id }))
  );
  const [customIdInput, setCustomIdInput] = useState("");
  const [hoverCell, setHoverCell] = useState<any>(null);
  const [voxelCount, setVoxelCount] = useState(0);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [showRandomPanel, setShowRandomPanel] = useState(false);
  const [randSeed, setRandSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [randMinH, setRandMinH] = useState(0);
  const [randMaxH, setRandMaxH] = useState(25);
  const [randGroundDepth, setRandGroundDepth] = useState(43);
  const [randErosion, setRandErosion] = useState(false);
  const [randErosionStrength, setRandErosionStrength] = useState(40);
  const [randErosionIterations, setRandErosionIterations] = useState(2);
  const [randBaseBlock, setRandBaseBlock] = useState(24);
  const [randSurfaceBlock, setRandSurfaceBlock] = useState(1);
  const [randDecoBlocks, setRandDecoBlocks] = useState("");
  const [randDecoChance, setRandDecoChance] = useState(0);
  const [randIsland, setRandIsland] = useState(true);
  const [randIslandIrregularity, setRandIslandIrregularity] = useState(55);
  const [randIslandSize, setRandIslandSize] = useState("large");
  const [randIslandMode, setRandIslandMode] = useState("floating");
  const [randSeaLevel, setRandSeaLevel] = useState(15);
  const [randSeaBlock, setRandSeaBlock] = useState(50);
  const [randBottomRoughness, setRandBottomRoughness] = useState(20);
  const [randMaxThickness, setRandMaxThickness] = useState(25);
  const [randArchipelago, setRandArchipelago] = useState(false);
  const [randIslandCount, setRandIslandCount] = useState(3);

  const [randAltitudeBlocks, setRandAltitudeBlocks] = useState(false);
  const [randBeachLevel, setRandBeachLevel] = useState(50);
  const [randBeachBlock, setRandBeachBlock] = useState(24);
  const [randSnowLevel, setRandSnowLevel] = useState(85);
  const [randSnowBlock, setRandSnowBlock] = useState(10);

  const [randOres, setRandOres] = useState(false);
  const [randOreBlocks, setRandOreBlocks] = useState("25,26,42");
  const [randOreCount, setRandOreCount] = useState(40);
  const [randOreVeinSize, setRandOreVeinSize] = useState(2);
  const [randOreBigChance, setRandOreBigChance] = useState(8);
  const [randOreBigSize, setRandOreBigSize] = useState(5);

  const [randCaveGlow, setRandCaveGlow] = useState(false);
  const [randCaveGlowChance, setRandCaveGlowChance] = useState(3);
  const [randCaveGlowBlock, setRandCaveGlowBlock] = useState(21);

  const [randSmoothShore, setRandSmoothShore] = useState(false);
  const [randShoreRadius, setRandShoreRadius] = useState(2);
  const [randShoreBlock, setRandShoreBlock] = useState(24);
  const [randShoreCoverage, setRandShoreCoverage] = useState(45);

  const [randWaterfalls, setRandWaterfalls] = useState(false);
  const [randWaterfallDrop, setRandWaterfallDrop] = useState(5);

  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState("Preset 1");
  const lastHeightMapRef = useRef<any>(null);

  const [randHills, setRandHills] = useState(true);
  const [randHillStrength, setRandHillStrength] = useState(40);
  const [randMountains, setRandMountains] = useState(false);
  const [randMountainHeight, setRandMountainHeight] = useState(35);
  const [randRivers, setRandRivers] = useState(false);
  const [randRiverBlock, setRandRiverBlock] = useState(50);
  const [randRiverWidth, setRandRiverWidth] = useState(3);
  const [randCaves, setRandCaves] = useState(false);
  const [randCaveDensity, setRandCaveDensity] = useState(35);

  const [randLakes, setRandLakes] = useState(false);
  const [randLakeBlock, setRandLakeBlock] = useState(50);
  const [randLakeSize, setRandLakeSize] = useState(5);
  const [randValleys, setRandValleys] = useState(false);
  const [randValleyDepth, setRandValleyDepth] = useState(15);
  const [randPlateaus, setRandPlateaus] = useState(false);
  const [randPlateauHeight, setRandPlateauHeight] = useState(20);
  const [randForests, setRandForests] = useState(false);
  const [randForestDensity, setRandForestDensity] = useState(45);

  const [randTrees, setRandTrees] = useState(false);
  const [randTreeDensity, setRandTreeDensity] = useState(15);
  const [randTreeMinHeight, setRandTreeMinHeight] = useState(3);
  const [randTreeMaxHeight, setRandTreeMaxHeight] = useState(6);
  const [randTreeWoodBlock, setRandTreeWoodBlock] = useState(5);
  const [randTreeLeavesBlock, setRandTreeLeavesBlock] = useState(14);
  const [randTreeSpacing, setRandTreeSpacing] = useState(3);
  const [randBushes, setRandBushes] = useState(false);
  const [randBushDensity, setRandBushDensity] = useState(15);
  const [randBushBlock, setRandBushBlock] = useState(14);
  const [randBushSpacing, setRandBushSpacing] = useState(1);

  const [openPopover, setOpenPopover] = useState<any>(null);
  const popoverAnchorRef = useRef<any>(null);

  const [showStructuresPanel, setShowStructuresPanel] = useState(false);
  const [structures, setStructures] = useState<any[]>([]);
  const [structureCategoryFilter, setStructureCategoryFilter] = useState("all");
  const [newStructureName, setNewStructureName] = useState("Structure");
  const [newStructureCategory, setNewStructureCategory] = useState("other");
  const structureFileInputRef = useRef(null);
  const structuresRef = useRef<any[]>([]);
  const viewModeRef = useRef("3d");

  const [placingStructureId, setPlacingStructureId] = useState(null);
  const [placingRotation, setPlacingRotation] = useState(0);
  const placingStructureRef = useRef(null);
  const placingRotationRef = useRef(0);
  const structureThumbsRef = useRef(new Map());
  const [thumbVersion, setThumbVersion] = useState(0);

  const [entityInstances, setEntityInstances] = useState<any[]>([]);
  const entityInstancesRef = useRef<any[]>([]);
  const [placingEntityName, setPlacingEntityName] = useState(null);
  const placingEntityRef = useRef(null);
  const [showEntitiesPanel, setShowEntitiesPanel] = useState(false);
  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [openItemsId, setOpenItemsId] = useState(null);
  const [entityCategory, setEntityCategory] = useState("all");
  // Search filter for the block palette - needed once BLOCK_NAMES grew from
  // 48 (Alpha 3-era stub table) to the real 146-entry Alpha v10 36731 list;
  // an unfiltered flat scroll of 146 rows was unusable.
  const [blockSearchQuery, setBlockSearchQuery] = useState("");
  const entityMarkersGroupRef = useRef<any>(null);

  const [viewMode, setViewMode] = useState("3d");
  const [cameraMode, setCameraMode] = useState("fly");
  const [isLocked, setIsLocked] = useState(false);
  const [pointerLockFailed, setPointerLockFailed] = useState(false);
  const [moveSpeed, setMoveSpeed] = useState(16);

  const t = STRINGS.en;

  // const voxelsRef = useRef(new Map<string, any>());
  const [terrain, _] = useState<VoxelStore>(() => new VoxelStore);
  const canvasRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const editsInputRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const rectStartRef = useRef<any>(null);
  const previewRectRef = useRef<any>(null);
  const strokeChangesRef = useRef<any[]>([]);
  const touchedInStrokeRef = useRef(new Map());
  const undoStackRef = useRef<any[]>([]);
  const redoStackRef = useRef<any[]>([]);
  const saveTimerRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const canvas3dRef = useRef<any>(null);
  const toolRef = useRef(tool);
  const selectedBlockRef = useRef(selectedBlock);
  const dimsRef = useRef({ width: 0, depth: 0, totalHeight: 0 });
  const paletteRef = useRef(palette);
  const cameraModeRef = useRef(cameraMode);
  const moveSpeedRef = useRef(moveSpeed);

  const texturesRef = useRef(new Map()); // blockId -> dataURL
  const textureImg2DRef = useRef(new Map()); // blockId -> HTMLImageElement (2D canvas)
  const textureThreeCacheRef = useRef(new Map()); // blockId -> THREE.Texture
  const textureFileInputRef = useRef(null);
  const [textureTargetId, setTextureTargetId] = useState(null);
  const [textureVersion, setTextureVersion] = useState(0);

  const bulkFolderInputRef = useRef(null);
  const [showBulkTexturePanel, setShowBulkTexturePanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const [saveSlots, setSaveSlots] = useState<any[]>([]);
  const [newSlotName, setNewSlotName] = useState("Slot 1");
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [bulkTextureRows, setBulkTextureRows] = useState<any[]>([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  const threeRef = useRef<any>({
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
      target: { x: 0, y: 0, z: 0 },
      targetGoal: { x: 0, y: 0, z: 0 },
      initialized: false,
    },
    fly: {
      position: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: -0.5,
      velocity: { x: 0, y: 0, z: 0 },
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

  const width = gridX * CHUNK;
  const depth = gridZ * CHUNK;
  const totalHeight = gridY * CHUNK;
  const cell = CELL_BASE * zoom;

  useEffect(() => {
    toolRef.current = tool;
    if (tool !== "road") {
      roadStartRef.current = null;
      setRoadPending(null);
    }
    if (tool === "copy") {
      setCopyYFrom(currentLayer);
      setCopyYTo(currentLayer);
    }
  }, [tool]);
  useEffect(() => {
    selectedBlockRef.current = selectedBlock;
  }, [selectedBlock]);
  useEffect(() => {
    hotbarRef.current = hotbar;
  }, [hotbar]);
  useEffect(() => {
    hotbarIndexRef.current = hotbarIndex;
  }, [hotbarIndex]);
  useEffect(() => {
    dimsRef.current = { width, depth, totalHeight };
  }, [width, depth, totalHeight]);
  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);
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
    entityInstancesRef.current = entityInstances;
  }, [entityInstances]);
  useEffect(() => {
    placingEntityRef.current = placingEntityName;
    if (placingEntityName) setPlacingStructureId(null);
  }, [placingEntityName]);
  useEffect(() => {
    if (placingStructureId) setPlacingEntityName(null);
  }, [placingStructureId]);
  useEffect(() => {
    if (!openPopover) return undefined;
    function onDocMouseDown(e) {
      if (popoverAnchorRef.current && !popoverAnchorRef.current.contains(e.target)) {
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
      rebuildInstances();
    }
    // eslint-disable-next-line
  }, [width, depth, totalHeight]);

  // ---- persistence: load on mount ----
  useEffect(() => {
    (async () => {
      try {
        const result = await localStorage.get(STORAGE_KEY, false);
        if (result && result.value) {
          const data = JSON.parse(result.value);
          applyLoadedData(data);
          if (data.cameraMode === "orbit" || data.cameraMode === "fly")
            setCameraMode(data.cameraMode);
          setStatus(STRINGS.en.loadedAutosave);
        }
      } catch (e) {
        // no saved state yet, that's fine
      }
      try {
        const texResult = await localStorage.get(TEXTURES_STORAGE_KEY, false);
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
        const structResult = await localStorage.get(STRUCTURES_STORAGE_KEY, false);
        if (structResult && structResult.value) {
          const arr = JSON.parse(structResult.value);
          if (Array.isArray(arr)) setStructures(arr);
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

  function applyLoadedData(data) {
    if (data.mapSizeChunks) {
      setGridX(clamp(data.mapSizeChunks.x, 1, MAX_CHUNKS.x));
      setGridY(clamp(data.mapSizeChunks.y, 1, MAX_CHUNKS.y));
      setGridZ(clamp(data.mapSizeChunks.z, 1, MAX_CHUNKS.z));
    }
    if (data.biomeName) setBiomeName(data.biomeName);
    if (typeof data.gameMode === "number") setGameMode(data.gameMode);
    if (Array.isArray(data.paletteLabels)) {
      setPalette(
        data.paletteLabels.map((p) => (BLOCK_NAMES[p.id] ? { ...p, label: BLOCK_NAMES[p.id] } : p))
      );
    }
    if (Array.isArray(data.hotbar)) {
      const slots = new Array(10).fill(null);
      for (let i = 0; i < 10; i++) slots[i] = data.hotbar[i] || null;
      setHotbar(slots);
    }
    // const m = new Map<string, Voxel>();
    if (Array.isArray(data.voxels)) {
      for (const v of data.voxels) {
        // m.set(keyOf(v.x, v.y, v.z), { block: v.block, meta: v.meta || 0 });
        terrain.set(v.x, v.y, v.z, v.block, v.meta || 0 );
      }
    }
    //voxelsRef.current = m; //REMOVE
    // terrain.replaceAll(m);
    undoStackRef.current = [];
    setVoxelCount(terrain.size);

    if (Array.isArray(data.entities)) {
      setEntityInstances(
        data.entities.map((e) => ({
          id: Date.now() + Math.floor(Math.random() * 1000000),
          name: e.name,
          x: e.x,
          y: e.y,
          z: e.z,
          items: Array.isArray(e.items) ? e.items.map(String) : [],
        }))
      );
    } else {
      setEntityInstances([]);
    }
  }

  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const data = buildExportData();
        data.paletteLabels = palette;
        data.hotbar = hotbarRef.current;
        data.cameraMode = cameraMode;
        await localStorage.set(STORAGE_KEY, JSON.stringify(data), false);
        setStatus(STRINGS.en.savedAt(new Date().toLocaleTimeString()));
      } catch (e) {
        setStatus(STRINGS.en.saveError);
      }
    }, 700);
  }

  // ---- textures ----
  async function saveTextures() {
    try {
      const obj = {};
      for (const [id, url] of texturesRef.current) obj[id] = url;
      await localStorage.set(TEXTURES_STORAGE_KEY, JSON.stringify(obj), false);
    } catch (e) {
      // ignore, non-critical
    }
  }

  function handleTextureFile(blockId, file) {
    if (!file) return;
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
      if (viewMode === "3d") rebuildInstances();
      saveTextures();
    };
    reader.readAsDataURL(file);
  }

  function clearTexture(blockId) {
    texturesRef.current.delete(blockId);
    textureImg2DRef.current.delete(blockId);
    textureThreeCacheRef.current.delete(blockId);
    setTextureVersion((v) => v + 1);
    draw();
    if (viewMode === "3d") rebuildInstances();
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

  function updateBulkRowId(index, id) {
    setBulkTextureRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, id: id === "" ? null : clamp(id, 1, 255) } : r))
    );
  }

  function toggleBulkRow(index) {
    setBulkTextureRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, include: !r.include } : r))
    );
  }

  async function applyBulkTextures() {
    const rows = bulkTextureRows.filter((r) => r.include && r.id !== null);
    if (!rows.length) return;
    setBulkApplying(true);
    for (const row of rows) {
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
    if (viewMode === "3d") rebuildInstances();
    await saveTextures();
    setStatus(STRINGS.en.bulkTexturesApplied(rows.length));
    bulkTextureRows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setBulkTextureRows([]);
    setBulkApplying(false);
    setShowBulkTexturePanel(false);
  }

  function buildMaterialForBlock(blockId) {
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
      await localStorage.set(STRUCTURES_STORAGE_KEY, JSON.stringify(list), false);
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
          if (!Array.isArray(data.voxels)) return;
          const sizeX = data.sizeX || 1;
          const sizeY = data.sizeY || 1;
          const sizeZ = data.sizeZ || 1;
          const entry = {
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

  function stampStructureAt(anchorX, anchorY, anchorZ, entry, rotationSteps) {
    const dims = dimsRef.current;
    const rotated = getRotatedStructure(entry, rotationSteps);
    beginStroke();
    for (const v of rotated.voxels) {
      const wx = anchorX + v.x;
      const wy = anchorY + v.y;
      const wz = anchorZ + v.z;
      if (wx < 0 || wx >= dims.width || wy < 0 || wy >= dims.totalHeight || wz < 0 || wz >= dims.depth)
        continue;
      const key = keyOf(wx, wy, wz);
      //const oldEntry = voxelsRef.current.get(key);
      const oldEntry = terrain.get(wx, wy, wz);
      const oldBlock = oldEntry ? oldEntry.block : AIR;
      setVoxel(wx, wy, wz, v.block, v.meta || 0, true);
      if (viewModeRef.current === "3d") syncVoxel3D(wx, wy, wz, oldBlock, v.block);
    }
    commitStroke();
    draw();
  }

  // ---- entity placement (not voxels - separate marker list) ----
  function placeEntityAt(name, x, y, z) {
    const dims = dimsRef.current;
    if (x < 0 || x >= dims.width || y < 0 || y >= dims.totalHeight || z < 0 || z >= dims.depth)
      return;
    if (
      SINGLETON_ENTITY_NAMES.has(name) &&
      entityInstancesRef.current.some((e) => e.name === name)
    ) {
      setStatus(STRINGS.en.entitySingletonBlocked(name));
      return;
    }
    if (SERVICE_ENTITY_NAMES.has(name)) {
      setStatus(STRINGS.en.entityService(name));
      return;
    }
    const taken = new Set();
    for (const other of entityInstancesRef.current) {
      if (!DEVICE_CELLS[other.name]) continue;
      for (const [cx, cy, cz] of DEVICE_CELLS[other.name]) taken.add(keyOf(other.x + cx, other.y + cy, other.z + cz));
    }
    if (DEVICE_CELLS[name]) {
      for (const [cx, cy, cz] of DEVICE_CELLS[name]) {
        if (taken.has(keyOf(x + cx, y + cy, z + cz))) {
          setStatus(STRINGS.en.entityOverlap(name));
          return;
        }
      }
    }
    const instance = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name,
      x,
      y,
      z,
      items: [],
    };
    setEntityInstances((prev) => [...prev, instance]);
    draw();
    scheduleSave();
  }

  function setEntityItems(id, text) {
    const items = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setEntityInstances((prev) => prev.map((e) => (e.id === id ? { ...e, items } : e)));
    scheduleSave();
  }

  function applyServerEdits(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const edits = JSON.parse(reader.result?.toString() || "");
        if (!Array.isArray(edits)) throw new Error("expected an array of [x, y, z, block]");
        const dims = dimsRef.current;
        beginStroke();
        let n = 0;
        for (const ed of edits) {
          if (!Array.isArray(ed) || ed.length < 4) continue;
          const [x, y, z, block] = ed.map(Number);
          if (x < 0 || x >= dims.width || y < 0 || y >= dims.totalHeight || z < 0 || z >= dims.depth) continue;
          setVoxel(x, y, z, block, 0, true);
          n++;
        }
        commitStroke();
        //setVoxelCount(voxelsRef.current.size);
        setVoxelCount(terrain.size);
        if (viewModeRef.current === "3d") rebuildInstances();
        draw();
        scheduleSave();
        setStatus(STRINGS.en.editsApplied(n));
      } catch (err) {
        setStatus(STRINGS.en.importError((err as Error).message));
      }
    };
    reader.readAsText(file);
  }

  function removeEntityInstance(id) {
    setEntityInstances((prev) => prev.filter((e) => e.id !== id));
    draw();
    scheduleSave();
  }

  function clearAllEntityInstances() {
    setEntityInstances([]);
    draw();
    scheduleSave();
  }

  function saveCurrentMapAsStructure(name, category) {
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

  function exportStructure(entry) {
    const data = {
      name: entry.name,
      category: entry.category || "other",
      sizeX: entry.sizeX,
      sizeY: entry.sizeY,
      sizeZ: entry.sizeZ,
      voxels: entry.voxels,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (entry.name || "structure").replace(/\s+/g, "_") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  function setVoxel(x, y, z, block, meta, record) {
    terrain.set(x, y, z, block, meta);
  }

  function beginStroke() {
    terrain.begin();
  }

  function commitStroke() {
    terrain.commit();
  }

  function undo() {
    terrain.undo();
  }

  function redo() {
    terrain.redo();
  }

  // ---- mirror painting ----
  function setVoxelMirrored(x, y, z, block, meta, record) {
    setVoxel(x, y, z, block, meta, record);
    const mx = width - 1 - x;
    const mz = depth - 1 - z;
    if (mirrorX && mx !== x) setVoxel(mx, y, z, block, meta, record);
    if (mirrorZ && mz !== z) setVoxel(x, y, mz, block, meta, record);
    if (mirrorX && mirrorZ && (mx !== x || mz !== z)) setVoxel(mx, y, mz, block, meta, record);
  }

  // ---- copy / paste a rectangular volume (spans a Y-layer range) ----
  function copyRegion(x0, z0, x1, z1) {
    const minX = Math.max(0, Math.min(x0, x1));
    const maxX = Math.min(width - 1, Math.max(x0, x1));
    const minZ = Math.max(0, Math.min(z0, z1));
    const maxZ = Math.min(depth - 1, Math.max(z0, z1));
    const minY = Math.max(0, Math.min(copyYFrom, copyYTo));
    const maxY = Math.min(totalHeight - 1, Math.max(copyYFrom, copyYTo));
    const cells:{
      dx,
      dy,
      dz,
      block,
      meta
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

  function pasteRegionAt(x0, z0) {
    const clip = clipboardRef.current;
    if (!clip) return;
    beginStroke();
    for (const c of clip.cells) {
      const x = x0 + c.dx;
      const y = currentLayer + c.dy;
      const z = z0 + c.dz;
      if (x < 0 || x >= width || y < 0 || y >= totalHeight || z < 0 || z >= depth) continue;
      setVoxelMirrored(x, y, z, c.block, c.meta, true);
    }
    commitStroke();
    draw();
    if (viewMode === "3d") rebuildInstances();
  }

  // ---- road / path tool ----
  function findSurfaceY(x, z) {
    for (let y = totalHeight - 1; y >= 0; y--) {
      // const v = voxelsRef.current.get(keyOf(x, y, z));
      const v = terrain.get(x, y, z);
      if (v && v.block !== AIR) return y;
    }
    return -1;
  }

  function drawRoad(x0, z0, x1, z1, widthBlocks, pathBlock) {
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
          const sy = findSurfaceY(wx, wz);
          if (sy < 0) continue;
          // const oldEntry = voxelsRef.current.get(keyOf(wx, sy, wz));
          const oldEntry = terrain.get(wx, sy, wz);
          const oldBlock = oldEntry ? oldEntry.block : AIR;
          setVoxel(wx, sy, wz, pathBlock, 0, true);
          if (viewModeRef.current === "3d") syncVoxel3D(wx, sy, wz, oldBlock, pathBlock);
        }
      }
    }
    commitStroke();
    draw();
  }

  function randomizeAllParams() {
    const r = (min, max) => Math.round(min + Math.random() * (max - min));
    setRandSeed(Math.floor(Math.random() * 1000000));
    setRandMinH(r(0, 5));
    const maxH = r(15, 40);
    setRandMaxH(maxH);
    setRandGroundDepth(r(15, 50));
    setRandHillStrength(r(20, 70));
    setRandMountainHeight(r(15, 45));
    setRandPlateauHeight(r(10, 30));
    setRandValleyDepth(r(8, 25));
    setRandRiverWidth(r(2, 15));
    setRandLakeSize(r(2, 8));
    setRandCaveDensity(r(15, 50));
    setRandTreeDensity(r(5, 30));
    setRandForestDensity(r(30, 70));
    setRandOreCount(r(10, 80));
    setRandErosionStrength(r(20, 60));
    setRandIslandIrregularity(r(20, 80));
    setRandIslandSize(["small", "medium", "large"][Math.floor(Math.random() * 3)]);
    setRandBottomRoughness(r(10, 35));
    setRandMaxThickness(r(15, 35));
    setStatus(STRINGS.en.randomizedAll);
  }

  function generateRandomTerrain() {
    const seedVal = Number(randSeed) || Math.floor(Math.random() * 1e9);
    const rand = mulberry32(seedVal);
    const noiseCoarse = makeValueNoise(rand, width, depth, 18);
    const noiseFine = makeValueNoise(rand, width, depth, 6);
    const mountainMask = makeValueNoise(rand, width, depth, 40);
    const mountainDetail = makeValueNoise(rand, width, depth, 10);
    const plateauMask = randPlateaus ? makeValueNoise(rand, width, depth, 34) : null;
    const valleyMask = randValleys ? makeValueNoise(rand, width, depth, 30) : null;
    const valleyDetail = randValleys ? makeValueNoise(rand, width, depth, 9) : null;
    const riverNoise = randRivers ? makeValueNoise(rand, width, depth, 24) : null;
    const lakeNoise = randLakes ? makeValueNoise(rand, width, depth, 30) : null;
    const forestMask = randForests ? makeValueNoise(rand, width, depth, 20) : null;
    const islandShapeNoise = randIsland
      ? makeValueNoise(rand, width, depth, Math.max(8, Math.max(width, depth) / 3.2))
      : null;
    const raggedBottom = randIsland && randIslandMode !== "island";
    const bottomNoiseCoarse = raggedBottom
      ? makeValueNoise(rand, width, depth, Math.max(8, Math.max(width, depth) / 4))
      : null;
    const bottomNoiseFine = raggedBottom ? makeValueNoise(rand, width, depth, 6) : null;
    const caveNoise = randCaves
      ? makeValueNoise3D(rand, width, totalHeight, depth, 8)
      : null;

    const minH = clamp(randMinH, 0, totalHeight);
    const maxH = clamp(randMaxH, minH, totalHeight);
    const groundDepth = clamp(randGroundDepth, 0, totalHeight);
    const bottomRoughness = clamp(randBottomRoughness, 0, totalHeight);
    const maxThickness = clamp(randMaxThickness, 1, totalHeight);
    const baseBlock = clamp(randBaseBlock, 1, 255);
    const surfaceBlock = clamp(randSurfaceBlock, 1, 255);
    const decoWeightedList = parseWeightedIdList(randDecoBlocks);
    const decoChance = clamp(randDecoChance, 0, 100) / 100;
    const hillStrength = clamp(randHillStrength, 0, 100) / 100;
    const mountainBoost = clamp(randMountainHeight, 0, totalHeight);
    const plateauHeight = clamp(randPlateauHeight, 1, totalHeight);
    const valleyDepth = clamp(randValleyDepth, 1, totalHeight);
    const riverBlock = clamp(randRiverBlock, 1, 255);
    const riverThreshold = clamp(randRiverWidth, 1, 40) / 100;
    const lakeBlock = clamp(randLakeBlock, 1, 255);
    const lakeThreshold = 1 - clamp(randLakeSize, 1, 10) / 12;
    const caveThreshold = 1 - clamp(randCaveDensity, 0, 100) / 100;
    const forestDensity = clamp(randForestDensity, 0, 100) / 100;
    const islandIrregularity = clamp(randIslandIrregularity, 0, 100) / 100;
    const islandMarginFactor =
      { small: 0.42, medium: 0.7, large: 0.96 }[randIslandSize] || 0.96;
    const isFloatingIsland = randIslandMode !== "island";
    const seaLevel = clamp(randSeaLevel, 0, totalHeight);
    const seaBlock = clamp(randSeaBlock, 1, 255);
    const riverLakeSurfaceH = isFloatingIsland
      ? groundDepth + Math.max(1, Math.round(minH * 0.6))
      : seaLevel;

    const islandCenters:{
      x:number,
      z:number,
      radius:number
    }[] = [];
    if (randIsland) {
      if (randArchipelago) {
        const count = clamp(randIslandCount, 1, 8);
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

    const altitudeOn = randAltitudeBlocks;
    const beachLevel = clamp(randBeachLevel, 0, totalHeight);
    const beachBlock = clamp(randBeachBlock, 1, 255);
    const snowLevel = clamp(randSnowLevel, 0, totalHeight);
    const snowBlock = clamp(randSnowBlock, 1, 255);

    const oresOn = randOres;
    const oreBlockList = parseIdList(randOreBlocks);
    const oreCountScaled = Math.round(
      clamp(randOreCount, 0, 500) * ((width * depth) / (128 * 128))
    );
    const oreVeinR = clamp(randOreVeinSize, 1, 5);

    const caveGlowOn = randCaveGlow && randCaves;
    const caveGlowChance = clamp(randCaveGlowChance, 0, 100) / 100;
    const caveGlowBlock = clamp(randCaveGlowBlock, 1, 255);

    const shoreBlock = clamp(randShoreBlock, 1, 255);
    const shoreRadius = clamp(randShoreRadius, 1, 5);

    const treeChance = clamp(randTreeDensity, 0, 100) / 100;
    const treeMinH = clamp(randTreeMinHeight, 1, 20);
    const treeMaxH = clamp(randTreeMaxHeight, treeMinH, 20);
    const treeWood = clamp(randTreeWoodBlock, 1, 255);
    const treeLeaves = clamp(randTreeLeavesBlock, 1, 255);
    const treeSpacing = clamp(randTreeSpacing, 0, 20);
    const plantedTrees:{x,z}[] = [];

    function canPlantTree(tx, tz) {
      const spacing2 = treeSpacing * treeSpacing;
      for (const p of plantedTrees) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < spacing2) return false;
      }
      return true;
    }

    function plantTree(tx, groundY, tz) {
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

    const bushChance = clamp(randBushDensity, 0, 100) / 100;
    const bushBlock = clamp(randBushBlock, 1, 255);
    const bushSpacing = clamp(randBushSpacing, 0, 10);
    const plantedBushes:{
      x: number,
      z: number
    }[] = [];

    function canPlantBush(tx, tz) {
      const spacing2 = bushSpacing * bushSpacing;
      for (const p of plantedBushes) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < spacing2) return false;
      }
      return true;
    }

    function plantBush(tx, groundY, tz) {
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
        let n = randHills
          ? noiseCoarse(x, z) * (1 - hillStrength * 0.5) + noiseFine(x, z) * hillStrength
          : noiseCoarse(x, z);

        if (randIsland) {
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

        if (randMountains) {
          const mask = mountainMask(x, z);
          if (mask > 0.6) {
            const ridged = 1 - Math.abs(mountainDetail(x, z) * 2 - 1);
            const strength = (mask - 0.6) / 0.4;
            h += Math.round(ridged * mountainBoost * strength);
          }
        }

        if (randPlateaus && plateauMask) {
          const mask = plateauMask(x, z);
          if (mask > 0.62) {
            const strength = (mask - 0.62) / 0.38;
            h = Math.round(h * (1 - strength) + plateauHeight * strength);
          }
        }

        if (randValleys && valleyMask) {
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
        if (randRivers && riverNoise) {
          const rv = Math.abs(riverNoise(x, z) * 2 - 1);
          if (rv < riverThreshold) {
            isWater = true;
            waterBlock = riverBlock;
            h = Math.min(h, riverLakeSurfaceH);
          }
        }
        if (!isWater && randLakes && lakeNoise) {
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

    if (randErosion) {
      const erosionStrength = clamp(randErosionStrength, 0, 100) / 100;
      const erosionIterations = clamp(randErosionIterations, 1, 5);
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
    if (randSmoothShore) {
      shoreMap = new Uint8Array(width * depth);
      const r2 = shoreRadius * shoreRadius;
      const shoreNoise = makeValueNoise(rand, width, depth, Math.max(6, shoreRadius * 4));
      const shoreThreshold = 1 - clamp(randShoreCoverage, 0, 100) / 100;
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
        if (!isWater && !isSubmerged && height < totalHeight && randTrees) {
          let effectiveTreeChance = treeChance;
          if (randForests && forestMask) {
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
          randBushes &&
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

    if (randWaterfalls && randRivers) {
      const dropThreshold = clamp(randWaterfallDrop, 2, 30);
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
      const oreBigChance = clamp(randOreBigChance, 0, 100) / 100;
      const oreBigR = clamp(randOreBigSize, 1, 10);

      function placeOreBlob(cx, cy, cz, oreBlock, r) {
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
    draw();
    setStatus(STRINGS.en.generatedSeed(seedVal));
    if (viewMode === "3d") rebuildInstances();

    lastHeightMapRef.current = {
      width,
      depth,
      totalHeight,
      heightMap: heightMap.slice(),
      isWaterMap: Array.from(isWaterMap),
    };
  }

  // ---- targeted regeneration (decor / trees / ore only, reuses last heightMap) ----
  function clearVoxelsByBlockIds(idSet) {
    const toRemove:VoxelCell[] = [];
    for (const voxel of Array.from(terrain.cells())) {
      if (idSet.has(voxel.block)) toRemove.push(voxel);
    }
    
    for (const voxel of toRemove) {
      setVoxel(voxel.x, voxel.y, voxel.z, AIR, 0, true);
    }
  }

  function plantTreeStandalone(rand, tx, groundY, tz, opts) {
    const { treeWood, treeLeaves, treeMinH, treeMaxH, width, depth, totalHeight } = opts;
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
  }

  function plantBushStandalone(rand, tx, groundY, tz, opts) {
    const { bushBlock, width, depth, totalHeight } = opts;
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
  }

  function regenerateDecorations() {
    const snap = lastHeightMapRef.current;
    if (!snap || snap.width !== width || snap.depth !== depth || snap.totalHeight !== totalHeight) {
      setStatus(STRINGS.en.regenNeedsGenerate);
      return;
    }
    const rand = mulberry32(Math.floor(Math.random() * 1e9));
    const decoWeightedList = parseWeightedIdList(randDecoBlocks);
    const decoChance = clamp(randDecoChance, 0, 100) / 100;
    if (!decoWeightedList.length || decoChance <= 0) {
      setStatus(STRINGS.en.regenNothingToDo);
      return;
    }
    const idSet = new Set(decoWeightedList.map((e) => e?.id ));
    beginStroke();
    clearVoxelsByBlockIds(idSet);
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const idx = x * depth + z;
        const h = snap.heightMap[idx];
        if (h <= 0 || h >= totalHeight || snap.isWaterMap[idx]) continue;
        if (rand() < decoChance) {
          const pick = pickWeighted(decoWeightedList, rand);
          setVoxel(x, h, z, pick, 0, true);
        }
      }
    }
    commitStroke();
    draw();
    if (viewMode === "3d") rebuildInstances();
    setStatus(STRINGS.en.regenDone);
  }

  function regenerateTrees() {
    const snap = lastHeightMapRef.current;
    if (!snap || snap.width !== width || snap.depth !== depth || snap.totalHeight !== totalHeight) {
      setStatus(STRINGS.en.regenNeedsGenerate);
      return;
    }
    if (!randTrees && !randBushes) {
      setStatus(STRINGS.en.regenNothingToDo);
      return;
    }
    const rand = mulberry32(Math.floor(Math.random() * 1e9));
    const treeChance = clamp(randTreeDensity, 0, 100) / 100;
    const treeMinH = clamp(randTreeMinHeight, 1, 20);
    const treeMaxH = clamp(randTreeMaxHeight, treeMinH, 20);
    const treeWood = clamp(randTreeWoodBlock, 1, 255);
    const treeLeaves = clamp(randTreeLeavesBlock, 1, 255);
    const treeSpacing = clamp(randTreeSpacing, 0, 20);
    const forestDensity = clamp(randForestDensity, 0, 100) / 100;
    const forestMask = randForests ? makeValueNoise(rand, width, depth, 20) : null;
    const bushChance = clamp(randBushDensity, 0, 100) / 100;
    const bushBlock = clamp(randBushBlock, 1, 255);
    const bushSpacing = clamp(randBushSpacing, 0, 10);
    const idSet = new Set([treeWood, treeLeaves, bushBlock]);
    const plantedT:{x,z}[] = [];
    const plantedB:{x,z}[] = [];
    function canPlant(list, tx, tz, spacing) {
      const s2 = spacing * spacing;
      for (const p of list) {
        const dx = tx - p.x;
        const dz = tz - p.z;
        if (dx * dx + dz * dz < s2) return false;
      }
      return true;
    }
    beginStroke();
    clearVoxelsByBlockIds(idSet);
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const idx = x * depth + z;
        const h = snap.heightMap[idx];
        if (h <= 0 || h >= totalHeight || snap.isWaterMap[idx]) continue;

        let treePlanted = false;
        if (randTrees) {
          let chance = treeChance;
          if (randForests && forestMask) chance = forestMask(x, z) > 0.55 ? forestDensity : 0;
          if (chance > 0 && rand() < chance && canPlant(plantedT, x, z, treeSpacing)) {
            plantTreeStandalone(rand, x, h, z, {
              treeWood,
              treeLeaves,
              treeMinH,
              treeMaxH,
              width,
              depth,
              totalHeight,
            });
            plantedT.push({ x, z });
            treePlanted = true;
          }
        }

        if (
          !treePlanted &&
          randBushes &&
          bushChance > 0 &&
          rand() < bushChance &&
          canPlant(plantedB, x, z, bushSpacing)
        ) {
          plantBushStandalone(rand, x, h, z, { bushBlock, width, depth, totalHeight });
          plantedB.push({ x, z });
        }
      }
    }
    commitStroke();
    draw();
    if (viewMode === "3d") rebuildInstances();
    setStatus(STRINGS.en.regenDone);
  }

  function regenerateOre() {
    const snap = lastHeightMapRef.current;
    if (!snap || snap.width !== width || snap.depth !== depth || snap.totalHeight !== totalHeight) {
      setStatus(STRINGS.en.regenNeedsGenerate);
      return;
    }
    const oreBlockList = parseIdList(randOreBlocks);
    const oreCountScaled = Math.round(
      clamp(randOreCount, 0, 500) * ((width * depth) / (128 * 128))
    );
    if (!oreBlockList.length || oreCountScaled <= 0) {
      setStatus(STRINGS.en.regenNothingToDo);
      return;
    }
    const groundDepth = clamp(randGroundDepth, 0, totalHeight);
    const oreVeinR = clamp(randOreVeinSize, 1, 5);
    const oreBigChance = clamp(randOreBigChance, 0, 100) / 100;
    const oreBigR = clamp(randOreBigSize, 1, 10);
    const rand = mulberry32(Math.floor(Math.random() * 1e9));
    const idSet = new Set(oreBlockList);

    function placeOreBlob(cx, cy, cz, oreBlock, r) {
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
            // const existing = voxelsRef.current.get(keyOf(wx, wy, wz));
            const existing = terrain.get(wx, wy, wz);
            if (!existing || existing.block === AIR) continue;
            setVoxel(wx, wy, wz, oreBlock, 0, true);
          }
        }
      }
    }

    beginStroke();
    clearVoxelsByBlockIds(idSet);
    for (let i = 0; i < oreCountScaled; i++) {
      const ox = Math.floor(rand() * width);
      const oz = Math.floor(rand() * depth);
      const colH = snap.heightMap[ox * depth + oz];
      if (colH < 3) continue;
      const maxY = Math.min(colH - 2, groundDepth - 1);
      if (maxY < 1) continue;
      const oy = 1 + Math.floor(rand() * maxY);
      const oreBlock = oreBlockList[Math.floor(rand() * oreBlockList.length)];
      if (rand() < oreBigChance) {
        const blobCount = 3 + Math.floor(rand() * 4);
        let cx = ox;
        let cy = oy;
        let cz = oz;
        for (let b = 0; b < blobCount; b++) {
          placeOreBlob(cx, cy, cz, oreBlock, oreBigR);
          cx = Math.max(0, Math.min(width - 1, cx + Math.round((rand() - 0.5) * oreBigR)));
          cy = Math.max(1, Math.min(maxY, cy + Math.round((rand() - 0.5) * oreBigR * 0.6)));
          cz = Math.max(0, Math.min(depth - 1, cz + Math.round((rand() - 0.5) * oreBigR)));
        }
      } else {
        placeOreBlob(ox, oy, oz, oreBlock, oreVeinR);
      }
    }
    commitStroke();
    draw();
    if (viewMode === "3d") rebuildInstances();
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

  function clampPhi(p) {
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

  function rebuildInstances() {
    const st = threeRef.current;
    const scene = st.scene;
    if (!scene) return;
    const dims = dimsRef.current;

    for (const g of st.groups.values()) {
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    }
    st.groups = new Map();

    if (st.planeMesh) {
      scene.remove(st.planeMesh);
      st.planeMesh.geometry.dispose();
      st.planeMesh.material.dispose();
      st.planeMesh = null;
    }
    if (st.gridHelper) {
      scene.remove(st.gridHelper);
      st.gridHelper = null;
    }

    const byBlock = new Map();
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
      const coords = new Array(capacity);
      const indexMap = new Map();
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

    st.orbit.target = {
      x: dims.width / 2,
      y: Math.min(dims.totalHeight, 20) / 2,
      z: dims.depth / 2,
    };
    st.orbit.targetGoal = { ...st.orbit.target };
    if (!st.orbit.initialized) {
      st.orbit.radius =
        Math.max(dims.width, dims.depth, dims.totalHeight, 4) * 1.3 + 10;
      st.orbit.targetRadius = st.orbit.radius;
      st.orbit.initialized = true;
    }

    if (!st.fly.initialized) {
      const cx = dims.width / 2;
      const cy = Math.min(dims.totalHeight, 20) / 2;
      const cz = dims.depth / 2;
      const dist =
        Math.max(dims.width, dims.depth, dims.totalHeight, 4) * 0.9 + 12;
      const px = cx;
      const py = cy + dist * 0.45;
      const pz = cz + dist;
      st.fly.position = { x: px, y: py, z: pz };
      const dx = cx - px;
      const dy = cy - py;
      const dz = cz - pz;
      const horiz = Math.sqrt(dx * dx + dz * dz) || 0.0001;
      st.fly.yaw = Math.atan2(-dx, -dz);
      st.fly.pitch = Math.atan2(dy, horiz);
      st.fly.velocity = { x: 0, y: 0, z: 0 };
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

    const instances = entityInstancesRef.current;
    if (!instances.length) return;

    const group = new THREE.Group();
    const markerGeometry = new THREE.BoxGeometry(0.5, 0.9, 0.5);
    const cellGeometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const materials = {};
    function materialFor(category, cell) {
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

  function getOrCreateGroup(blockId) {
    const st = threeRef.current;
    let g = st.groups.get(blockId);
    if (g) return g;
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

  function growGroup(blockId) {
    const st = threeRef.current;
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

  function addInstance(blockId, x, y, z) {
    if (blockId === AIR) return;
    let g = getOrCreateGroup(blockId);
    const key = keyOf(x, y, z);
    if (g.indexMap.has(key)) return;
    if (g.count >= g.capacity) {
      growGroup(blockId);
      g = threeRef.current.groups.get(blockId);
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

  function removeInstanceAtCoord(blockId, x, y, z) {
    const st = threeRef.current;
    const g = st.groups.get(blockId);
    if (!g) return;
    const key = keyOf(x, y, z);
    const idx = g.indexMap.get(key);
    if (idx === undefined) return;
    const lastIdx = g.count - 1;
    if (idx !== lastIdx) {
      const lastCoord = g.coords[lastIdx];
      const m = new THREE.Matrix4();
      g.mesh.getMatrixAt(lastIdx, m);
      g.mesh.setMatrixAt(idx, m);
      g.coords[idx] = lastCoord;
      g.indexMap.set(keyOf(lastCoord.x, lastCoord.y, lastCoord.z), idx);
    }
    g.indexMap.delete(key);
    g.coords[lastIdx] = null;
    g.count--;
    g.mesh.count = g.count;
    g.mesh.instanceMatrix.needsUpdate = true;
  }

  function syncVoxel3D(x, y, z, oldBlock, newBlock) {
    if (oldBlock === newBlock) return;
    if (oldBlock !== AIR) removeInstanceAtCoord(oldBlock, x, y, z);
    if (newBlock !== AIR) addInstance(newBlock, x, y, z);
  }

  function panOrbit(dx, dy) {
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

  function coordFromHit(hit) {
    const st = threeRef.current;
    if (hit.object === st.planeMesh) return null;
    const blockId = hit.object.userData ? hit.object.userData.blockId : undefined;
    const g = blockId !== undefined ? st.groups.get(blockId) : null;
    if (!g) return null;
    const coord = g.coords[hit.instanceId];
    if (!coord) return null;
    return { ...coord, blockId };
  }

  function performMouseRaycastAction(clientX, clientY, isContinuous) {
    const st = threeRef.current;
    const canvas = canvas3dRef.current;
    if (!canvas || !st.camera || !st.raycaster) return;
    const dims = dimsRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((clientY - rect.top) / rect.height) * 2 + 1;
    st.raycaster.setFromCamera({ x: mx, y: my }, st.camera);

    const targets = raycastTargets();
    if (!targets.length) return;
    const hits = st.raycaster.intersectObjects(targets, false);
    if (!hits.length) return;
    const hit = hits[0];
    const isErase = toolRef.current === "eraser";
    let cx, cy, cz;

    const hitCoord = coordFromHit(hit);
    if (hitCoord) {
      if (isErase) {
        cx = hitCoord.x;
        cy = hitCoord.y;
        cz = hitCoord.z;
      } else {
        const n = hit.face.normal;
        cx = hitCoord.x + Math.round(n.x);
        cy = hitCoord.y + Math.round(n.y);
        cz = hitCoord.z + Math.round(n.z);
      }
    } else {
      if (isErase) return;
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
      cy >= dims.totalHeight
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

    // const oldEntry = voxelsRef.current.get(keyOf(cx, cy, cz));
    const oldEntry = terrain.get(cx,cy,cz);
    const oldBlock = oldEntry ? oldEntry.block : AIR;
    const newBlock = isErase ? AIR : selectedBlockRef.current;
    setVoxel(cx, cy, cz, newBlock, 0, true);
    syncVoxel3D(cx, cy, cz, oldBlock, newBlock);
    setCurrentLayer(cy);
  }

  function raycastFromCamera() {
    const st = threeRef.current;
    if (!st.camera || !st.raycaster) return null;
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(st.camera.quaternion);
    st.raycaster.set(st.camera.position, dir);
    const targets = raycastTargets();
    if (!targets.length) return null;
    const hits = st.raycaster.intersectObjects(targets, false);
    return hits.length ? hits[0] : null;
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
      cy >= dims.totalHeight
    )
      return;
    setVoxel(cx, cy, cz, AIR, 0, true);
    syncVoxel3D(cx, cy, cz, blockId, AIR);
    setCurrentLayer(cy);
  }

  function performPlace() {
    const hit = raycastFromCamera();
    if (!hit) return;
    const dims = dimsRef.current;
    let cx, cy, cz;
    const hitCoord = coordFromHit(hit);
    if (hitCoord) {
      const n = hit.face.normal;
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
      cy >= dims.totalHeight
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
    setVoxel(cx, cy, cz, newBlock, 0, true);
    syncVoxel3D(cx, cy, cz, oldBlock, newBlock);
    setCurrentLayer(cy);
  }

  function attachOrbitListeners(canvas) {
    const st = threeRef.current;
    function onMouseDown(e) {
      st.drag.isDown = true;
      st.drag.button = e.button;
      st.drag.lastX = e.clientX;
      st.drag.lastY = e.clientY;
      if (e.button === 0) {
        beginStroke();
        performMouseRaycastAction(e.clientX, e.clientY, false);
      }
    }
    function onMouseMove(e) {
      if (!st.drag.isDown) return;
      const dx = e.clientX - st.drag.lastX;
      const dy = e.clientY - st.drag.lastY;
      if (st.drag.button === 0) {
        performMouseRaycastAction(e.clientX, e.clientY, true);
      } else if (st.drag.button === 2 && !e.shiftKey) {
        st.orbit.thetaDelta -= dx * 0.008;
        st.orbit.phiDelta -= dy * 0.008;
      } else if (st.drag.button === 1 || (st.drag.button === 2 && e.shiftKey)) {
        panOrbit(dx, dy);
      }
      st.drag.lastX = e.clientX;
      st.drag.lastY = e.clientY;
    }
    function onMouseUp(e) {
      if (st.drag.isDown && e.button === st.drag.button) {
        if (e.button === 0) commitStroke();
        st.drag.isDown = false;
      }
    }
    function onWheel(e) {
      e.preventDefault();
      const canvas2 = canvas3dRef.current;
      if (!canvas2 || !st.camera || !st.raycaster) return;
      const rect = canvas2.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      st.raycaster.setFromCamera({ x: mx, y: my }, st.camera);
      const dir = st.raycaster.ray.direction.clone();
      const dims = dimsRef.current;
      const maxR = Math.max(dims.width, dims.depth, dims.totalHeight, 4) * 4 + 20;
      const oldTarget = st.orbit.targetRadius;
      const newTarget = Math.max(
        4,
        Math.min(maxR, oldTarget * (1 + e.deltaY * 0.001))
      );
      const delta = newTarget - oldTarget;
      st.orbit.targetGoal.x += dir.x * -delta;
      st.orbit.targetGoal.y += dir.y * -delta;
      st.orbit.targetGoal.z += dir.z * -delta;
      st.orbit.targetRadius = newTarget;
    }
    function onContextMenu(e) {
      e.preventDefault();
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

  function attachFlyListeners(canvas) {
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
    function onMouseMove(e) {
      if (!st.locked) return;
      const sens = 0.0022;
      st.fly.yaw -= e.movementX * sens;
      st.fly.pitch -= e.movementY * sens;
      const lim = Math.PI / 2 - 0.02;
      st.fly.pitch = Math.max(-lim, Math.min(lim, st.fly.pitch));
    }
    function onMouseDown(e) {
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
    function onMouseUp(e) {
      if (e.button === 0 && st.leftDown) {
        st.leftDown = false;
        commitStroke();
      }
    }
    function onContextMenu(e) {
      e.preventDefault();
    }
    function onKeyDown(e) {
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
    function onKeyUp(e) {
      if (e.code === "KeyW") st.keys.forward = false;
      else if (e.code === "KeyS") st.keys.back = false;
      else if (e.code === "KeyA") st.keys.left = false;
      else if (e.code === "KeyD") st.keys.right = false;
      else if (e.code === "Space") st.keys.up = false;
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight")
        st.keys.down = false;
    }
    function onWheel(e) {
      e.preventDefault();
      if (!st.camera) return;
      st.camera.fov = Math.max(15, Math.min(100, st.camera.fov * (1 + e.deltaY * 0.001)));
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
    if (viewMode === "3d") rebuildEntityMarkers();
  }, [entityInstances, viewMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    function onWheel2d(e) {
      if (viewModeRef.current !== "2d") return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      const px = ox + el.scrollLeft;
      const py = oy + el.scrollTop;
      const old = zoomRef.current;
      const next = Math.round(clamp(old * (e.deltaY > 0 ? 0.9 : 1 / 0.9), 0.4, 3) * 100) / 100;
      if (next === old) return;
      zoomRef.current = next;
      setZoom(next);
      requestAnimationFrame(() => {
        el.scrollLeft = px * (next / old) - ox;
        el.scrollTop = py * (next / old) - oy;
      });
    }
    el.addEventListener("wheel", onWheel2d, { passive: false });
    return () => el.removeEventListener("wheel", onWheel2d);
  }, []);

  useEffect(() => {
    if (viewMode !== "3d") return undefined;
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
    const detach =
      mode === "orbit" ? attachOrbitListeners(canvas) : attachFlyListeners(canvas);

    let raf;
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
        const zoomFactor = 1 - Math.exp(-dt / 0.12);
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
      if (detach) detach();
    };
    // eslint-disable-next-line
  }, [viewMode, cameraMode]);

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
      st.fly.velocity = { x: 0, y: 0, z: 0 };
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
      if (x < 0 || x >= width || z < 0 || z >= depth) continue;
      const vk = x + "," + z;
      if (visited.has(vk)) continue;
      visited.add(vk);
      // const val = voxelsRef.current.get(keyOf(x, currentLayer, z));
      const val = terrain.get(x, currentLayer, z);
      const block = val ? val.block : AIR;
      if (block !== startBlock) continue;
      setVoxelMirrored(x, currentLayer, z, selectedBlock, 0, true);
      stack.push([x + 1, z]);
      stack.push([x - 1, z]);
      stack.push([x, z + 1]);
      stack.push([x, z - 1]);
    }
    commitStroke();
    draw();
  }

  function fillRect(x0, z0, x1, z1, block) {
    beginStroke();
    const minX = Math.max(0, Math.min(x0, x1));
    const maxX = Math.min(width - 1, Math.max(x0, x1));
    const minZ = Math.max(0, Math.min(z0, z1));
    const maxZ = Math.min(depth - 1, Math.max(z0, z1));
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        setVoxelMirrored(x, currentLayer, z, block, 0, true);
      }
    }
    commitStroke();
    draw();
  }

  function clearLayer() {
    fillRect(0, 0, width - 1, depth - 1, AIR);
  }

  function fillLayer() {
    fillRect(0, 0, width - 1, depth - 1, selectedBlock);
  }

  function copyLayer(direction) {
    const target = currentLayer + direction;
    if (target < 0 || target >= totalHeight) return;
    beginStroke();
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // const val = voxelsRef.current.get(keyOf(x, currentLayer, z));
        const val = terrain.get(x, currentLayer, z);
        setVoxel(x, target, z, val ? val.block : AIR, val ? val.meta : 0, true);
      }
    }
    commitStroke();
    setStatus(STRINGS.en.layerCopied(target));
  }

  // ---- canvas drawing (2D) ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = width * cell;
    canvas.height = depth * cell;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#12151b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (onionSkin) {
      for (let off = -onionRange; off <= onionRange; off++) {
        if (off === 0) continue;
        const ly = currentLayer + off;
        if (ly < 0 || ly >= totalHeight) continue;
        const alpha = 0.32 / Math.abs(off);
        ctx.globalAlpha = alpha;
        for (const voxel of Array.from(terrain.cells())) {
          const {x, y, z} = voxel;
          if (y !== ly) continue;
          if (x < 0 || x >= width || z < 0 || z >= depth) continue;
          ctx.fillStyle = off < 0 ? "#4a90d9" : "#e0954a";
          ctx.fillRect(x * cell, z * cell, cell, cell);
        }
      }
      ctx.globalAlpha = 1;
    }

    for (const voxel of Array.from(terrain.cells())) {
      const {x, y, z} = voxel;
      if (y !== currentLayer) continue;
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
        ctx.lineTo(x * cell + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let z = 0; z <= depth; z++) {
        if (z % CHUNK === 0) continue;
        ctx.beginPath();
        ctx.moveTo(0, z * cell + 0.5);
        ctx.lineTo(canvas.width, z * cell + 0.5);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(110,168,254,0.55)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= width; x += CHUNK) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, canvas.height);
      ctx.stroke();
    }
    for (let z = 0; z <= depth; z += CHUNK) {
      ctx.beginPath();
      ctx.moveTo(0, z * cell);
      ctx.lineTo(canvas.width, z * cell);
      ctx.stroke();
    }

    if (mirrorX) {
      const gx = (width / 2) * cell;
      ctx.strokeStyle = "rgba(255, 138, 200, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
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
      ctx.lineTo(canvas.width, gz);
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

    if (roadPending) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        roadPending.x * cell + cell / 2,
        roadPending.z * cell + cell / 2,
        cell * 0.6,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    for (const inst of entityInstancesRef.current) {
      if (inst.x < 0 || inst.x >= width || inst.z < 0 || inst.z >= depth) continue;
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
        ctx.fillText((inst.name || "?")[0].toUpperCase(), cx2, cz2 + 0.5);
      }
      ctx.globalAlpha = 1;
    }
  }, [width, depth, cell, currentLayer, mirrorX, mirrorZ, roadPending, onionSkin, onionRange, totalHeight, entityInstances]);

  useEffect(() => {
    draw();
  }, [draw]);

  function cellFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.floor(px / cell);
    const z = Math.floor(py / cell);
    return { x, z };
  }

  function handleMouseDown(e) {
    const { x, z } = cellFromEvent(e);
    if (x < 0 || x >= width || z < 0 || z >= depth) return;
    if (placingEntityName) {
      const surfaceY = findSurfaceY(x, z);
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
        setRoadPending({ x, z });
      } else {
        const start = roadStartRef.current;
        drawRoad(start.x, start.z, x, z, roadWidth, roadBlock);
        roadStartRef.current = null;
        setRoadPending(null);
      }
      return;
    }
    isDrawingRef.current = true;
    if (tool === "pencil" || tool === "eraser") {
      beginStroke();
      setVoxelMirrored(x, currentLayer, z, tool === "eraser" ? AIR : selectedBlock, 0, true);
      draw();
    } else if (tool === "rect-fill" || tool === "rect-erase" || tool === "copy") {
      rectStartRef.current = { x, z };
      previewRectRef.current = { x0: x, z0: z, x1: x, z1: z };
      draw();
    } else if (tool === "bucket") {
      floodFill(x, z);
    }
  }

  function handleMouseMove(e) {
    const { x, z } = cellFromEvent(e);
    setHoverCell({ x, z });
    if (!isDrawingRef.current) return;
    if (x < 0 || x >= width || z < 0 || z >= depth) return;
    if (tool === "pencil" || tool === "eraser") {
      setVoxelMirrored(x, currentLayer, z, tool === "eraser" ? AIR : selectedBlock, 0, true);
      draw();
    } else if (tool === "rect-fill" || tool === "rect-erase" || tool === "copy") {
      if (rectStartRef.current) {
        previewRectRef.current = {
          x0: rectStartRef.current.x,
          z0: rectStartRef.current.z,
          x1: x,
          z1: z,
        };
        draw();
      }
    }
  }

  function handleMouseUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (tool === "pencil" || tool === "eraser") {
      commitStroke();
    } else if (tool === "rect-fill" || tool === "rect-erase") {
      if (previewRectRef.current) {
        const { x0, z0, x1, z1 } = previewRectRef.current;
        fillRect(x0, z0, x1, z1, tool === "rect-erase" ? AIR : selectedBlock);
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
    if (isDrawingRef.current && (tool === "pencil" || tool === "eraser")) {
      commitStroke();
    }
    isDrawingRef.current = false;
    rectStartRef.current = null;
    previewRectRef.current = null;
    setHoverCell(null);
    draw();
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (placingEntityRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          setPlacingEntityName(null);
        }
        return;
      }
      if (placingStructureRef.current) {
        const tag = e.target && e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          setPlacingRotation((r) => (r + 1) % 4);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setPlacingStructureId(null);
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        const tag = e.target && e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        const slot = e.key === "0" ? 9 : Number(e.key) - 1;
        e.preventDefault();
        selectHotbarSlot(slot);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, []);

  // ---- grid size changes: clip out-of-bounds voxels ----
  function applyGridResize(nx, ny, nz) {
    const newW = nx * CHUNK;
    const newD = nz * CHUNK;
    const newH = ny * CHUNK;
    
    terrain.transaction((t) => {
      for (const { x, y, z } of Array.from(terrain.cells())) {
        if (x >= newW || y >= newH || z >= newD) t.set(x, y, z, AIR);
      }
    });
    terrain.clearHistory();

    setGridX(nx);
    setGridY(ny);
    setGridZ(nz);
    if (currentLayer >= newH) setCurrentLayer(newH - 1);
    setVoxelCount(terrain.size); // goes away once a subscriber owns the counter
    undoStackRef.current = [];
    scheduleSave();
  }

  interface exchangeData {
    mapSizeChunks: { x, y, z },
    biomeName,
    gameMode,
    voxels,
    entities:any[],
    paletteLabels?,
    hotbar?,
    cameraMode?
  }

  // ---- export / import ----
  function buildExportData():exchangeData {
    const voxels:{x,y,z,block,meta}[] = [];
    for (const voxel of Array.from(terrain.cells())) {
      voxels.push({...voxel});
    }
    return {
      mapSizeChunks: { x: gridX, y: gridY, z: gridZ },
      biomeName: biomeName,
      gameMode: gameMode,
      voxels: voxels,
      entities: entityInstancesRef.current.map((e) =>
        e.items && e.items.length
          ? { name: e.name, x: e.x, y: e.y, z: e.z, items: e.items }
          : { name: e.name, x: e.x, y: e.y, z: e.z }
      ),
    };
  }

  function ensureAirship() {
    if (entityInstancesRef.current.some((e) => e.name === "Airship")) return true;
    const dims = dimsRef.current;
    const insetX = Math.round(dims.width * 0.3);
    const insetZ = Math.round(dims.depth * 0.3);
    const side = Math.floor(Math.random() * 4);
    const along = 0.3 + Math.random() * 0.4;
    const startX = side === 0 ? insetX : side === 1 ? dims.width - 1 - insetX : Math.round(dims.width * along);
    const startZ = side === 2 ? insetZ : side === 3 ? dims.depth - 1 - insetZ : Math.round(dims.depth * along);
    let spot:any = null;
    for (let r = 0; r <= Math.max(dims.width, dims.depth) && !spot; r++) {
      for (let dx = -r; dx <= r && !spot; dx++) {
        for (let dz = -r; dz <= r && !spot; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = startX + dx;
          const z = startZ + dz;
          if (x < 0 || x >= dims.width || z < 0 || z >= dims.depth) continue;
          const y = findSurfaceY(x, z);
          if (y >= 0 && y + 1 < dims.totalHeight) spot = { x, y: y + 1, z };
        }
      }
    }
    if (!spot) {
      setStatus(STRINGS.en.airshipNoGround);
      return false;
    }
    const instance = { id: Date.now() + Math.floor(Math.random() * 1000), name: "Airship", ...spot, items: [] };
    entityInstancesRef.current = [...entityInstancesRef.current, instance];
    setEntityInstances(entityInstancesRef.current);
    draw();
    scheduleSave();
    return true;
  }

  function exportJson() {
    if (!ensureAirship()) return;
    const data = buildExportData();
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
    if (!ensureAirship()) return;
    const data = buildExportData();
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
    const pct = json.length > 0 ? Math.round((1 - compressedBlob.size / json.length) * 100) : 0;
    setStatus(STRINGS.en.exportedCompressed(json.length, compressedBlob.size, pct));
  }

  // ---- named save slots ----
  async function refreshSaveSlots() {
    try {
      const res = await localStorage.list("terrain-editor-slot:", false);
      const names = (res && res.keys ? res.keys : []).map((k) =>
        k.slice("terrain-editor-slot:".length)
      );
      setSaveSlots(names.sort());
    } catch (e) {
      setSaveSlots([]);
    }
  }

  async function saveNamedSlot(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const data = buildExportData();
    data.paletteLabels = palette;
    try {
      await localStorage.set("terrain-editor-slot:" + trimmed, JSON.stringify(data), false);
      await refreshSaveSlots();
      setStatus(STRINGS.en.slotSaved(trimmed));
    } catch (e) {
      // ignore, non-critical
    }
  }

  async function loadNamedSlot(name) {
    try {
      const res = await localStorage.get("terrain-editor-slot:" + name, false);
      if (res && res.value) {
        const data = JSON.parse(res.value);
        applyLoadedData(data);
        draw();
        if (viewMode === "3d") rebuildInstances();
        setStatus(STRINGS.en.slotLoaded(name));
      }
    } catch (e) {
      // ignore
    }
  }

  async function deleteNamedSlot(name) {
    try {
      await localStorage.delete("terrain-editor-slot:" + name, false);
      await refreshSaveSlots();
    } catch (e) {
      // ignore
    }
  }

  // ---- generator presets (settings only, not the map itself) ----
  function getGeneratorParams() {
    return {
      randMinH,
      randMaxH,
      randGroundDepth,
      randBaseBlock,
      randSurfaceBlock,
      randDecoBlocks,
      randDecoChance,
      randIsland,
      randIslandMode,
      randIslandSize,
      randIslandIrregularity,
      randArchipelago,
      randIslandCount,
      randSeaLevel,
      randSeaBlock,
      randBottomRoughness,
      randMaxThickness,
      randHills,
      randHillStrength,
      randMountains,
      randMountainHeight,
      randPlateaus,
      randPlateauHeight,
      randValleys,
      randValleyDepth,
      randRivers,
      randRiverBlock,
      randRiverWidth,
      randLakes,
      randLakeBlock,
      randLakeSize,
      randCaves,
      randCaveDensity,
      randCaveGlow,
      randCaveGlowChance,
      randCaveGlowBlock,
      randTrees,
      randTreeDensity,
      randTreeMinHeight,
      randTreeMaxHeight,
      randTreeWoodBlock,
      randTreeLeavesBlock,
      randTreeSpacing,
      randBushes,
      randBushDensity,
      randBushBlock,
      randBushSpacing,
      randForests,
      randForestDensity,
      randAltitudeBlocks,
      randBeachLevel,
      randBeachBlock,
      randSnowLevel,
      randSnowBlock,
      randSmoothShore,
      randShoreRadius,
      randShoreBlock,
      randShoreCoverage,
      randWaterfalls,
      randWaterfallDrop,
      randOres,
      randOreBlocks,
      randOreCount,
      randOreVeinSize,
      randOreBigChance,
      randOreBigSize,
      randErosion,
      randErosionStrength,
      randErosionIterations,
    };
  }

  function applyGeneratorParams(p) {
    if (!p) return;
    const setters = {
      randMinH: setRandMinH,
      randMaxH: setRandMaxH,
      randGroundDepth: setRandGroundDepth,
      randBaseBlock: setRandBaseBlock,
      randSurfaceBlock: setRandSurfaceBlock,
      randDecoBlocks: setRandDecoBlocks,
      randDecoChance: setRandDecoChance,
      randIsland: setRandIsland,
      randIslandMode: setRandIslandMode,
      randIslandSize: setRandIslandSize,
      randIslandIrregularity: setRandIslandIrregularity,
      randArchipelago: setRandArchipelago,
      randIslandCount: setRandIslandCount,
      randSeaLevel: setRandSeaLevel,
      randSeaBlock: setRandSeaBlock,
      randBottomRoughness: setRandBottomRoughness,
      randMaxThickness: setRandMaxThickness,
      randHills: setRandHills,
      randHillStrength: setRandHillStrength,
      randMountains: setRandMountains,
      randMountainHeight: setRandMountainHeight,
      randPlateaus: setRandPlateaus,
      randPlateauHeight: setRandPlateauHeight,
      randValleys: setRandValleys,
      randValleyDepth: setRandValleyDepth,
      randRivers: setRandRivers,
      randRiverBlock: setRandRiverBlock,
      randRiverWidth: setRandRiverWidth,
      randLakes: setRandLakes,
      randLakeBlock: setRandLakeBlock,
      randLakeSize: setRandLakeSize,
      randCaves: setRandCaves,
      randCaveDensity: setRandCaveDensity,
      randCaveGlow: setRandCaveGlow,
      randCaveGlowChance: setRandCaveGlowChance,
      randCaveGlowBlock: setRandCaveGlowBlock,
      randTrees: setRandTrees,
      randTreeDensity: setRandTreeDensity,
      randTreeMinHeight: setRandTreeMinHeight,
      randTreeMaxHeight: setRandTreeMaxHeight,
      randTreeWoodBlock: setRandTreeWoodBlock,
      randTreeLeavesBlock: setRandTreeLeavesBlock,
      randTreeSpacing: setRandTreeSpacing,
      randBushes: setRandBushes,
      randBushDensity: setRandBushDensity,
      randBushBlock: setRandBushBlock,
      randBushSpacing: setRandBushSpacing,
      randForests: setRandForests,
      randForestDensity: setRandForestDensity,
      randAltitudeBlocks: setRandAltitudeBlocks,
      randBeachLevel: setRandBeachLevel,
      randBeachBlock: setRandBeachBlock,
      randSnowLevel: setRandSnowLevel,
      randSnowBlock: setRandSnowBlock,
      randSmoothShore: setRandSmoothShore,
      randShoreRadius: setRandShoreRadius,
      randShoreBlock: setRandShoreBlock,
      randShoreCoverage: setRandShoreCoverage,
      randWaterfalls: setRandWaterfalls,
      randWaterfallDrop: setRandWaterfallDrop,
      randOres: setRandOres,
      randOreBlocks: setRandOreBlocks,
      randOreCount: setRandOreCount,
      randOreVeinSize: setRandOreVeinSize,
      randOreBigChance: setRandOreBigChance,
      randOreBigSize: setRandOreBigSize,
      randErosion: setRandErosion,
      randErosionStrength: setRandErosionStrength,
      randErosionIterations: setRandErosionIterations,
    };
    for (const key of Object.keys(setters)) {
      if (Object.prototype.hasOwnProperty.call(p, key)) setters[key](p[key]);
    }
  }

  async function refreshPresets() {
    try {
      const res = await localStorage.list("terrain-editor-preset:", false);
      const names = (res && res.keys ? res.keys : []).map((k) =>
        k.slice("terrain-editor-preset:".length)
      );
      setPresets(names.sort());
    } catch (e) {
      setPresets([]);
    }
  }

  async function savePreset(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    try {
      await localStorage.set(
        "terrain-editor-preset:" + trimmed,
        JSON.stringify(getGeneratorParams()),
        false
      );
      await refreshPresets();
      setStatus(STRINGS.en.presetSaved(trimmed));
    } catch (e) {
      // ignore
    }
  }

  async function loadPreset(name) {
    try {
      const res = await localStorage.get("terrain-editor-preset:" + name, false);
      if (res && res.value) {
        applyGeneratorParams(JSON.parse(res.value));
        setStatus(STRINGS.en.presetLoaded(name));
      }
    } catch (e) {
      // ignore
    }
  }

  async function deletePreset(name) {
    try {
      await localStorage.delete("terrain-editor-preset:" + name, false);
      await refreshPresets();
    } catch (e) {
      // ignore
    }
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

  function importJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result?.toString() || "");
        applyLoadedData(data);
        draw();
        setStatus(STRINGS.en.importedFrom(file.name));
        if (viewMode === "3d") rebuildInstances();
      } catch (err ) {
        setStatus(STRINGS.en.importError((err as Error).message));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ---- hotbar ----
  function selectHotbarSlot(i) {
    setHotbarIndex(i);
    const id = hotbarRef.current[i];
    if (id) setSelectedBlock(id);
  }

  function assignHotbarSlot(i, blockId) {
    setHotbar((prev) => {
      const next = [...prev];
      next[i] = blockId;
      return next;
    });
    scheduleSave();
  }

  function cycleHotbar(direction) {
    const st = hotbarRef;
    let idx = hotbarIndexRef.current;
    for (let i = 0; i < 10; i++) {
      idx = (idx + direction + 10) % 10;
      if (st.current[idx]) break;
    }
    setHotbarIndex(idx);
    if (st.current[idx]) setSelectedBlock(st.current[idx]);
  }

  function addCustomBlock() {
    const id = clamp(customIdInput, 1, 255);
    if (!id) return;
    if (!palette.find((p) => p.id === id)) {
      setPalette([...palette, { id, label: BLOCK_NAMES[id] || "Block " + id }]);
    }
    setSelectedBlock(id);
    setCustomIdInput("");
  }

  function renamePaletteEntry(id, label) {
    if (BLOCK_NAMES[id]) return; // real block names are locked, not user-editable
    setPalette(palette.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  const chunkY = Math.floor(currentLayer / CHUNK);
  const localY = currentLayer % CHUNK;

  const toolBtn = (id, label, title) => (
    <button
      onClick={() => setTool(id)}
      title={title}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: tool === id ? "1px solid #6ea8fe" : "1px solid #2a2f3a",
        background: tool === id ? "#22314d" : "#1a1d24",
        color: "#e6e8ee",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const featureRow = (key, checked, onToggle, label, popoverBody) => {
    const isOpen = openPopover === key;
    return (
      <div
        key={key}
        style={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }}
        ref={isOpen ? popoverAnchorRef : null}
      >
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 4,
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <input type="checkbox" checked={checked} onChange={onToggle} />
          {label}
        </label>
        {popoverBody && (
          <button
            onClick={() => setOpenPopover(isOpen ? null : key)}
            title={t.settings}
            style={{
              background: "transparent",
              border: "none",
              color: isOpen ? "#6ea8fe" : "#8a91a3",
              cursor: "pointer",
              fontSize: 13,
              padding: "0 2px",
            }}
          >
            ⚙
          </button>
        )}
        {isOpen && popoverBody && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              zIndex: 30,
              background: "#1a1d24",
              border: "1px solid #2a2f3a",
              borderRadius: 8,
              padding: 10,
              minWidth: 190,
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {popoverBody}
          </div>
        )}
      </div>
    );
  };

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
        biomeName={biomeName}
        cameraMode={cameraMode}
        editsInputRef={editsInputRef}
        entityInstances={entityInstances}
        exportJson={exportJson}
        exportJsonCompressed={exportJsonCompressed}
        fileInputRef={fileInputRef}
        gameMode={gameMode}
        gridX={gridX}
        gridY={gridY}
        gridZ={gridZ}
        importJson={importJson}
        scheduleSave={scheduleSave}
        setBiomeName={setBiomeName}
        setCameraMode={setCameraMode}
        setGameMode={setGameMode}
        setShowHelp={setShowHelp}
        setViewMode={setViewMode}
        viewMode={viewMode}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <PaletteSidebar
          addCustomBlock={addCustomBlock}
          blockSearchQuery={blockSearchQuery}
          clearTexture={clearTexture}
          customIdInput={customIdInput}
          handleTextureFile={handleTextureFile}
          palette={palette}
          renamePaletteEntry={renamePaletteEntry}
          selectedBlock={selectedBlock}
          setBlockSearchQuery={setBlockSearchQuery}
          setCustomIdInput={setCustomIdInput}
          setSelectedBlock={setSelectedBlock}
          setTextureTargetId={setTextureTargetId}
          textureFileInputRef={textureFileInputRef}
          textureTargetId={textureTargetId}
          textureVersion={textureVersion}
          texturesRef={texturesRef}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <ToolbarRow
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
            onionRange={onionRange}
            onionSkin={onionSkin}
            redo={redo}
            resetCameraView={resetCameraView}
            roadBlock={roadBlock}
            roadWidth={roadWidth}
            setCopyYFrom={setCopyYFrom}
            setCopyYTo={setCopyYTo}
            setMirrorX={setMirrorX}
            setMirrorZ={setMirrorZ}
            setMoveSpeed={setMoveSpeed}
            setOnionRange={setOnionRange}
            setOnionSkin={setOnionSkin}
            setRoadBlock={setRoadBlock}
            setRoadWidth={setRoadWidth}
            setShowBulkTexturePanel={setShowBulkTexturePanel}
            setShowEntitiesPanel={setShowEntitiesPanel}
            setShowPresets={setShowPresets}
            setShowRandomPanel={setShowRandomPanel}
            setShowSaves={setShowSaves}
            setShowStructuresPanel={setShowStructuresPanel}
            setZoom={setZoom}
            showBulkTexturePanel={showBulkTexturePanel}
            showEntitiesPanel={showEntitiesPanel}
            showPresets={showPresets}
            showRandomPanel={showRandomPanel}
            showSaves={showSaves}
            showStructuresPanel={showStructuresPanel}
            tool={tool}
            toolBtn={toolBtn}
            totalHeight={totalHeight}
            undo={undo}
            viewMode={viewMode}
            zoom={zoom}
            zoomRef={zoomRef}
          />

          {showRandomPanel && (
            <RandomPanel
              featureRow={featureRow}
              generateRandomTerrain={generateRandomTerrain}
              randAltitudeBlocks={randAltitudeBlocks}
              randArchipelago={randArchipelago}
              randBaseBlock={randBaseBlock}
              randBeachBlock={randBeachBlock}
              randBeachLevel={randBeachLevel}
              randBottomRoughness={randBottomRoughness}
              randBushBlock={randBushBlock}
              randBushDensity={randBushDensity}
              randBushSpacing={randBushSpacing}
              randBushes={randBushes}
              randCaveDensity={randCaveDensity}
              randCaveGlow={randCaveGlow}
              randCaveGlowBlock={randCaveGlowBlock}
              randCaveGlowChance={randCaveGlowChance}
              randCaves={randCaves}
              randDecoBlocks={randDecoBlocks}
              randDecoChance={randDecoChance}
              randErosion={randErosion}
              randErosionIterations={randErosionIterations}
              randErosionStrength={randErosionStrength}
              randForestDensity={randForestDensity}
              randForests={randForests}
              randGroundDepth={randGroundDepth}
              randHillStrength={randHillStrength}
              randHills={randHills}
              randIsland={randIsland}
              randIslandCount={randIslandCount}
              randIslandIrregularity={randIslandIrregularity}
              randIslandMode={randIslandMode}
              randIslandSize={randIslandSize}
              randLakeBlock={randLakeBlock}
              randLakeSize={randLakeSize}
              randLakes={randLakes}
              randMaxH={randMaxH}
              randMaxThickness={randMaxThickness}
              randMinH={randMinH}
              randMountainHeight={randMountainHeight}
              randMountains={randMountains}
              randOreBigChance={randOreBigChance}
              randOreBigSize={randOreBigSize}
              randOreBlocks={randOreBlocks}
              randOreCount={randOreCount}
              randOreVeinSize={randOreVeinSize}
              randOres={randOres}
              randPlateauHeight={randPlateauHeight}
              randPlateaus={randPlateaus}
              randRiverBlock={randRiverBlock}
              randRiverWidth={randRiverWidth}
              randRivers={randRivers}
              randSeaBlock={randSeaBlock}
              randSeaLevel={randSeaLevel}
              randSeed={randSeed}
              randShoreBlock={randShoreBlock}
              randShoreCoverage={randShoreCoverage}
              randShoreRadius={randShoreRadius}
              randSmoothShore={randSmoothShore}
              randSnowBlock={randSnowBlock}
              randSnowLevel={randSnowLevel}
              randSurfaceBlock={randSurfaceBlock}
              randTreeDensity={randTreeDensity}
              randTreeLeavesBlock={randTreeLeavesBlock}
              randTreeMaxHeight={randTreeMaxHeight}
              randTreeMinHeight={randTreeMinHeight}
              randTreeSpacing={randTreeSpacing}
              randTreeWoodBlock={randTreeWoodBlock}
              randTrees={randTrees}
              randValleyDepth={randValleyDepth}
              randValleys={randValleys}
              randWaterfallDrop={randWaterfallDrop}
              randWaterfalls={randWaterfalls}
              randomizeAllParams={randomizeAllParams}
              setRandAltitudeBlocks={setRandAltitudeBlocks}
              setRandArchipelago={setRandArchipelago}
              setRandBaseBlock={setRandBaseBlock}
              setRandBeachBlock={setRandBeachBlock}
              setRandBeachLevel={setRandBeachLevel}
              setRandBottomRoughness={setRandBottomRoughness}
              setRandBushBlock={setRandBushBlock}
              setRandBushDensity={setRandBushDensity}
              setRandBushSpacing={setRandBushSpacing}
              setRandBushes={setRandBushes}
              setRandCaveDensity={setRandCaveDensity}
              setRandCaveGlow={setRandCaveGlow}
              setRandCaveGlowBlock={setRandCaveGlowBlock}
              setRandCaveGlowChance={setRandCaveGlowChance}
              setRandCaves={setRandCaves}
              setRandDecoBlocks={setRandDecoBlocks}
              setRandDecoChance={setRandDecoChance}
              setRandErosion={setRandErosion}
              setRandErosionIterations={setRandErosionIterations}
              setRandErosionStrength={setRandErosionStrength}
              setRandForestDensity={setRandForestDensity}
              setRandForests={setRandForests}
              setRandGroundDepth={setRandGroundDepth}
              setRandHillStrength={setRandHillStrength}
              setRandHills={setRandHills}
              setRandIsland={setRandIsland}
              setRandIslandCount={setRandIslandCount}
              setRandIslandIrregularity={setRandIslandIrregularity}
              setRandIslandMode={setRandIslandMode}
              setRandIslandSize={setRandIslandSize}
              setRandLakeBlock={setRandLakeBlock}
              setRandLakeSize={setRandLakeSize}
              setRandLakes={setRandLakes}
              setRandMaxH={setRandMaxH}
              setRandMaxThickness={setRandMaxThickness}
              setRandMinH={setRandMinH}
              setRandMountainHeight={setRandMountainHeight}
              setRandMountains={setRandMountains}
              setRandOreBigChance={setRandOreBigChance}
              setRandOreBigSize={setRandOreBigSize}
              setRandOreBlocks={setRandOreBlocks}
              setRandOreCount={setRandOreCount}
              setRandOreVeinSize={setRandOreVeinSize}
              setRandOres={setRandOres}
              setRandPlateauHeight={setRandPlateauHeight}
              setRandPlateaus={setRandPlateaus}
              setRandRiverBlock={setRandRiverBlock}
              setRandRiverWidth={setRandRiverWidth}
              setRandRivers={setRandRivers}
              setRandSeaBlock={setRandSeaBlock}
              setRandSeaLevel={setRandSeaLevel}
              setRandSeed={setRandSeed}
              setRandShoreBlock={setRandShoreBlock}
              setRandShoreCoverage={setRandShoreCoverage}
              setRandShoreRadius={setRandShoreRadius}
              setRandSmoothShore={setRandSmoothShore}
              setRandSnowBlock={setRandSnowBlock}
              setRandSnowLevel={setRandSnowLevel}
              setRandSurfaceBlock={setRandSurfaceBlock}
              setRandTreeDensity={setRandTreeDensity}
              setRandTreeLeavesBlock={setRandTreeLeavesBlock}
              setRandTreeMaxHeight={setRandTreeMaxHeight}
              setRandTreeMinHeight={setRandTreeMinHeight}
              setRandTreeSpacing={setRandTreeSpacing}
              setRandTreeWoodBlock={setRandTreeWoodBlock}
              setRandTrees={setRandTrees}
              setRandValleyDepth={setRandValleyDepth}
              setRandValleys={setRandValleys}
              setRandWaterfallDrop={setRandWaterfallDrop}
              setRandWaterfalls={setRandWaterfalls}
              totalHeight={totalHeight}
            />
          )}

          {showStructuresPanel && (
            <StructuresPanel
              deleteStructure={deleteStructure}
              ensureStructureThumb={ensureStructureThumb}
              exportStructure={exportStructure}
              importStructureFiles={importStructureFiles}
              newStructureCategory={newStructureCategory}
              newStructureName={newStructureName}
              openPopover={openPopover}
              placingRotation={placingRotation}
              placingStructureId={placingStructureId}
              popoverAnchorRef={popoverAnchorRef}
              saveCurrentMapAsStructure={saveCurrentMapAsStructure}
              setNewStructureCategory={setNewStructureCategory}
              setNewStructureName={setNewStructureName}
              setOpenPopover={setOpenPopover}
              setPlacingRotation={setPlacingRotation}
              setPlacingStructureId={setPlacingStructureId}
              setStructureCategoryFilter={setStructureCategoryFilter}
              setStructureCount={setStructureCount}
              structureCategoryFilter={structureCategoryFilter}
              structureFileInputRef={structureFileInputRef}
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
              newSlotName={newSlotName}
              saveNamedSlot={saveNamedSlot}
              saveSlots={saveSlots}
              setNewSlotName={setNewSlotName}
            />
          )}

          {showPresets && (
            <PresetsPanel
              deletePreset={deletePreset}
              loadPreset={loadPreset}
              newPresetName={newPresetName}
              presets={presets}
              regenerateDecorations={regenerateDecorations}
              regenerateOre={regenerateOre}
              regenerateTrees={regenerateTrees}
              savePreset={savePreset}
              setNewPresetName={setNewPresetName}
            />
          )}

          {showEntitiesPanel && (
            <EntitiesPanel
              clearAllEntityInstances={clearAllEntityInstances}
              entityCategory={entityCategory}
              entityInstances={entityInstances}
              entitySearchQuery={entitySearchQuery}
              openItemsId={openItemsId}
              placingEntityName={placingEntityName}
              removeEntityInstance={removeEntityInstance}
              setEntityCategory={setEntityCategory}
              setEntityItems={setEntityItems}
              setEntitySearchQuery={setEntitySearchQuery}
              setOpenItemsId={setOpenItemsId}
              setPlacingEntityName={setPlacingEntityName}
            />
          )}

          <div
            ref={containerRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflow: viewMode === "2d" ? "auto" : "hidden",
              padding: viewMode === "2d" ? 16 : 0,
              background: "#08090c",
              position: "relative",
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{
                display: viewMode === "2d" ? "block" : "none",
                cursor: "crosshair",
                imageRendering: "pixelated",
                boxShadow: "0 0 0 1px #2a2f3a",
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

            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 4,
                background: "rgba(10,12,17,0.85)",
                border: "1px solid #2a2f3a",
                borderRadius: 8,
                padding: 5,
                pointerEvents: viewMode === "3d" && cameraMode === "fly" && isLocked ? "none" : "auto",
              }}
              title={t.hotbarHint}
            >
              {hotbar.map((blockId, i) => (
                <div
                  key={i}
                  onClick={() => selectHotbarSlot(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    assignHotbarSlot(i, selectedBlock);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 5,
                    background: blockId ? colorForId(blockId) : "#1a1d24",
                    border:
                      hotbarIndex === i ? "2px solid #6ea8fe" : "1px solid #2a2f3a",
                    cursor: "pointer",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 3,
                      fontSize: 9,
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {i === 9 ? 0 : i + 1}
                  </span>
                </div>
              ))}
            </div>
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
            gridY={gridY}
            localY={localY}
            setCurrentLayer={setCurrentLayer}
            totalHeight={totalHeight}
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
