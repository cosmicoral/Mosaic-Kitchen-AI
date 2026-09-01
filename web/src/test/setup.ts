class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

// Node 26 exposes an unavailable experimental localStorage that can shadow
// jsdom's implementation. Give browser-facing tests a deterministic store.
const storage = new MemoryStorage();
Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
