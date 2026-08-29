import { describe, expect, it } from 'vitest';
import { createSupabaseAccessor } from './client';

describe('createSupabaseAccessor', () => {
  it('fails at the first database use when this reusable starter is not connected yet', () => {
    const getClient = createSupabaseAccessor(null, () => ({ state: 'connected' }));

    expect(getClient).toThrow(/VITE_SUPABASE_URL/u);
  });

  it('constructs lazily and reuses one browser client', () => {
    let nextIdentity = 0;
    const getClient = createSupabaseAccessor(
      { url: 'https://project.supabase.co', publishableKey: 'publishable-key' },
      (connection) => ({
        identity: ++nextIdentity,
        url: connection.url,
      }),
    );

    const first = getClient();
    const second = getClient();

    expect(first).toBe(second);
    expect(first).toEqual({ identity: 1, url: 'https://project.supabase.co' });
  });
});
