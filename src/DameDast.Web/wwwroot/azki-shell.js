// Native details keep navigation usable with mouse, touch and keyboard.
document.addEventListener('click', event => {
  document.querySelectorAll('.azki-nav-menu[open]').forEach(menu => {
    if (!menu.contains(event.target) || event.target.closest('a')) menu.open = false;
  });
});
document.addEventListener('toggle', event => {
  if (!event.target.matches?.('.azki-nav-menu[open]')) return;
  document.querySelectorAll('.azki-nav-menu[open]').forEach(menu => {
    if (menu !== event.target) menu.open = false;
  });
}, true);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = document.querySelector('.azki-nav-menu[open]');
  if (menu) { menu.open = false; menu.querySelector('summary').focus(); }
});
