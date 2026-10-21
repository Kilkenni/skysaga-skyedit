// Outside Claude's artifact runtime, window.storage doesn't exist.
// This polyfills it with localStorage so the editor also works as a
// standalone local build (npm run dev). No-op inside Claude itself.
if (typeof window !== "undefined" && !window.storage) {
  const ns = (shared) => (shared ? "shared:" : "personal:");
  window.storage = {
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
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(full)) keys.push(k.slice(ns(shared).length));
      }
      return { keys, prefix, shared: !!shared };
    },
  };
}
