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
npm run lint -- --fix    # ESLint with auto-fix
```

### Database Migrations

```bash
npx drizzle-kit generate   # Generate migration files from schema changes
npm run verify-migrations  # Verify migrations.js matches SQL files
# Migrations auto-apply at app startup via useDbMigrations() hook
# NEVER manually wipe database - use proper migrations for schema changes
```

### Build & Release

The project uses automated GitHub workflows for versioning and releases:

1. **Version bumping**: Update `version` in both `package.json` and `app.json`
2. **Auto-tagging**: When merged to `main`, the Auto Tag workflow creates a git tag (e.g., `v1.0.3`)
3. **EAS Build**: Expo's build trigger (configured on expo.dev) starts Android APK build on new tags matching `v*`
4. **GitHub Release**: The Create Release workflow waits for EAS build completion, then creates GitHub release with APK attached

**Important**: Only version bumps trigger builds. Merging without changing version won't create tags or builds.

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

### 5. FX Rates System (Exchange Rate Caching)

**Architecture** (see `FX_DATA_FLOW_DIAGRAM.md` for details):

- **CachedFxRateProvider**: In-memory cache of exchange rates loaded from database
- **FxRateRepository**: Database access layer for fx_rates table
- **FxRateService**: Fetches rates from APIs (Frankfurter, ExchangeRate-API)
- **useFxSync**: Hook for automatic staleness checking and background refresh

**Key files**:

```
src/modules/fx-rates/
├── provider/cached-fx-rate-provider.ts    # In-memory rate cache
├── repository/                             # Database queries
├── services/fx-rate-service.ts            # API fetching
├── hooks/use-fx-sync.ts                   # Background sync
└── screens/                                # Manual rate entry UI
```

**Rate priority system**:

- Manual rates (priority 100) override API rates
- Frankfurter API (priority 50)
- ExchangeRate-API (priority 40)
- Rates stored bidirectionally (USD→EUR and EUR→USD)

**Critical rules**:

- Provider must be initialized at app startup via `cachedFxRateProvider.initialize()`
- Rates are refreshed automatically when >7 days old (staleness threshold)
- Missing rates throw `NoRateAvailableError` with fromCurrency/toCurrency
- All conversions use `Math.round()` for determinism
- Background sync runs non-blocking (doesn't block app startup)

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

### 6. React Hooks: Preventing Infinite Render Loops

**Critical**: NEVER call `setState` inside `useMemo` - it triggers infinite loops.

**Wrong**:

```typescript
const result = useMemo(() => {
  setError(null); // ❌ Causes infinite loop
  try {
    return doWork();
  } catch (e) {
    setError(e); // ❌ Causes infinite loop
    return null;
  }
}, [deps]);
```

**Right**:

```typescript
const result = useMemo(() => {
  try {
    return { data: doWork(), error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}, [deps]);

// Update state in useEffect
useEffect(() => {
  setError(result.error);
}, [result.error]);
```

**useEffect dependency arrays**:

- Include all dependencies OR use empty array `[]` for mount-only
- Avoid putting callback functions in deps (causes re-run every render)
- Use `// eslint-disable-next-line react-hooks/exhaustive-deps` sparingly and document why

## File Naming Conventions

- **Functions**: `verbNoun` (e.g., `calculateBalances`, `normalizeShares`)
- **Components**: `PascalCase` (e.g., `TripCard`, `AddExpenseScreen`)
- **Files**: `kebab-case` (e.g., `use-settlement.ts`, `expense-splits.ts`)

## Project Status

See [NEXT_UP.md](NEXT_UP.md) for detailed roadmap.

**Core Features (Complete)**:

- ✅ Project structure, schema, math engine
- ✅ Migration infrastructure with auto-apply
- ✅ Repositories and hooks (trips, participants, expenses, settlements)
- ✅ Settlement calculation engine (deterministic, three-layer architecture)
- ✅ Display currency adapter (visual-only conversions)
- ✅ Settlement UI integration

**FX Rates System (Complete - Phase 6)**:

- ✅ FX rates schema and migrations
- ✅ FxRateRepository (database access)
- ✅ CachedFxRateProvider (in-memory cache)
- ✅ API fetchers (Frankfurter, ExchangeRate-API)
- ✅ Background sync with staleness detection
- ✅ Manual rate entry UI
- ✅ Error recovery modals (NoRateAvailableModal, StalenessWarningBanner)
- ✅ Integration with settlement and expense screens

## Key Project Goals

1. **Deterministic**: Same inputs always produce same outputs
2. **Local-first**: Fully functional offline
3. **Auditable**: Every calculated value traceable to source data
4. **Zero friction**: Minimal input, autofill, tap-to-toggle
5. **Performance**: Must run smoothly on entry-level Android devices

When in doubt, consult [AGENTS.md](AGENTS.md) for role-specific responsibilities and [NEXT_UP.md](NEXT_UP.md) for current implementation priorities.
