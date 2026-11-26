import { t } from "./i18n.js";
import { icon } from "./ui.js";

const add = '.page-heading [data-action="add"],.page-heading [data-action="task-add"],.page-heading [data-planner-action="new"]';
// This allowlist defines the floating rail. Other page controls stay in the page.
export const pageToolbarConfig = {
  workoutPrograms: { command: add, icon: "plus" },
  weightPlan: { command: '.page-heading [data-action="weight-add"]', icon: "plus" },
  weeklyPlan: { command: '.page-heading [data-action="development-add"]', icon: "plus" },
  developmentStudy: { command: '.page-heading [data-action="development-add"]', icon: "plus" },
  developmentExercise: { command: '.page-heading [data-action="development-add"]', icon: "plus" },
  languageEssays: { command: '.page-heading [data-lang-action="new-essay"]', icon: "plus" },
  languageLessons: { command: '.page-heading [data-lang-action="import"]', icon: "upload" },
  languageVocabulary: { command: '.page-heading [data-lang-action="edit-vocabulary"]', icon: "edit" },
  overview: { inline: ".overview-heading .dashboard-controls" },
  notes: { inline: ".keep-app .heading-actions" },
  transactions: { command: '[data-action="csv"]', icon: "download" },
  accounts: { command: add, icon: "plus" },
  calendar: { command: '.page-heading [data-planner-action="new"]', icon: "plus" },
  tasks: { command: add, icon: "plus" },
  projects: { command: add, icon: "plus" },
  habits: { command: add, icon: "plus" },
  bookmarks: { command: add, icon: "plus" },
  goals: { command: add, icon: "plus" },
  budgets: { command: add, icon: "plus" },
  reminders: { command: add, icon: "plus" },
  installments: { command: add, icon: "plus" },
  receivables: { command: add, icon: "plus" },
  locked: { command: add, icon: "plus" },
  assets: { command: '.page-heading [data-action="asset-add"]', icon: "plus" },
  monthlyPlan: { command: add, icon: "plus" },
  monthlyExpenses: { command: add, icon: "plus" },
};

export class PageToolbarController {
  constructor() {
    this.portals = [];
    this.commands = [];
    this.expanded = false;
    this.observer = new MutationObserver(() => this.syncCommandState());
    document.addEventListener("pointerdown", event => {
      if (this.expanded && !this.holder?.contains(event.target) &&
          !event.target.closest?.('[popover],dialog,[role="dialog"]')) this.close(false);
    });
    document.addEventListener("keydown", event => {
      if (!this.expanded || event.key !== "Escape") return;
      // Nested pickers and editors handle their own Escape first.
      if ([...document.querySelectorAll('dialog[open],[popover]')].some(el => el.open || el.matches(':popover-open'))) return;
      event.preventDefault();
      this.close();
    });
    document.addEventListener("focusin", event => {
      if (this.expanded && !this.holder?.contains(event.target) &&
          !event.target.closest?.('[popover],dialog,[role="dialog"]')) this.close(false);
    });
  }
  restore() {
    this.close(false);
    this.observer.disconnect();
    for (const { node, placeholder } of this.portals) {
      if (placeholder.isConnected) placeholder.replaceWith(node);
      else node.remove();
    }
    for (const { source } of this.commands) source.classList.remove("page-toolbar-source");
    document.querySelectorAll(".page-toolbar-heading-empty")
      .forEach(el => el.classList.remove("page-toolbar-heading-empty"));
    this.portals = [];
    this.commands = [];
    this.panel = this.trigger = null;
  }
  move(node, target) {
    const placeholder = document.createComment("page toolbar control");
    node.before(placeholder);
    target.append(node);
    this.portals.push({ node, placeholder });
  }
  command(source, glyph) {
    const label = source.getAttribute("aria-label") || source.textContent.trim() || source.title;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button page-toolbar-command";
    button.dataset.pageCommand = source.dataset.action || source.dataset.plannerAction || source.dataset.langAction;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon(glyph);
    button.onclick = () => {
      if (source.disabled || !source.isConnected) return;
      source.click();
    };
    source.classList.add("page-toolbar-source");
    this.commands.push({ source, button });
    this.observer.observe(source, { attributes: true, attributeFilter: ["disabled", "aria-pressed", "aria-expanded"] });
    return button;
  }
  syncCommandState() {
    for (const { source, button } of this.commands) {
      button.disabled = !!source.disabled;
      for (const name of ["aria-pressed", "aria-expanded"]) {
        if (source.hasAttribute(name)) button.setAttribute(name, source.getAttribute(name));
        else button.removeAttribute(name);
      }
    }
  }
  open(focus = true) {
    if (!this.panel) return;
    this.expanded = true;
    this.holder.classList.add("is-expanded");
    this.trigger.setAttribute("aria-expanded", "true");
    this.panel.inert = false;
    this.panel.removeAttribute("aria-hidden");
    if (focus) this.panel.querySelector("button,input,select")?.focus({ preventScroll: true });
  }
  close(focus = true) {
    this.expanded = false;
    this.holder?.classList.remove("is-expanded");
    this.trigger?.setAttribute("aria-expanded", "false");
    if (this.panel) {
      this.panel.inert = true;
      this.panel.setAttribute("aria-hidden", "true");
    }
    if (focus) this.trigger?.focus({ preventScroll: true });
  }
  update(page, fallbackTitle) {
    const title = document.querySelector("#mobile-page-title"),
      holder = document.querySelector("#page-toolbar-actions"),
      view = document.querySelector("#view");
    if (!title || !holder || !view) return;
    const keepOpen = this.page === page && this.expanded;
    this.restore();
    this.holder = holder;
    this.page = page;
    holder.replaceChildren();
    holder.hidden = true;
    title.textContent = view.querySelector(".page-heading h1,h1")?.textContent || fallbackTitle;
    title.title = title.textContent;
    const config = pageToolbarConfig[page];
    if (!config) return;
    const inline = config.inline && view.querySelector(config.inline),
      source = config.command && view.querySelector(config.command);
    if (!inline && !source) return;
    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "icon-button page-toolbar-toggle";
    this.trigger.setAttribute("aria-label", t("Page actions"));
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-controls", "page-toolbar-panel");
    this.trigger.title = t("Page actions");
    this.trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5"/></svg>';
    this.trigger.onclick = () => this.expanded ? this.close() : this.open();
    this.panel = document.createElement("div");
    this.panel.id = "page-toolbar-panel";
    this.panel.className = "page-toolbar-panel";
    const contents = document.createElement("div");
    contents.className = "page-toolbar-contents";
    this.panel.append(contents);
    // RTL rail order keeps the trigger at the moving, physical left edge.
    holder.append(this.panel, this.trigger);
    if (inline) this.move(inline, contents);
    if (source) contents.append(this.command(source, config.icon));
    for (const heading of view.querySelectorAll(".page-heading")) {
      if (!heading.querySelector('button:not(.page-toolbar-source),a,input:not([type="hidden"]),select'))
        heading.classList.add("page-toolbar-heading-empty");
    }
    holder.hidden = false;
    this.syncCommandState();
    if (keepOpen) this.open(false); else this.close(false);
  }
}
let controller;
export function synchronizePageToolbar(page, title) {
  (controller ??= new PageToolbarController()).update(page, title);
}
