interface StorageApi {
  get(key: string, shared?: boolean): Promise<{ value: string }>;
  set(key: string, value: string, shared?: boolean): Promise<unknown>;
  delete(key: string, shared?: boolean): Promise<unknown>;
  list(prefix?: string, shared?: boolean): Promise<{ keys: string[] }>;
}

const storage:StorageApi = {
  async get(key: string) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) 
      throw new Error("key not found: " + key);
    return { key, value: raw };
  },
  async set(key: string, value: string) {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key: string) {
    window.localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix?: string) {
    const keys:string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix || "")) 
        keys.push(key);
    }
    return { keys, prefix };
  },
};

async function readJson<T>(key: string): Promise<T | null> { 
  try {
    const res = await storage.get(key);
    if (res && res.value) {
      const data = JSON.parse(res.value);
      return data;
    }
  } catch (e) {
    // no key found or parsing error
  }
  return null; // nothing found
 }

async function writeJson(key: string, value: unknown): Promise<void> { 
  try {
    await storage.set(key, JSON.stringify(value));
  } catch (e) {
    // ignore, non-critical
  }
}

function createNamedStore<T>(prefix: string) {
  const store: {
    list(): Promise<string[]>;
    load(name: string): Promise<T | null>;
    save(name: string, value: T): Promise<void>;
    delete(name: string): Promise<void>;
  } = {
    async list() { 
      try {
        const res = await storage.list(prefix);
        const names:string[] = [];
        if(!res || !res.keys) {
          return names;
        }
        else {
          for(const key of res.keys) {
            names.push(key.slice(prefix.length))
          }
          return names.sort();
        }
      }
      catch (error) {
        return [];
      }
    },

    async load(name: string) { 
      const data = readJson<T>(`${prefix}${name}`);
      return data;
    },

    async save(name: string, value: T) { 
      writeJson(`${prefix}${name}`, value);
    },

    async delete(name: string) { 
      try {
        await storage.delete(`${prefix}${name}`);
      } catch (e) {
        // ignore
      }
    },
  };

  return store;
}

export {
  storage,
  createNamedStore
}