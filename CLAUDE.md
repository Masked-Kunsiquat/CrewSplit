# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: CrewSplit

A deterministic, family-focused trip expense-splitting app built with Expo (React Native). The project emphasizes **deterministic math**, **local-first architecture**, and **zero friction UX**.

## Essential Commands

### Development

```bash
npm start                 # Start Expo development server
npm run android           # Run on Android
npm run ios              # Run on iOS
```

### Testing

```bash
npm test                 # Run all tests
npm test -- <pattern>    # Run tests matching pattern (e.g., "settlement")
npm test -- --watch      # Run tests in watch mode
```

### Type Checking & Linting

```bash
npm run type-check       # TypeScript compilation check (tsc --noEmit)
npm run lint             # ESLint
```

### Database Migrations

```bash
npx drizzle-kit generate # Generate migration files from schema changes
# Migrations auto-apply at app startup via useDbMigrations() hook
# NEVER manually wipe database - use proper migrations for schema changes
```

## Architecture Principles

### 1. Agent-Based Role System

This project uses role-based agent coordination (see [AGENTS.md](AGENTS.md)). When working on code, identify which agent role applies:

- **SYSTEM ARCHITECT**: Schema, data model, module structure
- **MODELER**: Pure math functions (settlement calculations)
- **UI/UX ENGINEER**: Screens, components, user flows
- **LOCAL DATA ENGINEER**: Database, repositories, persistence
- **SETTLEMENT INTEGRATION ENGINEER**: Connecting math to data layer
- **DISPLAY INTEGRATION ENGINEER**: Display currency conversions
- **QA + TESTING ENGINEER**: Test coverage, edge cases
- **DOCUMENTATION ENGINEER**: Documentation maintenance

Label files/functions with the responsible agent role in header comments.

### 2. Module Colocation Pattern

Each domain module is **fully colocated** under `src/modules/<domain>/`:

```
src/modules/expenses/
├── repository/          # Database access (LOCAL DATA ENGINEER)
├── hooks/              # React hooks (UI integration)
├── screens/            # UI screens (UI/UX ENGINEER)
├── types.ts            # Domain types
└── __tests__/          # Tests
```

**Never** scatter related code across different top-level directories.

### 3. Settlement Module: Three-Layer Architecture

The settlement module has strict layer separation:

**Layer 1 - Pure Math (MODELER)**

- `normalize-shares.ts`, `calculate-balances.ts`, `optimize-settlements.ts`
- Pure functions with **zero dependencies**
- Same inputs → same outputs (deterministic)
- All amounts in cents (integer math)

**Layer 2 - Service (SETTLEMENT INTEGRATION ENGINEER)**

- `service/SettlementService.ts` - Loads data and calls pure functions
- `service/DisplayCurrencyAdapter.ts` - Purely visual currency conversion
- **Operates exclusively on `convertedAmountMinor` (trip currency)**

**Layer 3 - Hooks (UI INTEGRATION)**

- `hooks/use-settlement.ts` - Basic settlement data
- `hooks/use-settlement-with-display.ts` - With display currency

**Critical Rules**:

- Display currency conversions are **purely visual** - never modify underlying data
- All calculations derive from source data; no "magical totals"
- Settlement math must remain auditable and reproducible

### 4. Multi-Currency Data Model

**Schema structure**:

- **Trip**: Has single `currency` (trip currency)
- **Expense**: Stores both original and converted amounts:
  - `originalCurrency` + `originalAmountMinor` (as entered)
  - `convertedAmountMinor` (normalized to trip currency)
  - `fxRateToTrip` (null if same currency)
  - `amount` (legacy, equals `convertedAmountMinor`)

**Repository rules**:

- Repositories enforce currency conversion on write
- If expense currency matches trip currency: `fxRateToTrip = null`, `convertedAmountMinor = originalAmountMinor`
- If different: `fxRateToTrip` required, `convertedAmountMinor = round(originalAmountMinor * fxRateToTrip)`

**Settlement rules**:

- Settlement engine **only uses** `convertedAmountMinor`
- Display currency is applied **after** settlement calculation

## TypeScript Path Aliases

```typescript
import { useTrips } from "@modules/trips"; // src/modules/trips
import { Button } from "@ui/components"; // src/ui/components
import { db } from "@db/client"; // src/db/client
import { formatCents } from "@utils/currency"; // src/utils/currency
```

## Testing Strategy

### Test Organization

```
src/modules/settlement/__tests__/
├── normalize-shares.test.ts       # Unit: split type conversions
├── calculate-balances.test.ts     # Unit: balance calculations
├── optimize-settlements.test.ts   # Unit: transaction minimization
├── integration.test.ts            # Integration: end-to-end settlement
└── display-currency-adapter.test.ts # Unit: display conversions
```

