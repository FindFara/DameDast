import { escapeHtml as e } from "./finance.js";
import { getLanguage } from "./i18n.js";
import { normalizeNote, noteColors, sanitizeNoteHtml } from "./keep-model.js";
export const colorName = (color) =>
  tr(
    color === "default" ? "Default" : color[0].toUpperCase() + color.slice(1),
    {
      default: "پیش‌فرض",
      sand: "ماسه‌ای",
      yellow: "زرد",
      sage: "سبز زیتونی",
      mint: "نعنایی",
      blue: "آبی",
      lavender: "یاسی",
      rose: "صورتی",
    }[color] || color,
  );
export const tr = (en, fa) => (getLanguage() === "fa" ? fa : en);
const paths = {
  menu: "M3 6h18M3 12h18M3 18h18",
  note: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  refresh: "M20 7V3l-4 4a8 8 0 1 0 3 10M20 7h-5",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list: "M4 4h16v6H4zM4 14h16v6H4z",
  settings:
    "M9 3h6l1 4 4 2v6l-4 2-1 4H9l-1-4-4-2V9l4-2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  pin: "m9 3 6 0-1 6 3 3v2H7v-2l3-3zM12 14v7",
  bell: "M5 17h14l-2-4V8a5 5 0 0 0-10 0v5zM10 21h4",
  label: "M3 4h9l9 8-9 8H3zM7 9h.01",
  archive: "M3 4h18v5H3zM5 9v12h14V9M9 13h6",
  trash: "M3 6h18M9 3h6M6 6l1 15h10l1-15M10 10v7M14 10v7",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  checklist: "m3 6 1 1 2-2M9 6h12M3 12l1 1 2-2M9 12h12M3 18l1 1 2-2M9 18h12",
  color:
    "M12 3a9 9 0 1 0 0 18h2a3 3 0 0 0 0-6h-1a2 2 0 0 1 0-4h4a4 4 0 0 0-5-8M7 8h.01M6 13h.01M10 6h.01M16 7h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  undo: "M9 5 3 10l6 5M3 10h11a7 7 0 0 1 7 7",
  redo: "m15 5 6 5-6 5M21 10H10a7 7 0 0 0-7 7",
  format: "M4 5h16M12 5v16M8 21h8",
  select: "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5m-9-9 4 4 6-7",
  restore: "M4 5v5h5M4 10a8 8 0 1 1 1 8M12 7v5l3 2",
  plus: "M12 4v16M4 12h16",
  drag: "M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  indent: "M9 4h12M9 20h12M13 9h8M13 15h8m-9-2 4-4-4-4",
  history: "M4 3v6h6M4 9a9 9 0 1 1 1 9M12 7v6l4 2",
  copy: "M8 3h13v14M3 7h14v14H3z",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8",
  filter: "M3 5h18M6 12h12M10 19h4",
  account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
};
export const ico = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(
    paths[name] || paths.note
  )
    .split("!")
    .map((d) => `<path d="${d}"/>`)
    .join("")}</svg>`;
export const button = (action, name, label, attrs = "") =>
  `<button type="button" class="keep-icon" data-k="${action}" aria-label="${e(label)}" title="${e(label)}" ${attrs}>${ico(name)}</button>`;
export const labels = (c) =>
  c.records
    .filter((r) => !r.deleted && r.kind === "noteLabel")
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
export function shell(c, p) {
  return `<section class="keep-app" data-scope="${e(c.space)}"><div class="page-heading"><h1>${tr("Notes", "یادداشت‌ها")}</h1><div class="heading-actions">${button("view", p.view === "list" ? "grid" : "list", tr("Change view", "تغییر نما"))}${button("notes-menu", "more", tr("Notes menu", "منوی یادداشت‌ها"), 'aria-haspopup="menu" aria-expanded="false"')}</div></div><div class="keep-toolbar"><div class="keep-search">${ico("search")}<input type="search" data-k-search placeholder="${tr("Search notes", "جست‌وجوی یادداشت‌ها")}" aria-label="${tr("Search notes", "جست‌وجوی یادداشت‌ها")}"/>${button("clear-search", "close", tr("Clear search", "پاک‌کردن جست‌وجو"))}</div></div><div class="keep-main"><div class="keep-connection" role="status"></div><div class="keep-filters"></div><div class="keep-composer-slot"></div><div class="keep-sections"></div></div><div class="keep-snackbar" role="status" hidden></div></section>`;
}
export function notesMenu(c, route, label) {
  const item = (id, icon, en, fa) =>
    `<button type="button" role="menuitem" data-k="route" data-route="${id}" ${route === id && !label ? 'aria-current="page"' : ""}>${ico(icon)}${tr(en, fa)}</button>`;
  return `<div class="keep-menu" role="menu" aria-label="${tr("Notes menu", "منوی یادداشت‌ها")}">${item("notes", "note", "Notes", "یادداشت‌ها")}<div class="keep-menu-divider"></div>${labels(
    c,
  )
    .map(
      (r) =>
        `<button type="button" role="menuitem" data-k="route" data-route="notes" data-label="${r.id}" ${label === r.id ? 'aria-current="page"' : ""}>${ico("label")}<span dir="auto">${e(r.data.name)}</span></button>`,
    )
    .join(
      "",
    )}<button type="button" role="menuitem" data-k="edit-labels">${ico("label")}${tr("Edit labels", "ویرایش برچسب‌ها")}</button></div>`;
}
export function card(r, c, p) {
  const d = normalizeNote(r.data);
  return `<article class="keep-card" data-note-id="${r.id}" data-color="${d.color}" tabindex="0" role="group" aria-label="${e(d.title || d.body.slice(0, 70) || tr("Note", "یادداشت"))}">${button("pin", "pin", tr(d.pinned ? "Unpin" : "Pin", d.pinned ? "برداشتن سنجاق" : "سنجاق"), `aria-pressed="${d.pinned}"`)}<div class="keep-card-content" data-k="open"><h3 dir="auto">${e(d.title)}</h3>${d.body ? `<div class="keep-card-text" dir="auto">${e(d.body)}</div>` : ""}${
    d.checklist.length
      ? `<ul class="keep-task-preview">${d.checklist
          .slice(0, 6)
          .map(
            (x) =>
              `<li dir="auto" class="${x.done ? "is-done" : ""}">${e(x.text)}</li>`,
          )
          .join("")}</ul>`
      : ""
  }</div><div class="keep-chips">${d.labels
    .map((id) => {
      const l = labels(c).find((l) => l.id === id);
      return l
        ? `<button type="button" class="keep-chip" data-k="filter-label" data-label="${id}">${e(l.data.name)}</button>`
        : "";
    })
    .join(
      "",
    )}</div>${p.linkPreviews ? linkPreview(d.body) : ""}<footer class="keep-card-tools">${button("color", "color", tr("Color", "رنگ")) + button("labels", "label", tr("Labels", "برچسب‌ها")) + button("more", "more", tr("More", "بیشتر"), 'aria-haspopup="menu"')}</footer></article>`;
}
export function reminderText(r) {
  try {
    return (
      new Intl.DateTimeFormat(getLanguage() === "fa" ? "fa-IR" : "en-US", {
        dateStyle: "medium",
      }).format(new Date(r.startDate + "T12:00:00")) +
      " · " +
      r.times.join(", ") +
      (r.repeat !== "once" ? " ↻" : "")
    );
  } catch {
    return r.startDate;
  }
}
function linkPreview(body) {
  const links = [...new Set(body.match(/https?:\/\/[^\s<>]+/g) || [])].slice(
    0,
    3,
  );
  return links
    .map((raw) => {
      try {
        const url = new URL(raw);
        if (url.username || url.password) return "";
        return `<a class="keep-link-preview" href="${e(url.href)}" target="_blank" rel="noopener noreferrer">${e(url.hostname)}<small>${e(url.pathname.slice(0, 65))}</small></a>`;
      } catch {
        return "";
      }
    })
    .join("");
}
export function toolbar(d) {
  return `<div class="keep-editor-tools">${button("color", "color", tr("Color", "رنگ"))}${button("labels", "label", tr("Labels", "برچسب‌ها"))}${button("format", "format", tr("Formatting", "قالب‌بندی"))}${button("undo", "undo", tr("Undo text", "بازگشت متن"))}${button("redo", "redo", tr("Redo text", "اجرای مجدد متن"))}${button("more", "more", tr("More", "بیشتر"), 'aria-haspopup="menu"')}<button type="button" class="keep-close" data-k="close-editor">${tr("Close", "بستن")}</button></div>`;
}
export function editor(d, inline = false) {
  return `<section class="keep-editor" data-draft-id="${d.id}" data-color="${d.data.color}"><div class="keep-editor-heading"><input data-k-title maxlength="80" dir="auto" placeholder="${tr("Title (optional)", "عنوان (اختیاری)")}" aria-label="${tr("Title", "عنوان")}" value="${e(d.data.title)}"/>${button("pin", "pin", tr("Pin", "سنجاق"), `aria-pressed="${d.data.pinned}"`)}</div><div class="keep-formatbar" hidden>${[
    ["bold", "B"],
    ["italic", "I"],
    ["underline", "U"],
    ["h1", "H1"],
    ["h2", "H2"],
    ["p", tr("Normal", "عادی")],
    ["clear", tr("Clear formatting", "حذف قالب‌بندی")],
  ]
    .map(
      ([k, v]) =>
        `<button type="button" data-k-format="${k}" aria-label="${k}">${v}</button>`,
    )
    .join(
      "",
    )}</div><div class="keep-editor-scroll"><div class="keep-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${tr("Note text", "متن یادداشت")}" data-placeholder="${tr("Take a note…", "یادداشتی بنویس…")}" dir="auto" >${d.data.richText ? sanitizeNoteHtml(d.data.richText) : e(d.data.body).replaceAll("\n", "<br>")}</div><div class="keep-editor-checklist" ${!d.data.checklist.length ? "hidden" : ""}></div></div><div class="keep-editor-chips"></div><div class="keep-save-state" aria-live="polite"></div>${toolbar(d.data)}</section>`;
}
export function checklist(d, p) {
  return d.data.checklist.length
    ? `<div class="keep-linked-tasks"><ul class="keep-task-preview">${d.data.checklist.map((x) => `<li dir="auto" class="${x.done ? "is-done" : ""}">${e(x.text)}</li>`).join("")}</ul><a href="#tasks">${tr("Manage linked items in Tasks", "مدیریت موارد مرتبط در بخش کارها")}</a></div>`
    : "";
}
export function colorPalette(selected) {
  return `<div class="keep-palette">${noteColors.map((color) => `<button type="button" data-k-color="${color}" data-color="${color}" aria-label="${colorName(color)}" aria-pressed="${selected === color}" title="${colorName(color)}">${selected === color ? ico("check") : ""}</button>`).join("")}</div>`;
}
