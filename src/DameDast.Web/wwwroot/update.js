(() => {
  if (!("serviceWorker" in navigator)) return;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing || !navigator.serviceWorker.controller) return;
    if (
      document.querySelector("dialog[open]")
    )
      return;
    const version = document.querySelector(
      'meta[name="damdast-version"]',
    )?.content;
    if (
      version &&
      sessionStorage.getItem("damdast-refreshed-version") !== version
    ) {
      refreshing = true;
      sessionStorage.setItem("damdast-refreshed-version", version);
      location.reload();
    }
  });
})();
