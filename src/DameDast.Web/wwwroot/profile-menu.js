import { t } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";
import { accountSpace } from "./account-scope.js";

export function profileMenuMarkup(session) {
  if (accountSpace(session) === "guest")
    return `<button type="button" data-action="google"><span class="google-g" aria-hidden="true">G</span>${t("Sign in with Google")}</button>`;
  return `<p><bdi dir="auto">${esc(session.name || t("Google account"))}</bdi></p><button type="button" data-action="workspace-google">${t("My workspace")}</button><button type="button" data-action="logout">${t("Sign out")}</button>`;
}

export function googlePictureUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"))
      ? url.href : null;
  } catch { return null; }
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
  render(session, space = "guest") {
    this.renderIdentity(session, space);
    const html = profileMenuMarkup(session);
    if (html !== this.html) { this.html = html; this.menu.innerHTML = html; this.toggle(false); }
    this.button.setAttribute("aria-label", t("Account"));
  }
  renderIdentity(session, space) {
    const signedIn = accountSpace(session) !== "guest";
    const name = signedIn ? session.name || t("Google account") : t("Workspace");
    const holder = this.button.querySelector("#profile-name");
    if (holder) holder.innerHTML = `<bdi dir="auto">${esc(name)}</bdi><small>${t(space === "demo" ? "Demo" : signedIn ? "Google account" : "Local")}</small>`;
    this.button.title = name;
    const avatar = this.button.querySelector(".avatar");
    if (!avatar) return;
    const url = signedIn ? googlePictureUrl(session.pictureUrl) : null;
    const key = signedIn ? `${session.userId}:${url || ""}` : "guest";
    if (key === this.pictureKey) return;
    this.pictureKey = key;
    this.picture?.remove();
    this.picture = null;
    if (!url) return;
    const picture = document.createElement("img");
    picture.alt = "";
    picture.width = 38;
    picture.height = 38;
    picture.loading = "lazy";
    picture.decoding = "async";
    picture.referrerPolicy = "no-referrer";
    picture.addEventListener("load", () => {
      if (this.picture === picture) picture.classList.add("is-loaded");
    });
    picture.addEventListener("error", () => {
      picture.removeAttribute("src");
      picture.remove();
    }, { once: true });
    this.picture = picture;
    avatar.append(picture);
    picture.src = url;
  }

}
