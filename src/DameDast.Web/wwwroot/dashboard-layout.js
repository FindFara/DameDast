export const dashboardSections = [
  { id: "summary", title: "Financial summary", icon: "accounts", wide: true },
  { id: "week", title: "This week", icon: "calendar", wide: true },
  { id: "pinned", title: "Pinned items", icon: "pin", wide: true },
  { id: "market", title: "Live prices", icon: "market", wide: true },
  { id: "cashflow", title: "Cash flow", icon: "reports" },
  { id: "breakdown", title: "Spending breakdown", icon: "budgets" },
  { id: "transactions", title: "Recent transactions", icon: "transactions" },
  { id: "budgets", title: "Budgets", icon: "budgets" },
];
export const defaultDashboardLayout = () => dashboardSections.map(({ id }) => ({ id, visible: true }));

// Old backups and future section additions keep the user's known order.
export function normalizeDashboardLayout(value) {
  const rows = [], seen = new Set();
  for (const item of Array.isArray(value) ? value : []) {
    if (!item || seen.has(item.id) || !dashboardSections.some(section => section.id === item.id)) continue;
    rows.push({ id: item.id, visible: item.visible !== false });
    seen.add(item.id);
  }
  return [...rows, ...defaultDashboardLayout().filter(item => !seen.has(item.id))];
}
export function moveDashboardSection(value, id, direction) {
  const rows = normalizeDashboardLayout(value), index = rows.findIndex(item => item.id === id);
  const target = index + direction;
  if (![-1, 1].includes(direction) || index < 0 || target < 0 || target >= rows.length) return rows;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  return rows;
}
export function toggleDashboardSection(value, id, visible) {
  return normalizeDashboardLayout(value).map(item => item.id === id ? { ...item, visible: !!visible } : item);
}
export function renderDashboardLayout(value, renderers) {
  const output = [], pair = [];
  const flush = () => {
    if (!pair.length) return;
    output.push(`<div class="content-grid${pair.length === 1 ? ' dashboard-single' : ''}">${pair.splice(0).join('')}</div>`);
  };
  for (const item of normalizeDashboardLayout(value)) {
    if (!item.visible) continue;
    const content = renderers[item.id]?.();
    if (!content) continue;
    const block = `<div class="dashboard-block" data-dashboard-section="${item.id}">${content}</div>`;
    if (dashboardSections.find(section => section.id === item.id).wide) { flush(); output.push(block); }
    else { pair.push(block); if (pair.length === 2) flush(); }
  }
  flush();
  return output.length ? `<div class="dashboard-layout">${output.join('')}</div>` : '';
}
