import { resolveFinanceRoute } from "./navigation.js";
import { scopedStorageKey } from "./account-scope.js";
const storageKey = "damedast-nav-pins";
export function validPins(value, allowed) {
  return Array.isArray(value) ? [...new Set(value.map(resolveFinanceRoute))].filter(key => allowed.includes(key)) : [];
}
export function readPins(allowed) {
  try { return validPins(JSON.parse(localStorage.getItem(scopedStorageKey(storageKey)) || "[]"), allowed); }
  catch { return []; }
}
export function togglePin(pins, key) {
  if (pins.includes(key)) return pins.filter(value => value !== key);
  return [...pins, key];
}
export function savePins(pins) {
  try { localStorage.setItem(scopedStorageKey(storageKey), JSON.stringify(pins)); } catch {}
}
