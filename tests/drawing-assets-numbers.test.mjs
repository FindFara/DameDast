import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDrawing,
  validateDrawing,
  drawingSvg,
  translateElement,
} from "../src/Poolo.Web/wwwroot/drawing.js";
import {
  decimalUnits,
  decimalText,
  positionGain,
  assetEntries,
  assetHistory,
  validatePosition,
} from "../src/Poolo.Web/wwwroot/assets.js";
import {
  groupedNumeric,
  plainNumeric,
} from "../src/Poolo.Web/wwwroot/number-inputs.js";
const id = () => crypto.randomUUID(),
  at = "2026-11-16T09:00:00Z";
const position = (extra = {}) => ({
  name: "Gold",
  sourceKey: null,
  marketSymbol: "GOLD",
  lots: [
    {
      id: id(),
      quantity: "10",
      costToman: "100000000",
      boughtOn: "2026-11-01",
    },
  ],
  valuations: [],
  ...extra,
});
test("drawing data round trips, escapes text and rejects unsafe elements or oversize strokes", () => {
  const d = emptyDrawing(),
    element = {
      id: id(),
      type: "text",
      x: 100,
      y: 100,
      width: 0,
      height: 0,
      color: "#24785e",
      strokeWidth: 3,
      text: "<img src=x onerror=alert(1)>",
    };
  d.elements.push(element);
  assert.deepEqual(validateDrawing(JSON.parse(JSON.stringify(d))), d);
  assert.ok(drawingSvg(d).includes("&lt;img"));
  assert.ok(drawingSvg(d).includes("stroke:none"));
  assert.ok(!drawingSvg(d).includes("<img"));
  assert.throws(() =>
    validateDrawing({
      ...d,
      elements: [{ ...element, id: '" onload="alert(1)' }],
    }),
  );
  assert.throws(() =>
    validateDrawing({
      ...d,
      elements: [{ ...element, color: "url(https://evil.example)" }],
    }),
  );
});
test("moving strokes clamps every point to the canvas without losing pressure data", () => {
  const e = {
    id: id(),
    type: "pen",
    x: 5,
    y: 5,
    width: 0,
    height: 0,
    color: "#24785e",
    strokeWidth: 3,
    points: [
      { x: 5, y: 5, pressure: 0.2 },
      { x: 20, y: 30, pressure: 0.8 },
    ],
  };
  const moved = translateElement(e, -100, -100, emptyDrawing());
  assert.equal(moved.points[0].x, 0);
  assert.equal(moved.points[0].y, 0);
  assert.equal(moved.points[1].pressure, 0.8);
  assert.equal(e.points[0].x, 5);
});
test("grouping preserves signs, Persian digits, trailing decimals and all eighteen crypto decimals", () => {
  for (const [raw, expected] of [
    ["1000000", "1,000,000"],
    ["-1200000.50", "-1,200,000.50"],
    ["0.000000000000000001", "0.000000000000000001"],
    ["1234.", "1,234."],
  ])
    assert.equal(groupedNumeric(raw), expected);
  assert.equal(groupedNumeric("۱۲۳۴۵۶۷٫۸۹", "fa"), "۱٬۲۳۴٬۵۶۷٫۸۹");
  assert.equal(plainNumeric("۱٬۲۳۴٬۵۶۷٫۸۹"), "1234567.89");
  assert.equal(
    decimalText(decimalUnits("0.000000000000000001")),
    "0.000000000000000001",
  );
});
test("open purchases calculate loss, zero valuation and costless assets without inventing percentages", () => {
  const p = position();
  assert.equal(
    positionGain(p, "2026-11-16", 9000000000n).profitCents,
    -1000000000n,
  );
  assert.equal(positionGain(p, "2026-11-16", 0n).profitPercent, -100);
  assert.equal(
    positionGain({ ...p, lots: [] }, "2026-11-16", 100n).profitCents,
    null,
  );
  assert.equal(
    positionGain(p, "2026-11-16", 12000000000n, "11").status,
    "quantity-changed",
  );
  assert.throws(() =>
    validatePosition(
      position({
        lots: [
          { id: id(), quantity: "-1", costToman: "1", boughtOn: "2026-11-01" },
        ],
      }),
    ),
  );
});
test("asset type and quantity fetch real valuations with explicit USD conversion and matching quantities", () => {
  const records = [
    {
      id: id(),
      kind: "assetPosition",
      data: position({
        name: "Bitcoin",
        marketSymbol: "BTC",
        lots: [
          {
            id: id(),
            quantity: "0.01",
            costToman: "1000000",
            boughtOn: "2026-11-01",
          },
        ],
      }),
    },
  ];
  const market = {
    quotes: [
      { symbol: "BTC", price: 50000, asOf: at, source: "Test" },
      { symbol: "USD", price: 100000, asOf: at, source: "Test" },
    ],
  };
  const a = assetEntries(records, [], market, at)[0];
  assert.equal(a.valueCents, 5000000000n);
  assert.equal(a.profitCents, 4900000000n);
  assert.equal(
    assetEntries(records, [], { quotes: market.quotes.slice(0, 1) }, at)[0]
      .valueCents,
    null,
  );
});
test("unconfigured imported holdings keep their actual quantity and unknown cost", () => {
  const s = {
    provider: "agah",
    account: "Main",
    scope: "Portfolio",
    category: "assets",
    capturedAt: at,
    items: [
      { key: "x", label: "فولاد", quantity: "12500", valueToman: "20000000" },
    ],
  };
  const a = assetEntries([], [s], null, at)[0];
  assert.equal(a.quantity, "12500");
  assert.equal(a.profitCents, null);
  assert.equal(a.valueCents, 2000000000n);
});
test("profit history excludes future quotes and requires a same-day dollar rate for crypto", () => {
  const p = position({
      marketSymbol: "BTC",
      lots: [
        { id: id(), quantity: "1", costToman: "100", boughtOn: "2026-11-01" },
      ],
    }),
    a = { position: p, status: "ready", symbol: "BTC", asOf: null };
  const ts = (date) => Date.parse(date + "T12:00:00Z") / 1000,
    quotes = [
      { timestamp: ts("2026-11-10"), price: 2 },
      { timestamp: ts("2026-11-12"), price: 3 },
      { timestamp: ts("2026-11-17"), price: 4 },
    ],
    fx = [{ timestamp: ts("2026-11-10"), price: 100 }];
  const history = assetHistory(a, quotes, fx, 30, at);
  assert.equal(history.length, 1);
  assert.equal(history[0].profit, 100);
});

