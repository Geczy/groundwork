import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone, not `mergeConfig(viteConfig, ...)`: constructing the tanstackRouter plugin
// rewrites the committed src/routeTree.gen.ts.
export default defineConfig({
  test: {
    // Three suites with nothing in common but the runner. `setupFiles` is per-project and not
    // per-file, so this split is what keeps `localStorage.clear()` out of a Node test.
    // Run one with `vitest --project build`.
    coverage: {
      include: ["src/**/*.{ts,tsx}", "build/**/*.ts"],
      provider: "v8",
      // Generated, vendored, or wiring that only a real browser exercises.
      exclude: [
        "src/routeTree.gen.ts",
        "src/lib/supabase/database-generated.types.ts",
        "src/lib/supabase/database-schema.generated.ts",
        "src/components/ui/**",
        "src/main.tsx",
        "src/test/**",
        "src/features/*/index.ts",
        "build/test/**",
        // lint/jotai.ts runs inside oxlint's process, not this one, so v8 instruments none of
        // it however thoroughly lint/jotai.test.ts drives it.
        "lint/**",
      ],
      // A floor against a feature landing untested, not a quality bar. Raise, never lower.
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    projects: [
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          environment: "jsdom",
          name: "app",
          setupFiles: ["./src/test/setup.ts"],
          // Node 25's stub `localStorage` shadows jsdom's, which vitest only installs when
          // the global is absent. Off, so jsdom's is the only one. See vitest-dev/vitest#8757.
          execArgv: ["--no-experimental-webstorage"],
          // A route test renders __root.tsx, and the devtools panels have no business in jsdom.
          env: { VITE_ENABLE_DEVTOOLS: "false" },
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          environment: "node",
          include: ["build/**/*.test.ts"],
          name: "build",
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          environment: "node",
          name: "lint",
          // Each case spawns the oxlint binary, so give them longer than the 5s default.
          include: ["lint/**/*.test.ts"],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
