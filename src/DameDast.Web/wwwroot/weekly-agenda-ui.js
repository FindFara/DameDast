import { weeklyAgenda } from "./weekly-agenda.js";
import { getLanguage, t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { solarText } from "./calendar.js";

export function weeklyAgendaPanel(c) {
  const fa = getLanguage() === "fa";
  const week = weeklyAgenda(c.records, c.now);
  const days = week.filter(day => day.items.length);
  if (!days.length) return "";
  const labels = {
    study: fa ? "مطالعهٔ تخصصی" : "Specialized study",
    exercise: fa ? "ورزش" : "Exercise",
    essay: fa ? "انشا" : "Essay",
    vocabulary: fa ? "کلمات زبان" : "Vocabulary",
    lesson: fa ? "جزوهٔ زبان" : "Language lesson",
    plan: fa ? "توسعهٔ فردی" : "Personal development",
    habit: t("Routines"),
    todo: fa ? "تودو" : "To-do",
  };
  const states = { done: t("Completed"), overdue: t("Overdue"), planned: fa ? "برنامه‌ریزی‌شده" : "Planned" };
  const weekday = date => new Intl.DateTimeFormat(fa ? "fa-IR" : "en-US", { weekday: "long", timeZone: "Asia/Tehran" }).format(new Date(date + "T12:00:00Z"));
  return `<section class="panel weekly-agenda" aria-labelledby="weekly-agenda-title"><header class="panel-head"><h2 id="weekly-agenda-title">${fa ? "برنامهٔ این هفته" : "This week"}</h2><small>${solarText(week[0].date, false)} — ${solarText(week.at(-1).date, false)}</small></header><div class="weekly-agenda-grid" style="--agenda-days:${days.length}">${days.map(day => `<section class="weekly-agenda-day ${day.today ? "is-today" : ""}" ${day.today ? 'aria-current="date"' : ""}><header><h3>${weekday(day.date)}</h3><time datetime="${day.date}">${solarText(day.date, false)}</time></header><div class="weekly-agenda-items${day.items.length > 3 ? " has-overflow" : ""}" role="region" tabindex="0" aria-label="${esc(weekday(day.date) + " · " + (fa ? "فعالیت‌ها" : "Activities"))}">${day.items.map(item => {
    const text = c.space === "demo" ? t(item.title) : item.title;
    return `<button type="button" class="weekly-agenda-item is-${item.status}${item.source === "habit" ? " is-habit" : ""}" ${item.source === "habit" ? `style="--agenda-habit-color:${item.color}"` : ""} data-action="weekly-item-open" data-id="${esc(item.recordId)}" data-source="${item.source}" data-task-id="${esc(item.taskId || "")}" data-date="${item.occurrence || item.date}" aria-label="${esc(text + " · " + labels[item.area] + " · " + states[item.status])}"><span class="weekly-agenda-kind">${labels[item.area]}</span><strong dir="auto" title="${esc(text)}">${esc(text)}</strong><span class="weekly-agenda-state"><span aria-hidden="true">${item.status === "done" ? "✓" : item.status === "overdue" ? "!" : "○"}</span>${states[item.status]}${!item.allDay && item.startTime ? `<bdi dir="ltr">${esc(item.startTime)}</bdi>` : ""}</span></button>`;
  }).join("") || `<p class="weekly-agenda-empty">${fa ? "بدون برنامه" : "No plans"}</p>`}</div></section>`).join("")}</div></section>`;
}
