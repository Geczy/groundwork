<h1>
  <img src="public/icon.svg" width="28" height="28" align="absmiddle" alt="groundwork mark">
  groundwork
</h1>

A React starter that makes architectural drift fail the build, built for teams shipping with
coding agents.

![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white) ![Vite 8](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white) ![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178c6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white) ![Bun 1.3](https://img.shields.io/badge/Bun-1.3-fbf0df?style=flat-square&logo=bun&logoColor=black) ![MIT license](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Most starters choose packages and leave the architecture as prose. Groundwork turns its important
decisions into executable rules: feature boundaries, state ownership, restricted imports, strict
types, duplication limits, coverage and the production build all feed one command. When an agent
breaks a convention, the failure explains the intended fix while the task is still in progress.

## Why Groundwork

|                         | Typical bare template | Typical stack starter  | Groundwork                   |
| ----------------------- | --------------------- | ---------------------- | ---------------------------- |
| Libraries               | Minimal               | Preinstalled           | Preinstalled and integrated  |
| Architecture            | You decide            | Usually documented     | Documented and lint-enforced |
| Agent context           | None                  | One instruction file   | Core rules plus topic skills |
| Feedback                | Type and lint errors  | General quality checks | Architecture-specific errors |
| Local and CI validation | Separate commands     | Varies                 | The same `bun run check`     |

The shorter feedback loop is the advantage. A rendering module that owns query invalidation, a
state module that imports transport code, or a feature that reaches into another feature's internals
fails with a message that names the correct layer. The same rules help a new engineer on their first
day.

## Quick start

Requires [Bun](https://bun.com). Bun manages packages and runs scripts; Vite remains the dev server
and bundler.

```sh
bun create 0dd431c8/groundwork my-app
cd my-app
bun run dev
```

Before pushing:

```sh
bun run check
```

That one command checks formatting, type-aware lint rules, copied code, strict TypeScript,
coverage-enforced tests and the production build. GitHub Actions runs the same command with the
same pinned Bun version.

## Built for coding agents

Coding agents are good at producing plausible code. Plausible is not the same as correct for a
particular codebase, so Groundwork gives them three kinds of feedback.

1. [`AGENTS.md`](AGENTS.md) contains the rules that apply to every task. `CLAUDE.md` points to the
   same file, so the guidance does not fork between tools.
2. Focused guides under `.agents/skills/` cover features, forms, styling, tests, configuration,
   lint rules, template maintenance and Jotai. An agent loads the relevant detail only when the
   work calls for it instead of carrying the entire handbook in every prompt.
3. oxlint enforces the rules that code can express. Its messages say why the import or dependency
   is wrong and where the behavior belongs. The local lint plugins have their own tests.

The guardrails are specific to this stack. Server data belongs to TanStack Query, shareable views
belong in the URL, and remaining browser state belongs to Jotai. `useEffect` and React Context are
restricted because they usually bypass that ownership model here; a justified escape hatch remains
available for the cases that need them.

## Architecture in one screen

Each feature owns its schema, state, transport, queries, components and public API. Dependencies
point one way:

```text
schema <- state <- api <- queries <- components <- index
```

Features expose an `index.ts` barrel and cannot import another feature's internals. Routes compose
those public APIs and own URL search state. Tests sit beside the code they cover.

The included todos feature is a worked example of the architecture. It shows the full chain with
file-based routes, loaders, mutations, a validated form and loading, error, empty, filtered and
not-found states. Delete the feature when starting a real project; the rest of the starter does not
depend on it.

## What ships

- React 19 and TypeScript 7 on [Vite 8](https://vite.dev), with file-based
  [TanStack Router](https://tanstack.com/router) routes and automatic code splitting.
- [TanStack Query](https://tanstack.com/query), [TanStack Form](https://tanstack.com/form),
  [Jotai](https://jotai.org) and [zod](https://zod.dev), each assigned a clear job.
- [Tailwind CSS v4](https://tailwindcss.com) and [shadcn](https://ui.shadcn.com) on Base UI, with a
  lint rule that catches hand-rolled interactive primitives.
- Type-aware [oxlint](https://oxc.rs) with React Compiler analysis, oxfmt, Vitest, Testing Library
  and 90% coverage thresholds across app and infrastructure code.
- Validated environment variables, a pre-commit hook, Renovate groups, image optimization, brotli
  precompression and bundle size reporting.

## Fit

Groundwork is a client-rendered SPA starter. It fits authenticated apps, internal tools and
dashboards that benefit from a strict frontend architecture without a server runtime. Bring your
own backend and authentication. Choose a server framework if you need SSR, server actions,
streaming or content that must be crawlable without JavaScript.

Read [`AGENTS.md`](AGENTS.md) before extending the starter. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow and [`SECURITY.md`](SECURITY.md)
for private vulnerability reports.

[MIT](LICENSE).
