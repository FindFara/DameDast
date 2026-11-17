const storageKey = "damedast-nav-pins";
export const MAX_NAV_PINS = 3;
export function validPins(value, allowed) {
  return Array.isArray(value) ? [...new Set(value)].filter(key => allowed.includes(key)).slice(0, MAX_NAV_PINS) : [];
}
export function readPins(allowed) {
  try { return validPins(JSON.parse(localStorage.getItem(storageKey) || "[]"), allowed); }
  catch { return []; }
}
export function togglePin(pins, key) {
  if (pins.includes(key)) return pins.filter(value => value !== key);
  if (pins.length >= MAX_NAV_PINS) throw Error("Pin up to 3 menus.");
  return [...pins, key];
}
export function savePins(pins) {
  try { localStorage.setItem(storageKey, JSON.stringify(pins)); } catch {}
}
