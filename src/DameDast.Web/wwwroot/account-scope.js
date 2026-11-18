let owner = "guest";

export function accountSpace(session) {
  return session?.authenticated === true && typeof session.userId === "string" && session.userId.trim()
    ? `google:${session.userId}` : "guest";
}
export function setAccountScope(session) { owner = accountSpace(session); }
export function scopedStorageKey(key) { return owner === "guest" ? key : `${key}:${owner}`; }
export function accountHeaders(session) {
  return accountSpace(session) === "guest" ? {} : { "X-DameDast-User": session.userId };
}
export function initialSpace(session, choice, restored, demoRequested = false) {
  if (demoRequested && session?.demoEnabled === true) return "demo";
  if (restored.some(workspace => workspace.scope === choice)) return choice;
  return accountSpace(session);
}
export function canOpenSpace(next, session, restored) {
  return next === accountSpace(session) ||
    (next === "demo" && session?.demoEnabled === true) || restored.some(workspace => workspace.scope === next);
}
