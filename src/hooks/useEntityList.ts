import { useCallback, useSyncExternalStore } from "react";
import { EntityDataId } from "../lib/entities";
import { EntityStore } from "../lib/EntityStore";

export function useEntityList(store: EntityStore): readonly Readonly<EntityDataId>[] {
  const subscribe = useCallback((onChange: () => void) => store.subscribe(onChange), [store]);
  return useSyncExternalStore(subscribe, () => store.list());
}
