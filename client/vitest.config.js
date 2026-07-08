import { defineConfig } from "vitest/config";
import react            from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment:  "jsdom",
    globals:      true,
    setupFiles:   ["./src/__tests__/setup.js"],
    coverage: {
      reporter:  ["text", "json", "html"],
      include:   ["src/**/*.{js,jsx}"],
      exclude:   ["src/__tests__/**", "src/main.jsx"],
    },
  },
});