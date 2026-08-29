import { z } from 'zod';

// The only module that reads a VITE_ var off import.meta.env. Everything else imports `env`.
export const envSchema = z
  .object({
    // Defaults to DEV, so the devtools behave as they do today with no .env file.
    VITE_ENABLE_DEVTOOLS: z.stringbool().default(import.meta.env.DEV),
    // Empty together keeps a fresh clone runnable before its database exists.
    VITE_SUPABASE_URL: z.union([z.literal(''), z.httpUrl()]).default(''),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().default(''),
  })
  .superRefine((values, context) => {
    const hasUrl = values.VITE_SUPABASE_URL !== '';
    const hasKey = values.VITE_SUPABASE_PUBLISHABLE_KEY !== '';
    if (hasUrl === hasKey) return;

    context.addIssue({
      code: 'custom',
      message: 'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set together.',
      path: [hasUrl ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : 'VITE_SUPABASE_URL'],
    });
  });

export type Env = z.infer<typeof envSchema>;

// Bare import.meta.env rather than a key map: safeParse takes unknown, so no `any` leaks past
// the boundary and ImportMetaEnv needs no augmentation.
const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env: Env = parsed.data;
