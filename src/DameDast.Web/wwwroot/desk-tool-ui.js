import { marketChoices, selectedMarketSymbols } from "./desk-markets.js";
import { instruments } from "./market-catalog.js";
import { t, getLanguage, localizedNumber } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { monthOf, monthLabel, shiftMonth, dateInMonth, daysInMonth } from "./calendar.js";
import { safeLink } from "./desk-tools.js";
import { shortcutPages } from "./workbench.js";
import { petSceneMarkup } from "./desk-pet-ui.js";
import { googleServicesMarkup } from "./google-services.js";
import { dayHoliday } from "./holidays.js";
import { preferences } from "./preferences.js";

const button = (action, label, text = label, attrs = "") => `<button type="button" class="secondary" data-tool-action="${action}" aria-label="${esc(t(label))}" ${attrs}>${esc(t(text))}</button>`;
const select = (name, label, choices, value) => `<label class="field">${t(label)}<select name="${name}">${choices.map(([key, title]) => `<option value="${key}" ${key === value ? "selected" : ""}>${t(title)}</option>`).join("")}</select></label>`;
export function toolOptionFields(type, options = {}) {
  if (type === "markets") {
    const selected = selectedMarketSymbols(options);
    return `<fieldset class="desk-market-options"><legend>${t('Selected prices')}</legend><p>${t('Choose between 1 and 8 prices.')}</p>${marketChoices.map(symbol=>{const instrument=instruments.find(i=>i.symbol===symbol);return `<label><input type="checkbox" name="market-${symbol}" ${selected.includes(symbol)?'checked':''}><span>${esc(getLanguage()==='fa'?instrument.nameFa:instrument.name)}</span><small dir="ltr">${symbol}</small></label>`;}).join('')}</fieldset>`;
  }
  if (type === "shortcut") return select("shortcutPage", "Destination", Object.entries(shortcutPages), options.page || "notes");
  if (type === "image") return `<label class="field">${t("Photo")}<input data-desk-image-input type="file" accept="image/png,image/jpeg,image/webp"></label><p class="small-note">${t("Up to 4 photos. Each file up to 5 MB; photos are resized before saving.")}</p>${options.imageData ? `<img class="desk-image-draft" src="${esc(options.imageData)}" alt="">` : ""}<label class="field">${t("Description")}<input name="toolDescription" maxlength="200" value="${esc(options.description || "")}" dir="auto"></label>`;
  if (type === "link") return `<label class="field">${t("Website address")}<input name="toolUrl" type="url" placeholder="https://example.com" value="${esc(options.url || "")}" maxlength="2000" required dir="ltr"></label><label class="field">${t("Description")}<input name="toolDescription" maxlength="200" value="${esc(options.description || "")}" dir="auto"></label>`;
  if (type === "plainCalendar") return select("toolCalendar", "Calendar system", [["persian", "Solar Hijri"], ["gregory", "Gregorian"]], options.calendar || "persian");
  if (type === "clock") return select("toolClockStyle", "Clock style", [["digital", "Digital"], ["analog", "Analog"]], options.clockStyle || "digital") + select("toolTimeZone", "Time zone", [["local", "Device time"], ["Asia/Tehran", "Tehran"], ["UTC", "UTC"]], options.timeZone || "local");
  if (type === "pet") return select("toolPetStyle", "Character", [["dog", "Dog"], ["cat", "Cat"], ["robot", "Robot"]], options.petStyle || "dog");
  return "";
}
export function optionsFromForm(type, values, previous = {}, imageData) {
  if (type === "markets") return { symbols: marketChoices.filter(symbol=>values[`market-${symbol}`]).join(",") };
  if (type === "shortcut") return { page: values.shortcutPage || "notes" };
  if (type === "image") return { imageData: imageData || previous.imageData || null, description: (values.toolDescription || "").trim() };
  if (type === "link") return { url: safeLink(values.toolUrl || ""), description: (values.toolDescription || "").trim() };
  if (type === "plainCalendar") return { calendar: values.toolCalendar || "persian" };
  if (type === "clock") return { clockStyle: values.toolClockStyle || "digital", timeZone: values.toolTimeZone || "local" };
  if (type === "pet") return { petStyle: values.toolPetStyle || "dog" };
  return null;
}

