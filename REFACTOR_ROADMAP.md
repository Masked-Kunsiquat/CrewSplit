# Post-MVP Hardening Roadmap

This document contains GitHub issues for the post-MVP codebase hardening initiative. Issues are organized into milestones for systematic execution.

---

## Milestone 1: Quick Wins (High Leverage, Low Effort)

**Goal:** Fix critical boundary violations and prevent immediate drift
**Estimated Time:** 1-2 days
**Priority:** Critical

### Issue #1: Create mutation hooks to replace direct repository calls in screens

**Labels:** `refactor`, `architecture`, `quick-win`
**Priority:** High
**Estimated Time:** 2-4 hours

**Problem:**
8 screen files bypass the hook abstraction layer and directly import repository functions, creating tight coupling between UI and data layer.

**Violations:**

- `src/modules/participants/screens/ParticipantDetailsScreen.tsx:22` - imports from expenses repository
- `src/modules/trips/screens/TripDashboardScreen.tsx:23` - direct repository access
- `src/modules/expenses/screens/AddExpenseScreen.tsx:13` - direct repository access
- `src/modules/expenses/screens/EditExpenseScreen.tsx` (likely)
- `src/modules/participants/screens/ManageParticipantsScreen.tsx` (likely)
- `src/modules/fx-rates/screens/RateListScreen.tsx` (likely)

**Solution:**
Create mutation hook wrappers in each module:

```typescript
// src/modules/expenses/hooks/use-expense-mutations.ts
export function useExpenseMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createExpense = async (data: CreateExpenseInput) => {
    setLoading(true);
    try {
      const result = await addExpense(data);
      setError(null);
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { createExpense, updateExpense, deleteExpense, loading, error };
}
```

**Tasks:**

- [ ] Create `src/modules/expenses/hooks/use-expense-mutations.ts`
- [ ] Create `src/modules/trips/hooks/use-trip-mutations.ts`
- [ ] Create `src/modules/participants/hooks/use-participant-mutations.ts`
- [ ] Update all screens to use hooks instead of direct repository imports
- [ ] Remove repository imports from screen files
- [ ] Test each screen to verify functionality unchanged

**Success Criteria:**

- [ ] Zero screen files import from `*/repository` directories
- [ ] All mutation operations go through hooks
- [ ] No behavioral changes (app works identically)

**Testing:**

- Manually test each affected screen
- Verify loading states work correctly
- Verify error handling preserves existing behavior

---

### Issue #2: Extract currency conversion logic from repository to engine layer

**Labels:** `refactor`, `architecture`, `testability`, `quick-win`
**Priority:** High
**Estimated Time:** 1-2 hours

**Problem:**
Currency conversion business logic lives in `src/modules/expenses/repository/index.ts:49-86`, making it impossible to test without database access.

**Current Code:**

```typescript
// Lines 49-86 in repository/index.ts
const computeConversion = (
  originalAmountMinor: number,
  originalCurrency: string,
  tripCurrencyCode: string,
  providedRate?: number | null,
  providedConverted?: number,
): { convertedAmountMinor: number; fxRateToTrip: number | null } => {
  // Complex business logic in data access layer
};
```

**Solution:**
Move to pure function in engine layer.

**Tasks:**

- [ ] Create `src/modules/expenses/engine/` directory
- [ ] Create `src/modules/expenses/engine/compute-conversion.ts` with pure function
- [ ] Create `src/modules/expenses/engine/__tests__/compute-conversion.test.ts`
- [ ] Write comprehensive tests (same currency, different currency, missing rate, provided conversion)
- [ ] Update repository to call pure function
- [ ] Verify existing integration tests still pass

**Implementation:**

```typescript
// src/modules/expenses/engine/compute-conversion.ts
export interface ConversionInput {
  originalAmountMinor: number;
  originalCurrency: string;
  tripCurrency: string;
  fxRate?: number | null;
  providedConverted?: number;
}

export interface ConversionResult {
  convertedAmountMinor: number;
  fxRateToTrip: number | null;
}

export function computeExpenseConversion(
  input: ConversionInput,
): ConversionResult {
  if (input.originalCurrency === input.tripCurrency) {
    return {
      convertedAmountMinor: input.originalAmountMinor,
      fxRateToTrip: null,
    };
  }

  if (input.fxRate == null) {
    throw createAppError(
      "MISSING_FX_RATE",
      `Exchange rate required for ${input.originalCurrency} → ${input.tripCurrency}`,
    );
  }

  const converted =
    input.providedConverted ??
    Math.round(input.originalAmountMinor * input.fxRate);
  return {
    convertedAmountMinor: converted,
    fxRateToTrip: input.fxRate,
  };
}
```

**Success Criteria:**

- [ ] Conversion logic is pure function with zero dependencies
- [ ] 100% test coverage on conversion logic
- [ ] Repository simplified to orchestration only
- [ ] All existing tests pass

---

### Issue #3: Centralize FX conversion utility and enforce single usage pattern

**Labels:** `refactor`, `duplication`, `quick-win`
**Priority:** High
**Estimated Time:** 1 hour

**Problem:**
`Math.round(amount * fxRate)` pattern duplicated in 6+ locations, risking logic drift.

**Locations:**

