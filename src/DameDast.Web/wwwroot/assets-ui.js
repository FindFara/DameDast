import { closeIcon } from "./ui-icons.js";
import { assetEntries, assetHistory, decimalText } from "./assets.js";
import { instruments } from "./market-catalog.js";
import { t, localizedNumber, getLanguage } from "./i18n.js";
import { money, escapeHtml as esc, today } from "./finance.js";
import { tehranParts } from "./organizer.js";
import { groupedNumeric } from "./number-inputs.js";
import { dateControl, solarText, solarNumeric } from "./calendar.js";
const amount = (cents) =>
  cents == null ? "—" : groupedNumeric(decimalText(cents, 2), getLanguage());
const statusLabels = {
  "old-valuation": "Valuation predates the latest purchase.",
  "missing-cost": "Add your purchase cost",
  "quantity-changed": "Quantity changed. Update open purchases.",
  "missing-value": "Add a valuation or link a market symbol.",
  "missing-source": "Source unavailable. Sync the captured asset again.",
};
export function assetsPage(c, embedded = false) {
  const assets = assetEntries(
      c.records,
      c.connectedSnapshots,
      c.marketData,
      c.now,
    ),
    selected =
      assets.find((a) => a.key === c.assetKey) ||
      assets.find((a) => a.status === "ready") ||
      assets.find((a) => a.position.lots.some((l) => l.costToman != null)) ||
      assets[0],
    priced = assets.filter((a) => a.valueCents !== null),
    known = assets.filter((a) => a.profitCents !== null),
    value = priced.reduce((s, a) => s + a.valueCents, 0n),
    profit = known.reduce((s, a) => s + a.profitCents, 0n),
    cost = known.reduce((s, a) => s + a.costCents, 0n);
  return `${embedded?'':`<div class="page-heading"><div><span class="eyebrow">${t("YOUR PORTFOLIO")}</span><h1>${t("Asset performance")}</h1><p class="small-note">${t("Unrealized gains on the open purchases you record.")}</p></div><button type="button" class="primary" data-action="asset-add">+ ${t("New asset")}</button></div>`}<div class="asset-summary"><article class="panel"><span>${t("Tracked value")}</span><strong>${amount(value)} <small>${t("toman")}</small></strong><small>${localizedNumber(priced.length)} / ${localizedNumber(assets.length)} ${t("valued assets")}</small></article><article class="panel"><span>${t("Unrealized profit / loss")}</span><strong class="${profit < 0 ? "negative" : "positive"}">${known.length ? amount(profit) : "—"} <small>${t("toman")}</small></strong><small>${localizedNumber(known.length)} ${t("assets with known cost")}${cost > 0n ? " · " + localizedNumber((Number(profit) / Number(cost)) * 100, 2) + "%" : ""}</small></article><article class="panel"><span>${t("Purchase cost")}</span><strong>${known.length ? amount(cost) : "—"} <small>${t("toman")}</small></strong><small>${t("Fees belong in the total purchase cost.")}</small></article></div>${
    selected
      ? `<section class="panel asset-detail"><div class="asset-detail-head"><div><span class="eyebrow">${esc(selected.symbol || t("Manual valuation"))}</span><h2 dir="auto">${esc(c.space === "demo" ? t(selected.name) : selected.name)}</h2><strong class="${(selected.profitCents || 0n) < 0 ? "negative" : "positive"}">${amount(selected.profitCents)} ${t("toman")}${selected.profitPercent != null ? ` <small>(${localizedNumber(selected.profitPercent, 2)}%)</small>` : ""}</strong></div><div class="segment-control">${[
          [1, "Daily"],
          [7, "Weekly"],
          [30, "Monthly"],
        ]
          .map(
            ([days, label]) =>
              `<button type="button" data-action="asset-period" data-days="${days}" aria-pressed="${(c.assetPeriod || 30) === days}" class="${(c.assetPeriod || 30) === days ? "active" : ""}">${t(label)}</button>`,
          )
          .join(
            "",
          )}</div></div>${performanceChart(selected, c)}<div class="asset-detail-foot"><span>${selected.asOf ? `${t("Valued on")} ${solarText(tehranParts(selected.asOf).date) + " · " + tehranParts(selected.asOf).time} · ${esc(t(selected.valueSource))}` : t("Valuation date not supplied by the source.")}</span><button type="button" class="secondary" data-action="asset-edit" data-key="${esc(selected.key)}">${t("Purchases & valuation")}</button></div></section>`
      : ""
  }<div class="asset-cards">${
    assets
      .map(
        (a) =>
          `<article class="panel asset-card ${a.key === selected?.key ? "selected" : ""}"><button type="button" class="asset-card-title" data-action="asset-select" data-key="${esc(a.key)}"><span class="asset-monogram">${esc(a.symbol?.slice(0, 3) || "◈")}</span><span><strong dir="auto">${esc(c.space === "demo" ? t(a.name) : a.name)}</strong><small>${esc(groupedNumeric(a.quantity ?? "—", getLanguage()))} ${t(
            instruments
              .find((i) => i.symbol === a.symbol)
              ?.unit.split("/")
              .at(-1)
              .trim() || "units",
          )} · ${esc(t(a.source?.source || "Personal asset"))}</small></span></button><div class="asset-values"><div><span>${t("Value")}</span><strong>${amount(a.valueCents)}</strong></div><div><span>${t("Purchase cost")}</span><strong>${a.status === "missing-cost" ? "—" : amount(a.costCents)}</strong></div></div><div class="asset-gain ${a.profitCents != null ? (a.profitCents < 0 ? "negative" : "positive") : ""}"><strong>${amount(a.profitCents)}</strong><span>${a.profitPercent != null ? localizedNumber(a.profitPercent, 2) + "%" : t(statusLabels[a.status] || "Unrealized profit / loss")}</span></div><div class="card-foot"><small>${a.delayed ? t("Delayed") : a.dated ? solarText(tehranParts(a.asOf).date) : t("Undated capture")}</small><button type="button" class="text-button" data-action="asset-edit" data-key="${esc(a.key)}">${t(a.record ? "Edit purchases" : "Set purchase cost")}</button>${a.record ? `<button type="button" class="text-button negative" data-action="delete" data-id="${a.record.id}">${t("Delete")}</button>` : ""}</div></article>`,
      )
      .join("") ||
    `<section class="panel empty">${t("Add an asset or receive your holdings from the extension.")}</section>`
  }</div><p class="small-note">${t("Only open holdings are compared. Sold positions and dividends are not included. Charts use available unadjusted market prices or your dated valuations.")}</p>`;
}
function performanceChart(a, c) {
  if (a.status !== "ready")
    return `<div class="asset-chart-empty">${t(statusLabels[a.status])}</div>`;
  const points = assetHistory(
    a,
    c.assetCurves?.[a.symbol] || [],
    c.assetCurves?.USD || [],
    c.assetPeriod || 30,
    c.now,
  );
  if (c.assetHistoryLoading)
    return `<div class="asset-chart-empty">${t("Loading")}</div>`;
  if (points.length < 2)
    return `<div class="asset-chart-empty"><strong>${t("History is still accumulating.")}</strong><p>${t("Add dated valuations or wait for more market observations. Missing prices are not estimated.")}</p></div>`;
  const W = 900,
    H = 220,
    pad = 15,
    min = Math.min(0, ...points.map((p) => p.profit)),
    max = Math.max(0, ...points.map((p) => p.profit)),
    range = max - min || 1,
    start = points[0].timestamp,
    span = points.at(-1).timestamp - start || 1,
    xy = points.map((p) => [
      pad + ((p.timestamp - start) / span) * (W - pad * 2),
      H - pad - ((p.profit - min) / range) * (H - pad * 2),
    ]),
    line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
    zero = H - pad - ((0 - min) / range) * (H - pad * 2);
  return `<div class="asset-chart" dir="ltr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("Unrealized profit / loss chart")}"><line x1="0" x2="${W}" y1="${zero}" y2="${zero}" class="asset-zero"/><polyline points="${line}" fill="none" stroke="${points.at(-1).profit < 0 ? "#c86c66" : "#419d7a"}" stroke-width="3" vector-effect="non-scaling-stroke"/>${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)"><title>${solarText(points[i].date)} · ${money(points[i].profit)} ${t("toman")}</title></circle>`).join("")}</svg><div class="asset-chart-axis"><span>${solarText(points[0].date) + (c.assetPeriod === 1 ? " · " + tehranParts(points[0].timestamp * 1000).time : "")}</span><span>${t("Zero")} · ${money(0)}</span><span>${solarText(points.at(-1).date) + (c.assetPeriod === 1 ? " · " + tehranParts(points.at(-1).timestamp * 1000).time : "")}</span></div></div>`;
}
export function assetLotRow(
  lot = {
    id: crypto.randomUUID(),
    quantity: "",
    costToman: "",
    boughtOn: today(),
  },
) {
  return `<div class="asset-lot-row" data-asset-lot data-lot-id="${esc(lot.id)}"><label class="field">${t("Quantity")} <span data-quantity-unit></span><input data-lot-quantity value="${esc(lot.quantity)}" inputmode="decimal" required dir="ltr"></label><label class="field">${t("Total purchase cost (toman)")} · ${t("Optional")}<input data-lot-cost value="${esc(lot.costToman ?? "")}" inputmode="decimal" dir="ltr"></label>${dateControl("Purchase date", "lot-date-" + lot.id, lot.boughtOn, true)}<button type="button" class="icon-button" data-action="asset-lot-remove" aria-label="${t("Remove purchase")}">${closeIcon}</button></div>`;
}
export function assetEditorFields(
  p = {
    name: "",
    sourceKey: null,
    marketSymbol: null,
    lots: [],
    valuations: [],
  },
) {
  p = {
    name: "",
    sourceKey: null,
    marketSymbol: null,
    lots: [],
    valuations: [],
    ...p,
  };
  return `<label class="field">${t("Asset name")}<input name="name" value="${esc(p.name)}" required maxlength="80" dir="auto"></label><label class="field">${t("Current value (toman)")}<input name="currentValue" inputmode="decimal" dir="ltr" value="${esc(p.currentValue ?? '')}"></label><label class="field">${t("Asset type / market price")}<select name="marketSymbol"><option value="">${t("Captured / manual value")}</option>${instruments.map((i) => `<option value="${i.symbol}" ${i.symbol === p.marketSymbol ? "selected" : ""}>${esc(getLanguage() === "fa" ? i.nameFa : i.name)} · ${t(i.unit)}</option>`).join("")}</select></label><div id="asset-live-preview" class="asset-live-preview" role="status"></div><div class="checklist-editor-head"><strong>${t("Open purchases")}</strong><button type="button" class="text-button" data-action="asset-lot-add">+ ${t("Add purchase")}</button></div><p class="small-note">${t("Record only the purchases you still hold. Include fees in cost. Quantities must match captured holdings.")}</p><div id="asset-lots">${(p.lots.length ? p.lots : [{ id: crypto.randomUUID(), quantity: p.quantity || "1", costToman: "", boughtOn: today() }]).map(assetLotRow).join("")}</div><details class="asset-valuation-editor"><summary>${t("Dated manual valuations")}</summary><p class="small-note">${t("One line per date: 1405/08/25, 12000000. Amount is the total asset value in toman.")}</p><textarea name="valuationsText" rows="5" dir="ltr" aria-label="${t("Dated manual valuations")}">${esc(p.valuations.map((v) => `${solarNumeric(v.date)}, ${groupedNumeric(v.valueToman, getLanguage())}`).join("\n"))}</textarea></details>`;
}
