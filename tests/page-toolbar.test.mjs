import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { PageToolbarController } from "../src/DameDast.Web/wwwroot/page-toolbar.js";
function fixture(t) {
  const { document, window } = parseHTML(
    '<html><body><div class="mobile-page-header"><h1 id="mobile-page-title"></h1><div id="page-toolbar-actions" hidden></div></div><div id="view"></div></body></html>',
  );
  const saved = {
    document: globalThis.document,
    MutationObserver: globalThis.MutationObserver,
    matchMedia: globalThis.matchMedia,
  };
  let mobile = true;
  Object.assign(globalThis, {
    document,
    MutationObserver: window.MutationObserver,
    matchMedia: () => ({ matches: mobile }),
  });
  const oldMatches = window.HTMLElement.prototype.matches;
  window.HTMLElement.prototype.matches = function (selector) {
    return selector === ":popover-open"
      ? false
      : oldMatches.call(this, selector);
  };
  const controller = new PageToolbarController();
  t.after(() => {
    controller.restore();
    Object.assign(globalThis, saved);
  });
  return {
    document,
    view: document.querySelector("#view"),
    holder: document.querySelector("#page-toolbar-actions"),
    controller,
    desktop: () => {
      mobile = false;
    },
  };
}
test("the toolbar reuses dashboard controls and restores the same nodes on desktop", (t) => {
  const f = fixture(t);
  f.view.innerHTML =
    '<div class="page-heading overview-heading"><h1>Dashboard</h1><div class="heading-actions"><div class="dashboard-controls"><input value="month"><button data-action="dashboard-privacy">eye</button></div></div></div>';
  const node = f.view.querySelector(".dashboard-controls"),
    input = node.querySelector("input");
  input.value = "1405-10";
  f.controller.update("overview", "Dashboard");
  assert.equal(f.holder.firstElementChild, node);
  assert.equal(input.value, "1405-10");
  f.desktop();
  f.controller.update("overview", "Dashboard");
  assert.equal(
    f.view.querySelector(".heading-actions").firstElementChild,
    node,
  );
  assert.equal(f.holder.hidden, true);
  assert.equal(input.value, "1405-10");
});
test("export and filter proxies run the original handlers and do not leak into another page", (t) => {
  const f = fixture(t);
  f.view.innerHTML =
    '<div class="page-heading"><h1>Transactions</h1><div class="heading-actions"><button data-action="add">New transaction</button></div></div><div class="transaction-tools"><button data-action="csv">Export CSV</button><button data-action="transaction-filters-toggle">Filters</button></div>';
  let exported = 0,
    filtered = 0;
  const source = f.view.querySelector("[data-action=csv]");
  source.onclick = () => exported++;
  f.view.querySelector("[data-action=transaction-filters-toggle]").onclick =
    () => filtered++;
  f.controller.update("transactions", "Transactions");
  const commands = [
    ...f.controller.menu.querySelectorAll("[data-page-command]"),
  ];
  commands.find((b) => b.textContent.includes("Export CSV")).click();
  commands.find((b) => b.textContent.includes("Filters")).click();
  assert.equal(exported, 1);
  assert.equal(filtered, 1);
  assert.equal(source.classList.contains("page-toolbar-source"), true);
  f.view.innerHTML =
    '<div class="page-heading"><h1>Accounts</h1><button data-action="add">New account</button></div>';
  f.controller.update("accounts", "Accounts");
  assert.equal(f.controller.menu, null);
  assert.doesNotMatch(f.holder.textContent, /Export CSV|Filters/);
  assert.equal(
    f.document.querySelector("#mobile-page-title").textContent,
    "Accounts",
  );
});
test("disabled state and account-specific source nodes are respected by toolbar proxies", (t) => {
  const f = fixture(t);
  f.view.innerHTML =
    '<div class="page-heading"><h1>Accounts</h1><button data-action="add" disabled>New account</button></div>';
  const source = f.view.querySelector("button");
  let calls = 0;
  source.onclick = () => calls++;
  f.controller.update("accounts", "Accounts");
  const proxy = f.holder.querySelector("button");
  assert.equal(proxy.disabled, true);
  proxy.click();
  assert.equal(calls, 0);
  source.disabled = false;
  f.controller.syncCommandState();
  assert.equal(proxy.disabled, false);
  proxy.click();
  assert.equal(calls, 1);
  source.remove();
  proxy.click();
  assert.equal(calls, 1);
});
