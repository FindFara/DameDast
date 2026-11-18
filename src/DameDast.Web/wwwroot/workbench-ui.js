import {
  defaultWorkbench,
  workbenchRecord,
  widgetCatalog,
  deskColors,
  deskContrast,
  validDeskColor,
  validateWorkbench,
  deviceWorkbench,
  deviceForWidth,
  widgetVisibleOnDevice,
} from "./workbench.js";
import { t, getLanguage, localizedNumber, isRtl } from "./i18n.js";
import {
  money,
  escapeHtml as esc,
  balance,
  totals,
  categories,
} from "./finance.js";
import { inMonth, monthControl, solarText } from "./calendar.js";
import { organizerReport, nextReminder, tehranParts } from "./organizer.js";
import { drawingSvg } from "./drawing.js";
import { assetEntries, decimalText } from "./assets.js";
import { groupedNumeric } from "./number-inputs.js";
import { categoryInfo } from "./planning.js";
import { instruments } from "./market-catalog.js";
import { preferences } from "./preferences.js";
import { toolTypes } from "./desk-tools.js";
import { toolMarkup, toolOptionFields } from "./desk-tool-ui.js";
import { deskHomeHeading, componentPicker } from "./desk-home-ui.js";
import { petControls, roamingPetsMarkup } from "./desk-pet-ui.js";
import { isDrawingNote, textNotes, taskEntries } from "./notebook.js";

const num = (value) => `<bdi dir="ltr">${money(value)}</bdi>`;
const amount = (value) => `${num(value)} <small>${t("toman")}</small>`;
const cents = (value) =>
  `<bdi dir="ltr">${groupedNumeric(decimalText(value, 2), getLanguage())}</bdi>`;
const label = (c, value) => {
  if (c.space !== "demo") return esc(value);
  const installment = /^Laptop installment (\d+)\/(\d+)$/.exec(String(value));
  if (isRtl() && installment)
    return `قسط لپ‌تاپ ${localizedNumber(Number(installment[1]))}/${localizedNumber(Number(installment[2]))}`;
  return esc(t(value));
};
const rowsOf = (c, kind) =>
  c.records.filter((r) => !r.deleted && r.kind === kind);
const empty = (text = "Nothing here yet.") =>
  `<p class="desk-empty">${t(text)}</p>`;
const row = (name, value, sub = "") =>
  `<div class="desk-data-row"><div><strong dir="auto">${name}</strong>${sub ? `<small>${sub}</small>` : ""}</div><b class="desk-number">${value}</b></div>`;

