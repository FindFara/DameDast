import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultWorkbench,
  validateWorkbench,
  canPlace,
  firstFreeSpace,
  changedRectangle,
  replaceWidget,
  widgetCatalog,
  deskContrast,
} from "../src/DameDast.Web/wwwroot/workbench.js";
import { workbenchPage } from "../src/DameDast.Web/wwwroot/workbench-ui.js";
import { setLanguage } from "../src/DameDast.Web/wwwroot/i18n.js";
import { icon, renderPage } from "../src/DameDast.Web/wwwroot/ui.js";
import { makeDemo, materialize } from "../src/DameDast.Web/wwwroot/finance.js";
const id = () => crypto.randomUUID();
const widget = (extra = {}) => ({
  id: id(),
  type: "notes",
  x: 0,
  y: 0,
  width: 4,
  height: 2,
  background: null,
  title: null,
  referenceId: null,
  ...extra,
});
const layout = (widgets = []) => ({
  version: 1,
  columns: 12,
  rows: 6,
  background: null,
  widgets,
});
test("a desk has exactly 12 columns and 6 rows; overlapping, unsafe or unbounded cards are rejected", () => {
  validateWorkbench(layout([widget({ width: 12, height: 6 })]));
  for (const w of [
    widget({ x: 12 }),
    widget({ height: 7 }),
    widget({ width: 0 }),
    widget({ x: 0.5 }),
    widget({ type: "<script>" }),
    widget({ background: "url(https://evil.test)" }),
    widget({ id: "x" }),
    widget({ referenceId: "x" }),
  ])
    assert.throws(() => validateWorkbench(layout([w])));
  assert.throws(() => validateWorkbench({ ...layout(), rows: 7 }));
  assert.throws(() => validateWorkbench(layout([widget(), widget()])));
  assert.throws(() => validateWorkbench(layout([widget(), null])));
  const w = widget();
  assert.throws(() => validateWorkbench(layout([w, w])));
});
test("edge snapping is bounded in every direction and occupied cells never overwrite neighbors", () => {
  const w = widget({ x: 8, y: 4 }),
    desk = layout([w, widget({ x: 0, y: 0 })]);
  assert.equal(changedRectangle(w, 20, 20).x, 8);
  assert.equal(changedRectangle(w, -20, -20).y, 0);
  assert.equal(changedRectangle(w, 30, 30, true).width, 4);
  assert.equal(changedRectangle(w, -30, -30, true).height, 1);
  assert.equal(canPlace(desk, changedRectangle(w, -8, -4), w.id), false);
  assert.throws(() => replaceWidget(desk, changedRectangle(w, -8, -4)));
  const next = replaceWidget(desk, changedRectangle(w, -4, 0));
  assert.equal(next.widgets[0].x, 4);
  assert.equal(desk.widgets[0].x, 8);
});
test("row-major placement uses all 72 cells, then reports a full desk", () => {
  const d = layout();
  for (let n = 0; n < 72; n++) {
    const rect = firstFreeSpace(d, 1, 1);
    assert.deepEqual([rect.x, rect.y], [n % 12, Math.floor(n / 12)]);
    d.widgets.push(widget(rect));
  }
  validateWorkbench(d);
  assert.equal(firstFreeSpace(d, 1, 1), null);
});
test("default layouts are independent copies with stable IDs; custom colors remain readable", () => {
  const a = defaultWorkbench(),
    b = defaultWorkbench();
  validateWorkbench(a);
  assert.deepEqual(a, b);
  a.widgets[0].width = 1;
  assert.equal(b.widgets[0].width, 16);
  assert.equal(deskContrast("#ffffff"), "#18392e");
  assert.equal(deskContrast("#000000"), "#f2f6f3");
  assert.equal(deskContrast(null), null);
});
test("all components render live financial records, references and safe user text", () => {
  const records = materialize(makeDemo()).filter((r) => !r.deleted),
    base = {
      page: "workbench",
      records,
      space: "demo",
      now: "2026-11-16T08:00:00Z",
      month: "1405-08",
      workbenchEditing: false,
      connectedSnapshots: [],
      marketData: null,
    };
  const before = structuredClone(records);
  for (const spec of widgetCatalog) {
    const d = layout([
      widget({
        type: spec.type,
        width: 12,
        height: 6,
        title: '<img src=x onerror="bad()">',
      }),
    ]);
    const html = renderPage({
      ...base,
      records: [...records, { id: id(), kind: "workbench", data: d }],
    });
    assert.ok(html.includes('id="desk-board"'));
    assert.ok(!html.includes("<img src=x"));
    assert.doesNotMatch(html, /desk-card-head/);
    assert.equal((html.match(/<div class="desk-grid"/g) || []).length, 0);
  }
  assert.deepEqual(records, before);
  const missing = layout([widget({ referenceId: id() })]);
  assert.match(
    workbenchPage(
      { ...base, records: [{ kind: "workbench", data: missing }] },
      icon,
    ),
    /no longer available/,
  );
  setLanguage("fa");
  assert.match(workbenchPage(base, icon), /میز کار/);
  setLanguage("en");
});
