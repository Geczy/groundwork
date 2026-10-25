import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Explicit `.ts` here and inside `build/`, unlike `src`: the config is loaded by Vite's own
// loader, whose `native` mode (a future default) does not resolve an extensionless import.
import { output } from "./build/output.ts";

export default defineConfig({
  build: {
    // `build/output.ts` prints the sizes instead; gzip is not what gets served.
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        // `[\\/]` rather than `/`: module ids use the platform separator.
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](?<packageName>react|react-dom|scheduler)[\\/]/u,
            },
            {
              name: "vendor-tanstack",
              test: /node_modules[\\/]@tanstack[\\/]/u,
            },
            // Catch-all last, so a new package lands here instead of in a route chunk.
            // Deliberately untagged: `tags: ['$initial']` would scope these groups to what
            // the entry reaches statically, moving every dependency a lazy route owns into
            // that route's chunk, which rehashes on any app change.
            { name: "vendor", test: /node_modules[\\/]/u },
          ],
        },
      },
    },
  },
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      routeFileIgnorePattern: String.raw`\.test\.tsx?$`,
      target: "react",
    }),
    react(),
    tailwindcss(),
    output(),
  ],
  resolve: {
    // `@/*` comes from tsconfig.json's `paths`, so there is one place to change it.
    tsconfigPaths: true,
  },
});
