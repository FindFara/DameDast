import { preferences } from "./preferences.js";
import { enabledNotificationReport } from "./notification-preferences.js";
import { closeIcon } from "./ui-icons.js";
import { categoryInfo } from "./planning.js";
import { amountText } from "./privacy.js";
import { isDrawingNote, textNotes, taskEntries } from "./notebook.js";
import { t, getLanguage, localizedNumber } from "./i18n.js";
import { escapeHtml as esc, money, today, categories } from "./finance.js";
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
function noteCard(c, r) {
  const d = r.data;
  return `<article class="note-card ${d.pinned ? "pinned" : ""}" data-note-open="${r.id}"><button type="button" class="icon-button note-pin ${d.pinned ? "is-pinned" : ""}" data-action="organizer-pin" data-id="${r.id}" aria-pressed="${!!d.pinned}" aria-label="${t(d.pinned ? "Unpin" : "Pin")}" title="${t(d.pinned ? "Unpin" : "Pin")}">${noteIcon("pin")}</button><button type="button" class="note-open" data-action="edit" data-id="${r.id}" aria-label="${esc(t("Edit") + ": " + (c.space === "demo" ? t(d.title) : d.title))}"><span class="note-title" role="heading" aria-level="3" dir="auto">${title(c, d.title)}</span>${d.body ? `<span class="note-body" dir="auto">${title(c, d.body)}</span>` : ""}</button><footer class="note-footer"><small>${solarText(d.updatedOn)}</small><div class="row-actions">${noteAction("edit", "Edit", "edit", `data-id="${r.id}"`)}${noteAction("delete", "Delete", "trash", `data-id="${r.id}"`)}</div></footer></article>`;
}
function noteCards(c) {
  const notes = textNotes(c.records)
    .filter(r => !c.filter || `${r.data.title} ${r.data.body}`.toLowerCase().includes(c.filter.toLowerCase()))
    .sort((a, b) => Number(!!b.data.pinned) - Number(!!a.data.pinned) || b.data.updatedOn.localeCompare(a.data.updatedOn));
  if (!notes.length) return `<section class="panel empty">${t(c.filter ? "No matching notes." : "No notes yet.")}</section>`;

  const pinned = notes.filter(r => r.data.pinned), others = notes.filter(r => !r.data.pinned);
  const group = (label, items) => items.length ? `<section class="notes-section" aria-label="${t(label)}">${pinned.length ? `<h2 class="notes-section-title">${t(label)}</h2>` : ""}<div class="notes-grid ${c.notesView === "list" ? "notes-list" : ""}">${items.map(r => noteCard(c, r)).join("")}</div></section>` : "";
  return group("Pinned", pinned) + group("Other notes", others);
}
function tasksPage(c) {
  const entries = taskEntries(c.records, c.now).filter(task => !c.filter || task.title.toLowerCase().includes(c.filter.toLowerCase()))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.date || "9999").localeCompare(b.date || "9999"));
  return `<div class="notes-toolbar"><input id="search" type="search" value="${esc(c.filter)}" placeholder="${t("Search tasks")}" aria-label="${t("Search tasks")}"></div><div class="organizer-summary"><strong>${localizedNumber(entries.filter(task => !task.done).length)}</strong><span>${t("Open tasks")}</span></div><section class="panel task-list standalone-tasks">${entries.map(task => `<article class="standalone-task ${task.done ? "done" : ""}"><button type="button" role="checkbox" aria-checked="${!!task.done}" class="task-checkbox" aria-label="${title(c, task.title)}" data-action="${task.source === "noteTask" ? "todo-toggle" : "task-toggle"}" data-id="${task.record.id}" data-task-id="${task.id}" data-date="${task.occurrence || ""}">${task.done ? "✓" : ""}</button><button type="button" class="task-edit" data-planner-action="open" data-id="${task.record.id}" data-source="${task.source}" data-task-id="${task.id}" data-date="${task.occurrence || task.date}"><strong dir="auto">${title(c, task.title)}</strong>${task.date ? `<small>${solarText(task.date)}</small>` : ""}</button></article>`).join("") || `<div class="empty">${t("No tasks yet.")}</div>`}</section>`;
}
function reminderCards(c) {
  const linked=c.records.filter(r=>!r.deleted&&r.kind==='note'&&r.data.status!=='trashed'&&r.data.reminder);
  const linkedCards=linked.map(r=>{const d=r.data.reminder,next=nextReminder(d,c.now);return `<article class="panel personal-reminder ${d.completed?'completed':''}"><span class="badge">${t('Linked note')}</span><h2 dir="auto">${title(c,r.data.title||d.title)}</h2><div class="reminder-times">${d.times.map(time=>`<bdi dir="ltr">${esc(time)}</bdi>`).join('')}</div><p class="small-note">${esc(d.timeZone||'Asia/Tehran')}</p><p class="reminder-next">${next?`${t('Next')}: ${smallDate(next.dueAt)}`:t(d.completed?'Completed':'No upcoming occurrence in the next year.')}</p><div class="card-foot">${button('note-reminder-complete',d.completed?'Reactivate':'Complete',`data-id="${r.id}"`,'text-button')}<div class="row-actions">${button('note-reminder-edit','Edit',`data-id="${r.id}"`,'text-button')}${button('note-reminder-delete','Delete',`data-id="${r.id}"`,'text-button')}</div></div></article>`;}).join('');
  const pending = organizerReport(c.records, c.now).notifications.filter(n => !n.read && !["reminder", "note"].includes(n.kind));
  return `${pending.length ? `<section class="reminder-checks"><h2>${t("Follow-ups")}</h2><div class="reminder-check-list">${pending.map(n => notificationCard(c, n)).join("")}</div></section>` : ""}<div class="cards-grid">${
    c.records
      .filter((r) => !r.deleted && r.kind === "reminder")
      .sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned))
      .map((r) => {
        const d = r.data,
          next = nextReminder(d, c.now),
          repeat =
            d.repeat === "once"
              ? t("Once")
              : `${t("Every")} ${localizedNumber(d.interval)} ${t({ daily: "day(s)", weekly: "week(s)", monthly: "Persian month(s)" }[d.repeat])}`;
        return `<article class="panel personal-reminder ${d.completed ? "completed" : ""}"><div class="card-heading">${badge(d.completed ? "Completed" : d.pinned ? "Pinned" : repeat)}${pinnedButton(r)}</div><h2 dir="auto">${title(c, d.title)}</h2>${d.body ? `<p dir="auto" class="small-note">${title(c, d.body)}</p>` : ""}<div class="reminder-times">${d.times.map((time) => `<bdi dir="ltr">${esc(time)}</bdi>`).join("")}</div><p class="small-note">${repeat} · ${esc(d.timeZone||"Asia/Tehran")}${d.maxOccurrences ? " · " + localizedNumber(d.maxOccurrences) + " " + t("occurrences") : ""}</p><p class="reminder-next">${next ? `${t("Next")}: ${smallDate(next.dueAt)}` : t(d.completed ? "Completed" : "No upcoming occurrence in the next year.")}</p><div class="card-foot">${button("reminder-complete", d.completed ? "Reactivate" : "Complete", `data-id="${r.id}"`, "text-button")}<div class="row-actions">${button("edit", "Edit", `data-id="${r.id}"`, "text-button")}${button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</div></div></article>`;
      })
      .join("") ||
    (linkedCards?"":`<section class="panel empty">${t("No personal reminders yet.")}${button("add", "New reminder", 'data-kind="reminder"', "primary")}</section>`)
  }${linkedCards}</div><p class="small-note">${t("Each reminder follows its displayed time zone. Push reminders need your .NET server and notification permission.")}</p>`;
}
export function organizerTab(page) {
  return page === "goals"
      ? "goals"
      : page === "reminders"
        ? "reminders"
        : page === "tasks"
          ? "tasks"
          : "notes";
}
export function organizerPage(c, renderGoals) {
  const tab = organizerTab(c.page), headings = {notes:"Notes", tasks:"Tasks", reminders:"Reminders", goals:"Savings goals"};
  let content;
  if (tab === "notes") {
    content = `<div class="notes-toolbar"><input id="search" type="search" value="${esc(c.filter)}" placeholder="${t("Search notes")}" aria-label="${t("Search notes")}">${noteAction("notes-view", c.notesView === "list" ? "Grid view" : "List view", c.notesView === "list" ? "grid" : "list", `aria-pressed="${c.notesView === "list"}"`)}</div><div class="note-composer"><button type="button" class="note-compose-start" data-action="add" data-kind="note">${t("Take a note…")}</button><span class="note-composer-glyph" aria-hidden="true">${noteIcon("edit")}</span></div>` + noteCards(c);
  } else if (tab === "tasks") content = tasksPage(c);
  else if (tab === "reminders") content = reminderCards(c);
  else content = renderGoals();
  const add = tab === "notes" ? "" : tab === "tasks" ? button("task-add", "New task", "", "primary") : button("add", tab === "goals" ? "New goal" : "New reminder", `data-kind="${tab === "goals" ? "goal" : "reminder"}"`, "primary");
  return `<section class="independent-section section-${tab}"><div class="page-heading"><h1>${t(headings[tab])}</h1>${add}</div>${content}</section>`;
}
export function pinnedPanel(c) {
  const pins = organizerReport(c.records, c.now).pinned.filter(record => ["goal", "reminder"].includes(record.kind));
  if (!pins.length) return "";
  return `<section class="panel dashboard-pins"><div class="panel-head"><h2>${t("Pinned to your dashboard")}</h2><a class="text-link" href="#organizer">${t("Planner")} ↗</a></div><div class="pin-grid">${pins
    .map((r) => {
      const d = r.data;
      return `<article class="pin-card pin-${r.kind}"><div>${badge(r.kind === "goal" ? "Savings goals" : "Reminders")}${pinnedButton(r)}</div><button type="button" class="pin-title" data-action="edit" data-id="${r.id}" dir="auto">${title(c, d.title || d.name)}</button>${r.kind === "goal" ? `<p><bdi dir="ltr">${amountText(d.saved, c)}</bdi> / <bdi dir="ltr">${amountText(d.target, c)}</bdi> ${t("toman")}</p>` : `<p>${d.times.map(esc).join(" · ")}</p><small>${t(d.completed ? "Completed" : "Reminders")}</small>`}</article>`;
    })
    .join("")}</div></section>`;
}
export function notificationsMarkup(c) {
  const visible = enabledNotificationReport(organizerReport(c.records, c.now), preferences().notificationKinds).notifications.filter(n => !n.read).slice(0, 100);
  return `<div class="dialog-heading"><h2>${t("Notifications")}</h2><button type="button" class="icon-button" data-action="notifications-close" aria-label="${t("Close")}">${closeIcon}</button></div>
    <div class="notification-toolbar"><button type="button" class="text-button" data-action="notifications-refresh" ${c.refreshInProgress ? 'disabled' : ''}>${t(c.refreshInProgress ? "Refreshing…" : "Refresh")}</button><button type="button" class="text-button" data-action="notifications-read-all" ${visible.length ? '' : 'disabled'}>${t("Mark all read")}</button></div>
    <div class="notification-list">${visible.map(n => notificationCard(c, n)).join('') || `<div class="notification-empty">${notificationGlyph('reminder')}<h3>${t("You are all caught up.")}</h3></div>`}</div>`;
}
function notificationDate(n, record) {
  const date = tehranParts(n.dueAt).date;
  if (["reminder", "note"].includes(n.kind)) return { value: n.dueAt, text: smallDate(n.dueAt) };
  const time = record?.kind === "calendarEvent" && !record.data.allDay ? record.data.startTime : null;
  return { value: time ? `${date}T${time}` : date, text: `${solarText(date)}${time ? ` · <bdi dir="ltr">${esc(time)}</bdi>` : ''}` };
}
function notificationCard(c, n) {
  const record = c.records.find(record => record.id === n.sourceId), when = notificationDate(n, record);
  let heading = title(c, n.title);
  const body = record?.kind === "reminder" ? record.data.body : record?.kind === "calendarEvent" ? record.data.description : null;
  let description = body ? title(c, body) : t(n.kind === "task" ? "Overdue" : n.kind === "installment" ?
    "A payment needs your attention." : n.kind === "goal" ? "Review your goal progress." : "A reminder for you.");
  if (n.checkType === "spending") {
    const category = categoryInfo(c.records, categories, n.category);
    heading = esc(category.builtin ? t(category.name) : category.name);
    description = `${t("Spending increased")} · +<bdi dir="ltr">${amountText(n.increase, c)}</bdi> ${t("toman")}`;
  }
  return `<article class="notification-card notification-${n.kind}"><div class="notification-card-heading"><strong dir="auto">${heading}</strong><time datetime="${esc(when.value)}">${when.text}</time></div><div class="notification-card-body"><p dir="auto">${description}</p><div class="notification-card-actions">${button("notification-read", "Mark read", `data-key="${esc(notificationKey(n))}"`, "text-button")}${button("notification-open", "Review", `data-key="${esc(notificationKey(n))}"`, "secondary")}</div></div></article>`;
}
function notificationGlyph(kind) {
  const paths = { reminder:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4"/>', installment:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18M7 3v4m10-4v4M7 14h4"/>', goal:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m12 12 8-8"/>' };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.reminder}</svg>`;
}

const input = (label, name, value = "", attributes = "") =>
  `<label class="field">${t(label)}<input name="${name}" value="${esc(value)}" ${attributes}></label>`;
export function organizerEditorFields(kind, d) {
  if (kind === "note") return input("Title", "title", d.title || "", 'required maxlength="80"') + `<label class="field">${t("Content")}<textarea name="body" maxlength="4000" dir="auto">${esc(d.body || "")}</textarea></label>`;
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
