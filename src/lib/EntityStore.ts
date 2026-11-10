import { EntityData, EntityDataId } from "./entities";

type EntityChange =
  | { kind: "add";    after: EntityDataId }
  | { kind: "remove"; before: EntityDataId }
  | { kind: "update"; before: EntityDataId; after: EntityDataId };

type EntityStoreEvent =
  | { type: "change"; changes: readonly EntityChange[] }
  | { type: "reset" };

type EntityStoreListener = (event: EntityStoreEvent) => void;

/*
function deepClone<T>(original: T):T {
  if(typeof original !== "object" || original === null)
    return original;
  let deepCopy;
  if(Array.isArray(original)) {
    deepCopy = [];
    for(let i = 0; i< original.length; i++) {
      deepCopy[i] = deepClone(original[i]);
    }
  }
  else if(original instanceof Object) {
    deepCopy = {};
    for(const key of Object.keys(original)) {
      deepCopy[key] = deepClone(original[key]);
    }
  }
  return deepCopy as T;
}
  */

/** Freezes a record and its items array. Returns the same object. */
function sealEntity<T extends EntityDataId>(entity: T): Readonly<T> {
  if (entity.items)
    Object.freeze(entity.items);
  return Object.freeze(entity);
}

class EntityStore {
  #entities: readonly EntityDataId[] = []; // replaced, never mutated
  #nextId = 1;
  readonly #listeners = new Set<EntityStoreListener>();

  #setEntities(list: EntityDataId[]): void {
    this.#entities = Object.freeze(list);
  }

  /**
   * The underlying array is always replaced, never mutated
   * @returns same reference until something changes
   */
  list(): ReadonlyArray<Readonly<EntityDataId>> {
    return this.#entities;
  }

  get(id: number): Readonly<EntityDataId> | undefined {
    return this.#entities.find((entity) => entity.id === id);
  }

  get size(): number {
    return this.#entities.length;
  }

  /**
   * @param data - new entity data
   * @returns - new entity with unique ID
   */
  add(data: EntityData): Readonly<EntityDataId> {
    const newEntities = Array.from(this.#entities);
    const newEntity = {...structuredClone(data), id: this.#nextId};
    newEntities.push(sealEntity(newEntity));
    this.#nextId = this.#nextId + 1;
    this.#setEntities(newEntities);
    const changes: EntityChange[] = [{
      kind: "add",
      after: newEntity,
    }];
    this.#emit({ type: "change", changes });
    return newEntity;
  }

  remove(id: number): boolean {
    const before = this.get(id);
    if(before === undefined)
      return false; // nothing to delete

    this.#setEntities(this.#entities.filter((entity) => {
      return entity.id !== id
    }));
    const changes: EntityChange[] = [{
      kind: "remove",
      before,
    }];
    this.#emit({ type: "change", changes });
    return true;
  }

  update(id: number, patch: Partial<EntityData>): boolean {
    const entIndex = this.#entities.findIndex((entity) => entity.id === id);
    if(entIndex < 0)
      return false; // no entity with this ID
    const before = this.#entities[entIndex];
    const after = {...structuredClone(before), ...structuredClone(patch), id}; // id is important here - patch should not modify it
    if(JSON.stringify(before) === JSON.stringify(after))
      return false;
    // if the patch erased values without replacing them, drop the property
    for(const property in after) {
      if(after[property] === undefined)
        delete after[property];
    }
    const newEntities = Array.from(this.#entities);
    newEntities[entIndex] = sealEntity(after);
    this.#setEntities(newEntities);
    const changes: EntityChange[] = [{
      kind: "update",
      before,
      after,
    }];
    this.#emit({ type: "change", changes });
    return true;
  }

  clear(): void {
    if(this.size > 0) {
      this.#setEntities([]);
      this.#emit({type: "reset"});
    } 
  }

  /**
   * For replacing the entire store on loading or for a new map
   * @param list 
   */
  replaceAll(list: Iterable<EntityData>): void {
    const newEntities: EntityDataId[] = [];
    for(const entityData of list) {
      const newEnt = {...structuredClone(entityData), id: this.#nextId};
      newEntities.push(sealEntity(newEnt));
      this.#nextId++;
    }
    this.#setEntities(newEntities);
    this.#emit({type: "reset"});
  }

  /**
   * Shifts locations for all entities in the store by coord delta
   */
  translateAll(dx: number, dy: number, dz: number): void {
     if(this.#entities.length === 0 || (dx === 0 && dy === 0 && dz === 0) )
      return; // empty store, nothing to do

    const newEntities: EntityDataId[] = []
    const changes: EntityChange[] = [];
      
    for(const entity of this.#entities) {
      const newEnt = {...entity, x: entity.x + dx, y: entity.y + dy, z: entity.z + dz};
      newEntities.push(sealEntity(newEnt));
      changes.push({
        kind: "update",
        before: entity,
        after: newEnt,
      })
    }
    this.#setEntities(newEntities);
    this.#emit({ type: "change", changes });
  }

  /** @returns unsubscribe function */
  subscribe(listener: EntityStoreListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    }
  }

  #emit(event: EntityStoreEvent): void {
    for (const listener of [...this.#listeners])
      listener(event);
  }
}

export {
  EntityStore,
  EntityChange,
  EntityStoreEvent,
  EntityStoreListener
}