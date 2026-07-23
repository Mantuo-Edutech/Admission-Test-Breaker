import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "supabase-browser",
              test: /node_modules\/(?:\.pnpm\/)?@supabase/u,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/app/test-setup.ts"],
    testTimeout: 30_000,
  },
});
