import { validIso, addSolarMonths, monthOf } from "./calendar.js";
const dayMs = 86400000,
  minuteMs = 60000;
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function tehranParts(now = new Date()) {
  const p = Object.fromEntries(
    fmt.formatToParts(new Date(now)).map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function tehranInstant(date, time) {
  let utc = Date.parse(`${date}T${time}:00Z`);
  const wanted = utc;
  for (let i = 0; i < 3; i++) {
    const p = tehranParts(utc),
      shown = Date.parse(`${p.date}T${p.time}:00Z`);
    const delta = wanted - shown;
    if (!delta) break;
    utc += delta;
  }
  return utc;
}
export function parseTimes(text) {
  const latin = String(text)
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
  const values = latin
    .split(/[,،\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(s);
      if (!m || +m[1] > 23 || +m[2] > 59)
        throw Error("Enter times as HH:mm, separated by commas.");
      return m[1].padStart(2, "0") + ":" + m[2];
    });
  if (
    !values.length ||
    values.length > 12 ||
    new Set(values).size !== values.length
  )
    throw Error("Choose 1 to 12 unique reminder times.");
  return values.sort();
}
export function validateReminder(r) {
  const max = r.repeat === "monthly" ? 12 : r.repeat === "weekly" ? 52 : 365;
  if (
    !r.title?.trim() ||
    r.title.length > 80 ||
    String(r.body || "").length > 4000 ||
    !validIso(r.startDate) ||
    !["once", "daily", "weekly", "monthly"].includes(r.repeat) ||
    !Number.isInteger(r.interval) ||
    r.interval < 1 ||
    r.interval > max ||
    (r.endDate && (!validIso(r.endDate) || r.endDate < r.startDate)) ||
    (r.maxOccurrences !== null &&
      r.maxOccurrences !== undefined &&
      (!Number.isInteger(r.maxOccurrences) ||
        r.maxOccurrences < 1 ||
        r.maxOccurrences > 10000))
  )
    throw Error("Enter a valid reminder date, times and repeat schedule.");
  if (
    !Array.isArray(r.times) ||
    parseTimes(r.times.join(",")).join(",") !== [...r.times].sort().join(",")
  )
    throw Error("Choose 1 to 12 unique reminder times.");
}
function dateShift(date, days) {
  return new Date(Date.parse(date + "T12:00:00Z") + days * dayMs)
    .toISOString()
    .slice(0, 10);
}
function sequenceOn(r, date) {
  if (date < r.startDate || (r.endDate && date > r.endDate)) return null;
  const distance = Math.round(
    (Date.parse(date + "T12:00:00Z") - Date.parse(r.startDate + "T12:00:00Z")) /
      dayMs,
  );
  if (r.repeat === "once") return distance === 0 ? 0 : null;
  if (r.repeat === "monthly") {
    const a = monthOf(r.startDate).split("-").map(Number),
      b = monthOf(date).split("-").map(Number),
      months = (b[0] - a[0]) * 12 + b[1] - a[1];
    return months % r.interval === 0 &&
      addSolarMonths(r.startDate, months) === date
      ? months / r.interval
      : null;
  }
  const step = r.interval * (r.repeat === "weekly" ? 7 : 1);
  return distance % step === 0 ? distance / step : null;
}
export function occurrencesOn(r, date) {
  const seq = sequenceOn(r, date);
  if (seq === null) return [];
  return [...r.times]
    .sort()
    .flatMap((time, i) =>
      r.maxOccurrences != null && seq * r.times.length + i >= r.maxOccurrences
        ? []
        : [
            {
              occurrence: `${date}T${time}`,
              dueAt: new Date(tehranInstant(date, time)).toISOString(),
            },
          ],
    );
}
export function reminderOccurrences(r, now = new Date(), days = 7) {
  if (r.completed) return [];
  const current = new Date(now).getTime(),
    today = tehranParts(current).date,
    result = [];
  for (let i = Math.max(1, Math.min(7, days)) - 1; i >= 0; i--)
    for (const o of occurrencesOn(r, dateShift(today, -i)))
      if (Date.parse(o.dueAt) <= current) result.push(o);
  return result;
}
export function nextReminder(r, now = new Date()) {
  if (r.completed) return null;
  const current = new Date(now).getTime(),
    today = tehranParts(current).date;
  for (let i = 0; i <= 366; i++) {
    const next = occurrencesOn(r, dateShift(today, i)).find(
      (o) => Date.parse(o.dueAt) > current,
    );
    if (next) return next;
  }
  return null;
}
export const notificationKey = (n) =>
  `${n.sourceId}|${n.occurrence}|${n.itemKey || ""}`;
export function organizerReport(records, now = new Date()) {
  const active = records.filter((r) => !r.deleted),
    today = tehranParts(now).date,
    reads = new Set(
      active
        .filter((r) => r.kind === "notificationRead")
        .map((r) => notificationKey(r.data)),
    ),
    notifications = [];
  const add = (r, occurrence, title, kind, url, dueAt, itemKey = null) => {
    const n = { sourceId: r.id, occurrence, title, kind, url, dueAt, itemKey };
    n.read = reads.has(notificationKey(n));
    notifications.push(n);
  };
  const due = (date, days = 3) => {
    const gap = Math.round(
      (Date.parse(date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) /
        dayMs,
    );
    return gap <= days && gap >= -7;
  };
  for (const r of active) {
    const d = r.data;
    if (r.kind === "reminder") {
      for (const o of reminderOccurrences(d, now))
        add(r, o.occurrence, d.title, "reminder", "/#reminders", o.dueAt);
    } else if (
      r.kind === "installment" &&
      !d.paid &&
      due(d.dueDate, d.reminderDays)
    )
      add(
        r,
        d.dueDate + "T00:00",
        d.title,
        "installment",
        "/#installments",
        new Date(tehranInstant(d.dueDate, "00:00")).toISOString(),
      );
    else if (r.kind === "externalSnapshot" && d.category === "installments") {
      for (const i of d.items)
        if (i.status === "unpaid" && i.dueDate && due(i.dueDate))
          add(
            r,
            i.dueDate + "T00:00",
            i.label,
            "installment",
            "/#connected",
            new Date(tehranInstant(i.dueDate, "00:00")).toISOString(),
            i.key,
          );
    } else if (
      r.kind === "goal" &&
      d.saved < d.target &&
      d.deadline &&
      d.deadline <= today &&
      due(d.deadline, 0)
    )
      add(
        r,
        d.deadline + "T00:00",
        d.name,
        "goal",
        "/#goals",
        new Date(tehranInstant(d.deadline, "00:00")).toISOString(),
      );
  }
  const pinned = active.filter(
      (r) => ["note", "goal", "reminder"].includes(r.kind) && r.data.pinned,
    ),
    tasks = active
      .filter((r) => r.kind === "note")
      .flatMap((r) =>
        (r.data.checklist || []).map((item) => ({ note: r, item })),
      );
  notifications.sort(
    (a, b) =>
      Date.parse(b.dueAt) - Date.parse(a.dueAt) ||
      notificationKey(a).localeCompare(notificationKey(b)),
  );
  return {
    pinned,
    tasks,
    openTasks: tasks.filter((x) => !x.item.done).length,
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  };
}
