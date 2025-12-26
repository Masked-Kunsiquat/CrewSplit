/**
 * ESLint rule: no-repository-in-screens
 *
 * Prevents screen components from directly importing repository functions.
 * Screens should only use hooks, not raw repository access.
 *
 * @example
 * // ❌ Bad
 * import { getExpensesForTrip } from "@modules/expenses/repository";
 *
 * // ✅ Good
 * import { useExpenses } from "@modules/expenses";
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent screens from importing repositories directly",
      category: "Architecture",
      recommended: true,
    },
    messages: {
      noRepositoryInScreen:
        "Screens cannot import from repositories. Use hooks instead (e.g., useExpenses, useTrips).",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const isScreen = filename.includes("/screens/");

    if (!isScreen) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Check for repository imports
        if (
          importPath.includes("/repository") ||
          importPath.endsWith("/repository")
        ) {
          context.report({
            node: node.source,
            messageId: "noRepositoryInScreen",
          });
        }
      },
    };
  },
};
