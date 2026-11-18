import { t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { accountSpace } from "./account-scope.js";

export function profileMenuMarkup(session) {
  if (accountSpace(session) === "guest")
    return `<button type="button" data-action="google"><span class="google-g" aria-hidden="true">G</span>${t("Sign in with Google")}</button>`;
  return `<p><bdi dir="auto">${esc(session.name || t("Google account"))}</bdi></p><button type="button" data-action="workspace-google">${t("My workspace")}</button><button type="button" data-action="logout">${t("Sign out")}</button>`;
}

export class ProfileMenu {
  constructor(button, menu) {
    this.button = button; this.menu = menu;
    button.onclick = () => this.toggle(menu.hidden);
    button.addEventListener("keydown", event => {
      if (["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); this.toggle(true); }
    });
    document.addEventListener("click", event => {
      if (!menu.hidden && (!button.parentElement.contains(event.target) || event.target.closest("[data-action]"))) this.toggle(false);
    });
    document.addEventListener("keydown", event => {
      if (menu.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation(); this.toggle(false); button.focus();
      } else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) && menu.contains(event.target)) {
        event.preventDefault(); const items = [...menu.querySelectorAll("button")], index = items.indexOf(document.activeElement);
        items[event.key === "Home" ? 0 : event.key === "End" ? items.length-1 : (index+(event.key === "ArrowDown" ? 1 : -1)+items.length)%items.length]?.focus();
      }
    }, true);
    document.addEventListener("focusin", event => {
      if (!menu.hidden && !button.parentElement.contains(event.target)) this.toggle(false);
    });
  }
  toggle(open) {
    this.menu.hidden = !open; this.button.setAttribute("aria-expanded", String(open));
    if (open) this.menu.querySelector("button")?.focus();
  }
  render(session) {
    const html = profileMenuMarkup(session);
    if (html !== this.html) { this.html = html; this.menu.innerHTML = html; this.toggle(false); }
    this.button.setAttribute("aria-label", t("Account"));
  }
}
