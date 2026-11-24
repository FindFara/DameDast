import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { renderPage } from "../src/DameDast.Web/wwwroot/ui.js";
import {
  organizerEditorFields,
  pinnedPanel,
  notificationsMarkup,
} from "../src/DameDast.Web/wwwroot/organizer-ui.js";
import { setLanguage } from "../src/DameDast.Web/wwwroot/i18n.js";
import { instruments } from "../src/DameDast.Web/wwwroot/market-catalog.js";
import { navigationGroups } from "../src/DameDast.Web/wwwroot/navigation.js";
const base = {
  page: "market",
  records: [],
  now: "2026-11-16T08:00:00Z",
  space: "guest",
  session: { authenticated: false },
  month: "1405-08",
  filter: "",
  typeFilter: "",
  flowPeriod: "monthly",
  pendingCount: 0,
  marketData: null,
  marketHistory: [],
  marketSymbol: "GOLD",
  marketPeriod: 7,
  marketCategory: "all",
  marketSearch: "",
  marketLoading: false,
  marketHistoryLoading: false,
};
test("browser catalog matches the embedded .NET catalog; market search and categories constrain cards", () => {
  assert.deepEqual(
    instruments,
    JSON.parse(
      fs.readFileSync(
        new URL(
          "../src/DameDast.Application/Features/Market/market-catalog.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  setLanguage("en");
  let html = renderPage(base);
  assert.equal((html.match(/data-action="market-symbol"/g) || []).length, 39);
  html = renderPage({ ...base, marketCategory: "crypto" });
  assert.equal((html.match(/data-action="market-symbol"/g) || []).length, 12);
  assert.ok(!html.includes('data-symbol="AGAS"'));
  html = renderPage({ ...base, marketSearch: "Foolad" });
  assert.equal((html.match(/data-action="market-symbol"/g) || []).length, 1);
  assert.ok(html.includes('data-symbol="FOOLAD"'));
});
test("notes, projects, habits, tasks and reminders are independent pages and keep user text escaped", () => {
  setLanguage("fa");
  const note = {
    id: "note",
    kind: "note",
    data: {
      title: "<img src=x>",
      body: "<script>bad()</script>",
      pinned: true,
      updatedOn: "2026-11-16",
      checklist: [{ id: "task", text: "<b>Task</b>", done: false }],
    },
  };
  for (const page of ["notes", "projects", "habits", "bookmarks", "calendar", "tasks", "reminders", "goals"]) {
    const html = renderPage({ ...base, page, records: [note], planner:{date:"2026-11-16",view:"month",filters:["event","task","reminder","installment","goal"]} });
    assert.ok(!html.includes("organizer-tabs"));
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img src=x>"));
  }
  const html = organizerEditorFields("note", note.data);
  assert.ok(html.includes("&lt;script&gt;bad()&lt;/script&gt;"));
  assert.ok(!html.includes("data-task-id"));
  assert.ok(!html.includes('name="pinned"'));
  setLanguage("en");
});
test("every pinned item appears on the dashboard, and notification times are Persian dates", () => {
  const pins = Array.from({ length: 8 }, (_, i) => ({
    id: "n" + i,
    kind: "note",
    data: {
      title: "Pinned " + i,
      body: "",
      updatedOn: "2026-11-16",
      pinned: true,
    },
  }));
  assert.equal(
    (pinnedPanel({ ...base, records: pins }).match(/class="pin-card/g) || [])
      .length,
    8,
  );
  setLanguage("fa");
  const reminder = {
    id: "r",
    kind: "reminder",
    data: {
      title: "Test",
      startDate: "2026-11-16",
      times: ["09:00"],
      repeat: "once",
      interval: 1,
    },
  };
  assert.ok(
    notificationsMarkup({ ...base, records: [reminder] }).includes("۱۴۰۵"),
  );
  setLanguage("en");
  const planner = navigationGroups.find((g) => g.items.includes("notes"));
  assert.deepEqual(planner.items, ["notes", "projects", "habits", "bookmarks", "calendar", "tasks", "reminders", "goals"]);
});

test("notes show only text and card pins, and keep grid/list views independent of tasks and files", () => {
  setLanguage("en");
  const notes = [false, true].map((pinned, i) => ({
    id: `note-${i}`, kind: "note", data: {
      title: `Note ${i}`, body: "A short note", pinned, updatedOn: "2026-11-16",
      checklist: [{ id: `task-${i}`, text: "Buy milk", done: false }],
      attachments: [{ id: `pdf-${i}`, name: "Receipt.pdf", size: 100 }],
    },
  }));
  const html = renderPage({ ...base, page: "notes", records: notes });
  assert.ok(html.indexOf('data-note-open="note-1"') < html.indexOf('data-note-open="note-0"'));
  assert.match(html, /Take a note…/);
  assert.doesNotMatch(html, /note-list-add|data-pdf|data-task-id|canvas-open/);
  assert.equal((html.match(/class="icon-button note-pin/g) || []).length, 2);
  const list = renderPage({ ...base, page: "notes", records: notes, notesView: "list", filter: "short" });
  assert.match(list, /notes-grid notes-list/);
  assert.match(list, /Grid view/);
  const empty = renderPage({ ...base, page: "notes", records: notes, filter: "missing" });
  assert.match(empty, /No matching notes/);
  assert.doesNotMatch(empty, /data-note-open/);
});

test("settings groups start closed and retain an explicitly opened group", () => {
  const html = renderPage({ ...base, page: "settings" });
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:\s|>)/);
  const opened = renderPage({ ...base, page: "settings", settingsGroupsOpen: { calendar: true } });
  assert.match(opened, /data-setting-group="calendar" open/);
  assert.doesNotMatch(opened, /data-setting-group="appearance" open/);
});
