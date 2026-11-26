import { validateExercise } from "./exercise.js";
import { ExerciseClock } from "./exercise-clock.js";
import { developmentKind, validateDevelopment } from "./development.js";
import { isTheme } from "./themes.js";
import { developmentArea, developmentFields, toggleDevelopmentFields } from "./development-ui.js";
import { prepareDevelopmentResources } from "./development-resources.js";
import { dailyVocabulary } from "./language-model.js";
import { LanguageController } from "./language-controller.js";
import { languagePages, validateLanguage } from "./language-model.js";
import {synchronizePageToolbar} from "./page-toolbar.js";
import {saveNoteSettings} from "./keep-preferences.js";
import {validateNote,checkLabelName} from "./keep-model.js";
import { validateProductivity, projectKinds, habitLogId } from "./productivity.js";
import { projectField, searchResults, recordLabel } from "./productivity-ui.js";
import { extensionClips, acknowledgeClip } from "./clip-inbox.js";
import { accountSpace, setAccountScope, scopedStorageKey, accountHeaders, initialSpace, canOpenSpace } from "./account-scope.js";
import { parseCardNumber } from "./account-card-number.js";
import { ProfileMenu } from "./profile-menu.js";
import { filterTransactions, normalizeTransactionFilters } from "./transaction-board.js";
import { migrateLegacyPreferences } from "./legacy-storage.js";
import { readPins, togglePin, savePins } from "./nav-pins.js";
import "./select-sheet.js";
import "./date-picker.js";
import { isDrawingNote, toggleTask } from "./notebook.js";
import { NotePageController, isNoteRoute } from "./keep-notes.js";
import { DeskToolController } from "./desk-tool-controller.js";
import { PlannerController } from "./planner-controller.js";
import { validateCalendarEntry, shiftDay } from "./planner.js";
import { preferences, savePreferences } from "./preferences.js";
import {
  createBackup,
  readBackupFile,
  restoreBackup,
  rememberRestoredWorkspace,
  restoredWorkspaces,
} from "./backup.js";
import { WorkbenchController } from "./workbench-controller.js";
import { CreateMenuController, createLauncher } from "./create-menu.js";
import { deskFloatingActions } from "./desk-home-ui.js";
import { WORKBENCH_ID, validateWorkbench, shortcutColors } from "./workbench.js";
import { validateDrawing } from "./drawing.js";
import {
  assetEntries,
  validatePosition,
  normalizeDecimal,
  decimalUnits,
  decimalText,
  marketValueCents,
} from "./assets.js";
import { assetLotRow } from "./assets-ui.js";
import {
  installNumericFormatting,
  formatNumericFields,
  plainNumeric,
  groupedNumeric,
} from "./number-inputs.js";
import { fromJalali, validIso } from "./calendar.js";
import { instruments as marketInstruments } from "./market-catalog.js";
import { navigationGroups, navigationColor, plannerPages, resolveLearningRoute } from "./navigation.js";
import {
  organizerReport,
  notificationKey,
  parseTimes,
  validateReminder,
} from "./organizer.js";
import {
  organizerTab,
  notificationsMarkup,
} from "./organizer-ui.js";
import {
  dateControl,
  monthOf,
  shiftMonth,
  inMonth,
  validMonth,
  updateCalendarControl,
  solarNumeric,
  dateInMonth,
} from "./calendar.js";
import {
  categoryList,
  categoryInfo,
  validatePlan,
  recurringForMonth,
  categoryColors,
} from "./planning.js";
import { planEditorRow } from "./planning-ui.js";
import { parseBenchmarkCsv } from "./backtest.js";
import { syncBatch } from "./connected-store.js";
import { loadSpace, saveSpace } from "./store.js";
import { ConnectedStore } from "./connected-store.js";
import { demoPortfolio } from "./connected-ui.js";
import {
  BUNDLE,
  normalizeBundle,
  PROVIDERS,
} from "./extension/shared/portfolio.js";
import {
  categories,
  today,
  money,
  addMonths,
  escapeHtml as esc,
  materialize,
  makeDemo,
  DEMO_VERSION,
} from "./finance.js";
import {
  t,
  message,
  isRtl,
  locale,
  localizedNumber,
  getLanguage,
  getTheme,
  setLanguage,
  setTheme,
  applyPreferences,
  effectiveTheme,
} from "./i18n.js";
import {
  sections,
  icon,
  renderPage,
  editorFields,
  addLabel,
  pickerCaption,
} from "./ui.js";

migrateLegacyPreferences();
const $ = (selector) => document.querySelector(selector);
const profileMenu = new ProfileMenu($("#profile-button"), $("#profile-menu"));
let connectedFilter = "all";
let dashboardAmountsVisible = false;
let assetKey = "",
  assetPeriod = 30,
  assetCurves = {},
  assetHistoryLoading = false,
  assetGeneration = 0;
let developmentDate = today();
let learningCategory = "all";
let developmentEditorSpace = null;
let projectId = null;
let clipInbox = [];
const connected = new ConnectedStore(() => {
  if (ready && ["connected", "workbench"].includes(page)) render();
});
let session = { authenticated: false, googleConfigured: false, demoEnabled: true },
  space = "guest",
  state,
  page = "overview";
let selectedMonth = monthOf(today()),
  filter = "",
  typeFilter = "",
  flowPeriod = "monthly";
let transactionFilters = {};
let transactionFiltersOpen = false;
let notificationFilter = "unread";
let refreshInProgress = false;
let notificationsHtml = "";
let editorPreset = null;
let marketCategory = "all",
  marketSearch = "",
  serverClockSkew = 0;
const navGroupsOpen = {};
const pinnablePages = navigationGroups.flatMap(group => group.items);
let navPins = readPins(pinnablePages);
let notesView = "grid";
try { if (localStorage.getItem(scopedStorageKey("damedast-notes-view")) === "list") notesView = "list"; } catch {}
const settingsGroupsOpen = {};
let themeDraft = null;
const noteLayout = new ResizeObserver(entries => {
  for (const { target } of entries) {
    const gap = parseFloat(getComputedStyle(target).marginBottom) || 0;
    const span = `span ${Math.ceil(target.getBoundingClientRect().height + gap)}`;
    if (target.style.gridRowEnd !== span) target.style.gridRowEnd = span;
  }
});

let benchmarkData = null,
  benchmarkLoading = false,
  lastBenchmarkRead = 0,
  benchmarkError = "",
  benchmarkCap = 40,
  benchmarkFundMin = 20;
let editing = null,
  editorKind,
  movementType = "expense",
  installPrompt,
  syncPromise,
  ready = false;
let marketData = null,
  marketHistory = [],
  marketSymbol = "GOLD",
  marketPeriod = 7,
  marketLoading = false,
  marketHistoryLoading = false,
  lastMarketRead = 0,
  marketError = "",
  historyGeneration = 0;
const channel =
  "BroadcastChannel" in window ? new BroadcastChannel("damedast") : null;
const emptyState = () => ({
  snapshot: { revision: 0, records: [] },
  pending: [],
});
const withLock = (callback) =>
  navigator.locks
    ? navigator.locks.request(`damedast:${space}`, callback)
    : callback();
const records = () => materialize(state).filter((r) => !r.deleted);
const ofKind = (kind) => records().filter((r) => r.kind === kind);
const categoryOptions = () =>
  categoryList(records(), categories).map((c) => [
    c.id,
    c.builtin ? t(c.name) : c.name,
  ]);
const numInput = (value) =>
  String(value ?? "")
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[,٬\s]/g, "")
    .replace(/٫/g, ".");
const context = () => ({
  developmentDate,
  learningCategory,
  projectId,
  amountsVisible: dashboardAmountsVisible,
  settingsGroupsOpen,
  themeDraft,
  notesView,
  workbenchEditing: desk.editing,
  planner: planner.state,
  assetKey,
  assetPeriod,
  assetCurves,
  assetHistoryLoading,
  page,
  now: new Date(Date.now() + serverClockSkew).toISOString(),
  marketCategory,
  marketSearch,
  records: records(),
  space,
  session,
  month: selectedMonth,
  filter,
  typeFilter,
  transactionFilters,
  transactionFiltersOpen,
  notificationFilter,
  refreshInProgress,
  flowPeriod,
  pendingCount: state.pending.length,
  marketData,
  marketHistory,
  marketSymbol,
  marketPeriod,
  marketLoading,
  marketHistoryLoading,
  benchmarkData,
  benchmarkLoading,
  benchmarkError,
  benchmarkCap,
  benchmarkFundMin,
  marketError,
  connectedSnapshots: space === "demo" ? demoPortfolio() : connected.snapshots,
  connectedSession: connected.session,
  connectedStatus: connected.status,
  connectedError: connected.error,
  connectedFilter,
});
const desk = new WorkbenchController({
  context: () => context(),
  save: saveWorkbenchLayout,
  refresh: render,
  error: (error) => showError(error),
  icon,
});
const notePage = new NotePageController({
  context, refresh: render, error: showError,
  save: (data, id, version, noteScope) => commit("note", data, id, false, version, noteScope),
  write: commit, refreshData: refreshWorkspace,
});
const exerciseClock = new ExerciseClock(showError);
const language = new LanguageController({ context, refresh: render, error: showError, save: commit });
const deskTools = new DeskToolController({ context, error: showError });

async function saveWorkbenchLayout(layout, base) {
  if (base.space !== space)
    throw Error("This record changed. Reopen the form.");
  await commit(
    "workbench",
    layout,
    base.record?.id || WORKBENCH_ID,
    false,
    base.record?.version || 0,
  );
  toast("Saved.");
}

const network = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { ...(url === "/api/session" ? {} : accountHeaders(session)), ...options.headers },
    signal: options.signal || AbortSignal.timeout(25000),
  });
  if (response.status === 401 && session.authenticated && url !== "/api/session") reloadAccount();
  return response;
};