1. `src/utils/currency.ts:144` - exists but underused
2. `src/modules/settlements/service/DisplayCurrencyAdapter.ts:85`
3. `src/modules/expenses/repository/index.ts:79`
4. `src/modules/settlements/repository/index.ts:97`
5. `src/modules/participants/screens/ParticipantDetailsScreen.tsx:221, 249, 285-287`
6. `src/modules/expenses/screens/ExpenseDetailsScreen.tsx:209, 516`

**Solution:**
Create single utility and replace all usages.

**Tasks:**

- [ ] Create `src/utils/conversion.ts` (or enhance existing `currency.ts`)
- [ ] Define `convertCurrency(amountMinor: number, fxRate: number): number`
- [ ] Add JSDoc with deterministic rounding guarantee
- [ ] Replace all 6+ inline conversions with utility call
- [ ] Add unit tests for edge cases (negative amounts, large numbers, zero rate)
- [ ] Optional: Add ESLint rule to prevent future inline conversions

**Implementation:**

```typescript
// src/utils/conversion.ts
/**
 * Converts an amount between currencies using a given exchange rate.
 * Uses Math.round() for deterministic rounding to nearest cent.
 *
 * @param amountMinor Amount in minor units (cents)
 * @param fxRate Exchange rate (fromCurrency / toCurrency)
 * @returns Converted amount in minor units
 *
 * @example
 * convertCurrency(1000, 1.1) // 1100 (€10.00 → $11.00)
 * convertCurrency(333, 3) // 999 (rounds 999)
 */
export function convertCurrency(amountMinor: number, fxRate: number): number {
  return Math.round(amountMinor * fxRate);
}
```

**ESLint Rule (Optional):**

```js
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.object.name="Math"][callee.property.name="round"] BinaryExpression[operator="*"]',
      message: 'Use convertCurrency() from @utils/conversion instead of inline Math.round(amount * rate)',
    },
  ],
}
```

**Success Criteria:**

- [ ] Single source of truth for currency conversion
- [ ] All 6+ locations updated to use utility
- [ ] Tests verify deterministic rounding behavior
- [ ] Optional: ESLint prevents future violations

---

### Issue #4: Add named constants for epsilon values in settlement engine

**Labels:** `refactor`, `clarity`, `quick-win`
**Priority:** Medium
**Estimated Time:** 15 minutes

**Problem:**
Magic numbers for floating-point tolerance scattered in `normalize-shares.ts`.

**Current Code:**

```typescript
// Line 109-110
const tolerance = 0.01 + Number.EPSILON * 100;

// Line 130, 171
if (Math.abs(a.fraction - b.fraction) < 0.0000001) { ... }
```

**Solution:**
Replace with named constants.

**Tasks:**

- [ ] Define constants at top of `src/modules/settlements/engine/normalize-shares.ts`
- [ ] Replace all usages
- [ ] Add JSDoc explaining why these values are chosen

**Implementation:**

```typescript
// src/modules/settlements/engine/normalize-shares.ts

/**
 * Tolerance for percentage sum validation.
 * Allows for 99.99% to 100.01% to account for floating-point precision.
 */
const PERCENTAGE_SUM_TOLERANCE = 0.01 + Number.EPSILON * 100;

/**
 * Epsilon for fractional part equality comparison.
 * Used when sorting by remainder for fair cent distribution.
 */
const FRACTION_EQUALITY_EPSILON = 0.0000001;

// Usage:
if (Math.abs(totalPercentage - 100) > PERCENTAGE_SUM_TOLERANCE) { ... }
if (Math.abs(a.fraction - b.fraction) < FRACTION_EQUALITY_EPSILON) { ... }
```

**Success Criteria:**

- [ ] All magic numbers replaced with named constants
- [ ] Constants documented with rationale
- [ ] All tests still pass

---

## Milestone 2: Service Layer & Architecture (Medium Leverage, Medium Effort)

**Goal:** Establish consistent service layer pattern across modules
**Estimated Time:** 3-4 days
**Priority:** High

### Issue #5: Create ExpenseService to separate orchestration from repository

**Labels:** `refactor`, `architecture`, `service-layer`
**Priority:** High
**Estimated Time:** 4-6 hours

**Problem:**
Expenses module lacks service layer. Business logic is embedded in repository, making it hard to test and reuse.

**Current Architecture:**

```
expenses/
├── repository/    ❌ Contains business logic
├── hooks/         ✅ Good
└── screens/       ✅ Good
```

**Target Architecture:**

```
expenses/
├── engine/        ✅ Pure logic (NEW)
├── service/       ✅ Orchestration (NEW)
├── repository/    ✅ CRUD only (SIMPLIFIED)
├── hooks/         ✅ Use service
└── screens/       ✅ Use hooks
```

**Tasks:**

- [ ] Create `src/modules/expenses/service/ExpenseService.ts`
- [ ] Implement `createExpense(data, deps?)` with dependency injection
- [ ] Implement `updateExpense(id, data, deps?)`
- [ ] Implement `deleteExpense(id, deps?)`
- [ ] Move trip currency lookup from repository to service
- [ ] Simplify repository to pure CRUD operations
- [ ] Update hooks to call service instead of repository
- [ ] Create `src/modules/expenses/service/__tests__/ExpenseService.test.ts`
- [ ] Write tests with mocked dependencies

**Implementation:**

