import { developmentWeek } from "./development.js";
import { habitProgress, habitColors, scheduledHabitDays } from "./productivity.js";
import { plannerItems, shiftDay, weekday } from "./planner.js";
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
    }));
  for (const habit of active.filter(r => r.kind === "habit")) {
    const scheduled = scheduledHabitDays(habit), progress = habitProgress(active, habit, today);
    for (const date of days.filter(date => date >= habit.data.startDate && scheduled.includes(weekday(date)))) {
      const done = progress.dates.has(date);
      entries.push({ key: `${habit.id}:${date}`, recordId: habit.id, source: "habit", area: "habit", title: habit.data.name,
        date, occurrence: date, allDay: true, done, status: done ? "done" : date < today ? "overdue" : "planned",
        color: habitColors.includes(habit.data.color) ? habit.data.color : habitColors[0] });
    }
  }
  entries.sort((a, b) => Number(b.allDay) - Number(a.allDay) ||
    (a.startTime || "").localeCompare(b.startTime || "") || a.key.localeCompare(b.key));
  return days.map(date => ({ date, today: date === today, items: entries.filter(item => item.date === date) }));
}
