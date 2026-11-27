const CACHE = "damedast-shell-v111";
const SHELL = [
  "/notification-preferences.js", "/ui-icons.js",
  "/dashboard-layout.js", "/dashboard-settings-ui.js", "/dashboard-layout.css",
  "/themes.js", "/themes.css",
  "/weekly-agenda.js", "/weekly-agenda-ui.js",
  "/exercise.js", "/exercise-ui.js", "/exercise-clock.js",
  "/learning-week.js", "/learning-week-controller.js",
  "/development.js", "/development-ui.js", "/development-resources.js", "/development.css",
  "/language-model.js", "/language-ui.js", "/language-controller.js", "/language-markdown.js", "/language.css",
  "/account-card-number.js",
  "/account-cards.css",
  "/page-toolbar.js",
  "/keep-preferences.js",
  "/keep-notes.js", "/keep-view.js", "/keep-model.js", "/keep-notes.css", "/fonts/vazirmatn.woff2",
  "/desk-dog.js",
  "/desk-pet.js",
  "/desk-pet-renderer.js",
  "/desk-pet-ui.js",
  "/desk-pet.css",
  "/notebook.js",
  "/productivity.js",
  "/productivity-ui.js",
  "/productivity.css",
  "/note-blocks.js",
  "/installment-payment.js",
  "/clip-inbox.js",
  "/extension/shared/clips.js",
  "/whiteboard/model.mjs",
  "/whiteboard/storage.mjs",
  "/whiteboard/recovery.mjs",
  "/desk-home-ui.js",
  "/google-services.js",
  "/desk-home.css",
  "/note-page.js",
  "/note-page.css",
  "/desk-tools.js",
  "/desk-tools.css",
  "/desk-tool-ui.js",
  "/desk-tool-controller.js",
  "/",
  "/index.html",
  "/styles.css",
  "/ui-polish.css",
  "/interaction.css",
  "/select-sheet.js",
  "/transaction-board.js",
  "/nav-pins.js",
  "/holiday-data.js",
  "/privacy.js",
  "/calendar-editor-ui.js",
  "/app.js",
  "/account-scope.js",
  "/profile-menu.js",
  "/store.js",
  "/legacy-storage.js",
  "/finance.js",
  "/i18n.js",
  "/ui.js",
  "/appearance.js",
  "/connected.css",
  "/planning.css",
  "/experience.css",
  "/creative.css",
  "/workbench.css",
  "/workbench.js",
  "/workbench-ui.js",
  "/workbench-controller.js",
  "/drawing.js",
  "/floating-shell.css",
  "/floating-shell.js",
  "/planner.js",
  "/planner-ui.js",
  "/create-menu.js",
  "/planner-controller.js",
  "/planner.css",
  "/preferences.js",
  "/holidays.js",
  "/settings-ui.js",
  "/backup.js",
  "/pdf-store.js",
  "/update.js",
  "/assets.js",
  "/assets-ui.js",
  "/number-inputs.js",
  "/market-catalog.js",
  "/navigation.js",
  "/organizer.js",
  "/organizer-ui.js",
  "/calendar.js",
  "/date-picker.js",
  "/date-picker.css",
  "/planning.js",
  "/planning-ui.js",
  "/suggestions-ui.js",
  "/backtest.js",
  "/extension/shared/extract.js",
  "/connected-ui.js",
  "/connected-store.js",
  "/extension/shared/portfolio.js",
  "/extension/shared/view.js",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/fonts/vazir.woff2",
  "/fonts/vazir-bold.woff2",
  "/fonts/manrope.woff2",
  "/fonts/manrope-bold.woff2",
];
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  await self.skipWaiting();
})()));
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => (k.startsWith("damedast-shell-") || k.startsWith("poolo-shell-")) && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/hubs/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/signin-google") ||
    url.pathname === "/health"
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html")),
    );
    return;
  }
  if (!SHELL.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && !url.pathname.endsWith("/sw.js") && !url.pathname.endsWith("/update.js")) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  })());
});
const notificationSettingsCache = "damedast-notification-settings";
const notificationSettingsUrl = new URL("/__notification-preferences", self.location.origin).href;
self.addEventListener("message", event => {
  if (event.data?.type !== "notification-preferences" || !Array.isArray(event.data.kinds)) return;
  const known = ["reminders", "tasks", "installments", "goals", "checks"];
  const kinds = known.filter(kind => event.data.kinds.includes(kind));
  event.waitUntil(caches.open(notificationSettingsCache).then(cache => cache.put(notificationSettingsUrl, new Response(JSON.stringify(kinds)))));
});
async function showEnabledNotification(data) {
  try {
    const cache = await caches.open(notificationSettingsCache), saved = await cache.match(notificationSettingsUrl);
    const kinds = saved ? await saved.json() : null;
    const kind = data.tag?.startsWith("damdast-personal-") ? "reminders" : "installments";
    if (Array.isArray(kinds) && !kinds.includes(kind)) return;
  } catch {}
  return self.registration.showNotification(data.title, {
    body: data.body, lang: data.lang || "en", dir: data.dir === "rtl" ? "rtl" : "ltr",
    icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: data.tag,
    data: { url: ["/#connected", "/#organizer", "/#reminders"].includes(data.url) ? data.url : "/#installments" },
  });
}
self.addEventListener("push", (event) => {
  let data = {
    title: "DameDast",
    body: "Review your installments.",
    url: "/#installments",
    tag: "damedast-installments",
  };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(showEnabledNotification(data));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = ["/#connected", "/#organizer", "/#reminders"].includes(
    event.notification.data?.url,
  )
    ? event.notification.data.url
    : "/#installments";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const existing = clients.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (existing) {
          await existing.navigate(target);
          return existing.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});
