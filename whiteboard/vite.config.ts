import { defineConfig } from "vite";
export default defineConfig({
  base: "/whiteboard/",
  build: {
    outDir: "../src/Poolo.Web/wwwroot/whiteboard",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
