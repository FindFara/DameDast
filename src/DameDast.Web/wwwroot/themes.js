export const themeOptions = [
  { id: "dark-green", label: "Dark & pastel green", mode: "dark", background: "#181f1d", accent: "#a7d5b6" },
  { id: "dark-blue", label: "Matte dark & blue", mode: "dark", background: "#151d29", accent: "#93b7df" },
  { id: "gray-yellow", label: "Gray & yellow", mode: "dark", background: "#252728", accent: "#e9cc66" },
  { id: "white-yellow", label: "White & pastel yellow", mode: "light", background: "#fafaf7", accent: "#f3dfa0" },
  { id: "white-green", label: "Matte white & green", mode: "light", background: "#f5f6f2", accent: "#b5d9bd" },
  { id: "dracula", label: "Dracula", mode: "dark", background: "#282a36", accent: "#bd93f9" },
  { id: "nord", label: "Nord", mode: "dark", background: "#2e3440", accent: "#88c0d0" },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha", mode: "dark", background: "#1e1e2e", accent: "#cba6f7" },
  { id: "tokyo-night", label: "Tokyo Night", mode: "dark", background: "#1a1b26", accent: "#7aa2f7" },
  { id: "gruvbox", label: "Gruvbox", mode: "dark", background: "#282828", accent: "#fabd2f" },
];
const legacyThemes = ["system", "light", "dark", "dark-brown"];
export const isTheme = value => themeOptions.some(theme => theme.id === value) || legacyThemes.includes(value);
export function resolveTheme(value, prefersDark = false) {
  const alias = value === "light" ? "white-green" : ["dark", "dark-brown"].includes(value) ? "dark-green" : value;
  return themeOptions.find(theme => theme.id === alias) || themeOptions.find(theme => theme.id === (prefersDark ? "dark-green" : "white-green"));
}
