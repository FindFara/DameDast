const defaults = {
  view: "grid",
  linkPreviews: true,
  completedBottom: true,
  newItemPosition: "bottom",
};
export const noteSettingsKey = (space) => `damedast-keep:${space}`;
export function readNoteSettings(space) {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(noteSettingsKey(space)) || "{}")
        .preferences,
    };
  } catch {
    return { ...defaults };
  }
}
export function saveNoteSettings(space, change) {
  const stored = JSON.parse(
    localStorage.getItem(noteSettingsKey(space)) || "{}",
  );
  const preferences = { ...defaults, ...stored.preferences, ...change };
  if (
    !["grid", "list"].includes(preferences.view) ||
    typeof preferences.linkPreviews !== "boolean"
  )
    throw Error("Invalid note settings.");
  localStorage.setItem(
    noteSettingsKey(space),
    JSON.stringify({ ...stored, preferences }),
  );
  return preferences;
}