function summaryWidget(c) {
  const tx = rowsOf(c, "transaction"),
    flow = totals(tx.filter((r) => inMonth(r.data.date, c.month)));
  const total = rowsOf(c, "account").reduce((s, r) => s + balance(r, tx), 0);
  return `<span class="desk-caption">${t("Account balance")}</span><div class="desk-primary-number">${amount(total)}</div><div class="desk-mini-metrics"><span>${t("Income")}<b>${amount(flow.income)}</b></span><span>${t("Spending")}<b>${amount(flow.expense)}</b></span></div>`;
}
function notesWidget(c, w) {
  const notes = textNotes(c.records)
    .filter((r) => (w.referenceId ? r.id === w.referenceId : true))
    .sort((a, b) => Number(!!b.data.pinned) - Number(!!a.data.pinned) || b.data.updatedOn.localeCompare(a.data.updatedOn)).slice(0, 3);
  if (!notes.length)
    return empty(
      w.referenceId ? "This note is no longer available." : "No notes yet.",
    );
  return notes
    .map(
      (r) =>
        `<article class="desk-note"><button class="desk-note-title" data-action="edit" data-id="${r.id}" dir="auto">${label(c, r.data.title)}</button>${r.data.body ? `<p dir="auto">${label(c, r.data.body.slice(0, 120))}</p>` : ""}<small>${solarText(r.data.updatedOn)}</small></article>`,
    )
    .join("");
}
function canvasWidget(c, w) {
  const note = rowsOf(c, "note")
    .filter((r) =>
      w.referenceId
        ? r.id === w.referenceId
        : !!(r.data.drawing || r.data.whiteboardId),
    )
    .sort((a, b) => b.data.updatedOn.localeCompare(a.data.updatedOn))[0];
  if (!note?.data.drawing && !note?.data.whiteboardId)
    return empty(
      w.referenceId
        ? "This note is no longer available."
        : "No handwritten notes yet.",
    );
  return `<button class="desk-canvas-preview" data-action="canvas-open" data-id="${note.id}" aria-label="${t("Open canvas")}">${note.data.whiteboardId ? (note.data.whiteboardPreview ? `<img src="${esc(note.data.whiteboardPreview)}" alt=""/>` : t("Open canvas")) : drawingSvg(note.data.drawing, true)}</button><strong class="desk-caption" dir="auto">${label(c, note.data.title)}</strong>`;
}
function accountsWidget(c) {
  const tx = rowsOf(c, "transaction"),
    accounts = rowsOf(c, "account");
  return (
    accounts
      .map((r) => row(label(c, r.data.name), amount(balance(r, tx))))
      .join("") || empty("Add an account to start.")
  );
}
function installmentsWidget(c) {
  const list = rowsOf(c, "installment")
    .filter((r) => !r.data.paid)
    .sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate));
  const monthly = list
    .filter((r) => inMonth(r.data.dueDate, c.month))
    .reduce((s, r) => s + r.data.amount, 0);
  return (
    `<div class="desk-inline-total"><span>${t("Due this month")}</span><b>${amount(monthly)}</b></div>` +
    (list
      .map((r) =>
        row(
          label(c, r.data.title),
          amount(r.data.amount),
          solarText(r.data.dueDate),
        ),
      )
      .join("") || empty("All caught up."))
  );
}
function tasksWidget(c) {
  const tasks = taskEntries(c.records, c.now).filter(task => !task.done).slice(0, 5);
  return tasks.map(task => `<div class="desk-task"><button type="button" class="task-checkbox" role="checkbox" aria-checked="false" aria-label="${label(c, task.title)}" data-action="${task.source === "noteTask" ? "todo-toggle" : "task-toggle"}" data-id="${task.record.id}" data-task-id="${task.id}" data-date="${task.occurrence || ""}"></button><button type="button" class="desk-task-title" data-planner-action="open" data-id="${task.record.id}" data-source="${task.source}" data-task-id="${task.id}" data-date="${task.occurrence || task.date}" dir="auto">${label(c, task.title)}</button></div>`).join("") || empty("All caught up.");
}
function goalsWidget(c) {
  return (
    rowsOf(c, "goal")
      .map(
        (r) =>
          `<article class="desk-goal"><div><strong dir="auto">${label(c, r.data.name)}</strong><b>${localizedNumber(r.data.target ? Math.min(100, (r.data.saved / r.data.target) * 100) : 0, 1)}%</b></div><progress value="${r.data.saved}" max="${r.data.target}"></progress><small>${amount(r.data.saved)} / ${amount(r.data.target)}</small></article>`,
      )
      .join("") || empty("No goals yet.")
  );
}
function marketsWidget(c) {
  return ["GOLD", "USD", "SILVER", "BTC"]
    .map((symbol) => {
      const i = instruments.find((i) => i.symbol === symbol),
        q = c.marketData?.quotes?.find((q) => q.symbol === symbol),
        delayed = q && new Date(c.now) - new Date(q.asOf) > 7200000;
      return row(
        esc(getLanguage() === "fa" ? i.nameFa : i.name),
        q
          ? `<bdi dir="ltr">${money(q.price, symbol === "BTC" ? 2 : 0)}</bdi>`
          : "—",
        `${t(i.unit)}${q ? ` · ${solarText(tehranParts(q.asOf).date)}${delayed ? " · " + t("Delayed") : ""}` : " · " + t("Unavailable")}`,
      );
    })
    .join("");
}
function allocationWidget(c) {
  const plan = rowsOf(c, "allocationPlan").find(
    (r) => r.data.month === c.month,
  );
  if (!plan) return empty("Create a monthly plan first.");
  let at = 0;
  const tx = rowsOf(c, "transaction").filter(
    (r) => r.data.type === "expense" && inMonth(r.data.date, c.month),
  );
  const slices = plan.data.rows.map((r) => {
    const info = categoryInfo(c.records, categories, r.category),
      start = at;
    at += r.basisPoints / 100;
    return `${info.color} ${start}% ${at}%`;
  });
  if (at < 100) slices.push(`var(--track) ${at}% 100%`);
  return `<div class="desk-allocation"><div class="desk-donut" style="background:conic-gradient(${slices.join(",")})"><span>${num(plan.data.total)}<small>${t("toman")}</small></span></div><div>${plan.data.rows
    .map((r) => {
      const info = categoryInfo(c.records, categories, r.category),
        spent = tx
          .filter((t) => t.data.category === r.category)
          .reduce((s, t) => s + t.data.amount, 0);
      return row(
        esc(info.builtin ? t(info.name) : info.name),
        `${localizedNumber(r.basisPoints / 100, 2)}%`,
        `${t("Spent")} · ${money(spent)}`,
      );
    })
    .join("")}</div></div>`;
}
function assetsWidget(c) {
  const entries = assetEntries(
      c.records,
      c.connectedSnapshots,
      c.marketData,
      c.now,
    ),
    priced = entries.filter((a) => a.valueCents !== null),
    known = entries.filter((a) => a.profitCents !== null);
  if (!entries.length) return empty("No assets yet.");
  return (
    `<div class="desk-inline-total"><span>${t("Tracked value")}</span><b>${priced.length ? cents(priced.reduce((s, a) => s + a.valueCents, 0n)) : "—"}</b></div><div class="desk-inline-total"><span>${t("Unrealized profit / loss")}</span><b>${known.length ? cents(known.reduce((s, a) => s + a.profitCents, 0n)) : "—"}</b></div>` +
    entries
      .map((a) =>
        row(
          label(c, a.name),
          a.valueCents === null ? "—" : cents(a.valueCents),
        ),
      )
      .join("")
  );
}
function receivablesWidget(c) {
  const list = rowsOf(c, "receivable").filter(
    (r) => r.data.returned < r.data.amount,
  );
  return (
    list
      .map((r) =>
        row(
          label(c, r.data.person),
          amount(r.data.amount - r.data.returned),
          r.data.dueDate ? solarText(r.data.dueDate) : "",
        ),
      )
      .join("") || empty("No outstanding loans.")
  );
}
function remindersWidget(c) {
  return (
    rowsOf(c, "reminder")
      .filter((r) => !r.data.completed)
      .map((r) => ({ r, next: nextReminder(r.data, c.now) }))
      .filter((x) => x.next)
      .sort((a, b) => a.next.dueAt.localeCompare(b.next.dueAt))
      .map(({ r, next }) =>
        row(
          label(c, r.data.title),
          `<bdi dir="ltr">${tehranParts(next.dueAt).time}</bdi>`,
          solarText(tehranParts(next.dueAt).date),
        ),
      )
      .join("") || empty("No upcoming reminders.")
  );
}
const components = {
  ...Object.fromEntries(toolTypes.map(type => [type, toolMarkup])),
  summary: summaryWidget,
  notes: notesWidget,
  canvas: canvasWidget,
  accounts: accountsWidget,
  installments: installmentsWidget,
  tasks: tasksWidget,
  goals: goalsWidget,
  markets: marketsWidget,
  allocation: allocationWidget,
  assets: assetsWidget,
  receivables: receivablesWidget,
  reminders: remindersWidget,
};
const grip =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" stroke-width="4" stroke-linecap="round"/></svg>';
const gear =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14M9 3v6M15 9v6M10 15v6"/></svg>';
const resize =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 20 12-12M14 20l6-6"/></svg>';
function widgetMarkup(c, w, icon) {
  const spec = widgetCatalog.find((i) => i.type === w.type),
    heading = w.title || t(spec.title),
    fg = deskContrast(w.background),
    style = `grid-column:${w.x + 1}/span ${w.width};grid-row:${w.y + 1}/span ${w.height};${fg ? `--desk-card-bg:${w.background};--ink:${fg};--muted:${fg};--accent:${fg};--border:color-mix(in srgb,${fg} 15%,transparent);` : ""}`;
  return `<article class="desk-card desk-widget-${w.type}${fg ? " desk-custom-color" : ""}" style="${style}" data-desk-id="${w.id}" aria-label="${esc(heading)}"><header class="desk-card-head">${c.workbenchEditing ? `<button type="button" class="desk-drag" data-desk-drag="${w.id}" aria-label="${t("Move card")}: ${esc(heading)}" title="${t("Arrow keys move; Shift + arrow keys resize.")}">${grip}<span>${esc(heading)}</span></button>` : `<h2>${icon(spec.glyph)}<span>${esc(heading)}</span></h2>`}${c.workbenchEditing ? `<button type="button" class="desk-configure" data-desk-action="configure" data-id="${w.id}" aria-label="${t("Card settings")}: ${esc(heading)}">${gear}</button>` : ""}</header><div class="desk-card-body">${components[w.type](c, w)}</div><footer class="desk-card-foot">${spec.page ? `<a href="#${spec.page}">${t("Open")}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>` : ""}${["notes", "canvas"].includes(w.type) ? `<button type="button" class="desk-quick-add" ${w.type === "canvas" ? 'data-action="canvas-add"' : 'data-action="add" data-kind="note"'}>+ ${t("Add")}</button>` : ""}${c.workbenchEditing ? `<span class="desk-card-devices">${t(widgetVisibleOnDevice(w, "phone") ? "Phone" : widgetVisibleOnDevice(w, "tablet") ? "Tablet" : "Desktop")}</span><span class="desk-card-size" dir="ltr">${localizedNumber(w.width)} × ${localizedNumber(w.height)}</span><button type="button" class="desk-resize" data-desk-resize="${w.id}" aria-label="${t("Resize card")}: ${esc(heading)}" title="${t("Drag to resize")}">${resize}</button>` : ""}</footer></article>`;
}
export function workbenchPage(c, icon) {
  const source = workbenchRecord(c.records)?.data || defaultWorkbench();
  const editing = preferences().workbenchEditing,
    device = editing
      ? "desktop"
      : deviceForWidth(typeof innerWidth === "number" ? innerWidth : 1400);
  const layout = editing ? source : deviceWorkbench(source, device),
    fg = deskContrast(layout.background),
    usedRows = editing ? 6 : Math.max(1, ...layout.widgets.map((w) => w.y + w.height));
  const heading = deskHomeHeading(c, icon, editing);
  return `<section aria-label="${t("Workbench")}" class="workbench-page desk-home${editing ? " workbench-editing" : ""}" style="${layout.background ? `--desk-wallpaper:${layout.background};--desk-wallpaper-ink:${fg};` : ""}">${heading}${editing ? "" : petControls(layout.widgets)}<div class="desk-scroll"><div id="desk-board" class="desk-board${editing ? " is-arranging" : ""}" data-device="${device}" style="--desk-columns:${layout.columns};--desk-rows:${usedRows};${layout.background ? `--desk-background:${layout.background};` : ""}${fg ? `--desk-grid-ink:${fg};` : ""}" dir="ltr">${editing ? `<div class="desk-grid" aria-hidden="true">${Array.from({ length: 72 }, (_, i) => `<span></span>`).join("")}</div>` : ""}${layout.widgets.filter(w => editing || w.type !== "pet").map((w) => widgetMarkup({ ...c, workbenchEditing: editing }, w, icon)).join("")}${editing ? "" : roamingPetsMarkup(layout.widgets)}${!layout.widgets.length ? `<div class="desk-empty-board"><span>${t("No components for this device.")}</span></div>` : ""}</div></div>${editing ? `<div class="desk-editor-actions"><button type="button" class="primary" data-desk-action="done">${icon("check")}${t("Save")}</button><output class="desk-live-status" role="status">${t("Changes are saved as you arrange cards.")}</output></div>` : ""}</section>`;
}
export function colorFields(color) {
  return `<div class="desk-color-swatches"><button type="button" data-desk-swatch="" class="desk-auto-swatch${!color ? " selected" : ""}">${t("Theme color")}</button>${deskColors.map((hex) => `<button type="button" style="background:${hex}" data-desk-swatch="${hex}" aria-label="${t("Use color")} ${hex}" class="${color === hex ? "selected" : ""}"></button>`).join("")}</div><div class="desk-custom-colors"><label class="field">${t("Custom color")}<input type="color" data-desk-color-picker value="${color || "#e3eeea"}" aria-label="${t("Color picker")}"></label><label class="field">${t("Hex color")}<input name="background" value="${color || ""}" maxlength="7" pattern="#[0-9a-fA-F]{6}" placeholder="#e3eeea" dir="ltr" autocomplete="off"></label></div><p class="small-note">${t("Leave empty to follow the app theme.")}</p>`;
}
export function widgetSettings(w, c) {
  const referenceNotes = w.type === "canvas" ? rowsOf(c, "note").filter(isDrawingNote) : textNotes(c.records);
  const options = (n, max, value) =>
    `<label class="field">${t(n)}<select name="${{ Column: "x", Row: "y", Width: "width", Height: "height" }[n]}">${Array.from({ length: max }, (_, i) => `<option value="${i + 1}" ${i + 1 === value ? "selected" : ""}>${localizedNumber(i + 1)}</option>`).join("")}</select></label>`;
  return `<label class="field">${t("Card title")}<input name="title" maxlength="60" value="${esc(w.title || "")}" placeholder="${t(widgetCatalog.find((i) => i.type === w.type).title)}" dir="auto"></label>${
    ["notes", "canvas"].includes(w.type)
      ? `<label class="field">${t("Note to display")}<select name="referenceId"><option value="">${t(w.type === "canvas" ? "Latest handwritten note" : "Latest notes")}</option>${referenceNotes
          .map(
            (r) =>
              `<option value="${r.id}" ${r.id === w.referenceId ? "selected" : ""}>${label(c, r.data.title)}</option>`,
          )
          .join(
            "",
          )}${w.referenceId && !referenceNotes.some((r) => r.id === w.referenceId) ? `<option selected value="${w.referenceId}">${t("Unavailable")}</option>` : ""}</select></label>`
      : ""
  }<fieldset class="desk-visibility"><legend>${t("Show on devices")}</legend>${["phone", "tablet", "desktop"].map(device=>`<label><input type="checkbox" name="device-${device}" ${w.devices?.[device] !== false ? "checked" : ""}>${t({phone:"Phone",tablet:"Tablet",desktop:"Desktop"}[device])}</label>`).join("")}</fieldset>${toolOptionFields(w.type, w.options || {})}<strong class="desk-field-heading">${t("Card background")}</strong>${colorFields(w.background)}<div class="desk-dimension-fields">${options("Column", 12, w.x + 1)}${options("Row", 6, w.y + 1)}${options("Width", 12, w.width)}${options("Height", 6, w.height)}</div>`;
}
export function addWidgetFields(icon) {
  return `${componentPicker(widgetCatalog, icon)}<label class="field">${t("Card title")}<input name="title" maxlength="60" dir="auto"></label><div data-widget-options>${toolOptionFields("clock")}</div><label class="field">${t("Initial size")}<select name="size"><option value="2,2">${t("Small")} · ${localizedNumber(2)} × ${localizedNumber(2)}</option><option value="4,2" selected>${t("Medium")} · ${localizedNumber(4)} × ${localizedNumber(2)}</option><option value="6,3">${t("Large")} · ${localizedNumber(6)} × ${localizedNumber(3)}</option><option value="1,1">${t("Tiny")} · ${localizedNumber(1)} × ${localizedNumber(1)}</option></select></label>`;
}
