/**
 * Jotai has no lint plugin anywhere, so the three practices below live here instead of in
 * prose. Loaded through oxlint's JS bridge as `jotai`; see `jsPlugins` in oxlint.config.ts.
 * The bridge hands over no type information, so every check is syntactic.
 */

import { nodeStringValue } from "./types.ts";
import type { BaseContext, Node, Rule } from "./types.ts";

type Options = { suffixes?: Array<string> } | undefined;

type Context = BaseContext & { options: ReadonlyArray<Options> };

// Everything that returns an atom config. `atomFamily` is here too: building a family per
// render is the same bug, even though what it returns is a function rather than an atom.
const ATOM_FACTORIES = new Set([
  "atom",
  "atomFamily",
  "atomWithDefault",
  "atomWithObservable",
  "atomWithRefresh",
  "atomWithReset",
  "atomWithStorage",
  "freezeAtom",
  "loadable",
  "selectAtom",
  "splitAtom",
  "unwrap",
]);

// `atomFamily` returns a lookup function, so an `Atom` suffix would misname it.
const SUFFIXED_FACTORIES = new Set(
  [...ATOM_FACTORIES].filter((name) => name !== "atomFamily")
);

// Wrapping the call in any of these is what makes the atom config survive a rerender.
const MEMO_HOOKS = new Set(["useMemo", "useRef", "useState", "useCallback"]);

const FUNCTIONS = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const COMPONENT = /^[A-Z]/u;
const HOOK = /^use[A-Z]/u;

const isJotai = function isJotai(source: Node | undefined): boolean {
  const value = nodeStringValue(source);

  return (
    value !== undefined && (value === "jotai" || value.startsWith("jotai/"))
  );
};

/** Maps a local binding back to the jotai export it came from, so `import { atom as a }` works. */
const collectImports = function collectImports(
  node: Node,
  wanted: Set<string>,
  into: Map<string, string>
): void {
  if (!isJotai(node.source)) {
    return;
  }

  for (const specifier of node.specifiers ?? []) {
    const imported = specifier.imported?.name;
    const local = specifier.local?.name;

    if (
      specifier.type !== "ImportSpecifier" ||
      imported === undefined ||
      local === undefined
    ) {
      continue;
    }

    if (wanted.has(imported)) {
      into.set(local, imported);
    }
  }
};

const calleeName = function calleeName(node: Node): string | undefined {
  const { callee } = node;

  return callee?.type === "Identifier" ? callee.name : undefined;
};

const ancestors = function ancestors(node: Node): Array<Node> {
  const chain: Array<Node> = [];

  for (
    let current = node.parent;
    current !== null && current !== undefined;
    current = current.parent
  ) {
    chain.push(current);
  }

  return chain;
};

/** The name a function is known by, whether it is declared or assigned to a variable. */
const functionName = function functionName(node: Node): string | undefined {
  if (node.id?.name !== undefined) {
    return node.id.name;
  }

  const { parent } = node;

  if (parent?.type !== "VariableDeclarator") {
    return undefined;
  }

  return parent.id?.type === "Identifier" ? parent.id.name : undefined;
};

const isComponentOrHook = function isComponentOrHook(
  name: string | undefined
): boolean {
  return name !== undefined && (COMPONENT.test(name) || HOOK.test(name));
};

const reportIfUnstable = function reportIfUnstable(
  context: Context,
  call: Node,
  factory: string
): void {
  for (const ancestor of ancestors(call)) {
    if (ancestor.type === "CallExpression") {
      const wrapper = calleeName(ancestor);

      if (wrapper !== undefined && MEMO_HOOKS.has(wrapper)) {
        return;
      }
    }

    const owner = FUNCTIONS.has(ancestor.type)
      ? functionName(ancestor)
      : undefined;

    if (isComponentOrHook(owner)) {
      context.report({
        message:
          `\`${factory}()\` runs on every render of ${owner ?? "this component"}, so each render ` +
          "gets a different atom config and `useAtom` can loop. Move it to module scope, or " +
          "memoize it with useMemo when it genuinely depends on props.",
        node: call,
      });

      return;
    }
  }
};

