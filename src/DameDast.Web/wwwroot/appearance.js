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
  document.documentElement.style.colorScheme =
    theme === "dark" ? "dark" : "light";
} catch {}
