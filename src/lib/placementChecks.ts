import { EntityData } from "./entities";
import { keyOf } from "./keys";

type PlaceCheck =
  | { ok: true }
  | { ok: false; reason: "out-of-bounds" | "singleton" | "service" }
  | { ok: false; reason: "overlap"; overlaps: Cell[] };
type Cell = [number, number, number];

interface EntityCatalogue {
  footprints: Readonly<Record<string, readonly (readonly [number, number, number])[]>>;
  singleton: ReadonlySet<string>;
  service: ReadonlySet<string>;
}

/**
 * @returns absolute cells an entity occupies. Empty array if the catalogue has no footprint for it.
 */
function footprintCells(entity: EntityData, catalogue: EntityCatalogue): Cell[] {
  if (!Object.hasOwn(catalogue.footprints, entity.name))
    return []; // no footprints for this entity
  const relFootprints = catalogue.footprints[entity.name]!; // previous line guards against undefined
  const absFootprints:Cell[] = relFootprints.map((cellCoords) => {
    const [x, y, z] = cellCoords;
    return [x + entity.x, y + entity.y, z + entity.z];
  });
  return absFootprints;
}

function canPlaceEntity(
  incoming: EntityData,
  existing: readonly EntityData[],
  dims: { width: number; depth: number; height: number },
  catalogue: EntityCatalogue,
): PlaceCheck {
  if((incoming.x < 0 || incoming.x > dims.width - 1) || (incoming.y < 0 || incoming.y > dims.height - 1) || (incoming.z < 0 || incoming.z > dims.depth - 1 ) )
    return {ok: false, reason: "out-of-bounds"};
  if(catalogue.singleton.has(incoming.name) && existing.some((entity) => entity.name === incoming.name))
    return {ok: false, reason: "singleton"};
  if(catalogue.service.has(incoming.name))
    return {ok: false, reason: "service"};

  const incomingCells = footprintCells(incoming, catalogue);
  if (incomingCells.length === 0)
    return { ok: true };   // No footprint, nothing to check

  // precompute occupied cells as strings in a Set
  const taken = new Set<string>();
  for (const other of existing)
    for (const [x, y, z] of footprintCells(other, catalogue))
  taken.add(keyOf(x, y, z));

  const overlaps:Cell[] = incomingCells.filter(([x, y, z]) => taken.has(keyOf(x, y, z)));
  if (overlaps.length > 0)
    return { ok: false, reason: "overlap", overlaps };
  return { ok: true };
}

export {
  Cell,
  PlaceCheck,
  EntityCatalogue,
  footprintCells,
  canPlaceEntity,
}
