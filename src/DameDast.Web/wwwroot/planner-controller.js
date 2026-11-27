import { closeIcon } from "./ui-icons.js";
import { projectField } from "./productivity-ui.js";
import { calendarEditorFields } from "./calendar-editor-ui.js";
import { preferences, savePreferences } from "./preferences.js";
import { t, getLanguage } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { dateControl, solarText, updateCalendarControl } from "./calendar.js";
import {
  validateCalendarEntry,
  shiftDay,
  shiftCalendarMonth,
  minutesClock,
  clockMinutes,
  eventColors,
} from "./planner.js";
import { tehranParts } from "./organizer.js";
export class PlannerController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.scrollPositions = new Map();
    this.state = {
      date: tehranParts().date,
      view:
        localStorage.getItem("damdast-calendar-view") ||
        (typeof innerWidth === "number" && innerWidth < 600 ? "day" : "month"),
    };
    if (!["day", "week", "month"].includes(this.state.view))
      this.state.view = "month";
    document.addEventListener(
      "click",
      (e) => void this.click(e).catch(callbacks.error),
    );
    document.addEventListener("change", (e) => this.change(e));
  }
  attach() {
    this.root = document.querySelector(".planner-page");
    const scroller = this.root?.querySelector(".planner-time-scroll");
    if (scroller) {
      const key = `${this.state.view}:${this.state.date}`;
      scroller.scrollTop = this.scrollPositions.get(key) ?? 448;
      scroller.addEventListener(
        "scroll",
        () => this.scrollPositions.set(key, scroller.scrollTop),
        { passive: true },
      );
    }
  }
  async click(event) {
    const button = event.target.closest("[data-planner-action]");
    if (!button) return;
    const action = button.dataset.plannerAction,
      p = preferences();
    if (action === "view") {
      this.state.view = button.dataset.view;
      localStorage.setItem("damdast-calendar-view", this.state.view);
      this.callbacks.refresh();
      return;
    }
    if (["previous", "next", "today", "day"].includes(action)) {
      const n = action === "previous" ? -1 : 1;
      this.state.date =
        action === "today"
          ? tehranParts(this.callbacks.context().now).date
          : action === "day"
            ? button.dataset.date
            : this.state.view === "month"
              ? shiftCalendarMonth(this.state.date, n, p.calendar)
              : shiftDay(
                  this.state.date,
                  n * (this.state.view === "week" ? 7 : 1),
                );
      if (action === "day") this.state.view = "day";
      this.callbacks.refresh();
      return;
    }
    if (action === "jump") {
      this.dialog(null, null, true);
      return;
    }
    if (action === "new") {
      this.dialog(null, {
        startDate: button.dataset.date || this.state.date,
        startTime: button.dataset.time,
      });
      return;
    }
    const c = this.callbacks.context(),
      record = c.records.find((r) => r.id === button.dataset.id);
    if (!record) return;
    if (action === "schedule-task" || button.dataset.source === "noteTask") {
      this.dialog(record, { taskId: button.dataset.taskId });
      return;
    }
    if (record.kind === "calendarEvent") {
      this.dialog(record, { occurrence: button.dataset.date });
      return;
    }
    this.callbacks.edit(record.kind, record.id);
  }
  change(event) {
    const element = event.target;
    if (element.matches("[data-calendar-item]")) {
      const filters = preferences().calendarItems.filter(
        (k) => k !== element.dataset.calendarItem,
      );
      if (element.checked)
        filters.push(element.dataset.calendarItem);
      savePreferences({ calendarItems: filters });
      this.callbacks.refresh();
    }
  }
  dialog(record, preset = {}, jump = false) {
    const p = preferences(),
      task =
        record?.kind === "note"
          ? record.data.checklist?.find((i) => i.id === preset.taskId)
          : null;
    const source = record?.kind === "calendarEvent" ? record.data : {},
      d = {
        title: task?.text || "",
        description: "",
        startDate: task?.dueDate || preset.startDate || this.state.date,
        endDate: task?.dueDate || preset.startDate || this.state.date,
        allDay: !preset.startTime && !task?.dueTime,
        startTime: task?.dueTime || preset.startTime || "09:00",
        endTime: minutesClock(
          Math.min(
            1439,
            clockMinutes(task?.dueTime || preset.startTime || "09:00") + 60,
          ),
        ),
        kind: task ? "task" : preset.kind || "event",
        done: task?.done || false,
        color: eventColors[0],
        repeat: "none",
        repeatUntil: null,
        repeatCalendar: p.calendar,
        completedDates: [],
        projectId: preset.projectId || null,
        ...source,
      };
    d.startTime ||= "09:00";
    d.endTime ||= "10:00";
    const dateField = (label, name, value, required = true) =>
      p.calendar === "persian"
        ? dateControl(label, name, value, required)
        : `<label class="field">${t(label)}<input type="date" name="${name}" value="${value || ""}" min="2000-01-01" max="2100-12-31" ${required ? "required" : ""}><small>${value ? solarText(value) : ""}</small></label>`;
    const dialog = document.querySelector("#calendar-dialog");
    const fields = jump ? dateField("Date", "date", this.state.date) : calendarEditorFields({
      ...d,
      completedForEditor: d.repeat === "none" ? d.done : d.completedDates?.includes(preset.occurrence),
    }, dateField, !!task);
    dialog.innerHTML = `<form><div class="dialog-heading"><h2>${t(jump ? "Go to date" : record ? "Edit calendar item" : "Create calendar item")}</h2><button type="button" class="icon-button" data-close aria-label="${t("Close")}">${closeIcon}</button></div><div class="calendar-fields">${fields}${!jump && !task ? projectField(this.callbacks.context().records, d.projectId) : ""}</div><p class="form-error" role="alert"></p><div class="dialog-actions">${record?.kind === "calendarEvent" ? `<button type="button" class="text-button negative" data-remove>${t("Delete series")}</button>` : ""}<button type="button" class="secondary" data-close>${t("Cancel")}</button><button type="submit" class="primary">${t(jump ? "Go" : "Save")}</button></div></form>`;
    const form = dialog.querySelector("form"),
      toggle = () => {
        if (jump) return;
        form.querySelector("[data-time-fields]").hidden =
          form.elements.allDay.checked;
        for (const e of form.querySelectorAll("[data-time-fields] input"))
          e.required = !form.elements.allDay.checked;
      };
    const toggleRepeat = () => {
      const until = form.querySelector("[data-repeat-until]");
      if (!until) return;
      until.hidden = form.elements.repeat.value === "none";
      until.querySelectorAll("input,select").forEach(input => input.disabled = until.hidden);
    };
    toggle();
    toggleRepeat();
    form.addEventListener("change", (event) => {
      if (event.target.name === "allDay") toggle();
      if (event.target.name === "repeat") toggleRepeat();
    });
    dialog
      .querySelectorAll("[data-close]")
      .forEach((b) => (b.onclick = () => dialog.close()));
    form.onsubmit = async (event) => {
      event.preventDefault();
      for (const control of form.querySelectorAll(
        "[data-date-control] [data-solar-year]",
      ))
        updateCalendarControl(control);
      const values = Object.fromEntries(new FormData(form));
      try {
        if (jump) {
          this.state.date = values.date;
          dialog.close();
          this.callbacks.refresh();
          return;
        }
        form.querySelectorAll("button").forEach((b) => (b.disabled = true));
        if (task) {
          await this.callbacks.save(
            "note",
            {
              ...record.data,
              checklist: record.data.checklist.map((i) =>
                i.id === task.id
                  ? {
                      ...i,
                      text: values.title.trim(),
                      dueDate: values.startDate,
                      dueTime: values.allDay ? null : values.startTime,
                      done: !!values.done,
                    }
                  : i,
              ),
            },
            record.id,
            record.version,
          );
        } else {
          const next = {
            ...d,
            projectId: values.projectId || null,
            title: values.title.trim(),
            description: values.description || "",
            startDate: values.startDate,
            endDate: values.endDate,
            allDay: !!values.allDay,
            startTime: values.allDay ? null : values.startTime,
            endTime: values.allDay ? null : values.endTime,
            kind: values.kind,
            done: !!values.done,
            color: values.color,
            repeat: values.repeat,
            repeatUntil: values.repeat === "none" ? null : values.repeatUntil || null,
          };
          if (next.repeat !== "none") {
            next.done = false;
            next.completedDates = [
              ...new Set([
                ...(d.completedDates || []).filter(
                  (date) => date !== preset.occurrence,
                ),
                ...(values.done ? [preset.occurrence || next.startDate] : []),
              ]),
            ];
          }
          validateCalendarEntry(next);
          await this.callbacks.save(
            "calendarEvent",
            next,
            record?.id || crypto.randomUUID(),
            record?.version ?? 0,
          );
        }
        dialog.close();
        this.callbacks.refresh();
      } catch (error) {
        form.querySelector(".form-error").textContent = t(error.message);
        form.querySelectorAll("button").forEach((b) => (b.disabled = false));
      }
    };
    const remove = dialog.querySelector("[data-remove]");
    if (remove)
      remove.onclick = async () => {
        try {
          await this.callbacks.remove(record);
          dialog.close();
        } catch (e) {
          form.querySelector(".form-error").textContent = t(e.message);
        }
      };
    dialog.showModal();
  }
}
