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
  return `<div class="checklist-item ${item.done ? "done" : ""}"><button type="button" role="checkbox" aria-checked="${!!item.done}" aria-label="${title(c, item.text)}" class="task-checkbox" data-action="todo-toggle" data-id="${note.id}" data-task-id="${item.id}">${item.done ? "✓" : ""}</button><span dir="auto">${title(c, item.text)}</span></div>`;
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
  return `<div class="notes-grid">${notes.map((r) => `<article class="panel note-card ${r.data.pinned ? "pinned" : ""}"><div class="card-heading">${badge(r.data.pinned ? "Pinned" : "Note")}<small>${solarText(r.data.updatedOn)}</small></div><h2 dir="auto">${title(c, r.data.title)}</h2>${r.data.body ? `<p class="note-body" dir="auto">${title(c, r.data.body)}</p>` : ""}${r.data.whiteboardId ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${r.data.whiteboardPreview ? `<img src="${esc(r.data.whiteboardPreview)}" alt=""/>` : `<span class="whiteboard-placeholder">${t("Open canvas")} ↗</span>`}</button>` : ""}${!r.data.whiteboardId && r.data.drawing ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${drawingSvg(r.data.drawing, true)}</button>` : ""}${notePdfLinks(r)}${(r.data.checklist || []).length ? `<div class="note-checklist">${r.data.checklist.map((item) => taskRow(r, item, c)).join("")}</div>` : ""}<div class="card-foot">${pinnedButton(r)}<div class="row-actions">${!r.data.drawing && !r.data.whiteboardId ? button("canvas-open", "Add drawing", `data-id="${r.id}"`, "text-button") : ""}${button("edit", "Edit", `data-id="${r.id}"`, "text-button")}${button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</div></div></article>`).join("") || `<section class="panel empty">${t("No notes yet.")}</section>`}</div>`;
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
      `<div class="notes-toolbar"><input id="search" type="search" value="${esc(c.filter)}" placeholder="${t("Search notes")}" aria-label="${t("Search notes")}">${c.page !== "canvas" ? button("note-pdf-add", "Add PDF", "", "secondary") : ""}</div>` +
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
    content = `<div class="organizer-summary"><strong>${localizedNumber(report.openTasks+calendarTasks.filter(r=>!r.data.done).length)}</strong><span>${t("Open tasks")}</span></div><section class="panel task-list">${tasks.map((x) => `<article>${taskRow(x.note, x.item, c)}<button type="button" class="text-button" data-action="edit" data-id="${x.note.id}" dir="auto">${title(c, x.note.data.title)}</button></article>`).join("") || `<div class="empty">${t("Add checklist tasks inside any note.")}</div>`}</section>${calendarTasks.length?`<section class="panel task-list"><h2>${t("Calendar tasks")}</h2>${calendarTasks.map(r=>`<article><span dir="auto">${esc(r.data.title)}</span><button class="text-button" data-planner-action="open" data-id="${r.id}" data-date="${r.data.startDate}">${solarText(r.data.startDate)} ↗</button></article>`).join("")}</section>`:""}`;
  } else if (tab === "reminders") content = reminderCards(c);
  else content = renderGoals();
  return `<div class="page-heading"><div><h1>${t("Planner")}</h1><p class="small-note">${t("Notes, tasks, reminders and goals. Together.")}</p></div>${button(tab === "canvas" ? "canvas-add" : "add", tab === "canvas" ? "New canvas" : add, `data-kind="${kind}"`, "primary")}</div><nav class="organizer-tabs" aria-label="${t("Planner")}">${[
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
      return `<article class="pin-card pin-${r.kind}"><div>${badge(r.kind === "note" ? "Note" : r.kind === "goal" ? "Savings goals" : "Reminders")}${pinnedButton(r)}</div><button type="button" class="pin-title" data-action="edit" data-id="${r.id}" dir="auto">${title(c, d.title || d.name)}</button>${r.kind === "goal" ? `<p><bdi dir="ltr">${money(d.saved)}</bdi> / <bdi dir="ltr">${money(d.target)}</bdi> ${t("toman")}</p>` : r.kind === "note" ? `${d.whiteboardId ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${d.whiteboardPreview ? `<img src="${esc(d.whiteboardPreview)}" alt=""/>` : t("Open canvas")}</button>` : ""}${!d.whiteboardId && d.drawing ? `<button type="button" class="note-drawing-preview" data-action="canvas-open" data-id="${r.id}" aria-label="${t("Open canvas")}">${drawingSvg(d.drawing, true)}</button>` : ""}<p dir="auto">${title(c, d.body.slice(0, 160))}</p><small>${localizedNumber((d.checklist || []).filter((x) => !x.done).length)} ${t("Open tasks")}</small>` : `<p>${d.times.map(esc).join(" · ")}</p><small>${t(d.completed ? "Completed" : "Reminders")}</small>`}</article>`;
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
