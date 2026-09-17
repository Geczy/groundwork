import { afterEach, describe, expect, it, vi } from "vitest";

import { envSchema } from "./env";

describe("envSchema", () => {
  it("falls back to DEV when the variable is absent", () => {
    expect(envSchema.parse({}).VITE_ENABLE_DEVTOOLS).toBe(import.meta.env.DEV);
  });

  it("reads the boolish spellings, case-insensitively", () => {
    const parse = (raw: string): boolean =>
      envSchema.parse({ VITE_ENABLE_DEVTOOLS: raw }).VITE_ENABLE_DEVTOOLS;

    expect(["true", "1", "yes", "ON"].map((raw) => parse(raw))).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(["false", "0", "no", "OFF"].map((raw) => parse(raw))).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("rejects a value that is neither", () => {
    expect(envSchema.safeParse({ VITE_ENABLE_DEVTOOLS: "maybe" }).success).toBe(
      false
    );
  });

  it("ignores the keys Vite adds, so they stay off env", () => {
    expect(envSchema.parse({ BASE_URL: "/", MODE: "test" })).not.toHaveProperty(
      "MODE"
    );
  });

  it("allows Supabase to remain disconnected in the reusable starter", () => {
    const parsed = envSchema.parse({});

    expect(parsed.VITE_SUPABASE_URL).toBe("");
    expect(parsed.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("");
  });

  it("requires the Supabase URL and publishable key as a pair", () => {
    expect(
      envSchema.safeParse({ VITE_SUPABASE_URL: "https://project.supabase.co" })
        .success
    ).toBe(false);
    expect(
      envSchema.safeParse({ VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key" })
        .success
    ).toBe(false);
  });

  it("accepts a complete public Supabase connection", () => {
    expect(
      envSchema.parse({
        VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        VITE_SUPABASE_URL: "https://project.supabase.co",
      })
    ).toMatchObject({
      VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      VITE_SUPABASE_URL: "https://project.supabase.co",
    });
  });
});

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws on import and names the offending variable", async () => {
    vi.stubEnv("VITE_ENABLE_DEVTOOLS", "maybe");
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow(/VITE_ENABLE_DEVTOOLS/u);
  });
});
