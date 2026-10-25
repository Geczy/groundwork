import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { onTestFinished } from "vitest";
import { z } from "zod";

const repo = path.resolve(import.meta.dirname, "..", "..");
const oxlint = path.join(repo, "node_modules", ".bin", "oxlint");
const projectConfig = path.join(repo, "oxlint.config.ts");

const plugins = [
  { name: "jotai", specifier: path.join(repo, "lint", "jotai.ts") },
  { name: "dry", specifier: path.join(repo, "lint", "dry.ts") },
  { name: "ui", specifier: path.join(repo, "lint", "ui.ts") },
  { name: "feature", specifier: path.join(repo, "lint", "feature.ts") },
];

export interface Finding {
  help: string;
  line: number;
  message: string;
  rule: string;
}

interface RuleOptions {
  allow?: Array<string>;
  minTokens?: number;
  suffixes?: Array<string>;
}

type RuleSetting = string | [string, RuleOptions];

const lintOutputSchema = z.object({
  diagnostics: z.array(
    z.object({
      code: z.string().optional(),
      help: z.string().optional(),
      labels: z
        .array(
          z.object({
            span: z.object({ line: z.number().optional() }).optional(),
          })
        )
        .optional(),
      message: z.string().optional(),
    })
  ),
});

/**
 * There is no RuleTester for an oxlint JS plugin, so a case is a real file linted by the real
 * binary. That also means these rules are never asserted against a parser other than the one
 * that will run them.
 */
export const lint = async function lint(
  source: string,
  rules: Record<string, RuleSetting>,
  name = "case.tsx"
): Promise<Array<Finding>> {
  const dir = await mkdtemp(path.join(tmpdir(), "lint-"));
  onTestFinished(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  const config = {
    // Only the rules under test: inheriting the repo's own config would mix its findings in.
    // Registering every local plugin costs nothing: a rule `rules` does not name never runs.
    categories: {},
    jsPlugins: plugins,
    plugins: [],
    rules,
  };

  const file = path.join(dir, "config.json");
  await writeFile(file, JSON.stringify(config));
  await writeFixture(dir, name, source);

  return parse(capture(dir, name, file));
};

/**
 * The same, against the repo's own oxlint.config.ts. Rules that live in config rather than in a
 * plugin have nothing else to assert against, and what is worth proving about them is that the
 * shipped file rejects the case, not that oxlint can. Type-aware rules report on a fixture
 * outside the tsconfig program, so callers filter to the rule they came for.
 */
export const lintWithProjectConfig = async function lintWithProjectConfig(
  source: string,
  name = "case.tsx"
): Promise<Array<Finding>> {
  const dir = await mkdtemp(path.join(tmpdir(), "lint-"));
  onTestFinished(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  await writeFixture(dir, name, source);

  return parse(capture(dir, name, projectConfig));
};

const writeFixture = async function writeFixture(
  dir: string,
  name: string,
  source: string
): Promise<void> {
  const file = path.join(dir, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, source);
};

const capture = function capture(
  dir: string,
  name: string,
  config: string
): string {
  const args = [
    "-f",
    "json",
    "--no-ignore",
    "-c",
    config,
    path.join(dir, name),
  ];

  const result = spawnSync(oxlint, args, { cwd: dir, encoding: "utf8" });

  // oxlint exits non-zero whenever it reports anything, which is most of these cases, so
  // output is the success signal rather than the exit code.
  if (result.stdout === "") {
    throw (
      result.error ?? new Error(`oxlint produced no output: ${result.stderr}`)
    );
  }

  return result.stdout;
};

const parse = function parse(stdout: string): Array<Finding> {
  // The shape is oxlint's `-f json` reporter, pinned by every assertion in jotai.test.ts: a
  // change to it fails those rather than passing something malformed through untyped.
  const { diagnostics } = lintOutputSchema.parse(JSON.parse(stdout));

  return diagnostics.map((entry) => ({
    help: entry.help ?? "",
    line: entry.labels?.[0]?.span?.line ?? -1,
    message: entry.message ?? "",
    rule: entry.code ?? "",
  }));
};
