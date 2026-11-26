import { developmentWeek } from "./development.js";
import { plannerItems, shiftDay } from "./planner.js";
import { tehranParts } from "./organizer.js";

export function weeklyAgenda(records, now = new Date()) {
  const today = tehranParts(now).date;
  const days = developmentWeek(today);
  const active = records.filter(r => !r.deleted && !(r.kind === "note" && r.data.status === "trashed"));
  const sources = new Map(active.map(r => [r.id, r]));
  const planned = active.filter(r => ["developmentEntry", "note", "languageEssay", "languageVocabulary"].includes(r.kind) ||
    r.kind === "calendarEvent" && r.data.kind === "task");
  const entries = plannerItems(planned, days[0], shiftDay(days.at(-1), 1))
    .filter(item => item.kind === "task")
    .map(item => ({
      ...item,
      area: item.source === "developmentEntry" ? sources.get(item.recordId).data.area : "todo",
      status: item.done ? "done" : item.date < today ? "overdue" : "planned",
    }))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) ||
      (a.startTime || "").localeCompare(b.startTime || "") || a.key.localeCompare(b.key));
  return days.map(date => ({ date, today: date === today, items: entries.filter(item => item.date === date) }));
}
