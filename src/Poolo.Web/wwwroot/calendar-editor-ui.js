import { t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { eventColors } from "./planner.js";

export function calendarEditorFields(d, dateField, linkedTask = false) {
  const field = (label, name, value, attributes = "") =>
    `<label class="field">${t(label)}<input name="${name}" value="${esc(value || "")}" ${attributes}></label>`;
  return `${field("Title", "title", d.title, 'maxlength="120" required dir="auto"')}
    <div class="calendar-dates calendar-field-pair">${dateField("Start date", "startDate", d.startDate)}${linkedTask ? "" : dateField("End date", "endDate", d.endDate)}</div>
    <label class="checkbox-field"><input type="checkbox" name="allDay" ${d.allDay ? "checked" : ""}>${t("All day")}</label>
    <div class="calendar-field-pair" data-time-fields>${field("Start time", "startTime", d.startTime, 'type="time"')}${linkedTask ? "" : field("End time", "endTime", d.endTime, 'type="time"')}</div>
    <details class="editor-more"><summary>${t("More options")}<span>${t("Optional")}</span></summary><div class="editor-more-fields">
    ${linkedTask ? "" : `<label class="field">${t("Type")}<select name="kind">${[["event", "Event"], ["task", "Task"]].map(([value, label]) => `<option value="${value}" ${value === d.kind ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label>
    <label class="field">${t("Description")}<textarea name="description" maxlength="4000" rows="3" dir="auto">${esc(d.description || "")}</textarea></label>
    <div class="calendar-field-pair calendar-recurrence"><label class="field">${t("Repeat")}<select name="repeat">${[["none", "Does not repeat"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([value, label]) => `<option value="${value}" ${value === d.repeat ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label><div data-repeat-until>${dateField("Repeat until", "repeatUntil", d.repeatUntil, false)}</div></div>
    <label class="field">${t("Color")}<select name="color">${eventColors.map((color, i) => `<option value="${color}" ${color === d.color ? "selected" : ""}>${t(["Sage", "Blue", "Purple", "Gold", "Rose", "Teal"][i])}</option>`).join("")}</select></label>`}
    <label class="checkbox-field"><input name="done" type="checkbox" ${d.completedForEditor ? "checked" : ""}>${t("Completed")}${d.repeat !== "none" ? " · " + t("This occurrence") : ""}</label>
    </div></details>`;
}
