// Count screen entries, not rerenders. Telemetry never blocks navigation or edits.
export function createPageViewTracker(send = (page, csrf) => fetch("/api/analytics/page-view", {
  method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf },
  body: JSON.stringify({ page }), credentials: "same-origin", keepalive: true,
})) {
  let previous = null;
  return (page, csrf) => {
    if (previous === page || !csrf) return;
    previous = page;
    try { Promise.resolve(send(page, csrf)).catch(() => {}); } catch { /* best effort */ }
  };
}
