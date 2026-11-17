import { t, getLanguage } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";

export function deskHomeHeading(c, icon, editing) {
  const date = new Intl.DateTimeFormat(getLanguage() === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran",
  }).format(new Date(c.now || Date.now()));
  return `<header class="desk-home-header"><div class="desk-settings-heading"><h1>${t("Workbench")}</h1><label class="desk-edit-toggle"><input type="checkbox" role="switch" data-desk-edit-toggle ${editing ? "checked" : ""}><span>${t("Edit")}</span></label>${editing ? `<button class="primary" data-desk-action="add">${icon("plus")}${t("Add component")}</button>` : ""}</div><p class="desk-today">${esc(date)}</p></header><div class="desk-focus"><form class="desk-web-search" data-desk-web-search role="search"><span class="desk-search-provider" aria-hidden="true">G</span><input name="query" type="search" maxlength="300" autocomplete="off" placeholder="${t("Search the web")}" aria-label="${t("Search with Google")}"><button type="submit" aria-label="${t("Search with Google")}">${icon("arrow")}</button></form><nav class="desk-app-shortcuts" aria-label="${t("Quick access")}">${[["notes","Notes"],["tasks","Tasks"],["calendar","Calendar"],["canvas","Drawings"]].map(([page,label])=>`<a href="#${page}"><span>${icon(page)}</span>${t(label)}</a>`).join("")}</nav></div>`;
}

export const componentGroups = [
  { id: "daily", title: "Everyday tools", types: ["clock", "plainCalendar", "link", "calculator", "keyGenerator", "image", "pet"] },
  { id: "writing", title: "Writing and planning", types: ["notes", "canvas", "tasks", "reminders"] },
  { id: "money", title: "Finances", types: ["summary", "accounts", "installments", "goals", "markets", "allocation", "assets", "receivables"] },
];
export function componentPicker(catalog, icon) {
  return `<div class="desk-component-tabs" role="tablist" aria-label="${t("Components")}">${componentGroups.map((group,index)=>`<button type="button" role="tab" aria-selected="${index === 0}" data-component-category="${group.id}" aria-controls="component-group-${group.id}">${t(group.title)}</button>`).join("")}</div>${componentGroups.map((group,index)=>`<div class="desk-component-picker" role="tabpanel" id="component-group-${group.id}" data-component-group="${group.id}" ${index ? "hidden" : ""}>${group.types.map(type=>{const spec=catalog.find(spec=>spec.type===type);return `<label><input type="radio" name="widgetType" value="${type}" ${type === "clock" ? "checked" : ""} required><span>${icon(spec.glyph)}<strong>${t(spec.title)}</strong></span></label>`;}).join("")}</div>`).join("")}`;
}
