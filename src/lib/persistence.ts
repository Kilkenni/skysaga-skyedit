import { STRINGS } from "../i18n/strings";

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

/**
 * @param data - pre-stringified JSON
 * @returns gzip-compressed, base64-encoded string, null on encode errors
 */
async function compressJson(data:string):Promise<string> {
  if (typeof CompressionStream === "undefined") {
    throw new Error(STRINGS.en.compressionUnsupported);
  }
  const rawBlob = new Blob([data], { type: "application/json" });
  const cs = new CompressionStream("gzip");
  const compressedStream = rawBlob.stream().pipeThrough(cs);
  const compressedBlob = await new Response(compressedStream).blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(compressedBlob); // produces base64-encoded string + metadata in the form of: "data:*/*;base64,<content>"
  });
  //prefix with "gzip" marker and slice away the metadata at the beginning
  return `gzip:${dataUrl.slice(dataUrl.indexOf("base64,") + 7)}`;
}

async function decompressJson(data:string) {
  if(!data.startsWith("gzip:")) {
    return data; // not compressed, return as is
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error(STRINGS.en.compressionUnsupported);
  }
  const encoded = data.slice("gzip:".length); // base64-encoded string
  const ds = new DecompressionStream("gzip");
  const res = await fetch("data:application/octet-stream;base64," + encoded);
  const text = await new Response(res.body!.pipeThrough(ds)).text();
  return text;
}


async function readJson<T>(key: string): Promise<T | null> { 
  try {
    const res = await storage.get(key);
    if (res && res.value) {
      const decompressed = await decompressJson(res.value); // if not compressed, returns plain
      const data = JSON.parse(decompressed);
      return data;
    }
  } catch (error) {
    // no key found or parsing error
  }
  return null; // nothing found
 }

async function writeJson(key: string, value: unknown): Promise<void> { 
  try {
    const serializedValue = JSON.stringify(value);
    // if over 10 kB, try to compress first, fallback to storing uncompressed
    if(serializedValue.length > 10000) {
      try {
        await storage.set(key, await compressJson(serializedValue));
      } 
      catch(error) {
        await storage.set(key, serializedValue);
      }
    }
    else
      await storage.set(key, serializedValue);
  } catch (error) {
    // ignore for now
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
      const data = await readJson<T>(`${prefix}${name}`);
      return data;
    },

    async save(name: string, value: T) { 
      await writeJson(`${prefix}${name}`, value);
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
  createNamedStore,
  readJson,
  writeJson,
}