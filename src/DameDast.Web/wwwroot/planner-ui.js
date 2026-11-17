import { t, getLanguage, localizedNumber } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { solarText, faMonths, enMonths, jalaliParts } from "./calendar.js";
import {
  viewRange,
  calendarParts,
  plannerItems,
  timedColumns,
  weekday,
} from "./planner.js";
import { preferences } from "./preferences.js";
import { dayHoliday, holidayData } from "./holidays.js";
import { tehranParts } from "./organizer.js";
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export function plannerDateText(date, calendar = "persian", full = true) {
  if (calendar === "persian") return solarText(date, full);
  return new Intl.DateTimeFormat(
    getLanguage() === "fa" ? "fa-IR-u-ca-gregory" : "en-US-u-ca-gregory",
    {
      day: "numeric",
      month: "long",
      ...(full ? { year: "numeric" } : {}),
      timeZone: "UTC",
    },
  ).format(new Date(date + "T12:00:00Z"));
}
function monthTitle(date, calendar) {
  const parts = calendarParts(date, calendar);
  return calendar === "persian"
    ? `${(getLanguage() === "fa" ? faMonths : enMonths)[parts.month - 1]} ${new Intl.NumberFormat(getLanguage() === "fa" ? "fa-IR" : "en-US", { useGrouping: false }).format(parts.year)}`
    : new Intl.DateTimeFormat(
        getLanguage() === "fa" ? "fa-IR-u-ca-gregory" : "en-US-u-ca-gregory",
        { year: "numeric", month: "long", timeZone: "UTC" },
      ).format(new Date(date + "T12:00:00Z"));
}
const dateTitle = (date, p) =>
  `${plannerDateText(date, p.calendar)} · ${plannerDateText(date, p.calendar === "persian" ? "gregory" : "persian")}`;
