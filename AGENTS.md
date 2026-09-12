# React boilerplate

This is a production-shaped React 19 and Vite starter using Bun, TanStack Router and Query, Jotai,
Tailwind, shadcn, zod, Vitest, Oxlint, and Oxfmt. Repository constraints are enforced by
`oxlint.config.ts` and `tsconfig.json`.

## Load only the relevant guide

| Task                                                          | Guide                                         |
| ------------------------------------------------------------- | --------------------------------------------- |
| Feature or route behavior                                     | `.agents/skills/feature-development/SKILL.md` |
| TanStack Form work                                            | `.agents/skills/forms/SKILL.md`               |
| JSX, styling, shadcn, or accessibility                        | `.agents/skills/styling-and-ui/SKILL.md`      |
| Tests or coverage                                             | `.agents/skills/testing/SKILL.md`             |
| Environment configuration                                     | `.agents/skills/configuration/SKILL.md`       |
| Oxlint configuration or local lint plugins                    | `.agents/skills/lint-rules/SKILL.md`          |
| Supabase setup, RLS, migrations, or types                     | `.agents/skills/supabase/SKILL.md`            |
| Jotai state modeling                                          | `.agents/skills/jotai/SKILL.md`               |
| Starter identity, CI, hooks, Bun, Renovate, or skill plumbing | `.agents/skills/template-setup/SKILL.md`      |

Read only the guide or supporting references whose topic is present in the task. A copy change,
documentation edit, or narrow bug fix does not require a full repository map.

## Universal constraints

- Bun is the package manager and script runner. Use `bun install`, `bun run <script>`, and
  `bunx <package>`.
- Feature dependencies point `schema <- state <- api <- queries <- components <- index`; detailed
  ownership and state rules live in the feature guide.
- Generated files such as `src/routeTree.gen.ts`, `src/components/ui/`, and generated Supabase
  types are not hand-edited.
- Reuse existing components and helpers before introducing a second implementation.
- Do not weaken lint rules, strict TypeScript, duplication limits, or the 90% coverage floor to make
  a check pass.
- Database operations and deployment are separate operator actions, never implied by a code task.

## Verification and completion

Local commands and tests are safe to run, fix, and rerun without asking at each step. Run focused
checks while iterating. For source or configuration changes, `bun run check` is the completion
gate; documentation-only changes need a reviewed, well-formed diff rather than the unrelated
application suite.

The task is done when the requested starter behavior or documentation is present, relevant checks
pass, generated artifacts are consistent, and the final diff contains no unrelated edits.