```typescript
// src/modules/expenses/service/ExpenseService.ts
import { computeExpenseConversion } from "../engine/compute-conversion";
import * as ExpenseRepository from "../repository";
import { getTrip } from "@modules/trips/repository";

export interface ExpenseServiceDependencies {
  expenseRepository?: typeof ExpenseRepository;
  tripRepository?: { getTrip: typeof getTrip };
}

export async function createExpense(
  data: CreateExpenseInput,
  deps: ExpenseServiceDependencies = {},
): Promise<Expense> {
  const expenseRepo = deps.expenseRepository ?? ExpenseRepository;
  const tripRepo = deps.tripRepository ?? { getTrip };

  // Load trip to get currency
  const trip = await tripRepo.getTrip(data.tripId);
  if (!trip) {
    throw createAppError("TRIP_NOT_FOUND", `Trip ${data.tripId} not found`);
  }

  // Compute conversion using pure function
  const conversion = computeExpenseConversion({
    originalAmountMinor: data.originalAmountMinor,
    originalCurrency: data.originalCurrency,
    tripCurrency: trip.currency,
    fxRate: data.fxRateToTrip,
  });

  // Call repository with computed data
  return expenseRepo.addExpense({
    ...data,
    convertedAmountMinor: conversion.convertedAmountMinor,
    fxRateToTrip: conversion.fxRateToTrip,
  });
}

export async function updateExpense(
  expenseId: string,
  data: UpdateExpenseInput,
  deps: ExpenseServiceDependencies = {},
): Promise<Expense> {
  // Similar pattern
}

export async function deleteExpense(
  expenseId: string,
  deps: ExpenseServiceDependencies = {},
): Promise<void> {
  const expenseRepo = deps.expenseRepository ?? ExpenseRepository;
  await expenseRepo.deleteExpense(expenseId);
}
```

**Testing:**

```typescript
// src/modules/expenses/service/__tests__/ExpenseService.test.ts
describe('ExpenseService.createExpense', () => {
  test('converts currency using trip currency', async () => {
    const mockGetTrip = jest.fn().mockResolvedValue({
      id: 'trip1',
      currency: 'USD'
    });
    const mockAddExpense = jest.fn().mockResolvedValue({ id: 'exp1' });

    await createExpense(
      {
        tripId: 'trip1',
        originalAmountMinor: 1000,
        originalCurrency: 'EUR',
        fxRateToTrip: 1.1,
      },
      {
        tripRepository: { getTrip: mockGetTrip },
        expenseRepository: { addExpense: mockAddExpense },
      }
    );

    expect(mockAddExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        convertedAmountMinor: 1100,
        fxRateToTrip: 1.1,
      })
    );
  });

  test('throws error if trip not found', async () => {
    const mockGetTrip = jest.fn().mockResolvedValue(null);

    await expect(
      createExpense(
        { tripId: 'invalid', ... },
        { tripRepository: { getTrip: mockGetTrip } }
      )
    ).rejects.toThrow('TRIP_NOT_FOUND');
  });
});
```

**Success Criteria:**

- [ ] Service layer created with dependency injection
- [ ] Repository simplified to CRUD only
- [ ] Hooks use service instead of repository
- [ ] Service has >80% test coverage with mocked deps
- [ ] All existing integration tests pass

---

### Issue #6: Create TripService for multi-step trip operations

**Labels:** `refactor`, `architecture`, `service-layer`
**Priority:** Medium
**Estimated Time:** 3-4 hours

**Problem:**
Trip-related business logic scattered between screens and repository.

**Solution:**
Create service layer for trip operations that span multiple modules.

**Tasks:**

- [ ] Create `src/modules/trips/service/TripService.ts`
- [ ] Implement `createTrip(data, deps?)`
- [ ] Implement `updateTrip(id, data, deps?)`
- [ ] Implement `deleteTrip(id, deps?)` - should handle cascade delete of expenses/participants
- [ ] Implement `duplicateTrip(id, deps?)` if this feature exists
- [ ] Update hooks to use service
- [ ] Write tests with mocked dependencies

**Implementation:**

```typescript
// src/modules/trips/service/TripService.ts
export async function deleteTrip(
  tripId: string,
  deps: TripServiceDependencies = {},
): Promise<void> {
  const tripRepo = deps.tripRepository ?? TripRepository;
  const expenseRepo = deps.expenseRepository ?? ExpenseRepository;
  const participantRepo = deps.participantRepository ?? ParticipantRepository;

  // Validate trip exists
  const trip = await tripRepo.getTrip(tripId);
  if (!trip) {
    throw createAppError("TRIP_NOT_FOUND", `Trip ${tripId} not found`);
  }

  // Cascade delete in transaction
  await db.transaction(async (tx) => {
    await expenseRepo.deleteExpensesForTrip(tripId, tx);
    await participantRepo.deleteParticipantsForTrip(tripId, tx);
    await tripRepo.deleteTrip(tripId, tx);
  });
}
```

**Success Criteria:**

- [ ] Service layer handles multi-step operations
- [ ] Transaction safety for cascade operations
- [ ] Hooks use service instead of repository
- [ ] Tests verify proper orchestration

---

### Issue #7: Centralize error handling with domain-specific factories

**Labels:** `refactor`, `duplication`, `error-handling`
**Priority:** Medium
**Estimated Time:** 4-6 hours

