// Keep the canvas library catalogue out of the app, including its shortcut.
document.addEventListener("keydown", (event: KeyboardEvent) => {
  const target = event.target instanceof Element ? event.target : null;
  const editable = target?.closest("input, textarea, select, [contenteditable=true]");
  if (!editable && event.key === "0" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
