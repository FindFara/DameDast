// The library catalogue is not part of DameDast's canvas. Drawing shortcuts remain intact.
document.addEventListener("keydown", event => {
  const editable = event.target.closest?.("input, textarea, select, [contenteditable=true]");
  if (!editable && event.key === "0" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
