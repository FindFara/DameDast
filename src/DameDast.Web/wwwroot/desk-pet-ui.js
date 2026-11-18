import { t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
const canvas = style => `<canvas width="88" height="96" data-voxel-pet="${style === "robot" ? "robot" : "cat"}" aria-hidden="true"></canvas>`;
export const petPreviewMarkup = style => `<div class="desk-pet-preview">${canvas(style)}<span>${t("Walks around your workbench")}</span></div>`;
export function petControls(widgets) {
  const pets = widgets.filter(widget => widget.type === "pet");
  return pets.length ? `<div class="desk-pet-controls" aria-label="${t("Desk pet")}">${pets.map(pet => `<button type="button" class="desk-pet-toggle" data-desk-pet-toggle="${pet.id}" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path class="pet-pause-icon" d="M7 4v12M13 4v12"/><path class="pet-play-icon" d="m7 4 8 6-8 6Z"/></svg><span>${esc(pet.title || t("Desk pet"))}</span><span data-pet-toggle-label>${t("Pause walking")}</span></button>`).join("")}</div>` : "";
}
export function roamingPetsMarkup(widgets) {
  const pets = widgets.filter(widget => widget.type === "pet");
  return pets.length ? `<div class="desk-pet-layer" data-desk-pet-layer aria-hidden="true">${pets.map(pet => `<div class="desk-roaming-pet" data-roaming-pet="${pet.id}" data-pet-style="${pet.options?.petStyle === "robot" ? "robot" : "cat"}">${canvas(pet.options?.petStyle)}<span class="roaming-pet-name">${esc(pet.title || t("Desk pet"))}</span></div>`).join("")}</div>` : "";
}
