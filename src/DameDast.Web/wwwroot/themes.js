export const themeOptions = [
  { id: "dark-green", label: "Dark & pastel green", mode: "dark", background: "#181f1d", accent: "#a7d5b6" },
  { id: "dark-blue", label: "Matte dark & blue", mode: "dark", background: "#151d29", accent: "#93b7df" },
  { id: "gray-yellow", label: "Gray & yellow", mode: "dark", background: "#252728", accent: "#e9cc66" },
  { id: "white-yellow", label: "White & pastel yellow", mode: "light", background: "#fafaf7", accent: "#f3dfa0" },
  { id: "white-green", label: "Matte white & green", mode: "light", background: "#f5f6f2", accent: "#b5d9bd" },
];
const legacyThemes = ["system", "light", "dark", "dark-brown"];
export const isTheme = value => themeOptions.some(theme => theme.id === value) || legacyThemes.includes(value);
export function resolveTheme(value, prefersDark = false) {
  const alias = value === "light" ? "white-green" : ["dark", "dark-brown"].includes(value) ? "dark-green" : value;
  return themeOptions.find(theme => theme.id === alias) || themeOptions.find(theme => theme.id === (prefersDark ? "dark-green" : "white-green"));
}
