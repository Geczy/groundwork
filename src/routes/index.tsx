import type { JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'React Boilerplate' },
      {
        name: 'description',
        content: 'A strict React, TypeScript, shadcn, TanStack, and Oxlint foundation.',
      },
    ],
  }),
});

const stack = [
  'React 19',
  'TypeScript 7',
  'Vite 8',
  'Tailwind CSS 4',
  'shadcn/Base UI',
  'Supabase',
];

const foundation = [
  'File-based TanStack Router with code splitting',
  'TanStack Query, Form, Jotai, and Zod',
  'Vitest, Testing Library, and 90% coverage floors',
  'Oxlint, Oxfmt, duplication checks, and typed lint rules',
  'Dark mode, validated environment variables, and CI',
  'Dedicated-schema Supabase and atomic database types',
  'Pre-commit checks and agent-readable architecture guides',
];

function HomePage(): JSX.Element {
  return (
    <main className="min-h-dvh px-5 py-5 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-7xl flex-col border border-border sm:min-h-[calc(100dvh-4rem)]">
        <StarterHeader />
        <section className="grid flex-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <Hero />
          <FoundationPanel />
        </section>
      </div>
    </main>
  );
}

function StarterHeader(): JSX.Element {
  return (
    <header className="flex min-h-16 items-center justify-between gap-6 border-b border-border px-5 pr-16 sm:px-8 sm:pr-16">
      <div className="flex items-center gap-3">
        <span className="size-2 bg-emphasis" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-[0.18em] uppercase">React Boilerplate</span>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">Ready for product work</span>
    </header>
  );
}

function Hero(): JSX.Element {
  return (
    <div className="flex flex-col justify-between gap-16 p-6 sm:p-10 lg:p-14">
      <div className="flex max-w-3xl flex-col gap-7">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Strict by default
        </p>
        <h1 className="text-5xl leading-[0.98] tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
          A serious starting point for the app you actually want to build.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Product-ready architecture, quality gates, and UI foundations without pretending your
          future app has already been designed.
        </p>
        <code className="w-fit border border-border bg-muted/50 px-4 py-3 text-xs">
          bun run dev
        </code>
      </div>
      <StackList />
    </div>
  );
}

function StackList(): JSX.Element {
  return (
    <ul
      className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
      aria-label="Core stack"
    >
      {stack.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function FoundationPanel(): JSX.Element {
  return (
    <aside className="flex flex-col border-t border-border bg-muted/35 lg:border-t-0 lg:border-l">
      <Metrics />
      <div className="flex flex-1 flex-col justify-center gap-8 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl tracking-tight">Already wired</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Keep what fits. Add the first real feature when the product shape is clear.
          </p>
        </div>
        <Separator />
        <FoundationList />
      </div>
      <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground sm:px-8 lg:px-10">
        Start with <code>src/routes/index.tsx</code> and <code>AGENTS.md</code>.
      </footer>
    </aside>
  );
}

function Metrics(): JSX.Element {
  return (
    <div className="grid grid-cols-3 border-b border-border">
      <Metric value="15" label="anti-slop rules" />
      <Metric value="90%" label="coverage floor" />
      <Metric value="1" label="full check" />
    </div>
  );
}

function FoundationList(): JSX.Element {
  return (
    <ul className="flex flex-col gap-4">
      {foundation.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
          <CheckIcon className="mt-1 text-emphasis" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Metric({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <fieldset
      aria-label={`${value} ${label}`}
      className="flex min-w-0 flex-col gap-1 border-r border-border p-4 last:border-r-0 sm:p-5"
    >
      <strong className="text-2xl font-normal tracking-tight tabular-nums">{value}</strong>
      <span className="text-[0.65rem] leading-tight tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </fieldset>
  );
}
