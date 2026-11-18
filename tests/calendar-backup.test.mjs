import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calendarDate,
  calendarParts,
  viewRange,
  shiftCalendarMonth,
  expandCalendarEntry,
  plannerItems,
  timedColumns,
  validateCalendarEntry,
} from "../src/DameDast.Web/wwwroot/planner.js";
import {
  defaultWorkbench,
  deviceWorkbench,
  validateWorkbench,
  overlaps,
} from "../src/DameDast.Web/wwwroot/workbench.js";
import {
  createBackup,
  restoreBackup,
  validateBackup,
} from "../src/DameDast.Web/wwwroot/backup.js";
import {
  emptyDocument,
  emptyServer,
} from "../src/DameDast.Web/wwwroot/whiteboard/model.mjs";
import { dayHoliday } from "../src/DameDast.Web/wwwroot/holidays.js";
const id = () => crypto.randomUUID();
const event = (extra = {}) => ({
  title: "جلسه / Meeting",
  description: "",
  startDate: "2026-03-21",
  endDate: "2026-03-21",
  allDay: true,
  startTime: null,
  endTime: null,
  kind: "event",
  done: false,
  color: "#72ab95",
  repeat: "none",
  repeatUntil: null,
  repeatCalendar: "persian",
  completedDates: [],
  ...extra,
});
test("Persian and Gregorian views share absolute days; Persian leap/month boundaries never overflow", () => {
  assert.equal(calendarDate(1405, 1, 1), "2026-03-21");
  assert.deepEqual(calendarParts("2026-03-21"), {
    year: 1405,
    month: 1,
    day: 1,
  });
  assert.equal(
    viewRange("2026-03-21", "week", "persian", 6).start,
    "2026-03-21",
  );
  assert.equal(viewRange("2026-03-21", "month", "persian", 6).days.length, 42);
  assert.equal(shiftCalendarMonth("2026-01-31", 1, "gregory"), "2026-02-28");
  assert.equal(shiftCalendarMonth("2026-01-31", 2, "gregory"), "2026-03-31");
  assert.equal(
    calendarParts(shiftCalendarMonth(calendarDate(1405, 6, 31), 1)).day,
    30,
  );
});
test("monthly repeating tasks clamp independently and completion affects only one occurrence", () => {
  const record = {
    id: id(),
    data: event({
      kind: "task",
      startDate: "2026-01-31",
      endDate: "2026-01-31",
      repeat: "monthly",
      repeatCalendar: "gregory",
      completedDates: ["2026-02-28"],
    }),
  };
  const list = expandCalendarEntry(record, "2026-01-01", "2026-04-01");
  assert.deepEqual(
    list.map((i) => i.date),
    ["2026-01-31", "2026-02-28", "2026-03-31"],
  );
  assert.deepEqual(
    list.map((i) => i.done),
    [false, true, false],
  );
  assert.throws(() =>
    validateCalendarEntry(
      event({ allDay: false, startTime: "15:00", endTime: "14:00" }),
    ),
  );
  assert.throws(() => validateCalendarEntry(event({ color: "url(evil)" })));
});
test("calendar projects scheduled checklist tasks and financial due dates without inventing dates", () => {
  const note = {
      id: id(),
      kind: "note",
      data: {
        title: "Note",
        checklist: [
          {
            id: id(),
            text: "زمان‌دار",
            done: false,
            dueDate: "2026-11-16",
            dueTime: "10:00",
          },
          { id: id(), text: "No date", done: false },
        ],
      },
    },
    installment = {
      id: id(),
      kind: "installment",
      data: { title: "قسط", dueDate: "2026-11-16", paid: false },
    };
  const list = plannerItems([note, installment], "2026-11-16", "2026-11-17");
  assert.equal(list.length, 2);
  assert.equal(list.find((i) => i.kind === "task").startTime, "10:00");
  assert.equal(list.find((i) => i.kind === "installment").allDay, true);
});
test("overlapping timed items receive separate lanes; independent events use full width", () => {
  const items = timedColumns([
    { startTime: "09:00", endTime: "10:00" },
    { startTime: "09:30", endTime: "10:30" },
    { startTime: "12:00", endTime: "13:00" },
  ]);
  assert.equal(items[0].columns, 2);
  assert.notEqual(items[0].column, items[1].column);
  assert.equal(items[2].columns, 1);
});
test("responsive desk keeps every enabled card and respects device choices without overlap", () => {
  const layout = defaultWorkbench();
  layout.widgets[0].devices = { phone: false, tablet: true, desktop: true };
  validateWorkbench(layout);
  for (const device of ["phone", "tablet", "desktop"]) {
    const view = deviceWorkbench(layout, device);
    assert.equal(view.columns, { phone: 8, tablet: 16, desktop: 24 }[device]);
    const expected = layout.widgets.filter(widget => widget.devices?.[device] !== false).map(widget => widget.id);
    assert.deepEqual(view.widgets.map(w => w.id), expected);
    for (const a of view.widgets) {
      assert.ok(a.x + a.width <= view.columns);
      assert.ok(a.y + a.height <= view.rows);
      for (const b of view.widgets)
        if (a !== b) assert.equal(overlaps(a, b), false);
    }
  }
  assert.throws(() =>
    validateWorkbench({
      ...layout,
      widgets: [{ ...layout.widgets[0], devices: { phone: "yes" } }],
    }),
  );
});
function canvas() {
  const document = emptyDocument(),
    fileId = "icon",
    bytes = readFileSync(
      new URL("../src/DameDast.Web/wwwroot/icons/icon-192.png", import.meta.url),
    );
  document.scene.elements = [
    {
      id: "image",
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      angle: 0,
      fileId,
    },
  ];
  document.scene.files[fileId] = {
    id: fileId,
    mimeType: "image/png",
    dataURL: "data:image/png;base64," + bytes.toString("base64"),
    created: 1,
  };
  return document;
}
test("full backup includes actual image bytes and restores isolated canvas IDs without replacing records", async () => {
  const whiteboardId = id(),
    records = [
      {
        id: id(),
        kind: "note",
        version: 7,
        data: { title: "رسم", body: "", whiteboardId },
      },
    ],
    document = canvas(),
    backup = await createBackup({
      records,
      scope: "guest",
      prefs: null,
      readCanvas: async () => ({ document, base: emptyServer() }),
    });
  assert.equal(backup.whiteboards.length, 1);
  assert.equal(
    backup.whiteboards[0].document.scene.files.icon.dataURL,
    document.scene.files.icon.dataURL,
  );
  const writes = [],
    restored = await restoreBackup(backup, "guest", {
      writeCanvas: async (...args) => writes.push(args),
    });
  assert.match(restored.scope, /^restore:/);
  assert.notEqual(restored.records[0].data.whiteboardId, whiteboardId);
  assert.equal(records[0].data.whiteboardId, whiteboardId);
  assert.equal(
    writes[0][3].document.scene.files.icon.dataURL,
    document.scene.files.icon.dataURL,
  );
});
test("missing or corrupted canvases reject a backup before any restore write", async () => {
  const whiteboardId = id(),
    records = [
      {
        id: id(),
        kind: "note",
        data: { title: "Keep", body: "", whiteboardId },
      },
    ];
  assert.throws(() =>
    validateBackup({ format: "damdast-v2", records, whiteboards: [] }),
  );
  let writes = 0;
  await assert.rejects(() =>
    restoreBackup({ format: "damedast-v1", records }, "guest", {
      readCanvas: async () => null,
      writeCanvas: async () => writes++,
    }),
  );
  assert.equal(writes, 0);
  const doc = canvas();
  doc.scene.files.icon.mimeType = "image/svg+xml";
  assert.throws(() =>
    validateBackup({
      format: "damdast-v2",
      records,
      whiteboards: [{ id: whiteboardId, document: doc }],
    }),
  );
});
test("holidays and configured weekends stay independent of UI language and view calendar", () => {
  const p = { holidays: true, weekend: "friday" };
  assert.ok(dayHoliday("2026-03-21", p).events.length);
  assert.equal(dayHoliday("2026-11-20", p).weekend, true);
  assert.equal(
    dayHoliday("2026-03-21", { ...p, holidays: false }).events.length,
    0,
  );
});
