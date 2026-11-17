import { copyLegacyLedger } from "./legacy-storage.js";
let migration;
const DB_NAME = 'damedast-v1';
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('spaces');
    request.onsuccess = async () => {
      try {
        migration ||= copyLegacyLedger(request.result).catch(error=>{migration=null;throw error;});
        await migration;
        resolve(request.result);
      } catch(error) { request.result.close();reject(error); }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function loadSpace(key) {
  const db = await openDb();
  try { return await new Promise((resolve, reject) => { const request = db.transaction('spaces').objectStore('spaces').get(key); request.onsuccess = () => resolve(request.result || { snapshot: { revision: 0, records: [] }, pending: [] }); request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
export async function saveSpace(key, state) {
  const db = await openDb();
  try { await new Promise((resolve, reject) => { const tx = db.transaction('spaces', 'readwrite'); tx.objectStore('spaces').put(structuredClone(state), key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }
  finally { db.close(); }
}
