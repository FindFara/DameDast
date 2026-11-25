import { attentionCard, projectsPage, habitsPage, bookmarksPage, productivityFields } from "./productivity-ui.js";
import { tehranParts } from "./organizer.js";
import { transactionBoard, filterTransactions } from "./transaction-board.js";
import { amountText, amountsHidden } from "./privacy.js";
import {settingsPage} from "./settings-ui.js";
import {plannerPage} from "./planner-ui.js";
import { workbenchPage } from "./workbench-ui.js";
import { assetsPage, assetEditorFields } from "./assets-ui.js";
import { navigationGroups } from "./navigation.js";
import { instruments } from "./market-catalog.js";
import {
  organizerPage,
  pinnedPanel,
  organizerEditorFields,
} from "./organizer-ui.js";
import { suggestionsPage } from "./suggestions-ui.js";
import {
  monthLabel,
  monthControl,
  dateControl,
  solarText,
  monthOf,
  shiftMonth,
  inMonth,
  budgetBounds,
  validMonth,
} from "./calendar.js";
import {
  categoryList,
  categoryInfo,
  visibleBudgets,
  spentForBudget,
} from "./planning.js";
import {
  monthlyPlanPage,
  monthlyExpensesPage,
  planningEditorFields,
} from "./planning-ui.js";
import {
  t,
  isRtl,
  locale,
  percentage,
  localizedNumber,
  dueText,
  countText,
  getLanguage,
  getTheme,
} from "./i18n.js";
import {
  categories,
  palette,
  today,
  money,
  dateText,
  dueDays,
  balance,
  totals,
  escapeHtml as esc,
} from "./finance.js";
import { connectedPage } from "./connected-ui.js";
import { formatCardNumber } from "./account-card-number.js";

