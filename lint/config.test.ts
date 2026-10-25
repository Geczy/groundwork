import { describe, expect, it } from "vitest";

import { lintWithProjectConfig } from "./test/harness.ts";
import type { Finding } from "./test/harness.ts";

/**
 * That the shipped oxlint.config.ts turns a rule on, which is the half a plugin's own tests
 * cannot cover: a rule nobody enables passes every case in lint/ui.test.ts and reports nothing
 * on the repo. A fixture outside the tsconfig program also trips the type-aware rules, so each
 * case keeps only the code it came for.
 */
const only = function only(
  findings: Array<Finding>,
  rule: string
): Array<number> {
  return findings.flatMap((finding) =>
    finding.rule === rule ? [finding.line] : []
  );
};

const RAW = "ui(no-raw-element)";
const FEATURE = "feature(dependency-direction)";
const ANTI_SLOP = "anti-slop(no-module-mocking)";
const NKZW = "@nkzw(no-instanceof)";

describe("ui/no-raw-element", () => {
  it("is on, and rejects a raw control", async () => {
    const found = await lintWithProjectConfig(
      `export function Widget(): null {
         return (
           <div>
             <button type="button">go</button>
             <input />
             <label htmlFor="x">name</label>
           </div>
         );
       }`
    );

    expect(only(found, RAW)).toEqual([4, 5, 6]);
  });

  it("leaves the structure the repo already renders alone", async () => {
    const found = await lintWithProjectConfig(
      `export function Widget(): null {
         return (
           <form>
             <fieldset>
               <ul>
                 <li>one</li>
               </ul>
             </fieldset>
           </form>
         );
       }`
    );

    expect(only(found, RAW)).toEqual([]);
  });
});

describe("feature/dependency-direction", () => {
  it("is on, and rejects an upward feature import", async () => {
    const found = await lintWithProjectConfig(
      "import './example-panel';",
      "src/features/example/example.queries.ts"
    );

    expect(only(found, FEATURE)).toEqual([1]);
  });
});

describe("anti-slop/no-module-mocking", () => {
  it("is on, and rejects module-level test doubles", async () => {
    const found = await lintWithProjectConfig(
      "import { vi } from 'vitest';\nvi.mock('./api');"
    );

    expect(only(found, ANTI_SLOP)).toEqual([2]);
  });
});

describe("@nkzw/no-instanceof", () => {
  it("is on through the shared NKZW config", async () => {
    const found = await lintWithProjectConfig(
      `export function isDate(value: object): boolean {
         return value instanceof Date;
       }`
    );

    expect(only(found, NKZW)).toEqual([2]);
  });
});
