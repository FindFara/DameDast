import { instruments } from "./market-catalog.js";
import { validIso } from "./calendar.js";
import { tehranParts } from "./organizer.js";
const scale = 10n ** 18n;
export function decimalUnits(value, places = 18) {
  const s = String(value ?? "")
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[,٬\s]/g, "")
    .replace("٫", ".");
  if (
    !new RegExp("^(0|[1-9][0-9]{0,11})(?:\\.[0-9]{1," + places + "})?$").test(s)
  )
    throw Error("Invalid asset amount or quantity.");
  const [a, b = ""] = s.split(".");
  return BigInt(a) * 10n ** BigInt(places) + BigInt(b.padEnd(places, "0"));
}
export function decimalText(value, places = 18) {
  const whole = 10n ** BigInt(places),
    sign = value < 0n ? "-" : "";
  value = value < 0n ? -value : value;
  const fraction = String(value % whole)
    .padStart(places, "0")
    .replace(/0+$/, "");
  return sign + String(value / whole) + (fraction ? "." + fraction : "");
}
export function normalizeDecimal(value, places = 18) {
  return decimalText(decimalUnits(value, places), places);
}
export function validatePosition(p) {
  if (
    !p ||
    !p.name?.trim() ||
    p.name.length > 80 ||
    p.name !== p.name.trim() ||
    (p.sourceKey != null &&
      (typeof p.sourceKey !== "string" || p.sourceKey.length > 600)) ||
    (p.marketSymbol != null &&
      !instruments.some((i) => i.symbol === p.marketSymbol)) ||
    !Array.isArray(p.lots) ||
    p.lots.length > 100 ||
    new Set(p.lots.map((x) => x.id)).size !== p.lots.length ||
    !Array.isArray(p.valuations) ||
    p.valuations.length > 1000 ||
    new Set(p.valuations.map((x) => x.date)).size !== p.valuations.length
  )
    throw Error("Invalid asset position.");
  let quantity = 0n,
    cost = 0n;
  for (const l of p.lots) {
    const q = decimalUnits(l.quantity),
      c = l.costToman == null ? 0n : decimalUnits(l.costToman, 2);
    if (
      !l.id ||
      q <= 0n ||
      q > 1000000000n * scale ||
      c > 100000000000000n ||
      !validIso(l.boughtOn)
    )
      throw Error("Enter valid open purchases.");
    quantity += q;
    cost += c;
  }
  if (quantity > 1000000000n * scale || cost > 100000000000000n)
    throw Error("Asset position exceeds the supported amount.");
  for (const v of p.valuations)
    if (!validIso(v.date) || decimalUnits(v.valueToman, 2) > 100000000000000n)
      throw Error("Enter a valid asset valuation.");
  return p;
}
export const assetSourceKey = (snapshot, item) =>
  JSON.stringify([
    "external",
    snapshot.provider,
    snapshot.account,
    snapshot.scope,
    snapshot.category,
    item.key,
  ]);
