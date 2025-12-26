/**
 * Script to automatically refactor manual Error() creation to use createAppError()
 *
 * Usage: node scripts/fix-manual-errors.js
 */

const fs = require("fs");
const glob = require("glob");

// Common error patterns and their replacements
const errorPatterns = [
  {
    pattern: /throw new Error\("([^"]+)"\);?/g,
    replacement: (match, message) => {
      // Infer error code from message
      const code = inferErrorCode(message);
      return `throw createAppError("${code}", "${message}");`;
    },
  },
  {
    pattern: /const (\w+) = new Error\("([^"]+)"\);?/g,
    replacement: (match, varName, message) => {
      const code = inferErrorCode(message);
      return `const ${varName} = createAppError("${code}", "${message}");`;
    },
  },
  {
    pattern: /= new Error\("([^"]+)"\);?/g,
    replacement: (match, message) => {
      const code = inferErrorCode(message);
      return `= createAppError("${code}", "${message}");`;
    },
  },
];

// Infer error code from message
function inferErrorCode(message) {
  const lower = message.toLowerCase();

  if (lower.includes("not found")) return "RESOURCE_NOT_FOUND";
  if (lower.includes("invalid")) return "INVALID_INPUT";
  if (lower.includes("required")) return "MISSING_DEPENDENCY";
  if (lower.includes("failed")) return "OPERATION_FAILED";
  if (lower.includes("unsupported")) return "UNSUPPORTED_OPERATION";
  if (lower.includes("duplicate")) return "DUPLICATE_ENTRY";
  if (lower.includes("unauthorized")) return "UNAUTHORIZED";
  if (lower.includes("forbidden")) return "FORBIDDEN";

  return "UNKNOWN_ERROR";
}

// Check if file already imports createAppError
function hasCreateAppErrorImport(content) {
  return content.includes("createAppError");
}

// Add createAppError import if needed
function ensureImport(content, filePath) {
  if (hasCreateAppErrorImport(content)) {
    return content;
  }

  // Find existing imports from @utils/errors
  const errorImportMatch = content.match(
    /import\s*{([^}]+)}\s*from\s*['"]@utils\/errors['"]/,
  );

  if (errorImportMatch) {
    // Add to existing import
    const imports = errorImportMatch[1];
    const newImports = imports.trim() + ", createAppError";
    return content.replace(
      errorImportMatch[0],
      `import { ${newImports} } from "@utils/errors"`,
    );
  }

  // Add new import after first import statement
  const firstImportMatch = content.match(/^import\s+.+from\s+.+;?\s*$/m);
  if (firstImportMatch) {
    const insertPoint =
      content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
    return (
      content.slice(0, insertPoint) +
      '\nimport { createAppError } from "@utils/errors";' +
      content.slice(insertPoint)
    );
  }

  // No imports found, add at top
  return 'import { createAppError } from "@utils/errors";\n\n' + content;
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  // Apply error pattern replacements
  errorPatterns.forEach(({ pattern, replacement }) => {
    const original = content;
    content = content.replace(pattern, replacement);
    if (content !== original) {
      modified = true;
    }
  });

  if (modified) {
    // Ensure import is present
    content = ensureImport(content, filePath);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✓ Fixed: ${filePath}`);
    return 1;
  }

  return 0;
}

// Main execution
function main() {
  const srcFiles = glob.sync("src/**/*.{ts,tsx}", {
    ignore: [
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/utils/errors.ts",
    ],
  });

  console.log(`Processing ${srcFiles.length} files...`);

  let fixedCount = 0;
  srcFiles.forEach((file) => {
    fixedCount += processFile(file);
  });

  console.log(`\n✅ Fixed ${fixedCount} files`);
  console.log("\nRun npm run lint to verify changes");
}

main();
