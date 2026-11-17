import test from "node:test";
import assert from "node:assert/strict";
import { fromJalali } from "../src/Poolo.Web/wwwroot/calendar.js";
import {
  parseTimes,
  tehranParts,
  tehranInstant,
  reminderOccurrences,
  nextReminder,
  organizerReport,
  notificationKey,
  validateReminder,
} from "../src/Poolo.Web/wwwroot/organizer.js";
const start = "2026-11-16",
  now = "2026-11-16T08:00:00Z";
const reminder = (values = {}) => ({
  title: "Money check",
  body: "",
  startDate: start,
  times: ["09:00", "18:00"],
  repeat: "daily",
  interval: 1,
  endDate: null,
  maxOccurrences: null,
  pinned: true,
  completed: false,
  ...values,
});
const row = (id, kind, data) => ({ id, kind, data, deleted: false });
test("Tehran clock and Persian-input times keep exact occurrence identities", () => {
  assert.deepEqual(tehranParts(now), { date: start, time: "11:30" });
  assert.equal(
    new Date(tehranInstant(start, "09:00")).toISOString(),
    "2026-11-16T05:30:00.000Z",
  );
  assert.deepEqual(parseTimes("۱۸:۰۰، 9:00"), ["09:00", "18:00"]);
  assert.throws(() => parseTimes("24:00"));
  assert.throws(() => parseTimes("09:00,09:00"));
});
test("each time is a separate repeat, and count/end/completed limits are honored", () => {
  assert.deepEqual(
    reminderOccurrences(reminder(), now).map((x) => x.occurrence),
    ["2026-11-16T09:00"],
  );
  assert.equal(nextReminder(reminder(), now).occurrence, "2026-11-16T18:00");
  assert.equal(nextReminder(reminder({ maxOccurrences: 1 }), now), null);
  assert.equal(
    reminderOccurrences(reminder({ completed: true }), now).length,
    0,
  );
  assert.equal(
    reminderOccurrences(reminder({ startDate: "2026-11-17" }), now).length,
    0,
  );
  assert.equal(
    reminderOccurrences(reminder({ endDate: "2026-11-15" }), now).length,
    0,
  );
  assert.throws(() =>
    validateReminder(reminder({ repeat: "monthly", interval: 13 })),
  );
});
test("weekly repeats keep the start weekday; Persian monthly repeats clamp without drift", () => {
  const r = reminder({
    repeat: "weekly",
    interval: 2,
    startDate: "2026-11-02",
    times: ["09:00"],
  });
  assert.equal(reminderOccurrences(r, now).length, 1);
  const date = fromJalali(1405, 6, 31),
    first = fromJalali(1405, 7, 30),
    second = fromJalali(1405, 8, 30);
  const m = reminder({ repeat: "monthly", startDate: date, times: ["09:00"] });
  assert.equal(
    nextReminder(m, new Date(tehranInstant(date, "10:00"))).occurrence,
    first + "T09:00",
  );
  assert.equal(
    nextReminder(m, new Date(tehranInstant(first, "10:00"))).occurrence,
    second + "T09:00",
  );
});
test("reading one occurrence does not suppress the next; duplicate receipts are harmless", () => {
  const record = row("reminder", "reminder", reminder()),
    a = organizerReport([record], now).notifications[0],
    receipt = row("read", "notificationRead", {
      sourceId: a.sourceId,
      occurrence: a.occurrence,
      itemKey: null,
    });
  assert.equal(organizerReport([record, receipt], now).unread, 0);
  const later = organizerReport(
    [record, receipt, { ...receipt, id: "read2" }],
    "2026-11-16T15:00:00Z",
  );
  assert.equal(later.unread, 1);
  assert.notEqual(notificationKey(later.notifications[0]), notificationKey(a));
});
test("legacy notes/goals survive, checklist and pinned records share one planner", () => {
  const note = row("note", "note", {
      title: "Old",
      body: "Body",
      pinned: true,
      updatedOn: start,
    }),
    goal = row("goal", "goal", {
      name: "Trip",
      target: 100,
      saved: 20,
      deadline: null,
    });
  let report = organizerReport([note, goal], now);
  assert.equal(report.tasks.length, 0);
  assert.equal(report.pinned.length, 1);
  note.data.checklist = [
    { id: "a", text: "Pay rent", done: false },
    { id: "b", text: "Review", done: true },
  ];
  goal.data.pinned = true;
  report = organizerReport([note, goal, row("r", "reminder", reminder())], now);
  assert.equal(report.openTasks, 1);
  assert.equal(report.pinned.length, 3);
});
test("paid installments and unknown imported statuses do not become unread alerts", () => {
  const records = [
    row("a", "installment", {
      title: "Paid",
      dueDate: start,
      paid: true,
      reminderDays: 3,
    }),
    row("b", "installment", {
      title: "Unpaid",
      dueDate: start,
      paid: false,
      reminderDays: 3,
    }),
    row("c", "externalSnapshot", {
      category: "installments",
      items: [
        { key: "x", label: "Unknown", status: "unknown", dueDate: start },
      ],
    }),
  ];
  assert.equal(organizerReport(records, now).unread, 1);
});
