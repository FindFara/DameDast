import { chevronIcon } from "./ui-icons.js";
import { notificationOptions } from "./notification-preferences.js";
import { dashboardSettings } from "./dashboard-settings-ui.js";
import { themeOptions } from "./themes.js";
import {readNoteSettings} from "./keep-preferences.js";
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
export function themePicker(selected = getTheme()) {
  return `<form class="theme-picker" data-theme-form><fieldset><legend>${t("Theme")}</legend><div class="theme-palette-options">${themeOptions.map(theme => `<label class="theme-palette-option" style="--preview-bg:${theme.background};--preview-accent:${theme.accent}"><input type="radio" name="themeChoice" value="${theme.id}" ${selected === theme.id ? "checked" : ""} required><span class="theme-palette-circle" aria-hidden="true"></span><span class="theme-palette-name">${t(theme.label)}</span></label>`).join("")}</div></fieldset><div class="theme-picker-actions"><button type="submit" class="primary">${t("Save")}</button></div></form>`;
}
export function settingsPage(c, { icon, actionButton, pageHeading }) {
  const p = preferences(), notes = readNoteSettings(c.space),
    button = (action, label) => actionButton(action, label, "", "secondary");
  const workspaces = restoredWorkspaces();
  const startGroup = (id, label, style = "") => `<details class="panel setting-group ${style}" data-setting-group="${id}" ${c.settingsGroupsOpen?.[id] ? "open" : ""}><summary><span>${t(label)}</span>${chevronIcon}</summary><div class="setting-group-content">`;
  const endGroup = `</div></details>`;
  return `<div class="settings-page">${pageHeading(c, "Settings")}<div class="settings-layout settings-v2">${workspaces.length ? `${startGroup("workspace", "Workspace", "settings-workspace")}${row("Workspace", "Restore creates a separate local workspace. Switch here to return to your other records.", `<select id="workspace-setting" aria-label="${t("Workspace")}">${c.session.authenticated ? `<option value="google" ${c.space.startsWith("google:") ? "selected" : ""}>${t("Google account")}</option>` : ""}${!c.session.authenticated ? `<option value="guest" ${c.space === "guest" ? "selected" : ""}>${t("Local")}</option>` : ""}${workspaces.map((w) => `<option value="${w.scope}" ${c.space === w.scope ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select>`)}${endGroup}` : ""}
 ${startGroup("appearance", "Appearance")}
 ${row("Language", "Changes the app language and reading direction.", `<select id="language-setting" aria-label="${t("Language")}">${option("en", "English", getLanguage())}${option("fa", getLanguage() === "en" ? "Fa" : "فارسی", getLanguage())}</select>`)}
 <div class="setting-row theme-setting-row"><div class="setting-label"><label>${t("Theme")}</label>${info("Theme", "Choose a two-color theme, then save.")}</div><div class="setting-control">${themePicker(c.themeDraft || getTheme())}</div></div>

 ${endGroup}${startGroup("dashboard", "Dashboard layout")}
 ${dashboardSettings(c.dashboardLayoutDraft || p.dashboardLayout, !!c.dashboardLayoutDraft, icon)}
 ${endGroup}${startGroup("notifications", "Notification settings")}
 <div class="notification-setting-options">${notificationOptions.map(([id,label]) => `<label class="notification-setting-option"><span>${t(label)}</span><input type="checkbox" role="switch" data-notification-kind="${id}" ${p.notificationKinds.includes(id) ? 'checked' : ''} aria-label="${t(label)}"></label>`).join('')}</div>
 ${endGroup}${startGroup("notes", "Notes settings")}
 ${row("Default notes view", "Choose the initial layout for your notes.", `<select data-note-preference="view" aria-label="${t("Default notes view")}">${option("grid","Grid",notes.view)}${option("list","List",notes.view)}</select>`)}
 ${row("Text link previews", "Show a compact text preview for links in notes.", `<label class="switch-control"><input type="checkbox" data-note-preference="linkPreviews" ${notes.linkPreviews ? "checked" : ""} aria-label="${t("Text link previews")}"><span></span></label>`)}
 ${endGroup}${startGroup("calendar", "Calendar")}
 ${row("Calendar system", "Calendar views and repeating events can use Persian or Gregorian months.", `<select data-preference="calendar" aria-label="${t("Calendar system")}">${option("persian", "Solar Hijri", p.calendar)}${option("gregory", "Gregorian", p.calendar)}</select>`)}
 ${row("First day of week", "Sets the first column in week and month views.", `<select data-preference="weekStart" aria-label="${t("First day of week")}">${option(6, "Saturday", p.weekStart)}${option(1, "Monday", p.weekStart)}${option(0, "Sunday", p.weekStart)}</select>`)}
 ${row("Weekend", "Marks your non-working days without changing event dates.", `<select data-preference="weekend" aria-label="${t("Weekend")}">${option("friday", "Friday", p.weekend)}${option("thursday-friday", "Thursday and Friday", p.weekend)}${option("saturday-sunday", "Saturday and Sunday", p.weekend)}</select>`)}
 ${row("Iran holidays", "Shows holidays from the dated calendar dataset. Ad-hoc closures are not included.", `<label class="switch-control"><input type="checkbox" data-preference="holidays" ${p.holidays ? "checked" : ""} aria-label="${t("Iran holidays")}"><span></span></label>`)}
 ${row("Show on calendar", "Choose which items appear on your calendar. This choice is saved on this device.", `<div class="calendar-visibility-options" role="group" aria-label="${t("Show on calendar")}">${calendarVisibilityOptions.map(([kind, label]) => `<label class="planner-filter"><input type="checkbox" data-calendar-item="${kind}" ${p.calendarItems.includes(kind) ? "checked" : ""}><span class="kind-dot kind-${kind}"></span>${t(label)}</label>`).join("")}</div>`)}
 <p class="holiday-coverage small-note">${t("Local holiday calendar")} · ${t("Available through")} ${holidayData.years.at(-1).toLocaleString(getLanguage()==="fa"?"fa-IR":"en-US",{useGrouping:false})}</p>
 ${endGroup}
 ${startGroup("account", "Google account", "data-settings")}
 ${row("Sign in / sign up", "Google identifies your account; records and drawings sync to your app server.", button(c.space.startsWith("google:") ? "sync" : c.session.authenticated ? "workspace-google" : "google", c.space.startsWith("google:") ? "Sync" : c.session.authenticated ? "Open Google workspace" : "Sign in / sign up"))}
 ${c.space.startsWith("google:") ? row("Pending changes", "Changes waiting to be accepted by the server.", button("review-pending", "Review pending")) + row("Guest data", "Copy local records into your signed-in workspace.", button("migrate-guest", "Import")) : ""}
 ${c.session.authenticated ? row("Google account", "Signs this device out of your workspace.", button("logout", "Sign out")) : ""}
 ${endGroup}${startGroup("backups", "Backups", "data-settings")}
 <div class="backup-section-options">
 ${row("Notes backup", "Includes notes, tasks, projects, habits, saved links and reminders.", button("backup-notes", "Export notes"))}
 ${row("Financial backup", "Includes accounts, transactions, installments, budgets, assets and financial plans.", button("backup-finance", "Export finances"))}
 </div>
 ${row("Full backup", "Includes both sections and all app preferences.", button("backup", "Export everything"))}
 ${row("Restore backup", "Creates a separate local workspace from a validated backup. Your existing records are kept.", button("restore-backup", "Import backup"))}
 ${endGroup}${startGroup("devices", "Data and devices")}
 ${row("Reminders", "Background notifications need permission, sign-in and the .NET reminder service.", button("push", "Enable reminders"))}
 ${row("Device", "Install the same web app on your phone or desktop.", button("install", "Install app"))}
 ${endGroup}
 ${c.session.demoEnabled ? `${startGroup("demo", "Sample data")}<div class="demo-actions">${button("demo", "Try demo")}${c.space === "demo" ? button("reset-demo", "Reset demo") : ""}</div>${endGroup}` : ""}</div></div>`;
}
