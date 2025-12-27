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

    // Skip errors.ts - it defines the error utilities
    if (
      filename.includes("utils/errors.ts") ||
      filename.includes("utils\\errors.ts")
    ) {
      return {};
    }

    // Skip engine layer - pure functions should have zero dependencies
    // Engine functions throw plain Error objects to remain framework-agnostic
    if (filename.includes("/engine/") || filename.includes("\\engine\\")) {
      return {};
    }

    // Skip deprecated wrapper functions that intentionally throw migration errors
    if (
      (filename.includes("/repository/index.ts") ||
        filename.includes("\\repository\\index.ts")) &&
      context.getSourceCode().getText().includes("@deprecated")
    ) {
      // Only skip if the error is in a deprecated function
      // We'll check this in the node handler
    }

    return {
      NewExpression(node) {
        // Check for new Error(...)
        if (node.callee.type === "Identifier" && node.callee.name === "Error") {
          // Allow error normalization pattern: error instanceof Error ? error : new Error(...)
          const parent = node.parent;
          if (
            parent &&
            parent.type === "ConditionalExpression" &&
            parent.alternate === node
          ) {
            return; // Skip this legitimate use case
          }

          // Check if this is inside a deprecated function (migration error)
          let currentNode = node;
          while (currentNode) {
            // Check for function declarations and expressions
            if (
              currentNode.type === "FunctionDeclaration" ||
              currentNode.type === "FunctionExpression" ||
              currentNode.type === "ArrowFunctionExpression"
            ) {
              const sourceCode = context.getSourceCode();
              let nodeToCheck = currentNode;

              // For arrow functions in variable declarations, check the parent VariableDeclarator
              if (
                currentNode.type === "ArrowFunctionExpression" &&
                currentNode.parent &&
                currentNode.parent.type === "VariableDeclarator"
              ) {
                nodeToCheck = currentNode.parent;
              }

              // Check if there's a @deprecated JSDoc above
              const comments = sourceCode.getCommentsBefore(nodeToCheck);
              const hasDeprecated = comments.some(
                (comment) =>
                  comment.type === "Block" &&
                  comment.value.includes("@deprecated"),
              );
              if (hasDeprecated) {
                return; // Skip deprecated functions
              }
              break;
            }
            currentNode = currentNode.parent;
          }

          context.report({
            node,
            messageId: "noManualErrorCreation",
          });
        }
      },
    };
  },
};
