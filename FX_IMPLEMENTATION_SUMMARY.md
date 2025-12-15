# FX Rates Schema: Implementation Summary

## Quick Start

**Goal**: Add offline-first, deterministic currency conversion to CrewSplit using cached exchange rates.

**Status**: Schema designed, ready for migration generation

**Owner**: SYSTEM ARCHITECT (schema design) → LOCAL DATA ENGINEER (implementation)

---

## What Was Delivered

### 1. Database Schema (`src/db/schema/fx-rates.ts`)

Two new tables:

#### `fx_rates` (PRIMARY)
Stores cached exchange rates from multiple sources:
- **Key columns**: `base_currency`, `quote_currency`, `rate`, `source`, `fetched_at`
- **Sources**: Frankfurter API (primary), ExchangeRate-API (fallback), manual entry, sync
- **Priority system**: Manual rates (100) override API rates (50/40)
- **Versioning**: Multiple rates per currency pair for audit trail
- **Indexes**: Currency pair lookup (O(log n)), staleness detection, source filtering

#### `fx_rate_snapshots` (OPTIONAL)
Links trips to specific rates used (audit trail):
- **Purpose**: Preserve exact rates used when trip was closed/exported
- **Usage**: Export/import trips with reproducible settlements
- **Implementation**: Phase 3 (after core provider works)

### 2. Documentation

- **`MIGRATION_PLAN_FX_RATES.md`**: Step-by-step migration guide, testing checklist, rollback plan
- **`FX_SCHEMA_DESIGN.md`**: Architecture decisions, query patterns, edge cases (25+ pages)
- **`FX_IMPLEMENTATION_SUMMARY.md`**: This file (quick reference)

### 3. Schema Export Updated

- Added `export * from './fx-rates';` to `src/db/schema/index.ts`
- Schema ready for Drizzle Kit migration generation

---

## Key Design Decisions

### 1. Bidirectional Rate Storage
**Decision**: Store both USD→EUR AND EUR→USD explicitly
**Why**: Avoids floating-point division errors, faster lookups, negligible storage cost

### 2. Float Storage for Rates
**Decision**: Use SQLite REAL (float64) for rates
**Why**: 6-8 decimal places adequate for daily rates, determinism preserved via `Math.round()` at conversion time

### 3. Priority-Based Conflict Resolution
**Decision**: Integer `priority` column (manual=100, frankfurter=50, exchangerate-api=40, sync=30)
**Why**: User overrides win, flexible for new sources, simple ORDER BY logic

### 4. Soft Delete with Audit Trail
**Decision**: `is_archived` boolean instead of hard delete
**Why**: Preserve historical rates, protect snapshot references, allow recovery

### 5. JSON Metadata Column
**Decision**: Single TEXT column for source-specific data
**Why**: Flexible schema, no migrations for new sources, minimal overhead

---

## Migration Checklist

### Step 1: Generate Migration ✅ (READY TO RUN)

```bash
# From repo root (Windows, not WSL)
npx drizzle-kit generate --config drizzle.config.ts
```

**Expected output**:
- `src/db/migrations/NNNN_add_fx_rates_tables.sql`
- `src/db/migrations/meta/_journal.json` (updated)
- `src/db/migrations/migrations.js` (needs manual update)

### Step 2: Review Generated SQL

Check for:
- [ ] Two CREATE TABLE statements (`fx_rates`, `fx_rate_snapshots`)
- [ ] Three indexes on `fx_rates` (currency_pair, fetched_at, source)
- [ ] Two indexes on `fx_rate_snapshots` (trip_id, fx_rate_id)
- [ ] Foreign key constraints (CASCADE for snapshots→trips, RESTRICT for snapshots→rates)
- [ ] No DROP or ALTER statements (migration is additive)

### Step 3: Update `migrations.js`

1. Copy SQL from `.sql` file
2. Create new migration variable (e.g., `const m0004 = "..."`)
3. Add to migrations object export

### Step 4: Test Locally

