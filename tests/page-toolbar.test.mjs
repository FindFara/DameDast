import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { PageToolbarController } from "../src/DameDast.Web/wwwroot/page-toolbar.js";
function fixture(t) {
  const { document, window } = parseHTML('<html><body><div class="mobile-page-header"><h1 id="mobile-page-title"></h1><div id="page-toolbar-actions" hidden></div></div><div id="view"></div></body></html>');
  const saved = { document: globalThis.document, MutationObserver: globalThis.MutationObserver };
  Object.assign(globalThis, { document, MutationObserver: window.MutationObserver });
  const oldMatches = window.HTMLElement.prototype.matches;
  window.HTMLElement.prototype.matches = function (selector) {
    return selector === ":popover-open" ? false : oldMatches.call(this, selector);
  };
  window.HTMLElement.prototype.focus = function () {};
  const controller = new PageToolbarController();
  t.after(() => { controller.restore(); Object.assign(globalThis, saved); });
  return { document, view: document.querySelector("#view"), holder: document.querySelector("#page-toolbar-actions"), controller, window };
}

test("dashboard controls start collapsed, expand together and keep their state across rerenders", t => {
  const f = fixture(t);
  f.view.innerHTML = '<div class="page-heading overview-heading"><h1>Dashboard</h1><div class="heading-actions"><div class="dashboard-controls"><input value="month"><button data-action="dashboard-privacy">eye</button></div></div></div>';
  const node = f.view.querySelector(".dashboard-controls"), input = node.querySelector("input");
  input.value = "1405-10";
  f.controller.update("overview", "Dashboard");
  assert.equal(f.holder.querySelector(".dashboard-controls"), node);
  assert.equal(f.controller.panel.inert, true);
  assert.equal(f.controller.trigger.getAttribute("aria-expanded"), "false");
  f.controller.trigger.click();
  assert.equal(f.controller.panel.inert, false);
  assert.equal(f.controller.trigger.getAttribute("aria-expanded"), "true");
  f.controller.update("overview", "Dashboard");
  assert.equal(f.controller.expanded, true);
  assert.equal(f.holder.querySelector("input").value, "1405-10");
  f.controller.restore();
  assert.equal(f.view.querySelector(".heading-actions").firstElementChild, node);
  assert.equal(input.value, "1405-10");
});

test("transactions expose only download and route it to the real handler; filters stay in the page", t => {
  const f = fixture(t);
  f.view.innerHTML = '<div class="page-heading"><h1>Transactions</h1><button data-action="add">New transaction</button></div><button data-action="csv">Export CSV</button><button data-action="transaction-filters-toggle">Filters</button>';
  let exported = 0;
  const source = f.view.querySelector("[data-action=csv]");
  source.onclick = () => exported++;
  f.controller.update("transactions", "Transactions");
  assert.deepEqual([...f.holder.querySelectorAll("[data-page-command]")].map(b => b.dataset.pageCommand), ["csv"]);
  f.controller.open();
  f.holder.querySelector("[data-page-command]").click();
  assert.equal(exported, 1);
  assert.equal(f.view.querySelector('[data-action="transaction-filters-toggle"]').classList.contains("page-toolbar-source"), false);
  f.view.innerHTML = '<div class="page-heading"><h1>Accounts</h1><button data-action="add">New account</button></div>';
  f.controller.update("accounts", "Accounts");
  assert.equal(f.controller.expanded, false);
  assert.equal(f.holder.querySelector('[data-page-command="csv"]'), null);
  assert.equal(f.document.querySelector("#mobile-page-title").textContent, "Accounts");
});

test("disabled or disconnected account actions cannot execute through a stale toolbar", t => {
  const f = fixture(t);
  f.view.innerHTML = '<div class="page-heading"><h1>Accounts</h1><button data-action="add" disabled>New account</button></div>';
  const source = f.view.querySelector("button");
  let calls = 0;
  source.onclick = () => calls++;
  f.controller.update("accounts", "Accounts");
  const proxy = f.holder.querySelector("[data-page-command]");
  assert.equal(proxy.disabled, true);
  proxy.click();
  assert.equal(calls, 0);
  source.disabled = false;
  f.controller.syncCommandState();
  proxy.click();
  assert.equal(calls, 1);
  source.remove();
  proxy.click();
  assert.equal(calls, 1);
});

test("unsupported pages have no extra toggle and planning pages only expose creation", t => {
  const f = fixture(t);
  for (const page of ["market", "settings", "reports", "connected", "workbench", "suggestions"]) {
    f.view.innerHTML = '<div class="page-heading"><h1>Page</h1><button data-action="add">Add</button><button data-action="csv">Export</button></div>';
    f.controller.update(page, "Page");
    assert.equal(f.holder.hidden, true, page);
    assert.equal(f.holder.childElementCount, 0, page);
  }
  for (const [page, action] of [["tasks", "task-add"], ["projects", "add"], ["calendar", "new"], ["assets", "asset-add"]]) {
    f.view.innerHTML = `<div class="page-heading"><h1>Page</h1><button ${page === "calendar" ? "data-planner-action" : "data-action"}="${action}">Create</button><button data-action="csv">Export</button></div>`;
    f.controller.update(page, "Page");
    assert.equal(f.holder.querySelectorAll("[data-page-command]").length, 1, page);
    assert.equal(f.holder.querySelector("[data-page-command]").dataset.pageCommand, action, page);
  }
});

test("Escape collapses the rail and removes its actions from keyboard navigation", t => {
  const f = fixture(t);
  f.view.innerHTML = '<div class="page-heading"><button data-action="add">New account</button></div>';
  f.controller.update("accounts", "Accounts");
  f.controller.open();
  const event = new f.window.Event("keydown", { bubbles: true, cancelable: true });
  event.key = "Escape";
  f.holder.dispatchEvent(event);
  assert.equal(f.controller.expanded, false);
  assert.equal(f.controller.panel.inert, true);
  assert.equal(f.controller.trigger.getAttribute("aria-expanded"), "false");
});
