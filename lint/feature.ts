/** Enforces the feature dependency direction documented in AGENTS.md. */

import path from "node:path";

import { nodeStringValue } from "./types.ts";
import type { BaseContext, Node, Rule } from "./types.ts";

type Context = BaseContext;

type Role = "schema" | "state" | "transport" | "query" | "rendering" | "index";

const RANK = {
  index: 5,
  query: 3,
  rendering: 4,
  schema: 0,
  state: 1,
  transport: 2,
} satisfies Record<Role, number>;

const REACT_QUERY = "@tanstack/react-query";

const PACKAGE_BANS = new Map<Role, ReadonlySet<string>>([
  ["schema", new Set(["react", "jotai", REACT_QUERY, "@tanstack/react-form"])],
  ["state", new Set(["react", REACT_QUERY])],
  ["transport", new Set(["react", "jotai", REACT_QUERY])],
]);

const roleOfFile = function roleOfFile(filename: string): Role | undefined {
  const name = path.basename(filename);

  if (
    name.includes(".test.") ||
    !filename.replaceAll("\\", "/").includes("/src/features/")
  ) {
    return undefined;
  }

  if (name === "index.ts") {
    return "index";
  }

  if (name.endsWith(".schema.ts")) {
    return "schema";
  }

  if (name.endsWith(".state.ts")) {
    return "state";
  }

  if (name.endsWith(".api.ts")) {
    return "transport";
  }

  if (name.endsWith(".queries.ts")) {
    return "query";
  }

  if (name.endsWith(".tsx")) {
    return "rendering";
  }

  return undefined;
};

const roleOfImport = function roleOfImport(specifier: string): Role {
  if (/\.schema(?:\.ts)?$/u.test(specifier)) {
    return "schema";
  }

  if (/\.state(?:\.ts)?$/u.test(specifier)) {
    return "state";
  }

  if (/\.api(?:\.ts)?$/u.test(specifier)) {
    return "transport";
  }

  if (/\.queries(?:\.ts)?$/u.test(specifier)) {
    return "query";
  }

  if (/\/index(?:\.ts)?$/u.test(specifier)) {
    return "index";
  }

  return "rendering";
};

const importedNames = function importedNames(node: Node): Set<string> {
  const names = new Set<string>();

  for (const specifier of node.specifiers ?? []) {
    const name = specifier.imported?.name;

    if (name !== undefined) {
      names.add(name);
    }
  }

  return names;
};

const reportPackage = function reportPackage(
  context: Context,
  node: Node,
  role: Role,
  specifier: string
): void {
  context.report({
    message:
      `The ${role} module cannot import ${specifier}. Keep the feature dependency direction ` +
      "schema <- state <- transport <- query <- rendering <- index.",
    node,
  });
};

const reportDirection = function reportDirection(
  context: Context,
  node: Node,
  from: Role,
  to: Role
): void {
  context.report({
    message:
      `The ${from} module cannot import a ${to} module. Dependencies point one way: ` +
      "schema <- state <- transport <- query <- rendering <- index.",
    node,
  });
};

const checkImport = function checkImport(
  context: Context,
  node: Node,
  role: Role
): void {
  const value = nodeStringValue(node.source);

  if (value === undefined) {
    return;
  }

  if (PACKAGE_BANS.get(role)?.has(value) === true) {
    reportPackage(context, node, role, value);

    return;
  }

  if (
    role === "rendering" &&
    value === REACT_QUERY &&
    [...importedNames(node)].some(
      (name) => name === "useMutation" || name === "useQueryClient"
    )
  ) {
    context.report({
      message:
        "Rendering modules use named mutation hooks from the query module; they do not own " +
        "mutations or query invalidation.",
      node,
    });

    return;
  }

  if (!value.startsWith(".")) {
    return;
  }

  const target = roleOfImport(value);

  if (RANK[target] > RANK[role]) {
    reportDirection(context, node, role, target);
  }
};

const dependencyDirection: Rule<Context> = {
  create(context) {
    const role = roleOfFile(context.filename);

    if (role === undefined) {
      return {};
    }

    return {
      ImportDeclaration: (node) => {
        checkImport(context, node, role);
      },
    };
  },
  meta: {
    docs: {
      description: "Enforce the dependency direction inside feature modules",
    },
  },
};

export default {
  meta: { name: "feature" },
  rules: { "dependency-direction": dependencyDirection },
};
