import { t } from "./i18n.js";
import { today } from "./finance.js";
import { validIso, inMonth, monthOf, shiftMonth } from "./calendar.js";
import { shiftDay, weekday, expandCalendarEntry } from "./planner.js";
import { taskEntries, isDrawingNote } from "./notebook.js";
import { tehranParts } from "./organizer.js";
import { recurringForMonth, visibleBudgets } from "./planning.js";

export const projectKinds = ["note", "calendarEvent", "transaction", "goal", "bookmark", "installment"];
export const habitColors = ["#367c61", "#829bc9", "#bb94c8", "#db9a81"];
export async function habitLogId(habitId, date) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`damedast-habit:${habitId}:${date}`))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const live = records => records.filter(r => !r.deleted);
export const normalizeSearch = text => String(text ?? "").normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u064b-\u065f\u200c]/g, "").toLocaleLowerCase().trim();
export function searchWorkspace(records, query, pages = []) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const rows = live(records), projects = new Map(rows.filter(r => r.kind === "project").map(r => [r.id, r.data.name]));
  return [...rows.filter(r => ["note", "calendarEvent", "transaction", "reminder", "installment", "monthlyExpense", "goal", "project", "bookmark", "habit"].includes(r.kind) && !isDrawingNote(r)).map(r => ({
    id: r.id, kind: r.kind, title: r.data.title || r.data.name || r.data.note || t(r.data.category),
    detail: [r.data.body, r.data.description, r.data.excerpt, r.data.url, ...(r.data.tags || []).map(tag => tag === "Read later" ? "Read later بعداً بخوانم" : tag), ...(r.data.checklist || []).map(x => x.text), projects.get(r.data.projectId)].filter(Boolean).join(" · "), record: r,
  })), ...pages.map(p => ({ ...p, kind: "page", detail: "" }))].filter(row => terms.every(term => normalizeSearch(row.title + " " + row.detail).includes(term)));
}
export function habitProgress(records, habit, date = today()) {
  const start = shiftDay(date, -((weekday(date) + 1) % 7)), end = shiftDay(start, 7);
  const dates = new Set(live(records).filter(r => r.kind === "habitLog" && r.data.habitId === habit.id && r.data.done !== false).map(r => r.data.date));
  const count = [...dates].filter(day => day >= start && day < end && day <= date).length;
  return { dates, start, end, count, percent: Math.min(100, Math.round(count / habit.data.weeklyTarget * 100)) };
}
export function attentionReport(records, now = new Date()) {
  const date = tehranParts(now).date, rows = live(records), month = monthOf(date), previous = shiftMonth(month, -1);
  const expense = key => rows.filter(r => r.kind === "transaction" && r.data.type === "expense" && inMonth(r.data.date, key) && r.data.date <= date);
  const sums = list => { const result = new Map(); for (const r of list) result.set(r.data.category, (result.get(r.data.category) || 0) + r.data.amount); return result; };
  const before = sums(expense(previous)), after = sums(expense(month));
  const increases = [...after].map(([category, amount]) => ({ category, amount, before: before.get(category) || 0, increase: amount - (before.get(category) || 0), budget: visibleBudgets(rows, month).find(r => r.data.category === category) }))
    .filter(row => row.increase > 0).sort((a, b) => b.increase - a.increase);
  const overdue = taskEntries(rows, now).filter(task => !task.done && task.date && task.date < date && (task.source === "noteTask" || task.record.data.repeat === "none"));
  // Include missed occurrences of repeating tasks from the last week, even when the next one is upcoming.
  for (const r of rows.filter(r => r.kind === "calendarEvent" && r.data.kind === "task" && r.data.repeat && r.data.repeat !== "none")) {
    const missed = expandCalendarEntry(r, shiftDay(date, -7), date).filter(item => !item.done && item.date === item.occurrence);
    for (const item of missed) overdue.push({ record: r, id: r.id, title: item.title, date: item.date, occurrence: item.occurrence, source: "calendarEvent" });
  }
  overdue.sort((a, b) => a.date.localeCompare(b.date));
  const weekStart = shiftDay(date, 7 - ((weekday(date) + 1) % 7)), weekEnd = shiftDay(weekStart, 7);
  const payments = rows.filter(r => r.kind === "installment" && !r.data.paid && r.data.dueDate >= weekStart && r.data.dueDate < weekEnd).map(r => ({ ...r, dueDate: r.data.dueDate }));
  for (const key of new Set([monthOf(weekStart), monthOf(shiftDay(weekEnd, -1))]))
    payments.push(...recurringForMonth(rows, key).filter(r => !r.payment && r.dueDate >= weekStart && r.dueDate < weekEnd));
  return { date, month, previous, increases, overdue, weekStart, weekEnd, payments: payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate)) };
}
export function validateProductivity(kind, data, records, id) {
  if (data.projectId && (!projectKinds.includes(kind) || !records.some(r => !r.deleted && r.kind === "project" && r.id === data.projectId))) throw Error("Choose an existing project.");
  if (["project", "habit"].includes(kind) && (!data.name?.trim() || data.name.length > 80)) throw Error("Enter a valid title or name.");
  if (kind === "project" && (typeof data.description !== "string" || data.description.length > 4000)) throw Error("Enter a valid description.");
  if (kind === "bookmark") {
    let url; try { url = new URL(data.url); } catch {}
    if (!data.title?.trim() || data.title.length > 200 || !url || !["https:", "http:"].includes(url.protocol) || url.username || url.password || data.url.length > 2000 || typeof data.excerpt !== "string" || data.excerpt.length > 4000 || !Array.isArray(data.tags) || data.tags.length > 12 || data.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 40) || new Set(data.tags).size !== data.tags.length) throw Error("Enter a valid link, excerpt and tags.");
  }
  if (kind === "habit" && (!Number.isInteger(data.weeklyTarget) || data.weeklyTarget < 1 || data.weeklyTarget > 7 || !habitColors.includes(data.color) || !validIso(data.startDate))) throw Error("Choose a weekly target from 1 to 7.");
  if (kind === "habit" && records.some(r => !r.deleted && r.kind === "habitLog" && r.data.habitId === id && r.data.date < data.startDate)) throw Error("Start date must include the existing habit history.");
  if (kind === "habitLog") {
    const habit = records.find(r => !r.deleted && r.kind === "habit" && r.id === data.habitId);
    if (!habit || !validIso(data.date) || data.date < habit.data.startDate || data.date > today() || records.some(r => !r.deleted && r.kind === "habitLog" && r.id !== id && r.data.habitId === data.habitId && r.data.date === data.date)) throw Error("This habit date is invalid or already recorded.");
  }
}
