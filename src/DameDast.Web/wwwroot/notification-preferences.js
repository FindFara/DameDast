export const notificationOptions = [
  ['reminders', 'Personal reminders'], ['tasks', 'Dated tasks'],
  ['installments', 'Installments'], ['goals', 'Savings goals'], ['checks', 'Financial checks'],
];
export const defaultNotificationKinds = () => notificationOptions.map(([id]) => id);
export const normalizeNotificationKinds = value => Array.isArray(value)
  ? defaultNotificationKinds().filter(id => value.includes(id)) : defaultNotificationKinds();
export function enabledNotificationReport(report, enabled) {
  const groups = { reminder:'reminders', note:'reminders', task:'tasks', installment:'installments', goal:'goals', check:'checks' };
  const allowed = new Set(normalizeNotificationKinds(enabled));
  const notifications = report.notifications.filter(item => allowed.has(groups[item.kind]));
  return { ...report, notifications, unread: notifications.filter(item => !item.read).length };
}