const noAtomInRender: Rule<Context> = {
  create(context) {
    const factories = new Map<string, string>();
    const calls: Array<Node> = [];

    return {
      CallExpression: (node) => {
        calls.push(node);
      },
      ImportDeclaration: (node) => {
        collectImports(node, ATOM_FACTORIES, factories);
      },
      // Deferred to Program:exit so a rule never depends on imports being visited first.
      "Program:exit": () => {
        for (const call of calls) {
          const factory = factories.get(calleeName(call) ?? "");

          if (factory !== undefined) {
            reportIfUnstable(context, call, factory);
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow creating an atom during render without memoizing it",
    },
  },
};

// No fixer: swapping the call also means rewriting the import, and a fix that leaves a file
// referencing an unimported hook is worse than the finding it replaces.
const reportWideHook = function reportWideHook(
  context: Context,
  declarator: Node,
  locals: Set<string>
): void {
  const { id } = declarator;
  const { init } = declarator;

  if (id?.type !== "ArrayPattern" || init?.type !== "CallExpression") {
    return;
  }

  const name = calleeName(init);

  if (name === undefined || !locals.has(name)) {
    return;
  }

  const elements = id.elements ?? [];
  const reads = elements[0] !== null && elements[0] !== undefined;
  const writes = elements[1] !== null && elements[1] !== undefined;

  if (reads && writes) {
    return;
  }

  const replacement = reads ? "useAtomValue" : "useSetAtom";
  context.report({
    message:
      `\`${name}\` subscribes the component to the atom's value. This one only ` +
      `${reads ? "reads" : "writes"}, so use \`${replacement}\` and drop the rerenders it ` +
      "does not need.",
    node: init,
  });
};

const preferNarrowHook: Rule<Context> = {
  create(context) {
    const imports = new Map<string, string>();
    const declarators: Array<Node> = [];

    return {
      ImportDeclaration: (node) => {
        collectImports(node, new Set(["useAtom"]), imports);
      },
      "Program:exit": () => {
        const locals = new Set(imports.keys());

        for (const declarator of declarators) {
          reportWideHook(context, declarator, locals);
        }
      },
      VariableDeclarator: (node) => {
        declarators.push(node);
      },
    };
  },
  meta: {
    docs: {
      description: "Prefer useAtomValue or useSetAtom over a half-used useAtom",
    },
  },
};

const reportBadName = function reportBadName(
  context: Context,
  declarator: Node,
  factories: Map<string, string>,
  suffixes: Array<string>
): void {
  const { id } = declarator;
  const { init } = declarator;

  if (id?.type !== "Identifier" || init?.type !== "CallExpression") {
    return;
  }

  if (!factories.has(calleeName(init) ?? "")) {
    return;
  }

  // Inside a function the name is local, and no-atom-in-render already owns that case.
  if (ancestors(declarator).some((node) => FUNCTIONS.has(node.type))) {
    return;
  }

  const { name } = id;

  if (name === undefined || suffixes.some((suffix) => name.endsWith(suffix))) {
    return;
  }

  context.report({
    message:
      `\`${name}\` holds an atom, so name it \`${name}${suffixes[0] ?? "Atom"}\`. The suffix is ` +
      "what tells a reader whether a variable is an atom config or the value read out of one.",
    node: id,
  });
};

const atomSuffix: Rule<Context> = {
  create(context) {
    const factories = new Map<string, string>();
    const declarators: Array<Node> = [];
    const suffixes = context.options[0]?.suffixes ?? ["Atom"];

    return {
      ImportDeclaration: (node) => {
        collectImports(node, SUFFIXED_FACTORIES, factories);
      },
      "Program:exit": () => {
        for (const declarator of declarators) {
          reportBadName(context, declarator, factories, suffixes);
        }
      },
      VariableDeclarator: (node) => {
        declarators.push(node);
      },
    };
  },
  meta: {
    docs: {
      description: "Require module-scope atoms to be named with an Atom suffix",
    },
    schema: [
      {
        additionalProperties: false,
        properties: { suffixes: { items: { type: "string" }, type: "array" } },
        type: "object",
      },
    ],
  },
};

export default {
  meta: { name: "jotai" },
  rules: {
    "atom-suffix": atomSuffix,
    "no-atom-in-render": noAtomInRender,
    "prefer-narrow-hook": preferNarrowHook,
  },
};
