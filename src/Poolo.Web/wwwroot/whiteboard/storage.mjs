const DB = "damdast-whiteboards-v1";
export async function database() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      for (const n of ["documents", "index", "ui", "library"])
        r.result.createObjectStore(n);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function read(store, key) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store),
        r = tx.objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function write(store, key, value) {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(structuredClone(value), key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export class SerializedWriter {
  constructor(save, error = (error) => {}, delay = 500) {
    this.save = save;
    this.error = error;
    this.delay = delay;
    this.sequence = 0;
    this.chain = Promise.resolve();
    this.value = null;
  }
  schedule(value) {
    this.value = structuredClone(value);
    this.sequence++;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => void this.flush().catch(() => {}),
      this.delay,
    );
  }
  flush() {
    clearTimeout(this.timer);
    if (this.value === null) return this.chain;
    const value = this.value,
      sequence = this.sequence;
    this.chain = this.chain
      .catch(() => {})
      .then(async () => {
        if (sequence !== this.sequence) return;
        try {
          await this.save(value);
          if (sequence === this.sequence) this.value = null;
        } catch (e) {
          this.error(e);
          throw e;
        }
      });
    return this.chain;
  }
}
export async function loadDocument(scope, id, clientId) {
  const key = `${scope}:${id}`,
    own = await read("documents", `${key}:${clientId}`);
  if (own) return own;
  const pointer = await read("index", key);
  return pointer ? await read("documents", pointer) : null;
}
export async function saveDocument(scope, id, clientId, value) {
  const key = `${scope}:${id}:${clientId}`;
  await write("documents", key, value);
  await write("index", `${scope}:${id}`, key);
}
