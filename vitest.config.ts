import { defineConfig } from "vitest/config";

// Dedicated test config so Vitest does not load the editor's dev-server plugin
// (vite.config.ts). Unit tests cover the pure IR/codegen layer under src/.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
