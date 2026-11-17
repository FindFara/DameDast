import {
  workbenchRecord,
  defaultWorkbench,
  validateWorkbench,
  validDeskColor,
  firstFreeSpace,
  changedRectangle,
  canPlace,
  replaceWidget,
} from "./workbench.js";
import {
  addWidgetFields,
  widgetSettings,
  colorFields,
} from "./workbench-ui.js";
import { t } from "./i18n.js";
import { preferences, savePreferences } from "./preferences.js";
import { prepareDeskImage, MAX_DESK_IMAGES } from "./desk-tools.js";
import { toolOptionFields, optionsFromForm } from "./desk-tool-ui.js";

export class WorkbenchController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.editing = false;
    this.gesture = null;
    this.saving = false;
    document.addEventListener("pointerdown", (event) =>
      this.startPointer(event),
    );
    document.addEventListener("pointermove", (event) =>
      this.movePointer(event),
    );
    document.addEventListener(
      "pointerup",
      (event) => void this.finishPointer(event),
    );
    document.addEventListener("pointercancel", (event) =>
      this.cancelPointer(event),
    );
    window.addEventListener("blur", () => this.cancelPointer());
    document.addEventListener("keydown", (event) => void this.keyDown(event));
    document.addEventListener("click", (event) => void this.click(event));
    document.addEventListener("change", event => {
      if (!event.target.matches("[data-desk-edit-toggle]")) return;
      savePreferences({ workbenchEditing: event.target.checked });
      this.editing = event.target.checked;
      this.callbacks.refresh();
    });
  }
  get isInteracting() {
    return !!this.gesture || this.saving;
  }
  attach() {
    this.root = document.querySelector(".workbench-page");
    this.editing = preferences().workbenchEditing;
    this.board = this.root?.querySelector("#desk-board");
  }
  current() {
    const context = this.callbacks.context(),
      record = workbenchRecord(context.records);
    return {
      context,
      record,
      space: context.space,
      layout: structuredClone(record?.data || defaultWorkbench()),
    };
  }
  async save(layout, base) {
    validateWorkbench(layout);
    this.saving = true;
    try {
      await this.callbacks.save(layout, base);
    } finally {
      this.saving = false;
      this.callbacks.refresh();
    }
  }
  startPointer(event) {
    const handle = event.target.closest?.(
      "[data-desk-drag],[data-desk-resize]",
    );
    if (
      !handle ||
      !this.editing ||
      !this.board?.contains(handle) ||
      event.button !== 0 ||
      this.isInteracting
    )
      return;
    const base = this.current(),
      id = handle.dataset.deskDrag || handle.dataset.deskResize,
      original = base.layout.widgets.find((w) => w.id === id);
    if (!original) return;
    event.preventDefault();
    const rect = this.board.getBoundingClientRect(),
      gap = parseFloat(getComputedStyle(this.board).gap) || 0;
    this.gesture = {
      base,
      original,
      candidate: original,
      card: handle.closest(".desk-card"),
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      stepX: (rect.width + gap) / 12,
      stepY: (rect.height + gap) / 6,
      resize: !!handle.dataset.deskResize,
      valid: true,
    };
    handle.setPointerCapture(event.pointerId);
    this.gesture.card.classList.add("desk-moving");
    this.board.classList.add("desk-interacting");
  }
  movePointer(event) {
    const g = this.gesture;
    if (!g || g.pointerId !== event.pointerId) return;
    if (!g.card.isConnected) {
      this.cancelPointer();
      return;
    }
    event.preventDefault();
    g.candidate = changedRectangle(
      g.original,
      Math.round((event.clientX - g.startX) / g.stepX),
      Math.round((event.clientY - g.startY) / g.stepY),
      g.resize,
    );
    g.valid = canPlace(g.base.layout, g.candidate, g.original.id);
    g.card.style.gridColumn = `${g.candidate.x + 1} / span ${g.candidate.width}`;
    g.card.style.gridRow = `${g.candidate.y + 1} / span ${g.candidate.height}`;
    g.card.classList.toggle("desk-invalid", !g.valid);
    const status = this.root?.querySelector(".desk-live-status");
    if (status)
      status.textContent = g.valid
        ? `${g.candidate.width} × ${g.candidate.height} · ${g.candidate.x + 1}, ${g.candidate.y + 1}`
        : t("That space is occupied.");
  }
  releasePointer() {
    const g = this.gesture;
    this.gesture = null;
    if (!g) return null;
    if (g.handle.hasPointerCapture(g.pointerId))
      g.handle.releasePointerCapture(g.pointerId);
    g.card.classList.remove("desk-moving", "desk-invalid");
    this.board?.classList.remove("desk-interacting");
    return g;
  }
  async finishPointer(event) {
    if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
    const g = this.releasePointer();
    if (
      !g.valid ||
      ["x", "y", "width", "height"].every(
        (p) => g.original[p] === g.candidate[p],
      )
    ) {
      this.callbacks.refresh();
      return;
    }
    try {
      await this.save(replaceWidget(g.base.layout, g.candidate), g.base);
    } catch (error) {
      this.callbacks.error(error);
    }
  }
  cancelPointer(event) {
    if (!this.gesture || (event && event.pointerId !== this.gesture.pointerId))
      return;
    this.releasePointer();
    this.callbacks.refresh();
  }
  async keyDown(event) {
    if (event.key === "Escape" && this.gesture) {
      event.preventDefault();
      this.cancelPointer();
      return;
    }
    const handle = event.target.closest?.(
      "[data-desk-drag],[data-desk-resize]",
    );
    if (!this.editing || this.isInteracting || !this.board?.contains(handle))
      return;
    const delta = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    const base = this.current(),
      id = handle.dataset.deskDrag || handle.dataset.deskResize,
      w = base.layout.widgets.find((w) => w.id === id);
    if (!w) return;
    const next = changedRectangle(
      w,
      ...delta,
      event.shiftKey || !!handle.dataset.deskResize,
    );
    if (!canPlace(base.layout, next, id)) {
      this.root.querySelector(".desk-live-status").textContent = t(
        "That space is occupied.",
      );
      return;
    }
    try {
      await this.save(replaceWidget(base.layout, next), base);
      this.board?.querySelector(`[data-desk-drag="${id}"]`)?.focus();
    } catch (error) {
      this.callbacks.error(error);
    }
  }
  async click(event) {
    const button = event.target.closest?.("[data-desk-action]");
    if (!button || this.isInteracting) return;
    const action = button.dataset.deskAction;
    if (action === "done") {
      savePreferences({ workbenchEditing: false });
      this.editing = false;
      this.callbacks.refresh();
      return;
    }
    if (!["add", "configure", "background"].includes(action)) return;
    if (["add", "configure"].includes(action) && !this.editing) return;
    this.openDialog(action, button.dataset.id);
  }
  openDialog(mode, id) {
    const base = this.current(),
      widget = base.layout.widgets.find((w) => w.id === id),
      dialog = document.querySelector("#workbench-dialog");
    if (mode === "configure" && !widget) return;
    this.dialogBase = base;
    dialog.innerHTML = `<form id="desk-form"><div class="dialog-heading"><h2>${t(mode === "add" ? "Add component" : mode === "background" ? "Desk background" : "Card settings")}</h2><button type="button" class="icon-button" data-desk-dialog-close aria-label="${t("Close")}">×</button></div><div class="desk-dialog-fields">${mode === "add" ? addWidgetFields(this.callbacks.icon) : mode === "background" ? colorFields(base.layout.background) : widgetSettings(widget, base.context)}</div><p id="desk-form-error" role="alert"></p><div class="dialog-actions">${mode === "configure" ? `<button type="button" class="text-button negative" data-desk-remove>${t("Remove card")}</button>` : ""}<button type="submit" class="primary">${t(mode === "add" ? "Add component" : "Save")}</button><button type="button" class="secondary" data-desk-dialog-close>${t("Cancel")}</button></div></form>`;
    const form = dialog.querySelector("form");
    let imageData = widget?.options?.imageData || null, imagePromise = null, imageGeneration = 0;
    form.addEventListener("change", event => {
      if (event.target.name === "widgetType") {
        imageGeneration++; imageData = null;
        form.querySelector("[data-widget-options]").innerHTML = toolOptionFields(event.target.value);
        form.elements.size.value = ["plainCalendar", "calculator", "keyGenerator", "pet"].includes(event.target.value) ? "4,3" : "4,2";
      }
      if (event.target.matches("[data-desk-image-input]")) {
        const file = event.target.files[0], generation = ++imageGeneration;
        if (!file) return;
        form.querySelector('[type="submit"]').disabled = true;
        imagePromise = prepareDeskImage(file).then(data => {
          if (generation !== imageGeneration) return;
          imageData = data;
          let preview = form.querySelector(".desk-image-draft");
          if (!preview) { preview = document.createElement("img"); preview.className = "desk-image-draft"; preview.alt = ""; event.target.after(preview); }
          preview.src = data;
          form.querySelector("#desk-form-error").textContent = "";
        }).catch(error => { form.querySelector("#desk-form-error").textContent = t(error.message); })
          .finally(() => { form.querySelector('[type="submit"]').disabled = false; });
      }
    });
    dialog
      .querySelectorAll("[data-desk-dialog-close]")
      .forEach((b) => (b.onclick = () => dialog.close()));
    const setColor = (color) => {
      form.elements.background.value = color;
      if (validDeskColor(color || null) && color)
        form.querySelector("[data-desk-color-picker]").value = color;
      form
        .querySelectorAll("[data-desk-swatch]")
        .forEach((b) =>
          b.classList.toggle("selected", b.dataset.deskSwatch === color),
        );
    };
    form
      .querySelectorAll("[data-desk-swatch]")
      .forEach((b) => (b.onclick = () => setColor(b.dataset.deskSwatch)));
    const picker = form.querySelector("[data-desk-color-picker]");
    if (picker) picker.oninput = () => setColor(picker.value);
    if (form.elements.background)
      form.elements.background.oninput = () =>
        setColor(form.elements.background.value);
    const submit = async (remove) => {
      const error = form.querySelector("#desk-form-error");
      error.textContent = "";
      const values = Object.fromEntries(new FormData(form));
      try {
        await imagePromise;
        let next = structuredClone(base.layout);
        if (remove) next.widgets = next.widgets.filter((w) => w.id !== id);
        else if (mode === "background")
          next.background = values.background.trim() || null;
        else if (mode === "add") {
          if (values.widgetType === "image" && next.widgets.filter(widget => widget.type === "image").length >= MAX_DESK_IMAGES)
            throw Error("You can add up to 4 photos to your workbench.");
          const [width, height] = values.size.split(",").map(Number),
            rect = firstFreeSpace(next, width, height);
          if (!rect)
            throw Error(
              "Not enough room. Try a smaller card, or resize an existing one.",
            );
          next.widgets.push({
            id: crypto.randomUUID(),
            type: values.widgetType,
            ...rect,
            background: null,
            title: values.title?.trim() || null,
            referenceId: null,
            options: optionsFromForm(values.widgetType, values, {}, imageData),
          });
          this.editing = true;
        } else
          next = replaceWidget(next, {
            ...widget,
            title: values.title.trim() || null,
            referenceId: values.referenceId || null,
            background: values.background.trim() || null,
            x: Number(values.x) - 1,
            y: Number(values.y) - 1,
            width: Number(values.width),
            height: Number(values.height),
            options: optionsFromForm(widget.type, values, widget.options || {}, imageData),
          });
        if (!remove && mode === "add" && values.widgetType === "image" && !imageData)
          throw Error("Choose a photo in card settings.");
        form.querySelectorAll("button").forEach((b) => (b.disabled = true));
        await this.save(next, base);
        dialog.close();
      } catch (e) {
        error.textContent = t(e.message);
        form.querySelectorAll("button").forEach((b) => (b.disabled = false));
      }
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      void submit(false);
    };
    const remove = form.querySelector("[data-desk-remove]");
    if (remove) remove.onclick = () => void submit(true);
    dialog.showModal();
  }
}