export const sections = {
  calendar:["Calendar",'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m4 0h1"/>'],
  workbench: [
    "Workbench",
    '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M9 9v12M15 9v6m0 0h7"/>',
  ],
  assets: [
    "Asset performance",
    '<path d="M3 20h18M5 16l4-5 4 3 6-10M15 4h4v4"/>',
  ],
  projects: ["Projects", '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M3 6V3h7l3 3"/>'],
  habits: ["Habits", '<path d="m4 12 5 5L20 6"/><circle cx="12" cy="12" r="10"/>'],
  bookmarks: ["Saved links", '<path d="M6 3h12v18l-6-4-6 4Z"/>'],
  organizer: ["Planner", '<path d="M5 3h14v18H5Zm4 5h6m-6 4h6m-6 4h4"/>'],
  tasks: [
    "Tasks",
    '<path d="m3 6 2 2 3-4m2 3h11M3 14l2 2 3-4m2 3h11M10 21h11"/>',
  ],
  reminders: [
    "Reminders",
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12a3 3 0 0 0 4 0"/>',
  ],
  suggestions: [
    "Investment insights",
    '<path d="M3 20h18M5 16l4-6 4 3 6-9m-5 0h5v5"/>',
  ],
  monthlyPlan: [
    "Monthly plan",
    '<path d="M12 3v9h9A9 9 0 1 1 12 3Zm4 0a8 8 0 0 1 5 5h-5Z"/>',
  ],
  monthlyExpenses: [
    "Monthly expenses",
    '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M8 11h8m-8 4h5"/>',
  ],
  notes: ["Notes", '<path d="M4 3h12l4 4v14H4Zm4 6h8m-8 4h8m-8 4h5"/>'],

  connected: [
    "Connected portfolio",
    '<path d="M3 20h18M5 16V9m7 7V3m7 13v-5M4 4l4 2 4-3 7 4"/>',
  ],
  overview: [
    "Overview",
    '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  ],
  transactions: [
    "Transactions",
    '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  ],
  accounts: [
    "Accounts",
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-6 5h3"/>',
  ],
  budgets: [
    "Budgets",
    '<path d="M12 3v9h9a9 9 0 1 1-9-9Zm4 0a8 8 0 0 1 5 5h-5Z"/>',
  ],
  goals: [
    "Savings goals",
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  ],
  installments: [
    "Installments",
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m4 0h1"/>',
  ],
  receivables: [
    "Money lent",
    '<path d="M4 15h4l3 3h5l5-6-2-2-4 4h-4m-7 5V11h4m3-6h8m-3-3 3 3-3 3"/>',
  ],
  locked: [
    "Locked assets",
    '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  ],
  market: ["Market", '<path d="M3 18 9 11l4 3 8-10m-6 0h6v6M3 22h18"/>'],
  reports: ["Reports", '<path d="M4 20V4m0 16h17M9 16v-5m5 5V6m5 10v-8"/>'],
  settings: [
    "Settings",
    '<path d="m9 3-.5 3-2 1-3-.5-1 3L5 12l-2.5 2.5 1 3 3-.5 2 1 .5 3h6l.5-3 2-1 3 .5 1-3L19 12l2.5-2.5-1-3-3 .5-2-1-.5-3Z"/><circle cx="12" cy="12" r="3"/>',
  ],
};
const extraIcons = {
  apps: '<circle cx="5" cy="5" r="1.3"/><circle cx="12" cy="5" r="1.3"/><circle cx="19" cy="5" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/><circle cx="5" cy="19" r="1.3"/><circle cx="12" cy="19" r="1.3"/><circle cx="19" cy="19" r="1.3"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  link: '<path d="m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M7 6h10M7 11h2m6 0h2M7 15h2m6 0h2M7 19h2m6 0h2"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-6 0 3-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  pet: '<path d="M5 12V4l6 4 8-4v8a7 7 0 0 1-14 0ZM8 13h1m6 0h1m-6 4h4"/>',
  pin: '<path d="m9 3 6 0-1 6 4 4v2h-5v6l-2-3v-3H6v-2l4-4Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.4 4.4M6.2 6.2A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  moon: '<path d="M20 14A8.5 8.5 0 0 1 10 4 8.5 8.5 0 1 0 20 14Z"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9c2.6 0 4.9 1.1 6.6 2.8L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9c-2.6 0-4.9-1.1-6.6-2.8L3 16M3 21v-5h5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v6m4-6v6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  income: '<path d="M18 5 6 17M6 7v10h10"/>',
  expense: '<path d="M6 17 18 5M8 5h10v10"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  wallet:
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 12h5m-4 4h1"/>',
  food: '<path d="M5 3v6m3-6v6M3 6h7M6 9v12m10-18v18m0-18c6 5 5 9 0 9"/>',
  shopping: '<path d="M4 7h16l-1 14H5Zm4 0V5a4 4 0 0 1 8 0v2"/>',
  car: '<path d="m5 7 2-4h10l2 4 2 4v7H3v-7Zm-2 4h18M6 18v3m12-3v3M7 14h1m8 0h1"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8"/>',
  heart: '<path d="M12 21 3 12a5 5 0 0 1 9-6 5 5 0 0 1 9 6Z"/>',
  cup: '<path d="M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 2h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
export const icon = (name, className = "") =>
  `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${sections[name]?.[1] || extraIcons[name] || extraIcons.wallet}</svg>`;
const categoryGlyph = {
  "Food & drinks": "food",
  Shopping: "shopping",
  Transport: "car",
  Home: "home",
  Health: "heart",
  Leisure: "cup",
  Learning: "book",
  Salary: "income",
  "Other income": "income",
  Other: "wallet",
};
export const number = (value, decimals = 0, context) =>
  `<bdi class="number" dir="ltr"${amountsHidden(context) ? ` aria-label="${t("Amount hidden")}"` : ""}>${amountText(value, context, decimals)}</bdi>`;
const pct = (value) =>
  `<bdi class="number" dir="ltr">${percentage(value)}</bdi>`;
const unit = () => `<span class="unit">${t("toman")}</span>`;
const arrowLink = (label, hash) =>
  `<a class="text-link" href="#${hash}">${t(label)} ${icon("arrow", "directional")}</a>`;
const actionButton = (action, label, attributes = "", style = "secondary") =>
  `<button class="${style}" data-action="${action}" ${attributes}>${t(label)}</button>`;
const addNames = {
  transaction: "New transaction",
  account: "New account",
  budget: "New budget",
  goal: "New goal",
  installment: "New installment",
  receivable: "New loan",
  locked: "New locked asset",
  reminder: "New reminder",
  note: "New note",
  assetPosition: "New asset",
  category: "New category",
  allocationPlan: "Create plan",
  monthlyExpense: "New monthly expense",
  investmentStep: "New investment step",
  project: "New project", habit: "New habit", bookmark: "Save link",
};
export const addLabel = (kind) => t(addNames[kind] || "Add");
export const monthText = monthLabel;
const monthPicker = (month) => monthControl(month, "month", true);
function dashboardMonthPicker(c, date) {
  const current = c.month === monthOf(date);
  const caption = current ? solarText(date, false) : monthText(c.month).replace(/\s+\S+$/, "");
  const trigger = `<button type="button" class="dashboard-date" data-select-trigger title="${t("Month")}: ${monthText(c.month)}">${icon("calendar")}${current ? `<time datetime="${date}">${caption}</time>` : `<span>${caption}</span>`}</button>`;
  return monthControl(c.month, "month", true, Number(monthOf(date).slice(0, 4)), trigger);
}
const empty = (text, kind) =>
  `<div class="empty"><span class="empty-mark">${icon(kind === "installment" ? "installments" : kind === "locked" ? "locked" : "wallet")}</span><p>${t(text)}</p>${kind ? actionButton("add", addNames[kind], `data-kind="${kind}"`) : ""}</div>`;
function pageHeading(c, title, kind = null) {
  const overview = c.page === "overview", date = overview ? tehranParts(c.now).date : null;
  const controls = overview
    ? `<div class="dashboard-controls"><button type="button" class="icon-button amounts-toggle" data-action="dashboard-privacy" aria-label="${t(c.amountsVisible ? "Hide amounts" : "Show amounts")}" aria-pressed="${c.amountsVisible === true}" title="${t(c.amountsVisible ? "Hide amounts" : "Show amounts")}">${icon(c.amountsVisible ? "eye" : "eyeOff")}</button>${dashboardMonthPicker(c, date)}</div>`
    : ["budgets", "reports", "installments"].includes(c.page) ? monthPicker(c.month) : "";
  return `<div class="page-heading${overview ? " overview-heading" : ""}"><h1>${t(title)}</h1><div class="heading-actions">${controls}${kind ? `<button class="primary desktop-add" data-action="add" data-kind="${kind}">${icon("plus")}${addLabel(kind)}</button>` : ""}</div></div>`;
}
function panel(title, content, link = "") {
  return `<section class="panel"><div class="panel-head"><h2>${t(title)}</h2>${link}</div>${content}</section>`;
}
function amountCard(label, value, style = "", foot = "", context) {
  return `<article class="stat-card ${style}"><div class="stat-top"><span>${t(label)}</span><span class="stat-icon">${icon(label === "Income" ? "income" : label === "Spending" ? "expense" : "wallet")}</span></div><div class="amount">${number(value, 0, context)}${unit()}</div>${foot ? `<div class="stat-foot">${foot}</div>` : ""}</article>`;
}
export function renderPage(c) {
  const views = {
    workbench: (c) => workbenchPage(c, icon),
    assets: assetsPage,
    projects: projectsPage,
    habits: habitsPage,
    bookmarks: bookmarksPage,
    suggestions: suggestionsPage,
    monthlyPlan: monthlyPlanPage,
    notes: (c) => organizerPage(c, () => goals(c, true)),
    organizer: (c) => organizerPage(c, () => goals(c, true)),
    tasks: (c) => organizerPage(c, () => goals(c, true)),
    reminders: (c) => organizerPage(c, () => goals(c, true)),
    monthlyExpenses: monthlyExpensesPage,
    connected: connectedPage,
    overview: overview,
    transactions: transactions,
    accounts: accounts,
    budgets: budgets,
    goals: (c) => organizerPage(c, () => goals(c, true)),
    installments: installments,
    receivables: receivables,
    locked: locked,
    market: market,
    reports: reports,
    settings: settings,
    calendar: plannerPage,
  };
  return views[c.page](c);
}
const dataText = (c, value) => {
  if (c.space !== "demo") return esc(value);
  const installment = /^Laptop installment (\d+)\/(\d+)$/.exec(String(value));
  if (isRtl() && installment)
    return `قسط لپ‌تاپ ${money(Number(installment[1]))}/${money(Number(installment[2]))}`;
  return esc(t(value));
};
const accountName = (c, id) =>
  c.records.find((r) => r.kind === "account" && r.id === id)?.data.name ||
  t("Account");
const kind = (c, name) => c.records.filter((r) => r.kind === name);
const txs = (c) =>
  kind(c, "transaction").sort((a, b) => b.data.date.localeCompare(a.data.date));
const monthly = (c) => txs(c).filter((r) => inMonth(r.data.date, c.month));
const categoryTitle = (c, id) => {
  const value = categoryInfo(c.records, categories, id);
  return value.builtin ? t(value.name) : value.name;
};
function cashChart(c) {
  const slots = [];
  if (c.page === "reports" && c.flowPeriod !== "monthly") {
    for (let i = 6; i >= 0; i--) {
      const to = new Date(today() + "T12:00:00");
      to.setDate(to.getDate() - i * (c.flowPeriod === "daily" ? 1 : 7));
      const from = new Date(to);
      from.setDate(from.getDate() - (c.flowPeriod === "daily" ? 0 : 6));
      const iso = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      slots.push({
        label: dateText(iso(to)),
        ...totals(
          txs(c).filter(
            (r) => r.data.date >= iso(from) && r.data.date <= iso(to),
          ),
        ),
      });
    }
  } else
    for (let i = 5; i >= 0; i--) {
      const month = shiftMonth(c.month, -i);
      slots.push({
        label: monthText(month).split(" ")[0],
        ...totals(txs(c).filter((r) => inMonth(r.data.date, month))),
      });
    }
  const max = Math.max(1, ...slots.flatMap((s) => [s.income, s.expense]));
  return `<div class="chart-legend"><span><i class="dot"></i>${t("Income")}</span><span><i class="dot faded"></i>${t("Spending")}</span></div><div class="cash-chart" dir="ltr" role="img" aria-label="${t("Cash flow")}">${slots.map((s) => `<div class="bar-group"><div class="bar" style="height:${Math.max(1, (s.income / max) * 100)}%" title="${t("Income")}: ${amountText(s.income, c)}"></div><div class="bar expense" style="height:${Math.max(1, (s.expense / max) * 100)}%" title="${t("Spending")}: ${amountText(s.expense, c)}"></div><span class="chart-label">${esc(s.label)}</span></div>`).join("")}</div>`;
}
function categoryTotals(c) {
  return categoryList(c.records, categories)
    .map((item) => ({
      category: item.id,
      amount: monthly(c)
        .filter((r) => r.data.type === "expense" && r.data.category === item.id)
        .reduce((s, r) => s + r.data.amount, 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
function donut(c) {
  const list = categoryTotals(c),
    sum = list.reduce((s, r) => s + r.amount, 0);
  let stop = 0;
  const ring = list.length
    ? list
        .map((r, i) => {
          const start = stop;
          stop += (r.amount / sum) * 100;
          return `${palette[i % palette.length]} ${start}% ${stop}%`;
        })
        .join(",")
    : "var(--track) 0% 100%";
  return `<div class="donut-wrap"><div class="donut" style="--ring:conic-gradient(${ring})"><div class="donut-center">${number(sum, 0, c)}<small>${t("toman")}</small></div></div><div class="category-list">${
    list.length
      ? list
          .slice(0, 5)
          .map(
            (r, i) =>
              `<div class="category-row"><span><i class="dot" style="background:${palette[i % palette.length]}"></i>${esc(categoryTitle(c, r.category))}</span>${pct((r.amount / sum) * 100)}</div>`,
          )
          .join("")
      : `<span class="muted">${t("No expenses")}</span>`
  }</div></div>`;
}
function movementList(c, list, full = false) {
  if (!list.length) return empty("No transactions", "transaction");
  return `<div class="movement-list">${list.map((r) => `<article class="movement-row"><span class="category-icon ${r.data.type}">${icon(r.data.type === "transfer" ? "transactions" : categoryGlyph[r.data.category])}</span><div class="movement-description"><strong dir="auto">${dataText(c, r.data.note || categoryTitle(c, r.data.category))}</strong><small><bdi dir="auto">${dataText(c, accountName(c, r.data.accountId))}</bdi><span class="separator">·</span>${esc(categoryTitle(c, r.data.category))}</small></div><div class="movement-amount"><bdi class="number ${r.data.type === "income" ? "positive" : r.data.type === "expense" ? "negative" : ""}" dir="ltr">${r.data.type === "income" ? "+" : r.data.type === "expense" ? "−" : ""}${amountText(r.data.amount, c)}</bdi><small>${dateText(r.data.date)}</small></div>${full ? `<div class="row-actions"><button class="icon-button" data-action="edit" data-id="${r.id}" aria-label="${t("Edit")}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-id="${r.id}" aria-label="${t("Delete")}">${icon("trash")}</button></div>` : ""}</article>`).join("")}</div>`;
}
function progress(c, b) {
  const spent = spentForBudget(c.records, b),
    percent = (spent / b.data.limit) * 100;
  return `<div class="budget-progress"><div class="progress-heading"><strong>${esc(categoryTitle(c, b.data.category))}</strong>${pct(percent)}</div><div class="progress-track"><div class="progress-fill ${percent > 100 ? "over" : ""}" style="width:${Math.min(percent, 100)}%"></div></div><div class="progress-detail"><span>${number(spent, 0, c)}</span><span>${number(b.data.limit, 0, c)} ${t("toman")}</span></div></div>`;
}
function dueBanner(c) {
  const list = kind(c, "installment")
    .filter(
      (r) => !r.data.paid && dueDays(r.data.dueDate) <= r.data.reminderDays,
    )
    .sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate));
  return list.length
    ? `<a class="due-callout" href="#installments"><span class="due-icon">${icon("bell")}</span><span><strong>${isRtl() ? `${money(list.length)} قسط نیاز به بررسی دارد` : `${money(list.length)} installments to review`}</strong><small><bdi dir="auto">${dataText(c, list[0].data.title)}</bdi> · ${dueText(dueDays(list[0].data.dueDate))}</small></span>${icon("arrow", "directional")}</a>`
    : "";
}
function overview(c) {
  const total = totals(monthly(c)),
    balanceTotal = kind(c, "account").reduce(
      (s, a) => s + balance(a, txs(c)),
      0,
    ),
    budget = visibleBudgets(c.records, c.month);
  return `${pageHeading(c, "Overview", "transaction")}${attentionCard(c)}${dueBanner(c)}<div class="stats-grid">${amountCard("Total balance", balanceTotal, "featured", countText(kind(c, "account").length, "Accounts"), c)}${amountCard("Income", total.income, "", t("This month"), c)}${amountCard("Spending", total.expense, "", t("This month"), c)}</div>${pinnedPanel(c)}${marketStrip(c)}<div class="content-grid">${panel("Cash flow", cashChart(c))}${panel("Spending breakdown", donut(c))}</div><div class="content-grid">${panel("Recent transactions", movementList(c, monthly(c).slice(0, 4)), arrowLink("View all", "transactions"))}${panel(
    "Budgets",
    budget.length
      ? budget
          .slice(0, 3)
          .map((b) => progress(c, b))
          .join("")
      : empty("No budgets", "budget"),
    arrowLink("Manage", "budgets"),
  )}</div>`;
}
function transactions(c) {
  const filters = c.transactionFilters || {};
  const list = filterTransactions(c.records, filters, r => `${r.data.note || ""} ${categoryTitle(c, r.data.category)} ${accountName(c, r.data.accountId)}`);
  const groups = [...new Set([...categoryList(c.records,categories).map(category=>category.id), ...kind(c,"transaction").map(record=>record.data.category).filter(Boolean)])];
  const amount = (label,name) => `<label class="field">${t(label)}<input name="${name}" inputmode="decimal" value="${esc(filters[name] || "")}" dir="ltr" placeholder="${t("No limit")}"></label>`;
  const sortOptions = [["date-desc", "Newest first"], ["date-asc", "Oldest first"], ["amount-desc", "Highest amount"], ["amount-asc", "Lowest amount"]];
  const activeCount = Object.entries(filters).filter(([key,value])=>key!=="sort" && value).length;
  return `${pageHeading(c, "Transactions", "transaction")}<div class="transaction-tools"><button type="button" class="secondary" data-action="transaction-filters-toggle" aria-expanded="${!!c.transactionFiltersOpen}" aria-controls="transaction-filters">${icon("filter")}${t("Filters")}${activeCount ? `<span class="badge">${money(activeCount)}</span>` : ""}</button><label class="transaction-sort"><span>${t("Sort by")}</span><select id="transaction-sort" aria-label="${t("Sort by")}">${sortOptions.map(([value,label])=>`<option value="${value}" ${(filters.sort || "date-desc")===value?"selected":""}>${t(label)}</option>`).join("")}</select></label>${actionButton("csv", "Export CSV")}</div><form id="transaction-filters" class="transaction-filters" ${c.transactionFiltersOpen ? "" : "hidden"}><label class="field">${t("Search transactions")}<input name="search" type="search" value="${esc(filters.search || "")}"></label><label class="field">${t("Group")}<select name="group"><option value="">${t("All groups")}</option>${groups.map(group=>`<option value="${esc(group)}" ${filters.group===group?"selected":""}>${esc(categoryTitle(c,group))}</option>`).join("")}<option value="__uncategorized" ${filters.group==="__uncategorized"?"selected":""}>${t("Uncategorized")}</option></select></label><label class="field">${t("Type")}<select name="type"><option value="">${t("All types")}</option>${["expense","income","transfer"].map(type=>`<option value="${type}" ${filters.type===type?"selected":""}>${t({expense:"Expense",income:"Income",transfer:"Transfer"}[type])}</option>`).join("")}</select></label>${amount("Minimum amount", "minAmount")}${amount("Maximum amount", "maxAmount")}${dateControl("From date","dateFrom",filters.dateFrom || "")}${dateControl("To date","dateTo",filters.dateTo || "")}<div class="transaction-filter-actions"><button type="submit" class="primary">${t("Apply filters")}</button><button type="reset" class="secondary">${t("Clear filters")}</button></div><p class="transaction-filter-error" role="alert"></p></form>${panel("Transactions", list.length ? transactionBoard(c,list,{icon,categoryTitle,accountName,dataText}) : empty("No transactions","transaction"), `<span class="badge">${money(list.length)}</span>`)}`;
}

function accounts(c) {
  return `${pageHeading(c, "Accounts", "account")}<div class="account-cards-grid">${kind(
    c,
    "account",
  )
    .map(
      (a) =>
        `<article class="account-bank-card ${["teal", "blue", "purple", "orange"].includes(a.data.color) ? a.data.color : "teal"}">
          <header class="account-card-heading"><h2 dir="auto">${dataText(c, a.data.name)}</h2><div class="row-actions"><button type="button" class="icon-button" data-action="edit" data-id="${esc(a.id)}" aria-label="${t("Edit")}" title="${t("Edit")}">${icon("edit")}</button><button type="button" class="icon-button" data-action="delete" data-id="${esc(a.id)}" aria-label="${t("Delete")}" title="${t("Delete")}">${icon("trash")}</button></div></header>
          <div class="account-card-markings" aria-hidden="true"><svg class="account-card-chip" viewBox="0 0 48 36"><rect x="1" y="1" width="46" height="34" rx="7"/><path d="M17 1v10L10 18l7 7v10M31 1v10l7 7-7 7v10M1 12h13m-13 12h13m20-12h13M34 24h13M17 11h14v14H17z"/></svg><svg class="account-card-contactless" viewBox="0 0 24 24"><path d="M8 9a5 5 0 0 1 0 6m4-9a10 10 0 0 1 0 12m4-15a15 15 0 0 1 0 18"/></svg><span class="account-card-brand" dir="ltr">DameDast</span></div>
          <bdi class="account-card-number" dir="ltr" aria-label="${t(formatCardNumber(a.data.cardNumber) ? "Card number" : "No card number")}">${formatCardNumber(a.data.cardNumber) || "•••• •••• •••• ••••"}</bdi>
          <div class="account-card-balance"><span>${t("Balance")}</span><div class="amount">${number(balance(a, txs(c)), 0, c)}${unit()}</div></div>
          <footer class="account-card-footer"><div class="account-card-opening"><span>${t("Opening balance")}</span>${number(a.data.openingBalance, 0, c)}</div>${actionButton("transfer", "Transfer", "", "text-button")}</footer>
        </article>`,
    )
    .join(
      "",
    )}<button class="add-card" data-action="add" data-kind="account">${icon("plus")}${t("New account")}</button></div><details class="help"><summary>${t("Help")}</summary><p>${t("Transfers do not count as spending.")}</p></details>`;
}
function budgets(c) {
  const list = visibleBudgets(c.records, c.month);
  return `${pageHeading(c, "Budgets", "budget")}<div class="cards-grid compact-finance-grid">${list.map((b) => `<article class="panel">${progress(c, b)}<div class="card-foot"><span>${t("Month")} ${esc(b.data.calendar === "persian" ? monthText(b.data.month) : solarText(budgetBounds(b.data).start) + " – " + solarText(new Date(Date.parse(budgetBounds(b.data).end + "T12:00:00Z") - 86400000).toISOString().slice(0, 10)))}</span><div class="row-actions"><button class="icon-button" data-action="edit" data-id="${b.id}" aria-label="${t("Edit")}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-id="${b.id}" aria-label="${t("Delete")}">${icon("trash")}</button></div></div></article>`).join("")}${!list.length ? empty("No budgets", "budget") : ""}</div><p class="small-note">${t("Solar Hijri calendar")}</p>`;
}
function goals(c, embedded = false) {
  return `${embedded ? "" : pageHeading(c, "Savings goals", "goal")}<div class="cards-grid compact-finance-grid">${kind(
    c,
    "goal",
  )
    .map(
      (g) =>
        `<article class="panel goal-card"><div class="card-heading"><span class="feature-icon">${icon("goals")}</span><span class="badge">${pct((g.data.saved / g.data.target) * 100)}</span><button type="button" class="text-button" data-action="organizer-pin" data-id="${g.id}">${t(g.data.pinned ? "Unpin" : "Pin")}</button></div><h2 dir="auto">${dataText(c, g.data.name)}</h2><div class="amount">${number(g.data.saved)}${unit()}</div><div class="progress-track"><div class="progress-fill" style="width:${Math.min((g.data.saved / g.data.target) * 100, 100)}%"></div></div><div class="progress-detail"><span>${t("Target amount (toman)")}</span>${number(g.data.target)}</div><div class="card-foot"><span>${g.data.deadline ? dateText(g.data.deadline, true) : ""}</span><div class="row-actions"><button class="icon-button" data-action="edit" data-id="${g.id}" aria-label="${t("Edit")}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-id="${g.id}" aria-label="${t("Delete")}">${icon("trash")}</button></div></div></article>`,
    )
    .join(
      "",
    )}<button class="add-card" data-action="add" data-kind="goal">${icon("plus")}${t("New goal")}</button></div>${totalsHelp()}`;
}
function installments(c) {
  const list = kind(c, "installment").sort((a, b) =>
      a.data.dueDate.localeCompare(b.data.dueDate),
    ),
    unpaid = list.filter((r) => !r.data.paid),
    sum = (items) => items.reduce((s, r) => s + r.data.amount, 0);
  return `${pageHeading(c, "Installments", "installment")}<div class="stats-grid">${amountCard("Total remaining", sum(unpaid), "featured")}${amountCard("Due this month", sum(unpaid.filter((r) => inMonth(r.data.dueDate, c.month))))}${amountCard("Overdue", sum(unpaid.filter((r) => dueDays(r.data.dueDate) < 0)))}</div><div class="toolbar">${actionButton("push", "Enable reminders", `aria-label="${t("Enable reminders")}"`)}</div>${panel("Payment calendar", list.length ? `<div class="installment-list">${list.map((r) => `<article class="installment-row ${r.data.paid ? "paid" : ""}"><span class="category-icon ${r.data.paid ? "income" : ""}">${icon(r.data.paid ? "check" : "installments")}</span><div class="installment-description"><strong dir="auto">${dataText(c, r.data.title)}</strong><small>${dateText(r.data.dueDate, true)} <span class="separator">·</span><span class="${!r.data.paid && dueDays(r.data.dueDate) < 0 ? "negative" : ""}">${r.data.paid ? t("Paid") : dueText(dueDays(r.data.dueDate))}</span></small></div><div class="movement-amount">${number(r.data.amount)}<small>${t("toman")}</small></div><div class="row-actions">${actionButton("paid", r.data.paid ? "Mark unpaid" : "Mark paid", `data-id="${r.id}"`, "small-button")}<button class="icon-button" data-action="edit" data-id="${r.id}" aria-label="${t("Edit")}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-id="${r.id}" aria-label="${t("Delete")}">${icon("trash")}</button></div></article>`).join("")}</div>` : empty("No installments", "installment"))}<p class="small-note">${t("Recording a payment creates an expense in the selected account. Reversing it removes that expense.")}</p>`;
}
function receivables(c) {
  const list = kind(c, "receivable"),
    sum = list.reduce((s, r) => s + r.data.amount, 0),
    returned = list.reduce((s, r) => s + r.data.returned, 0);
  return `${pageHeading(c, "Money lent", "receivable")}<div class="stats-grid">${amountCard("Still to receive", sum - returned, "featured")}${amountCard("Total lent", sum)}${amountCard("Returned", returned)}</div><div class="cards-grid">${list.map((r) => `<article class="panel"><div class="card-heading"><span class="avatar">${dataText(c, r.data.person.slice(0, 1))}</span><span class="badge">${r.data.amount === r.data.returned ? t("Settled") : r.data.dueDate ? dueText(dueDays(r.data.dueDate)) : t("No due date")}</span></div><h2 dir="auto">${dataText(c, r.data.person)}</h2><div class="amount">${number(r.data.amount - r.data.returned)}${unit()}</div><div class="progress-track"><div class="progress-fill" style="width:${(r.data.returned / r.data.amount) * 100}%"></div></div><div class="progress-detail"><span>${t("Returned")} ${number(r.data.returned)}</span><span>${number(r.data.amount)}</span></div><div class="card-foot">${actionButton("edit", "Record repayment", `data-id="${r.id}"`, "text-button")}<button class="icon-button" data-action="delete" data-id="${r.id}" aria-label="${t("Delete")}">${icon("trash")}</button></div></article>`).join("")}<button class="add-card" data-action="add" data-kind="receivable">${icon("plus")}${t("New loan")}</button></div>${totalsHelp()}`;
}
function locked(c) {
  const list = kind(c, "locked");
  return `${pageHeading(c, "Locked assets", "locked")}<div class="stats-grid">${amountCard(
    "Total locked",
    list.reduce((s, r) => s + r.data.amount, 0),
    "featured",
  )}${amountCard(
    "Releasing in 30 days",
    list
      .filter(
        (r) =>
          r.data.releaseDate &&
          dueDays(r.data.releaseDate) >= 0 &&
          dueDays(r.data.releaseDate) <= 30,
      )
      .reduce((s, r) => s + r.data.amount, 0),
  )}${amountCard(
    "Release date reached",
    list
      .filter((r) => r.data.releaseDate && dueDays(r.data.releaseDate) < 0)
      .reduce((s, r) => s + r.data.amount, 0),
  )}</div><div class="cards-grid">${list.map((r) => `<article class="wallet purple"><div class="card-heading">${icon("locked")}<button class="icon-button" data-action="edit" data-id="${r.id}" aria-label="${t("Edit")}">${icon("edit")}</button></div><h2 dir="auto">${dataText(c, r.data.name)}</h2><div class="amount">${number(r.data.amount)}${unit()}</div><div class="card-foot"><span>${r.data.releaseDate ? dateText(r.data.releaseDate, true) : t("No release date")}</span>${actionButton("release", "Mark released", `data-id="${r.id}"`, "text-button")}</div></article>`).join("")}<button class="add-card" data-action="add" data-kind="locked">${icon("plus")}${t("New locked asset")}</button></div>${totalsHelp()}`;
}
function totalsHelp() {
  return `<details class="help"><summary>${t("About totals")}</summary><p>${t("Trackers do not change account balances.")}</p></details>`;
}
function quoteTime(value) {
  const at = new Date(value),
    old = Date.now() - at.getTime() > 86400000;
  return new Intl.DateTimeFormat(locale(), {
    ...(old
      ? { month: "short", day: "numeric" }
      : { hour: "2-digit", minute: "2-digit", hour12: false }),
    timeZone: "Asia/Tehran",
  }).format(at);
}
const marketGroups = [
  ["crypto", "Crypto"],
  ["metals", "Metals"],
  ["fx", "Currencies"],
  ["funds", "Funds"],
  ["stocks", "Stocks"],
];
const marketName = (i) => (getLanguage() === "fa" ? i.nameFa : i.name);
function quoteCards(c, compact = false, list = null) {
  const items =
    list ||
    instruments
      .filter((i) => ["GOLD", "USD", "SILVER", "BTC"].includes(i.symbol))
      .sort(
        (a, b) =>
          ["GOLD", "USD", "SILVER", "BTC"].indexOf(a.symbol) -
          ["GOLD", "USD", "SILVER", "BTC"].indexOf(b.symbol),
      );
  return `<div class="${compact ? "market-strip-grid" : "market-cards expanded-market-cards"}">${items
    .map((i) => {
      const q = c.marketData?.quotes?.find((q) => q.symbol === i.symbol),
        delayed =
          q &&
          (Date.now() - Date.parse(q.asOf) > 7200000 ||
            c.marketData?.issues?.[i.symbol]);
      return `<button type="button" class="market-card ${!compact && c.marketSymbol === i.symbol ? "selected" : ""}" data-action="${compact ? "market-open" : "market-symbol"}" data-symbol="${i.symbol}" aria-label="${esc(marketName(i))}" ${!compact ? `aria-pressed="${c.marketSymbol === i.symbol}"` : ""}><div class="quote-heading"><span class="market-token token-${i.symbol}" aria-hidden="true">${esc(i.glyph)}</span><strong dir="auto">${esc(marketName(i))}</strong>${q && q.changePercent !== null && q.priceKind !== "nav" ? `<bdi class="quote-change ${q.changePercent < 0 ? "negative" : "positive"}" dir="ltr">${q.changePercent > 0 ? "+" : ""}${localizedNumber(q.changePercent, 2)}${isRtl() ? "٪" : "%"}</bdi>` : ""}</div><div class="quote-value">${q ? number(q.price, i.priceKind === "close" || i.priceKind === "nav" ? 1 : i.unit.startsWith("USD") ? (q.price < 1 ? 6 : q.price < 10 ? 4 : 2) : 0, c) : `<span class="skeleton-value">${c.marketLoading ? "···" : "—"}</span>`}</div><div class="quote-foot"><span>${t(i.unit)}</span>${q ? `<time datetime="${q.asOf}">${quoteTime(q.asOf)}</time>` : ""}</div>${compact ? "" : `<div class="quote-source"><span>${t(i.priceKind === "nav" ? "Redemption NAV" : i.priceKind === "close" ? "Closing price" : delayed ? "Delayed" : "Spot price")}</span><small class="${q ? (delayed ? "delayed" : "") : "negative"}">${q ? (delayed ? t("Last known") : q.source) : t(i.priceKind === "nav" ? "NAV unavailable" : "Unavailable")}</small></div>`}</button>`;
    })
    .join("")}</div>`;
}
export function marketStrip(c) {
  const core = (c.marketData?.quotes || []).filter((q) =>
      ["GOLD", "USD", "SILVER", "BTC"].includes(q.symbol),
    ),
    delayed = core.some((q) => Date.now() - Date.parse(q.asOf) > 7200000);
  return `<section class="market-strip" aria-label="${t("Today’s market")}"><div class="section-heading"><h2>${t("Today’s market")}</h2><div class="section-actions"><span class="feed-state ${delayed ? "delayed" : ""}"><i></i>${t(c.marketLoading ? "Loading" : core.length ? (delayed ? "Delayed" : "Live") : "Unavailable")}</span>${arrowLink("View all", "market")}</div></div>${quoteCards(c, true)}</section>`;
}
function market(c) {
  const selected =
      instruments.find((i) => i.symbol === c.marketSymbol) || instruments[0],
    query = (c.marketSearch || "")
      .toLowerCase()
      .replaceAll("ي", "ی")
      .replaceAll("ك", "ک");
  const filtered = instruments.filter(
    (i) =>
      (c.marketCategory === "all" ||
        !c.marketCategory ||
        i.category === c.marketCategory) &&
      `${i.symbol} ${i.name} ${i.nameFa}`
        .toLowerCase()
        .replaceAll("ي", "ی")
        .replaceAll("ك", "ک")
        .includes(query),
  );
  const count = (c.marketData?.quotes || []).length;
  return `<div class="page-heading"><div><h1>${t("Market")}</h1><p class="small-note">${localizedNumber(count)} / ${localizedNumber(instruments.length)} ${t("Quoted instruments")}</p></div><button type="button" class="secondary market-refresh" data-action="market-refresh" ${c.marketLoading ? "disabled" : ""}>${icon("refresh", c.marketLoading ? "is-spinning" : "")}${t(c.marketLoading ? "Loading" : "Refresh")}</button></div><div class="market-explorer-tools"><input id="market-search" type="search" value="${esc(c.marketSearch || "")}" placeholder="${t("Search symbols, funds or currencies")}" aria-label="${t("Search market")}"><nav class="market-categories" aria-label="${t("Market categories")}">${[["all", "All"], ...marketGroups].map(([key, label]) => `<button type="button" data-action="market-category" data-category="${key}" class="${(c.marketCategory || "all") === key ? "active" : ""}" aria-pressed="${(c.marketCategory || "all") === key}">${t(label)}</button>`).join("")}</nav></div><section class="panel market-focus"><div class="market-chart-heading"><div><span class="eyebrow">${esc(selected.symbol)} · ${t(selected.unit)}</span><h2>${esc(marketName(selected))}</h2></div><div class="segment-control">${[
    [1, "Daily"],
    [7, "Weekly"],
    [30, "Monthly"],
  ]
    .map(
      ([d, label]) =>
        `<button type="button" data-action="market-period" data-days="${d}" class="${d === c.marketPeriod ? "active" : ""}" aria-pressed="${d === c.marketPeriod}">${t(label)}</button>`,
    )
    .join(
      "",
    )}</div></div>${priceChart(c)}<div class="market-meta"><span>${t(selected.priceKind === "nav" ? "Redemption NAV" : selected.priceKind === "close" ? "Closing price" : "Price history")}</span><a href="${esc(selected.sourceUrl)}" target="_blank" rel="noopener" class="text-link">${t("Source")} ↗</a></div></section>${
    marketGroups
      .map(([key, label]) => {
        const list = filtered.filter((i) => i.category === key);
        return list.length
          ? `<section class="market-group"><div class="section-heading"><h2>${t(label)}</h2><span class="badge">${localizedNumber(list.length)}</span></div>${quoteCards(c, false, list)}</section>`
          : "";
      })
      .join("") ||
    `<section class="panel empty">${t("No matching instruments.")}</section>`
  }<p class="small-note">${t("Each instrument shows its own source, unit and update time. Unavailable prices are never estimated.")}</p>`;
}
function priceChart(c) {
  if (c.marketHistoryLoading) return empty("Loading");
  const points = c.marketHistory || [];
  if (points.length < 2)
    return empty(
      c.marketPeriod === 1 ? "Collecting intraday quotes" : "No history yet",
    );
  const min = Math.min(...points.map((p) => p.price)),
    max = Math.max(...points.map((p) => p.price)),
    range = max - min || 1,
    width = 900,
    height = 240,
    first = points[0].timestamp,
    last = points.at(-1).timestamp;
  const positions = points.map(
      (p, i) =>
        `${20 + (last === first ? i / (points.length - 1) : (p.timestamp - first) / (last - first)) * 860},${220 - ((p.price - min) / range) * 200}`,
    ),
    line = positions.join(" ");
  return `<div class="price-chart" dir="ltr"><div class="price-axis"><span>${number(max, 2)}</span><span>${number((max + min) / 2, 2)}</span><span>${number(min, 2)}</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("Price history")}"><defs><linearGradient id="market-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".24"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path d="M20 20H880M20 120H880M20 220H880" stroke="var(--border)" stroke-width="1"/><polygon points="20,240 ${line} 880,240" fill="url(#market-fill)" stroke="none"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="price-dates"><span>${new Date(first * 1000).toLocaleDateString(locale(), { month: "short", day: "numeric" })}</span><span>${new Date(last * 1000).toLocaleDateString(locale(), { month: "short", day: "numeric" })}</span></div></div>`;
}
function reports(c) {
  const result = totals(monthly(c));
  return `${pageHeading(c, "Reports")}<div class="report-summary">${amountCard("Income", result.income)}${amountCard("Spending", result.expense)}${amountCard("Net cash flow", result.income - result.expense, "featured")}</div><div class="report-period"><span>${t(c.flowPeriod === "daily" ? "Last 7 days" : c.flowPeriod === "weekly" ? "Last 7 weeks" : "Last 6 months")}</span><div class="segment-control">${["daily", "weekly", "monthly"].map((period) => `<button data-action="flow-period" data-period="${period}" class="${c.flowPeriod === period ? "active" : ""}">${t(period[0].toUpperCase() + period.slice(1))}</button>`).join("")}</div></div><div class="content-grid">${panel("Cash flow", cashChart(c))}${panel("Spending breakdown", donut(c))}</div>${panel(
    "Spending",
    categoryTotals(c).length
      ? categoryTotals(c)
          .map(
            (r, i) =>
              `<div class="category-report"><span>${esc(categoryTitle(c, r.category))}</span><div class="progress-track"><div class="progress-fill" style="width:${(r.amount / Math.max(1, result.expense)) * 100}%;background:${palette[i % palette.length]}"></div></div>${number(r.amount)}</div>`,
          )
          .join("")
      : empty("No expenses"),
    actionButton("csv", "Export CSV", "", "text-button"),
  )}`;
}
function settings(c){return settingsPage(c,{icon,actionButton,pageHeading});}

export function pickerCaption(type, value) {
  return value
    ? type === "month"
      ? monthText(value)
      : solarText(value)
    : t("Choose a date.");
}
export function field(label, name, value = "", type = "text", attributes = "") {
  if (type === "date")
    return dateControl(
      label.replace(" (Gregorian)", ""),
      name,
      value,
      attributes.includes("required"),
    );
  if (type === "month")
    return `<label class="field">${t(label)}${monthControl(value, name)}</label>`;
  return `<label class="field">${t(label)}<input name="${name}" type="${type === "number" ? "text" : type}" value="${esc(value)}" ${attributes} ${type === "number" ? 'inputmode="numeric" dir="ltr"' : ""}></label>`;
}
export function selectField(label, name, list, value, translateLabels = true) {
  return `<label class="field">${t(label)}<select name="${name}" required>${list.map(([id, text]) => `<option value="${esc(id)}" ${id === value ? "selected" : ""}>${esc(translateLabels ? t(text) : text)}</option>`).join("")}</select></label>`;
}
export function editorFields(
  kindName,
  data,
  accountsList,
  movementType,
  editing,
  month,
  categoryOptions = categoryList([], categories).map((r) => [r.id, t(r.name)]),
) {
  const d = data || {},
    moneyField = (label, name, value) =>
      field(
        label,
        name,
        value,
        "text",
        'inputmode="numeric" required autocomplete="off" class="money-input"',
      ),
    note = () =>
      field("Note (optional)", "note", d.note || "", "text", 'maxlength="200"'),
    dateAttrs = 'min="2000-01-01" max="2100-12-31"';
  const productivityExtra = productivityFields(kindName, d);
  if (productivityExtra !== null) return productivityExtra;
  if (kindName === "assetPosition") return assetEditorFields(d);
  const organizerExtra = organizerEditorFields(kindName, d);
  if (organizerExtra !== null) return organizerExtra;
  const extra = planningEditorFields(
    kindName,
    d,
    month,
    accountsList,
    categoryOptions,
  );
  if (extra !== null) return extra;
  if (kindName === "account")
    return (
      field(
        "Account name",
        "name",
        d.name || "",
        "text",
        'required maxlength="50"',
      ) +
      field(
        "Card number (optional)",
        "cardNumber",
        formatCardNumber(d.cardNumber),
        "tel",
        'inputmode="numeric" dir="ltr" maxlength="23" autocomplete="off" placeholder="0000 0000 0000 0000"',
      ) +
      moneyField(
        "Opening balance (toman)",
        "openingBalance",
        d.openingBalance ?? 0,
      ) +
      selectField(
        "Account color",
        "color",
        [
          ["teal", "Sage"],
          ["blue", "Blue"],
          ["purple", "Lavender"],
          ["orange", "Sand"],
        ],
        d.color || "teal",
      )
    );
  if (kindName === "transaction")
    return (
      `<div class="type-switch">${[
        ["expense", "Expense"],
        ["income", "Income"],
        ["transfer", "Transfer"],
      ]
        .map(
          ([value, label]) =>
            `<button type="button" data-movement-type="${value}" class="${value === movementType ? "selected" : ""}">${t(label)}</button>`,
        )
        .join("")}</div>` +
      moneyField("Amount (toman)", "amount", d.amount || "") +
      `<div class="field-grid">${selectField("From account", "accountId", accountsList, d.accountId || accountsList[0]?.[0], false)}${selectField("To account", "destinationId", accountsList, d.destinationId || accountsList[1]?.[0] || accountsList[0]?.[0], false)}</div><div class="transaction-details">${selectField(
        "Category",
        "category",
        categoryOptions,
        d.category || (movementType === "income" ? "Salary" : "Food & drinks"),
      )}${field("Date", "date", d.date || today(), "date", "required " + dateAttrs)}</div>` +
      note()
    );
  if (kindName === "budget")
    return (
      (d.month && d.calendar !== "persian"
        ? `<p class="small-note">${t("Saving converts this budget to the selected Persian month.")}</p>`
        : "") +
      selectField(
        "Category",
        "category",
        categoryOptions,
        d.category || "Food & drinks",
      ) +
      moneyField("Limit (toman)", "limit", d.limit || "") +
      field(
        "Budget month",
        "month",
        d.calendar === "persian"
          ? d.month
          : d.month
            ? monthOf(d.month + "-01")
            : month,
        "month",
        "required",
      )
    );
  if (kindName === "goal")
    return (
      field(
        "Goal name",
        "name",
        d.name || "",
        "text",
        'required maxlength="60"',
      ) +
      moneyField("Target amount (toman)", "target", d.target || "") +
      moneyField("Saved so far (toman)", "saved", d.saved ?? 0) +
      field(
        "Target date (optional)",
        "deadline",
        d.deadline || "",
        "date",
        dateAttrs,
      ) +
      `<label class="checkbox-field"><input name="pinned" type="checkbox" ${d.pinned ? "checked" : ""}>${t("Pin to dashboard")}</label>`
    );
  if (kindName === "installment")
    return (
      field(
        "Title",
        "title",
        d.title || "",
        "text",
        'required maxlength="80"',
      ) +
      moneyField("Installment amount (toman)", "amount", d.amount || "") +
      field(
        "First due date",
        "dueDate",
        d.dueDate || today(),
        "date",
        "required " + dateAttrs,
      ) +
      `<div class="field-grid">${field("Remind days before", "reminderDays", d.reminderDays ?? 3, "number", 'required min="0" max="30"')}${!editing ? field("Monthly installments", "count", 1, "number", 'required min="1" max="100"') : ""}</div>`
    );
  if (kindName === "receivable")
    return (
      field(
        "Who borrowed it?",
        "person",
        d.person || "",
        "text",
        'required maxlength="80"',
      ) +
      moneyField("Amount lent (toman)", "amount", d.amount || "") +
      moneyField("Returned so far (toman)", "returned", d.returned ?? 0) +
      `<div class="field-grid">${field("Lent on", "lentOn", d.lentOn || today(), "date", "required " + dateAttrs)}${field("Due date (optional)", "dueDate", d.dueDate || "", "date", dateAttrs)}</div>` +
      note()
    );
  if (kindName === "locked")
    return (
      field(
        "Asset name",
        "name",
        d.name || "",
        "text",
        'required maxlength="80"',
      ) +
      moneyField("Locked amount (toman)", "amount", d.amount || "") +
      field(
        "Release date (optional)",
        "releaseDate",
        d.releaseDate || "",
        "date",
        dateAttrs,
      ) +
      note()
    );
  return "";
}
