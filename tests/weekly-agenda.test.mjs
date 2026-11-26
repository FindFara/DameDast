import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { makeDemo, materialize, today } from "../src/DameDast.Web/wwwroot/finance.js";
import { weeklyAgenda } from "../src/DameDast.Web/wwwroot/weekly-agenda.js";
import { weeklyAgendaPanel } from "../src/DameDast.Web/wwwroot/weekly-agenda-ui.js";
import { developmentFields, developmentPage, toggleDevelopmentFields } from "../src/DameDast.Web/wwwroot/development-ui.js";
import { setLanguage } from "../src/DameDast.Web/wwwroot/i18n.js";
const now = "2026-11-26T10:00:00Z";
const row = (id, kind, data) => ({ id, kind, data, version: 1 });
const activity = (id, area, date, done = false) => row(id, "developmentEntry", { area, date, done, title: id, notes: "", minutes: 30 });
const task = (id, date, extra = {}) => row(id, "calendarEvent", {
  title: id, kind: "task", startDate: date, endDate: date, done: false, repeat: "none", repeatCalendar: "persian",
  allDay: true, description: "", color: "#72ab95", ...extra,
});
test("dashboard week groups scheduled learning, exercise and dated to-dos without unrelated or deleted items", () => {
  const records = [activity("study", "study", "2026-11-25"), activity("gym", "exercise", "2026-11-26"),
    activity("personal", "plan", "2026-11-27"), activity("essay", "essay", "2026-11-24"),
    activity("words", "vocabulary", "2026-11-23"), activity("lesson", "lesson", "2026-11-22"),
    task("todo", "2026-11-26"), task("event", "2026-11-26", { kind: "event" }),
    task("outside", "2026-11-28"), { ...activity("deleted", "study", "2026-11-26"), deleted: true },
    row("note", "note", { checklist: [{ id: "dated", text: "Legacy task", dueDate: "2026-11-26", done: true }, { id: "undated", text: "Later", done: false }] }),
    row("trash", "note", { status: "trashed", checklist: [{ id: "trashed", text: "Gone", dueDate: "2026-11-26", done: false }] }),
  ];
  const week = weeklyAgenda(records, now), entries = week.flatMap(day => day.items);
  assert.equal(week[0].date, "2026-11-21");
  assert.equal(week.at(-1).date, "2026-11-27");
  assert.equal(week.find(day => day.today).date, "2026-11-26");
  assert.equal(entries.length, 8);
  assert.deepEqual(new Set(entries.map(item => item.area)), new Set(["study", "exercise", "plan", "essay", "vocabulary", "lesson", "todo"]));
  assert.equal(entries.find(item => item.key === "dated").status, "done");
  assert.equal(entries.find(item => item.recordId === "study").status, "overdue");
  assert.equal(entries.find(item => item.recordId === "gym").status, "planned");
  assert.equal(entries.find(item => item.recordId === "personal").status, "planned");
});
test("weekly statuses follow repeated task occurrences and the actual essay review and word reading records", () => {
  const records = [task("daily", "2026-11-21", { repeat: "daily", completedDates: ["2026-11-24"] }),
    activity("essay", "essay", "2026-11-24"), activity("words", "vocabulary", "2026-11-24"),
    row("review", "languageEssay", { date: "2026-11-24", reviewed: true }),
    row("read", "languageVocabulary", { date: "2026-11-24", read: true }),
  ];
  let items = weeklyAgenda(records, now).find(day => day.date === "2026-11-24").items;
  assert.ok(items.every(item => item.status === "done"));
  records[3].data.reviewed = false;
  items = weeklyAgenda(records, now).find(day => day.date === "2026-11-24").items;
  assert.equal(items.find(item => item.recordId === "essay").status, "overdue");
  assert.equal(weeklyAgenda(records, "2026-11-27T21:00:00Z")[0].date, "2026-11-28"); // Saturday in Tehran
});
test("learning has no embedded calendar or completion input; saved entries have completion next to edit and delete", () => {
  setLanguage("en");
  const record = activity("saved", "study", "2026-11-26");
  const page = developmentPage({ page: "learning", records: [record], developmentDate: "2026-11-26" });
  assert.doesNotMatch(page, /development-week-strip|development-calendar|class="development-day /);
  const { document } = parseHTML(page);
  const actions = document.querySelector(".development-entry footer");
  assert.ok(actions.querySelector('[data-action="development-toggle"]'));
  assert.ok(actions.querySelector('[data-action="edit"]'));
  assert.ok(actions.querySelector('[data-action="delete"]'));
  assert.match(actions.textContent, /Mark complete/);
  for (const done of [false, true]) {
    const { document: fields } = parseHTML(`<div id="fields">${developmentFields({ ...record.data, done })}</div>`);
    assert.equal(fields.querySelector('[name="done"]'), null);
    toggleDevelopmentFields(fields.querySelector("#fields"));
  }
  assert.match(developmentPage({ page: "developmentExercise", records: [], developmentDate: "2026-11-26" }), /development-calendar/);
});
test("weekly cards carry real source references, escape titles and show independent done/overdue states", () => {
  setLanguage("en");
  const a = activity("a", "study", "2026-11-25", true), b = activity("b", "study", "2026-11-25");
  a.data.title = "<script>bad()</script>";
  const html = weeklyAgendaPanel({ records: [a, b], now });
  const { document } = parseHTML(html);
  assert.equal(document.querySelectorAll(".weekly-agenda-day").length, 1);
  assert.equal(document.querySelectorAll(".weekly-agenda-item.is-done").length, 1);
  assert.equal(document.querySelectorAll(".weekly-agenda-item.is-overdue").length, 1);
  assert.equal(document.querySelector("script"), null);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(document.querySelector('[data-id="a"]').dataset.source, "developmentEntry");
});

test("sample workspace has swipeable days with more than three real linked activities; empty days stay hidden", () => {
  const records = materialize(makeDemo());
  const clock = today() + "T10:00:00Z";
  const week = weeklyAgenda(records, clock);
  const day = week.find(day => day.date === today());
  assert.ok(day.items.length >= 6);
  assert.ok(day.items.some(item => item.area === "vocabulary" && item.done));
  assert.ok(day.items.some(item => item.area === "essay" && !item.done));
  const { document } = parseHTML(weeklyAgendaPanel({ records, now: clock, space: "demo" }));
  assert.equal(document.querySelectorAll(".weekly-agenda-day").length, week.filter(day => day.items.length).length);
  assert.ok(document.querySelector(".weekly-agenda-items.has-overflow[tabindex='0']"));
  assert.equal(weeklyAgendaPanel({ records: [], now: clock }), "");
  for (const item of document.querySelectorAll(".weekly-agenda-item")) {
    assert.ok(item.querySelector("strong").getAttribute("title"));
    assert.ok(item.getAttribute("aria-label"));
  }
});
