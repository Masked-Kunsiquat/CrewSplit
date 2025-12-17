# Migration Plan: FX Rates Tables

## Overview

This migration adds two new tables to support cached foreign exchange rates for offline currency conversions in CrewSplit.

**Date**: 2025-12-15
**Author**: SYSTEM ARCHITECT
**Related Issue**: FX rate caching for multi-currency support

---

## Objectives

1. **Add `fx_rates` table**: Store cached exchange rates from multiple sources (Frankfurter API, ExchangeRate-API, manual entry, sync)
2. **Add `fx_rate_snapshots` table** (optional): Link trips to specific rates used for audit trail
3. **Enable deterministic offline conversions**: All FX conversions derive from locally cached rates
4. **Support rate versioning**: Multiple versions of same currency pair for historical accuracy

---

## Schema Changes

### New Table: `fx_rates`

**Purpose**: Cache exchange rates locally for offline-first currency conversions

**Columns**:
- `id` (TEXT, PRIMARY KEY): UUID identifier
- `base_currency` (TEXT, NOT NULL): Source currency (ISO 4217 code)
- `quote_currency` (TEXT, NOT NULL): Target currency (ISO 4217 code)
- `rate` (REAL, NOT NULL): Exchange rate (baseCurrency → quoteCurrency)
- `source` (TEXT, NOT NULL): Data source ('frankfurter' | 'exchangerate-api' | 'manual' | 'sync')
- `fetched_at` (TEXT, NOT NULL): ISO 8601 timestamp when rate was obtained
- `priority` (INTEGER, NOT NULL, DEFAULT 50): Source priority (higher = preferred)
- `metadata` (TEXT, NULLABLE): JSON string with source-specific details
- `is_archived` (INTEGER BOOLEAN, NOT NULL, DEFAULT 0): Soft delete flag
- `created_at` (TEXT, NOT NULL, DEFAULT current timestamp)
- `updated_at` (TEXT, NOT NULL, DEFAULT current timestamp)

**Indexes**:
1. `fx_rates_currency_pair_idx`: (base_currency, quote_currency, is_archived) - Fast rate lookups
2. `fx_rates_fetched_at_idx`: (fetched_at) - Staleness detection
3. `fx_rates_source_idx`: (source) - Source-based filtering

**Design Rationale**:
- **Composite natural key** (baseCurrency, quoteCurrency, fetchedAt) allows versioning
- **UUID id** simplifies references and sync operations
- **Priority field** resolves conflicts when multiple sources provide same pair
- **Metadata JSON** preserves API response details without schema changes
- **Soft delete** (`is_archived`) maintains audit trail while hiding outdated rates

### New Table: `fx_rate_snapshots`

**Purpose**: Link trips to specific FX rates used for conversions (audit trail)

**Columns**:
- `id` (TEXT, PRIMARY KEY): UUID identifier
- `trip_id` (TEXT, NOT NULL, FK → trips.id, CASCADE): Associated trip
- `fx_rate_id` (TEXT, NOT NULL, FK → fx_rates.id, RESTRICT): Rate used
- `snapshot_type` (TEXT, NOT NULL): Purpose ('trip_close' | 'settlement' | 'export')
- `snapshot_at` (TEXT, NOT NULL, DEFAULT current timestamp): Snapshot creation time
- `created_at` (TEXT, NOT NULL, DEFAULT current timestamp)

**Indexes**:
1. `fx_rate_snapshots_trip_id_idx`: (trip_id) - Find rates used by trip
2. `fx_rate_snapshots_fx_rate_id_idx`: (fx_rate_id) - Find trips using specific rate

**Design Rationale**:
- **OPTIONAL TABLE**: Can be implemented after core `fx_rates` works
- **RESTRICT on delete**: Prevents accidental rate deletion if trips reference it
- **Snapshot type**: Allows different rate capture moments (close, settlement, export)
- **Enables reproducibility**: Export/import trips with exact historical rates

---

## Migration Strategy

### Phase 1: Generate Migration (Current Task)

```bash
# From repo root (Windows, not WSL)
npx drizzle-kit generate --config drizzle.config.ts
```

**Expected Output**:
- `src/db/migrations/NNNN_add_fx_rates_tables.sql`: Human-readable SQL
- `src/db/migrations/meta/_journal.json`: Updated migration tracking
- `src/db/migrations/migrations.js`: Inlined SQL for React Native bundle

**Review Checklist**:
- [ ] Verify CREATE TABLE statements for both tables
- [ ] Confirm all indexes are created
- [ ] Check foreign key constraints (CASCADE for snapshots→trips, RESTRICT for snapshots→rates)
- [ ] Ensure no DROP or ALTER statements (this is additive)

