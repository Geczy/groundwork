import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "./render";

describe("renderWithProviders", () => {
  it("reports mutation errors through the test adapter", async () => {
    const { mutationErrors, queryClient } = renderWithProviders(<p>ready</p>);
    const error = new Error("offline");

    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: vi
        .fn<(input: null) => Promise<never>>()
        .mockRejectedValue(error),
      retry: false,
    });

    await expect(mutation.execute(null)).rejects.toThrow("offline");

    expect(mutationErrors).toEqual([error]);
  });
});
