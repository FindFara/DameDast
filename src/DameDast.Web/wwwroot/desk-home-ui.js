import { t } from "./i18n.js";
import { googleServiceIcon } from "./google-services.js";

export function deskSearchMarkup(icon) {
  return `<form class="desk-web-search" data-desk-web-search role="search"><span class="desk-search-provider" aria-hidden="true">${googleServiceIcon("google")}</span><input name="query" type="search" maxlength="300" autocomplete="off" placeholder="${t("Search the web")}" aria-label="${t("Search with Google")}"><button type="submit" aria-label="${t("Search with Google")}">${icon("arrow")}</button></form>`;
}
export function deskFloatingActions(editing, icon) {
  return `<div class="create-launcher create-launcher-floating desk-floating-actions"><button type="button" id="mobile-add" class="primary" data-desk-action="add" aria-label="${t("Add component")}">${icon("plus")}</button><button type="button" class="desk-edit-fab" data-desk-action="toggle-edit" aria-pressed="${editing}" aria-label="${t(editing ? "Finish editing" : "Edit workbench")}">${icon(editing ? "check" : "edit")}</button></div>`;
}

export const componentGroups = [
  { id: "daily", title: "Everyday tools", types: ["search", "googleServices", "shortcut", "clock", "plainCalendar", "link", "calculator", "keyGenerator", "image", "pet"] },
  { id: "writing", title: "Writing and planning", types: ["notes", "canvas", "tasks", "reminders"] },
  { id: "money", title: "Finances", types: ["summary", "accounts", "installments", "goals", "markets", "allocation", "assets", "receivables"] },
];
export function componentPicker(catalog, icon) {
  return `<div class="desk-component-tabs" role="tablist" aria-label="${t("Components")}">${componentGroups.map((group,index)=>`<button type="button" role="tab" aria-selected="${index === 0}" data-component-category="${group.id}" aria-controls="component-group-${group.id}">${t(group.title)}</button>`).join("")}</div>${componentGroups.map((group,index)=>`<div class="desk-component-picker" role="tabpanel" id="component-group-${group.id}" data-component-group="${group.id}" ${index ? "hidden" : ""}>${group.types.map(type=>{const spec=catalog.find(spec=>spec.type===type);return `<label><input type="radio" name="widgetType" value="${type}" ${type === "search" ? "checked" : ""} required><span>${icon(spec.glyph)}<strong>${t(spec.title)}</strong></span></label>`;}).join("")}</div>`).join("")}`;
}
