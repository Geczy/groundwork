import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import { createStore } from "jotai";
import type { ReactElement, ReactNode } from "react";

import { createAppRuntime, RuntimeApp, RuntimeScope } from "@/lib/runtime";
import type { AppRuntime, RuntimeStore } from "@/lib/runtime";

interface Providers {
  queryClient?: QueryClient | undefined;
  store?: RuntimeStore;
}

type Options = Omit<RenderOptions, "wrapper"> & Providers & { path?: string };

type Rendered = RenderResult & AppRuntime & { mutationErrors: Array<Error> };

const createTestRuntime = function createTestRuntime(
  path: string,
  providers: Providers
): RenderedRuntime {
  const mutationErrors: Array<Error> = [];
  const runtime = createAppRuntime({
    history: createMemoryHistory({ initialEntries: [path] }),
    mutationErrorReporter: (error) => {
      mutationErrors.push(error);
    },
    queryClient: providers.queryClient,
    queryRetry: false,
    store: providers.store,
  });
  return { mutationErrors, runtime };
};

interface RenderedRuntime {
  mutationErrors: Array<Error>;
  runtime: AppRuntime;
}

/**
 * Renders `ui` in the same provider stack as src/main.tsx, over a store, a QueryClient and a
 * router created per call. To start from a specific state, seed a store with `store.set(...)`
 * and pass it in:
 *
 *     const store = createStore();
 *     store.set(preferencesAtom, { density: 'compact' });
 *     renderWithProviders(<SettingsPanel />, { store });
 *
 * State the URL owns is not seeded here: it reaches a component as a prop, so a test passes it
 * directly. `path` only sets where the router thinks it is, for components that read the location.
 */
export const renderWithProviders = function renderWithProviders(
  ui: ReactElement,
  { path = "/", queryClient, store = createStore(), ...options }: Options = {}
): Rendered {
  const { mutationErrors, runtime } = createTestRuntime(path, {
    queryClient,
    store,
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <RuntimeScope runtime={runtime}>{children}</RuntimeScope>
  );

  return { ...runtime, mutationErrors, ...render(ui, { wrapper, ...options }) };
};

/**
 * Renders the app's real route tree at `path`, which is what a test needs when the thing under
 * test is the route itself: its `validateSearch`, its loader, or what a click does to the URL.
 * Everything else should name a component and use `renderWithProviders` above, which is faster
 * and says what it is testing.
 *
 *     const { router } = renderRoute('/settings?tab=profile');
 *     expect(router.state.location.searchStr).toBe('?tab=profile');
 */
export const renderRoute = function renderRoute(
  path: string,
  { queryClient, store = createStore() }: Providers = {}
): Rendered {
  const { mutationErrors, runtime } = createTestRuntime(path, {
    queryClient,
    store,
  });

  return {
    ...runtime,
    mutationErrors,
    ...render(<RuntimeApp runtime={runtime} />),
  };
};
