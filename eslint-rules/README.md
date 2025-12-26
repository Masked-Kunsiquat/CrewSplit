# Custom ESLint Architecture Rules

This directory contains custom ESLint rules that enforce CrewSplit's architectural boundaries and coding standards.

## Rules Overview

### 🔴 Error-Level Rules (Blocking)

These rules enforce critical architecture boundaries and will fail the build if violated:

#### `architecture/no-repository-in-screens`

**Purpose**: Prevent screen components from directly importing repository functions.

**Rationale**: Screens should only use hooks, not raw database access. This maintains proper separation of concerns and makes components more testable.

**Examples**:

```typescript
// ❌ Bad - Screen importing repository directly
import { getExpensesForTrip } from "@modules/expenses/repository";

function ExpenseScreen() {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    getExpensesForTrip(tripId).then(setExpenses);
  }, [tripId]);
}

// ✅ Good - Screen using hooks
import { useExpenses } from "@modules/expenses";

function ExpenseScreen() {
  const { expenses, loading } = useExpenses(tripId);
}
```

#### `architecture/no-external-imports-in-engine`

**Purpose**: Prevent engine files (pure math functions) from importing service/repository/hooks layers.

**Rationale**: Engine functions must be pure and deterministic with zero external dependencies. This ensures:
- Same inputs → same outputs (testability)
- No side effects
- Functions can be easily moved or reused
- Clear separation between calculation logic and data access

**Examples**:

```typescript
// ❌ Bad - Engine importing from service/repository
import { getExpensesForTrip } from "../repository";

export function calculateTotalExpenses(tripId: string) {
  const expenses = await getExpensesForTrip(tripId); // Side effect!
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

// ✅ Good - Pure function with data passed in
import type { Expense } from "../types";

export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
```

**Note**: Type-only imports are allowed in engine files:

```typescript
// ✅ Allowed - Type import
import type { Expense } from "@modules/expenses";

export function processExpenses(expenses: Expense[]): number {
  // Pure function implementation
}
```

### ⚠️ Warning-Level Rules (Non-Blocking)

These rules highlight code quality improvements but don't block builds:

#### `architecture/no-inline-fx-conversion`

**Purpose**: Prevent inline FX conversion calculations.

**Rationale**: Currency conversions should use the centralized utility to ensure:
- Consistent rounding behavior
- Deterministic calculations
- Easier debugging and testing
- Single source of truth for conversion logic

**Examples**:

```typescript
// ❌ Bad - Inline FX conversion
const converted = Math.round(originalAmount * fxRate);
const result = Math.round(amountMinor * rateToTrip);

// ✅ Good - Using centralized utility
import { convertCurrency } from "@utils/currency";

const converted = convertCurrency(originalAmount, fxRate);
```

**Exceptions**: The utility function itself (`@utils/currency.ts`) will trigger this warning intentionally - this is the one place where inline conversion is required.

#### `architecture/no-manual-error-creation`

**Purpose**: Enforce use of error factory instead of manual `Error` object creation.

**Rationale**: Centralized error creation ensures:
- Consistent error codes
- Standardized error messages
- Better error tracking and debugging
- Type-safe error handling

**Examples**:

```typescript
// ❌ Bad - Manual error creation
throw new Error("Trip not found");
const error = new Error("Invalid participant ID");

// ✅ Good - Using error factory
import { createAppError } from "@utils/errors";

throw createAppError("TRIP_NOT_FOUND", "Trip not found");
const error = createAppError("INVALID_PARTICIPANT", "Invalid participant ID");
```

**Exceptions**: Test files can create errors directly for testing purposes. The rule automatically skips files in `__tests__` directories or with `.test.` in the filename.

## Current Status

As of the latest lint run:

- ✅ **0 error-level violations** - All critical architecture boundaries respected
- ⚠️ **88 warning-level violations** - Code quality improvements identified:
  - 86 instances of manual error creation (can be refactored to use `createAppError`)
  - 2 instances of inline FX conversions (already centralized, warnings expected)

## Running the Rules

```bash
# Check for violations
npm run lint

# Auto-fix what can be auto-fixed (formatting issues)
npm run lint -- --fix

# Check specific file
npm run lint -- src/modules/expenses/service/ExpenseService.ts
```

## CI Integration

These rules run automatically in the CI pipeline and will:
- **Block merges** if error-level rules are violated
- **Report warnings** for code quality improvements (non-blocking)

## Disabling Rules

If you need to disable a rule for a specific line (rare cases only):

```typescript
// eslint-disable-next-line architecture/no-manual-error-creation
throw new Error("This is an exceptional case");
```

**Important**: Disabled rules require code review justification.

## Adding New Rules

To add a new architecture rule:

1. Create a new rule file in `eslint-rules/` (e.g., `no-something.js`)
2. Follow the existing rule structure (see templates in existing files)
3. Export the rule in `eslint-rules/index.js`
4. Add the rule to `eslint.config.js` with appropriate severity
5. Document the rule in this README
6. Test the rule works as expected

## Rule Development

Each rule file exports an ESLint rule object with:

```javascript
module.exports = {
  meta: {
    type: "problem" | "suggestion",
    docs: { description, category, recommended },
    messages: { messageId: "Error message template" },
    schema: [], // For rule options
  },
  create(context) {
    // Return AST visitor methods
    return {
      ImportDeclaration(node) {
        // Check for violations
        if (violatesRule) {
          context.report({
            node,
            messageId: "messageId",
          });
        }
      },
    };
  },
};
```

See existing rules for complete examples.
