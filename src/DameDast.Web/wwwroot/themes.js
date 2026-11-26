export const themeOptions = [
  { id: "system", label: "System" },
  { id: "light", label: "Light", mode: "light", background: "#e8ede8" },
  { id: "dark", label: "Dark", mode: "dark", background: "#1b2426" },
  { id: "dark-brown", label: "Dark brown", mode: "dark", background: "#1f1a17" },
  { id: "dark-blue", label: "Matte dark blue", mode: "dark", background: "#151d29" },
  { id: "gray-yellow", label: "Gray & yellow", mode: "dark", background: "#252728" },
  { id: "white-yellow", label: "White & yellow", mode: "light", background: "#fafaf7" },
];
export const isTheme = value => themeOptions.some(theme => theme.id === value);
export function resolveTheme(value, prefersDark = false) {
  const selected = themeOptions.find(theme => theme.id === value);
  return !selected || selected.id === "system"
    ? themeOptions.find(theme => theme.id === (prefersDark ? "dark" : "light"))
    : selected;
}
