---
name: supabase
description: Add or change this starter's Supabase client, dedicated app schema, migrations, RLS, local stack, self-hosted maintenance scripts, or generated database types.
---

# Supabase

This starter is disconnected by default but is shaped for one dedicated Postgres schema on a
shared or local Supabase instance.

## First hookup

1. Run `bun run supabase:configure -- <app_schema>` before real generated types exist. The schema
   must be one lowercase Postgres identifier and should be treated as immutable after hookup.
2. Copy `.env.example` to `.env.local` and set both public browser values. A publishable key or a
   legacy anon key is acceptable. Never put a secret/service-role key in any `VITE_*` variable.
3. For local work, run `bun run db:start:local`, `bun run db:reset:local`, then
   `bun run gen:types:local`.
4. For the shared self-hosted stack, create the schema and expose it through PostgREST as one
   coordinated operation. Apply only named migrations with `bun run db:migrate -- <file.sql>`,
   verify the live objects, then run `bun run gen:types:self-hosted`.

The first `bun run db:start:local` can reach PostgREST before the configured app schema exists.
When that specific startup error occurs, the wrapper starts Postgres alone, resets it through the
checked-in migrations, and retries the full stack. Other startup failures still stop immediately.

The shared scripts check local Docker first, including a current-user Docker-group fallback, and
use SSH only when the configured host is genuinely remote. Do not hardcode a new container name or
host into a caller; use the documented `SUPABASE_*` overrides.

## Database rules

- Application tables and RPCs belong in the schema named by `supabase/project.env`, never
  `public`. Keep `auth`, `storage`, `extensions`, and other Supabase-owned schemas qualified.
- Every Data API table gets RLS before grants to `anon` or `authenticated`. `TO authenticated`
  alone is not authorization; add the actual ownership or membership predicate.
- An update policy needs both `USING` and `WITH CHECK`, and updating rows also requires a select
  policy.
- Prefer security-invoker functions. If security-definer is unavoidable, keep it tightly scoped,
  set an empty search path, validate `auth.uid()` inside it, and revoke default public execute.
- Grant app roles per object in the migration that introduces the object. The bootstrap migration
  deliberately creates no broad anonymous defaults.
- A real multi-user app adds an app-specific local tenancy command. Use the public client as two
  disposable users to prove the second user cannot read, update, or delete the first user's rows;
  include private Storage and ownership-transfer flows when the app has them. Keep this outside
  `bun run check` because it requires the local containers, and remove all fixtures afterward.

## Generated types

`src/lib/supabase/database-generated.types.ts` is generated and must never be hand-edited.
`scripts/gen-types.sh` stages output beside the destination, verifies both `export type Database`
and the configured schema key, formats it, sets mode `0644`, then replaces the tracked file
atomically. A generator error must leave the previous file intact.

Application code imports `getSupabase` and helper types only through `@/lib/supabase`. The client
is lazy so a fresh clone runs without credentials, and every query defaults to the dedicated app
schema.

## Deployment

Vite variables are public build-time values. For the checked-in Dockerfile, pass
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ENABLE_DEVTOOLS=false` as Docker
build arguments in Dokploy. The static Caddy container listens on port `80`; Cloudflare Flexible
domains use `https=false` and `certificateType=none` at the origin.
