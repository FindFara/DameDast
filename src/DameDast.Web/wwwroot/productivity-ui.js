import { t, localizedNumber } from "./i18n.js";
import { escapeHtml as esc, today, categories } from "./finance.js";
import { dateControl, monthControl, monthBounds, monthLabel, monthOf, shiftMonth, solarText, jalaliParts } from "./calendar.js";
import { amountText } from "./privacy.js";
import { categoryInfo } from "./planning.js";
import { shiftDay, weekday } from "./planner.js";
import { attentionReport, habitProgress, habitColors, projectKinds, searchWorkspace } from "./productivity.js";
import { isDrawingNote } from "./notebook.js";

const button = (action, label, attrs = "", style = "secondary") => `<button type="button" class="${style}" data-action="${action}" ${attrs}>${t(label)}</button>`;
const field = (label, name, value, attrs = "") => `<label class="field">${t(label)}<input name="${name}" value="${esc(value || "")}" ${attrs}></label>`;
const area = (label, name, value, max = 4000) => `<label class="field">${t(label)}<textarea name="${name}" maxlength="${max}" dir="auto">${esc(value || "")}</textarea></label>`;
export const recordLabel = r => r.data.title || r.data.name || r.data.note || t(r.data.category || "Transaction");
export const kindLabel = r => ({ note: "Note", calendarEvent: r.data.kind === "task" ? "Tasks" : "Calendar", transaction: "Transaction", goal: "Goals", bookmark: "Saved links", project: "Projects", reminder: "Reminders", installment: "Installments", monthlyExpense: "Monthly expenses", habit: "Habits" }[r.kind] || r.kind);
export function projectField(records, value = null) {
  const projects = records.filter(r => !r.deleted && r.kind === "project");
  return `<label class="field">${t("Project")}<select name="projectId"><option value="">${t("No project")}</option>${projects.map(r => `<option value="${r.id}" ${value === r.id ? "selected" : ""}>${esc(r.data.name)}</option>`).join("")}</select></label>`;
}
export function productivityFields(kind, d) {
  if (kind === "project") return field("Project name", "name", d.name, 'required maxlength="80"') + area("Description", "description", d.description);
  if (kind === "bookmark") return field("Title", "title", d.title, 'required maxlength="200"') + field("Website address", "url", d.url, 'type="url" required maxlength="2000" dir="ltr"') + area("Selected excerpt", "excerpt", d.excerpt) + field("Tags (comma separated)", "tagsText", d.tagsText ?? d.tags?.join(", ") ?? "Read later", 'maxlength="500"');
  if (kind === "habit") return field("Habit name", "name", d.name, 'required maxlength="80"') + field("Times per week", "weeklyTarget", d.weeklyTarget || 3, 'type="number" min="1" max="7" required') + dateControl("Start date", "startDate", d.startDate || today(), true) + `<label class="field">${t("Color")}<select name="color">${habitColors.map((color, i) => `<option value="${color}" ${color === d.color ? "selected" : ""}>${t(["Sage", "Blue", "Purple", "Rose"][i])}</option>`).join("")}</select></label>`;
  return null;
}
const attentionIcon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${{
  alert: '<path d="M12 8v5m0 3h.01M10 3 2 18a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 3a2 2 0 0 0-4 0Z"/>',
  trend: '<path d="m3 16 6-6 4 4 8-9m-6 0h6v6"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>',
  payment: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18m-5 5h2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
}[name]}</svg>`;
export function attentionCard(c) {
  const r = attentionReport(c.records, c.now);
  const count = r.increases.length + r.overdue.length + r.payments.length;
  const cat = id => { const value = categoryInfo(c.records, categories, id); return esc(value.builtin ? t(value.name) : value.name); };
  const money = value => `<bdi dir="ltr">${amountText(value, c)}</bdi> ${t("toman")}`;
  const shortMonth = key => monthLabel(key).split(" ").slice(0, -1).join(" ");
  const date = day => `<time datetime="${day}">${solarText(day, false)}</time>`;
  const empty = label => `<p class="attention-empty">${attentionIcon("check")}<span>${t(label)}</span></p>`;
  const group = (kind, label, total, description, content, href) => `<section class="attention-group attention-${kind}"><header><span class="attention-group-icon">${attentionIcon(kind)}</span><h3>${t(label)}</h3><span class="attention-group-count">${localizedNumber(total)}</span></header><p class="attention-group-description">${description}</p><div class="attention-items">${content}</div>${total ? `<a class="text-link attention-view-all" href="#${href}">${t("View all")}${attentionIcon("arrow")}</a>` : ""}</section>`;
  const increases = r.increases.slice(0, 3).map(row => `<article class="attention-row"><div class="attention-row-heading"><strong>${cat(row.category)}</strong><span class="attention-amount">+${money(row.increase)}</span></div><div class="attention-row-actions">${button("attention-budget", row.budget ? "Adjust budget" : "Set budget", `data-category="${esc(row.category)}" data-id="${row.budget?.id || ""}" data-month="${r.month}"`, "attention-action")}</div></article>`).join("");
  const tasks = r.overdue.slice(0, 3).map(task => `<article class="attention-row"><strong dir="auto">${esc(task.title)}</strong><div class="attention-row-meta"><span class="attention-overdue-label">${t("Overdue")}</span>${date(task.date)}</div><div class="attention-row-actions"><button type="button" class="attention-action" data-planner-action="${task.source === "calendarEvent" ? "open" : "schedule-task"}" data-id="${task.record.id}" data-source="${task.source}" data-task-id="${task.id}" data-date="${task.occurrence || task.date}">${t("Change due date")}</button></div></article>`).join("");
  const payments = r.payments.slice(0, 4).map(p => `<article class="attention-row"><div class="attention-row-heading"><strong dir="auto">${esc(p.data.title)}</strong></div><div class="attention-row-meta">${date(p.dueDate)}<span class="attention-amount">${money(p.data.amount)}</span></div><div class="attention-row-actions">${button(p.kind === "installment" ? "paid" : "recurring-pay", "Record payment", `data-id="${p.id}" data-month="${monthOf(p.dueDate)}"`, "attention-action")}${button("edit", "Change due date", `data-id="${p.id}"`, "attention-action attention-action-secondary")}</div></article>`).join("");
  const chips = [["trend", "Spending increased", r.increases.length], ["task", "Overdue tasks", r.overdue.length], ["payment", "Next week payments", r.payments.length]];
  return `<details class="panel attention-card${count > 1 ? " has-multiple" : ""}" data-attention-card data-attention-count="${count}" ${c.attentionOpen ? "open" : ""}>
    <summary class="attention-summary"><span class="attention-symbol">${attentionIcon(count ? "alert" : "check")}</span><span class="attention-heading"><strong>${t("Needs your attention")}</strong><small>${count ? `${localizedNumber(count)} ${t("items to review")}` : t("Everything is up to date.")}</small></span><span class="attention-summary-count">${localizedNumber(count)}</span><span class="attention-chips">${chips.filter(([, , total]) => total).map(([kind, label, total]) => `<span title="${t(label)}" class="attention-chip attention-${kind}" aria-label="${t(label)}: ${localizedNumber(total)}">${attentionIcon(kind)}<b>${localizedNumber(total)}</b></span>`).join("")}</span><span class="attention-chevron">${attentionIcon("chevron")}</span></summary>
    <div class="attention-columns">${group("trend", "Spending increased", r.increases.length, `${shortMonth(r.month)} · ${t("Compared with")} ${shortMonth(r.previous)}`, increases || empty("No spending increases."), "transactions")}${group("task", "Overdue tasks", r.overdue.length, t("Reschedule or complete your tasks"), tasks || empty("No overdue tasks."), "tasks")}${group("payment", "Next week payments", r.payments.length, `${solarText(r.weekStart, false)} — ${solarText(shiftDay(r.weekEnd, -1), false)}`, payments || empty("No payments next week."), "installments")}</div>
  </details>`;
}
export function searchResults(c, query, pages) {
  const rows = searchWorkspace(c.records, query, pages);
  return !query.trim() ? `<p class="empty">${t("Search notes, tasks, transactions, reminders, links and pages.")}</p>` : rows.length ? rows.slice(0, 100).map(row => `<button type="button" class="workspace-search-result" data-action="workspace-open" data-id="${row.id}" ${row.kind === "page" ? `data-page="${row.id}"` : ""}><span class="badge">${t(row.kind === "page" ? "Page" : kindLabel(row.record))}</span><strong dir="auto">${esc(row.title)}</strong><small dir="auto">${esc(row.detail.slice(0, 160))}</small></button>`).join("") : `<p class="empty">${t("No results.")}</p>`;
}
function workspaceRow(r, project = false) {
  return `<article class="workspace-row"><div><span class="badge">${t(kindLabel(r))}</span><strong dir="auto">${esc(recordLabel(r))}</strong><small dir="auto">${esc((r.data.body || r.data.description || r.data.excerpt || "").slice(0, 160))}</small>${r.kind === "transaction" ? `<span>${localizedNumber(r.data.amount)} ${t("toman")}</span>` : ""}</div><div class="row-actions">${button("workspace-open", "Open", `data-id="${r.id}"`, "text-button")}${project ? button("project-detach", "Remove from project", `data-id="${r.id}"`, "text-button") : button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</div></article>`;
}
export function projectsPage(c) {
  const projects = c.records.filter(r => r.kind === "project"), project = projects.find(r => r.id === c.projectId);
  const header = `<div class="page-heading"><h1>${t("Projects")}</h1>${button("add", "New project", 'data-kind="project"', "primary")}</div>`;
  if (!project) return header + `<div class="cards-grid">${projects.map(r => `<article class="panel project-card"><h2 dir="auto">${esc(r.data.name)}</h2><p dir="auto">${esc(r.data.description)}</p><small>${localizedNumber(c.records.filter(item => item.data.projectId === r.id).length)} ${t("items")}</small><div class="card-foot">${button("project-open", "Open project", `data-id="${r.id}"`, "primary")}${button("edit", "Edit", `data-id="${r.id}"`, "text-button")}${button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</div></article>`).join("") || `<section class="panel empty">${t("Create a project to keep related work together.")}</section>`}</div>`;
  const items = c.records.filter(r => r.data.projectId === project.id && !isDrawingNote(r));
  const attachable = c.records.filter(r => projectKinds.includes(r.kind) && !isDrawingNote(r) && r.data.projectId !== project.id && !r.data.installmentId);
  const spent = items.filter(r => r.kind === "transaction" && r.data.type === "expense").reduce((sum, r) => sum + r.data.amount, 0);
  return header + `<section class="panel project-detail">${button("projects-back", "All projects", "", "text-button")}<h2 dir="auto">${esc(project.data.name)}</h2><p dir="auto">${esc(project.data.description)}</p><p>${t("Project spending")}: <bdi dir="ltr">${localizedNumber(spent)}</bdi> ${t("toman")}</p><div class="project-create">${[["note", "New note"], ["task", "New task"], ["transaction", "New expense"], ["goal", "New goal"], ["bookmark", "Save link"]].map(([kind, label]) => button("project-create", label, `data-kind="${kind}" data-id="${project.id}"`)).join("")}</div><form id="project-attach-form" data-project-id="${project.id}" class="project-attach"><label class="field">${t("Add existing item")}<select name="recordId" required><option value="">${t("Choose an item")}</option>${attachable.map(r => `<option value="${r.id}">${t(kindLabel(r))} · ${esc(recordLabel(r))}</option>`).join("")}</select></label><button class="secondary" type="submit">${t("Add")}</button></form>${items.map(r => workspaceRow(r, true)).join("") || `<p class="empty">${t("This project is empty.")}</p>`}</section>`;
}
export function bookmarksPage(c) {
  return `<div class="page-heading"><h1>${t("Saved links")}</h1><div class="heading-actions"><a class="secondary" href="/downloads/damdast-extension.zip" download>${t("Download extension")}</a>${button("clip-inbox", "Import from extension")}${button("add", "Save link", 'data-kind="bookmark"', "primary")}</div></div><div class="cards-grid">${c.records.filter(r => r.kind === "bookmark").map(r => `<article class="panel bookmark-card"><h2 dir="auto"><a href="${esc(r.data.url)}" target="_blank" rel="noopener noreferrer">${esc(r.data.title)} ↗</a></h2><p class="bookmark-url" dir="ltr">${esc(r.data.url)}</p><blockquote dir="auto">${esc(r.data.excerpt)}</blockquote><div class="bookmark-tags">${r.data.tags.map(tag => `<span class="badge">${esc(tag === "Read later" ? t(tag) : tag)}</span>`).join("")}</div><footer>${button("edit", "Edit", `data-id="${r.id}"`, "text-button")}${button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</footer></article>`).join("") || `<section class="panel empty">${t("Save a link and an excerpt for later.")}</section>`}</div>`;
}
export function habitsPage(c) {
  const current = today(), month = c.month, { start, end } = monthBounds(month), padding = (weekday(start) + 1) % 7;
  const days = []; for (let day = start; day < end; day = shiftDay(day, 1)) days.push(day);
  return `<div class="page-heading"><h1>${t("Habits")}</h1>${monthControl(month, "month", true)}${button("add", "New habit", 'data-kind="habit"', "primary")}</div><div class="cards-grid habit-grid">${c.records.filter(r => r.kind === "habit").map(r => {
    const progress = habitProgress(c.records, r, current);
    return `<article class="panel habit-card" style="--habit-color:${habitColors.includes(r.data.color) ? r.data.color : habitColors[0]}"><div class="card-heading"><h2 dir="auto">${esc(r.data.name)}</h2>${button("edit", "Edit", `data-id="${r.id}"`, "text-button")}</div><p>${localizedNumber(progress.count)} / ${localizedNumber(r.data.weeklyTarget)} ${t("this week")} · <strong>${localizedNumber(progress.percent)}٪</strong></p><progress max="100" value="${progress.percent}" aria-label="${t("Weekly progress")}"></progress><small>${solarText(progress.start)} — ${solarText(shiftDay(progress.end, -1))}</small><div class="habit-calendar" role="group" aria-label="${esc(r.data.name + " · " + monthLabel(month))}">${["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map(day => `<span class="habit-weekday">${t(day)}</span>`).join("")}${"<span></span>".repeat(padding)}${days.map(day => `<button type="button" class="habit-day ${progress.dates.has(day) ? "logged" : ""} ${day === current ? "today" : ""}" data-action="habit-toggle" data-id="${r.id}" data-date="${day}" aria-pressed="${progress.dates.has(day)}" aria-label="${esc(solarText(day))}" title="${esc(solarText(day))}" ${day > current || day < r.data.startDate ? "disabled" : ""}>${localizedNumber(jalaliParts(day).day)}</button>`).join("")}</div><div class="card-foot">${button("habit-toggle", progress.dates.has(current) ? "Undo today" : "Log today", `data-id="${r.id}" data-date="${current}" ${current < r.data.startDate ? "disabled" : ""}`, "primary")}${button("delete", "Delete", `data-id="${r.id}"`, "text-button")}</div></article>`;
  }).join("") || `<section class="panel empty">${t("Set a weekly goal for exercise, language or reading.")}</section>`}</div>`;
}
