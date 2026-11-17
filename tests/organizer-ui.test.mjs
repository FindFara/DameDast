import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { renderPage } from "../src/Poolo.Web/wwwroot/ui.js";
import {
  organizerEditorFields,
  pinnedPanel,
  notificationsMarkup,
} from "../src/Poolo.Web/wwwroot/organizer-ui.js";
import { setLanguage } from "../src/Poolo.Web/wwwroot/i18n.js";
import { instruments } from "../src/Poolo.Web/wwwroot/market-catalog.js";
import { navigationGroups } from "../src/Poolo.Web/wwwroot/navigation.js";
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
          "../src/Poolo.Application/Features/Market/market-catalog.json",
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
test("notes, tasks, reminders and goals share the planner, and user text stays escaped", () => {
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
  for (const page of ["notes", "canvas", "calendar", "tasks", "reminders", "goals"]) {
    const html = renderPage({ ...base, page, records: [note], planner:{date:"2026-11-16",view:"month",filters:["event","task","reminder","installment","goal"]} });
    assert.ok(html.includes("organizer-tabs"));
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img src=x>"));
  }
  const html = organizerEditorFields("note", note.data);
  assert.ok(html.includes("&lt;b&gt;Task&lt;/b&gt;"));
  assert.ok(html.includes('data-task-id="task"'));
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
  assert.deepEqual(planner.items, ["notes", "canvas", "calendar", "tasks", "reminders", "goals"]);
});
