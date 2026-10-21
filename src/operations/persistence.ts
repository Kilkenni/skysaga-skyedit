const prefix = "storage:";

const storage = {
  async get(key: string) {
    const raw = window.localStorage.getItem(prefix + key);
    if (raw === null) throw new Error("key not found: " + key);
    return { key, value: raw };
  },
  async set(key: string, value: string) {
    window.localStorage.setItem(prefix + key, value);
    return { key, value };
  },
  async delete(key: string) {
    window.localStorage.removeItem(prefix + key);
    return { key, deleted: true };
  },
  async list(pre: string) {
    const full = prefix + (pre || "");
    const keys:any[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(full)) 
        keys.push(k.slice(prefix.length));
    }
    return { keys, pre };
  },
};

export {
  storage,
}