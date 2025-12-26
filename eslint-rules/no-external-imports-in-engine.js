/**
 * ESLint rule: no-external-imports-in-engine
 *
 * Prevents engine files (pure math functions) from importing from
 * service, repository, or hooks layers.
 *
 * Engine functions must be pure and have zero external dependencies.
 *
 * @example
 * // ❌ Bad
 * import { getExpensesForTrip } from "../repository";
 * import { useExpenses } from "../hooks";
 *
 * // ✅ Good
 * import type { Expense } from "../types";
 * // Pure function with no imports
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent engine files from importing service/repository/hooks",
      category: "Architecture",
      recommended: true,
    },
    messages: {
      noExternalImportsInEngine:
        "Engine files cannot import from {{layer}}. Engine functions must be pure with zero dependencies (only type imports allowed).",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const isEngine = filename.includes("/engine/");

    if (!isEngine) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Allow type-only imports
        if (node.importKind === "type") {
          return;
        }

        // Check for forbidden layers
        const forbiddenLayers = ["service", "repository", "hooks", "screens"];
        const violatedLayer = forbiddenLayers.find((layer) =>
          importPath.includes(`/${layer}/`),
        );

        if (violatedLayer) {
          context.report({
            node: node.source,
            messageId: "noExternalImportsInEngine",
            data: {
              layer: violatedLayer,
            },
          });
        }

        // Also check for imports from @modules that aren't type-only
        if (importPath.startsWith("@modules/")) {
          // Check if all imports are types
          const hasValueImports = node.specifiers.some((spec) => {
            // Default and namespace imports are always value imports
            if (
              spec.type === "ImportDefaultSpecifier" ||
              spec.type === "ImportNamespaceSpecifier"
            ) {
              return true;
            }
            // Named imports are value imports only if not type-only
            if (spec.type === "ImportSpecifier" && spec.importKind !== "type") {
              return true;
            }
            return false;
          });

          if (hasValueImports) {
            context.report({
              node: node.source,
              messageId: "noExternalImportsInEngine",
              data: {
                layer: "other modules (use type imports only)",
              },
            });
          }
        }
      },
    };
  },
};