**Problem:**
Manual error construction pattern duplicated in 20+ files. Existing `src/utils/errors.ts` utility underutilized.

**Current Pattern (Bad):**

```typescript
// Repeated 20+ times
const error = new Error(...) as Error & { code: string };
error.code = "SOME_ERROR_CODE";
throw error;
```

**Solution:**
Create domain-specific error factories and replace all manual constructions.

**Tasks:**

- [ ] Enhance `src/utils/errors.ts` with domain error factories
- [ ] Create `createFxRateError(code, fromCurrency, toCurrency)`
- [ ] Create `createValidationError(code, field, details)`
- [ ] Create `createNotFoundError(code, resourceType, resourceId)`
- [ ] Find all manual error constructions (search for `as Error & { code:`)
- [ ] Replace with factory calls
- [ ] Ensure all error codes are consistent

**Implementation:**

```typescript
// src/utils/errors.ts (enhance existing)

export function createFxRateError(
  code: "MISSING_FX_RATE" | "STALE_FX_RATE" | "FX_CACHE_NOT_INITIALIZED",
  fromCurrency: string,
  toCurrency: string,
  details?: Record<string, unknown>,
): AppError<typeof code> {
  return createAppError(
    code,
    `Exchange rate error: ${fromCurrency} → ${toCurrency}`,
    {
      fromCurrency,
      toCurrency,
      ...details,
    },
  );
}

export function createValidationError<Code extends string>(
  code: Code,
  field: string,
  message: string,
  details?: Record<string, unknown>,
): AppError<Code> {
  return createAppError(code, message, {
    field,
    ...details,
  });
}

export function createNotFoundError<Code extends string>(
  code: Code,
  resourceType: string,
  resourceId: string,
): AppError<Code> {
  return createAppError(code, `${resourceType} not found: ${resourceId}`, {
    resourceType,
    resourceId,
  });
}
```

**Usage:**

```typescript
// Before:
const error = new Error(`No rate available for ${from} → ${to}`) as Error & {
  code: string;
  fromCurrency: string;
  toCurrency: string;
};
error.code = "NO_RATE_AVAILABLE";
error.fromCurrency = from;
error.toCurrency = to;
throw error;

// After:
throw createFxRateError("NO_RATE_AVAILABLE", from, to);
```

**Files to Update:**

- `src/modules/fx-rates/provider/cached-fx-rate-provider.ts` (multiple locations)
- `src/modules/settlements/repository/index.ts` (2 locations)
- `src/modules/settlements/engine/calculate-balances.ts` (2 locations)
- `src/modules/expenses/repository/index.ts`
- `src/modules/statistics/service/StatisticsService.ts`
- 15+ more files

**Success Criteria:**

- [ ] All error factories implemented
- [ ] All manual error constructions replaced
- [ ] Error codes consistent across codebase
- [ ] Error metadata (fromCurrency, field, etc.) preserved

---

### Issue #8: Replace singleton FxRateProvider with React Context

**Labels:** `refactor`, `architecture`, `testability`
**Priority:** Medium
**Estimated Time:** 2-3 hours

**Problem:**
`cachedFxRateProvider` exported as singleton creates global mutable state, making testing difficult.

**Current Code:**

```typescript
// src/modules/fx-rates/provider/cached-fx-rate-provider.ts:326
export const cachedFxRateProvider = new CachedFxRateProvider();
```

**Solution:**
Use React Context for dependency injection.

**Tasks:**

- [ ] Remove singleton export from `cached-fx-rate-provider.ts`
- [ ] Create `src/modules/fx-rates/context/FxRateContext.tsx`
- [ ] Initialize provider in `app/_layout.tsx`
- [ ] Update all usages to consume from context
- [ ] Update tests to provide mock context

**Implementation:**

```typescript
// src/modules/fx-rates/context/FxRateContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { CachedFxRateProvider } from '../provider/cached-fx-rate-provider';

const FxRateContext = createContext<CachedFxRateProvider | null>(null);

export function useFxRateProvider(): CachedFxRateProvider {
  const provider = useContext(FxRateContext);
  if (!provider) {
    throw new Error('useFxRateProvider must be used within FxRateProvider');
  }
  return provider;
}

interface FxRateProviderProps {
  children: ReactNode;
  provider?: CachedFxRateProvider; // For testing
}

export function FxRateProvider({ children, provider }: FxRateProviderProps) {
  // Use provided instance (for tests) or create singleton
  const [providerInstance] = useState(() => provider ?? new CachedFxRateProvider());

  useEffect(() => {
    providerInstance.initialize();
  }, [providerInstance]);

  return (
    <FxRateContext.Provider value={providerInstance}>
      {children}
    </FxRateContext.Provider>
  );
}
```

```typescript
// app/_layout.tsx
import { FxRateProvider } from '@modules/fx-rates/context/FxRateContext';

export default function RootLayout() {
  return (
    <FxRateProvider>
      {/* existing app tree */}
    </FxRateProvider>
  );
}
```

**Success Criteria:**

- [ ] No singleton export (only export class)
- [ ] Context provides instance
- [ ] All consumers use `useFxRateProvider()` hook
- [ ] Tests can inject mock provider

---

## Milestone 3: Centralization & Standards (Medium Leverage)

