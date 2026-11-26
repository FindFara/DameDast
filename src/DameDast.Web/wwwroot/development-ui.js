import { t, getLanguage, localizedNumber as n } from "./i18n.js";
import { escapeHtml as esc, today, dateText } from "./finance.js";
import {
  dateControl,
  monthOf,
  monthLabel,
  monthBounds,
  jalaliParts,
} from "./calendar.js";
import { dailyVocabulary } from "./language-model.js";
import {
  developmentEntries,
  developmentWeek,
  developmentMonth,
  developmentProgress,
} from "./development.js";
const tr = (en, fa) => (getLanguage() === "fa" ? fa : en);
const areas = () => ({
  study: tr("Study", "مطالعه"),
  exercise: tr("Exercise", "ورزش"),
  essay: tr("Essay", "انشا"),
  vocabulary: tr("Vocabulary", "کلمات زبان"),
  lesson: tr("Language lesson", "جزوهٔ زبان"),
  plan: tr("Personal plan", "برنامهٔ شخصی"),
});
const dayName = (date) =>
  new Intl.DateTimeFormat(getLanguage() === "fa" ? "fa-IR" : "en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
const titles = {
  developmentStudy: "Personal study",
  weeklyPlan: "Weekly plan",
  developmentExercise: "Exercise log",
};
export const developmentArea = (page) =>
  page === "developmentStudy"
    ? "study"
    : page === "developmentExercise"
      ? "exercise"
      : "plan";
const button = (action, label, attrs = "", cls = "secondary") =>
  `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const add = (date, area, label = tr("Add", "افزودن")) =>
  button(
    "development-add",
    label,
    `data-date="${date}" data-area="${area}"`,
    "primary",
  );
function entryCard(r) {
  const d = r.data;
  return `<article class="panel development-entry ${d.done ? "is-done" : ""}"><div class="development-entry-heading">${button(["essay", "vocabulary"].includes(d.area) ? "development-resource" : "development-toggle", d.done ? "✓" : "○", `data-id="${r.id}" aria-pressed="${d.done}" aria-label="${esc((d.done ? tr("Mark incomplete", "انجام نشده") : tr("Mark complete", "انجام شد")) + " · " + d.title)}" ${d.date > today() ? "disabled" : ""}`, "development-check")}<h3 dir="auto">${esc(d.title)}</h3><span class="badge">${areas()[d.area]}</span></div>${d.notes ? `<p dir="auto">${esc(d.notes)}</p>` : ""}<footer><span>${d.minutes ? `${n(d.minutes)} ${tr("min", "دقیقه")}` : ""}</span><div>${["essay", "vocabulary", "lesson"].includes(d.area) ? button("development-resource", tr("Open", "بازکردن"), `data-id="${r.id}"`, "text-button") : ""}${button("edit", tr("Edit", "ویرایش"), `data-id="${r.id}"`, "text-button")}${button("delete", tr("Delete", "حذف"), `data-id="${r.id}"`, "text-button danger")}</div></footer></article>`;
}
function stats(entries, exercise = false) {
  const p = developmentProgress(entries);
  return `<div class="development-stats"><span><strong>${n(p.done)}/${n(p.total)}</strong> ${tr("completed", "انجام شده")}</span>${exercise ? `<span><strong>${n(p.days)}</strong> ${tr("training days", "روز تمرین")}</span>` : ""}<span><strong>${n(p.minutes)}/${n(entries.reduce((total, r) => total + r.data.minutes, 0))}</strong> ${tr("minutes", "دقیقه")}</span></div>`;
}
function dayButton(date, entries, selected, short = false) {
  const rows = entries.filter((r) => r.data.date === date),
    p = developmentProgress(rows);
  const state = p.total
    ? p.done === p.total
      ? "is-done"
      : p.done
        ? "is-partial"
        : "is-planned"
    : "";
  const label = p.total ? `${n(p.done)}/${n(p.total)}` : "—";
  return button(
    "development-day",
    `${short ? n(jalaliParts(date).day) : dateText(date)}<small>${label}</small>`,
    `data-date="${date}" aria-label="${esc(dateText(date) + " · " + label)}" ${date === selected ? 'aria-current="date"' : ""}`,
    `development-day ${state}`,
  );
}
export function developmentPage(c) {
  const date = c.developmentDate || today(),
    area = developmentArea(c.page);
  const entries = developmentEntries(c.records),
    filtered = developmentEntries(c.records, area);
  const dayEntries = filtered.filter((r) => r.data.date === date);
  const tabs = Object.entries(titles)
    .map(
      ([page, title]) =>
        `<a href="#${page}" ${page === c.page ? 'aria-current="page"' : ""}>${t(title)}</a>`,
    )
    .join("");
  const heading = `<section class="development-page"><div class="page-heading"><h1>${t(titles[c.page])}</h1><div class="heading-actions">${add(date, area)}</div></div>${c.page === "weeklyPlan" ? `<nav class="development-tabs" aria-label="${t("Personal development")}">${tabs}</nav>` : ""}<div class="development-datebar">${button("development-shift", "‹", `data-delta="-1" aria-label="${c.page === "weeklyPlan" ? tr("Previous week", "هفتهٔ قبل") : tr("Previous day", "روز قبل")}"`, "icon-button")}${dateControl(c.page === "weeklyPlan" ? "Week beginning" : "Practice date", "development-day", date, true)}${button("development-shift", "›", `data-delta="1" aria-label="${c.page === "weeklyPlan" ? tr("Next week", "هفتهٔ بعد") : tr("Next day", "روز بعد")}"`, "icon-button")}${button("development-today", tr("Today", "امروز"), "", "text-button")}</div>`;
  if (c.page === "weeklyPlan") {
    const week = developmentWeek(date),
      rows = entries.filter((r) => week.includes(r.data.date));
    return (
      heading +
      `<div class="development-planning-links">${button("development-calendar", tr("Calendar", "تقویم"))}<a class="secondary" href="#languageLessons">${tr("Language lessons", "جزوه‌های زبان")}</a></div>` +
      stats(rows) +
      `<div class="development-week-plan">${week
        .map(
          (day) =>
            `<section class="development-plan-day ${day === today() ? "is-today" : ""}"><header><h2>${dayName(day)} · ${dateText(day)}</h2>${add(day, "plan", "+")}</header><div class="development-plan-items">${
              rows
                .filter((r) => r.data.date === day)
                .map(entryCard)
                .join("") ||
              `<p class="small-note">${tr("No plan", "برنامه‌ای نیست")}</p>`
            }</div></section>`,
        )
        .join("")}</div></section>`
    );
  }
  let calendar;
  if (area === "exercise") {
    const key = monthOf(date),
      { start, end } = monthBounds(key),
      monthly = filtered.filter(
        (r) => r.data.date >= start && r.data.date < end,
      );
    calendar = `<section class="panel development-calendar"><header>${button("development-month", "‹", `data-delta="-1" aria-label="${tr("Previous month", "ماه قبل")}"`, "icon-button")}<h2>${monthLabel(key)}</h2>${button("development-month", "›", `data-delta="1" aria-label="${tr("Next month", "ماه بعد")}"`, "icon-button")}</header>${stats(monthly, true)}<div class="development-month-grid">${[tr("Sat", "ش"), tr("Sun", "ی"), tr("Mon", "د"), tr("Tue", "س"), tr("Wed", "چ"), tr("Thu", "پ"), tr("Fri", "ج")].map((day) => `<span class="development-weekday">${day}</span>`).join("")}${developmentMonth(
      date,
    )
      .map((day) =>
        day
          ? dayButton(day, filtered, date, true)
          : '<span aria-hidden="true"></span>',
      )
      .join("")}</div></section>`;
  } else
    calendar = `<div class="development-week-strip">${developmentWeek(date)
      .map((day) => dayButton(day, filtered, date))
      .join("")}</div>${stats(dayEntries)}`;
  return (
    heading +
    calendar +
    `<div class="development-day-heading"><h2>${dateText(date, true)}</h2>${add(date, area, area === "study" ? tr("Study topic", "موضوع مطالعه") : tr("Training", "تمرین"))}</div><div class="development-entries">${dayEntries.map(entryCard).join("") || `<div class="panel development-empty">${tr("Nothing planned", "موردی ثبت نشده")}</div>`}</div></section>`
  );
}
export function developmentFields(d = {}, records = []) {
  return `${dateControl("Date", "date", d.date || today(), true)}<label class="field">${tr("Section", "بخش")}<select name="area">${Object.entries(
    areas(),
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${key === (d.area || "plan") ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">${tr("Topic / activity", "موضوع / فعالیت")}<input name="title" dir="auto" required maxlength="120" value="${esc(d.title || "")}"></label><label class="field">${tr("Duration (minutes)", "مدت (دقیقه)")}<input name="minutes" type="number" inputmode="numeric" min="0" max="1440" step="1" required value="${d.minutes || 0}"></label><label class="field">${tr("Notes", "یادداشت")}<textarea name="notes" dir="auto" maxlength="4000" rows="3">${esc(d.notes || "")}</textarea></label><div data-development-words ${["essay", "vocabulary"].includes(d.area) ? "" : "hidden"}><label class="field">${tr("Words · word | meaning | example", "کلمات · کلمه | معنی | مثال")}<textarea name="developmentWords" dir="ltr" rows="6">${esc(
    dailyVocabulary(records, d.date || today())
      .data.words.map((w) => `${w.term} | ${w.meaning} | ${w.example}`)
      .join("\n"),
  )}</textarea></label></div><div data-development-file ${d.area === "lesson" ? "" : "hidden"}><label class="field">Markdown<input type="file" name="developmentFile" accept=".md,.markdown,text/markdown"></label>${d.resourceId ? `<small>${tr("Lesson attached", "جزوه پیوست شده")}</small>` : ""}</div><input type="hidden" name="resourceId" value="${esc(d.resourceId || "")}"><label class="development-done-field"><input name="done" type="checkbox" ${d.done ? "checked" : ""}>${tr("Completed", "انجام شد")}</label>`;
}

export function toggleDevelopmentFields(root) {
  const area = root.querySelector('[name="area"]')?.value;
  if (!area || !root.querySelector("[data-development-words]")) return;
  root.querySelector("[data-development-words]").hidden = ![
    "essay",
    "vocabulary",
  ].includes(area);
  root.querySelector("[data-development-file]").hidden = area !== "lesson";
  root.querySelector('[name="done"]').closest("label").hidden = [
    "essay",
    "vocabulary",
  ].includes(area);
}
