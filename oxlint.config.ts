import nkzw from "@nkzw/oxlint-config";
import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

const ultraciteJsPlugins = selectJsPlugins([
  "github",
  "sonarjs",
  "react-doctor",
]);

export default defineConfig({
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    suspicious: "error",
    // `style` is off: oxfmt already owns nearly all of it. `restriction` is off as a
    // category because it bans `async`/`await`; its two useful rules are listed below.
  },
  env: {
    browser: true,
    es2024: true,
  },
  extends: [core, react, shadcn, antiSlop, ultraciteJsPlugins, nkzw],
  // Generated or vendored output, none of it hand-written and none of it hand-editable: a
  // `bunx shadcn add` rewrites src/components/ui wholesale, so a lint error there has no fix
  // that survives the next re-add. oxfmt.config.ts and the coverage config draw the same line.
  ignorePatterns: [
    "dist",
    "src/routeTree.gen.ts",
    "src/lib/supabase/database-generated.types.ts",
    "src/components/ui",
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".continue/**",
    ".cursor/**",
    ".gemini/**",
    ".opencode/**",
    ".pi/**",
    ".roo/**",
    ".windsurf/**",
    "tools/oxlint/anti-slop/**",
  ],
  // ESLint plugins, run through oxlint's JS bridge (alpha, not covered by semver). Names are
  // aliases, since `react`, `import`, `typescript` and the rest are reserved by the native Rust
  // plugins. Rules go in `rules` below by that alias; categories do not reach them.
  jsPlugins: [
    ...ultraciteJsPlugins.jsPlugins,
    ...shadcn.jsPlugins,
    { name: "query", specifier: "@tanstack/eslint-plugin-query" },
    { name: "router", specifier: "@tanstack/eslint-plugin-router" },
    // Local, because nothing published lints Jotai. See lint/jotai.ts.
    { name: "jotai", specifier: "./lint/jotai.ts" },
    // Local for a different reason: eslint-plugin-sonarjs supplies no-identical-functions and
    // cannot load here, because it pulls in ts-api-utils, which reads `ts.TypeFlags` at module
    // scope and TypeScript 7 does not have one. See lint/dry.ts.
    { name: "dry", specifier: "./lint/dry.ts" },
    // Local because the shape of the rule is local: what counts as a raw element depends on
    // what src/components/ui holds. See lint/ui.ts.
    { name: "ui", specifier: "./lint/ui.ts" },
    // Local because feature roles and their dependency direction belong to this starter.
    { name: "feature", specifier: "./lint/feature.ts" },
    // Neither name is reserved, so these two need no alias. Testing Library is in oxlint's
    // JS-plugin conformance suite (17,016 cases, all passing), so the bridge is not the risk
    // here that its alpha label suggests.
    "eslint-plugin-testing-library",
    "eslint-plugin-jest-dom",
  ],
  options: {
    // Runs the type-aware rules below against the real TypeScript program, which is the
    // only tier that sees across a call boundary. Requires TypeScript 7.
    typeAware: true,
  },
  overrides: [
    {
      // The git hook is a CLI: printing is how it reports, and it exits on the awaited
      // result, so `return await` is the correct form.
      files: [".githooks/**/*.ts"],
      rules: {
        "no-console": "off",
        "typescript/return-await": "off",
      },
    },
    {
      files: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**/*",
        "build/**/*.test.ts",
        "lint/**/*.test.ts",
        "lint/test/**/*",
      ],
      rules: {
        // Two cases that set up identically and assert differently are two cases, not one
        // copy. Extracting the shared half into a helper is what makes a failing test say
        // less about what it was doing.
        "dry/no-identical-functions": "off",
        "max-lines": "off",
        "max-lines-per-function": "off",
        // Test helpers stay next to the cases that use them.
        "unicorn/consistent-function-scoping": "off",
      },
    },
    {
      // Testing Library and jest-dom, scoped to where tests live so they never look at
      // `build/` or `lint/`. Both plugins' own presets are unreachable from here, so this is
      // eslint-plugin-testing-library's `flat/react` config and jest-dom's `recommended`
      // written out by hand. `no-debugging-utils` is an error rather than the preset's warn:
      // a stray `screen.debug()` should fail CI, not scroll past in it.
      files: ["src/**/*.test.{ts,tsx}", "src/test/**/*"],
      rules: {
        "jest-dom/prefer-checked": "error",
        "jest-dom/prefer-empty": "error",
        "jest-dom/prefer-enabled-disabled": "error",
        "jest-dom/prefer-focus": "error",
        "jest-dom/prefer-in-document": "error",
        "jest-dom/prefer-required": "error",
        "jest-dom/prefer-to-have-attribute": "error",
        "jest-dom/prefer-to-have-class": "error",
        "jest-dom/prefer-to-have-style": "error",
        "jest-dom/prefer-to-have-text-content": "error",
        "jest-dom/prefer-to-have-value": "error",
        "testing-library/await-async-events": [
          "error",
          { eventModule: "userEvent" },
        ],
        "testing-library/await-async-queries": "error",
        "testing-library/await-async-utils": "error",
        "testing-library/no-await-sync-events": [
          "error",
          { eventModules: ["fire-event"] },
        ],
        "testing-library/no-await-sync-queries": "error",
        "testing-library/no-container": "error",
        "testing-library/no-debugging-utils": "error",
        "testing-library/no-dom-import": ["error", "react"],
        "testing-library/no-global-regexp-flag-in-query": "error",
        "testing-library/no-manual-cleanup": "error",
        "testing-library/no-node-access": "error",

        "testing-library/no-promise-in-fire-event": "error",
        "testing-library/no-render-in-lifecycle": "error",
        "testing-library/no-unnecessary-act": "error",
        "testing-library/no-wait-for-multiple-assertions": "error",
        "testing-library/no-wait-for-side-effects": "error",
        "testing-library/no-wait-for-snapshot": "error",
        "testing-library/prefer-find-by": "error",
        "testing-library/prefer-presence-queries": "error",
        "testing-library/prefer-query-by-disappearance": "error",
        "testing-library/prefer-screen-queries": "error",
        "testing-library/render-result-naming-convention": "error",
      },
    },
    {
      // A file-based route module has to export `Route`, and the component it names lives
      // beside it. Fast Refresh loses that module either way; the router owns its shape.
      files: ["src/routes/**"],
      rules: {
        // Route modules read more naturally with the route declaration first. The callbacks
        // run only after module initialization, so these component references are not a
        // temporal-dead-zone hazard.
        "no-use-before-define": "off",
        // Route modules export a router descriptor alongside private page components. The
        // router owns reload boundaries, so Fast Refresh cannot preserve local state here.
        "react-doctor/only-export-components": "off",
        "react/only-export-components": "off",
      },
    },
    {
      // This runtime module intentionally exports its factory and its provider components as
      // one cohesive assembly boundary; splitting it would add a shallow, unstable seam.
      files: ["src/lib/runtime.tsx"],
      rules: {
        "react-doctor/only-export-components": "off",
      },
    },
    {
      // ESTree visitor properties must use the parser's exact PascalCase node-kind names.
      // Those names are not application identifiers, so Sonar's naming convention is not
      // applicable to local lint-plugin implementations.
      files: ["lint/**/*.ts"],
      rules: {
        // The test harness composes its helpers declaratively. Calls occur after the module
        // has initialized, so their source order cannot create a temporal-dead-zone access.
        "no-use-before-define": "off",
        "sonarjs/function-name": "off",
      },
    },
    {
      // The deep runtime module deliberately owns construction and provider order together.
      // Splitting its providers out would recreate the shallow seam this module removes.
      files: ["src/lib/runtime.tsx"],
      rules: {
        "react/only-export-components": "off",
      },
    },
    {
      // zod's `.catch()` supplies a fallback value and has nothing to do with a promise.
      files: ["src/features/*/*.schema.ts"],
      rules: {
        "unicorn/prefer-top-level-await": "off",
      },
    },
  ],
  plugins: [
    "typescript",
    "react",
    "import",
    "unicorn",
    "oxc",
    "promise",
    "jsx-a11y",
    "vitest",
    "node",
    "react-perf",
  ],
  rules: {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",

    complexity: ["error", 15],

    // Duplication is the half of DRY a linter can decide. This one is exact and within a
    // single file, which is the copy most likely to drift and the cheapest to catch. Across
    // files is `bun run dupes`. Neither sees a component rewritten to do what an existing one
    // already does, so that half stays a review question.
    "dry/no-identical-functions": "error",

    "feature/dependency-direction": "error",

    "import/no-cycle": "error",
    // The CSS and jest-dom side-effect imports are correct code.
    "import/no-unassigned-import": "off",

    // The three Jotai practices no config-level rule can express. Like the plugins above,
    // categories do not reach these, so each one is named here.
    "jotai/atom-suffix": "error",
    "jotai/no-atom-in-render": "error",
    "jotai/prefer-narrow-hook": "error",

    "max-lines": [
      "error",
      { max: 400, skipBlankLines: true, skipComments: true },
    ],
    "max-lines-per-function": [
      "error",
      { IIFEs: true, max: 40, skipBlankLines: true, skipComments: true },
    ],

    "no-console": "error",
    // Named imports only: `import React from 'react'` then `React.forwardRef` slips through.
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            importNames: ["useEffect"],
            message:
              "useEffect is banned. Derive state, use event handlers, or - if truly unavoidable - add `// oxlint-disable-next-line no-restricted-imports` on the import with a justification comment.",
            name: "react",
          },
          {
            importNames: ["forwardRef"],
            message:
              "React 19 passes `ref` as an ordinary prop, so forwardRef is dead weight. Declare `ref` in the props type instead.",
            name: "react",
          },
          {
            importNames: ["createContext", "useContext"],
            message:
              "Context is not the sharing mechanism here: Jotai owns client state and React Query owns server state. If a value genuinely has to be injected per subtree, add `// oxlint-disable-next-line no-restricted-imports` with a justification comment.",
            name: "react",
          },
          {
            importNames: ["getDefaultStore"],
            message:
              "src/lib/runtime.tsx owns an explicit store and passes it to `<Provider>`. The default store silently bypasses it, so reads and writes land in a store nothing rendered against and tests stop being isolated.",
            name: "jotai",
          },
        ],
        patterns: [
          {
            group: ["@/features/*/*"],
            message:
              "Import a feature through its index (`@/features/<name>`), not its internals. Inside a feature, import relatively (`./<feature>.state`).",
          },
        ],
      },
    ],

    // The queryKey has to name everything the queryFn closes over, or two different fetches
    // share a cache entry. `prefer-query-options` is not in the plugin's recommended set; it
    // enforces the `queryOptions` in `<feature>.queries.ts` convention. `no-void-query-fn` is
    // left out because it needs type information the JS bridge does not hand over.
    "query/exhaustive-deps": "error",
    "query/infinite-query-property-order": "error",
    "query/mutation-property-order": "error",
    "query/no-rest-destructuring": "error",
    "query/no-unstable-deps": "error",
    "query/prefer-query-options": "error",
    "query/stable-query-client": "error",

    // The other three react-perf rules are hoist-a-constant fixes. This one's only remedy is
    // useCallback in every component that passes a handler, which buys nothing while the
    // child is not memoised.
    "react-perf/jsx-no-new-function-as-prop": "off",

    // `restriction` rules, so not reached by the categories: this one, react/no-clone-element,
    // react/no-danger and react/prefer-function-component. All four are React 19 house style
    // with nothing in `src` violating them today.
    "react/button-has-type": "error",
    // Unless noted otherwise, the react/ rules from here to react/void-use-memo run the React
    // Compiler's own analysis in lint-only mode, which is the only tier that sees the Rules of
    // React rather than just the Rules of Hooks: setState during render or synchronously in an
    // effect, reading a ref during render, mutating props, state or a value returned from a
    // hook, calling an impure function during render, defining a component inside another
    // component's render, and state derived in an effect that belongs in render. `nursery`, so
    // they are not reached by the categories above and an oxlint minor can change what they
    // report; that is the price of the only rules here that understand what React actually
    // guarantees.
    "react/capitalized-calls": "error",
    "react/error-boundaries": "error",
    "react/exhaustive-effect-dependencies": "error",
    "react/globals": "error",
    "react/hooks": "error",
    "react/immutability": "error",
    "react/incompatible-library": "error",
    "react/invariant": "error",
    "react/memo-dependencies": "error",
    // `restriction`, like react/button-has-type.
    "react/no-clone-element": "error",
    // `restriction`, like react/button-has-type.
    "react/no-danger": "error",
    "react/no-deriving-state-in-effects": "error",
    // Fast Refresh only reloads a module that exports components and nothing else. Off for
    // `src/routes` above; `allowExportNames` does not help there, because it exempts the
    // export without exempting the local component beside it.
    "react/only-export-components": "error",
    // `restriction`, like react/button-has-type.
    "react/prefer-function-component": "error",
    "react/preserve-manual-memoization": "error",
    "react/purity": "error",
    // Wrong under the automatic JSX runtime.
    "react/react-in-jsx-scope": "off",
    "react/refs": "error",
    "react/rule-suppression": "error",
    "react/set-state-in-effect": "error",
    "react/set-state-in-render": "error",
    "react/static-components": "error",
    "react/syntax": "error",
    "react/todo": "error",
    "react/unsupported-syntax": "error",
    "react/use-memo": "error",
    "react/void-use-memo": "error",

    "router/create-route-property-order": "error",
    "router/route-param-names": "error",

    // Under `exactOptionalPropertyTypes`, `prop?: T | undefined` is not redundant: the
    // `| undefined` is what lets a caller pass `undefined` explicitly. The rule skips itself
    // when it can read that compiler option, but the JS bridge hands it no TypeScript program.
    "sonarjs/no-redundant-optional": "off",

    "typescript/await-thenable": "error",
    // `@ts-ignore` silences an error and forgets it; `@ts-expect-error` fails once the
    // underlying problem is fixed, and the description says what it was.
    "typescript/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
      },
    ],
    // An inferred return type that is subtly wrong fails at the boundary, not downstream.
    "typescript/explicit-module-boundary-types": "error",
    "typescript/no-array-delete": "error",
    // Without the option, `onClick={() => step(-1)}` needs a braced body just because
    // `step` returns void. The rest of the rule stays on.
    "typescript/no-confusing-void-expression": [
      "error",
      { ignoreArrowShorthand: true },
    ],
    // Flags a React, TanStack or Jotai API the moment upstream deprecates it, so a version
    // bump surfaces the migration here rather than in a changelog nobody read.
    "typescript/no-deprecated": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-unnecessary-condition": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        ignoreRestSiblings: true,
        varsIgnorePattern: "^_",
      },
    ],
    // TanStack Router signals a redirect and a 404 by throwing a plain object rather than an
    // Error, which is how a loader stops without the caller having to check a return value. The
    // rule cannot know those two are control flow, so name them; everything else still has to be
    // a real Error.
    "typescript/only-throw-error": [
      "error",
      {
        allow: [
          {
            from: "package",
            name: ["Redirect", "NotFoundError"],
            package: "@tanstack/router-core",
          },
        ],
      },
    ],
    "typescript/prefer-nullish-coalescing": "error",
    "typescript/prefer-promise-reject-errors": "error",
    // Wants `readonly` on every object parameter, React props included.
    "typescript/prefer-readonly-parameter-types": "off",
    "typescript/require-await": "error",
    "typescript/restrict-template-expressions": "error",
    "typescript/switch-exhaustiveness-check": "error",

    // Design system rule, in lint/ui.ts rather than react/forbid-elements: a list of banned
    // elements is right only until src/components/ui grows a component nobody remembered to
    // ban the element for. This one allows structure and rejects the rest, so a
    // `bunx shadcn add textarea` needs no edit here, and a raw control fails on the day it is
    // written whether or not its component exists yet. src/components/ui is in ignorePatterns
    // above, so the primitives themselves are exempt.
    "ui/no-raw-element": "error",

    // Not reached by the categories above. The first is what makes `globals: false` in
    // vitest.config.ts an error rather than a runtime surprise.
    "vitest/no-identical-title": "error",
    "vitest/prefer-importing-vitest-globals": "error",
  },
});
