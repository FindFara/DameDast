// Apply saved appearance before the first paint. Financial records are untouched.
try {
  const query = new URLSearchParams(location.search);
  const requested = query.get("lang");
  if (requested === "fa" || requested === "en")
    localStorage.setItem("damdast-language", requested);
  const language =
    localStorage.getItem("damdast-language") === "fa" ? "fa" : "en";
  const saved = localStorage.getItem("damdast-theme") || "system";
  const setting = ["system", "light", "dark", "dark-brown", "dark-blue", "gray-yellow", "white-yellow"].includes(saved) ? saved : "system";
  const theme =
    setting === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : setting;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
  const dark = theme === "dark" || theme.startsWith("dark-") || theme === "gray-yellow";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.palette = theme;
  const background = JSON.parse(localStorage.getItem("damdast-preferences-v2") || "{}").mainBackground;
  if (typeof background === "string" && /^#[0-9a-f]{6}$/i.test(background)) document.documentElement.style.setProperty("--bg", background);
  document.documentElement.style.colorScheme =
    dark ? "dark" : "light";
} catch {}
