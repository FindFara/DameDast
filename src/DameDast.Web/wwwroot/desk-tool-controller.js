import { calculate, randomKey } from "./desk-tools.js";
import { DeskPetController } from "./desk-pet.js";
import { plainCalendarMarkup } from "./desk-tool-ui.js";
import { t, getLanguage, localizedNumber } from "./i18n.js";

export class DeskToolController {
  constructor(callbacks) {
    this.callbacks = callbacks; this.pets = new DeskPetController();
    this.offsets = new Map(); this.visible = new Set(); this.formatters = new Map();
    this.drafts = new Map();
    document.addEventListener("visibilitychange", () => this.schedule());
    document.addEventListener("click", event => void this.click(event).catch(callbacks.error));
    document.addEventListener("submit", event => {
      if (event.target.matches("[data-desk-web-search]")) {
        event.preventDefault();
        const query = event.target.elements.query.value.trim();
        if (query) window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
        return;
      }
      if (!event.target.matches("[data-desk-calculator]")) return;
      event.preventDefault(); this.evaluate(event.target);
    });
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.classList.toggle("tool-in-view", entry.isIntersecting);
        entry.isIntersecting ? this.visible.add(entry.target) : this.visible.delete(entry.target);
      }
      this.schedule();
    });
  }
  attach() {
    clearInterval(this.timer); this.timer = null; this.observer.disconnect(); this.visible.clear();
    this.root = document.querySelector(".workbench-page");
    this.pets.attach(this.root, this.callbacks.context().space);
    if (!this.root) return;
    const scope = this.callbacks.context().space;
    if (this.scope !== scope) { this.offsets.clear(); this.drafts.clear(); this.scope = scope; }
    for (const card of this.root.querySelectorAll(".desk-card")) {
      const draft = this.drafts.get(card.dataset.deskId);
      if (!draft) continue;
      for (const [selector, value] of Object.entries(draft)) {
        const element = card.querySelector(selector);
        if (element) element.matches("input, select") ? element.value = value : element.textContent = value;
      }
    }
    this.root.querySelectorAll(".desk-card:has(.desk-clock)").forEach(card => this.observer.observe(card));
    for (const [id, offset] of this.offsets) {
      const card = this.root.querySelector(`[data-desk-id="${id}"]`);
      if (card?.querySelector(".desk-calendar")) this.calendar(card, offset);
    }
    this.tick();
  }
  capture() {
    if (this.scope !== this.callbacks.context().space) return;
    for (const card of this.root?.querySelectorAll(".desk-card:has(.desk-calculator, .desk-key-generator)") || []) {
      const draft = {};
      for (const selector of ["[data-calculation]", "[data-key-length]", "[data-key-format]", "[data-key-result]", "[data-tool-output]"]) {
        const element = card.querySelector(selector);
        if (element) draft[selector] = element.matches("input, select") ? element.value : element.textContent;
      }
      this.drafts.set(card.dataset.deskId, draft);
    }
  }
  formatter(zone, language, mode) {
    const key = `${zone}:${language}:${mode}`;
    if (!this.formatters.has(key)) this.formatters.set(key, new Intl.DateTimeFormat(language, {
      ...(zone === "local" ? {} : { timeZone: zone }),
      ...(mode === "date" ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }),
    }));
    return this.formatters.get(key);
  }
  schedule() {
    clearInterval(this.timer); this.timer = null;
    if (!this.root?.isConnected) return;
    this.root.classList.toggle("desk-tools-paused", document.hidden);
    if (!document.hidden && [...this.visible].some(card => card.querySelector(".desk-clock"))) {
      this.tick(); this.timer = setInterval(() => this.tick(), 1000);
    }
  }
  tick() {
    const now = new Date(), language = getLanguage() === "fa" ? "fa-IR" : "en-US";
    for (const clock of this.root?.querySelectorAll(".desk-clock") || []) {
      if (this.visible.size && !this.visible.has(clock.closest(".desk-card"))) continue;
      const zone = clock.dataset.timeZone;
      clock.querySelector("time").textContent = this.formatter(zone, language, "time").format(now);
      clock.querySelector("time").dateTime = now.toISOString();
      clock.querySelector(".desk-clock-date").textContent = this.formatter(zone, language, "date").format(now);
      if (clock.dataset.clockStyle === "analog") {
        const parts = Object.fromEntries(this.formatter(zone, "en-US", "time").formatToParts(now).map(part => [part.type, part.value]));
        for (const [hand, degrees] of [["hour", Number(parts.hour) % 12 * 30 + Number(parts.minute) / 2], ["minute", Number(parts.minute) * 6], ["second", Number(parts.second) * 6]])
          clock.querySelector(`.clock-${hand}`).style.transform = `rotate(${degrees}deg)`;
      }
    }
  }
  evaluate(form) {
    const output = form.querySelector("[data-tool-output]");
    try { output.textContent = localizedNumber(calculate(form.querySelector("[data-calculation]").value), 8); }
    catch (error) { output.textContent = t(error.message); }
  }
  calendar(card, offset) {
    const context = this.callbacks.context(), widget = context.records.find(record => record.kind === "workbench")?.data.widgets.find(widget => widget.id === card.dataset.deskId);
    card.querySelector(".desk-card-body").innerHTML = plainCalendarMarkup(widget?.options, offset, context.now);
  }
  async click(event) {
    const button = event.target.closest("[data-tool-action]");
    if (!button || !this.root?.contains(button)) return;
    const card = button.closest(".desk-card"), action = button.dataset.toolAction, output = card.querySelector("[data-tool-output]");
    if (action === "calendar-previous" || action === "calendar-next") {
      const offset = Math.max(-120, Math.min(120, (this.offsets.get(card.dataset.deskId) || 0) + (action === "calendar-next" ? 1 : -1)));
      this.offsets.set(card.dataset.deskId, offset); this.calendar(card, offset);
    } else if (action === "calculate-key") {
      const input = card.querySelector("[data-calculation]"), key = button.dataset.key;
      input.value = key === "C" ? "" : key === "⌫" ? input.value.slice(0, -1) : (input.value + key).slice(0, 160);
    } else if (action === "generate-key") {
      try { card.querySelector("[data-key-result]").value = randomKey(Number(card.querySelector("[data-key-length]").value), card.querySelector("[data-key-format]").value); output.textContent = ""; }
      catch (error) { output.textContent = t(error.message); }
    } else if (action === "copy-key") {
      const input = card.querySelector("[data-key-result]");
      if (!input.value) return;
      try { await navigator.clipboard.writeText(input.value); output.textContent = t("Copied."); }
      catch { input.select(); output.textContent = t("Select and copy the key."); }
    }
  }
}
