import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  createRouter,
  RouterContextProvider,
  RouterProvider,
} from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";
import { createStore, Provider } from "jotai";
import type { JSX, ReactNode } from "react";

import {
  NotFound,
  RouteError,
  RoutePending,
} from "@/components/route-fallbacks";
import { routeTree } from "@/routeTree.gen";

import { notifyError } from "./notify";

export interface RuntimeContext {
  queryClient: QueryClient;
}
export type RuntimeStore = ReturnType<typeof createStore>;

interface RuntimeOptions {
  history?: RouterHistory | undefined;
  mutationErrorReporter?: ((error: Error) => void) | undefined;
  queryClient?: QueryClient | undefined;
  queryRetry?: boolean | number | undefined;
  store?: RuntimeStore | undefined;
}

const routerDefaults = {
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: NotFound,
  defaultPendingComponent: RoutePending,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
} as const;

const buildRuntime = function buildRuntime(options: RuntimeOptions = {}) {
  const mutationErrorReporter = options.mutationErrorReporter ?? notifyError;
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: options.queryRetry ?? 1, staleTime: 30_000 },
      },
      mutationCache: new MutationCache({
        onError: (error) => {
          mutationErrorReporter(error);
        },
      }),
    });
  const routerOptions = {
    context: { queryClient },
    routeTree,
    ...routerDefaults,
  };
  const router =
    options.history === undefined
      ? createRouter(routerOptions)
      : createRouter({ ...routerOptions, history: options.history });

  return { queryClient, router, store: options.store ?? createStore() };
};

export type AppRuntime = ReturnType<typeof buildRuntime>;

export const createAppRuntime = function createAppRuntime(
  options: RuntimeOptions = {}
): AppRuntime {
  return buildRuntime(options);
};

export const appRuntime = createAppRuntime();

export const RuntimeApp = ({
  runtime,
}: {
  runtime: AppRuntime;
}): JSX.Element => (
  <QueryClientProvider client={runtime.queryClient}>
    <Provider store={runtime.store}>
      <RouterProvider router={runtime.router} />
    </Provider>
  </QueryClientProvider>
);

export const RuntimeScope = ({
  children,
  runtime,
}: {
  children: ReactNode;
  runtime: AppRuntime;
}): JSX.Element => (
  <QueryClientProvider client={runtime.queryClient}>
    <Provider store={runtime.store}>
      <RouterContextProvider router={runtime.router}>
        {children}
      </RouterContextProvider>
    </Provider>
  </QueryClientProvider>
);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof appRuntime.router;
  }
}
