import { describe, expect, it, vi } from "vitest";

import { createAppRuntime } from "./runtime";

describe("createAppRuntime", () => {
  it("holds server data long enough that a second visit does not refetch", () => {
    const runtime = createAppRuntime();

    expect(runtime.queryClient.getDefaultOptions().queries?.staleTime).toBe(
      30_000
    );
  });

  it("reports a failed mutation through its reporter adapter", async () => {
    const reportError = vi.fn<(error: Error) => void>();
    const runtime = createAppRuntime({ mutationErrorReporter: reportError });
    const mutation = runtime.queryClient
      .getMutationCache()
      .build(runtime.queryClient, {
        mutationFn: async (title: string) => {
          throw new Error(`Could not save ${title}.`);
        },
        retry: false,
      });

    await expect(mutation.execute("Ship it")).rejects.toThrow(
      "Could not save Ship it."
    );

    expect(reportError).toHaveBeenCalledExactlyOnceWith(
      new Error("Could not save Ship it.")
    );
  });
});
