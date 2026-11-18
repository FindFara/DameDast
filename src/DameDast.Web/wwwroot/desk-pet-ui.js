import { t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
const styleOf = style => ["cat", "robot"].includes(style) ? style : "dog";
const canvas = style => `<canvas width="88" height="96" data-voxel-pet="${styleOf(style)}" aria-hidden="true"></canvas>`;
const house = `<svg viewBox="0 0 48 48" aria-hidden="true" shape-rendering="crispEdges"><path fill="#713b2c" d="M6 21h36v25H6z"/><path fill="#b3784c" d="M9 21h30v24H9z"/><path fill="#d49a60" d="M9 24h30v3H9zm0 7h30v2H9zm0 7h30v2H9z"/><path fill="#632c2d" d="M2 21h4v-4h4v-4h4V9h4V5h12v4h4v4h4v4h4v4h4v5H2z"/><path fill="#ac5351" d="M6 20h4v-4h4v-4h4V8h12v4h4v4h4v4h4v3H6z"/><path fill="#2b2826" d="M17 31h3v-3h8v3h3v15H17z"/><path fill="#edc88f" d="M18 14h12v5H18z"/></svg>`;
export function petSceneMarkup(widget) {
  return `<div class="desk-pet-scene" data-pet-scene="${widget.id}" data-pet-style="${styleOf(widget.options?.petStyle)}" data-pet-mood="happy"><div class="desk-pet-ground" aria-hidden="true"></div><div class="desk-pet-house" aria-hidden="true">${house}</div><button type="button" class="desk-pet-character" aria-label="${esc(t("Happy dog. Change mood."))}">${canvas(widget.options?.petStyle)}</button></div>`;
}