1. Install fresh on emulator: `npm run android`
2. Check logs for "Migrations complete"
3. Create trips with multi-currency expenses
4. Verify no data loss or errors

### Step 5: Commit Migration

**Files to commit**:
```
src/db/schema/fx-rates.ts
src/db/schema/index.ts
src/db/migrations/NNNN_*.sql
src/db/migrations/migrations.js
src/db/migrations/meta/_journal.json
MIGRATION_PLAN_FX_RATES.md
FX_SCHEMA_DESIGN.md
FX_IMPLEMENTATION_SUMMARY.md
```

**Commit message template**:
```
Add FX rates caching schema

- Create fx_rates table for offline exchange rate storage
- Add fx_rate_snapshots table for trip audit trail (optional)
- Support Frankfurter, ExchangeRate-API, manual entry, sync
- Enable deterministic, versioned rate lookups
- Include indexes for performance

Migration NNNN is additive and safe for existing data.

Refs: MIGRATION_PLAN_FX_RATES.md, FX_SCHEMA_DESIGN.md

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Post-Migration Implementation

**Implementation order** (separate PRs):

### Phase 1: Core Repository (Week 1)
**Owner**: LOCAL DATA ENGINEER

**Files to create**:
```
src/modules/fx/
├── repository/
│   └── FxRateRepository.ts
├── types.ts
└── __tests__/
    └── repository.test.ts
```

**Methods to implement**:
- `getRate(base, quote)`: Lookup rate with priority/recency
- `storeRate(base, quote, rate, source, metadata)`: Insert/update rate
- `getRatesForCurrencies(currencies[])`: Batch fetch
- `getStaleRates()`: Find rates needing refresh
- `archiveRate(id)`: Soft delete

**Test coverage**: 90%+ (unit tests only, no API calls)

### Phase 2: Cached Provider (Week 2)
**Owner**: DISPLAY INTEGRATION ENGINEER

**Files to create**:
```
src/modules/fx/
├── providers/
│   └── CachedFxRateProvider.ts
├── hooks/
│   └── use-fx-provider.ts
└── __tests__/
    └── provider.test.ts
```

**Functionality**:
- Implement `FxRateProvider` interface
- Query repository for conversions
- Handle inverse rates (1/rate)
- Throw `NoRateAvailableError` if missing
- Expose `lastUpdated` timestamp

**Integration**: Replace `StubFxRateProvider` in `DisplayCurrencyAdapter`

### Phase 3: API Fetchers (Week 3)
**Owner**: LOCAL DATA ENGINEER

**Files to create**:
```
src/modules/fx/
├── fetchers/
│   ├── FrankfurterFetcher.ts
│   ├── ExchangeRateApiFetcher.ts
│   └── types.ts
└── __tests__/
    ├── frankfurter.test.ts
    └── exchangerate-api.test.ts
```

**API integration**:
- Frankfurter: `GET https://api.frankfurter.dev/latest?base=USD&symbols=EUR,GBP`
- ExchangeRate-API: `GET https://open.er-api.com/v6/latest/USD`
- Handle network errors gracefully (offline-first)
- Batch fetch for efficiency

**Rate limiting**: Max 1 fetch/day per source

### Phase 4: Background Sync (Week 4)
**Owner**: LOCAL DATA ENGINEER

**Files to create**:
```
src/modules/fx/
├── hooks/
│   └── use-fx-sync.ts
└── __tests__/
    └── sync.test.ts
```

**Functionality**:
- Check staleness on app startup
- Trigger refresh if >7 days old AND online
- Store fetched rates in repository
- Show toast notification on success/failure

**Integration**: Add to `app/_layout.tsx` after migration hook

### Phase 5: Manual Entry UI (Week 5)
**Owner**: UI/UX ENGINEER

**Files to create**:
```
src/modules/fx/
├── screens/
│   ├── ManualRateScreen.tsx
│   └── RateListScreen.tsx
├── components/
│   ├── RateInputForm.tsx
│   └── RateListItem.tsx
└── __tests__/
    └── screens.test.tsx
```

