import { t } from "./i18n.js";
const toggle = document.querySelector("#app-menu-button"),
  sidebar = document.querySelector("#app-sidebar"),
  backdrop = document.querySelector("#app-nav-backdrop");
function open(value) {
  document.body.classList.toggle("nav-open", value);
  toggle.setAttribute("aria-expanded", String(value));
  toggle.setAttribute("aria-label", t(value ? "Close" : "Menu"));
  sidebar.inert = !value;
  sidebar.setAttribute("aria-hidden", String(!value));
  backdrop.hidden = !value;
  toggle.hidden = value;
  if (value) document.querySelector("#app-menu-close").focus();
  else toggle.focus();
}
toggle.onclick = () => open(!document.body.classList.contains("nav-open"));
backdrop.onclick = () => open(false);
document.querySelector("#app-menu-close").onclick = () => open(false);
sidebar.addEventListener("click", (event) => {
  if (event.target.closest("a")) open(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
    event.preventDefault();
    open(false);
  }
});
document.addEventListener(
  "click",
  (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !document.body.classList.contains("whiteboard-open")) return;
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("damdast:navigate", {
        detail: { hash: link.getAttribute("href") },
      }),
    );
  },
  true,
);
sidebar.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const items = [...sidebar.querySelectorAll("a,button,input,select")].filter(
    (el) => !el.disabled && el.getClientRects().length,
  );
  const i = items.indexOf(document.activeElement),
    next = items[(i + (event.shiftKey ? -1 : 1) + items.length) % items.length];
  event.preventDefault();
  next?.focus();
});