**Goal:** Eliminate duplication and establish coding standards
**Estimated Time:** 2-3 days
**Priority:** Medium

### Issue #9: Create centralized validation utilities

**Labels:** `refactor`, `duplication`, `validation`
**Priority:** Medium
**Estimated Time:** 2-3 hours

**Problem:**
Percentage validation logic duplicated with inconsistent tolerances:

- `expenses/utils/validate-splits.ts:90` - `< 0.01`
- `settlements/engine/normalize-shares.ts:109` - `> (0.01 + EPSILON)`
- `expenses/utils/build-expense-splits.ts:120` - `>= 0.01`

**Solution:**
Single source of truth for validation logic.

**Tasks:**

- [ ] Create `src/utils/validation.ts`
- [ ] Define `PERCENTAGE_TOLERANCE` constant
- [ ] Implement `isValidPercentageSum(total: number): boolean`
- [ ] Implement `parseFiniteNumber(value: string | number): number | null`
- [ ] Implement `isValidWeight(weight: number): boolean`
- [ ] Replace all duplicated validation logic
- [ ] Write comprehensive tests

**Implementation:**

```typescript
// src/utils/validation.ts

/** Tolerance for percentage sum validation (allows 99.99 - 100.01) */
export const PERCENTAGE_TOLERANCE = 0.01 + Number.EPSILON * 100;

/**
 * Validates that a percentage sum is approximately 100%.
 * Allows small floating-point precision errors.
 */
export function isValidPercentageSum(total: number): boolean {
  return Math.abs(total - 100) <= PERCENTAGE_TOLERANCE;
}

/**
 * Safely parses a number from string or number input.
 * Returns null if not a finite number.
 */
export function parseFiniteNumber(value: string | number): number | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
}

/**
 * Validates that a weight is positive and finite.
 */
export function isValidWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight > 0;
}
```

**Success Criteria:**

- [ ] Single source of truth for validation
- [ ] Consistent tolerance values
- [ ] All duplicated logic replaced
- [ ] Tests verify edge cases

---

### Issue #10: Create centralized formatting utilities

**Labels:** `refactor`, `duplication`, `formatting`
**Priority:** Low
**Estimated Time:** 2-3 hours

**Problem:**
`toFixed()` calls scattered across 12+ UI files with varying decimal places.

**Solution:**
Centralized formatters with consistent precision.

**Tasks:**

- [ ] Create `src/utils/formatting.ts`
- [ ] Implement `formatFxRate(rate: number): string` (4 decimals)
- [ ] Implement `formatPercentage(pct: number): string` (1 decimal)
- [ ] Implement `formatAmount(minor: number, currency: string): string` (2 decimals)
- [ ] Replace all scattered `toFixed()` calls
- [ ] Write snapshot tests for formatting consistency

**Implementation:**

```typescript
// src/utils/formatting.ts

/**
 * Formats an exchange rate with 4 decimal places.
 * Example: 1.1234
 */
export function formatFxRate(rate: number): string {
  return rate.toFixed(4);
}

/**
 * Formats a percentage with 1 decimal place.
 * Example: "33.3%"
 */
export function formatPercentage(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

/**
 * Formats an amount in minor units to display with currency.
 * Example: formatAmount(1234, "USD") => "USD 12.34"
 */
export function formatAmount(minor: number, currency: string): string {
  const major = (minor / 100).toFixed(2);
  return `${currency} ${major}`;
}

/**
 * Formats an amount for input fields (no currency prefix).
 * Example: formatAmountInput(1234) => "12.34"
 */
export function formatAmountInput(minor: number): string {
  return (minor / 100).toFixed(2);
}
```

**Success Criteria:**

- [ ] Centralized formatting utilities
- [ ] All `toFixed()` calls replaced (except in utilities)
- [ ] Consistent decimal places across app
- [ ] Snapshot tests verify formatting

---

### Issue #11: Add JSDoc contracts to public APIs

**Labels:** `documentation`, `maintainability`
**Priority:** Medium
**Estimated Time:** 4-6 hours

**Problem:**
Functions lack documented preconditions, postconditions, and invariants.

**Solution:**
Add comprehensive JSDoc to all public functions.

**Tasks:**

- [ ] Document settlement engine functions (preconditions, postconditions, invariants)
- [ ] Document service layer contracts (what throws, what returns null)
- [ ] Document repository functions (transaction behavior, error cases)
- [ ] Document utility functions (determinism guarantees, edge cases)

**Template:**

```typescript
/**
 * Normalizes expense splits to absolute amounts.
 *
 * @param splits - Array of expense splits (must be non-empty)
 * @param totalAmountMinor - Total expense amount in cents
 *
 * @precondition splits.length > 0
 * @precondition All splits have matching splitType
 * @precondition For percentage splits: sum must equal 100 ± 0.01
 * @precondition For weight splits: all weights must be positive
 * @precondition For amount splits: sum must equal totalAmountMinor
 *
 * @postcondition Returned amounts sum exactly to totalAmountMinor
 * @postcondition All amounts are non-negative integers
 * @postcondition Order matches input order (stable)
 *
 * @throws {Error} MIXED_SHARE_TYPES - If splits have different types
 * @throws {Error} INVALID_PERCENTAGE_SUM - If percentages don't sum to ~100
 * @throws {Error} INVALID_WEIGHT - If any weight is non-positive
 * @throws {Error} AMOUNT_MISMATCH - If amounts don't sum to total
 *
 * @returns Array of splits with normalized amounts (in cents)
 *
 * @example
 * const splits = [
 *   { participantId: 'p1', splitType: 'percentage', share: 50 },
 *   { participantId: 'p2', splitType: 'percentage', share: 50 },
 * ];
 * const result = normalizeShares(splits, 1000);
 * // result[0].amount === 500
 * // result[1].amount === 500
 */
export function normalizeShares(
  splits: ExpenseSplit[],
  totalAmountMinor: number,
): ExpenseSplit[] {
  // ...
}
```