const clockLabel = (time) =>
  new Intl.NumberFormat(getLanguage() === "fa" ? "fa-IR" : "en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(Number(time.slice(0, 2))) +
  ":" +
  new Intl.NumberFormat(getLanguage() === "fa" ? "fa-IR" : "en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(Number(time.slice(3)));
function entry(item, compact = false, extra = "") {
  return `<button type="button" class="planner-entry kind-${item.kind}${item.done ? " is-done" : ""}${compact ? " compact" : ""}" data-planner-action="open" data-id="${item.recordId}" data-source="${item.source}" data-task-id="${item.taskId || ""}" data-date="${item.occurrence || item.date}" style="--event-color:${item.color};${extra}" title="${esc(item.title)}"><span class="event-dot"></span><span>${item.allDay ? "" : `<bdi>${clockLabel(item.startTime || "00:00")}</bdi> `}${esc(item.title)}</span>${item.done ? "<i>✓</i>" : ""}</button>`;
}
function monthGrid(days, items, anchor, p, today) {
  const month = calendarParts(anchor, p.calendar).month;
  return `<div class="planner-month">${Array.from({ length: 7 }, (_, i) => `<div class="planner-weekday">${t(weekdays[(p.weekStart + i) % 7])}</div>`).join("")}${days
    .map((date) => {
      const data = calendarParts(date, p.calendar),
        other = calendarParts(
          date,
          p.calendar === "persian" ? "gregory" : "persian",
        ),
        holiday = dayHoliday(date, p),
        list = items.filter((i) => i.date === date);
      return `<article class="planner-cell${data.month !== month ? " outside-month" : ""}${date === today ? " today" : ""}${holiday.weekend || holiday.events.length ? " holiday" : ""}"><header><button data-planner-action="day" data-date="${date}" title="${esc(dateTitle(date, p))}"><strong>${localizedNumber(data.day)}</strong><small>${localizedNumber(other.day)}</small></button><button class="planner-cell-add" data-planner-action="new" data-date="${date}" aria-label="${t("Add event")} ${esc(dateTitle(date, p))}">+</button></header>${holiday.events.map((h) => `<span class="holiday-label" title="${esc(h.title)}">${esc(h.title)}</span>`).join("")}${list
        .slice(0, 3)
        .map((i) => entry(i, true))
        .join(
          "",
        )}${list.length > 3 ? `<button class="planner-more" data-planner-action="day" data-date="${date}">+${localizedNumber(list.length - 3)} ${t("more")}</button>` : ""}</article>`;
    })
    .join("")}</div>`;
}
function timeGrid(days, items, p, today) {
  const hourHeight = 64;
  return `<div class="planner-time-scroll"><div class="planner-time-grid" style="--calendar-days:${days.length}"><div class="planner-time-heading"></div>${days
    .map((date) => {
      const holiday = dayHoliday(date, p);
      return `<header class="planner-day-heading${date === today ? " today" : ""}${holiday.weekend || holiday.events.length ? " holiday" : ""}"><button data-planner-action="day" data-date="${date}">${t(weekdays[weekday(date)])}<strong>${plannerDateText(date, p.calendar, false)}</strong><small>${plannerDateText(date, p.calendar === "persian" ? "gregory" : "persian", false)}</small></button>${holiday.events.map((e) => `<span class="holiday-label">${esc(e.title)}</span>`).join("")}</header>`;
    })
    .join("")}
 <div class="planner-all-day-label">${t("All day")}</div>${days
   .map(
     (date) =>
       `<div class="planner-all-day">${items
         .filter((i) => i.date === date && i.allDay)
         .map((i) => entry(i, true))
         .join("")}</div>`,
   )
   .join("")}
 <div class="planner-hours">${Array.from({ length: 24 }, (_, h) => `<span style="top:${h * hourHeight}px">${clockLabel(String(h).padStart(2, "0") + ":00")}</span>`).join("")}</div>
 ${days
   .map(
     (date) =>
       `<section class="planner-day-column" aria-label="${esc(dateTitle(date, p))}"><div class="planner-hour-targets">${Array.from({ length: 24 }, (_, h) => `<button type="button" data-planner-action="new" data-date="${date}" data-time="${String(h).padStart(2, "0")}:00" aria-label="${t("Add event")} ${esc(dateTitle(date, p))} ${h}:00"></button>`).join("")}</div>${timedColumns(
         items.filter((i) => i.date === date && !i.allDay),
       )
         .map((i) =>
           entry(
             i,
             false,
             `position:absolute;top:${(i.from * hourHeight) / 60}px;height:${Math.max(24, ((i.to - i.from) * hourHeight) / 60)}px;inset-inline-start:calc(${i.column} * 100% / ${i.columns} + 3px);width:calc(100% / ${i.columns} - 6px);`,
           ),
         )
         .join("")}</section>`,
   )
   .join("")}</div></div>`;
}
export function plannerPage(c) {
  const p = preferences(),
    state = c.planner,
    range = viewRange(state.date, state.view, p.calendar, p.weekStart),
    today = tehranParts(c.now).date;
  const all = plannerItems(c.records, range.start, range.end),
    items = all.filter((i) => p.calendarItems.includes(i.kind));
  const unscheduled = c.records
    .filter((r) => !r.deleted && r.kind === "note")
    .flatMap((note) =>
      (note.data.checklist || [])
        .filter((i) => !i.done && !i.dueDate)
        .map((item) => ({ note, item })),
    );
  return `<section class="planner-page"><div class="page-heading"><div><span class="eyebrow">${t("YOUR DAYS, AT A GLANCE")}</span><h1>${t("Calendar")}</h1></div><button class="primary" data-planner-action="new">+ ${t("Create")}</button></div>

 <div class="planner-toolbar"><div class="planner-navigation"><button class="icon-button" data-planner-action="previous" aria-label="${t("Previous")}">‹</button><button class="secondary" data-planner-action="today">${t("Today")}</button><button class="icon-button" data-planner-action="next" aria-label="${t("Next")}">›</button><button class="planner-period" data-planner-action="jump">${state.view === "month" ? monthTitle(state.date, p.calendar) : state.view === "day" ? plannerDateText(state.date, p.calendar) : `${plannerDateText(range.start, p.calendar, false)} — ${plannerDateText(range.days.at(-1), p.calendar)}`}<small>${plannerDateText(state.date, p.calendar === "persian" ? "gregory" : "persian")}</small></button></div><div class="segment-control">${["day", "week", "month"].map((view) => `<button data-planner-action="view" data-view="${view}" class="${state.view === view ? "active" : ""}">${t({ day: "Day", week: "Week", month: "Month" }[view])}</button>`).join("")}</div></div>
 <div class="planner-layout"><section class="planner-surface">${state.view === "month" ? monthGrid(range.days, items, state.date, p, today) : timeGrid(range.days, items, p, today)}</section><aside class="planner-agenda"><section class="panel"><h2>${t("Unscheduled tasks")} <small>${localizedNumber(unscheduled.length)}</small></h2>${
   unscheduled
     .slice(0, 12)
     .map(
       ({ note, item }) =>
         `<button class="planner-unscheduled" data-planner-action="schedule-task" data-id="${note.id}" data-task-id="${item.id}"><span dir="auto">${esc(item.text)}</span><small>${t("Schedule")}</small></button>`,
     )
     .join("") || `<p class="small-note">${t("All tasks have a date.")}</p>`
 }</section><p class="planner-source small-note">${t("Local holiday calendar")} · ${t("Available through")} ${new Intl.NumberFormat(getLanguage()==="fa"?"fa-IR":"en-US",{useGrouping:false}).format(holidayData.years.at(-1))}${calendarParts(state.date,"persian").year>1405 ? `<small>${t("Future lunar holidays are estimates and may shift by one day.")}</small>` : ""}${range.days.some(d=>!holidayData.years.includes(jalaliParts(d).year)) ? `<strong>${t("Holiday data is unavailable outside the listed years.")}</strong>` : ""}</p></aside></div></section>`;
}
