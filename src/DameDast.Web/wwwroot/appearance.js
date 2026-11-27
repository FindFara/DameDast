// Apply saved appearance before the first paint. Financial records are untouched.
try {
  const query = new URLSearchParams(location.search);
  const requested = query.get("lang");
  if (requested === "fa" || requested === "en")
    localStorage.setItem("damdast-language", requested);
  if (!localStorage.getItem("damdast-language")) localStorage.setItem?.("damdast-language", "fa");
  const language =
    localStorage.getItem("damdast-language") === "fa" ? "fa" : "en";
  const saved = localStorage.getItem("damdast-azki-theme") || "azki-blue";
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const alias = saved === "light" ? "white-green" : ["dark", "dark-brown"].includes(saved) ? "dark-green" : saved;
  const theme = ["azki-blue", "dark-green", "dark-blue", "gray-yellow", "white-yellow", "white-green", "dracula", "nord", "catppuccin-mocha", "tokyo-night", "gruvbox"].includes(alias)
    ? alias : prefersDark ? "dark-green" : "white-green";
  document.documentElement.lang = language;
  document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
  const dark = !["azki-blue", "white-yellow", "white-green"].includes(theme);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.palette = theme;
  document.documentElement.style.colorScheme =
    dark ? "dark" : "light";
} catch {}
