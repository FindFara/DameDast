import { defineConfig } from "vite";
export default defineConfig({
  base: "/whiteboard/",
  build: {
    outDir: "../src/DameDast.Web/wwwroot/whiteboard",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
