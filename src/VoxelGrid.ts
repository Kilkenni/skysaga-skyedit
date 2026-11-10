/*
What does an empty cell look like? A new Uint16Array is zero-filled, so “empty” must be 0. But the editor’s “air” constant is AIR = 255, and the generator writes it when it carves (caves, for example). So at the boundary, writing AIR must store 0 (the whole word, meta included), and reading 0 must give back “nothing”. Block 0 is already excluded from placeable blocks, which is what makes this safe. It’s easy to get one direction wrong.

3. A raw typed array is dangerous at the edges. The store accepted any coordinates, because it’s a Map. A flat grid doesn’t: if x >= width, the index silently lands in the next row, and the write corrupts a neighbor instead of failing. And the packing (block | meta << 8) would be repeated at every call site.

Both are best handled by a small class, the same way VoxelStore hid its internals:

VoxelGrid owns the Uint16Array, the index math (x + z * width + y * width * depth), and the block/meta packing.
set(x, y, z, block, meta) checks the bounds. Decide what it does when out of bounds: ignore, or throw. I’d throw during the refactor, so any out-of-range write shows up immediately instead of being swallowed.
get/getBlock, plus a cells() generator that yields only non-empty cells. The wrapper uses that to feed terrain.transaction.

Then the function returns grid: VoxelGrid instead of the raw array, and the 12 setVoxel calls become grid.set(...) with almost no change.

Your checksum test will also reveal whether the original generator ever wrote out-of-bounds voxels (leaves overhanging the edge, for instance). The old store would have kept them, and the grid wouldn’t. If the voxel hashes differ after the move, that’s the first place to look.

Initializing with 255 is the better call. It keeps one convention everywhere, and it removes the translation at the boundary that I proposed. A grid filled with 255 reads as block 255 (AIR) with meta 0, which is exactly “empty”, so nothing needs translating on the way in or out.

Two small details when you write the class:

Canonical empty. When set receives AIR, store meta 0 too, whatever meta was passed. Otherwise two “empty” cells can have different bit patterns (255 versus 5 << 8 | 255), and any later comparison or checksum of the raw array would disagree about cells that are both empty.
cells() skips by block, not by word. It tests block === AIR (the low byte), so it doesn’t depend on the high byte being zero.

Next action: write VoxelGrid on its own and check it in the console, as we did with compressJson. Paste it when it’s done.
*/

import { AIR } from "./constants";
import { BlockId, VoxelCell } from "./lib/VoxelStore";

interface GridDimensions {
  width: number,
  height: number, 
  depth: number,
}

class VoxelGrid  {
  #grid: Uint8Array;
  #meta: Uint8Array;
  #dim: {
    width: number,
    height: number,
    depth: number,
  }

  constructor(gridDimensions:GridDimensions) {
    const {width, depth, height} = gridDimensions;
    if(width < 1 || !Number.isInteger(width) ||
      depth < 1 || !Number.isInteger(depth) ||
      height < 1 || !Number.isInteger(height))
      throw new Error("width, depth, height should be positive integers");
    const length = width * depth * height;
    this.#grid = new Uint8Array(length).fill(255);
    this.#meta = new Uint8Array(length);
    this.#dim = {
      width: width,
      height: height,
      depth: depth,
    }
  }

  static #check(axis: string, value: number, size: number) {
    if (!Number.isInteger(value) || value < 0 || value >= size)
      throw new Error(`${axis}:${value} is out of range: 0..${size - 1}`);
  }

  #index(x: number, y: number, z: number) {
    const {width, depth, height} = this.#dim;
    VoxelGrid.#check("x", x, width);
    VoxelGrid.#check("y", y, height);
    VoxelGrid.#check("z", z, depth);

    return (x + z * width + y * width * depth);
  }

  set(x: number, y: number, z: number, block: BlockId, meta = 0) {
    const index = this.#index(x, y, z);
    if(block > AIR)
      throw new Error(`block:${block} is out of allowed blockId range: 0..${AIR}`);
    this.#grid[index] = block;
    if(block !== AIR)
      this.#meta[index] = meta;
    else
      this.#meta[index] = 0;
  }

  /**
   * 
   * @returns undefined if the block is AIR
   */
  get(x: number, y: number, z: number):VoxelCell|undefined {
    const index = this.#index(x, y, z);
    const block = this.#grid[index];
    if(block === AIR)
      return undefined;
    return {
      x, y, z,
      block,
      meta: this.#meta[index]
    }
  }

  /** The block id at the cell */
  getBlock(x: number, y: number, z: number): BlockId {
    const index = this.#index(x, y, z);
    const block = this.#grid[index];
    return block;
  }

  /**
   * Iterator over all cells, skips empty cells (block === AIR)
   */
  *cells(): Generator<VoxelCell, void, undefined> {
    const {width, depth, height} = this.#dim;
    let index = 0;
    for(let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++ ) {
        for ( let x = 0; x < width; x++, index++) {
          const block = this.#grid[index];
          if (block === AIR)
            continue; // skip empty blocks
          const meta = this.#meta[index];
          yield { x, y, z, block, meta };
        }
      }
    }
  }
}

export {
  GridDimensions,
  VoxelGrid,
}
