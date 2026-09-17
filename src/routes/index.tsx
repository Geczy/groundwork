import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import type { JSX } from "react";

import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/")({
  component: () => <HomePage />,
  head: () => ({
    meta: [
      { title: "React Boilerplate" },
      {
        content:
          "A strict React, TypeScript, shadcn, TanStack, and Oxlint foundation.",
        name: "description",
      },
    ],
  }),
});

const stack = [
  "React 19",
  "TypeScript 6",
  "Vite 8",
  "Tailwind CSS 4",
  "shadcn/Base UI",
  "Supabase",
];

const foundation = [
  "File-based TanStack Router with code splitting",
  "TanStack Query, Form, Jotai, and Zod",
  "Vitest, Testing Library, and 90% coverage floors",
  "Oxlint, Oxfmt, duplication checks, and typed lint rules",
  "Dark mode, validated environment variables, and CI",
  "Dedicated-schema Supabase and atomic database types",
  "Pre-commit checks and agent-readable architecture guides",
];

const HomePage = (): JSX.Element => (
  <main className="min-h-dvh px-5 py-5 sm:px-8 sm:py-8 lg:px-12">
    <div className="border-border mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-7xl flex-col border sm:min-h-[calc(100dvh-4rem)]">
      <StarterHeader />
      <section className="grid flex-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <Hero />
        <FoundationPanel />
      </section>
    </div>
  </main>
);

const StarterHeader = (): JSX.Element => (
  <header className="border-border flex min-h-16 items-center justify-between gap-6 border-b px-5 pr-16 sm:px-8 sm:pr-16">
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="bg-emphasis size-2" />
      <span className="text-xs font-semibold tracking-widest uppercase">
        React Boilerplate
      </span>
    </div>
    <span className="text-muted-foreground hidden text-xs sm:inline">
      Ready for product work
    </span>
  </header>
);

const Hero = (): JSX.Element => (
  <div className="flex flex-col justify-between gap-16 p-6 sm:p-10 lg:p-14">
    <div className="flex max-w-3xl flex-col gap-7">
      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        Strict by default
      </p>
      <h1 className="text-5xl leading-none tracking-tight text-balance sm:text-6xl lg:text-7xl">
        A serious starting point for the app you actually want to build.
      </h1>
      <p className="text-muted-foreground max-w-xl text-base leading-relaxed sm:text-lg">
        Product-ready architecture, quality gates, and UI foundations without
        pretending your future app has already been designed.
      </p>
      <code className="border-border bg-muted/50 w-fit border px-4 py-3 text-xs">
        bun run dev
      </code>
    </div>
    <StackList />
  </div>
);

const StackList = (): JSX.Element => (
  <ul
    aria-label="Core stack"
    className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs"
  >
    {stack.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const FoundationPanel = (): JSX.Element => (
  <aside className="border-border bg-muted/35 flex flex-col border-t lg:border-t-0 lg:border-l">
    <Metrics />
    <div className="flex flex-1 flex-col justify-center gap-8 p-6 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl tracking-tight">Already wired</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Keep what fits. Add the first real feature when the product shape is
          clear.
        </p>
      </div>
      <Separator />
      <FoundationList />
    </div>
    <footer className="border-border text-muted-foreground border-t px-6 py-4 text-xs sm:px-8 lg:px-10">
      Start with <code>src/routes/index.tsx</code> and <code>AGENTS.md</code>.
    </footer>
  </aside>
);

const Metrics = (): JSX.Element => (
  <div className="border-border grid grid-cols-3 border-b">
    <Metric label="anti-slop rules" value="15" />
    <Metric label="coverage floor" value="90%" />
    <Metric label="full check" value="1" />
  </div>
);

const FoundationList = (): JSX.Element => (
  <ul className="flex flex-col gap-4">
    {foundation.map((item) => (
      <li className="flex items-start gap-3 text-sm leading-relaxed" key={item}>
        <CheckIcon aria-hidden="true" className="text-emphasis mt-1" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Metric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element => (
  <fieldset
    aria-label={`${value} ${label}`}
    className="border-border flex min-w-0 flex-col gap-1 border-r p-4 last:border-r-0 sm:p-5"
  >
    <strong className="text-2xl font-normal tracking-tight tabular-nums">
      {value}
    </strong>
    <span className="text-muted-foreground text-xs leading-tight tracking-wide uppercase">
      {label}
    </span>
  </fieldset>
);