function toast(key) {
  $("#toast").textContent = t(key);
  $("#toast").classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function showError(error) {
  toast(message(error?.message || "Something went wrong."));
}
function notify(title, text, actions = []) {
  $("#notice-content").innerHTML =
    `<div class="dialog-heading"><h2>${t(title)}</h2><button class="icon-button" data-notice-close aria-label="${t("Close")}">${icon("close")}</button></div><div class="notice-text">${text}</div><div class="dialog-actions">${actions.map((a, i) => `<button class="${a.className || "secondary"}" data-notice="${i}">${t(a.label)}</button>`).join("")}<button class="secondary" data-notice-close>${t("Close")}</button></div>`;
  if (!$("#notice").open) $("#notice").showModal();
  $("#notice-content")
    .querySelectorAll("[data-notice]")
    .forEach(
      (button) =>
        (button.onclick = async () => {
          $("#notice").close();
          try {
            await actions[Number(button.dataset.notice)].run();
          } catch (error) {
            showError(error);
          }
        }),
    );
  $("#notice-content")
    .querySelectorAll("[data-notice-close]")
    .forEach((button) => (button.onclick = () => $("#notice").close()));
}
async function persist() {
  await saveSpace(space, state);
  channel?.postMessage({ space });
}
function updateStatus(key) {
  let status = key;
  if (!status)
    status =
      space === "demo"
        ? "Demo"
        : !navigator.onLine
          ? "Offline"
          : space.startsWith("google:")
            ? !session.authenticated
              ? "Sign in to sync"
              : state.pending.length
                ? "Pending changes"
                : "Synced"
            : "Local";
  $("#sync-status").textContent = t(status);
  $("#sync-status").dataset.state =
    status === "Synced" ? "synced" : status === "Offline" ? "offline" : "local";
}
const planner = new PlannerController({
  context,
  refresh: render,
  error: showError,
  edit: openEditor,
  save: (kind, data, id, version) =>
    commit(
      kind,
      kind === "note" ? { ...data, updatedOn: today() } : data,
      id,
      false,
      version,
    ),
  remove: (record) =>
    commit(record.kind, record.data, record.id, true, record.version),
});
new CreateMenuController({
  create: (kind) => {
    const date = page === "calendar" ? planner.state.date : today();
    if (kind === "task")
      planner.dialog(null, { kind: "task", startDate: date });
    else if (kind === "transaction")
      openEditor("transaction", null, null, { date });
    else if (kind === "note") openEditor("note");
  },
});
function renderChrome() {
  applyPreferences();
  $(".shell-tools").setAttribute("aria-label", t("Quick actions"));
  $("#global-create").innerHTML = page === "workbench" ? deskFloatingActions(preferences().workbenchEditing,icon) : createLauncher();
  $("#app-menu-button").setAttribute("aria-label", t("Menu"));
  $("#app-menu-button").innerHTML = icon("more");
  $("#app-menu-close").setAttribute("aria-label", t("Close"));
  $("#brand-name").textContent = t("DameDast");
  $("#brand-caption").textContent = "";
  $("#brand-caption").hidden = true;
  $("#workspace-label").textContent = t("Workspace");
  $("#page-label").textContent = t(sections[page][0]);
  $("#navigation").setAttribute("aria-label", t("Menu"));
  const activePage = page === "organizer" ? "notes" : page;
  const navLink = (key, pinnable = false) =>
    `<div class="nav-link-row" style="--nav-color:${navigationColor(key) || shortcutColors[key] || "#687f91"}"><a href="#${key}" class="nav-item ${activePage === key ? "active" : ""}" ${activePage === key ? 'aria-current="page"' : ""}>${icon(key)}<span>${t(sections[key][0])}</span>${key === "transactions" ? `<span class="nav-count">${money(ofKind("transaction").length)}</span>` : ""}</a>${pinnable ? `<button type="button" class="nav-pin ${navPins.includes(key) ? "is-pinned" : ""}" data-action="nav-pin" data-page="${key}" aria-pressed="${navPins.includes(key)}" aria-label="${t(navPins.includes(key) ? "Unpin menu" : "Pin menu")} · ${t(sections[key][0])}">${icon("pin")}</button>` : ""}</div>`;
  $("#navigation").innerHTML =
    (navPins.length ? `<section class="nav-pins" aria-label="${t("Pinned menus")}"><header><strong>${t("Pinned menus")}</strong><small>${localizedNumber(navPins.length)}</small></header>${navPins.map(key => navLink(key)).join("")}</section>` : "") +
    navLink("overview") + navLink("workbench") +
    navigationGroups.map(group => `<details class="nav-group" data-nav-group="${group.id}" style="--nav-color:${group.color}" ${navGroupsOpen[group.id] ? "open" : ""}><summary class="${group.items.includes(activePage) ? "has-active" : ""}"><span>${t(group.label)}</span>${icon("arrow", "nav-chevron")}</summary><div class="nav-group-items">${group.items.map(key => navLink(key, true)).join("")}</div></details>`).join("") +
    `<div class="nav-footer-links">${navLink("reports")}${navLink("settings")}</div>`;
  $("#mobile-navigation").innerHTML = [
    "overview",
    "workbench",
    "monthlyPlan",
    "organizer",
    "market",
    "settings",
  ]
    .map((key) => {
      const active =
        key === "organizer" ? plannerPages.includes(page) : page === key;
      return `<a href="#${key}" class="${active ? "active" : ""}" ${active ? 'aria-current="page"' : ""}>${icon(key)}<span>${t(key === "settings" ? "More" : sections[key][0])}</span></a>`;
    })
    .join("");
  profileMenu.render(session, space);

  document.querySelectorAll("[data-language]").forEach((button) => {
    if (button.dataset.language === "fa")
      button.textContent = getLanguage() === "en" ? "Fa" : "فارسی";
    const active = button.dataset.language === getLanguage();
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("#theme-button").innerHTML = icon(
    effectiveTheme() === "dark" ? "sun" : "moon",
  );
  $("#theme-button").setAttribute("aria-label", t("Switch theme"));
  $("#theme-button").title = t("Switch theme");
  $("#google-button").hidden = false;
  $("#google-button").innerHTML =
    `<span class="google-g" aria-hidden="true">G</span><span>${t(session.authenticated ? "Google account" : "Sign in")}</span>`;
  $("#sync-button").innerHTML = icon(
    "refresh",
    refreshInProgress || syncPromise || marketLoading ? "is-spinning" : "",
  );
  $("#sync-button").setAttribute(
    "aria-busy",
    String(refreshInProgress || !!syncPromise || marketLoading),
  );
  $("#sync-button").disabled = refreshInProgress;
  $("#workspace-search-label").textContent = t("Search everywhere");
  $("#workspace-search-input").placeholder = t("Search everywhere");
  refreshWorkspaceSearch();
  updateNotificationBell();
  $("#sync-button").setAttribute(
    "aria-label",
    t(refreshInProgress ? "Refreshing…" : "Refresh"),
  );
  $("#mode-banner").hidden = space !== "demo";
  $("#mode-banner").innerHTML =
    space === "demo"
      ? `<span class="demo-label">${t("Demo data")}</span><button class="text-button" data-action="leave-demo">${t("Exit demo")} ${icon("arrow", "directional")}</button>`
      : "";
  $("#save-button").innerHTML = `${icon("check")}${t("Save")}`;
  $("#cancel-button").textContent = t("Cancel");
  $(".close-dialog").innerHTML = icon("close");
  $(".close-dialog").setAttribute("aria-label", t("Close"));
}
function render() {
  if (!state || accountReloading) return;
  notePage.capture();
  language.capture();
  deskTools.capture();
  for (const group of document.querySelectorAll('#view [data-setting-group]'))
    settingsGroupsOpen[group.dataset.settingGroup] = group.open;
  const hash = resolveLearningRoute(location.hash.slice(1));
  if (desk.isInteracting && ["workbench", "settings"].includes(hash)) return;
  if (desk.gesture) desk.releasePointer();
  page = isNoteRoute(hash) ? "notes" : Object.hasOwn(sections, hash) ? hash : "overview";
  if (page === "overview") selectedMonth = `${monthOf(today()).slice(0, 4)}-${selectedMonth.slice(5)}`;
  document.body.classList.toggle("workbench-fullscreen", page === "workbench");
  renderChrome();
  noteLayout.disconnect();
  if (!isNoteRoute(hash)) notePage.deactivate();
  document.body.classList.toggle("notes-workspace",isNoteRoute(hash));
  if(isNoteRoute(hash) && document.querySelector(".keep-app")?.dataset.scope===space) notePage.update();
  else $("#view").innerHTML = isNoteRoute(hash) ? notePage.render(context()) : languagePages.includes(page) ? language.render(context()) : renderPage(context());
  if(languagePages.includes(page)) language.filterLessons();
  if(isNoteRoute(hash)) notePage.attach();
  document.querySelectorAll('.notes-grid:not(.notes-list) > .note-card').forEach(card => noteLayout.observe(card));
  exerciseClock.attach(space);
  desk.attach();
  deskTools.attach();
  planner.attach();
  formatNumericFields($("#view"));
  updateStatus();
  synchronizePageToolbar(page,t(sections[page][0]));
  if (
    ["overview", "market", "assets", "workbench"].includes(page) &&
    !marketLoading &&
    Date.now() - lastMarketRead > 60000
  )
    void loadMarket();
  if (
    page === "suggestions" &&
    !benchmarkLoading &&
    Date.now() - lastBenchmarkRead > 60000
  )
    void loadBenchmarks();
}
function openEditor(kind, id = null, type = null, preset = null) {
  if (kind === "note") { notePage.open(id, preset); return; }
  if (kind === "transaction" && id) {
    const linked = records().find(r => r.id === id)?.data.installmentId;
    if (linked) { openEditor("installment", linked); return; }
  }
  if (kind === developmentKind) {
    developmentEditorSpace = space;
    preset ||= { date: developmentDate, area: developmentArea(page), title: "", notes: "", minutes: 0, done: false, resourceId: null };
  }
  editorPreset = preset;
  if (kind === "transaction" && !ofKind("account").length) {
    toast("Create an account first.");
    openEditor("account");
    return;
  }
  editing = id ? records().find((r) => r.id === id) : null;
  editorKind = kind;
  $("#editor").dataset.editorKind = kind;
  if (kind === "transaction")
    movementType = type || editing?.data.type || "expense";
  $("#dialog-title").textContent = editing
    ? `${t("Edit")} · ${t({ account: "Account", transaction: "Transaction", budget: "Budget", goal: "Goal", installment: "Installment", receivable: "Loan", locked: "Locked asset", reminder: "Reminder", assetPosition: "Asset", note: "Note", project: "Project", habit: "Habits", developmentEntry: "New activity", workoutProgram: "Workout programs", weightEntry: "Record weight", weightGoal: "Weight goal", bookmark: "Saved links", category: "Category", allocationPlan: "Monthly plan", monthlyExpense: "Monthly expense", investmentStep: "Investment step" }[kind])}`
    : addLabel(kind);
  $("#form-error").textContent = "";
  $("#dialog-fields").innerHTML = kind === developmentKind ? developmentFields(editing?.data || preset, records()) : editorFields(
    kind,
    editing?.data || preset,
    ofKind("account").map((a) => [
      a.id,
      space === "demo" ? t(a.data.name) : a.data.name,
    ]),
    movementType,
    !!editing,
    selectedMonth,
    categoryOptions(),
  );
  if (kind === developmentKind) {
    const root = $("#dialog-fields");
    root.dataset.wordsDirty = "false";
    toggleDevelopmentFields(root);
  }
  if (projectKinds.includes(kind)) $("#dialog-fields").insertAdjacentHTML("beforeend", projectField(records(), editing?.data.projectId || preset?.projectId));
  formatNumericFields($("#editor"));
  updateAssetPreview();
  updatePlanTotal();
  applyMovementType();
  if (!$("#editor").open) $("#editor").showModal();
}
function applyMovementType() {
  const destination = $("[name=destinationId]");
  if (destination) {
    destination.closest(".field").hidden = movementType !== "transfer";
    destination.required = movementType === "transfer";
  }
  document
    .querySelectorAll("[data-movement-type]")
    .forEach((button) =>
      button.classList.toggle(
        "selected",
        button.dataset.movementType === movementType,
      ),
    );
}
function validateData(kind, data, id) {
  validateDevelopment(kind, data, today(), records());
  validateExercise(kind, data, records(), id);
  validateLanguage(kind, data, records(), id);
  validateProductivity(kind, data, records(), id);
  if (kind === "calendarEvent") validateCalendarEntry(data);
  if (kind === "installment" && data.payment) {
    if (!data.paid || !validIso(data.payment.date) || !ofKind("account").some(r => r.id === data.payment.accountId) || !categoryOptions().some(([value]) => value === data.payment.category)) throw Error("Choose an account and payment date.");
  }
  if (kind === "workbench") {
    validateWorkbench(data);
    if (ofKind("workbench").some((r) => r.id !== id))
      throw Error("Only one workbench is allowed.");
  }
  if (kind === "assetPosition") validatePosition(data);
  if (kind === "note" && data.drawing) {
    validateDrawing(data.drawing);
    if (new TextEncoder().encode(JSON.stringify(data)).length > 750000)
      throw Error("Drawing note is too large.");
  }
  if (
    ["transaction", "budget", "monthlyExpense"].includes(kind) &&
    !categoryOptions().some(([value]) => value === data.category)
  )
    throw Error("Invalid category.");
  if (
    kind === "category" &&
    (!data.name.trim() ||
      data.name.length > 50 ||
      !categoryColors.includes(data.color))
  )
    throw Error("Enter a valid title or name.");
  if (
    kind === "category" &&
    categoryList(records(), categories).some(
      (c) =>
        c.recordId !== id &&
        c.name.toLowerCase() === data.name.trim().toLowerCase(),
    )
  )
    throw Error("This category name already exists.");
  if (kind === "reminder") validateReminder(data);
  if(kind === "note" && !data.drawing && !data.whiteboardId) validateNote(data);
  if(kind === "noteLabel") checkLabelName(data.name,records(),id);
  if (kind === "allocationPlan") {
    validatePlan(data);
    if (
      ofKind("allocationPlan").some(
        (p) => p.id !== id && p.data.month === data.month,
      )
    )
      throw Error("This month already has a plan.");
    if (
      data.rows.some(
        (r) => !categoryOptions().some(([value]) => value === r.category),
      )
    )
      throw Error("Invalid category.");
  }
  if (
    kind === "monthlyExpense" &&
    (!data.title.trim() ||
      !Number.isSafeInteger(data.amount) ||
      data.amount <= 0 ||
      data.amount > 1e12 ||
      !Number.isInteger(data.day) ||
      data.day < 1 ||
      data.day > 31 ||
      !validMonth(data.startMonth) ||
      (data.endMonth &&
        (!validMonth(data.endMonth) || data.endMonth < data.startMonth)))
  )
    throw Error("Invalid recurring expense schedule.");
  if (
    kind === "investmentStep" &&
    (!data.title.trim() ||
      !Number.isSafeInteger(data.amount) ||
      data.amount <= 0 ||
      data.amount > 1e12 ||
      !data.date)
  )
    throw Error("Enter an investment title, amount and date.");
  if (
    kind === "investmentStep" &&
    ((data.actualValue !== null &&
      (!Number.isSafeInteger(data.actualValue) ||
        data.actualValue < 0 ||
        data.actualValue > 1e12)) ||
      (data.actualValue !== null) !== !!data.valueDate ||
      (data.valueDate && data.valueDate < data.date))
  )
    throw Error("Choose a valuation date on or after the investment.");
  if (
    kind === "transaction" &&
    data.recurringExpenseId &&
    ofKind("transaction").some(
      (r) =>
        r.id !== id &&
        r.data.recurringExpenseId === data.recurringExpenseId &&
        r.data.recurringMonth === data.recurringMonth,
    )
  )
    throw Error("This monthly expense is already recorded.");

  const positive = (value) =>
    Number.isSafeInteger(value) && value > 0 && value <= 1e12;
  if (kind === "account") data.cardNumber = parseCardNumber(data.cardNumber);
  if (
    kind === "account" &&
    (!data.name.trim() ||
      !Number.isSafeInteger(data.openingBalance) ||
      Math.abs(data.openingBalance) > 1e12)
  )
    throw Error("Enter a name and valid balance.");
  if (kind === "transaction") {
    if (!positive(data.amount)) throw Error("Enter a valid amount.");
    if (data.type === "transfer" && data.accountId === data.destinationId)
      throw Error("Choose different accounts.");
    if (!data.date) throw Error("Choose a date.");
  }
  if (kind === "budget") {
    if (!positive(data.limit)) throw Error("Enter a valid amount.");
    if (
      ofKind("budget").some(
        (b) =>
          b.id !== id &&
          (b.data.calendar || "gregory") === (data.calendar || "gregory") &&
          b.data.month === data.month &&
          b.data.category === data.category,
      )
    )
      throw Error("This budget already exists.");
  }
  if (
    kind === "goal" &&
    (!data.name.trim() ||
      !positive(data.target) ||
      !Number.isSafeInteger(data.saved) ||
      data.saved < 0 ||
      data.saved > 1e12)
  )
    throw Error("Enter a goal, target and savings.");
  if (
    kind === "installment" &&
    (!data.title.trim() ||
      !positive(data.amount) ||
      !data.dueDate ||
      !Number.isInteger(data.reminderDays) ||
      data.reminderDays < 0 ||
      data.reminderDays > 30)
  )
    throw Error("Enter an installment title and valid reminder days.");
  if (
    kind === "receivable" &&
    (!data.person.trim() ||
      !positive(data.amount) ||
      !Number.isSafeInteger(data.returned) ||
      data.returned < 0 ||
      data.returned > data.amount ||
      !data.lentOn)
  )
    throw Error("Returned amount cannot exceed the loan.");
  if (kind === "locked" && (!data.name.trim() || !positive(data.amount)))
    throw Error("Enter a valid amount.");
}
async function commit(
  kind,
  data,
  id = crypto.randomUUID(),
  remove = false,
  expectedVersion = null,
  expectedSpace = space,
) {
  await withLock(async () => {
    if(space !== expectedSpace) throw Error("Account changed. Reopen the note.");
    const loaded = await loadSpace(expectedSpace);
    if(space !== expectedSpace) throw Error("Account changed. Reopen the note.");
    state = loaded;
    const current = materialize(state).find((r) => r.id === id);
    if (expectedVersion !== null && (current?.version || 0) !== expectedVersion)
      throw Error("This record changed. Reopen the form.");
    if (current?.deleted) throw Error("This record changed. Reopen the form.");
    const live = materialize(state).filter(r => !r.deleted);
    if (kind === "transaction" && (current?.data.installmentId || data?.installmentId)) throw Error("Edit or reverse this payment from its installment.");
    if (remove && kind === "project" && live.some(r => r.data.projectId === id)) throw Error("Move records out of this project before deleting it.");
    if (remove && kind === "installment" && current?.data.payment) throw Error("Reverse this payment before deleting the installment.");
    if (!remove) validateData(kind, data, id);
    state.pending.push({
      operationId: crypto.randomUUID(),
      id,
      kind,
      expectedVersion: current?.version || 0,
      delete: remove,
      data: remove ? null : data,
    });
    await persist();
  });
  if(space !== expectedSpace) return;
  render();
  if (space.startsWith("google:")) void sync();
}
async function createSchedule(data, count) {
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw Error("Choose 1 to 100 installments.");
  validateData("installment", data);
  const changes = Array.from({ length: count }, (_, i) => {
    const dueDate = addMonths(data.dueDate, i);
    if (Number(dueDate.slice(0, 4)) > 2100)
      throw Error("Date must be before 2101.");
    return {
      operationId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      kind: "installment",
      expectedVersion: 0,
      delete: false,
      data: { ...data, title: `${data.title} ${i + 1}/${count}`, dueDate },
    };
  });
  await withLock(async () => {
    state = await loadSpace(space);
    state.pending.push(...changes);
    await persist();
  });
  render();
  if (space.startsWith("google:")) void sync();
}
async function submitWeightLog(form) {
  const scope = decodeURIComponent(form.dataset.space);
  if (scope !== space) return;
  const data = { date: form.elements.weightDate.value, kg: Number(numInput(form.elements.kg.value)) };
  const error = form.querySelector(".form-error");
  error.textContent = "";
  const controls = [...form.querySelectorAll("input,button")];
  controls.forEach(control => control.disabled = true);
  try {
    await commit("weightEntry", data, crypto.randomUUID(), false, 0, scope);
    toast("Saved.");
  } catch (failure) {
    if (form.isConnected) error.textContent = t(failure.message);
    else showError(failure);
  } finally { controls.forEach(control => control.disabled = false); }
}
async function submitEditor(event) {
  event.preventDefault();
  const button = $("#save-button");
  button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(event.target));
    for (const name of [
      "amount",
      "openingBalance",
      "limit",
      "target",
      "saved",
      "returned",
      "reminderDays",
      "count",
      "total",
      "day",
      "weeklyTarget",
      "minutes",
      "kg",
    ])
      if (name in data) data[name] = Number(numInput(data[name]));
    if (editorKind === developmentKind) {
      if (space !== developmentEditorSpace) throw Error("Account changed. Reopen the note.");
      data.done = ["essay", "vocabulary"].includes(data.area) ? false : !!editing?.data.done;
      data.resourceId = data.resourceId || null;
      const form = event.target, fileInput = form.elements.developmentFile, resourceInput = form.elements.resourceId;
      const file = fileInput.files[0], words = data.developmentWords;
      const entryScope = developmentEditorSpace, entryRecord = editing;
      delete data.developmentFile; delete data.developmentWords;
      validateDevelopment(editorKind, data, today());
      await prepareDevelopmentResources(data, { file, words, records: records(),
        save: (kind, payload, id, remove, version) => commit(kind, payload, id, remove, version, entryScope),
        attached: id => { resourceInput.value = id; fileInput.value = ""; } });
      if (space !== entryScope || editing !== entryRecord || editorKind !== developmentKind || !$("#editor").open) return;
    }
    if (projectKinds.includes(editorKind)) data.projectId = data.projectId || null;
    if (editorKind === "habit") {
      data.days = new FormData(event.target).getAll("habitDays").map(Number);
      if (!data.days.length) throw Error("Choose at least one weekday.");
      data.weeklyTarget = data.days.length;
      delete data.habitDays;
    }
    if (["project", "habit"].includes(editorKind)) data.name = data.name.trim();
    if (editorKind === "bookmark") { data.tags = [...new Set((data.tagsText || "").split(/[,،]/).map(x => x.trim()).filter(Boolean))]; delete data.tagsText; }
    if (editorKind === "transaction") {
      data.type = movementType;
      data.destinationId =
        movementType === "transfer" ? data.destinationId : null;
      const source = editing?.data || editorPreset;
      if (source?.recurringExpenseId) {
        data.recurringExpenseId = source.recurringExpenseId;
        data.recurringMonth = monthOf(data.date);
      }
    }
    if (typeof data.title === "string") data.title = data.title.trim();
    if (editorKind === "category") data.name = data.name.trim();
    if (editorKind === "assetPosition") {
      data.name = data.name.trim();
      data.sourceKey =
        editing?.data.sourceKey || editorPreset?.sourceKey || null;
      data.marketSymbol = data.marketSymbol || null;
      data.lots = collectAssetLots();
      data.valuations = parseAssetValuations(data.valuationsText);
      delete data.valuationsText;
      for (const key of Object.keys(data))
        if (key.startsWith("lot-date-")) delete data[key];
    }
    if (editorKind === "reminder") {
      data.title = data.title.trim();
      data.body = data.body || "";
      data.times = parseTimes(data.timesText);
      delete data.timesText;
      data.interval = Number(numInput(data.interval));
      data.maxOccurrences =
        data.maxOccurrences === ""
          ? null
          : Number(numInput(data.maxOccurrences));
      data.endDate = data.endDate || null;
      data.pinned = !!data.pinned;
      data.completed = !!data.completed;
    }
    if (editorKind === "allocationPlan") {
      data.rows = collectPlanRows();
    }
    if (editorKind === "budget") data.calendar = "persian";
    if (editorKind === "monthlyExpense") {
      data.accountId = data.accountId || null;
      data.endMonth = data.hasEnd ? data.endMonth : null;
      delete data.hasEnd;
    }
    if (editorKind === "investmentStep") {
      data.actualValue =
        data.actualValue === "" ? null : Number(numInput(data.actualValue));
      data.valueDate = data.valueDate || null;
    }
    if (editorKind === "goal") {
      data.deadline = data.deadline || null;
      data.pinned = !!editing?.data.pinned;
    }
    if (editorKind === "receivable") data.dueDate = data.dueDate || null;
    if (editorKind === "locked") data.releaseDate = data.releaseDate || null;
    if (editorKind === "installment") {
      data.paid = editing?.data.paid || false;
      data.payment = editing?.data.payment || null;
      const count = data.count ?? 1;
      delete data.count;
      if (!editing && count > 1) {
        await createSchedule(data, count);
        $("#editor").close();
        toast("Saved.");
        return;
      }
    }
    await commit(
      editorKind,
      data,
      editing?.id || (editorKind === "bookmark" ? editorPreset?.clipId : undefined),
      false,
      editing?.version ?? null,
      editorKind === developmentKind ? developmentEditorSpace : space,
    );
    if (editorKind === "bookmark" && editorPreset?.clipId) void acknowledgeClip(editorPreset.clipId);
    if (
      ["allocationPlan", "budget"].includes(editorKind) &&
      data.calendar !== "gregory"
    )
      selectedMonth = data.month;
    $("#editor").close();
    render();
    toast("Saved.");
  } catch (error) {
    $("#form-error").textContent = message(
      error.message || "Something went wrong.",
    );
  } finally {
    button.disabled = false;
  }
}
async function sync() {
  if (syncPromise) return syncPromise;
  if (!space.startsWith("google:") || !navigator.onLine) return;
  syncPromise = withLock(async () => {
    state = await loadSpace(space);
    updateStatus("Syncing");
    try {
      const response = await network("/api/session", { cache: "no-store" });
      if (!response.ok) throw Error("Server unavailable.");
      const current = await response.json();
      if (!current.authenticated || `google:${current.userId}` !== space) {
        reloadAccount();
        return;
      }
      session = current;
      while (state.pending.length) {
        const changes = financeSyncBatch(state.pending),
          result = await network("/api/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-TOKEN": session.csrf,
            },
            body: JSON.stringify({ changes }),
          });
        if (result.status === 409) {
          const conflict = await result.json();
          await showConflict(conflict.recordId);
          return;
        }
        if (!result.ok) {
          const error = await result
            .json()
            .catch(() => ({ error: "Server unavailable." }));
          throw Error(error.error);
        }
        state.snapshot = await result.json();
        const sent = new Set(changes.map((change) => change.operationId));
        state.pending = state.pending.filter(
          (change) => !sent.has(change.operationId),
        );
        await persist();
      }
      const latest = await network("/api/finance", { cache: "no-store" });
      if (!latest.ok) throw Error("Server unavailable.");
      state.snapshot = await latest.json();
      try {
        const response = await network("/api/organizer", { cache: "no-store" });
        if (response.ok) {
          const overview = await response.json();
          if (
            overview.revision === state.snapshot.revision &&
            Number.isFinite(Date.parse(overview.now))
          )
            serverClockSkew = Date.parse(overview.now) - Date.now();
        }
      } catch {}
      await persist();
      render();
      return true;
    } catch {
      updateStatus("Pending changes");
      if (navigator.onLine) toast("Sync failed. Changes are kept locally.");
      return false;
    }
  }).finally(() => {
    syncPromise = null;
    if (ready) renderChrome();
  });
  return syncPromise;
}
async function refreshWorkspace() {
  if (refreshInProgress) return false;
  refreshInProgress = true;
  renderChrome();
  try {
    if (space.startsWith("google:")) {
      if (!navigator.onLine) { toast("Offline. Showing saved data."); return false; }
      if (await sync() === false) return false;
    } else {
      await withLock(async () => { state = await loadSpace(space); });
    }
    if (page === "connected") await connected.sync();
    if (["overview", "market", "assets", "workbench"].includes(page) && navigator.onLine) await loadMarket();
    render();
    toast(!navigator.onLine ? "Offline. Showing saved data." : marketError && ["overview", "market", "assets", "workbench"].includes(page) ? "Data refreshed. Live prices are unavailable." : "Data and notifications refreshed.");
    return true;
  } catch (error) { showError(error); return false; }
  finally { refreshInProgress = false; renderChrome(); }
}
async function showConflict(id) {
  const response = await network("/api/finance", { cache: "no-store" });
  if (!response.ok) throw Error("Server unavailable.");
  const remote = await response.json(),
    server = remote.records.find((r) => r.id === id),
    local = records().find((r) => r.id === id);
  const describe = (record) =>
    !record || record.deleted
      ? t("Deleted")
      : `${record.data.name || record.data.title || record.data.person || record.data.note || t(record.data.category) || ""}${"amount" in record.data ? " · " + money(record.data.amount) + " " + t("toman") : ""}${"returned" in record.data ? " · " + t("Returned") + " " + money(record.data.returned) : ""}${"saved" in record.data ? " · " + money(record.data.saved) : ""}${"paid" in record.data ? " · " + t(record.data.paid ? "Paid" : "Unpaid") : ""}`;
  const resolve = async (keep) => {
    await withLock(async () => {
      state = await loadSpace(space);
      state.snapshot = remote;
      if (keep) {
        let version = server?.version || 0;
        for (const change of state.pending.filter(
          (change) => change.id === id,
        )) {
          change.expectedVersion = version++;
          change.operationId = crypto.randomUUID();
        }
      } else state.pending = state.pending.filter((change) => change.id !== id);
      await persist();
    });
    render();
    void sync();
  };
  notify(
    "Choose a version",
    `<p>${t("This record changed on another device.")}</p><div class="conflict-versions"><strong>${t("This device")}</strong><p dir="auto">${esc(describe(local))}</p><strong>${t("Server version")}</strong><p dir="auto">${esc(describe(server))}</p></div>`,
    [
      { label: "Keep server", run: () => resolve(false) },
      ...(!server?.deleted
        ? [
            {
              label: "Keep mine",
              className: "primary",
              run: () => resolve(true),
            },
          ]
        : []),
    ],
  );
}
function isValidMarket(data) {
  return (
    data &&
    Array.isArray(data.quotes) &&
    data.quotes.every(
      (q) =>
        marketInstruments.some((i) => i.symbol === q.symbol) &&
        typeof q.price === "number" &&
        Number.isFinite(q.price) &&
        q.price > 0 &&
        (q.changePercent === null || Number.isFinite(q.changePercent)) &&
        !Number.isNaN(Date.parse(q.asOf)),
    )
  );
}
async function loadMarket() {
  if (marketLoading) return;
  marketLoading = true;
  lastMarketRead = Date.now();
  marketError = "";
  renderIfMarketVisible();
  try {
    const response = await network("/api/market", { cache: "no-store" });
    if (!response.ok) throw Error();
    const data = await response.json();
    if (!isValidMarket(data)) throw Error();
    marketData = data;
    if (data.error) marketError = "Market feed unavailable";
    if (data.quotes.length)
      try {
        localStorage.setItem("damdast-market", JSON.stringify(data));
      } catch {}
    if (page === "market" && !marketHistoryLoading) void loadHistory();
  } catch {
    marketError = "Market feed unavailable";
    if (marketData) marketData = { ...marketData, stale: true };
  } finally {
    marketLoading = false;
    renderIfMarketVisible();
    if ($("#editor").open && editorKind === "assetPosition")
      updateAssetPreview();
  }
}
function renderIfMarketVisible() {
  if (ready && ["overview", "market", "assets", "workbench"].includes(page))
    render();
}
async function loadHistory() {
  const generation = ++historyGeneration,
    symbol = marketSymbol,
    days = marketPeriod;
  marketHistoryLoading = true;
  marketHistory = [];
  if (page === "market") render();
  try {
    const response = await network(
      `/api/market/history?symbol=${symbol}&days=${days}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw Error();
    const points = await response.json();
    if (
      !Array.isArray(points) ||
      !points.every(
        (p) =>
          Number.isFinite(p.price) &&
          p.price > 0 &&
          Number.isFinite(p.timestamp),
      )
    )
      throw Error();
    if (generation === historyGeneration) marketHistory = points;
  } catch {
    if (generation === historyGeneration) marketHistory = [];
  } finally {
    if (generation === historyGeneration) {
      marketHistoryLoading = false;
      if (page === "market") render();
    }
  }
}
async function changeSpace(next) {
  if (!canOpenSpace(next, session, restoredWorkspaces())) throw Error("Sign in to continue.");
  if (syncPromise) await syncPromise;
  const url = new URL(location.href);
  if (next === "demo") url.searchParams.set("demo", "1");
  else url.searchParams.delete("demo");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  space = next;
  state = await loadSpace(space);
  render();
  if (space.startsWith("google:")) void sync();
}
let googleLoginPending = false;
async function googleLogin() {
  if (googleLoginPending) return;
  googleLoginPending = true;
  try {
    const response = await network("/api/session", { cache: "no-store" });
    if (!response.ok) throw Error();
    session = await response.json();
    if (session.authenticated) { reloadAccount(); return; }
    if (!session.googleConfigured) {
      notify("Sign-in unavailable.", t("Google sign-in is temporarily unavailable. Please try again later."));
      return;
    }
    localStorage.removeItem(scopedStorageKey("damdast-active-local-workspace"));
    location.href = "/auth/google?returnUrl=" + encodeURIComponent("/" + location.hash);
  } catch {
    notify("Sign-in failed.", t("Cannot reach the local app server. Start the app and try again."));
  } finally { googleLoginPending = false; }
}

function install() {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    return;
  }
  notify("Install app", t("Install from your browser menu."));
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob(["\ufeff", content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCsv() {
  const accounts = ofKind("account"),
    name = (id) => accounts.find((a) => a.id === id)?.data.name || "";
  const rows = [
    [
      "Date",
      "Type",
      "Description",
      "Category",
      "Account",
      "To account",
      "Amount (toman)",
    ].map(t),
    ...filterTransactions(records(), transactionFilters, r => {
      const category = categoryInfo(records(), categories, r.data.category);
      return `${r.data.note || ""} ${category.builtin ? t(category.name) : category.name} ${name(r.data.accountId)}`;
    })
      .map((r) => [
        solarNumeric(r.data.date),
        t(
          { income: "Income", expense: "Expense", transfer: "Transfer" }[
            r.data.type
          ],
        ),
        r.data.note,
        t(r.data.category),
        name(r.data.accountId),
        r.data.destinationId ? name(r.data.destinationId) : "",
        r.data.amount,
      ]),
  ];
  const safe = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  download(
    rows.map((row) => row.map(safe).join(",")).join("\r\n"),
    `damdast-${selectedMonth}.csv`,
    "text/csv;charset=utf-8",
  );
}
async function pushRegistration(subscription) {
  return network("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": session.csrf,
    },
    body: JSON.stringify({ ...subscription.toJSON(), language: getLanguage() }),
  });
}
async function updatePushLanguage() {
  if (
    !session.authenticated ||
    !("serviceWorker" in navigator) ||
    !navigator.onLine
  )
    return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(),
      subscription = await registration?.pushManager?.getSubscription();
    if (subscription) await pushRegistration(subscription);
  } catch {}
}
async function enablePush() {
  if (!session.authenticated || !space.startsWith("google:")) {
    notify("Reminders", t("Sign in for background reminders."));
    return;
  }
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
    notify("Reminders", t("Push is not supported here."));
    return;
  }
  try {
    if ((await Notification.requestPermission()) !== "granted") {
      toast("Notifications are off.");
      return;
    }
    const response = await network("/api/push/key");
    if (!response.ok) throw Error();
    const { publicKey } = await response.json();
    if (!publicKey) throw Error();
    const normalized = publicKey.replace(/-/g, "+").replace(/_/g, "/"),
      bytes = Uint8Array.from(
        atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
        (c) => c.charCodeAt(0),
      );
    const registration = await navigator.serviceWorker.ready,
      subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        }));
    if (!(await pushRegistration(subscription)).ok) throw Error();
    toast("Reminders enabled.");
  } catch {
    toast("Could not enable reminders.");
  }
}
async function removeDevicePush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration(),
    subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  const response = await network("/api/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": session.csrf,
    },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw Error("Server unavailable.");
  await subscription.unsubscribe();
}
async function migrateGuest() {
  const guest = await loadSpace("guest"),
    source = materialize(guest).filter((r) => !r.deleted);
  if (!source.length) {
    toast("No guest records.");
    return;
  }
  notify(
    "Import local records?",
    `${money(source.length)} · ${t("Existing imports will not be duplicated.")}`,
    [
      {
        label: "Import",
        className: "primary",
        run: async () => {
          await withLock(async () => {
            state = await loadSpace(space);
            const key = `migration:${space}`,
              mapping = JSON.parse(localStorage.getItem(key) || "{}");
            for (const r of source) mapping[r.id] ??= crypto.randomUUID();
            localStorage.setItem(key, JSON.stringify(mapping));
            const existing = new Set(materialize(state).map((r) => r.id));
            for (const r of [
              ...source.filter(
                (r) => r.kind === "account" || r.kind === "category" || r.kind === "project" || r.kind === "habit" || r.kind === "noteLabel" || r.kind === "languageVocabulary" || r.kind === "languageLesson",
              ),
              ...source.filter((r) => r.kind === "monthlyExpense"),
              ...source.filter(
                (r) =>
                  ![
                    "account",
                    "category",
                    "monthlyExpense",
                    "notificationRead",
                    "project",
                    "habit",
                    "noteLabel",
                    "languageVocabulary",
                    "languageLesson",
                  ].includes(r.kind),
              ),
              ...source.filter((r) => r.kind === "notificationRead"),
            ]) {
              if (r.kind === "transaction" && r.data.installmentId) continue;
              const id = mapping[r.id];
              if (existing.has(id)) continue;
              if (
                r.kind === "workbench" &&
                materialize(state).some(
                  (x) => !x.deleted && x.kind === "workbench",
                )
              )
                continue;
              const data = structuredClone(r.data);
              if (data.projectId) data.projectId = mapping[data.projectId] || null;
              if (r.kind === "note" && data.labels) data.labels=data.labels.map(id=>mapping[id]).filter(Boolean);
              if (r.kind === "habitLog") data.habitId = mapping[data.habitId];
              if (r.kind === "languageEssay") data.vocabularyId = mapping[data.vocabularyId];
              if (r.kind === "developmentEntry" && data.resourceId) data.resourceId = mapping[data.resourceId];
              if (r.kind === "installment" && data.payment) data.payment = { ...data.payment, transactionId: mapping[data.payment.transactionId] || crypto.randomUUID(), accountId: mapping[data.payment.accountId], category: data.payment.category.startsWith("custom:") ? "custom:" + mapping[data.payment.category.slice(7)] : data.payment.category };
              if (r.kind === "workbench")
                data.widgets = data.widgets.map((w) => ({
                  ...w,
                  referenceId: w.referenceId
                    ? mapping[w.referenceId] || null
                    : null,
                }));
              if (r.kind === "transaction") {
                data.accountId = mapping[data.accountId];
                if (data.destinationId)
                  data.destinationId = mapping[data.destinationId];
              }
              if (data.category?.startsWith("custom:"))
                data.category = "custom:" + mapping[data.category.slice(7)];
              if (data.recurringExpenseId) {
                if (mapping[data.recurringExpenseId])
                  data.recurringExpenseId = mapping[data.recurringExpenseId];
                else {
                  delete data.recurringExpenseId;
                  delete data.recurringMonth;
                }
              }
              if (r.kind === "monthlyExpense" && data.accountId)
                data.accountId = mapping[data.accountId];
              if (r.kind === "assetPosition" && data.sourceKey) {
                try {
                  const key = JSON.parse(data.sourceKey);
                  if (key[0] === "locked" && mapping[key[1]])
                    data.sourceKey = JSON.stringify([
                      "locked",
                      mapping[key[1]],
                    ]);
                } catch {}
              }
              if (r.kind === "notificationRead") {
                if (!mapping[data.sourceId]) continue;
                data.sourceId = mapping[data.sourceId];
              }
              if (r.kind === "allocationPlan")
                data.rows = data.rows.map((row) => ({
                  ...row,
                  category: row.category.startsWith("custom:")
                    ? "custom:" + mapping[row.category.slice(7)]
                    : row.category,
                }));
              state.pending.push({
                operationId: crypto.randomUUID(),
                id,
                kind: r.kind,
                expectedVersion: 0,
                delete: false,
                data,
              });
            }
            await persist();
          });
          render();
          void sync();
          toast("Queued for sync.");
        },
      },
    ],
  );
}
async function logout() {
  const accountKey = accountSpace(session);
  const hasPending =
    (await loadSpace(accountKey)).pending.length ||
    (connected.session.userId === session.userId &&
      connected.state.pending.length);
  notify(
    "Sign out?",
    t(
      hasPending
        ? "Sync pending changes first."
        : "The local copy will be cleared.",
    ),
    hasPending
      ? [
          {
            label: "Sync",
            run: async () => {
              await sync();
              await connected.sync();
            },
          },
        ]
      : [
          {
            label: "Sign out and clear",
            className: "danger",
            run: async () => {
              if (syncPromise) await syncPromise;
              if (connected.syncPromise) await connected.syncPromise;
              if ((await loadSpace(accountKey)).pending.length || connected.state.pending.length) throw Error("Sync pending changes first.");
              if (session.pushConfigured) await removeDevicePush();
              const response = await network("/auth/logout", {
                method: "POST",
                headers: { "X-CSRF-TOKEN": session.csrf },
              });
              if (!response.ok) throw Error("Server unavailable.");
              await connected.clearLocal();
              await saveSpace(`google:${session.userId}`, emptyState());
              localStorage.removeItem("damedast-last-user");
              channel?.postMessage({ logout: session.userId });
              session = {
                authenticated: false,
                googleConfigured: session.googleConfigured,
                demoEnabled: session.demoEnabled,
              };
              setAccountScope(session);
              navPins = readPins(pinnablePages);
              notesView = localStorage.getItem(scopedStorageKey("damedast-notes-view")) === "list" ? "list" : "grid";
              await changeSpace("guest");
            },
          },
        ],
  );
}
async function changeLanguage(value) {
  setLanguage(value);
  const url = new URL(location.href);
  url.searchParams.delete("lang");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  render();
  if ($("#editor").open) {
    const values = Object.fromEntries(new FormData($("#editor-form")));
    if (editorKind === "assetPosition") {
      values.lots = collectAssetLots();
      values.valuations = parseAssetValuations(values.valuationsText);
      values.sourceKey =
        editing?.data.sourceKey || editorPreset?.sourceKey || null;
    }
    if (editorKind === "reminder") {
      values.pinned = !!values.pinned;
      values.completed = !!values.completed;
    }
    if (editorKind === "habit") values.days = new FormData($("#editor-form")).getAll("habitDays").map(Number);
    if (editorKind === "allocationPlan")
      values.rows = [...document.querySelectorAll("[data-plan-row]")].map(
        (r) => ({
          category: r.querySelector("[data-plan-category]").value,
          basisPoints: 0,
          percentText: r.querySelector("[data-plan-percent]").value,
        }),
      );
    if (editorKind === "monthlyExpense" && !values.hasEnd)
      values.endMonth = null;
    $("#dialog-fields").innerHTML = editorFields(
      editorKind,
      values,
      ofKind("account").map((a) => [
        a.id,
        space === "demo" ? t(a.data.name) : a.data.name,
      ]),
      movementType,
      !!editing,
      selectedMonth,
      categoryOptions(),
    );
    if (projectKinds.includes(editorKind)) $("#dialog-fields").insertAdjacentHTML("beforeend", projectField(records(), values.projectId));
    $("#dialog-title").textContent = editing ? t("Edit") : addLabel(editorKind);
    applyMovementType();
    updatePlanTotal();
    formatNumericFields($("#editor"));
    updateAssetPreview();
  }
  void updatePushLanguage();
}
async function onAction(event) {
  const portfolioFilter = event.target.closest("[data-portfolio-filter]");
  if (portfolioFilter) {
    connectedFilter = portfolioFilter.dataset.portfolioFilter;
    render();
    return;
  }
  const portfolioRemove = event.target.closest("[data-connected-remove]");
  if (portfolioRemove) {
    notify(
      "Remove imported source?",
      t(
        "Only the imported copy is removed. Your provider account stays unchanged.",
      ),
      [
        {
          label: "Delete",
          className: "danger",
          run: () => connected.remove(portfolioRemove.dataset.connectedRemove),
        },
      ],
    );
    return;
  }
  const languageButton = event.target.closest("[data-language]");
  if (languageButton) {
    await changeLanguage(languageButton.dataset.language);
    return;
  }
  const typeButton = event.target.closest("[data-movement-type]");
  if (typeButton) {
    movementType = typeButton.dataset.movementType;
    applyMovementType();
    return;
  }
  if (event.target.closest(".close-dialog")) {
    $("#editor").close();
    return;
  }
  const element = event.target.closest("[data-action]");
  if (!element) {
    const note = event.target.closest("[data-note-open]");
    if (note && !event.target.closest("button, a, input, label, summary"))
      openEditor("note", note.dataset.noteOpen);
    return;
  }
  const { action, id, kind } = element.dataset;
  if (action === "learning-filter") { learningCategory = ["all", "language", "study", "plan"].includes(element.dataset.category) ? element.dataset.category : "all"; render(); return; }
  if (action === "weight-add") {
    const existing = ofKind("weightEntry").find(r => r.data.date === today());
    openEditor("weightEntry", existing?.id); return;
  }
  if (action === "weekly-item-open") {
    const record = records().find(r => r.id === id);
    if (!record) return;
    if (record.kind === developmentKind) {
      developmentDate = record.data.date;
      learningCategory = "all";
      location.hash = record.data.area === "exercise" ? "developmentExercise" : "learning";
      if (record.data.area === "essay") language.openEssay(record.data.date, element);
      else if (record.data.area === "vocabulary") { language.date = record.data.date; location.hash = "languageVocabulary"; }
      else openEditor(developmentKind, id);
    } else if (record.kind === "habit") {
      location.hash = "habits";
      openEditor("habit", id);
    } else {
      location.hash = "tasks";
      planner.dialog(record, element.dataset.source === "noteTask" ? { taskId: element.dataset.taskId } : { occurrence: element.dataset.date });
    }
    return;
  }
  if (action === "development-add") {
    openEditor(developmentKind, null, null, { date: element.dataset.date || context().developmentDate, area: element.dataset.area || "plan", title: "", notes: "", minutes: 0, done: false, resourceId: null }); return;
  }
  if (["development-day", "development-shift", "development-today", "development-month"].includes(action)) {
    const current = context().developmentDate;
    const next = action === "development-day" ? element.dataset.date : action === "development-today" ? today()
      : action === "development-month" ? dateInMonth(shiftMonth(monthOf(current), Number(element.dataset.delta)),1)
      : shiftDay(current, Number(element.dataset.delta));
    developmentDate = next;
    render(); return;
  }
  if (action === "development-toggle") {
    const record = ofKind(developmentKind).find(r => r.id === id);
    if (!record || record.data.date > today()) return;
    element.disabled = true;
    try { await commit(developmentKind, { ...record.data, done: !record.data.done }, id, false, record.version); }
    finally { if (element.isConnected) element.disabled = false; }
    return;
  }
  if (action === "development-resource") {
    const record = ofKind(developmentKind).find(r => r.id === id); if (!record) return;
    if (record.data.area === "essay") language.openEssay(record.data.date, element);
    else if (record.data.area === "vocabulary") { language.date = record.data.date; location.hash = "languageVocabulary"; }
    else { const lesson = ofKind("languageLesson").find(r => r.id === record.data.resourceId); if (lesson) language.openLesson(lesson, true, element); }
    return;
  }
  if (action === "transaction-filters-toggle") { transactionFiltersOpen = !transactionFiltersOpen; render(); return; }
  if (action === "notifications-filter") { notificationFilter = element.dataset.filter === "all" ? "all" : "unread"; renderNotifications(); return; }
  if (action === "notifications-refresh") { await refreshWorkspace(); return; }
  if (action === "workspace-search") { openWorkspaceSearch(); return; }
  if (action === "workspace-open") {
    $("#workspace-search-input").value = "";
    refreshWorkspaceSearch();
    window.dispatchEvent(new Event("damedast:menu-close"));
    if (element.dataset.page) { location.hash = element.dataset.page; return; }
    const record = records().find(r => r.id === id);
    if (!record) return;
    if (record.kind === "project") { projectId = id; location.hash = "projects"; render(); }
    else if (record.kind === "habit") { location.hash = "habits"; }
    else if (record.kind === "calendarEvent") planner.dialog(record);
    else openEditor(record.kind, id);
    return;
  }
  if (action === "project-open" || action === "projects-back") { projectId = action === "project-open" ? id : null; render(); return; }
  if (action === "project-create") {
    if (kind === "task") planner.dialog(null, { kind: "task", startDate: today(), projectId: id });
    else openEditor(kind, null, kind === "transaction" ? "expense" : null, { projectId: id });
    return;
  }
  if (action === "project-detach") { await moveToProject(id, null); return; }
  if (action === "habit-toggle") {
    const habit = ofKind("habit").find(r => r.id === id), date = element.dataset.date;
    if (!habit || date > today() || date < habit.data.startDate) return;
    const log = ofKind("habitLog").find(r => r.data.habitId === id && r.data.date === date);
    await commit("habitLog", { habitId: id, date, done: log ? log.data.done === false : true }, log?.id || await habitLogId(id, date), false, log?.version ?? 0);
    return;
  }
  if (action === "clip-inbox") {
    const targetSpace = space, clips = await extensionClips();
    if (space !== targetSpace) return;
    clipInbox = clips;
    notify("Review saved clips", clips.length ? clips.map(clip => `<article class="workspace-row"><div><strong dir="auto">${esc(clip.title)}</strong><p dir="auto">${esc(clip.excerpt.slice(0, 250))}</p></div><button class="primary" data-action="clip-review" data-id="${clip.id}">${t("Review and save")}</button></article>`).join("") : t("No saved clips."));
    return;
  }
  if (action === "clip-review") {
    const clip = clipInbox.find(clip => clip.id === id); if (!clip) return;
    $("#notice").close();
    const existing = records().find(r => r.id === clip.id);
    if (existing) { void acknowledgeClip(clip.id); openEditor(existing.kind, existing.id); }
    else openEditor("bookmark", null, null, { ...clip, clipId: clip.id });
    return;
  }
  if (action === "nav-pin") {
    if (!pinnablePages.includes(element.dataset.page)) return;
    try {
      navPins = togglePin(navPins, element.dataset.page);
      savePins(navPins);
      renderChrome();
    } catch (error) { toast(error.message); }
    return;
  }
  if (action === "notes-view") {
    notesView = notesView === "grid" ? "list" : "grid";
    try { localStorage.setItem(scopedStorageKey("damedast-notes-view"), notesView); } catch {}
    render();
    $('[data-action="notes-view"]')?.focus();
    return;
  }
  if (action === "dashboard-privacy") {
    dashboardAmountsVisible = !dashboardAmountsVisible;
    render();
    $('[data-action="dashboard-privacy"]')?.focus();
    return;
  }
  if (action === "plan-row-add") {
    event.preventDefault();
    if (document.querySelectorAll("[data-plan-row]").length >= 30)
      throw Error("Use at most 30 categories.");
    $("#plan-editor-rows").insertAdjacentHTML(
      "beforeend",
      planEditorRow(
        { category: categoryOptions()[0][0], basisPoints: 0 },
        categoryOptions(),
      ),
    );
    updatePlanTotal();
    return;
  }
  if (action === "plan-row-remove") {
    event.preventDefault();
    element.closest("[data-plan-row]").remove();
    updatePlanTotal();
    return;
  }
  if (action === "note-pin" || action === "organizer-pin") {
    const r = records().find((r) => r.id === id);
    if (r && ["note", "reminder", "goal"].includes(r.kind)) {
      const data = { ...r.data, pinned: !r.data.pinned };
      if (r.kind === "note") data.updatedOn = today();
      await commit(r.kind, data, id, false, r.version);
    }
    return;
  }
  if(["note-reminder-edit","note-reminder-delete","note-reminder-complete"].includes(action)){
    const record=records().find(r=>r.id===id&&r.kind==="note"&&r.data.status!=="trashed"&&r.data.reminder);
    if(!record)return;notePage.activate(context());
    if(action==="note-reminder-edit")notePage.reminderDialog(id);
    else await notePage.patch([id],d=>({reminder:action==="note-reminder-delete"?null:{...d.reminder,completed:!d.reminder.completed}}));
    return;
  }
  if (action === "task-add") { planner.dialog(null, { kind: "task", startDate: today() }); return; }
  if (action === "task-toggle") {
    const record = records().find(record => record.id === id && record.kind === "calendarEvent" && record.data.kind === "task");
    if (record) await commit(record.kind, toggleTask(record.data, element.dataset.date || today()), id, false, record.version);
    return;
  }
  if (action === "todo-toggle") {
    const r = ofKind("note").find((r) => r.id === id);
    if (r)
      await commit(
        "note",
        {
          ...r.data,
          updatedOn: today(),
          checklist: (r.data.checklist || []).map((item) =>
            item.id === element.dataset.taskId
              ? { ...item, done: !item.done }
              : item,
          ),
        },
        id,
        false,
        r.version,
      );
    return;
  }
  if (action === "reminder-complete") {
    const r = ofKind("reminder").find((r) => r.id === id);
    if (r)
      await commit(
        "reminder",
        { ...r.data, completed: !r.data.completed },
        id,
        false,
        r.version,
      );
    return;
  }
  if (action === "notifications-open") {
    renderNotifications();
    $("#notification-center").showModal();
    return;
  }
  if (action === "notifications-close") {
    $("#notification-center").close();
    return;
  }
  if (action === "notification-read" || action === "notification-open") {
    const n = organizerReport(records(), context().now).notifications.find(
      (n) => notificationKey(n) === element.dataset.key,
    );
    if (n) {
      await markNotificationsRead([n]);
      if (action === "notification-open") {
        $("#notification-center").close();
        location.hash = n.url.split("#")[1];
        const record = records().find(record=>record.id===n.sourceId);
        if (n.checkType === "spending") {
          openEditor("budget", n.budgetId || null, null, { category: n.category, month: n.month, calendar: "persian" });
        } else if (record?.kind === "calendarEvent") {
          planner.dialog(record, { occurrence: n.date });
        } else if (record && ["reminder", "goal", "installment", "monthlyExpense", "developmentEntry"].includes(record.kind)) {
          openEditor(record.kind, record.id);
        }
      }
    }
    return;
  }
  if (action === "notifications-read-all") {
    await markNotificationsRead(
      organizerReport(records(), context().now).notifications.filter(
        (n) => !n.read,
      ),
    );
    return;
  }
  if (action === "market-category") {
    marketCategory = [
      "all",
      "crypto",
      "metals",
      "fx",
      "funds",
      "stocks",
    ].includes(element.dataset.category)
      ? element.dataset.category
      : "all";
    render();
    return;
  }
  if (action === "recurring-pay") {
    const r = ofKind("monthlyExpense").find((r) => r.id === id);
    if (!r) return;
    const paymentMonth = element.dataset.month || selectedMonth;
    const due = recurringForMonth(records(), paymentMonth).find(
      (x) => x.id === id,
    );
    if (due?.payment) {
      toast("This monthly expense is already recorded.");
      return;
    }
    openEditor("transaction", null, "expense", {
      amount: r.data.amount,
      category: r.data.category,
      accountId: r.data.accountId || ofKind("account")[0]?.id,
      note: r.data.title,
      date: inMonth(today(), paymentMonth) ? today() : due.dueDate,
      recurringExpenseId: id,
      recurringMonth: paymentMonth,
    });
    return;
  }
  if (action === "benchmarks-refresh") {
    await loadBenchmarks();
    return;
  }
  if (action === "benchmark-import") {
    await importBenchmarkPrices();
    return;
  }

  if (action === "connected-legacy") {
    const response = await network("/api/portfolio/legacy");
    if (!response.ok) throw Error("Server unavailable.");
    const snapshot = await response.json();
    await reviewPortfolio({
      format: BUNDLE,
      snapshots: snapshot.records
        .filter((r) => !r.deleted && r.kind === "externalSnapshot")
        .map((r) => r.data),
    });
    return;
  }
  if (action === "connected-read") {
    if (space === "demo") {
      toast("Exit demo to import your data.");
      return;
    }
    await receiveExtension();
    return;
  }
  if (action === "connected-import") {
    if (space === "demo") {
      toast("Exit demo to import your data.");
      return;
    }
    $("#connected-file").click();
    return;
  }
  if (action === "connected-export") {
    download(
      JSON.stringify(
        {
          format: BUNDLE,
          snapshots: space === "demo" ? demoPortfolio() : connected.snapshots,
        },
        null,
        2,
      ),
      "damdast-portfolio.json",
      "application/json",
    );
    return;
  }
  if (action === "connected-refresh") {
    await connected.sync();
    return;
  }
  if (action === "connected-cloud") {
    notify(
      "Reload cloud data?",
      t("Export first. Unsynced portfolio edits will be discarded."),
      [
        {
          label: "Export JSON",
          run: () =>
            download(
              JSON.stringify(
                { format: BUNDLE, snapshots: connected.snapshots },
                null,
                2,
              ),
              "damdast-portfolio-local.json",
              "application/json",
            ),
        },
        { label: "Keep server", run: () => connected.reloadCloud() },
      ],
    );
    return;
  }
  if (action === "asset-add") {
    openEditor("assetPosition");
    return;
  }
  if (action === "asset-edit") {
    const a = assetEntries(
      records(),
      space === "demo" ? demoPortfolio() : connected.snapshots,
      marketData,
    ).find((a) => a.key === element.dataset.key);
    if (a)
      openEditor("assetPosition", a.record?.id || null, null, {
        ...a.position,
        quantity: a.source?.quantity || a.quantity,
      });
    return;
  }
  if (action === "asset-select") {
    assetKey = element.dataset.key;
    render();
    void loadAssetHistory();
    return;
  }
  if (action === "asset-period") {
    assetPeriod = Number(element.dataset.days);
    render();
    void loadAssetHistory();
    return;
  }
  if (action === "asset-lot-add") {
    $("#asset-lots").insertAdjacentHTML("beforeend", assetLotRow());
    formatNumericFields($("#editor"));
    return;
  }
  if (action === "asset-lot-remove") {
    element.closest("[data-asset-lot]").remove();
    updateAssetPreview();
    return;
  }
  if (action === "add") {
    openEditor(kind);
  }
  if (action === "edit") {
    const record = records().find((r) => r.id === id);
    if (record) openEditor(record.kind, id);
  }
  if (action === "delete") {
    const record = records().find((r) => r.id === id);
    if (!record) return;
    if (record.kind === "category") {
      const key = "custom:" + id;
      if (
        records().some(
          (r) =>
            (["transaction", "budget", "monthlyExpense"].includes(r.kind) &&
              r.data.category === key) ||
            (r.kind === "allocationPlan" &&
              r.data.rows.some((row) => row.category === key)),
        )
      ) {
        toast("Move records using this category before deleting it.");
        return;
      }
    }
    if (
      record.kind === "account" &&
      ofKind("transaction").some(
        (r) => r.data.accountId === id || r.data.destinationId === id,
      )
    ) {
      toast("This account has transactions.");
      return;
    }
    notify("Delete this record?", t(record.kind === "habit" ? "This also deletes the habit history." : "Deletion syncs to your other devices."), [
      {
        label: "Delete",
        className: "danger",
        run: async () => {
          await commit(record.kind, null, id, true, record.version);
          toast("Deleted.");
        },
      },
    ]);
  }
  if (action === "transfer") openEditor("transaction", null, "transfer");
  if (action === "paid") { await installmentPayment(id); return; }
  if (action === "release") {
    const record = records().find((r) => r.id === id);
    if (record)
      notify(
        "Release this asset?",
        t("Released assets are removed from this list."),
        [
          {
            label: "Mark released",
            className: "primary",
            run: () => commit("locked", null, id, true, record.version),
          },
        ],
      );
  }
  if (action === "push") await enablePush();
  if (action === "review-pending")
    notify(
      "Unsynced changes",
      `${t("Export before discarding.")} ${t("This reloads the server version.")}`,
      [
        {
          label: "Export",
          run: () =>
            download(
              JSON.stringify(state.pending, null, 2),
              "damdast-pending.json",
              "application/json",
            ),
        },
        {
          label: "Discard unsynced changes",
          className: "danger",
          run: async () => {
            await withLock(async () => {
              state = await loadSpace(space);
              state.pending = [];
              await persist();
            });
            render();
            void sync();
          },
        },
      ],
    );
  if (action === "market-open") {
    marketSymbol = element.dataset.symbol;
    location.hash = "market";
    void loadHistory();
  }
  if (action === "market-symbol") {
    marketSymbol = element.dataset.symbol;
    void loadHistory();
  }
  if (action === "market-period") {
    marketPeriod = Number(element.dataset.days);
    void loadHistory();
  }
  if (action === "market-refresh") await loadMarket();
  if (action === "flow-period") {
    flowPeriod = element.dataset.period;
    render();
  }
  if (action === "demo") {
    if (!session.demoEnabled) return;
    await changeSpace("demo");
    if (!records().length || state.demoVersion !== DEMO_VERSION) {
      state = makeDemo();
      await persist();
      render();
    }
  }
  if (action === "reset-demo" && session.demoEnabled && space === "demo")
    notify("Reset sample data?", t("Demo only. Your records stay separate."), [
      {
        label: "Reset demo",
        run: async () => {
          state = makeDemo();
          await persist();
          render();
          toast("Sample data refreshed.");
        },
      },
    ]);
  if (action === "leave-demo")
    await changeSpace(
      session.authenticated ? `google:${session.userId}` : "guest",
    );
  if (action === "google") googleLogin();
  if (action === "sync") await sync();
  if (action === "csv") exportCsv();
  if (action === "install") install();
  if (["backup", "backup-notes", "backup-finance"].includes(action)) {
    const section = action === "backup-notes" ? "notes" : action === "backup-finance" ? "finance" : "all";
    toast("Preparing backup…");
    const backup = await createBackup({
      records: records(),
      section,
      scope: space,
      request: network,
      prefs: { ...preferences(), language: getLanguage(), theme: getTheme() },
    });
    download(
      JSON.stringify(backup, null, 2),
      `damdast-${section === "all" ? "full" : section}-backup.json`,
      "application/json",
    );
  }
  if (action === "workspace-google") {
    localStorage.removeItem(scopedStorageKey("damdast-active-local-workspace"));
    await changeSpace(`google:${session.userId}`);
  }
  if (action === "restore-backup")
    document.querySelector("#backup-import").click();
  if (action === "migrate-guest") await migrateGuest();
  if (action === "logout") await logout();
}
document.addEventListener(
  "click",
  (event) => void onAction(event).catch(showError),
);
document.addEventListener("submit", event => {
  if (event.target.id !== "transaction-filters") return;
  event.preventDefault();
  try {
    transactionFilters = normalizeTransactionFilters({ ...Object.fromEntries(new FormData(event.target)), sort: transactionFilters.sort });
    render();
  } catch (error) { event.target.querySelector(".transaction-filter-error").textContent = t(error.message); }
});
document.addEventListener("reset", event => {
  if (event.target.id !== "transaction-filters") return;
  event.preventDefault(); transactionFilters = { sort: transactionFilters.sort }; render();
});
document.addEventListener("submit", event => {
  if (!event.target.matches("[data-weight-log-form]")) return;
  event.preventDefault();
  void submitWeightLog(event.target);
});
document.addEventListener("submit", event => {
  if (!event.target.matches("[data-theme-form]")) return;
  event.preventDefault();
  const selected = new FormData(event.target).get("themeChoice");
  if (!isTheme(selected)) return;
  setTheme(selected);
  themeDraft = null;
  render();
  toast("Saved.");
});
$("#editor-form").addEventListener("submit", submitEditor);
$("#editor-form").addEventListener(
  "invalid",
  (event) => {
    event.target.setCustomValidity(
      t(
        event.target.validity.valueMissing
          ? "Complete this field."
          : "Check this value.",
      ),
    );
  },
  true,
);
$("#editor-form").addEventListener("input", (event) => {
  event.target.setCustomValidity?.("");
});
$("#cancel-button").onclick = () => $("#editor").close();
$("#google-button").onclick = googleLogin;
$("#sync-button").onclick = () => void refreshWorkspace();
$("#theme-button").onclick = () => {
  settingsGroupsOpen.appearance = true;
  location.hash = "settings";
  render();
};

document.addEventListener("change", (event) => {
  if (event.target.name === "development-day") {
    developmentDate = event.target.value;
    render(); return;
  }
  if (editorKind === developmentKind && event.target.closest("#editor")) {
    const root = $("#dialog-fields"); toggleDevelopmentFields(root);
    if (event.target.name === "date" && root.dataset.wordsDirty !== "true")
      root.querySelector('[name="developmentWords"]').value = dailyVocabulary(records(), event.target.value).data.words.map(w => `${w.term} | ${w.meaning} | ${w.example}`).join("\n");
    if (event.target.name === "developmentFile" && !root.querySelector('[name="title"]').value)
      root.querySelector('[name="title"]').value = event.target.files[0]?.name.replace(/\.(md|markdown)$/i, "") || "";
  }
  if (event.target.id === "transaction-sort") {
    transactionFilters = normalizeTransactionFilters({ ...transactionFilters, sort: event.target.value });
    render(); return;
  }

  if (event.target.name === "marketSymbol") {
    const instrument = marketInstruments.find(
        (i) => i.symbol === event.target.value,
      ),
      name = $("[name=name]");
    if (instrument && name && (!name.value || name.dataset.autoName === "1")) {
      name.value = getLanguage() === "fa" ? instrument.nameFa : instrument.name;
      name.dataset.autoName = "1";
    }
    updateAssetPreview();
  }
  if (
    event.target.matches(
      "[data-solar-year],[data-solar-month],[data-solar-day]",
    )
  ) {
    const result = updateCalendarControl(event.target);
    if (result?.reporting) {
      selectedMonth = result.value;
      render();
    }
    return;
  }
  if (event.target.matches("[data-recurring-end]")) {
    $("#recurring-end-field").hidden = !event.target.checked;
    return;
  }
  if (event.target.id === "benchmark-cap") {
    benchmarkCap = Number(numInput(event.target.value));
    render();
    return;
  }
  if (event.target.id === "benchmark-fund-min") {
    benchmarkFundMin = Number(numInput(event.target.value));
    render();
    return;
  }

  if (event.target.id === "connected-file" && event.target.files[0]) {
    const file = event.target.files[0];
    event.target.value = "";
    void (async () => {
      if (file.size > 2500000) throw Error("Portfolio file is too large.");
      await reviewPortfolio(JSON.parse(await file.text()));
    })().catch((error) => notify("Import failed.", esc(t(error.message))));
    return;
  }
  if (event.target.matches(".native-picker-input")) {
    event.target
      .closest(".native-picker-field")
      .querySelector(".native-picker-caption").textContent = pickerCaption(
      event.target.type,
      event.target.value,
    );
  }
  if (event.target.id === "month-picker" && event.target.value) {
    selectedMonth = event.target.value;
    render();
  }
  if (event.target.id === "type-filter") {
    typeFilter = event.target.value;
    render();
  }
  if(event.target.matches("[data-note-preference]")){
    saveNoteSettings(space,{[event.target.dataset.notePreference]:event.target.type === "checkbox" ? event.target.checked : event.target.value});
    notePage.reloadSettings();render();
  }
  if (event.target.id === "language-setting")
    void changeLanguage(event.target.value);
  if (event.target.name === "themeChoice") themeDraft = event.target.value;
});
document.addEventListener(
  "toggle",
  (event) => {
    const group = event.target;
    if (group.matches?.("[data-nav-group]") && group.isConnected) {
      navGroupsOpen[group.dataset.navGroup] = group.open;

    }
  },
  true,
);
document.addEventListener("input", (event) => { if (event.target.name === "developmentWords") $("#dialog-fields").dataset.wordsDirty = "true"; });
document.addEventListener("input", (event) => {
  if (editorKind === "assetPosition" && event.target.name === "name")
    event.target.dataset.autoName = "0";
  if (event.target.closest?.("[data-asset-lot]")) updateAssetPreview();
  if (event.target.id === "market-search") {
    const cursor = event.target.selectionStart;
    marketSearch = event.target.value;
    render();
    $("#market-search").focus();
    $("#market-search").setSelectionRange(cursor, cursor);
    return;
  }
  if (event.target.matches("[data-plan-percent]")) {
    updatePlanTotal();
    return;
  }
  if (event.target.id === "search") {
    const cursor = event.target.selectionStart;
    filter = event.target.value;
    render();
    $("#search").focus();
    $("#search").setSelectionRange(cursor, cursor);
  }
});
window.addEventListener("hashchange", () => {
  render();
  if (page === "workbench") window.scrollTo(0, 0);
  if (page === "assets") void loadAssetHistory();
  if (page === "market" && !marketHistory.length && !marketHistoryLoading)
    void loadHistory();
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener("online", () => {
  updateStatus();
  void sync();
  if (["overview", "market", "workbench"].includes(page)) void loadMarket();
});
window.addEventListener("damedast:session-changed", reloadAccount);
window.addEventListener("offline", () => {
  updateStatus();
  if (marketData) marketData = { ...marketData, stale: true };
  renderIfMarketVisible();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getTheme() === "system") render();
});
window.addEventListener("storage", (event) => {
  if (event.key === "damdast-language") {
    setLanguage(event.newValue);
    render();
  }
  if (event.key === "damdast-theme") {
    setTheme(event.newValue);
    render();
  }
});
channel?.addEventListener("message", async (event) => {
  if (ready && ((event.data.logout && accountSpace(session) === `google:${event.data.logout}`) ||
      (event.data.accountChanged && event.data.accountChanged !== accountSpace(session)))) {
    reloadAccount(); return;
  }
  if (ready && event.data.space === space && !syncPromise) {
    state = await loadSpace(space);
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ready) {
    void sync();
    if (
      ["overview", "market", "assets", "workbench"].includes(page) &&
      Date.now() - lastMarketRead > 300000
    )
      void loadMarket();
  }
});
setInterval(() => {
  if (ready && document.visibilityState === "visible") void sync();
  if (ready && document.visibilityState === "visible" && space !== "demo")
    void connected.sync();
}, 30000);
setInterval(() => {
  if (
    ready &&
    document.visibilityState === "visible" &&
    ["overview", "market", "assets", "workbench"].includes(page)
  )
    void loadMarket();
}, 300000);
let accountReloading = false;
function reloadAccount() {
  if (accountReloading) return;
  accountReloading = true; ready = false;
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
  $("#view").replaceChildren();
  profileMenu.toggle(false);
  location.reload();
}
async function boot() {
  applyPreferences();
  try {
    try {
      const cached = JSON.parse(
        localStorage.getItem("damdast-market") || "null",
      );
      if (isValidMarket(cached)) marketData = { ...cached, stale: true };
    } catch {}
    try {
      const response = await network("/api/session", { cache: "no-store" });
      if (!response.ok) throw Error();
      session = await response.json();
    } catch {
      // A cached identifier is not a verified session on a shared browser.
      session = { authenticated:false, googleConfigured:false, demoEnabled:true };
    }
    setAccountScope(session);
    localStorage.removeItem("damedast-last-user");
    localStorage.removeItem("damdast-portfolio-user");
    navPins = readPins(pinnablePages);
    notesView = localStorage.getItem(scopedStorageKey("damedast-notes-view")) === "list" ? "list" : "grid";
    space = initialSpace(session, localStorage.getItem(scopedStorageKey("damdast-active-local-workspace")), restoredWorkspaces(), new URLSearchParams(location.search).has("demo"));
    if (space !== "demo" && new URLSearchParams(location.search).has("demo")) {
      const url = new URL(location.href); url.searchParams.delete("demo"); history.replaceState(null,"",url.pathname+url.search+url.hash);
    }
    channel?.postMessage({ accountChanged:accountSpace(session) });
    state = await loadSpace(space);
    if (
      space === "demo" &&
      (!materialize(state).length || state.demoVersion !== DEMO_VERSION)
    ) {
      state = makeDemo();
      await persist();
    }
    try {
      const cached = await loadSpace("public:benchmarks");
      if (cached?.series) benchmarkData = cached;
    } catch {}
    ready = true;
    render();
    void connected.initialize(session).catch(() => {});
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    void sync();
    if (page === "market") void loadHistory();
    if (page === "assets") void loadAssetHistory();
    if (new URLSearchParams(location.search).get("authError")) {
      notify(
        "Sign-in failed.",
        t(
          ({ "not-configured": "Google sign-in is temporarily unavailable. Please try again later.",
            correlation: "Google sign-in could not verify its browser cookie. Use the same localhost address throughout sign-in, allow cookies, and try again.",
            denied: "Google sign-in was cancelled or this account is not an OAuth test user.",
            credentials: "Google rejected the client credentials. Check the Web application client in Google Cloud and restart the app.",
            google: "Google sign-in failed. Please try again."
          })[new URLSearchParams(location.search).get("authError")] || "Try signing in again.",
        ),
      );
      history.replaceState(null, "", location.pathname + location.hash);
    }
  } catch {
    $("#view").innerHTML =
      `<section class="panel empty"><h1>${t("Browser storage unavailable.")}</h1><p>${t("Allow local storage and reopen the app.")}</p></section>`;
  }
}
void boot();

async function receiveExtension() {
  const nonce = crypto.randomUUID();
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", listener);
      reject(
        Error("Connect the extension to this app URL, then reload this page."),
      );
    }, 6000);
    const listener = (event) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.nonce !== nonce ||
        event.data?.type !== "damdast:result"
      )
        return;
      clearTimeout(timeout);
      window.removeEventListener("message", listener);
      event.data.ok
        ? resolve(event.data.bundle)
        : reject(Error("Extension connection failed."));
    };
    window.addEventListener("message", listener);
    window.postMessage({ type: "damdast:read", nonce }, location.origin);
  });
  await reviewPortfolio(result);
}
async function reviewPortfolio(input) {
  if (space === "demo") throw Error("Exit demo to import your data.");
  const snapshots = normalizeBundle(input);
  notify(
    "Import portfolio?",
    `<div class="connected-import-preview">${snapshots.map((s) => `<div class="connected-review-row"><strong>${esc(isRtl() ? PROVIDERS[s.provider].fa : PROVIDERS[s.provider].name)}</strong><p dir="auto">${esc(s.account)} · ${esc(s.scope)} · ${money(s.items.length)} ${t("Rows")}</p><small>${t(s.coverage === "complete" ? "Complete list replaces missing rows in the same source." : "Partial list keeps previous rows.")}</small></div>`).join("")}</div><p>${t("Reviewed snapshots will sync to your app account when signed in.")}</p>`,
    [
      {
        label: "Import captures",
        className: "primary",
        run: async () => {
          await connected.import({ format: BUNDLE, snapshots });
          toast("Saved.");
        },
      },
    ],
  );
}

function percentBasis(value) {
  const text = String(value)
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace("٫", ".")
    .trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text))
    throw Error("Use up to 2 decimal places for percentages.");
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
function collectPlanRows() {
  return [...document.querySelectorAll("[data-plan-row]")].map((row) => ({
    category: row.querySelector("[data-plan-category]").value,
    basisPoints: percentBasis(row.querySelector("[data-plan-percent]").value),
  }));
}
function updatePlanTotal() {
  const target = $("#plan-percent-total");
  if (!target) return;
  try {
    const sum = collectPlanRows().reduce((s, r) => s + r.basisPoints, 0);
    target.textContent = localizedNumber(sum / 100, 2) + "%";
    target.classList.toggle("negative", sum > 10000);
  } catch {
    target.textContent = t("Check percentages.");
  }
}
async function loadBenchmarks() {
  if (benchmarkLoading) return;
  benchmarkLoading = true;
  lastBenchmarkRead = Date.now();
  benchmarkError = "";
  if (ready && page === "suggestions") render();
  try {
    const r = await network("/api/benchmarks");
    if (!r.ok) throw Error();
    const value = await r.json();
    if (!value || !value.series) throw Error();
    benchmarkData = value;
    try {
      await saveSpace("public:benchmarks", value);
    } catch {}
  } catch {
    benchmarkError = "Price history is unavailable. You can import CSV.";
  } finally {
    benchmarkLoading = false;
    if (ready && page === "suggestions") render();
  }
}
async function importBenchmarkPrices() {
  if (!$("#benchmark-adjusted").checked)
    throw Error("Confirm that these are comparable adjusted unit prices.");
  const imports = parseBenchmarkCsv(
    $("#benchmark-csv").value,
    $("#benchmark-symbol").value,
    $("#benchmark-unit").value,
    $("#benchmark-source").value,
  );
  notify(
    "Import price history?",
    imports
      .map(
        (s) =>
          `<p>${esc(s.symbol)} · ${money(s.points.length)} ${t("Rows")} · ${esc(s.source)}</p>`,
      )
      .join(""),
    [
      {
        label: "Import captures",
        className: "primary",
        run: async () => {
          await withLock(async () => {
            state = await loadSpace(space);
            for (const data of imports) {
              const old = materialize(state).find(
                (r) =>
                  !r.deleted &&
                  r.kind === "benchmarkSeries" &&
                  r.data.symbol === data.symbol &&
                  r.data.year === data.year,
              );
              const merged = new Map(
                (old?.data.points || []).map((p) => [p.date, p]),
              );
              for (const p of data.points) merged.set(p.date, p);
              state.pending.push({
                operationId: crypto.randomUUID(),
                id: old?.id || crypto.randomUUID(),
                kind: "benchmarkSeries",
                expectedVersion: old?.version || 0,
                delete: false,
                data: {
                  ...data,
                  points: [...merged.values()].sort((a, b) =>
                    a.date.localeCompare(b.date),
                  ),
                },
              });
            }
            await persist();
          });
          render();
          if (space.startsWith("google:")) void sync();
        },
      },
    ],
  );
}

function updateNotificationBell() {
  if (!state) return;
  const report = organizerReport(
      records(),
      new Date(Date.now() + serverClockSkew),
    ),
    button = $("#notifications-button");
  if (!button) return;
  button.classList.toggle("has-unread", report.unread > 0);
  button.setAttribute(
    "aria-label",
    t("Notifications") +
      (report.unread ? " · " + localizedNumber(report.unread) : ""),
  );
  button.innerHTML =
    icon("bell") +
    (report.unread
      ? `<span class="notification-count">${report.unread > 99 ? "99+" : localizedNumber(report.unread)}</span>`
      : "");
  const dialog = $("#notification-center");
  if (dialog?.open || (dialog && !dialog.innerHTML)) renderNotifications();
}
function renderNotifications() {
  const dialog = $("#notification-center"), html = notificationsMarkup(context());
  if (html === notificationsHtml && dialog.innerHTML) return;
  const scroll = dialog.querySelector(".notification-list")?.scrollTop || 0;
  const focused = dialog.contains(document.activeElement) ? { action: document.activeElement.dataset.action, key: document.activeElement.dataset.key } : null;
  dialog.innerHTML = html; notificationsHtml = html;
  const list = dialog.querySelector(".notification-list");
  if (list) list.scrollTop = scroll;
  if (focused) [...dialog.querySelectorAll("button")].find(button=>button.dataset.action===focused.action && button.dataset.key===focused.key)?.focus({preventScroll:true});
}
async function markNotificationsRead(notifications) {
  await withLock(async () => {
    state = await loadSpace(space);
    const known = new Set(
      materialize(state)
        .filter((r) => !r.deleted && r.kind === "notificationRead")
        .map((r) => notificationKey(r.data)),
    );
    for (const n of notifications) {
      const key = notificationKey(n);
      if (known.has(key)) continue;
      known.add(key);
      state.pending.push({
        operationId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        kind: "notificationRead",
        expectedVersion: 0,
        delete: false,
        data: {
          sourceId: n.sourceId,
          occurrence: n.occurrence,
          itemKey: n.itemKey || null,
        },
      });
    }
    await persist();
  });
  render();
  if (space.startsWith("google:")) void sync();
}
setInterval(() => {
  if (ready && document.visibilityState === "visible") updateNotificationBell();
}, 15000);

function financeSyncBatch(pending) {
  const result = [];
  let size = 20;
  for (const change of pending.slice(0, 100)) {
    const bytes = new TextEncoder().encode(JSON.stringify(change)).length;
    if (bytes > 800000) throw Error("Drawing note is too large.");
    if (size + bytes > 1000000) break;
    result.push(change);
    size += bytes + 1;
  }
  return result;
}
function collectAssetLots() {
  return [...document.querySelectorAll("[data-asset-lot]")].map((row) => ({
    id: row.dataset.lotId,
    quantity: normalizeDecimal(row.querySelector("[data-lot-quantity]").value),
    costToman: row.querySelector("[data-lot-cost]").value.trim()
      ? normalizeDecimal(row.querySelector("[data-lot-cost]").value, 2)
      : null,
    boughtOn: row.querySelector("input[type=hidden]").value,
  }));
}
function parseAssetValuations(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line) => {
      const [raw, ...amount] = line.split(",");
      let date = plainNumeric(raw).replaceAll("/", "-");
      if (/^1[34]\d\d-/.test(date)) {
        const [y, m, d] = date.split("-").map(Number);
        date = fromJalali(y, m, d);
      }
      if (!validIso(date)) throw Error("Enter a valid asset valuation.");
      return { date, valueToman: normalizeDecimal(amount.join(","), 2) };
    });
}
async function loadAssetHistory() {
  const entries = assetEntries(
    records(),
    space === "demo" ? demoPortfolio() : connected.snapshots,
    marketData,
  );
  const a =
    entries.find((a) => a.key === assetKey) ||
    entries.find((a) => a.position.lots.some((l) => l.costToman != null)) ||
    entries[0];
  if (!a?.symbol || !a.position.lots.some((l) => l.costToman != null)) {
    assetHistoryLoading = false;
    return;
  }
  assetKey = a.key;
  const generation = ++assetGeneration;
  assetHistoryLoading = true;
  render();
  try {
    const symbols = [
      a.symbol,
      ...(marketInstruments
        .find((i) => i.symbol === a.symbol)
        ?.unit.startsWith("USD")
        ? ["USD"]
        : []),
    ];
    const curves = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await network(
          "/api/market/history?symbol=" +
            encodeURIComponent(symbol) +
            "&days=" +
            assetPeriod,
        );
        if (!response.ok) return [symbol, []];
        const points = await response.json();
        return [symbol, Array.isArray(points) ? points : []];
      }),
    );
    if (generation === assetGeneration)
      for (const [symbol, points] of curves) assetCurves[symbol] = points;
  } catch {
  } finally {
    if (generation === assetGeneration) {
      assetHistoryLoading = false;
      if (page === "assets") render();
    }
  }
}
installNumericFormatting();

function updateAssetPreview() {
  const target = $("#asset-live-preview");
  if (!target) return;
  const symbol = $("[name=marketSymbol]")?.value,
    instrument = marketInstruments.find((i) => i.symbol === symbol),
    quote = marketData?.quotes?.find((q) => q.symbol === symbol),
    fx = marketData?.quotes?.find((q) => q.symbol === "USD");
  document
    .querySelectorAll("[data-quantity-unit]")
    .forEach(
      (el) =>
        (el.textContent = instrument
          ? "· " + t(instrument.unit.split("/").at(-1).trim())
          : ""),
    );
  let quantity = 0n;
  try {
    for (const field of document.querySelectorAll("[data-lot-quantity]"))
      quantity += decimalUnits(
        plainNumeric(field.value).replace(/\.$/, "") || "0",
      );
  } catch {}
  if (!instrument || !quote || (instrument.unit.startsWith("USD") && !fx)) {
    target.textContent = t(
      "Choose an asset type to fetch its market price, or enter a manual valuation.",
    );
    return;
  }
  const fxPrice = instrument.unit.startsWith("USD") ? fx.price : null,
    price = marketValueCents("1", quote.price, fxPrice),
    value = marketValueCents(decimalText(quantity), quote.price, fxPrice),
    formatted = (cents) =>
      cents === null
        ? "—"
        : groupedNumeric(decimalText(cents, 2), getLanguage());
  target.innerHTML = `${t("Unit price")}: <bdi dir="ltr">${formatted(price)}</bdi> ${t("toman")} / ${t(instrument.unit.split("/").at(-1).trim())}<br>${t("Estimated asset value")}: <bdi dir="ltr">${formatted(value)}</bdi> ${t("toman")}`;
}

document
  .querySelector("#backup-import")
  .addEventListener("change", async (event) => {
    const input = event.target,
      file = input.files?.[0];
    if (!file) return;
    try {
      const backup = await readBackupFile(file);
      notify(
        "Restore a backup copy",
        `${money(backup.records.length)} ${t("records")} · ${money(backup.whiteboards?.length || 0)} ${t("canvases")} · ${t("A separate local workspace will be created. Your current records stay untouched.")}`,
        [
          {
            label: "Restore",
            className: "primary",
            run: async () => {
              const restored = await restoreBackup(backup, space);
              await saveSpace(restored.scope, {
                snapshot: { revision: 0, records: restored.records },
                pending: [],
              });
              rememberRestoredWorkspace(
                restored.scope,
                t(backup.section === "notes" ? "Notes backup" : backup.section === "finance" ? "Financial backup" : "Backup copy") +
                  " · " +
                  new Date().toLocaleDateString(
                    getLanguage() === "fa" ? "fa-IR" : "en-US-u-ca-persian",
                  ),
              );
              if (backup.preferences) {
                savePreferences(backup.preferences);
                if (["en", "fa"].includes(backup.preferences.language))
                  setLanguage(backup.preferences.language);
                if (
                  isTheme(backup.preferences.theme)
                )
                  setTheme(backup.preferences.theme);
              }
              await changeSpace(restored.scope);
              location.hash = "settings";
              toast("Backup restored in a separate workspace.");
            },
          },
        ],
      );
    } catch (error) {
      showError(error);
    } finally {
      input.value = "";
    }
  });
document.addEventListener("change", async (event) => {
  const el = event.target;
  if (el.matches("[data-preference]")) {
    const key = el.dataset.preference;
    savePreferences({
      [key]:
        ["holidays", "workbenchEditing"].includes(key)
          ? el.checked
          : key === "weekStart"
            ? Number(el.value)
            : el.value,
    });
    render();
  }
  if (el.matches("#workspace-setting")) {
    if (el.value === "google")
      localStorage.removeItem(scopedStorageKey("damdast-active-local-workspace"));
    else localStorage.setItem(scopedStorageKey("damdast-active-local-workspace"), el.value);
    await changeSpace(
      el.value === "google" ? `google:${session.userId}` : el.value,
    );
  }
});
window.addEventListener("resize", () => {
  if(ready)synchronizePageToolbar(page,t(sections[page][0]));
  if (ready && page === "workbench" && !desk.isInteracting) render();
});
document.addEventListener("click", (event) => {
  for (const detail of document.querySelectorAll(".setting-info[open]"))
    if (!detail.contains(event.target)) detail.open = false;
});

function workspacePages() { return Object.entries(sections).map(([id, [label]]) => ({ id, title: t(label) })); }
function refreshWorkspaceSearch() {
  if (!state) return;
  const query = $("#workspace-search-input").value;
  const searching = !!query.trim();
  $("#workspace-search-results").hidden = !searching;
  $("#navigation").hidden = searching;
  $("#workspace-label").hidden = searching;
  $("#workspace-search-results").innerHTML = searching ? searchResults(context(), query, workspacePages()) : "";
}
function openWorkspaceSearch() {
  window.dispatchEvent(new Event("damedast:menu-open"));
  refreshWorkspaceSearch();
  $("#workspace-search-input").focus();
}
$("#workspace-search-input").addEventListener("input", refreshWorkspaceSearch);
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openWorkspaceSearch(); }
  if (event.key === "ArrowDown" && event.target.id === "workspace-search-input") { event.preventDefault(); $("#workspace-search-results button")?.focus(); }
  if (event.key === "Enter" && event.target.id === "workspace-search-input") { event.preventDefault(); $("#workspace-search-results button")?.click(); }
});
async function moveToProject(id, nextProject) {
  let r = records().find(r => r.id === id);
  if (r?.data.installmentId) r = records().find(item => item.id === r.data.installmentId);
  if (r && projectKinds.includes(r.kind)) await commit(r.kind, { ...r.data, projectId: nextProject }, r.id, false, r.version);
}
document.addEventListener("submit", event => {
  if (event.target.id !== "project-attach-form") return;
  event.preventDefault();
  const form = event.target;
  void moveToProject(form.elements.recordId.value, form.dataset.projectId).catch(showError);
});
async function installmentPayment(id) {
  const record = ofKind("installment").find(r => r.id === id); if (!record) return;
  if (record.data.paid) {
    notify("Reverse payment?", t(record.data.payment ? "The linked expense will be removed and the account balance restored." : "This historical paid flag has no linked transaction."), [{ label: "Mark unpaid", className: "primary", run: () => commit("installment", { ...record.data, paid: false, payment: null }, id, false, record.version) }]);
    return;
  }
  const accounts = ofKind("account"); if (!accounts.length) { toast("Create an account first."); openEditor("account"); return; }
  const scope = space, dialog = $("#payment-dialog");
  dialog.innerHTML = `<form><div class="dialog-heading"><h2>${t("Record payment")}</h2><button type="button" class="icon-button" data-payment-close aria-label="${t("Close")}">×</button></div><p dir="auto">${esc(record.data.title)} · ${money(record.data.amount)} ${t("toman")}</p><label class="field">${t("Account")}<select name="accountId" required><option value="">${t("Choose account")}</option>${accounts.map(r => `<option value="${r.id}">${esc(r.data.name)}</option>`).join("")}</select></label><label class="field">${t("Category")}<select name="category">${categoryOptions().map(([value, label]) => `<option value="${esc(value)}" ${value === "Other" ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>${dateControl("Payment date", "paymentDate", today(), true)}<p class="small-note">${t("This settles the installment and records one account expense.")}</p><p class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary" data-payment-close>${t("Cancel")}</button><button type="submit" class="primary">${t("Mark paid")}</button></div></form>`;
  dialog.querySelectorAll("[data-payment-close]").forEach(button => button.onclick = () => dialog.close());
  const transactionId = crypto.randomUUID();
  dialog.querySelector("form").onsubmit = async event => {
    event.preventDefault(); const form = event.target, button = form.querySelector('[type="submit"]'); button.disabled = true;
    try {
      if (scope !== space) throw Error("This record changed. Reopen the form.");
      const values = Object.fromEntries(new FormData(form));
      await commit("installment", { ...record.data, paid: true, payment: { transactionId, accountId: values.accountId, category: values.category, date: values.paymentDate } }, id, false, record.version);
      dialog.close(); toast("Saved.");
    } catch (error) { form.querySelector(".form-error").textContent = t(error.message); button.disabled = false; }
  };
  dialog.showModal();
}