export function marketValueCents(quantity, unitPrice, fxPrice = null) {
  try {
    const price = (value) => {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) throw Error();
      let text = String(value);
      if (/[eE]/.test(text)) {
        const [coefficient, exponent] = text.toLowerCase().split("e"),
          [whole, fraction = ""] = coefficient.split(".");
        const digits = whole + fraction,
          point = whole.length + Number(exponent);
        text =
          point <= 0
            ? "0." + "0".repeat(-point) + digits
            : point >= digits.length
              ? digits + "0".repeat(point - digits.length)
              : digits.slice(0, point) + "." + digits.slice(point);
      }
      return decimalUnits(text);
    };
    let numerator = decimalUnits(quantity) * price(unitPrice) * 100n,
      denominator = scale * scale;
    if (fxPrice !== null) {
      numerator *= price(fxPrice);
      denominator *= scale;
    }
    return (numerator + denominator / 2n) / denominator;
  } catch {
    return null;
  }
}
function activeLots(p, date) {
  return (p?.lots || []).filter((l) => l.boughtOn <= date);
}
export function positionGain(p, date, valueCents, observedQuantity = null) {
  const lots = activeLots(p, date),
    quantity = lots.reduce((s, l) => s + decimalUnits(l.quantity), 0n),
    cost = lots.reduce(
      (s, l) => s + (l.costToman == null ? 0n : decimalUnits(l.costToman, 2)),
      0n,
    );
  const status =
      !lots.length || lots.some((l) => l.costToman == null)
        ? "missing-cost"
        : observedQuantity != null &&
            quantity !== decimalUnits(observedQuantity)
          ? "quantity-changed"
          : valueCents === null
            ? "missing-value"
            : "ready",
    profit = status === "ready" ? valueCents - cost : null;
  return {
    quantity: decimalText(quantity),
    costCents: cost,
    valueCents,
    profitCents: profit,
    profitPercent:
      profit !== null && cost > 0n
        ? (Number(profit) / Number(cost)) * 100
        : null,
    status,
  };
}
function inferredSymbol(item) {
  const label = (item.symbol || item.label || "").trim().toLowerCase();
  return (
    instruments.find((i) =>
      [i.symbol, i.name, i.nameFa, i.glyph].some(
        (s) => s?.toLowerCase() === label,
      ),
    )?.symbol || null
  );
}
export function assetEntries(records, snapshots, market, now = new Date()) {
  const today = tehranParts(now).date,
    positions = records.filter((r) => !r.deleted && r.kind === "assetPosition"),
    sources = [];
  for (const s of snapshots || [])
    if (s.category === "assets")
      for (const item of s.items)
        sources.push({
          key: assetSourceKey(s, item),
          name: item.label,
          quantity: item.quantity,
          value: item.valueToman,
          asOf: item.observedAt || s.capturedAt,
          source: s.provider,
          marketSymbol: inferredSymbol(item),
        });
  for (const r of records.filter(
    (r) => !r.deleted && r.kind === "locked" && !r.data.released,
  ))
    sources.push({
      key: JSON.stringify(["locked", r.id]),
      name: r.data.name,
      quantity: "1",
      value: String(r.data.amount),
      asOf: null,
      source: "Locked assets",
      marketSymbol: null,
    });
  const linked = new Map(
    positions.filter((r) => r.data.sourceKey).map((r) => [r.data.sourceKey, r]),
  );
  const entries = sources.map((source) => ({
    source,
    record: linked.get(source.key) || null,
  }));
  for (const record of positions)
    if (
      !record.data.sourceKey ||
      !sources.some((s) => s.key === record.data.sourceKey)
    )
      entries.push({ source: null, record });
  return entries.map(({ source, record }) => {
    const p = record?.data || {
        name: source.name,
        sourceKey: source.key,
        marketSymbol: source.marketSymbol,
        lots: [],
        valuations: [],
      },
      lots = activeLots(p, today),
      quantity = source
        ? source.quantity
        : decimalText(lots.reduce((s, l) => s + decimalUnits(l.quantity), 0n)),
      symbol = p.marketSymbol || (!record ? source?.marketSymbol : null),
      instrument = instruments.find((i) => i.symbol === symbol),
      quote = market?.quotes?.find((q) => q.symbol === symbol),
      fx = market?.quotes?.find((q) => q.symbol === "USD");
    let value = null,
      asOf = null,
      valueSource = null;
    if (quote && quantity && (!p.sourceKey || source?.quantity != null)) {
      let price = quote.price;
      if (instrument.unit.startsWith("USD")) {
        price = fx ? price * fx.price : null;
      }
      if (price !== null) {
        value = marketValueCents(
          quantity,
          quote.price,
          instrument.unit.startsWith("USD") ? fx.price : null,
        );
        asOf =
          instrument.unit.startsWith("USD") &&
          Date.parse(fx.asOf) < Date.parse(quote.asOf)
            ? fx.asOf
            : quote.asOf;
        valueSource = quote.source;
      }
    }
    const manual = p.valuations
      .filter((v) => v.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (value === null && manual) {
      value = decimalUnits(manual.valueToman, 2);
      asOf = manual.date + "T12:00:00+03:30";
      valueSource = "Manual valuation";
    }
    if (value === null && source?.value != null) {
      value = decimalUnits(source.value, 2);
      asOf = source.asOf;
      valueSource = source.source;
    }
    const asOfDate = asOf ? tehranParts(asOf).date : today,
      gain = positionGain(p, asOfDate, value, source?.quantity ?? null);
    if (asOf && lots.some((l) => l.boughtOn > asOfDate)) {
      gain.status = "old-valuation";
      gain.profitCents = null;
      gain.profitPercent = null;
    }
    if (p.sourceKey && !source) {
      gain.status = "missing-source";
      gain.profitCents = null;
      gain.profitPercent = null;
    }
    const dated = !!asOf,
      delayed = dated && new Date(now) - new Date(asOf) > 86400000;
    return {
      key: record?.id || source.key,
      name: p.name,
      position: p,
      record,
      source,
      symbol,
      valueSource,
      asOf,
      delayed,
      dated,
      ...gain,
      quantity,
    };
  });
}
export function assetHistory(
  asset,
  quotes = [],
  fx = [],
  days = 30,
  now = new Date(),
) {
  if (asset.status !== "ready") return [];
  const today = tehranParts(now).date,
    since = new Date(now).getTime() - days * 86400000,
    instrument = instruments.find((i) => i.symbol === asset.symbol),
    points = [];
  const rates = new Map(
    fx
      .filter((p) => p.timestamp * 1000 <= new Date(now))
      .map((p) => [tehranParts(p.timestamp * 1000).date, p.price]),
  );
  for (const p of quotes) {
    const date = tehranParts(p.timestamp * 1000).date,
      lots = activeLots(asset.position, date);
    if (
      !lots.length ||
      p.timestamp * 1000 < since ||
      p.timestamp * 1000 > new Date(now)
    )
      continue;
    let price = p.price;
    if (instrument?.unit.startsWith("USD")) {
      const rate = rates.get(date);
      if (!rate) continue;
      price *= rate;
    }
    const quantity = lots.reduce((s, l) => s + decimalUnits(l.quantity), 0n),
      cost = lots.reduce(
        (s, l) => s + (l.costToman == null ? 0n : decimalUnits(l.costToman, 2)),
        0n,
      ),
      value = marketValueCents(
        decimalText(quantity),
        p.price,
        instrument?.unit.startsWith("USD") ? rates.get(date) : null,
      );
    if (value !== null)
      points.push({
        date,
        timestamp: p.timestamp,
        profit: Number(value - cost) / 100,
        value: Number(value) / 100,
        cost: Number(cost) / 100,
      });
  }
  for (const v of asset.position.valuations) {
    const stamp = Date.parse(v.date + "T12:00:00+03:30");
    if (stamp < since || stamp > new Date(now) || v.date > today) continue;
    const gain = positionGain(
      asset.position,
      v.date,
      decimalUnits(v.valueToman, 2),
    );
    if (gain.profitCents !== null)
      points.push({
        date: v.date,
        timestamp: stamp / 1000,
        profit: Number(gain.profitCents) / 100,
        value: Number(gain.valueCents) / 100,
        cost: Number(gain.costCents) / 100,
      });
  }
  if (
    asset.asOf &&
    Date.parse(asset.asOf) >= since &&
    Date.parse(asset.asOf) <= new Date(now)
  )
    points.push({
      date: tehranParts(asset.asOf).date,
      timestamp: Date.parse(asset.asOf) / 1000,
      profit: Number(asset.profitCents) / 100,
      value: Number(asset.valueCents) / 100,
      cost: Number(asset.costCents) / 100,
    });
  return [
    ...new Map(
      points
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((p) => [days === 1 ? p.timestamp : p.date, p]),
    ).values(),
  ];
}
