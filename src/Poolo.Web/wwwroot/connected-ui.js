import { renderPortfolio } from "./extension/shared/view.js";
import { FORMAT } from "./extension/shared/portfolio.js";
import { t, getLanguage } from "./i18n.js";
export function connectedPage(c) {
  const local = !c.connectedSession?.authenticated,
    status =
      {
        local: "On this device",
        synced: "Cloud synced",
        syncing: "Syncing",
        pending: "Pending changes",
        conflict: "Conflict",
        "sign-in": "Sign in to sync",
      }[c.connectedStatus] || "On this device";
  return `<div class="page-heading"><h1>${t("Connected portfolio")}</h1><a class="primary button" href="/downloads/damdast-extension.zip" download>${t("Download extension")}</a></div><div class="connected-toolbar"><button class="primary" data-action="connected-read">${t("Receive from extension")}</button><button class="secondary" data-action="connected-import">${t("Import JSON")}</button><button class="secondary" data-action="connected-export">${t("Export JSON")}</button>${c.session?.hostedPreview && c.connectedSession?.syncProvider === "google" ? `<button class="secondary" data-action="connected-legacy">${t("Import previous captures")}</button>` : ""}<button class="secondary" data-action="connected-refresh" ${local ? "disabled" : ""}>${t("Sync")}</button><span class="connected-status">${t(status)}${c.connectedSession?.syncProvider === "site" ? " · ChatGPT" : c.connectedSession?.authenticated ? " · Google" : ""}</span></div><input type="file" id="connected-file" accept="application/json,.json" class="connected-upload"><div class="connected-error" role="status">${c.connectedError ? t(c.connectedError) : ""}</div>${c.connectedStatus === "conflict" ? `<button class="text-button" data-action="connected-cloud">${t("Reload cloud data")}</button>` : ""}${renderPortfolio(c.connectedSnapshots || [], getLanguage(), c.connectedFilter || "all", c.space !== "demo")}<section class="panel connected-setup"><details><summary>${t("Connect the extension")}</summary><p>${t("Install the extension in desktop Chrome or Edge. Open your provider portfolio or installment page and capture it. Review the columns and save. In the extension, connect this app URL, then return here to receive the captures.")}</p><code dir="ltr">${location.origin}</code><p>${t("Mobile Chrome does not run this extension. Sync here, then open the same app account on your phone.")}</p><p>${t("Live provider accounts have not been verified. Table mapping and manual CSV are available; missing data stays unknown.")}</p></details><details><summary>${t("Cloud sync")}</summary><p>${t("Google sign-in syncs your full notebook and finances. Existing ChatGPT portfolio captures can be imported after Google sign-in. Source passwords and cookies are never collected.")}</p>${local ? `<p>${t("Currently local. Sign in to your deployed app to sync across devices.")}</p>` : ""}</details><a class="text-link" href="/extension/manager.html" target="_blank" rel="noopener">${t("Paste a table / CSV")} ↗</a></section>`;
}
export function demoPortfolio() {
  const now = new Date().toISOString(),
    base = (provider, category, items) => ({
      format: FORMAT,
      captureId: "demo-" + provider,
      recordId: "demo-" + provider,
      provider,
      account: getLanguage() === "fa" ? "نمونه" : "Demo",
      scope:
        category === "assets"
          ? getLanguage() === "fa"
            ? "پرتفو"
            : "Portfolio"
          : getLanguage() === "fa"
            ? "اقساط"
            : "Installments",
      category,
      capturedAt: now,
      coverage: "partial",
      items: items.map((i) => ({ ...i, observedAt: now })),
    });
  const asset = (
    key,
    label,
    assetType,
    quantity,
    valueToman,
    lockedToman = null,
  ) => ({
    key,
    label,
    symbol: label,
    assetType,
    quantity,
    valueToman,
    lockedToman,
  });
  const due = new Date();
  due.setDate(due.getDate() + 3);
  const date = due.toISOString().slice(0, 10);
  return [
    base("easytrader", "assets", [
      asset("foolad", "فولاد", "equity", "12500", "18625000"),
      asset("fund", "اطلس", "equity", "4600", "18400000"),
    ]),
    base("agah", "assets", [
      asset("fملی", "فملی", "equity", "8000", "7280000"),
    ]),
    base("nobitex", "assets", [
      asset("btc", "BTC", "crypto", "0.0064", "110000000", "10000000"),
      asset("usdt", "USDT", "crypto", "145.5", "38500000"),
    ]),
    base("digipay", "installments", [
      {
        key: "dg-01",
        label: getLanguage() === "fa" ? "لپ‌تاپ · ۲/۴" : "Laptop · 2/4",
        amountToman: "3500000",
        dueDate: date,
        status: "unpaid",
      },
      {
        key: "dg-02",
        label: getLanguage() === "fa" ? "لپ‌تاپ · ۱/۴" : "Laptop · 1/4",
        amountToman: "3500000",
        dueDate: date,
        status: "paid",
      },
    ]),
    base("snapppay", "installments", [
      {
        key: "sp-01",
        label: getLanguage() === "fa" ? "خرید · ۲/۴" : "Shopping · 2/4",
        amountToman: "1250000",
        dueDate: date,
        status: "unpaid",
      },
    ]),
  ];
}