**Priority Functions:**

- `normalizeShares()`
- `calculateBalances()`
- `optimizeSettlements()`
- `computeExpenseConversion()`
- `convertCurrency()`
- All service layer functions

**Success Criteria:**

- [ ] All public engine functions documented
- [ ] All service functions documented
- [ ] Preconditions and postconditions explicit
- [ ] Error conditions documented

---

## Milestone 4: Architecture Enforcement (Long-Term)

**Goal:** Prevent regressions through automation
**Estimated Time:** 2-3 days
**Priority:** Medium

### Issue #12: Restrict module exports to public APIs only

**Labels:** `refactor`, `architecture`, `encapsulation`
**Priority:** Medium
**Estimated Time:** 1 hour

**Problem:**
Module index files export repositories, allowing consumers to bypass intended abstractions.

**Current:**

```typescript
// src/modules/expenses/index.ts
export * from "./repository"; // ❌ Exposes internal implementation
```

**Solution:**
Only export public API (types, hooks, constants).

**Tasks:**

- [ ] Update `src/modules/expenses/index.ts` - remove repository export
- [ ] Update `src/modules/trips/index.ts` - remove repository export
- [ ] Update `src/modules/participants/index.ts` - remove repository export
- [ ] Update `src/modules/settlements/index.ts` - verify only exports types, hooks, service
- [ ] Verify no broken imports (should be fixed by Issue #1)

**Implementation:**

```typescript
// src/modules/expenses/index.ts
export * from "./types";
export * from "./hooks";
export * from "./constants";
// export * from './repository'; ❌ REMOVED
// export * from './service';     ❌ REMOVED (internal only)
```

**Success Criteria:**

- [ ] Only types, hooks, and constants exported from modules
- [ ] Repositories and services are internal implementation details
- [ ] No broken imports (all consumers use hooks)

---

### Issue #13: Add ESLint rules to enforce architecture boundaries

**Labels:** `tooling`, `architecture`, `enforcement`
**Priority:** Medium
**Estimated Time:** 3-4 hours

**Problem:**
No automated enforcement of architecture rules. Violations must be caught in code review.

**Solution:**
ESLint rules to prevent common violations.

**Tasks:**

- [ ] Install `eslint-plugin-import` if not already installed
- [ ] Add rule: Screens cannot import from repositories
- [ ] Add rule: Engine cannot import from service/repository/hooks
- [ ] Add rule: Prevent inline `Math.round(amount * rate)` pattern
- [ ] Add rule: Enforce error factory usage (ban manual error code assignment)
- [ ] Run linter on entire codebase
- [ ] Fix any violations
- [ ] Add to CI pipeline

**Implementation:**

```js
// .eslintrc.js
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules

    // Prevent screens from importing repositories
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/repository", "**/repository/*"],
            message:
              "Screens should use hooks instead of importing repositories directly",
          },
          {
            group: ["@modules/*/repository", "@modules/*/repository/*"],
            message:
              "Screens should use hooks instead of importing repositories directly",
          },
        ],
      },
    ],

    // Prevent inline FX conversions
    "no-restricted-syntax": [
      "error",
      {
        selector:
          'CallExpression[callee.object.name="Math"][callee.property.name="round"] BinaryExpression[operator="*"]',
        message:
          "Use convertCurrency() from @utils/conversion instead of inline Math.round(amount * rate)",
      },
      {
        selector:
          'AssignmentExpression[left.property.name="code"][right.type="Literal"]',
        message:
          "Use error factories from @utils/errors instead of manual error.code assignment",
      },
    ],
  },

  overrides: [
    {
      // Engine layer restrictions
      files: ["src/modules/*/engine/**/*.ts", "src/modules/*/engine/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["**/repository"],
                message: "Engine layer cannot import repositories",
              },
              {
                group: ["**/service"],
                message: "Engine layer cannot import services",
              },
              {
                group: ["**/hooks"],
                message: "Engine layer cannot import hooks",
              },
              {
                group: ["react", "react-native"],
                message: "Engine layer must be framework-agnostic",
              },
              {
                group: ["@db/*"],
                message: "Engine layer cannot import database",
              },
            ],
          },
        ],
      },
    },
  ],
};
```

**Success Criteria:**

- [ ] ESLint rules enforce architecture boundaries
- [ ] Rules run in CI (blocking)
- [ ] Zero violations in codebase
- [ ] Documentation explains why rules exist

---

### Issue #14: Add architecture tests with dependency-cruiser

**Labels:** `tooling`, `architecture`, `testing`
**Priority:** Low
**Estimated Time:** 4-6 hours

**Problem:**
No automated verification of layer boundaries and dependency direction.

**Solution:**
Use `dependency-cruiser` to enforce architecture rules.

**Tasks:**

- [ ] Install `dependency-cruiser`
- [ ] Create `.dependency-cruiser.js` config
- [ ] Define forbidden dependency patterns
- [ ] Add `npm run arch-test` script
- [ ] Add to CI pipeline
- [ ] Fix any violations

**Implementation:**

```js
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    // Engine layer cannot import from service/repository/hooks
    {
      name: "engine-no-service",
      from: { path: "src/modules/.*/engine/.*" },
      to: { path: "src/modules/.*/service/.*" },
      comment: "Engine layer must be pure - cannot import services",
    },
    {
      name: "engine-no-repository",
      from: { path: "src/modules/.*/engine/.*" },
      to: { path: "src/modules/.*/repository/.*" },
      comment: "Engine layer must be pure - cannot import repositories",
    },
    {
      name: "engine-no-hooks",
      from: { path: "src/modules/.*/engine/.*" },
      to: { path: "src/modules/.*/hooks/.*" },
      comment: "Engine layer must be pure - cannot import hooks",
    },
    {
      name: "engine-no-react",
      from: { path: "src/modules/.*/engine/.*" },
      to: { path: "node_modules/react" },
      comment: "Engine layer must be framework-agnostic",
    },

    // Screens cannot import repositories
    {
      name: "screen-no-repository",
      from: { path: "src/modules/.*/screens/.*" },
      to: { path: "src/modules/.*/repository/.*" },
      comment: "Screens should use hooks instead of repositories",
    },

    // No circular dependencies
    {
      name: "no-circular",
      from: {},
      to: {},
      circular: true,
      comment: "Circular dependencies are not allowed",
    },
  ],
};
```

```json
// package.json
{
  "scripts": {
    "arch-test": "dependency-cruiser --config .dependency-cruiser.js src/modules",
    "arch-test:graph": "dependency-cruiser --config .dependency-cruiser.js --output-type dot src/modules | dot -T svg > architecture-graph.svg"
  }
}
```

**Success Criteria:**

- [ ] Architecture tests pass
- [ ] Tests run in CI
- [ ] Zero violations
- [ ] Graph visualization available

---

### Issue #15: Create ARCHITECTURE.md documentation

**Labels:** `documentation`, `onboarding`
**Priority:** High
**Estimated Time:** 3-4 hours

**Problem:**
Architecture principles exist in code but not documented in single place.

**Solution:**
Comprehensive architecture guide.

**Tasks:**

- [ ] Create `docs/ARCHITECTURE.md`
- [ ] Document layer responsibilities
- [ ] Create decision tree ("where does this code go?")
- [ ] Document dependency flow rules
- [ ] Add diagrams for each module pattern
- [ ] Document gold standard (settlements module)
- [ ] Add examples of good and bad patterns
- [ ] Link from main README

**Outline:**

```markdown
# Architecture Guidelines

## Overview

- Local-first architecture
- Module colocation pattern
- Three-layer separation (engine → service → repository)

## Layer Responsibilities

| Layer      | Purpose           | Can Import From           | Cannot Import                      |
| ---------- | ----------------- | ------------------------- | ---------------------------------- |
| Engine     | Pure math/logic   | Types only                | Repository, Hooks, React, Database |
| Service    | Orchestration     | Engine, Repository, Types | Hooks, React, UI                   |
| Repository | Database access   | Database, Types           | Engine, Service, Hooks, React      |
| Hooks      | React integration | Service, Types            | Repository (use Service instead)   |
| Screens    | UI components     | Hooks, Components, Types  | Repository, Service, Database      |

## Decision Tree: Where does this code go?

[Flowchart here]

## Module Structure (Gold Standard)

settlements/
├── engine/ Pure, testable math
├── service/ Orchestration, data loading
├── repository/ Database access only
├── hooks/ React integration
├── screens/ UI components
└── **tests**/ Tests colocated with code

## Examples

### ✅ Good: Pure Engine Function

### ❌ Bad: Business Logic in Repository

### ✅ Good: Service Orchestration

### ❌ Bad: Screen Calling Repository

## Testing Strategy

## Common Pitfalls

## Migration Guide (refactoring existing modules)
```

**Success Criteria:**

- [ ] Comprehensive architecture documentation
- [ ] Clear decision tree for code placement
- [ ] Examples of good and bad patterns
- [ ] Linked from README

---

## Milestone 5: Optional Enhancements

**Goal:** Nice-to-have improvements for long-term maintainability
**Priority:** Low

### Issue #16: Add runtime invariant checks in development mode

**Labels:** `enhancement`, `testing`, `safety`
**Priority:** Low
**Estimated Time:** 2 hours

**Problem:**
Mathematical invariants (conservation laws) only verified in tests, not runtime.

**Solution:**
Add development-mode assertions.

**Tasks:**

- [ ] Add invariant checks to `calculateBalances()`
- [ ] Add invariant checks to `normalizeShares()`
- [ ] Only run in development mode (`process.env.NODE_ENV !== 'production'`)
- [ ] Log warnings instead of throwing in production

**Implementation:**

```typescript
// src/modules/settlements/engine/calculate-balances.ts
export const calculateBalances = (...): ParticipantBalance[] => {
  const balances = /* ... calculation ... */;

  // Development-only invariant checks
  if (process.env.NODE_ENV !== 'production') {
    const totalNet = balances.reduce((sum, b) => sum + b.netPosition, 0);
    if (Math.abs(totalNet) > 0) {
      console.error(
        `[INVARIANT VIOLATION] Net positions sum to ${totalNet} (expected 0)`,
        { balances }
      );
      throw new Error(`Conservation law violated: sum = ${totalNet}`);
    }
  }

  return balances;
};
```

**Success Criteria:**

- [ ] Invariants checked in development
- [ ] No performance impact in production
- [ ] Helpful error messages with debugging info

---

### Issue #17: Add floating-point usage documentation to settlement engine

**Labels:** `documentation`, `clarity`
**Priority:** Low
**Estimated Time:** 30 minutes

**Problem:**
Settlement engine uses floating-point in intermediate calculations but not documented why.

**Solution:**
Add explicit comments explaining necessity.

**Tasks:**

- [ ] Document why floating-point is unavoidable in percentage/weight splits
- [ ] Explain how determinism is maintained despite floating-point
- [ ] Link to tests that verify determinism

**Implementation:**

```typescript
// src/modules/settlements/engine/normalize-shares.ts

/**
 * IMPORTANT: Floating-point intermediate calculation
 *
 * We must use floating-point for percentage/weight splits because:
 * 1. Input percentages (e.g., 33.33%) are inherently fractional
 * 2. Direct integer division loses precision (e.g., 100 / 3 = 33, losing remainder)
 * 3. We immediately convert to integers via Math.floor() + remainder distribution
 * 4. Final result is guaranteed integer-only and sums exactly to total
 *
 * Determinism is maintained by:
 * - Stable sorting by participant ID before processing
 * - Largest remainder method for distributing leftover cents
 * - Consistent epsilon values for floating-point comparisons
 *
 * See: __tests__/integration.test.ts:615 for determinism verification
 */
const exactAmounts = splits.map((s) => (s.share / 100) * total);
const baseAmounts = exactAmounts.map(Math.floor);
// ... remainder distribution follows
```

**Success Criteria:**

- [ ] Rationale documented in code
- [ ] Links to relevant tests
- [ ] Clear explanation for future maintainers

---

### Issue #18: Create contribution guide with architecture checklist

**Labels:** `documentation`, `process`
**Priority:** Low
**Estimated Time:** 2 hours

**Problem:**
No formal checklist for contributors to ensure architecture compliance.

**Solution:**
Checklist in CONTRIBUTING.md.

**Tasks:**

- [ ] Create or enhance `CONTRIBUTING.md`
- [ ] Add architecture checklist
- [ ] Add testing requirements
- [ ] Add code review checklist
- [ ] Link to ARCHITECTURE.md

**Implementation:**

```markdown
# Contributing to CrewSplit

## Architecture Checklist

Before submitting a PR, verify:

### Code Placement

- [ ] Pure logic (math, validation, calculations) is in `engine/` directory
- [ ] Database queries are in `repository/` directory (CRUD only)
- [ ] Multi-step operations are in `service/` directory
- [ ] React state management is in `hooks/` directory
- [ ] UI rendering is in `screens/` or `components/` directory

### Dependencies

- [ ] Engine functions import only types (no repositories, services, hooks, React)
- [ ] Services use dependency injection for testability
- [ ] Screens use hooks instead of repositories
- [ ] No circular dependencies introduced

### Testing

- [ ] Pure functions have unit tests (>90% coverage)
- [ ] Service functions have tests with mocked dependencies
- [ ] Integration tests verify end-to-end behavior
- [ ] All tests pass (`npm test`)

### Code Quality

- [ ] No duplication of conversion/formatting/validation logic
- [ ] Error handling uses error factories from `@utils/errors`
- [ ] JSDoc comments on public functions (preconditions, postconditions)
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)

### Architecture Compliance

- [ ] Architecture tests pass (`npm run arch-test`)
- [ ] Module exports only public API (no repository exports)
- [ ] Follows gold standard pattern (see `settlements/` module)

## Testing Checklist

## Code Review Checklist
```

**Success Criteria:**

- [ ] Clear checklist for contributors
- [ ] Links to relevant documentation
- [ ] Used in PR template

---

## Summary

**Total Estimated Time:** 12-16 days for full roadmap

**Execution Priority:**

1. **Milestone 1** (1-2 days) - Quick wins, immediate risk reduction
2. **Milestone 2** (3-4 days) - Service layer establishment
3. **Milestone 3** (2-3 days) - Duplication elimination
4. **Milestone 4** (2-3 days) - Long-term enforcement
5. **Milestone 5** (optional) - Nice-to-have enhancements

**Success Metrics:**

- Screen → Repository violations: 8 → 0
- Business logic in repositories: 3 modules → 0
- FX conversion duplication: 6+ locations → 1 utility
- Error handling duplication: 20+ manual → centralized
- Architecture test violations: N/A → 0 (enforced)

**Breaking This Down:**

- Week 1: Milestones 1 & 2 (foundational fixes)
- Week 2: Milestone 3 (centralization)
- Week 3: Milestone 4 (enforcement) + Milestone 5 (optional)

This roadmap preserves all existing functionality while systematically improving maintainability, testability, and consistency.
