import { amountText } from "./privacy.js";
import { notePdfEditor, notePdfLinks } from "./note-pdfs.js";
import { drawingSvg } from "./drawing.js";
import { t, getLanguage, localizedNumber } from "./i18n.js";
import { escapeHtml as esc, money, today } from "./finance.js";
import { solarText, dateControl } from "./calendar.js";
import {
  organizerReport,
  nextReminder,
  notificationKey,
  tehranParts,
} from "./organizer.js";
const button = (action, label, attrs = "", style = "secondary") =>
  `<button type="button" class="${style}" data-action="${action}" ${attrs}>${t(label)}</button>`;
const title = (c, text) => esc(c.space === "demo" ? t(text) : text);
const badge = (s) => `<span class="badge">${t(s)}</span>`;
const noteIcon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${{
  pin: '<path d="m9 3 6 0-1 6 4 4v2h-5v6l-2-3v-3H6v-2l4-4Z"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v6m4-6v6"/>',
  canvas: '<path d="m4 17 11-11 3 3L7 20H4ZM14 7l3 3M4 4h7M4 8h3"/>',
  list: '<path d="m3 5 2 2 3-3M11 6h10M3 12h4m4 0h10M3 18h4m4 0h10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  pdf: '<path d="M14 3H5v18h14V8ZM14 3v6h5M8 14h8M8 17h6"/>',
}[name]}</svg>`;
const noteAction = (action, label, glyph, attrs = "") =>
  `<button type="button" class="icon-button" data-action="${action}" aria-label="${esc(t(label))}" title="${esc(t(label))}" ${attrs}>${noteIcon(glyph)}</button>`;
const pinnedButton = (r) =>
  button(
    "organizer-pin",
    r.data.pinned ? "Unpin" : "Pin",
    `data-id="${r.id}"`,
    "text-button",
  );
const smallDate = (instant) => {
  const p = tehranParts(instant);
  return `${solarText(p.date)} · <bdi dir="ltr">${p.time}</bdi>`;
};
export function checklistRow(
  item = { id: crypto.randomUUID(), text: "", done: false },
) {
  return `<div class="checklist-editor-row" data-checklist-row data-task-id="${esc(item.id)}"><input type="checkbox" data-task-done ${item.done ? "checked" : ""} aria-label="${t("Completed")}"><input data-task-text value="${esc(item.text)}" maxlength="200" placeholder="${t("Task")}" aria-label="${t("Task")}" required><button type="button" class="icon-button" data-action="task-row-remove" aria-label="${t("Remove task")}">×</button></div>`;
}
function taskRow(note, item, c) {
  return `<div class="checklist-item ${item.done ? "done" : ""}"><button type="button" role="checkbox" aria-checked="${!!item.done}" aria-label="${title(c, item.text)}" class="task-checkbox" data-action="todo-toggle" data-id="${note.id}" data-task-id="${item.id}">${item.done ? "✓" : ""}</button><span class="task-content"><span dir="auto">${title(c, item.text)}</span>${item.dueDate ? `<small class="task-due">${solarText(item.dueDate)}${item.dueTime ? ` · <bdi dir="ltr">${esc(item.dueTime)}</bdi>` : ""}</small>` : ""}</span></div>`;
}
function noteCard(c, r) {
  const d = r.data, tasks = d.checklist || [],
    open = tasks.filter(item => !item.done), completed = tasks.length - open.length;
  return `<article class="note-card ${d.pinned ? "pinned" : ""}" data-note-open="${r.id}">
    <button type="button" class="icon-button note-pin ${d.pinned ? "is-pinned" : ""}" data-action="organizer-pin" data-id="${r.id}" aria-pressed="${!!d.pinned}" aria-label="${t(d.pinned ? "Unpin" : "Pin")}" title="${t(d.pinned ? "Unpin" : "Pin")}">${noteIcon("pin")}</button>
    ${d.whiteboardId ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${d.whiteboardPreview ? `<img src="${esc(d.whiteboardPreview)}" alt=""/>` : `<span class="whiteboard-placeholder">${t("Open canvas")} ↗</span>`}</button>` : !d.drawing ? "" : `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${drawingSvg(d.drawing, true)}</button>`}
    <button type="button" class="note-open" data-action="edit" data-id="${r.id}" aria-label="${esc(t("Edit") + ": " + (c.space === "demo" ? t(d.title) : d.title))}"><span class="note-title" role="heading" aria-level="3" dir="auto">${title(c, d.title)}</span>${d.body ? `<span class="note-body" dir="auto">${title(c, d.body)}</span>` : ""}</button>
    ${tasks.length ? `<div class="note-checklist">${open.slice(0, 6).map(item => taskRow(r, item, c)).join("")}${open.length > 6 ? `<button type="button" class="text-button note-more" data-action="edit" data-id="${r.id}">+${localizedNumber(open.length - 6)} ${t("More items")}</button>` : ""}${completed ? `<details class="note-completed"><summary>${localizedNumber(completed)} ${t("Completed items")}</summary>${tasks.filter(item => item.done).map(item => taskRow(r, item, c)).join("")}</details>` : ""}</div>` : ""}
    ${notePdfLinks(r)}
    <footer class="note-footer"><small>${solarText(d.updatedOn)}</small><div class="row-actions">${!d.drawing && !d.whiteboardId ? noteAction("canvas-open", "Add drawing", "canvas", `data-id="${r.id}"`) : ""}${noteAction("edit", "Edit", "edit", `data-id="${r.id}"`)}${noteAction("delete", "Delete", "trash", `data-id="${r.id}"`)}</div></footer>
  </article>`;
}
function noteCards(c) {
  const notes = c.records
    .filter(
      (r) =>
        r.kind === "note" &&
        (c.page !== "canvas" || r.data.drawing || r.data.whiteboardId) &&
        (!c.filter ||
          `${r.data.title} ${r.data.body} ${(r.data.attachments || []).map((f) => f.name).join(" ")} ${(r.data.checklist || []).map((x) => x.text).join(" ")}`
            .toLowerCase()
            .includes(c.filter.toLowerCase())),
    )
    .sort(
      (a, b) =>
        Number(b.data.pinned) - Number(a.data.pinned) ||
        b.data.updatedOn.localeCompare(a.data.updatedOn),
    );
  if (!notes.length) return `<section class="panel empty">${t(c.filter ? "No matching notes." : "No notes yet.")}</section>`;
  const pinned = notes.filter(r => r.data.pinned), others = notes.filter(r => !r.data.pinned);
  const group = (label, items) => items.length ? `<section class="notes-section" aria-label="${t(label)}">${pinned.length ? `<h2 class="notes-section-title">${t(label)}</h2>` : ""}<div class="notes-grid ${c.notesView === "list" ? "notes-list" : ""}">${items.map(r => noteCard(c, r)).join("")}</div></section>` : "";
  return group("Pinned", pinned) + group("Other notes", others);
}
function reminderCards(c) {
  return `<div class="cards-grid">${
    c.records
      .filter((r) => r.kind === "reminder")
      .sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned))
      .map((r) => {
        const d = r.data,
          next = nextReminder(d, c.now),
          repeat =
            d.repeat === "once"
              ? t("Once")
              : `${t("Every")} ${localizedNumber(d.interval)} ${t({ daily: "day(s)", weekly: "week(s)", monthly: "Persian month(s)" }[d.repeat])}`;
        return `<article class="panel personal-reminder ${d.completed ? "completed" : ""}"><div class="card-heading">${badge(d.completed ? "Completed" : d.pinned ? "Pinned" : repeat)}${pinnedButton(r)}</div><h2 dir="auto">${title(c, d.title)}</h2>${d.body ? `<p dir="auto" class="small-note">${title(c, d.body)}</p>` : ""}<div class="reminder-times">${d.times.map((time) => `<bdi dir="ltr">${esc(time)}</bdi>`).join("")}</div><p class="small-note">${repeat}${d.maxOccurrences ? " · " + localizedNumber(d.maxOccurrences) + " " + t("occurrences") : ""}</p><p class="reminder-next">${next ? `${t("Next")}: ${smallDate(next.dueAt)}` : t(d.completed ? "Completed" : "No upcoming occurrence in the next year.")}</p><div class="card-foot">${button("reminder-complete", d.completed ? "Reactivate" : "Complete", `data-id="${r.id}"`, "text-button")}<div class="row-actions">${button("edit", "Edit", `data-id="${r.id}"`, "text-button")}${button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</div></div></article>`;
      })
      .join("") ||
    `<section class="panel empty">${t("No personal reminders yet.")}${button("add", "New reminder", 'data-kind="reminder"', "primary")}</section>`
  }</div><p class="small-note">${t("Reminder times use Tehran time. Push reminders need your .NET server and notification permission.")}</p>`;
}
export function organizerTab(page) {
  return page === "canvas"
    ? "canvas"
    : page === "goals"
      ? "goals"
      : page === "reminders"
        ? "reminders"
        : page === "tasks"
          ? "tasks"
          : "notes";
}
export function organizerPage(c, renderGoals) {
  const report = organizerReport(c.records, c.now),
    tab = organizerTab(c.page),
    kind = tab === "reminders" ? "reminder" : tab === "goals" ? "goal" : "note",
    add =
      kind === "reminder"
        ? "New reminder"
        : kind === "goal"
          ? "New goal"
          : "New note";
  let content;
  if (tab === "notes" || tab === "canvas")
    content =
      `<div class="notes-toolbar"><input id="search" type="search" value="${esc(c.filter)}" placeholder="${t("Search notes")}" aria-label="${t("Search notes")}">${noteAction("notes-view", c.notesView === "list" ? "Grid view" : "List view", c.notesView === "list" ? "grid" : "list", `aria-pressed="${c.notesView === "list"}"`)}</div>${c.page !== "canvas" ? `<div class="note-composer"><button type="button" class="note-compose-start" data-action="add" data-kind="note">${t("Take a note…")}</button>${noteAction("note-list-add", "New list", "list")}${noteAction("canvas-add", "Add drawing", "canvas")}${noteAction("note-pdf-add", "Add PDF", "pdf")}</div>` : ""}` +
      noteCards(c);
  else if (tab === "tasks") {
    const tasks = report.tasks.filter(
      (x) =>
        !c.filter ||
        `${x.item.text} ${x.note.data.title}`
          .toLowerCase()
          .includes(c.filter.toLowerCase()),
    );
    const calendarTasks=c.records.filter(r=>!r.deleted&&r.kind==="calendarEvent"&&r.data.kind==="task"&&(!c.filter||r.data.title.toLowerCase().includes(c.filter.toLowerCase())));
    content = `<div class="organizer-summary"><strong>${localizedNumber(report.openTasks+calendarTasks.filter(r=>!r.data.done).length)}</strong><span>${t("Open tasks")}</span></div><section class="panel task-list">${tasks.map((x) => `<article>${taskRow(x.note, x.item, c)}<button type="button" class="text-button" data-action="edit" data-id="${x.note.id}" dir="auto">${title(c, x.note.data.title)}</button></article>`).join("") || `<div class="empty">${t("Add checklist tasks inside any note.")}</div>`}</section>${calendarTasks.length?`<section class="panel task-list"><h2>${t("Calendar tasks")}</h2>${calendarTasks.map(r=>`<article><span dir="auto">${esc(r.data.title)}</span><button class="text-button task-date" data-planner-action="open" data-id="${r.id}" data-date="${r.data.startDate}"><span>${solarText(r.data.startDate)}</span>${r.data.endDate !== r.data.startDate ? `<span>${solarText(r.data.endDate)}</span>` : ""}<span aria-hidden="true">↗</span></button></article>`).join("")}</section>`:""}`;
  } else if (tab === "reminders") content = reminderCards(c);
  else content = renderGoals();
  return `<div class="page-heading"><div><h1>${t(tab === "notes" ? "Notes" : "Planner")}</h1>${tab === "notes" ? "" : `<p class="small-note">${t("Notes, tasks, reminders and goals. Together.")}</p>`}</div>${tab === "notes" ? "" : button(tab === "canvas" ? "canvas-add" : "add", tab === "canvas" ? "New canvas" : add, `data-kind="${kind}"`, "primary")}</div><nav class="organizer-tabs" aria-label="${t("Planner")}">${[
    ["notes", "Notes"],
    ["canvas", "Handwritten notes"],
    ["calendar", "Calendar"],
    ["tasks", "Tasks"],
    ["reminders", "Reminders"],
    ["goals", "Savings goals"],
  ]
    .map(
      ([key, label]) =>
        `<a href="#${key}" class="${tab === key ? "active" : ""}" ${tab === key ? 'aria-current="page"' : ""}>${t(label)}${key === "tasks" && report.openTasks ? `<span>${localizedNumber(report.openTasks)}</span>` : ""}</a>`,
    )
    .join("")}</nav>${content}`;
}
export function pinnedPanel(c) {
  const pins = organizerReport(c.records, c.now).pinned;
  if (!pins.length) return "";
  return `<section class="panel dashboard-pins"><div class="panel-head"><h2>${t("Pinned to your dashboard")}</h2><a class="text-link" href="#organizer">${t("Planner")} ↗</a></div><div class="pin-grid">${pins
    .map((r) => {
      const d = r.data;
      return `<article class="pin-card pin-${r.kind}"><div>${badge(r.kind === "note" ? "Note" : r.kind === "goal" ? "Savings goals" : "Reminders")}${pinnedButton(r)}</div><button type="button" class="pin-title" data-action="edit" data-id="${r.id}" dir="auto">${title(c, d.title || d.name)}</button>${r.kind === "goal" ? `<p><bdi dir="ltr">${amountText(d.saved, c)}</bdi> / <bdi dir="ltr">${amountText(d.target, c)}</bdi> ${t("toman")}</p>` : r.kind === "note" ? `${d.whiteboardId ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${d.whiteboardPreview ? `<img src="${esc(d.whiteboardPreview)}" alt=""/>` : t("Open canvas")}</button>` : ""}${!d.whiteboardId && d.drawing ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${drawingSvg(d.drawing, true)}</button>` : ""}<p dir="auto">${title(c, d.body.slice(0, 160))}</p><small>${localizedNumber((d.checklist || []).filter((x) => !x.done).length)} ${t("Open tasks")}</small>` : `<p>${d.times.map(esc).join(" · ")}</p><small>${t(d.completed ? "Completed" : "Reminders")}</small>`}</article>`;
    })
    .join("")}</div></section>`;
}
export function notificationsMarkup(c) {
  const report = organizerReport(c.records, c.now);
  return `<div class="dialog-heading"><h2>${t("Notifications")} <span class="badge">${localizedNumber(report.unread)}</span></h2><button type="button" class="icon-button" data-action="notifications-close" aria-label="${t("Close")}">×</button></div><div class="notification-toolbar">${button("notifications-read-all", "Mark all read", "", "text-button")}</div><div class="notification-list">${
    report.notifications
      .slice(0, 100)
      .map(
        (n) =>
          `<article class="notification-item ${n.read ? "read" : "unread"}"><span class="notification-dot"></span><button type="button" class="notification-content" data-action="notification-open" data-key="${esc(notificationKey(n))}"><strong dir="auto">${title(c, n.title)}</strong><small>${t(n.kind === "reminder" ? "Reminders" : n.kind === "goal" ? "Savings goals" : "Installments")} · ${smallDate(n.dueAt)}</small></button>${n.read ? "" : button("notification-read", "Mark read", `data-key="${esc(notificationKey(n))}"`, "text-button")}</article>`,
      )
      .join("") || `<div class="empty">${t("You are all caught up.")}</div>`
  }</div>`;
}
const input = (label, name, value = "", attributes = "") =>
  `<label class="field">${t(label)}<input name="${name}" value="${esc(value)}" ${attributes}></label>`;
export function organizerEditorFields(kind, d) {
  if (kind === "note")
    return (
      input("Title", "title", d.title || "", 'required maxlength="80"') +
      `<label class="field">${t("Content")}<textarea name="body" rows="4" maxlength="4000" dir="auto">${esc(d.body || "")}</textarea></label><div class="checklist-editor-head"><strong>${t("Checklist")}</strong>${button("task-row-add", "Add task", "", "text-button")}</div><div id="checklist-editor-rows">${(d.checklist || []).map(checklistRow).join("")}</div>${notePdfEditor()}<label class="checkbox-field"><input name="pinned" type="checkbox" ${d.pinned ? "checked" : ""}>${t("Pin to dashboard")}</label>`
    );
  if (kind === "reminder")
    return (
      input("Title", "title", d.title || "", 'required maxlength="80"') +
      `<label class="field">${t("Content")}<textarea name="body" rows="3" maxlength="4000" dir="auto">${esc(d.body || "")}</textarea></label>` +
      dateControl("Start date", "startDate", d.startDate || today(), true) +
      input(
        "Times (Tehran)",
        "timesText",
        d.timesText ?? (d.times || ["09:00"]).join(", "),
        'required dir="ltr" placeholder="09:00, 18:00"',
      ) +
      `<div class="field-grid"><label class="field">${t("Repeat")}<select name="repeat">${[
        ["once", "Once"],
        ["daily", "Daily"],
        ["weekly", "Weekly"],
        ["monthly", "Every Persian month"],
      ]
        .map(
          ([value, label]) =>
            `<option value="${value}" ${value === (d.repeat || "once") ? "selected" : ""}>${t(label)}</option>`,
        )
        .join(
          "",
        )}</select></label>${input("Every (interval)", "interval", d.interval || 1, 'inputmode="numeric" required')}</div>` +
      input(
        "Number of occurrences (optional)",
        "maxOccurrences",
        d.maxOccurrences || "",
        'inputmode="numeric"',
      ) +
      dateControl("End date (optional)", "endDate", d.endDate || "", false) +
      `<label class="checkbox-field"><input name="pinned" type="checkbox" ${d.pinned ? "checked" : ""}>${t("Pin to dashboard")}</label><label class="checkbox-field"><input name="completed" type="checkbox" ${d.completed ? "checked" : ""}>${t("Completed")}</label><p class="small-note">${t("Add up to 12 times, separated by commas. Monthly repeats use the Persian calendar.")}</p>`
    );
  return null;
}
