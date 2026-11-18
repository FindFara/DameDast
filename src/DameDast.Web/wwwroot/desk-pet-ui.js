import { t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
const styleOf = style => ["cat", "robot"].includes(style) ? style : "dog";
const canvas = style => `<canvas width="88" height="96" data-voxel-pet="${styleOf(style)}" aria-hidden="true"></canvas>`;
export const petPreviewMarkup = style => `<div class="desk-pet-preview">${canvas(style)}</div>`;
const house = `<svg viewBox="0 0 48 48" aria-hidden="true" shape-rendering="crispEdges"><path fill="#713b2c" d="M6 21h36v25H6z"/><path fill="#b3784c" d="M9 21h30v24H9z"/><path fill="#d49a60" d="M9 24h30v3H9zm0 7h30v2H9zm0 7h30v2H9z"/><path fill="#632c2d" d="M2 21h4v-4h4v-4h4V9h4V5h12v4h4v4h4v4h4v4h4v5H2z"/><path fill="#ac5351" d="M6 20h4v-4h4v-4h4V8h12v4h4v4h4v4h4v3H6z"/><path fill="#2b2826" d="M17 31h3v-3h8v3h3v15H17z"/><path fill="#edc88f" d="M18 14h12v5H18z"/></svg>`;
export function roamingPetsMarkup(widgets) {
  const pets = widgets.filter(widget => widget.type === "pet");
  return pets.length ? `<div class="desk-pet-layer" data-desk-pet-layer>${pets.map(pet => `<button type="button" class="desk-pet-house" data-pet-house="${pet.id}" aria-label="${esc(t("Call pet outside"))}">${house}</button><button type="button" class="desk-roaming-pet" data-roaming-pet="${pet.id}" data-pet-style="${styleOf(pet.options?.petStyle)}" aria-label="${esc(t("Send pet home"))}">${canvas(pet.options?.petStyle)}</button>`).join("")}</div>` : "";
}
