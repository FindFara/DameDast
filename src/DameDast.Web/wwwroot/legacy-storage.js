// Compatibility identifiers are retained only to migrate older installations.
export const LEGACY_LEDGER_DATABASE = "poolo-v1";
export const LEGACY_BACKUP_FORMAT = "poolo-v1";

export function migrateLegacyPreferences() {
  try {
    if (!localStorage.getItem("damedast-last-user")) {
      const value = localStorage.getItem("poolo-last-user");
      if (value) localStorage.setItem("damedast-last-user", value);
    }
  } catch {}
}

export async function copyLegacyLedger(destination) {
  try { if (localStorage.getItem("damedast-ledger-upgraded") === "1") return; } catch {}
  if (indexedDB.databases) {
    const databases = await indexedDB.databases();
    if (!databases.some(db => db.name === LEGACY_LEDGER_DATABASE)) return;
  }
  const source = await new Promise((resolve,reject) => {
    const request=indexedDB.open(LEGACY_LEDGER_DATABASE,1);
    let missing=false;
    request.onupgradeneeded=()=>{missing=true;request.transaction.abort();};
    request.onerror=()=>missing?resolve(null):reject(request.error);
    request.onsuccess=()=>resolve(request.result);
  });
  if (!source) return;
  try {
    if (!source.objectStoreNames.contains("spaces")) return;
    const rows=await new Promise((resolve,reject)=>{
      const entries=[], request=source.transaction("spaces").objectStore("spaces").openCursor();
      request.onsuccess=()=>{const cursor=request.result;if(cursor){entries.push([cursor.key,cursor.value]);cursor.continue();}else resolve(entries);};
      request.onerror=()=>reject(request.error);
    });
    await new Promise((resolve,reject)=>{
      const tx=destination.transaction("spaces","readwrite"), store=tx.objectStore("spaces");
      for (const [key,value] of rows) {
        const exists=store.get(key);
        exists.onsuccess=()=>{if(exists.result===undefined)store.put(value,key);};
      }
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    try { localStorage.setItem("damedast-ledger-upgraded","1"); } catch {}
  } finally { source.close(); }
}
