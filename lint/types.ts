/**
 * The shapes oxlint's JS bridge hands a local plugin, shared by jotai.ts and dry.ts. Names and
 * fields follow ESTree, which is what the bridge speaks. Every field is optional so that
 * reading one never needs a cast, and `Node` carries the union of what the plugins here touch
 * rather than the whole grammar.
 */

export type Node = {
  body?: Node | undefined;
  callee?: Node | undefined;
  elements?: Array<Node | null> | undefined;
  id?: Node | null | undefined;
  imported?: Node | undefined;
  init?: Node | null | undefined;
  local?: Node | undefined;
  name?: string | undefined;
  parent?: Node | null | undefined;
  source?: Node | undefined;
  specifiers?: Array<Node> | undefined;
  type: string;
  value?: unknown;
};

export type Token = { value: string };

export type Loc = { end: { line: number }; start: { line: number } };

export type SourceCode = {
  getLoc: (node: Node) => Loc;
  getTokens: (node: Node) => Array<Token>;
};

/** Everything a rule gets except its own options, which each plugin types for itself. */
export type BaseContext = {
  filename: string;
  report: (descriptor: { message: string; node: Node }) => void;
  sourceCode: SourceCode;
};

export type Rule<Context> = {
  create: (context: Context) => Record<string, (node: Node) => void>;
  // `schema` is not decoration: oxlint rejects options outright for a rule without one.
  meta?: { docs?: { description: string }; schema?: Array<unknown> };
};

const nodeStringSchema = z.string();

export function nodeStringValue(node: Node | undefined): string | undefined {
  const parsed = nodeStringSchema.safeParse(node?.value);
  return parsed.success ? parsed.data : undefined;
}
import { z } from 'zod';
