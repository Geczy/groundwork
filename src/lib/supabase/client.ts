import { createClient, type SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import { env, type Env } from '@/lib/env';
import { databaseSchema, type Database } from './database.types';

export type SupabaseConnection = { url: string; publishableKey: string };
export type SupabaseClient = BaseSupabaseClient<Database, typeof databaseSchema>;

export function readSupabaseConnection(environment: Env): SupabaseConnection | null {
  if (environment.VITE_SUPABASE_URL === '') return null;

  return {
    url: environment.VITE_SUPABASE_URL,
    publishableKey: environment.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function createSupabaseAccessor<Client>(
  connection: SupabaseConnection | null,
  create: (connection: SupabaseConnection) => Client,
): () => Client {
  let client: Client | undefined;

  return () => {
    if (connection === null) {
      throw new Error(
        'Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
      );
    }
    client ??= create(connection);
    return client;
  };
}

function createBrowserClient(connection: SupabaseConnection): SupabaseClient {
  return createClient<Database, typeof databaseSchema>(connection.url, connection.publishableKey, {
    db: { schema: databaseSchema },
  });
}

export const getSupabase = createSupabaseAccessor(readSupabaseConnection(env), createBrowserClient);
