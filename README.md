# SkySaga Terrain Editor

Browser voxel level editor (React 18 + three.js r128, bundled with Vite).
This repo was produced by mechanically splitting the single-file prototype
`SPA_Editor.html` — behaviour is unchanged, only the file layout is new.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run lint
```

`three` is pinned to **0.128.0** on purpose: the code was written against that API.
Upgrade it deliberately, not via `npm update`.

## Layout

```
src/
  main.jsx                 entry point
  constants.js             CHUNK, AIR, limits, entity colours/categories, storage keys
  data/                    game tables from the server (was window.SKYSAGA_DATA)
    blocks.json  entities.json  deviceCells.json  mapSizes.json  serviceEntities.json
    index.js
  i18n/strings.js          all UI text (STRINGS.en) + help/changelog
  lib/
    colors.js              block colour derivation (colorForId)
    noise.js               seeded RNG + value noise 2D/3D
    numbers.js             clamp, id-list parsing, weighted pick
    structures.js          structure rotation + thumbnails
    keys.js                keyOf(x,y,z)
    storagePolyfill.js     window.storage -> localStorage (Claude artifacts had it built in)
  styles/
    inline.js              shared inline-style objects (inputStyle, actionBtn)
    global.css
  components/
    TerrainEditor.jsx      container: ALL state, editing logic, generator, three.js scene
    TopBar, PaletteSidebar, ToolbarRow, LayerNav
    RandomPanel, StructuresPanel, EntitiesPanel, BulkTexturePanel, SavesPanel, PresetsPanel
    HelpModal, StatsModal
```

## Known state of the refactor (read before extending)

This is a *starting point*, not a finished architecture:

- **`TerrainEditor.jsx` is still ~4,300 lines.** It owns every `useState`, the voxel
  store, undo/redo, the terrain generator, and the whole three.js scene. These
  functions share state through closures, so they can't be moved out mechanically.
- **Child components receive props by name, 1:1 with the old closure variables.**
  `RandomPanel` takes ~140 props (every `randXxx` value and its setter). The obvious
  next step is one `generatorParams` object (+ `useReducer`), which would also replace
  `getGeneratorParams` / `applyGeneratorParams` / presets.
- `toolBtn` and `featureRow` are render helpers passed down as props; they should
  become small components.
- `react-hooks/exhaustive-deps` is off (see `eslint.config.js`) because the prototype
  deliberately reads refs inside effects.

Suggested order of attack: generator params object -> extract `generateRandomTerrain`
and the `regenerate*` functions into `lib/generator/` as pure functions
(`(params, dims, rand) => heightMap + voxel writes`) -> `useVoxelStore` (voxels, undo/redo)
-> `useThreeScene` (renderer, camera modes, instancing) -> `useStorage` (autosave, slots,
presets, textures).

## Data refresh

`data/*.json` come from the server's `Tools/maps/make_editor_data.py` (build 36731).