**Features**:
- Form: Base currency, quote currency, rate input
- Validation: Rate > 0, valid ISO 4217 codes
- List: Show existing manual rates with edit/delete
- Settings integration: Add "Exchange Rates" menu item

### Phase 6: Rate Snapshots (Optional - Week 6+)
**Owner**: SETTLEMENT INTEGRATION ENGINEER

**Files to modify**:
```
src/modules/settlement/
└── service/SettlementService.ts  # Add snapshot logic
```

**Functionality**:
- On trip close: Create snapshots for all used rates
- On export: Bundle snapshots with trip data
- On import: Restore snapshots + rates

---

## Testing Strategy

### Unit Tests (Per Phase)
- Repository: CRUD operations, priority handling, staleness
- Provider: Rate lookups, inverse calculations, error handling
- Fetchers: API parsing, network errors, retry logic
- Sync: Staleness detection, batch updates

### Integration Tests (Phase 2+)
- End-to-end: Fetch from API → store → retrieve → convert
- Offline: Conversion works without network
- Manual override: Manual rate wins over API rate
- Export/import: Trip snapshots preserve exact rates

### Edge Cases (Phase 2+)
- No cached rate → manual entry prompt
- Stale rate (>7 days) → warning shown
- Same currency (USD→USD) → rate = 1.0
- Inverse lookup (EUR→USD when only USD→EUR exists)
- Conflicting sources → highest priority wins

### Performance Tests (Phase 3+)
- Batch fetch: 100+ currency pairs in <500ms
- Query speed: Currency pair lookup in <10ms
- Staleness check: Scan 1000 rates in <100ms

---

## Query Examples

### Get Latest Rate
```typescript
const rate = await fxRateRepository.getRate('USD', 'EUR');
// Returns: { rate: 0.92, source: 'frankfurter', fetchedAt: '2025-01-15T10:00:00Z', ... }
```

### Batch Fetch for Multi-Currency Trip
```typescript
const currencies = ['USD', 'EUR', 'GBP'];
const rates = await fxRateRepository.getRatesForCurrencies(currencies);
// Returns: Map<CurrencyPair, FxRate>
// Contains: USD→EUR, USD→GBP, EUR→USD, EUR→GBP, GBP→USD, GBP→EUR
```

### Store Manual Rate
```typescript
await fxRateRepository.storeRate({
  baseCurrency: 'USD',
  quoteCurrency: 'EUR',
  rate: 0.92,
  source: 'manual',
  priority: 100,
  metadata: JSON.stringify({ note: 'Set by user' }),
});
```

### Find Stale Rates
```typescript
const staleRates = await fxRateRepository.getStaleRates(7); // 7 days
// Returns: [{ baseCurrency: 'USD', quoteCurrency: 'EUR', ageDays: 14 }, ...]
```

### Archive Outdated Rate
```typescript
await fxRateRepository.archiveRate('rate_id_abc123');
// Sets is_archived=1, hides from normal queries
```

---

## Common Pitfalls to Avoid

### 1. Float Equality Comparisons
**Wrong**:
```typescript
if (rate1 === rate2) { /* ... */ }
```
**Right**:
```typescript
if (Math.abs(rate1 - rate2) < 0.00001) { /* ... */ }
```

### 2. Forgetting Inverse Lookup
**Wrong**:
```typescript
async getRate(from, to) {
  return await db.select().from(fxRates).where(...); // Returns null if not found
}
```
**Right**:
```typescript
async getRate(from, to) {
  const direct = await this.getDirectRate(from, to);
  if (direct) return direct;

  const inverse = await this.getDirectRate(to, from);
  if (inverse) return 1 / inverse.rate;

  throw new NoRateAvailableError(from, to);
}
```

### 3. Hard-Coding Source Priorities
**Wrong**:
```typescript
if (rate.source === 'manual') return rate;
else if (rate.source === 'frankfurter') return rate;
// ...
```
**Right**:
```typescript
// Use priority column in SQL
ORDER BY priority DESC, fetched_at DESC
```

