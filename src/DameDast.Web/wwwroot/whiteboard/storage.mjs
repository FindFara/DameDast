import { normalizeSavedRecord } from "./recovery.mjs";
const DB = "damdast-whiteboards-v1";
export async function database() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      for (const n of ["documents", "index", "ui", "library"])
        if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
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
  const key = `${scope}:${id}`, candidates = [], invalid = [];
  const own = await read("documents", `${key}:${clientId}`);
  if (own) candidates.push(own);
  const pointer = await read("index", key);
  if (pointer && pointer !== `${key}:${clientId}`) {
    const pointed = await read("documents", pointer);
    if (pointed) candidates.push(pointed);
  }
  for (const candidate of candidates) {
    try { return {...normalizeSavedRecord(candidate), recovered:invalid.length > 0}; }
    catch { invalid.push(candidate); }
  }
  const db = await database();
  const copies = await new Promise((resolve,reject)=>{
    const values=[], prefix=key+":";
    const request=db.transaction("documents").objectStore("documents").openCursor(IDBKeyRange.bound(prefix,prefix+"\uffff"));
    request.onsuccess=()=>{const cursor=request.result;if(cursor){values.push(cursor.value);cursor.continue();}else resolve(values);};
    request.onerror=()=>reject(request.error);
  }).finally(()=>db.close());
  for (const candidate of copies) {
    try { return {...normalizeSavedRecord(candidate), recovered:true}; }
    catch { invalid.push(candidate); }
  }
  if (invalid.length) throw Object.assign(Error("The saved canvas needs recovery. Download the saved data before trying another copy."),{recovery:invalid});
  return null;
}
export async function saveDocument(scope, id, clientId, value) {
  const key = `${scope}:${id}:${clientId}`;
  const db = await database();
  try {
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(["documents","index"],"readwrite");
      tx.objectStore("documents").put(structuredClone(value),key);
      tx.objectStore("index").put(key,`${scope}:${id}`);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  } finally { db.close(); }
}