### Key Testing Principles

1. **Determinism**: Same data must always produce same output
2. **Edge cases**: Zero amounts, missing participants, single-participant trips
3. **Conservation**: Net positions sum to zero, total paid equals total owed
4. **Rounding**: Verify cent distribution (largest remainder method)
5. **Integer math**: All amounts in cents (avoid floating-point errors)

### Running Specific Tests

```bash
npm test -- settlement              # All settlement tests
npm test -- normalize-shares        # Specific test file
npm test -- --testNamePattern="should handle equal splits"  # Specific test
```

## Database & Migrations

### Schema Location

All schemas in `src/db/schema/`:

- `trips.ts`, `participants.ts`, `expenses.ts`, `expense-splits.ts`
- Export from `src/db/schema/index.ts`

### Migration Workflow

1. Modify schema files in `src/db/schema/`
2. Generate migration: `npx drizzle-kit generate`
3. Review generated SQL in `src/db/migrations/NNNN_*.sql`
4. Update `src/db/migrations/migrations.js` with new migration content
5. Test locally with existing data
6. Commit migration files + schema changes together
7. Migrations run automatically on app startup via `useDbMigrations()` hook

**Critical Rules:**

- NEVER wipe database in production code
- Prefer additive changes (new nullable columns, new tables)
- Avoid dropping columns with user data
- Test migrations with realistic data before shipping
- See `src/db/migrations/README.md` for safe patterns

### Repository Pattern

Each module has a repository under `src/modules/<domain>/repository/`:

- Use Drizzle ORM for queries
- Wrap multi-step operations in `db.transaction()`
- Use mappers (`src/db/mappers/`) to convert DB rows to domain types

## UI Components & Theming

### Theme Tokens

Located in `src/ui/tokens/`:

- `colors.ts` - Dark-mode-first color palette
- `spacing.ts` - Consistent spacing scale
- `typography.ts` - Font sizes and weights

Import via: `import { theme } from '@ui/theme';`

### Component Structure

```typescript
// Example component structure
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@ui/theme';

export function MyComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
});
```

## Common Gotchas

### 1. Edge Case: No Participants

When `participants.length === 0` but expenses exist, `SettlementService` must:

- Return actual `totalExpenses` (not zero)
- Skip settlements (return empty arrays)
- Preserve data for auditing

### 2. Performance: Avoid Unnecessary Queries

Check for missing participants **before** loading expense splits to avoid wasted database queries on low-end devices.

### 3. Deterministic Sorting

Always sort by ID for determinism:

```typescript
balances.sort((a, b) => a.participantId.localeCompare(b.participantId));
```

### 4. Cent Rounding

Use largest remainder method to distribute remainder cents:

```typescript
// Floor all amounts first
const baseAmounts = shares.map((share) => Math.floor(share * total));
const remainder = total - baseAmounts.reduce((sum, amt) => sum + amt, 0);

// Distribute remainder to participants with largest fractional parts
// (see normalize-shares.ts for full implementation)
```

### 5. Never Silently Fail

Always throw structured errors with codes:

```typescript
const error = new Error("Invalid participant IDs") as Error & { code: string };
error.code = "INVALID_PARTICIPANT_IDS";
throw error;
```

## File Naming Conventions

- **Functions**: `verbNoun` (e.g., `calculateBalances`, `normalizeShares`)
- **Components**: `PascalCase` (e.g., `TripCard`, `AddExpenseScreen`)
- **Files**: `kebab-case` (e.g., `use-settlement.ts`, `expense-splits.ts`)

## Project Roadmap

See [NEXT_UP.md](NEXT_UP.md) for implementation steps. Current status:

- ✅ Steps 1-4: Project structure, schema, math engine, UI scaffolding
- ✅ Step 5: Migration infrastructure
- ✅ Step 6: Repositories and hooks
- ✅ Step 7: Settlement integration (SettlementService)
- ✅ Step 8: Display currency adapter
- ⏳ Step 9: Settlement UI integration (next)

## Key Project Goals

1. **Deterministic**: Same inputs always produce same outputs
2. **Local-first**: Fully functional offline
3. **Auditable**: Every calculated value traceable to source data
4. **Zero friction**: Minimal input, autofill, tap-to-toggle
5. **Performance**: Must run smoothly on entry-level Android devices

When in doubt, consult [AGENTS.md](AGENTS.md) for role-specific responsibilities and [NEXT_UP.md](NEXT_UP.md) for current implementation priorities.
