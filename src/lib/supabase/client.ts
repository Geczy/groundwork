import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as BaseSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Env } from "@/lib/env";

import { databaseSchema } from "./database.types";
import type { Database } from "./database.types";

export interface SupabaseConnection {
  publishableKey: string;
  url: string;
}
export type SupabaseClient = BaseSupabaseClient<
  Database,
  typeof databaseSchema
>;

export const readSupabaseConnection = function readSupabaseConnection(
  environment: Env
): SupabaseConnection | null {
  if (environment.VITE_SUPABASE_URL === "") {
    return null;
  }

  return {
    publishableKey: environment.VITE_SUPABASE_PUBLISHABLE_KEY,
    url: environment.VITE_SUPABASE_URL,
  };
};

export const createSupabaseAccessor = function createSupabaseAccessor<Client>(
  connection: SupabaseConnection | null,
  create: (connection: SupabaseConnection) => Client
): () => Client {
  let client: Client | undefined;

  return () => {
    if (connection === null) {
      throw new Error(
        "Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
      );
    }
    client ??= create(connection);
    return client;
  };
};

const createBrowserClient = function createBrowserClient(
  connection: SupabaseConnection
): SupabaseClient {
  return createClient<Database, typeof databaseSchema>(
    connection.url,
    connection.publishableKey,
    {
      db: { schema: databaseSchema },
    }
  );
};

export const getSupabase = createSupabaseAccessor(
  readSupabaseConnection(env),
  createBrowserClient
);