export function plainCalendarMarkup(options = {}, offset = 0, now = new Date()) {
  options ??= {};
  const iso = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }),
    date = new Date(`${iso}T12:00:00Z`), persian = options.calendar !== "gregory";
  let start, count, caption;
  if (persian) {
    const key = shiftMonth(monthOf(iso), offset), [year, month] = key.split("-").map(Number);
    start = dateInMonth(key, 1); count = daysInMonth(year, month); caption = monthLabel(key);
  } else {
    date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + offset);
    start = date.toISOString().slice(0, 10);
    count = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    caption = new Intl.DateTimeFormat(getLanguage() === "fa" ? "fa-IR-u-ca-gregory" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  const weekStart = persian ? 6 : 1, first = new Date(`${start}T12:00:00Z`), blanks = (first.getUTCDay() - weekStart + 7) % 7;
  const locale = getLanguage() === "fa" ? "fa-IR" : "en-US", prefs = preferences();
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 1 + (weekStart + index) % 7));
    return { short: new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(date),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(date) };
  });
  const todayCaption = new Intl.DateTimeFormat(persian ? `${locale}-u-ca-persian` : `${locale}-u-ca-gregory`,
    { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date(now));
  return `<div class="desk-calendar" data-calendar-system="${persian ? "persian" : "gregory"}" dir="${persian ? "rtl" : "ltr"}"><header><div class="desk-calendar-caption"><small>${t(persian ? "Solar Hijri" : "Gregorian")}</small><strong>${esc(caption)}</strong></div><nav class="desk-calendar-navigation" aria-label="${t("Calendar navigation")}">${button("calendar-previous", "Previous month", "‹")}${button("calendar-today", "Today")}${button("calendar-next", "Next month", "›")}</nav></header><div class="desk-calendar-grid">${weekdays.map(day => `<abbr class="desk-calendar-weekday" title="${esc(day.full)}">${esc(day.short)}</abbr>`).join("")}${"<span aria-hidden=\"true\"></span>".repeat(blanks)}${Array.from({ length: count }, (_, index) => {
    const day = new Date(first.getTime() + index * 86400000).toISOString().slice(0, 10);
    const holiday = dayHoliday(day, prefs), classes = [day === iso ? "is-today" : "", holiday.weekend || holiday.events.length ? "is-holiday" : ""].filter(Boolean).join(" ");
    return `<time datetime="${day}" class="${classes}" ${day === iso ? 'aria-current="date"' : ""}>${localizedNumber(index + 1)}</time>`;
  }).join("")}</div><footer class="desk-calendar-today"><span class="desk-calendar-today-dot" aria-hidden="true"></span><span>${t("Today")}</span><time datetime="${iso}">${esc(todayCaption)}</time></footer></div>`;
}
export function toolMarkup(c, widget) {
  const o = widget.options || {};
  if (widget.type === "googleServices") return googleServicesMarkup();
  if (widget.type === "image") return o.imageData ? `<figure class="desk-photo"><img src="${esc(o.imageData)}" alt="${esc(o.description || widget.title || t("Photo"))}" loading="lazy" decoding="async">${o.description ? `<figcaption dir="auto">${esc(o.description)}</figcaption>` : ""}</figure>` : `<p class="desk-empty">${t("Choose a photo in card settings.")}</p>`;
  if (widget.type === "link") {
    if (!o.url) return `<p class="desk-empty">${t("Add a website address in card settings.")}</p>`;
    const url = new URL(safeLink(o.url));
    return `<a class="desk-link-preview" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer"><span class="desk-link-mark" aria-hidden="true">${esc(url.hostname[0].toUpperCase())}</span><strong dir="auto">${esc(widget.title || url.hostname)}</strong>${o.description ? `<p dir="auto">${esc(o.description)}</p>` : ""}<span class="desk-link-host" dir="ltr">${esc(url.hostname + (url.pathname === "/" ? "" : url.pathname))}</span><small>${t("Opens in a new tab")} ↗</small></a>`;
  }
  if (widget.type === "plainCalendar") return plainCalendarMarkup(o, 0, c.now);
  if (widget.type === "calculator") return `<form class="desk-calculator" data-desk-calculator><label class="sr-only" for="calc-${widget.id}">${t("Calculation")}</label><input id="calc-${widget.id}" data-calculation maxlength="160" placeholder="(12 + 3) × 4" dir="ltr" autocomplete="off" inputmode="decimal"><output data-tool-output aria-live="polite" dir="ltr">0</output><div class="desk-calculator-keys">${["C", "(", ")", "⌫", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "%", "+"].map(key => button("calculate-key", key, key, `data-key="${esc(key)}"`)).join("")}</div><button type="submit" class="primary">=</button></form>`;
  if (widget.type === "keyGenerator") return `<div class="desk-key-generator"><label>${t("Length")}<input data-key-length type="number" min="16" max="128" value="32" dir="ltr"></label><label>${t("Format")}<select data-key-format><option value="base64url">Base64url</option><option value="hex">Hex</option></select></label><input data-key-result readonly aria-label="${t("Generated key")}" dir="ltr"><div>${button("generate-key", "Generate")}${button("copy-key", "Copy")}</div><small>${t("Generated keys are not saved or synced.")}</small><output data-tool-output role="status"></output></div>`;
  if (widget.type === "clock") return `<div class="desk-clock" data-clock-style="${o.clockStyle || "digital"}" data-time-zone="${o.timeZone || "local"}">${o.clockStyle === "analog" ? `<svg class="desk-clock-face" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/>${Array.from({ length: 12 }, (_, index) => `<path d="M50 8v5" style="transform:rotate(${index * 30}deg)"/>`).join("")}<path class="clock-hour" d="M50 50V27"/><path class="clock-minute" d="M50 50V17"/><path class="clock-second" d="M50 55V13"/><circle cx="50" cy="50" r="2"/></svg>` : ""}<time class="desk-clock-time" dir="ltr"></time><span class="desk-clock-date"></span>${o.timeZone === "UTC" || o.timeZone === "Asia/Tehran" ? `<small>${t(o.timeZone === "UTC" ? "UTC" : "Tehran")}</small>` : ""}</div>`;
  if (widget.type === "pet") return petSceneMarkup(widget);
  return "";
}
