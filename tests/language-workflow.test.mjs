import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { LanguageController } from "../src/DameDast.Web/wwwroot/language-controller.js";
import { validateLanguage } from "../src/DameDast.Web/wwwroot/language-model.js";
import { renderLanguagePage } from "../src/DameDast.Web/wwwroot/language-ui.js";

function fixture(t) {
  const { document, window } = parseHTML("<html><body></body></html>");
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
  };
  const drafts = new Map();
  const localStorage = {
    getItem: (k) => drafts.get(k) || null,
    setItem: (k, v) => drafts.set(k, v),
    removeItem: (k) => drafts.delete(k),
  };
  Object.assign(globalThis, { document, window, localStorage });
  Object.defineProperty(window.HTMLElement.prototype, "elements", {
    configurable: true,
    get() {
      return Object.fromEntries(
        [...this.querySelectorAll("[name]")].map((e) => [e.name, e]),
      );
    },
  });
  window.HTMLElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event("close"));
  };
  window.HTMLElement.prototype.focus = function () {};
  const c = { space: "test-language", page: "languageEssays", records: [{
    id: crypto.randomUUID(), kind: "languageVocabulary", version: 1,
    data: {date:"2026-11-26",title:"My words",topic:"My day",read:false,
      words:[{term:"happy",meaning:"خوشحال",example:"I am happy."}]},
  }] };
  let fail = false;
  const controller = new LanguageController({
    context: () => c,
    refresh() {},
    error(e) {
      throw e;
    },
    async save(kind, data, id, remove, version) {
      if (fail) throw Error("Save failed");
      const previous = c.records.find((r) => r.id === id);
      assert.equal(previous?.version || 0, version);
      validateLanguage(kind, data, c.records, id);
      c.records = [
        ...c.records.filter((r) => r.id !== id),
        { id, kind, data: structuredClone(data), version: version + 1 },
      ];
    },
  });
  const field = (name) => controller.dialog.querySelector(`[name="${name}"]`);
  const type = (name, value) => {
    field(name).value = value;
    controller.input({ target: field(name) });
  };
  t.after(() => Object.assign(globalThis, previous));
  return {
    controller,
    c,
    type,
    field,
    drafts,
    fail: () => {
      fail = true;
    },
  };
}

test("saving writing opens review; review save stays yellow until Done reviewed, then edits reopen review", async (t) => {
  const f = fixture(t),
    ui = f.controller;
  ui.openEssay("2026-11-26");
  assert.equal(
    ui.dialog.querySelector('[data-lang-action="mark-error"]'),
    null,
  );
  assert.equal(
    ui.dialog.querySelector('[data-lang-action="review-mode"]').disabled,
    true,
  );
  f.type("body", "I is happy.");
  await ui.save();
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.active.essayMode, "review");
  assert.equal(ui.dialog.querySelector("[data-essay-write]").hidden, true);
  assert.equal(
    f.c.records.find((r) => r.kind === "languageEssay").data.reviewed,
    false,
  );
  assert.match(renderLanguagePage(f.c, ui), /language-day-status is-written/);
  f.type("reviewNotes", "Use am with I. توضیح اشتباه");
  await ui.save();
  assert.equal(ui.dialog.open, false);
  const saved = f.c.records.find((r) => r.kind === "languageEssay");
  assert.equal(saved.data.reviewNotes, "Use am with I. توضیح اشتباه");
  assert.equal(saved.data.reviewed, false);
  ui.openEssay(saved.data.date);
  assert.equal(ui.active.essayMode, "review");
  assert.equal(f.field("reviewNotes").value, saved.data.reviewNotes);
  await ui.save(true);
  assert.equal(
    f.c.records.find((r) => r.kind === "languageEssay").data.reviewed,
    true,
  );
  assert.match(renderLanguagePage(f.c, ui), /language-day-status is-reviewed/);
  ui.openEssay(saved.data.date);
  ui.setEssayMode(false);
  f.type("body", "I am happy.");
  await ui.save();
  assert.equal(
    f.c.records.find((r) => r.kind === "languageEssay").data.reviewed,
    false,
  );
});

test("failed review saves keep notes and drafts without completing the review", async (t) => {
  const f = fixture(t),
    ui = f.controller;
  ui.openEssay("2026-11-26");
  f.type("body", "I is happy.");
  await ui.save();
  f.type("reviewNotes", "Use am.");
  f.fail();
  await assert.rejects(ui.save(true), /Save failed/);
  assert.equal(ui.dialog.open, true);
  assert.equal(f.field("reviewNotes").value, "Use am.");
  assert.equal(ui.active.data.reviewed, false);
  assert.equal(
    JSON.parse(f.drafts.get(ui.active.key)).data.reviewNotes,
    "Use am.",
  );
  assert.equal(
    f.c.records.find((r) => r.kind === "languageEssay").data.reviewed,
    false,
  );
});

test("an essay on an empty day asks for user words and never creates an automatic vocabulary pack", t => {
  const f = fixture(t); f.c.records = [];
  f.controller.openEssay("2026-11-26");
  assert.equal(f.controller.active.kind, "languageVocabulary");
  assert.equal(f.field("words").value, "");
  assert.equal(f.c.records.length, 0);
});
