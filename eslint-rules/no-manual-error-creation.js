/**
 * ESLint rule: no-manual-error-creation
 *
 * Prevents manual Error object creation. All errors should use the
 * centralized error factory for consistent error codes and formatting.
 *
 * @example
 * // ❌ Bad
 * throw new Error("Trip not found");
 * const error = new Error("Invalid data");
 *
 * // ✅ Good
 * import { createAppError } from "@utils/errors";
 * throw createAppError("TRIP_NOT_FOUND", "Trip not found");
 */

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce use of error factory instead of manual Error creation",
      category: "Architecture",
      recommended: true,
    },
    messages: {
      noManualErrorCreation:
        "Do not create Error objects manually. Use createAppError() from @utils/errors for consistent error handling.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Skip test files - they can create errors directly for testing
    if (filename.includes("__tests__") || filename.includes(".test.")) {
      return {};
    }

    return {
      NewExpression(node) {
        // Check for new Error(...)
        if (node.callee.type === "Identifier" && node.callee.name === "Error") {
          context.report({
            node,
            messageId: "noManualErrorCreation",
          });
        }
      },
    };
  },
};
