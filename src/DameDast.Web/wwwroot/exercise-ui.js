import { t, getLanguage, localizedNumber as n } from "./i18n.js";
import { escapeHtml as esc, today, dateText } from "./finance.js";
import { dateControl } from "./calendar.js";
import { renderMarkdown } from "./language-markdown.js";
import { weightHistory } from "./exercise.js";
const tr = (en, fa) => (getLanguage() === "fa" ? fa : en);
const button = (action, text, attrs = "", style = "secondary") =>
  `<button type="button" class="${style}" data-action="${action}" ${attrs}>${text}</button>`;
const add = (kind, text) =>
  button("add", text, `data-kind="${kind}"`, "primary");
function heading(title, action = "") {
  return `<div class="page-heading"><h1>${t(title)}</h1><div class="heading-actions">${action}</div></div>`;
}
export function workoutProgramsPage(c) {
  const rows = c.records.filter(
    (r) => !r.deleted && r.kind === "workoutProgram",
  );
  return `<section class="exercise-page">${heading("Workout programs", add("workoutProgram", tr("New program", "برنامهٔ جدید")))}<div class="exercise-programs">${rows.map((r) => `<article class="panel exercise-program"><h2 dir="auto">${esc(r.data.title)}</h2><div class="language-markdown exercise-program-preview" dir="auto">${renderMarkdown(r.data.body)}</div><footer>${button("edit", tr("Open", "بازکردن"), `data-id="${r.id}"`)}${button("delete", tr("Delete", "حذف"), `data-id="${r.id}"`, "text-button danger")}</footer></article>`).join("") || `<section class="panel development-empty">${tr("No programs yet", "هنوز برنامه‌ای نیست")}</section>`}</div></section>`;
}
export function workoutTimerPage() {
  const control = (action, label, style = "secondary") =>
    `<button type="button" class="${style}" data-clock-action="${action}">${label}</button>`;
  return `<section class="exercise-page" data-exercise-clock>${heading("Stopwatch & timer")}<div class="exercise-clock-grid"><section class="panel exercise-clock"><h2>${tr("Stopwatch", "استاپ‌واچ")}</h2><output class="exercise-clock-digits" data-stopwatch dir="ltr">00:00:00</output><div class="exercise-clock-actions">${control("watch-start", tr("Start", "شروع"), "primary")}${control("watch-pause", tr("Pause", "توقف"))}${control("watch-lap", tr("Lap", "دور"))}${control("watch-reset", tr("Reset", "صفرکردن"))}</div><ol class="exercise-laps" data-clock-laps></ol></section><section class="panel exercise-clock"><h2>${tr("Timer", "تایمر")}</h2><output class="exercise-clock-digits" data-countdown dir="ltr">00:10:00</output><div class="exercise-timer-inputs"><label>${tr("Minutes", "دقیقه")}<input type="number" data-clock-minutes min="0" max="1439" value="10" inputmode="numeric"></label><label>${tr("Seconds", "ثانیه")}<input type="number" data-clock-seconds min="0" max="59" value="0" inputmode="numeric"></label></div><div class="exercise-clock-actions">${control("timer-start", tr("Start", "شروع"), "primary")}${control("timer-pause", tr("Pause", "توقف"))}${control("timer-reset", tr("Reset", "از نو"))}</div><p class="exercise-timer-status" data-clock-status role="status"></p></section></div></section>`;
}
export function weightPlanPage(c) {
  const rows = weightHistory(c.records),
    latest = rows.at(-1),
    goal = c.records.find((r) => !r.deleted && r.kind === "weightGoal");
  const stat = (label, value) =>
    `<div class="panel"><small>${label}</small><strong>${value == null ? "—" : `${n(value, 1)} <small>${tr("kg", "کیلوگرم")}</small>`}</strong></div>`;
  let chart = "";
  if (rows.length > 1) {
    const low = Math.min(...rows.map((r) => r.data.kg)),
      high = Math.max(...rows.map((r) => r.data.kg)),
      range = Math.max(1, high - low);
    const first = Date.parse(rows[0].data.date),
      span = Math.max(86400000, Date.parse(latest.data.date) - first);
    const points = rows
      .map(
        (r) =>
          `${20 + ((Date.parse(r.data.date) - first) / span) * 560},${140 - ((r.data.kg - low) / range) * 110}`,
      )
      .join(" ");
    chart = `<section class="panel exercise-weight-chart"><svg viewBox="0 0 600 170" role="img" aria-label="${tr("Weight history", "روند وزن")}"><path d="M20 150H580" stroke="var(--border)"/><polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg><div><span>${dateText(rows[0].data.date)}</span><span>${dateText(latest.data.date)}</span></div></section>`;
  }
  return `<section class="exercise-page">${heading("Weight plan", button("weight-add", tr("Record weight", "ثبت وزن"), "", "primary"))}<div class="exercise-weight-stats">${stat(tr("Current weight", "وزن فعلی"), latest?.data.kg)}${stat(tr("Goal", "وزن هدف"), goal?.data.kg)}${stat(tr("Difference", "فاصله تا هدف"), goal && latest ? Math.round(Math.abs(goal.data.kg - latest.data.kg) * 10) / 10 : null)}</div><div class="exercise-weight-goal">${goal ? `<span>${tr("Target date", "تاریخ هدف")}: ${dateText(goal.data.date, true)}</span>${button("edit", tr("Edit goal", "ویرایش هدف"), `data-id="${goal.id}"`)}` : add("weightGoal", tr("Set goal", "تعیین هدف"))}</div>${chart}<div class="exercise-weight-history">${
    [...rows]
      .reverse()
      .map(
        (r) =>
          `<article class="panel"><time>${dateText(r.data.date, true)}</time><strong>${n(r.data.kg, 1)} ${tr("kg", "کیلوگرم")}</strong><div>${button("edit", tr("Edit", "ویرایش"), `data-id="${r.id}"`, "text-button")}${button("delete", tr("Delete", "حذف"), `data-id="${r.id}"`, "text-button danger")}</div></article>`,
      )
      .join("") ||
    `<section class="panel development-empty">${tr("No weight entries", "وزنی ثبت نشده")}</section>`
  }</div></section>`;
}
export function exerciseFields(kind, d = {}) {
  if (kind === "workoutProgram")
    return `<label class="field">${tr("Title", "عنوان")}<input name="title" required dir="auto" maxlength="120" value="${esc(d.title || "")}"></label><label class="field">${tr("Program notes", "برنامهٔ تمرین")}<textarea name="body" required dir="auto" rows="15" maxlength="20000">${esc(d.body || "")}</textarea></label>`;
  if (["weightEntry", "weightGoal"].includes(kind))
    return `${dateControl(kind === "weightGoal" ? "Target date" : "Date", "date", d.date || today(), true)}<label class="field">${tr("Weight (kg)", "وزن (کیلوگرم)")}<input name="kg" type="number" min="0.1" max="500" step="0.1" required inputmode="decimal" value="${d.kg || ""}"></label>`;
  return null;
}
