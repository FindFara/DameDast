// Apply saved appearance before the first paint. Financial records are untouched.
try {
  const query = new URLSearchParams(location.search);
  const requested = query.get("lang");
  if (requested === "fa" || requested === "en")
    localStorage.setItem("damdast-language", requested);
  const language =
    localStorage.getItem("damdast-language") === "fa" ? "fa" : "en";
  const saved = localStorage.getItem("damdast-theme");
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const alias = saved === "light" ? "white-green" : ["dark", "dark-brown"].includes(saved) ? "dark-green" : saved;
  const theme = ["dark-green", "dark-blue", "gray-yellow", "white-yellow", "white-green", "dracula", "nord", "catppuccin-mocha", "tokyo-night", "gruvbox"].includes(alias)
    ? alias : prefersDark ? "dark-green" : "white-green";
  document.documentElement.lang = language;
  document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
  const dark = !["white-yellow", "white-green"].includes(theme);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.palette = theme;
  const background = JSON.parse(localStorage.getItem("damdast-preferences-v2") || "{}").mainBackground;
  if (typeof background === "string" && /^#[0-9a-f]{6}$/i.test(background)) document.documentElement.style.setProperty("--bg", background);
  document.documentElement.style.colorScheme =
    dark ? "dark" : "light";
} catch {}
