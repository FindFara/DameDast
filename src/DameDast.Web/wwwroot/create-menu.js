import { t } from "./i18n.js";

const choices = [
  ["transaction", "Transaction", '<path d="M5 8h14m-4-4 4 4-4 4M19 16H5m4-4-4 4 4 4"/>'],
  ["task", "To-do", '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="m8 12 3 3 5-6"/>'],
  ["note", "Note", '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'],
];

export function createLauncher() {
  return `<div class="create-launcher create-launcher-floating"><button type="button" id="mobile-add" class="primary" aria-label="${t("Create")}" data-create-toggle aria-expanded="false" aria-haspopup="menu" aria-controls="quick-create-menu"><svg class="create-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><div class="create-fan" id="quick-create-menu" role="menu" aria-label="${t("Create")}" hidden>${choices.map(([kind, label, path], i) => `<button type="button" class="create-choice create-choice-${i}" role="menuitem" aria-label="${t(label)}" data-quick-create="${kind}"><span><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg></span></button>`).join("")}</div></div>`;
}

export class CreateMenuController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    document.addEventListener("click", (event) => this.click(event));
    document.addEventListener("keydown", (event) => this.keyDown(event));
    window.addEventListener("hashchange", () => this.close());
  }
  close(restoreFocus = false) {
    if (!this.root) return;
    this.root.querySelector("[data-create-toggle]").setAttribute("aria-expanded", "false");
    this.root.querySelector(".create-fan").hidden = true;
    if (restoreFocus) this.root.querySelector("[data-create-toggle]").focus();
    this.root = null;
  }
  click(event) {
    const trigger = event.target.closest("[data-create-toggle]");
    if (trigger) {
      const wasOpen = trigger.getAttribute("aria-expanded") === "true";
      this.close();
      if (!wasOpen) {
        this.root = trigger.closest(".create-launcher");
        trigger.setAttribute("aria-expanded", "true");
        this.root.querySelector(".create-fan").hidden = false;
        this.root.querySelector("[role=menuitem]").focus();
      }
      return;
    }
    const choice = event.target.closest("[data-quick-create]");
    if (choice) {
      this.close();
      this.callbacks.create(choice.dataset.quickCreate);
      return;
    }
    if (this.root && !this.root.contains(event.target)) this.close();
  }
  keyDown(event) {
    if (!this.root) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.close(true);
    } else if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = [...this.root.querySelectorAll("[role=menuitem]")];
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
        : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    } else if (event.key === "Tab") {
      this.close();
    }
  }
}
