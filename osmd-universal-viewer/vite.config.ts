import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["opensheetmusicdisplay", "vexflow", "jszip", "soundfont-player", "standardized-audio-context"],
  },
  server: {
    port: 5174,
  },
});
