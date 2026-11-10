import { AIR } from "../constants";
import { keyOf } from "./keys";

export type BlockId = number; //0..255. Air is 255

/** Value stored per cell. Same shape the old voxelsRef Map held. */
interface Voxel {
  block: BlockId;
  meta: number;
}

/** A voxel together with its coordinates (parsed form, see VoxelStore.cells()). */
interface VoxelCell extends Voxel {
  x: number;
  y: number;
  z: number;
}

/**
 * One cell edit. Field names match the old stroke buffer so it can be compared
 * line by line with TerrainEditor.jsx. AIR (255) means "no voxel".
 */
interface VoxelChange {
  x: number;
  y: number;
  z: number;
  prevBlock: BlockId;
  prevMeta: number;
  newBlock: BlockId;
  newMeta: number;
}

type VoxelStoreEvent =
  /** `changes` describes what already happened (for undo/redo: the inverse is applied). */
  | { type: "change"; changes: readonly VoxelChange[] }
  /** The whole map was replaced; views should rebuild everything. */
  | { type: "reset" };

type VoxelStoreListener = (event: VoxelStoreEvent) => void;

/** What transaction() callbacks receive: reads and writes, but no undo/redo/replace. */
type VoxelWriter = Pick<VoxelStore, "set" | "get" | "getBlock" | "transaction">;

interface Stroke {
  changes: VoxelChange[];
  /** "x,y,z" -> position in `changes`, so repeated writes to one cell merge. */
  index: Map<string, number>;
}

/**
 * VoxelStore — the voxel Map plus everything that mutates it.
 *
 * Replaces, from TerrainEditor.jsx:
 *   voxelsRef                      -> #map
 *   setVoxel(..., record)          -> set()            (always recorded)
 *   beginStroke / commitStroke     -> begin() / commit(), or transaction(fn)
 *   undoStackRef / redoStackRef    -> #undo / #redo
 *   undo() / redo()                -> undo() / redo()
 *   setVoxelCount / scheduleSave   -> subscribers (see subscribe())
 *   draw() / syncVoxel3D() calls   -> subscribers
 */
class VoxelStore {
  #map = new Map<string, VoxelCell>();                    // AIR is never stored
  #layers = new Map<number, Map<string, VoxelCell>>();    // y -> cells on that layer (same objects)
  #undo: VoxelChange[][] = []; // oldest first
  #redo: VoxelChange[][] = [];
  readonly #maxHistory: number = 40; // history stack depth
  #stroke: Stroke | null = null;
  #pending: VoxelChange[] = []; // changes not yet announced to subscribers
  #flushQueued = false;
  readonly #listeners = new Set<VoxelStoreListener>();

  constructor( maxHistory = 40 ) {
    this.#maxHistory = maxHistory;
  }

  // ---------- reads ----------

  get size(): number {
    return this.#map.size;
  }
  get canUndo(): boolean {
    return this.#undo.length > 0;
  }
  get canRedo(): boolean {
    return this.#redo.length > 0;
  }

  get(x: number, y: number, z: number): Readonly<VoxelCell> | undefined {
    return this.#map.get(keyOf(x, y, z));
  }

  getAllRaw(): MapIterator<[string, Readonly<VoxelCell>]> {
    return this.#map.entries();
  }

  /** The block id at the cell, or AIR. */
  getBlock(x: number, y: number, z: number): BlockId {
    const v = this.#map.get(keyOf(x, y, z));
    return v ? v.block : AIR;
  }

