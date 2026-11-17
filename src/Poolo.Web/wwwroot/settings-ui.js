import { monthControl } from "./calendar.js";
import { restoredWorkspaces } from "./backup.js";
import { t, getLanguage, getTheme } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { preferences, calendarVisibilityOptions } from "./preferences.js";
import { holidayData } from "./holidays.js";
export function info(label, text) {
  return `<details class="setting-info"><summary aria-label="${esc(t("About") + " " + t(label))}" title="${esc(t("More info"))}">i</summary><p role="note">${esc(t(text))}</p></details>`;
}
const row = (label, help, control) =>
  `<div class="setting-row"><div class="setting-label"><label>${t(label)}</label>${info(label, help)}</div><div class="setting-control">${control}</div></div>`;
const option = (value, title, selected) =>
  `<option value="${value}" ${selected === value ? "selected" : ""}>${t(title)}</option>`;
export function settingsPage(c, { icon, actionButton, pageHeading }) {
  const p = preferences(),
    button = (action, label) => actionButton(action, label, "", "secondary");
  const workspaces = restoredWorkspaces();
  return `<div class="settings-page">${pageHeading(c, "Settings")}${workspaces.length ? `<section class="panel settings-workspace">${row("Workspace", "Restore creates a separate local workspace. Switch here to return to your other records.", `<select id="workspace-setting" aria-label="${t("Workspace")}">${c.session.authenticated ? `<option value="google" ${c.space.startsWith("google:") ? "selected" : ""}>${t("Google account")}</option>` : ""}<option value="guest" ${c.space === "guest" ? "selected" : ""}>${t("Local")}</option>${workspaces.map((w) => `<option value="${w.scope}" ${c.space === w.scope ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select>`)}</section>` : ""}<div class="settings-layout settings-v2">
 <section class="panel"><h2>${t("Appearance")}</h2>
 ${row("Language", "Changes the app language and reading direction.", `<select id="language-setting" aria-label="${t("Language")}">${option("en", "English", getLanguage())}${option("fa", getLanguage() === "en" ? "Fa" : "فارسی", getLanguage())}</select>`)}
 ${row("Theme", "Choose light, dark, or follow your device.", `<select id="theme-setting" aria-label="${t("Theme")}">${["light", "dark", "system"].map((v) => option(v, v[0].toUpperCase() + v.slice(1), getTheme())).join("")}</select>`)}
 <h2 class="settings-subtitle">${t("Calendar")}</h2>
 ${row("Calendar system", "Calendar views and repeating events can use Persian or Gregorian months.", `<select data-preference="calendar" aria-label="${t("Calendar system")}">${option("persian", "Solar Hijri", p.calendar)}${option("gregory", "Gregorian", p.calendar)}</select>`)}
 ${row("First day of week", "Sets the first column in week and month views.", `<select data-preference="weekStart" aria-label="${t("First day of week")}">${option(6, "Saturday", p.weekStart)}${option(1, "Monday", p.weekStart)}${option(0, "Sunday", p.weekStart)}</select>`)}
 ${row("Weekend", "Marks your non-working days without changing event dates.", `<select data-preference="weekend" aria-label="${t("Weekend")}">${option("friday", "Friday", p.weekend)}${option("thursday-friday", "Thursday and Friday", p.weekend)}${option("saturday-sunday", "Saturday and Sunday", p.weekend)}</select>`)}
 ${row("Iran holidays", "Shows holidays from the dated calendar dataset. Ad-hoc closures are not included.", `<label class="switch-control"><input type="checkbox" data-preference="holidays" ${p.holidays ? "checked" : ""} aria-label="${t("Iran holidays")}"><span></span></label>`)}
 ${row("Show on calendar", "Choose which items appear on your calendar. This choice is saved on this device.", `<div class="calendar-visibility-options" role="group" aria-label="${t("Show on calendar")}">${calendarVisibilityOptions.map(([kind, label]) => `<label class="planner-filter"><input type="checkbox" data-calendar-item="${kind}" ${p.calendarItems.includes(kind) ? "checked" : ""}><span class="kind-dot kind-${kind}"></span>${t(label)}</label>`).join("")}</div>`)}
 <a class="holiday-source" href="${holidayData.source}" target="_blank" rel="noopener noreferrer">${t("Holiday source")} · ${holidayData.years.join(" · ")}</a>
 </section>
 <section class="panel data-settings"><h2>${t("Data and devices")}</h2>
 ${row("Sign in / sign up", "Google identifies your account; records and drawings sync to your app server.", button(c.space.startsWith("google:") ? "sync" : c.session.authenticated ? "workspace-google" : "google", c.space.startsWith("google:") ? "Sync" : c.session.authenticated ? "Open Google workspace" : "Sign in / sign up"))}
 ${c.space.startsWith("google:") ? row("Pending changes", "Changes waiting to be accepted by the server.", button("review-pending", "Review pending")) + row("Guest data", "Copy local records into your signed-in workspace.", button("migrate-guest", "Import")) : ""}
 <details class="backup-settings"><summary>${t("Backups")}</summary>
 ${row("Notes backup", "Includes notes, handwriting, to-dos, calendar items, reminders and PDF files.", button("backup-notes", "Export notes"))}
 ${row("Financial backup", "Includes accounts, transactions, installments, budgets, assets and financial plans.", button("backup-finance", "Export finances"))}
 ${row("Full backup", "Includes both sections and all app preferences.", button("backup", "Export everything"))}
 </details>
 ${row("Restore backup", "Creates a separate local workspace from a validated backup. Your existing records are kept.", button("restore-backup", "Import backup"))}
 ${row("Reminders", "Background notifications need permission, sign-in and the .NET reminder service.", button("push", "Enable reminders"))}
 ${row("Device", "Install the same web app on your phone or desktop.", button("install", "Install app"))}
 ${c.session.authenticated ? row("Google account", "Signs this device out of your workspace.", button("logout", "Sign out")) : ""}
 </section></div>
 <details class="panel desk-settings-panel" id="workbench-settings" ${c.workbenchSettingsOpen ? "open" : ""}>
 <summary class="desk-settings-summary"><span>${icon("workbench")}<strong>${t("Workbench")}</strong></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary>
 <div class="desk-settings-content">
 ${row("Edit workbench", "Enable editing to move, resize and add cards directly on your workbench.", `<label class="switch-control"><input type="checkbox" data-preference="workbenchEditing" ${p.workbenchEditing ? "checked" : ""} aria-label="${t("Edit workbench")}"><span></span></label>`)}
 ${row("Reporting month", "Controls the period used by the financial components on your desk.", monthControl(c.month, "month", true))}
 ${row("Desk background", "Choose a background color for your workbench.", `<button class="secondary" data-desk-action="background">${t("Choose color")}</button>`)}
 <a class="secondary desk-open-link" href="#workbench">${t("Open workbench")}${icon("arrow")}</a>
 </div></details>
 <section class="panel google-setup"><details><summary>${t("Google sign-in setup")}</summary><p>${t("Google only identifies you. Your notes, drawings and financial records sync to this app server; Gmail messages are not accessed.")}</p><span class="badge">${t(c.session.googleConfigured ? "Ready to sign in" : "OAuth keys required")}</span><p>${t("Create a Web application OAuth client in Google Cloud, add your account as a test user, then register this exact redirect URI:")}</p><code>${esc(typeof location !== "undefined" ? location.origin : "https://YOUR-DOMAIN")}/signin-google</code><p>${t(c.session.hostedPreview ? "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as server secrets." : "Set Authentication:Google:ClientId and Authentication:Google:ClientSecret on the .NET server. Use scripts/setup-google.ps1 for local setup.")}</p></details><div class="demo-actions">${button("demo", "Try demo")}${c.space === "demo" ? button("reset-demo", "Reset demo") : ""}</div></section></div>`;
}