### Phase 2: Update Migration File

1. **Copy generated SQL** from `.sql` file to `migrations.js`
2. **Add new migration variable** (e.g., `const m0004 = "CREATE TABLE fx_rates ..."`)
3. **Export in migrations object**:
   ```javascript
   export default {
     // ... existing migrations
     '0004_add_fx_rates_tables': m0004,
   };
   ```

### Phase 3: Test Locally

1. **Install fresh on test device/emulator**:
   ```bash
   npm run android  # or npm run ios
   ```

2. **Verify migration success**:
   - App starts without errors
   - Check logs for "Migrations complete" message
   - No foreign key constraint failures

3. **Inspect database** (via Expo DevTools or adb):
   ```sql
   -- Verify tables exist
   SELECT name FROM sqlite_master WHERE type='table';

   -- Check indexes
   SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='fx_rates';

   -- Verify foreign keys enabled
   PRAGMA foreign_keys;  -- Should return 1
   ```

4. **Test with existing data**:
   - Create trips with existing currencies (USD, EUR, GBP)
   - Add expenses in different currencies
   - Ensure no data loss or corruption

### Phase 4: Commit Migration

**Files to commit together**:
```
src/db/schema/fx-rates.ts           # New schema definition
src/db/schema/index.ts              # Export fx-rates
src/db/migrations/NNNN_*.sql        # Generated SQL
src/db/migrations/migrations.js     # Updated JS export
src/db/migrations/meta/_journal.json # Migration tracking
MIGRATION_PLAN_FX_RATES.md          # This document
```

