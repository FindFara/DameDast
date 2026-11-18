// Apply saved appearance before the first paint. Financial records are untouched.
try {
  const query = new URLSearchParams(location.search);
  const requested = query.get("lang");
  if (requested === "fa" || requested === "en")
    localStorage.setItem("damdast-language", requested);
  const language =
    localStorage.getItem("damdast-language") === "fa" ? "fa" : "en";
  const setting = localStorage.getItem("damdast-theme") || "system";
  const theme =
    setting === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : setting;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  const background = JSON.parse(localStorage.getItem("damdast-preferences-v2") || "{}").mainBackground;
  if (typeof background === "string" && /^#[0-9a-f]{6}$/i.test(background)) document.documentElement.style.setProperty("--bg", background);
  document.documentElement.style.colorScheme =
    theme === "dark" ? "dark" : "light";
} catch {}
