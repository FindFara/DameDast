import { selectedMarketSymbols, deskMarketQuote, marketMark } from "./desk-markets.js";
import {
  defaultWorkbench,
  standardWorkbench,
  shortcutPages,
  workbenchRecord,
  widgetCatalog,
  deskColors,
  deskColorNames,
  shortcutColors,
  deskContrast,
  deviceWorkbench,
  deviceForWidth,
} from "./workbench.js";
import { t, getLanguage, localizedNumber, isRtl } from "./i18n.js";
import {
  money,
  escapeHtml as esc,
  balance,
  totals,
  categories,
} from "./finance.js";
import { inMonth, solarText } from "./calendar.js";
import { organizerReport, nextReminder, tehranParts } from "./organizer.js";
import { assetEntries, decimalText } from "./assets.js";
import { groupedNumeric } from "./number-inputs.js";
import { categoryInfo } from "./planning.js";
import { instruments } from "./market-catalog.js";
import { preferences } from "./preferences.js";
import { toolTypes } from "./desk-tools.js";
import { toolMarkup, toolOptionFields } from "./desk-tool-ui.js";
import { deskSearchMarkup, componentPicker } from "./desk-home-ui.js";
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
export function marketsWidget(c, w = {}) {
  const symbols = selectedMarketSymbols(w.options);
  const sources = [...new Set(symbols.map(symbol=>deskMarketQuote(symbol,c.marketData,c.now)?.source).filter(Boolean))];
  return `<div class="desk-market-heading"><strong>${t('Selected prices')}</strong><a href="#market" class="desk-market-source">${esc(sources.length===1?sources[0]:t('Market'))}</a></div><div class="desk-market-rows">${symbols.map(symbol=>{
    const instrument=instruments.find(i=>i.symbol===symbol); if(!instrument)return '';
    const quote=deskMarketQuote(symbol,c.marketData,c.now);
    const color=({BTC:'#f7931a',GOLD:'#cda536',SILVER:'#8391a5',USD:'#20a57b',USDT:'#26a17b',ETH:'#627eea'})[symbol] || '#6586c7';
    const change=quote?.change, changeText=change==null?'—':`${change>0?'+':change<0?'−':''}${localizedNumber(Math.abs(change),2)}%`;
    return `<button type="button" class="desk-market-row" data-action="market-open" data-symbol="${symbol}" title="${quote?esc(`${quote.source} · ${quote.asOf}`):t('Unavailable')}"><span class="desk-market-identity"><span class="desk-market-mark" style="background:${color}">${marketMark(symbol)}</span><span><strong>${esc(getLanguage()==='fa'?instrument.nameFa:instrument.name)}</strong><small>${symbol}${quote?.delayed?' · '+t('Delayed'):''}</small></span></span><span class="desk-market-value"><strong>${quote?`<bdi dir="ltr">${money(quote.price,quote.unit==='USD'?2:0)}</bdi> <small>${t(quote.unit==='toman'?'toman':'USD')}</small>`:'—'}</strong><small class="${change>0?'positive':change<0?'negative':''}"><bdi dir="ltr">${changeText}</bdi></small></span></button>`;
  }).join('')}</div>`;
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
function widgetMarkup(c, w, icon) {
  const spec = widgetCatalog.find(spec=>spec.type===w.type), heading = t(spec.title), fg = deskContrast(w.background);
  const style = `--desk-widget-rows:${w.height};grid-column:${w.x+1}/span ${w.width};grid-row:${w.y+1}/span ${w.height};${fg ? `--desk-card-bg:${w.background};--ink:${fg};--muted:${fg};--accent:${fg};--border:color-mix(in srgb,${fg} 15%,transparent);` : ""}`;
  const page = Object.hasOwn(shortcutPages,w.options?.page) ? w.options.page : "notes";
  const body = w.type === "search" ? deskSearchMarkup(icon) : w.type === "shortcut" ? `<a class="desk-shortcut" href="#${page}" aria-label="${c.workbenchEditing ? t("Card settings")+": " : ""}${t(shortcutPages[page])}" title="${t(shortcutPages[page])}"><span class="desk-shortcut-symbol" style="--shortcut-color:${shortcutColors[page]}">${icon(page)}</span><span class="desk-shortcut-label">${t(shortcutPages[page])}</span></a>` : components[w.type](c,w);
  return `<article class="desk-card desk-widget-${w.type}${fg?" desk-custom-color":""}" style="${style}" data-desk-id="${w.id}" aria-label="${esc(w.type === "shortcut" ? t(shortcutPages[page]) : heading)}">${c.workbenchEditing ? `<div class="desk-card-tools"><button type="button" class="desk-drag" data-desk-drag="${w.id}" aria-label="${t("Move card")}: ${esc(heading)}">${grip}</button><button type="button" class="desk-configure" data-desk-action="configure" data-id="${w.id}" aria-label="${t("Card settings")}: ${esc(heading)}">${gear}</button></div>` : ""}<div class="desk-card-body">${body}</div>${["left","right","bottom","corner"].map(edge=>`<button type="button" class="desk-edge desk-edge-${edge}" data-desk-resize="${edge}" aria-label="${t("Resize card")}" title="${t("Resize card")}"></button>`).join("")}</article>`;
}
export function workbenchPage(c, icon) {
  const source = standardWorkbench(workbenchRecord(c.records)?.data || defaultWorkbench());
  const editing = preferences().workbenchEditing, device = deviceForWidth(typeof innerWidth === "number" ? innerWidth : 1400);
  const layout = deviceWorkbench(source,device);
  const usedRows = Math.max(device === "desktop" ? 12 : 1,...layout.widgets.map(widget=>widget.y+widget.height));
  return `<section aria-label="${t("Workbench")}" class="workbench-page desk-home${editing ? " workbench-editing" : ""}" ><div class="desk-scroll"><div id="desk-board" class="desk-board${editing ? " is-arranging" : ""}" data-device="${device}" style="--desk-columns:${layout.columns};--desk-rows:${usedRows}" dir="ltr">${layout.widgets.map(widget=>widgetMarkup({...c,workbenchEditing:editing},widget,icon)).join("")}</div></div><output class="sr-only desk-live-status" role="status"></output></section>`;
}
export function colorFields(color) {
  return `<input type="hidden" name="background" value="${esc(color || "")}"><div class="desk-color-swatches" role="group" aria-label="${t("Card background")}">${deskColors.map((hex,index)=>`<button type="button" style="background:${hex}" data-desk-swatch="${hex}" aria-label="${t(deskColorNames[index])}" title="${t(deskColorNames[index])}" aria-pressed="${color === hex}" class="${color === hex ? "selected" : ""}"></button>`).join("")}</div>`;
}
export function widgetSettings(w, c) {
  const referenceNotes = textNotes(c.records);
  return `${
    w.type === "notes"
      ? `<label class="field">${t("Note to display")}<select name="referenceId"><option value="">${t("Latest notes")}</option>${referenceNotes
          .map(
            (r) =>
              `<option value="${r.id}" ${r.id === w.referenceId ? "selected" : ""}>${label(c, r.data.title)}</option>`,
          )
          .join(
            "",
          )}${w.referenceId && !referenceNotes.some((r) => r.id === w.referenceId) ? `<option selected value="${w.referenceId}">${t("Unavailable")}</option>` : ""}</select></label>`
      : ""
  }${toolOptionFields(w.type, w.options || {})}<strong class="desk-field-heading">${t("Card background")}</strong>${colorFields(w.background)}`;
}
export function addWidgetFields(icon) {
  return `${componentPicker(widgetCatalog,icon)}<div data-widget-options>${toolOptionFields("search")}</div>`;
}