**Commit Message**:
```
Add FX rates caching schema

- Create fx_rates table for offline exchange rate storage
- Add fx_rate_snapshots table for trip audit trail (optional)
- Support multiple data sources (Frankfurter, ExchangeRate-API, manual, sync)
- Enable deterministic, versioned rate lookups
- Include indexes for currency pair and staleness detection

Migration NNNN is additive and safe for existing data.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Backward Compatibility

**This migration is FULLY BACKWARD COMPATIBLE**:

- **Additive only**: No changes to existing tables
- **No data dependencies**: New tables start empty
- **Nullable columns**: All optional fields properly nullable
- **Existing functionality preserved**: Current expense/settlement flow unchanged
- **Graceful degradation**: If no rates exist, app falls back to manual entry (existing behavior)

**Users with existing data**:
- Migration runs automatically on app startup
- All trips, participants, expenses, and settlements preserved
- New FX provider can gradually populate rates table
- No user action required

---

## Post-Migration Implementation Steps

After migration is applied, implement in this order:

### 1. FX Rate Repository
**Owner**: LOCAL DATA ENGINEER

Create `src/modules/fx/repository/FxRateRepository.ts`:
- `getRate(base, quote)`: Lookup rate, prioritize by priority+recency
- `storeRate(base, quote, rate, source, metadata)`: Insert/update rate
- `getRatesForCurrencies(currencies[])`: Batch fetch for multi-currency trips
- `getStaleRates()`: Find rates older than N days
- `archiveRate(id)`: Soft delete outdated rate

### 2. Cached FX Rate Provider
**Owner**: DISPLAY INTEGRATION ENGINEER

Create `src/modules/fx/providers/CachedFxRateProvider.ts`:
- Implement `FxRateProvider` interface
- Query `FxRateRepository` for conversions
- Fall back to manual rate if no cached rate exists
- Expose `lastUpdated` timestamp for UI staleness warnings

### 3. API Fetchers (Frankfurter & ExchangeRate-API)
**Owner**: LOCAL DATA ENGINEER

Create `src/modules/fx/fetchers/`:
- `FrankfurterFetcher.ts`: Fetch from api.frankfurter.dev
- `ExchangeRateApiFetcher.ts`: Fallback to open.er-api.com
- Batch fetch for multiple currency pairs
- Handle network errors gracefully (offline-first)

### 4. Background Sync Hook
**Owner**: LOCAL DATA ENGINEER

Create `src/modules/fx/hooks/use-fx-sync.ts`:
- Check rate staleness on app startup
- Trigger background refresh if online and rates >7 days old
- Update repository with new rates
- Respect rate limits (max 1 fetch/day per source)

### 5. Manual Rate Entry UI
**Owner**: UI/UX ENGINEER

Create `src/modules/fx/screens/ManualRateScreen.tsx`:
- Input: Base currency, quote currency, rate
- Validation: Rate > 0, valid ISO 4217 codes
- Store as source='manual' with priority=100
- Show list of existing manual rates with edit/delete

### 6. Rate Snapshots (Optional)
**Owner**: SETTLEMENT INTEGRATION ENGINEER

Extend `SettlementService`:
- On trip close: Create snapshots for all used FX rates
- Store with `snapshot_type='trip_close'`
- On export: Include snapshots in export bundle
- On import: Restore snapshots to preserve reproducibility

---

## Testing Strategy

### Unit Tests
**File**: `src/modules/fx/repository/__tests__/FxRateRepository.test.ts`

Test cases:
- `should store and retrieve rate by currency pair`
- `should prioritize manual rates over API rates`
- `should return most recent rate when multiple exist`
- `should ignore archived rates in lookups`
- `should handle inverse conversions (EUR→USD vs USD→EUR)`
- `should batch fetch rates for multiple currencies`

### Integration Tests
**File**: `src/modules/fx/__tests__/integration.test.ts`

Scenarios:
- Fetch rates from Frankfurter API → store in DB → retrieve for conversion
- Offline conversion uses cached rate
- Manual rate overrides stale API rate
- Snapshot preserves trip-specific rates across export/import

### Edge Cases
- **No cached rate**: Falls back to manual entry prompt
- **Stale rate (>7 days)**: Shows warning, allows usage
- **Conflicting sources**: Highest priority + most recent wins
- **Inverse pairs**: Provider calculates 1/rate if inverse not cached
- **Network failure**: Gracefully continues with existing cached rates

---

## Rollback Plan

If migration causes issues in production:

### Option 1: Forward Fix (Preferred)
1. Identify bug in provider/repository logic
2. Fix bug in new code
3. Ship hotfix update
4. Migration tables remain (no data loss)

### Option 2: Temporary Disable
1. Revert to `StubFxRateProvider` in app code
2. New tables remain but unused
3. Fix issues in separate branch
4. Re-enable when stable

### Option 3: Data Wipe (LAST RESORT - Dev Only)
**NEVER in production** - destroys all user data:
```typescript
// For development only
import { deleteDatabaseSync } from 'expo-sqlite';
deleteDatabaseSync('crewsplit.db');
```

---

## Performance Considerations

### Query Optimization
- **Indexed lookups**: Currency pair index ensures O(log n) lookups
- **Batch queries**: `WHERE (base, quote) IN (...)` for multi-currency trips
- **Result caching**: Provider can memoize rates for single request lifecycle

### Storage Impact
- **Rate size**: ~200 bytes/rate (with metadata)
- **Expected volume**:
  - 30 currencies × 30 currencies = 900 pairs (worst case)
  - Versioning: ~5 versions/pair over 1 year = 4,500 rates
  - Total: ~900 KB (negligible on modern devices)
- **Snapshots**: ~100 bytes/snapshot × 100 trips × 5 rates/trip = 50 KB

### Network Impact
- **Batch API calls**: Single request fetches all needed pairs
- **Rate limiting**: Max 1 fetch/day respects free tier limits
- **Conditional updates**: Only fetch if >24 hours since last update

---

## Compliance & Attribution

### Frankfurter (api.frankfurter.dev)
- **License**: Open-source, no restrictions
- **Attribution**: Not required, but recommended in About screen
- **Terms**: Free for unlimited client-side usage

### ExchangeRate-API (open.er-api.com)
- **License**: Free tier with attribution
- **Attribution**: Required - add to About/Settings screen:
  ```
  Exchange rates provided by ExchangeRate-API
  https://www.exchangerate-api.com
  ```
- **Terms**: Caching allowed, cannot redistribute data

---

## Success Criteria

Migration is successful when:

- [ ] Both tables created without errors
- [ ] All indexes present and functional
- [ ] Foreign key constraints enforced
- [ ] Existing trips/expenses/settlements unaffected
- [ ] App starts normally with migration applied
- [ ] No performance degradation on entry-level devices
- [ ] Drizzle introspection shows correct schema

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Generate migration** via `npx drizzle-kit generate`
3. **Test locally** with realistic data
4. **Commit migration files** together with schema
5. **Implement CachedFxRateProvider** (next PR)
6. **Add background sync** (subsequent PR)
7. **Build manual entry UI** (final PR)

---

## References

- **Project Guidelines**: `CLAUDE.md`, `AGENTS.md`
- **FX Strategy**: `fx-gameplan.md`
- **Migration Best Practices**: `src/db/migrations/README.md`
- **Existing Schema Patterns**: `src/db/schema/expenses.ts` (multi-currency), `src/db/schema/expense-categories.ts` (reference data)