test("asset type plus quantity is sufficient for a value, while a blank purchase cost remains unknown", () => {
  const p = position({
    lots: [
      { id: id(), quantity: "10", costToman: null, boughtOn: "2026-11-01" },
    ],
  });
  validatePosition(p);
  const result = assetEntries(
    [{ id: id(), kind: "assetPosition", data: p }],
    [],
    { quotes: [{ symbol: "GOLD", price: 20000000, asOf: at, source: "Test" }] },
    at,
  )[0];
  assert.equal(result.valueCents, 20000000000n);
  assert.equal(result.profitCents, null);
  assert.equal(result.status, "missing-cost");
});

test("daily profit history retains multiple real observations on the same day", () => {
  const p = position(),
    asset = { position: p, status: "ready", symbol: "GOLD", asOf: null };
  const ts = (s) => Date.parse(s) / 1000;
  const points = assetHistory(
    asset,
    [
      { timestamp: ts("2026-11-16T04:00:00Z"), price: 12000000 },
      { timestamp: ts("2026-11-16T08:00:00Z"), price: 13000000 },
    ],
    [],
    1,
    at,
  );
  assert.equal(points.length, 2);
  assert.equal(points[1].profit, 30000000);
});

test("a new asset form accepts empty initial data and keeps purchase cost optional", async () => {
  const { assetEditorFields } =
    await import("../src/Poolo.Web/wwwroot/assets-ui.js");
  const html = assetEditorFields({});
  assert.match(html, /data-lot-quantity[^>]*required/);
  assert.ok(!/data-lot-cost[^>]*required/.test(html));
  assert.match(html, /name="marketSymbol"/);
});
