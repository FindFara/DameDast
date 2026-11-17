import {
  validIso,
  jalaliParts,
  fromJalali,
  daysInMonth,
  addSolarMonths,
} from "./calendar.js";
import { occurrencesOn, tehranParts } from "./organizer.js";
export const eventColors = [
  "#72ab95",
  "#829bc9",
  "#ba8fc8",
  "#d3a34d",
  "#c77988",
  "#759eaf",
];
export const shiftDay = (date, days) =>
  new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
export const distanceDays = (a, b) =>
  Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
export const weekday = (date) => new Date(date + "T12:00:00Z").getUTCDay();
export const clockMinutes = (time) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const validTime = (time) =>
  typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export function calendarParts(date, calendar = "persian") {
  return calendar === "persian"
    ? jalaliParts(date)
    : {
        year: +date.slice(0, 4),
        month: +date.slice(5, 7),
        day: +date.slice(8, 10),
      };
}
export function calendarDate(year, month, day, calendar = "persian") {
  const date =
    calendar === "persian"
      ? fromJalali(year, month, day)
      : `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!validIso(date)) throw Error("Invalid date.");
  return date;
}
export function shiftCalendarMonth(date, offset, calendar = "persian") {
  if (calendar === "persian") return addSolarMonths(date, offset);
  const p = calendarParts(date, "gregory"),
    i = p.year * 12 + p.month - 1 + offset,
    y = Math.floor(i / 12),
    m = (i % 12) + 1,
    last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return calendarDate(y, m, Math.min(p.day, last), "gregory");
}
export function viewRange(date, view, calendar = "persian", weekStart = 6) {
  if (!validIso(date) || !["day", "week", "month"].includes(view))
    throw Error("Invalid calendar view.");
  if (view === "day")
    return { start: date, end: shiftDay(date, 1), days: [date] };
  const p = calendarParts(date, calendar),
    first =
      view === "month" ? calendarDate(p.year, p.month, 1, calendar) : date;
  const start = shiftDay(first, -((weekday(first) - weekStart + 7) % 7)),
    count = view === "week" ? 7 : 42;
  return {
    start,
    end: shiftDay(start, count),
    days: Array.from({ length: count }, (_, i) => shiftDay(start, i)),
  };
}
export function validateCalendarEntry(e) {
  if (
    e &&
    (!validIso(e.startDate) || !validIso(e.endDate) || e.endDate < e.startDate)
  )
    throw Error("Choose valid start and end dates.");
  if (
    !e ||
    typeof e.title !== "string" ||
    !e.title.trim() ||
    e.title !== e.title.trim() ||
    e.title.length > 120 ||
    typeof e.description !== "string" ||
    e.description.length > 4000 ||
    !validIso(e.startDate) ||
    !validIso(e.endDate) ||
    e.startDate < "2000-01-01" ||
    e.endDate > "2100-12-31" ||
    e.endDate < e.startDate ||
    distanceDays(e.startDate, e.endDate) > 31 ||
    typeof e.allDay !== "boolean" ||
    typeof e.done !== "boolean" ||
    !["event", "task"].includes(e.kind) ||
    (!eventColors.includes(e.color) &&
      !/^#[0-9a-f]{6}$/i.test(e.color || "")) ||
    !["none", "daily", "weekly", "monthly"].includes(e.repeat) ||
    !["persian", "gregory"].includes(e.repeatCalendar) ||
    (e.repeatUntil &&
      (!validIso(e.repeatUntil) ||
        e.repeatUntil < e.startDate ||
        e.repeatUntil > "2100-12-31")) ||
    (e.completedDates != null &&
      (!Array.isArray(e.completedDates) ||
        e.completedDates.length > 500 ||
        new Set(e.completedDates).size !== e.completedDates.length ||
        e.completedDates.some(
          (d) => !validIso(d) || d < e.startDate || d > "2100-12-31",
        )))
  )
    throw Error("Enter a valid calendar event.");
  if (
    !e.allDay &&
    (!validTime(e.startTime) ||
      !validTime(e.endTime) ||
      (e.startDate === e.endDate && e.endTime <= e.startTime))
  )
    throw Error("End time must follow start time.");
  return e;
}
function startsOn(e, date) {
  if (date < e.startDate || (e.repeatUntil && date > e.repeatUntil))
    return false;
  if (e.repeat === "none") return date === e.startDate;
  const distance = distanceDays(e.startDate, date);
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekly") return distance % 7 === 0;
  const a = calendarParts(e.startDate, e.repeatCalendar),
    b = calendarParts(date, e.repeatCalendar),
    months = (b.year - a.year) * 12 + b.month - a.month;
  return (
    months >= 0 &&
    shiftCalendarMonth(e.startDate, months, e.repeatCalendar) === date
  );
}
export function nextCalendarOccurrence(entry, fromDate) {
  const start = fromDate < entry.startDate ? entry.startDate : fromDate;
  // Monthly repeats have at most 31 days between starts in either supported calendar.
  for (let offset = 0; offset <= 31; offset++) {
    const date = shiftDay(start, offset);
    if (entry.repeatUntil && date > entry.repeatUntil) return null;
    if (startsOn(entry, date)) return date;
  }
  return null;
}
export function expandCalendarEntry(record, start, end) {
  const e = validateCalendarEntry(record.data),
    duration = distanceDays(e.startDate, e.endDate),
    rows = [];
  for (
    let date = shiftDay(start, -duration);
    date < end;
    date = shiftDay(date, 1)
  ) {
    if (!startsOn(e, date)) continue;
    for (let n = 0; n <= duration; n++) {
      const day = shiftDay(date, n);
      if (day < start || day >= end) continue;
      rows.push({
        key: `${record.id}:${date}:${day}`,
        recordId: record.id,
        source: "calendarEvent",
        occurrence: date,
        date: day,
        title: e.title,
        description: e.description,
        kind: e.kind,
        allDay: e.allDay,
        startTime: n === 0 ? e.startTime : "00:00",
        endTime: n === duration ? e.endTime : "23:59",
        color: e.color,
        done: e.repeat === "none" ? e.done : !!e.completedDates?.includes(date),
        repeat: e.repeat,
      });
    }
  }
  return rows;
}
export function plannerItems(records, start, end) {
  const result = [];
  for (const r of records.filter((r) => !r.deleted)) {
    const d = r.data;
    if (r.kind === "calendarEvent")
      result.push(...expandCalendarEntry(r, start, end));
    if (r.kind === "note")
      for (const task of d.checklist || [])
        if (task.dueDate >= start && task.dueDate < end)
          result.push({
            key: task.id,
            recordId: r.id,
            taskId: task.id,
            source: "noteTask",
            date: task.dueDate,
            title: task.text,
            kind: "task",
            done: task.done,
            allDay: !task.dueTime,
            startTime: task.dueTime,
            endTime: task.dueTime
              ? minutesClock(Math.min(1439, clockMinutes(task.dueTime) + 30))
              : null,
            color: "#829bc9",
          });
    if (r.kind === "reminder" && !d.completed)
      for (let date = start; date < end; date = shiftDay(date, 1))
        for (const o of occurrencesOn(d, date))
          result.push({
            key: `${r.id}:${o.occurrence}`,
            recordId: r.id,
            source: "reminder",
            date,
            title: d.title,
            description: d.body,
            kind: "reminder",
            allDay: false,
            startTime: o.occurrence.slice(11),
            endTime: minutesClock(
              Math.min(1439, clockMinutes(o.occurrence.slice(11)) + 30),
            ),
            color: "#ba8fc8",
          });
    const due =
      r.kind === "installment" && !d.paid
        ? d.dueDate
        : r.kind === "goal"
          ? d.deadline
          : null;
    if (due >= start && due < end)
      result.push({
        key: r.id,
        recordId: r.id,
        source: r.kind,
        date: due,
        title: d.title || d.name,
        kind: r.kind,
        allDay: true,
        color: r.kind === "goal" ? "#72ab95" : "#d3a34d",
      });
  }
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startTime || "").localeCompare(b.startTime || "") ||
      a.title.localeCompare(b.title),
  );
}
export const minutesClock = (value) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function timedColumns(items) {
  const sorted = items
      .map((item) => ({
        ...item,
        from: clockMinutes(item.startTime),
        to: Math.max(
          clockMinutes(item.startTime) + 20,
          clockMinutes(item.endTime),
        ),
      }))
      .sort((a, b) => a.from - b.from || a.to - b.to),
    groups = [];
  for (const item of sorted) {
    let group = groups.at(-1);
    if (!group || item.from >= group.end) {
      group = { end: item.to, items: [] };
      groups.push(group);
    }
    group.end = Math.max(group.end, item.to);
    const occupied = new Set(
      group.items.filter((x) => x.to > item.from).map((x) => x.column),
    );
    item.column = 0;
    while (occupied.has(item.column)) item.column++;
    group.items.push(item);
  }
  return groups.flatMap((g) =>
    g.items.map((i) => ({
      ...i,
      columns: Math.max(...g.items.map((x) => x.column)) + 1,
    })),
  );
}
