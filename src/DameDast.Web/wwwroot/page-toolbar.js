import { t } from "./i18n.js";
import { icon } from "./ui.js";

// Only page-level actions are registered here. Record actions stay with their records.
export const pageToolbarConfig = {
  overview: {
    inline: ".overview-heading .dashboard-controls",
    headingActions: false,
  },
  notes: { inline: ".keep-app .heading-actions", headingActions: false },
  transactions: {
    extra: [
      '[data-action="csv"]',
      '[data-action="transaction-filters-toggle"]',
    ],
  },
  reports: { extra: ['[data-action="csv"]'] },
  connected: {
    extra: [
      ".connected-toolbar > button[data-action]",
      ".connected-toolbar > a",
    ],
  },
  calendar: { extra: [".planner-toolbar button[data-planner-action]"] },
  market: { extra: ['[data-action="market-refresh"]'] },
  installments: { extra: ['.toolbar [data-action="push"]'] },
  settings: {
    extra: [
      '[data-action="backup-notes"]',
      '[data-action="backup-finance"]',
      '[data-action="backup"]',
      '[data-action="restore-backup"]',
    ],
    hideExtra: false,
  },
};
const commandIcon = (source) => {
  const name = source.dataset.action || source.dataset.plannerAction || "";
  if (
    /csv|export|backup|download/.test(name) ||
    source.hasAttribute("download")
  )
    return "download";
  if (/import|restore|clip/.test(name)) return "upload";
  if (/filter/.test(name)) return "filter";
  if (/add|new|create/.test(name)) return "plus";
  if (/refresh|sync|read/.test(name)) return "refresh";
  return "more";
};
export class PageToolbarController {
  constructor() {
    this.portals = [];
    this.sources = [];
    this.commands = [];
    this.observer = new MutationObserver(() => this.syncCommandState());
    document.addEventListener("pointerdown", (event) => {
      if (
        this.menu?.matches(":popover-open") &&
        !this.menu.contains(event.target) &&
        !this.trigger?.contains(event.target)
      )
        this.closeMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (!this.menu?.matches(":popover-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.closeMenu();
        return;
      }
      if (
        !event.target.matches("[data-page-command]") ||
        !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
      )
        return;
      event.preventDefault();
      const buttons = [
        ...this.menu.querySelectorAll("[data-page-command]"),
      ].filter((b) => !b.disabled);
      const index = buttons.indexOf(event.target);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    });
  }
  restore() {
    this.closeMenu(false);
    this.observer.disconnect();
    for (const { node, placeholder } of this.portals) {
      if (placeholder.isConnected) placeholder.replaceWith(node);
      else node.remove();
    }
    for (const source of this.sources)
      source.classList.remove("page-toolbar-source");
    document
      .querySelectorAll(".page-toolbar-heading-empty")
      .forEach((el) => el.classList.remove("page-toolbar-heading-empty"));
    this.portals = [];
    this.sources = [];
    this.commands = [];
    this.menu?.remove();
    this.menu = null;
  }
  move(node, target) {
    const placeholder = document.createComment("page toolbar control");
    node.before(placeholder);
    target.append(node);
    this.portals.push({ node, placeholder });
  }
  collect(view, config) {
    const entries = new Map();
    const add = (source, hide = true) => {
      if (!entries.has(source)) entries.set(source, { source, hide });
    };
    if (config.headingActions !== false)
      view
        .querySelectorAll(".page-heading button,.page-heading a")
        .forEach((source) => {
          if (!source.closest(".solar-month,[data-month-control]")) add(source);
        });
    for (const selector of config.extra || [])
      view
        .querySelectorAll(selector)
        .forEach((source) => add(source, config.hideExtra !== false));
    return [...entries.values()];
  }
  command(entry, inline = false) {
    const { source, hide } = entry;
    const label =
      source.getAttribute("aria-label") ||
      source.textContent.trim() ||
      source.title ||
      t("Page actions");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.pageCommand =
      source.dataset.action || source.dataset.plannerAction || label;
    button.className = inline
      ? "icon-button page-toolbar-command"
      : "page-toolbar-menu-command";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML =
      source.querySelector("svg")?.outerHTML || icon(commandIcon(source));
    if (!inline) {
      const span = document.createElement("span");
      span.textContent = label;
      button.append(span);
    }
    button.onclick = () => {
      if (source.disabled || !source.isConnected) return;
      this.closeMenu(false);
      source.click();
      queueMicrotask(() => {
        if (document.querySelector("dialog[open]")) return;
        const next = inline
          ? this.commands.find(
              (command) =>
                command.button.dataset.pageCommand ===
                button.dataset.pageCommand,
            )?.button
          : this.trigger;
        next?.focus({ preventScroll: true });
      });
    };
    if (hide) {
      source.classList.add("page-toolbar-source");
      this.sources.push(source);
    }
    this.commands.push({ source, button });
    this.observer.observe(source, {
      attributes: true,
      attributeFilter: ["disabled", "aria-pressed", "aria-expanded"],
    });
    return button;
  }
  syncCommandState() {
    for (const { source, button } of this.commands) {
      button.disabled = !!source.disabled;
      for (const name of ["aria-pressed", "aria-expanded"]) {
        if (source.hasAttribute(name))
          button.setAttribute(name, source.getAttribute(name));
        else button.removeAttribute(name);
      }
    }
  }
  createMenu(entries, fields, holder) {
    this.menu = document.createElement("div");
    this.menu.className = "page-toolbar-popover";
    this.menu.setAttribute("popover", "manual");
    this.menu.setAttribute("role", "dialog");
    this.menu.setAttribute("aria-label", t("Page actions"));
    document.body.append(this.menu);
    for (const entry of entries) this.menu.append(this.command(entry));
    for (const field of fields) {
      const row = document.createElement("div");
      row.className = "page-toolbar-field";
      this.menu.append(row);
      this.move(field, row);
    }
    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "icon-button page-toolbar-overflow";
    this.trigger.setAttribute("aria-label", t("Page actions"));
    this.trigger.title = t("Page actions");
    this.trigger.setAttribute("aria-haspopup", "dialog");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';
    this.trigger.onclick = () =>
      this.menu.matches(":popover-open") ? this.closeMenu() : this.openMenu();
    holder.append(this.trigger);
  }
  openMenu() {
    this.menu.showPopover();
    this.trigger.setAttribute("aria-expanded", "true");
    const rect = this.trigger.getBoundingClientRect(),
      width = Math.min(300, innerWidth - 24);
    this.menu.style.width = width + "px";
    this.menu.style.left =
      Math.max(12, Math.min(rect.right - width, innerWidth - width - 12)) +
      "px";
    this.menu.style.top =
      Math.max(
        12,
        Math.min(rect.bottom + 8, innerHeight - this.menu.offsetHeight - 12),
      ) + "px";
    this.menu.querySelector("button,input,select")?.focus();
  }
  closeMenu(focus = true) {
    if (this.menu?.matches(":popover-open")) {
      this.menu.hidePopover();
      this.trigger?.setAttribute("aria-expanded", "false");
      if (focus) this.trigger?.focus();
    }
  }
  update(page, fallbackTitle) {
    const title = document.querySelector("#mobile-page-title"),
      holder = document.querySelector("#page-toolbar-actions"),
      view = document.querySelector("#view");
    if (!title || !holder || !view) return;
    this.restore();
    holder.replaceChildren();
    holder.hidden = true;
    title.textContent =
      view.querySelector(".page-heading h1,h1")?.textContent || fallbackTitle;
    title.title = title.textContent;
    if (!matchMedia("(max-width:680px)").matches) return;
    const config = pageToolbarConfig[page] || {};
    const inline = config.inline && view.querySelector(config.inline);
    if (inline) this.move(inline, holder);
    const entries = this.collect(view, config);
    const fields = [
      ...view.querySelectorAll(".page-heading .solar-month"),
    ].filter((el) => !el.closest("#page-toolbar-actions"));
    const primary =
      entries.find(({ source }) =>
        /^(add|task-add|new)$/.test(
          source.dataset.action || source.dataset.plannerAction || "",
        ),
      ) || (entries.length === 1 && !fields.length ? entries[0] : null);
    if (primary) holder.append(this.command(primary, true));
    const remaining = entries.filter((entry) => entry !== primary);
    if (remaining.length || fields.length)
      this.createMenu(remaining, fields, holder);
    for (const heading of view.querySelectorAll(".page-heading")) {
      const unregistered = [
        ...heading.querySelectorAll("button,a,input:not([type=hidden]),select"),
      ].some(
        (el) =>
          !el.classList.contains("page-toolbar-source") &&
          !el.closest(".page-toolbar-source"),
      );
      if (!unregistered) heading.classList.add("page-toolbar-heading-empty");
    }
    holder.hidden = !holder.childElementCount;
    this.syncCommandState();
  }
}
let controller;
export function synchronizePageToolbar(page, title) {
  (controller ??= new PageToolbarController()).update(page, title);
}
