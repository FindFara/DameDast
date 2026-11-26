import { weeklyAgenda } from "./weekly-agenda.js";
import { getLanguage, t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { solarText } from "./calendar.js";

export function weeklyAgendaPanel(c) {
  const fa = getLanguage() === "fa";
  const days = weeklyAgenda(c.records, c.now);
  const labels = {
    study: fa ? "مطالعهٔ تخصصی" : "Specialized study",
    exercise: fa ? "ورزش" : "Exercise",
    essay: fa ? "انشا" : "Essay",
    vocabulary: fa ? "کلمات زبان" : "Vocabulary",
    lesson: fa ? "جزوهٔ زبان" : "Language lesson",
    plan: fa ? "توسعهٔ فردی" : "Personal development",
    todo: fa ? "تودو" : "To-do",
  };
  const states = { done: t("Completed"), overdue: t("Overdue"), planned: fa ? "برنامه‌ریزی‌شده" : "Planned" };
  const weekday = date => new Intl.DateTimeFormat(fa ? "fa-IR" : "en-US", { weekday: "long", timeZone: "Asia/Tehran" }).format(new Date(date + "T12:00:00Z"));
  return `<section class="panel weekly-agenda" aria-labelledby="weekly-agenda-title"><header class="panel-head"><h2 id="weekly-agenda-title">${fa ? "برنامهٔ این هفته" : "This week"}</h2><small>${solarText(days[0].date, false)} — ${solarText(days.at(-1).date, false)}</small></header><div class="weekly-agenda-grid">${days.map(day => `<section class="weekly-agenda-day ${day.today ? "is-today" : ""}" ${day.today ? 'aria-current="date"' : ""}><header><h3>${weekday(day.date)}</h3><time datetime="${day.date}">${solarText(day.date, false)}</time></header><div class="weekly-agenda-items">${day.items.map(item => {
    const text = c.space === "demo" ? t(item.title) : item.title;
    return `<button type="button" class="weekly-agenda-item is-${item.status}" data-action="weekly-item-open" data-id="${esc(item.recordId)}" data-source="${item.source}" data-task-id="${esc(item.taskId || "")}" data-date="${item.occurrence || item.date}" aria-label="${esc(text + " · " + labels[item.area] + " · " + states[item.status])}"><span class="weekly-agenda-kind">${labels[item.area]}</span><strong dir="auto">${esc(text)}</strong><span class="weekly-agenda-state"><span aria-hidden="true">${item.status === "done" ? "✓" : item.status === "overdue" ? "!" : "○"}</span>${states[item.status]}${!item.allDay && item.startTime ? `<bdi dir="ltr">${esc(item.startTime)}</bdi>` : ""}</span></button>`;
  }).join("") || `<p class="weekly-agenda-empty">${fa ? "بدون برنامه" : "No plans"}</p>`}</div></section>`).join("")}</div></section>`;
}
