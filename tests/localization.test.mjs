import test from "node:test";
import assert from "node:assert/strict";
import {
  setLanguage,
  getLanguage,
  setTheme,
  effectiveTheme,
  t,
  countText,
} from "../src/DameDast.Web/wwwroot/i18n.js";
import { money, dateText } from "../src/DameDast.Web/wwwroot/finance.js";
import { renderPage } from "../src/DameDast.Web/wwwroot/ui.js";

const base = {
  page: "overview",
  records: [],
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
  marketLoading: false,
  marketHistoryLoading: false,
  marketError: "",
};
test("Persian mode localizes money and dates without changing stored values", () => {
  const record = {
    id: "a",
    kind: "account",
    version: 1,
    data: { name: "My account", openingBalance: 125000, color: "teal" },
  };
  const before = structuredClone(record);
  setLanguage("fa");
  assert.equal(money(record.data.openingBalance), "۱۲۵٬۰۰۰");
  assert.match(dateText("2026-11-15", true), /۱۴۰۵/);
  const html = renderPage({ ...base, page: "accounts", records: [record] });
  assert.match(html, /My account/);
  assert.match(html, /حساب جدید/);
  assert.deepEqual(record, before);
  assert.equal(countText(3, "Accounts"), "۳ حساب");
  setLanguage("en");
  assert.equal(money(125000), "125,000");
  assert.match(dateText("2026-11-15", true), /1405/);
});
test("dashboard exposes all four API instruments even without a quote response", () => {
  setLanguage("fa");
  const html = renderPage({ ...base, space: "demo" });
  for (const label of [
    "قیمت‌های روز",
    "طلای ۱۸ عیار",
    "دلار",
    "نقره ۹۹۹",
    "بیت‌کوین",
  ])
    assert.ok(html.includes(label), label);
  assert.equal((html.match(/data-action="market-open"/g) || []).length, 4);
  assert.ok(!html.includes("5,200,000"));
  assert.ok(!html.includes("۵٬۲۰۰٬۰۰۰"));
  setLanguage("en");
});
test("dark preference is independent of language and invalid choices are ignored", () => {
  setTheme("dark");
  setLanguage("fa");
  assert.equal(effectiveTheme(), "dark");
  setLanguage("invalid");
  assert.equal(getLanguage(), "fa");
  assert.equal(t("Save"), "ذخیره");
  setLanguage("en");
  assert.equal(effectiveTheme(), "dark");
  assert.equal(t("Save"), "Save");
  setTheme("light");
});
test("price charts do not invent history for a demo workspace", () => {
  setLanguage("en");
  const html = renderPage({ ...base, page: "market", space: "demo" });
  assert.ok(html.includes("No history yet"));
  assert.ok(!html.includes("polyline"));
});
