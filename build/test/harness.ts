import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { onTestFinished, vi } from 'vitest';
import type { OutputLifecycle } from '../output.ts';

/** Stands in for Vite's logger and keeps what a table printed. */
export interface Recorder { info: (message: string) => void; lines: Array<string> }

export const recorder = function recorder(): Recorder {
  const lines: Array<string> = [];
  return {
    info: (msg) => {
      lines.push(msg);
    },
    lines,
  };
}

// `styleText` reads the environment on every call, so pin it or a table asserts differently
// under a TTY than in CI.
export const useColor = function useColor(on: boolean): void {
  vi.stubEnv('NO_COLOR', on ? undefined : '1');
  vi.stubEnv('FORCE_COLOR', on ? '1' : undefined);
}

// Built rather than written as a literal: a raw escape byte in a regex is a control
// character, which `no-control-regex` rejects.
const ANSI = new RegExp(`${String.fromCodePoint(27)}\\[\\d+m`, 'gu');

export const stripAnsi = (s: string): string => s.replaceAll(ANSI, '');

/**
 * Runs `configResolved` with the only two fields the lifecycle reads, then hands back the hooks
 * a test drives by hand. The production plugin wraps this same lifecycle.
 */
export const start = function start(lifecycle: OutputLifecycle, dir: string, log: Recorder): OutputLifecycle {
  lifecycle.configResolved({ build: { outDir: dir }, logger: log });
  return lifecycle;
}

/** An empty stand-in for `dist/`, removed when the test ends. */
export const distDir = async function distDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'build-'));
  onTestFinished( async () => await rm(dir, { force: true, recursive: true }));
  return dir;
}

export const put = async function put(dir: string, name: string, data: Buffer | string): Promise<string> {
  const path = join(dir, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  return path;
}