  /**
   * 
   * @param fromY - Y from which to search, downwards
   * @returns the highest non-air y at or below `fromY`, or -1 if the column is empty
   */
  surfaceY(x: number, z: number, fromY: number): number {
    for (let y = fromY; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== AIR)
        return y;
    }
    return -1;
  }

  layerCells(y: number): IterableIterator<Readonly<VoxelCell>> {
    return this.#layers.get(y)?.values() ?? [][Symbol.iterator]();
  }

  /** Same data with the key already parsed; replaces every `key.split(",")` loop. */
  *cells(): Generator<Readonly<VoxelCell>, void, undefined> {
      yield* this.#map.values();
  }

  // ---------- writes ----------

  /**
   * Interactive strokes (mouse down ... mouse up) span many events, so they
   * can't be a callback: begin() on press, commit() on release.
   * For synchronous batches prefer transaction().
   */
  begin(): void {
    if (this.#stroke) 
      throw new Error("VoxelStore: begin() while a stroke is already open");
    this.#stroke = { changes: [], index: new Map() };
  }

  /** Old setVoxel(..., record=true). Must be inside begin()/commit() or transaction(). */
  set(x: number, y: number, z: number, block: BlockId, meta = 0): void {
    const stroke = this.#stroke;
    if (!stroke) throw new Error("VoxelStore: set() outside begin()/transaction()");
    const key = keyOf(x, y, z);
    const prev = this.#map.get(key);
    const prevBlock = prev ? prev.block : AIR;
    const prevMeta = prev ? prev.meta : 0;
    if (prevBlock === block && prevMeta === meta) return;

    // History: first touch records the original value, later touches only update "new"
    // (same merge rule as the old touchedInStrokeRef).
    const idx = stroke.index.get(key);
    if (idx === undefined) {
      stroke.index.set(key, stroke.changes.length);
      stroke.changes.push({ x, y, z, prevBlock, prevMeta, newBlock: block, newMeta: meta });
    } else {
      const c = stroke.changes[idx];
      c.newBlock = block;
      c.newMeta = meta;
    }

    // Live data + notification (one entry per write; views may want live feedback mid-stroke).
    this.#write(x, y, z, block, meta);
    this.#queue({ x, y, z, prevBlock, prevMeta, newBlock: block, newMeta: meta });
  }

  /**
   * Old commitStroke(): close the stroke and make it one undo step.
   * @returns number of cells that actually changed
   */
  commit(): number {
    if (!this.#stroke) throw new Error("VoxelStore: commit() without begin()");
    // Cells that ended up back at their original value are not changes.
    const changes = this.#stroke.changes.filter((c) => c.prevBlock !== c.newBlock || c.prevMeta !== c.newMeta);
    this.#stroke = null;
    if (changes.length) {
      this.#undo.push(changes);
      if (this.#undo.length > this.#maxHistory) this.#undo.shift();
      this.#redo = []; // a new edit invalidates redo (only if something changed, as before)
    }
    this.flush();
    return changes.length;
  }

  /** begin() + fn + commit(); if fn throws, the writes are rolled back. Joins an open stroke. */
  transaction<T>(fn: (store: VoxelWriter) => T): T {
    if (this.#stroke) return fn(this); // nested: part of the outer undo step
    this.begin();
    try {
      const result = fn(this);
      this.commit();
      return result;
    } catch (err) {
      this.#rollback();
      throw err;
    }
  }

  /** @returns false if there was nothing to undo */
  undo(): boolean {
    this.#assertIdle("undo");
    const stroke = this.#undo.pop();
    if (!stroke) return false;
    for (let i = stroke.length - 1; i >= 0; i--) {
      const c = stroke[i];
      this.#write(c.x, c.y, c.z, c.prevBlock, c.prevMeta);
      this.#queue(invert(c));
    }
    this.#redo.push(stroke);
    if (this.#redo.length > this.#maxHistory) this.#redo.shift();
    this.flush();
    return true;
  }

  /** @returns false if there was nothing to redo */
  redo(): boolean {
    this.#assertIdle("redo");
    const stroke = this.#redo.pop();
    if (!stroke) return false;
    for (const c of stroke) {
      this.#write(c.x, c.y, c.z, c.newBlock, c.newMeta);
      this.#queue(c);
    }
    this.#undo.push(stroke);
    if (this.#undo.length > this.#maxHistory) this.#undo.shift();
    this.flush();
    return true;
  }

  /**
   * Replace the whole map (load / import / slot load). Clears history.
   * Old applyLoadedData did: new Map + undoStack = [] + setVoxelCount.
   */
  replaceAll(cells: Iterable<{ x: number; y: number; z: number; block: BlockId; meta?: number }>): void {
    this.#assertIdle("replaceAll");
    this.#map = new Map();
    this.#layers = new Map();
    for (const c of cells) {
      if (c.block !== AIR) 
        this.#write( c.x, c.y, c.z, c.block, c.meta ?? 0 );
    }
    this.clearHistory();
    this.#pending = [];
    this.#emit({ type: "reset" });
  }

  clearHistory(): void {
    this.#undo = [];
    this.#redo = [];
  }

  // ---------- notifications ----------

  /** @returns unsubscribe function */
  subscribe(listener: VoxelStoreListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /**
   * Writes made mid-stroke are announced at the end of the current JS task
   * (microtask), so one mouse event = one notification, however many cells it
   * touched. commit/undo/redo flush synchronously.
   */
  flush(): void {
    if (!this.#pending.length) return;
    const changes = this.#pending;
    this.#pending = [];
    this.#emit({ type: "change", changes });
  }

  // ---------- internals ----------

  #write(x: number, y: number, z: number, block: BlockId, meta: number): void {
  const key = keyOf(x, y, z);
  let layer = this.#layers.get(y);
    if (block === AIR) {
      this.#map.delete(key);
      if (layer) {
        layer.delete(key);
        if (layer.size === 0) 
          this.#layers.delete(y);
      }
    }
    else {
      const cell: VoxelCell = { x, y, z, block, meta };
      this.#map.set(key, cell);
      if (!layer) {
        layer = new Map();
        this.#layers.set(y, layer);
      }
      layer.set(key, cell);
    }
  }

  #queue(change: VoxelChange): void {
    this.#pending.push(change);
    if (!this.#flushQueued) {
      this.#flushQueued = true;
      queueMicrotask(() => {
        this.#flushQueued = false;
        this.flush();
      });
    }
  }

  #emit(event: VoxelStoreEvent): void {
    for (const listener of [...this.#listeners])
      listener(event);
  }

  #rollback(): void {
    const stroke = this.#stroke;
    this.#stroke = null;
    if (!stroke) return;
    for (let i = stroke.changes.length - 1; i >= 0; i--) {
      const c = stroke.changes[i];
      this.#write(c.x, c.y, c.z, c.prevBlock, c.prevMeta);
      this.#queue(invert(c));
    }
    this.flush();
  }

  #assertIdle(what: string): void {
    if (this.#stroke) throw new Error(`VoxelStore: ${what}() while a stroke is open`);
  }
}

function invert(c: VoxelChange): VoxelChange {
  return { x: c.x, y: c.y, z: c.z, prevBlock: c.newBlock, prevMeta: c.newMeta, newBlock: c.prevBlock, newMeta: c.prevMeta };
}

export {
  Voxel, VoxelCell, VoxelChange, VoxelWriter,
  VoxelStore,
  VoxelStoreEvent,
  VoxelStoreListener
};