### 4. Ignoring Same-Currency Case
**Wrong**:
```typescript
async convertAmount(from, to, amount) {
  const rate = await this.getRate(from, to); // Unnecessary DB query
  return Math.round(amount * rate);
}
```
**Right**:
```typescript
async convertAmount(from, to, amount) {
  if (from === to) return amount; // Short-circuit
  const rate = await this.getRate(from, to);
  return Math.round(amount * rate);
}
```

### 5. Not Handling Network Failures
**Wrong**:
```typescript
async fetchRates() {
  const response = await fetch('https://api.frankfurter.dev/latest');
  const data = await response.json(); // Crashes if offline
  await this.storeRates(data);
}
```
**Right**:
```typescript
async fetchRates() {
  try {
    const response = await fetch('https://api.frankfurter.dev/latest');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    await this.storeRates(data);
  } catch (error) {
    console.warn('Failed to fetch rates:', error);
    // App continues with cached rates
  }
}
```

---

## API Reference

### Frankfurter API

**Endpoint**: `https://api.frankfurter.dev/latest`

**Query Parameters**:
- `base`: Base currency (default: EUR)
- `symbols`: Comma-separated target currencies (optional)

**Example**:
```bash
curl "https://api.frankfurter.dev/latest?base=USD&symbols=EUR,GBP,JPY"
```

**Response**:
```json
{
  "amount": 1.0,
  "base": "USD",
  "date": "2025-01-15",
  "rates": {
    "EUR": 0.92156,
    "GBP": 0.79123,
    "JPY": 149.85
  }
}
```

**Rate Limit**: None (free, unlimited)
**Update Frequency**: Daily at 16:00 CET
**Attribution**: Not required

### ExchangeRate-API (Open Access)

**Endpoint**: `https://open.er-api.com/v6/latest/{base_currency}`

**Example**:
```bash
curl "https://open.er-api.com/v6/latest/USD"
```

**Response**:
```json
{
  "result": "success",
  "provider": "https://www.exchangerate-api.com",
  "time_last_updated": 1705334400,
  "time_next_update": 1705420800,
  "base_code": "USD",
  "rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 149.85,
    // ... 160+ currencies
  }
}
```

**Rate Limit**: Lenient (1 request/day acceptable)
**Update Frequency**: Daily
**Attribution**: Required (add to About screen)

---

## Success Criteria

Migration is successful when:

- [ ] Both tables created without errors
- [ ] All indexes functional (verify with EXPLAIN QUERY PLAN)
- [ ] Foreign key constraints enforced (PRAGMA foreign_keys = 1)
- [ ] Existing trips/expenses/settlements preserved
- [ ] App starts normally with migration applied
- [ ] No performance degradation on entry-level Android
- [ ] Schema matches Drizzle introspection

Implementation is successful when:

- [ ] Provider replaces StubFxRateProvider without breaking changes
- [ ] Conversions work offline using cached rates
- [ ] Manual rates override API rates (priority system works)
- [ ] Background sync fetches rates when online + stale
- [ ] UI shows manual rate entry form in Settings
- [ ] Test coverage >85% across all modules
- [ ] No regressions in settlement calculations

---

## Next Steps

1. **Review this summary** with team
2. **Generate migration** (Step 1 above)
3. **Test locally** with real data
4. **Commit migration** (Step 5 above)
5. **Start Phase 1** (FxRateRepository) in new branch

---

## Questions & Contact

**Schema questions**: Refer to `FX_SCHEMA_DESIGN.md` (architecture deep-dive)
**Migration questions**: Refer to `MIGRATION_PLAN_FX_RATES.md` (step-by-step guide)
**General questions**: Post in team chat or GitHub discussions

**Files**:
- Schema: `src/db/schema/fx-rates.ts`
- Migration Plan: `MIGRATION_PLAN_FX_RATES.md`
- Design Doc: `FX_SCHEMA_DESIGN.md`
- This Summary: `FX_IMPLEMENTATION_SUMMARY.md`
