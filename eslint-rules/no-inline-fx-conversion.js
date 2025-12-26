/**
 * ESLint rule: no-inline-fx-conversion
 *
 * Prevents inline FX conversion calculations (Math.round(amount * rate)).
 * All currency conversions must use the centralized utility.
 *
 * @example
 * // ❌ Bad
 * const converted = Math.round(amount * fxRate);
 * Math.round(originalAmount * rate);
 *
 * // ✅ Good
 * import { convertCurrency } from "@utils/currency";
 * const converted = convertCurrency(amount, fxRate);
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent inline FX conversion calculations",
      category: "Architecture",
      recommended: true,
    },
    messages: {
      noInlineFxConversion:
        "Do not inline FX conversions. Use convertCurrency() from @utils/currency instead.",
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        // Check for Math.round(... * ...)
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "Math" &&
          node.callee.property.name === "round" &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];

          // Check if argument is a multiplication
          if (arg.type === "BinaryExpression" && arg.operator === "*") {
            const sourceCode = context.sourceCode || context.getSourceCode();
            const code = sourceCode.getText(arg);

            // Heuristic: if it involves 'rate', 'fx', 'amount', or 'minor'
            // it's likely an FX conversion
            const looksLikeFxConversion =
              /\b(rate|fx|amount|minor|original|converted)\b/i.test(code);

            if (looksLikeFxConversion) {
              context.report({
                node,
                messageId: "noInlineFxConversion",
              });
            }
          }
        }
      },
    };
  },
};
