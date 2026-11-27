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
  developmentMonth,
  developmentProgress,
  learningEntries,
} from "./development.js";
const tr = (en, fa) => (getLanguage() === "fa" ? fa : en);
const areas = () => ({
  study: tr("Specialized study", "مطالعهٔ تخصصی"),
  exercise: tr("Exercise", "ورزش"),
  essay: tr("Essay", "انشا"),
  vocabulary: tr("Vocabulary", "کلمات زبان"),
  lesson: tr("Language lesson", "جزوهٔ زبان"),
  plan: tr("Personal development", "توسعهٔ فردی"),
});
const titles = {
  learning: "Learning hub",
  developmentExercise: "Exercise log",
};
export const developmentArea = (page) =>
  page === "developmentExercise" ? "exercise" : "study";
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
  const d = r.data, linked = ["essay", "vocabulary"].includes(d.area);
  const completion = button(linked ? "development-resource" : "development-toggle",
    linked ? (d.done ? tr("Completed", "انجام شده") : d.area === "essay" ? tr("Review", "بازبینی") : tr("Read words", "خواندن کلمات")) : d.done ? tr("Mark incomplete", "انجام نشده") : tr("Mark complete", "انجام شد"),
    `data-id="${r.id}" ${linked ? "" : `aria-pressed="${d.done}"`} ${d.date > today() || linked && d.done ? "disabled" : ""}`,
    "text-button development-complete");
  return `<article class="panel development-entry ${d.done ? "is-done" : ""}"><div class="development-entry-heading"><h3 dir="auto">${esc(d.title)}</h3><span class="badge">${areas()[d.area]}</span></div>${d.notes ? `<p dir="auto">${esc(d.notes)}</p>` : ""}<footer><span>${d.minutes ? `${n(d.minutes)} ${tr("min", "دقیقه")}` : ""}</span><div>${d.area === "lesson" || linked && d.done ? button("development-resource", tr("Open", "بازکردن"), `data-id="${r.id}"`, "text-button") : ""}${completion}${button("edit", tr("Edit", "ویرایش"), `data-id="${r.id}"`, "text-button")}${button("delete", tr("Delete", "حذف"), `data-id="${r.id}"`, "text-button danger")}</div></footer></article>`;
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
    isLearning = c.page === "learning";
  const area = isLearning
    ? c.learningCategory === "plan" ? "plan" : "study"
    : "exercise";
  const filtered = isLearning
    ? learningEntries(c.records, c.learningCategory)
    : developmentEntries(c.records, "exercise");
  const dayEntries = filtered.filter((r) => r.data.date === date);
  const categories = [
    ["all", tr("All", "همه")],
    ["study", tr("Specialized study", "مطالعهٔ تخصصی")],
    ["plan", tr("Personal development", "توسعهٔ فردی")],
  ];
  const filters = isLearning
    ? `<nav class="learning-filters" aria-label="${tr("Activity type", "نوع فعالیت")}">${categories.map(([key, label]) => button("learning-filter", label, `data-category="${key}" aria-pressed="${(c.learningCategory || "all") === key}"`, (c.learningCategory || "all") === key ? "primary" : "secondary")).join("")}</nav>`
    : "";
  const heading = `<section class="development-page"><div class="page-heading"><h1>${t(titles[c.page])}</h1><div class="heading-actions">${isLearning ? button("learning-week-add", tr("Add week", "ثبت هفتگی"), "", "primary") : ""}${add(date, area)}</div></div>${filters}<div class="development-datebar">${button("development-shift", "‹", `data-delta="-1" aria-label="${tr("Previous day", "روز قبل")}"`, "icon-button")}${dateControl("Date", "development-day", date, true)}${button("development-shift", "›", `data-delta="1" aria-label="${tr("Next day", "روز بعد")}"`, "icon-button")}${button("development-today", tr("Today", "امروز"), "", "text-button")}</div>`;
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
    calendar = stats(dayEntries);
  return (
    heading +
    calendar +
    `<div class="development-day-heading"><h2>${dateText(date, true)}</h2>${add(date, area, isLearning ? tr("New activity", "فعالیت جدید") : tr("Training", "تمرین"))}</div><div class="development-entries">${dayEntries.map(entryCard).join("") || `<div class="panel development-empty">${tr("Nothing planned", "موردی ثبت نشده")}</div>`}</div></section>`
  );
}
export function developmentFields(d = {}, records = []) {
  return `${dateControl("Date", "date", d.date || today(), true)}<label class="field">${tr("Section", "بخش")}<select name="area">${Object.entries(
    areas(),
  )
    .filter(([key]) =>
      d.area === "exercise" ? key === "exercise" : ["study", "plan"].includes(key) || key === d.area,
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
  )}</textarea></label></div><div data-development-file ${d.area === "lesson" ? "" : "hidden"}><label class="field">Markdown<input type="file" name="developmentFile" accept=".md,.markdown,text/markdown"></label>${d.resourceId ? `<small>${tr("Lesson attached", "جزوه پیوست شده")}</small>` : ""}</div><input type="hidden" name="resourceId" value="${esc(d.resourceId || "")}">`;
}

export function toggleDevelopmentFields(root) {
  const area = root.querySelector('[name="area"]')?.value;
  if (!area || !root.querySelector("[data-development-words]")) return;
  root.querySelector("[data-development-words]").hidden = ![
    "essay",
    "vocabulary",
  ].includes(area);
  root.querySelector("[data-development-file]").hidden = area !== "lesson";

}
