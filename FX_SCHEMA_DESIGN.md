# FX Rates Schema: Architecture & Design Decisions

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Design Rationale](#design-rationale)
3. [Data Flow](#data-flow)
4. [Key Design Decisions](#key-design-decisions)
5. [Query Patterns](#query-patterns)
6. [Edge Cases](#edge-cases)

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────────┐
│     trips       │
│─────────────────│
│ id (PK)         │───┐
│ name            │   │
│ currency        │   │ CASCADE
│ start_date      │   │
│ ...             │   │
└─────────────────┘   │
                      │
                      ▼
        ┌─────────────────────────────┐
        │   fx_rate_snapshots         │
        │─────────────────────────────│
        │ id (PK)                     │
        │ trip_id (FK → trips)        │───┐
        │ fx_rate_id (FK → fx_rates)  │   │ RESTRICT
        │ snapshot_type               │   │ (preserve audit)
        │ snapshot_at                 │   │
        └─────────────────────────────┘   │
                                          │
                      ┌───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │        fx_rates             │
        │─────────────────────────────│
        │ id (PK)                     │
        │ base_currency               │ ← Indexed
        │ quote_currency              │ ← Indexed
        │ rate (REAL)                 │
        │ source                      │ ← Indexed
        │ fetched_at                  │ ← Indexed
        │ priority                    │
        │ metadata (JSON)             │
        │ is_archived                 │
        └─────────────────────────────┘
```

### Table Relationships

**No foreign keys FROM fx_rates**:

- FX rates table is reference data (like expense_categories)
- Multiple trips can use the same rate
- Rates exist independently of trips

**fx_rate_snapshots is the junction table**:

- Links trips to rates they used
- Preserves audit trail
- Allows same rate to be used by multiple trips

---

## Design Rationale

### 1. Why UUID Primary Keys Instead of Composite Keys?

**Alternative considered**: Use `(base_currency, quote_currency, fetched_at)` as natural composite key

**Decision**: Use UUID `id` as primary key

**Reasoning**:

- **Simpler references**: `fx_rate_snapshots.fx_rate_id` is cleaner than multi-column FK
- **Sync-friendly**: UUIDs generated client-side prevent conflicts across devices
- **Versioning**: Allows multiple rates for same pair without complex WHERE clauses
- **Future-proof**: Easier to add rate history features later

**Trade-off**: Requires unique index on natural key to prevent duplicates

### 2. Why Store Rate as REAL (Floating-Point)?

**Alternative considered**: Store as integer (rate × 1,000,000 for precision)

**Decision**: Use SQLite REAL (float64)

**Reasoning**:

- **Adequate precision**: 6-8 decimal places sufficient for daily settlement rates
- **API compatibility**: Sources return floats; no conversion needed
- **Integer math at conversion**: Final cent calculation uses `round(amountMinor * rate)`
- **Determinism preserved**: Same float rate produces same integer output via rounding

**Example**:

```typescript
// Rate: USD→EUR = 0.92156789 (8 decimals)
const amountUSD = 1234; // $12.34 in cents
const amountEUR = Math.round(amountUSD * 0.92156789); // 1138 cents (€11.38)
// Deterministic: Same inputs always produce 1138
```

**Trade-off**: Float equality comparisons need epsilon tolerance (not an issue for our use case)

### 3. Why Priority Field Instead of Source Hierarchy?

**Alternative considered**: Hard-code source priority in application logic

**Decision**: Store priority as integer column

**Reasoning**:

- **Flexibility**: Users can override priority without code changes
- **Manual overrides**: `manual` source gets priority=100, always wins
- **Testability**: Easy to simulate priority conflicts in tests
- **Future sources**: New sources slot in without changing query logic

**Default priorities**:

```
manual:           100  (user knows best)
frankfurter:       50  (primary API)
exchangerate-api:  40  (fallback API)
sync:              30  (secondary device)
```

### 4. Why Both `fetchedAt` and `createdAt`?

**Decision**: Include both timestamps

**Reasoning**:

- **fetchedAt**: When rate was valid (API response time or manual entry time)
- **createdAt**: When record was inserted into THIS device's database
- **Use case**: Synced rates have `fetchedAt` from origin device, `createdAt` on local device
- **Staleness**: Check `fetchedAt` to determine if rate needs refresh

**Example**:

```
Device A fetches rate on 2025-01-10 (fetchedAt)
Device B syncs rate on 2025-01-15 (createdAt)
→ Rate is 5 days old according to fetchedAt (accurate)
```

### 5. Why Soft Delete (`is_archived`) Instead of Hard Delete?

**Decision**: Use soft delete with boolean flag

**Reasoning**:

- **Audit trail**: Preserve historical rates even if outdated
- **Snapshot integrity**: fx_rate_snapshots references remain valid
- **Recovery**: Can "unarchive" if rate was hidden by mistake
- **Foreign key safety**: RESTRICT on snapshots→rates prevents accidental data loss

**Query pattern**:

```sql
-- Exclude archived rates by default
SELECT * FROM fx_rates
WHERE base_currency = 'USD'
  AND quote_currency = 'EUR'
  AND is_archived = 0
ORDER BY priority DESC, fetched_at DESC
LIMIT 1;
```

### 6. Why Metadata as JSON String?

**Alternative considered**: Add explicit columns for API-specific fields

**Decision**: Use single `metadata` TEXT column with JSON

**Reasoning**:

- **Flexibility**: Different sources have different metadata structures
- **No schema changes**: Adding new source doesn't require migration
- **Minimal overhead**: JSON is only parsed when displaying rate details (rare)
- **Examples**:

  ```json
  // Frankfurter
  {"api_version": "2024-01-15", "base_endpoint": "https://api.frankfurter.dev"}

  // ExchangeRate-API
  {"time_last_updated": 1705334400, "time_next_update": 1705420800}

  // Manual
  {"note": "ECB reference rate from website", "entered_by": "Alice"}

  // Sync
  {"origin_device_id": "abc123", "sync_timestamp": "2025-01-15T10:00:00Z"}
  ```

**Trade-off**: Cannot query/index metadata contents (not needed for primary workflows)

### 7. Why Optional `fx_rate_snapshots` Table?

**Decision**: Include in schema but mark as optional for implementation

**Reasoning**:

- **Audit trail**: Enables reproducible settlements months/years later
- **Export/import**: Bundle exact rates with trip data
- **Not critical for MVP**: Core functionality works without snapshots
- **Forward-looking**: Easier to add data to existing table than migrate later

**Implementation order**:

1. Phase 1: `fx_rates` + basic provider (current)
2. Phase 2: API fetchers + background sync
3. Phase 3: `fx_rate_snapshots` + trip export/import

---

## Data Flow

### 1. Rate Fetching (Online)

```
User opens app with WiFi
         │
         ▼
Background hook checks staleness
         │
         ├─ Rates < 24h old? → Skip fetch
         │
         └─ Rates > 24h old? → Fetch
                   │
                   ▼
         Try Frankfurter API
                   │
                   ├─ Success → Store rates (priority=50)
                   │
                   └─ Fail → Try ExchangeRate-API
                              │
                              ├─ Success → Store rates (priority=40)
                              │
                              └─ Fail → Log warning, use cached
```

### 2. Rate Lookup (Conversion)

```
DisplayCurrencyAdapter.convertAmount(USD, EUR, 1234)
         │
         ▼
CachedFxRateProvider.getRate(USD, EUR)
         │
         ▼
FxRateRepository query:
    SELECT * FROM fx_rates
    WHERE base_currency = 'USD'
      AND quote_currency = 'EUR'
      AND is_archived = 0
    ORDER BY priority DESC, fetched_at DESC
    LIMIT 1
         │
         ├─ Found? → Return rate (e.g., 0.92)
         │
         └─ Not found? → Try inverse (EUR, USD)
                   │
                   ├─ Found? → Return 1/rate (e.g., 1/1.087 = 0.92)
                   │
                   └─ Not found? → Throw error (prompt manual entry)
```

### 3. Manual Rate Entry (Offline)

```
User in Settings → "Set Exchange Rate"
         │
         ▼
Form: Base=USD, Quote=EUR, Rate=0.92
         │
         ▼
Validation: Rate > 0, valid ISO codes
         │
         ▼
FxRateRepository.storeRate({
    baseCurrency: 'USD',
    quoteCurrency: 'EUR',
    rate: 0.92,
    source: 'manual',
    priority: 100,  // Overrides API rates
    metadata: '{"note": "Set manually"}'
})
         │
         ▼
Rate saved with fetchedAt = NOW()
         │
         ▼
Conversion now uses manual rate (highest priority)
```

### 4. Trip Snapshot (Export)

```
User exports Trip X with currencies: USD, EUR, GBP
         │
         ▼
SettlementService identifies FX rates used:
    - USD→EUR: rate_id=abc123
    - USD→GBP: rate_id=def456
         │
         ▼
Create snapshots:
    INSERT INTO fx_rate_snapshots (trip_id, fx_rate_id, snapshot_type)
    VALUES ('trip_x', 'abc123', 'export'),
           ('trip_x', 'def456', 'export')
         │
         ▼
Export bundle includes:
    - Trip data
    - Expenses
    - Participants
    - FX rate snapshots
    - Actual fx_rates rows (via join)
```

---

## Key Design Decisions

### Decision 1: Bidirectional Rates Storage

**Problem**: Should we store both USD→EUR and EUR→USD, or just one direction?

**Decision**: **Store both directions explicitly**

**Reasoning**:

- **Avoids division**: 1/rate can introduce floating-point errors
- **API efficiency**: Frankfurter allows fetching multiple pairs in one request
  ```
  GET /latest?base=USD&symbols=EUR,GBP
  GET /latest?base=EUR&symbols=USD,GBP
  ```
- **Query simplicity**: Direct lookup faster than inverse calculation
- **Storage cost**: Negligible (30 currencies × 30 = 1800 rates vs 900)

**Example**:

```sql
-- Store both directions
INSERT INTO fx_rates (base_currency, quote_currency, rate, source, fetched_at)
VALUES ('USD', 'EUR', 0.92, 'frankfurter', '2025-01-15'),
       ('EUR', 'USD', 1.087, 'frankfurter', '2025-01-15');

-- Lookup is simple
SELECT rate FROM fx_rates WHERE base_currency='USD' AND quote_currency='EUR';
-- Returns 0.92 directly, no division needed
```

### Decision 2: Single Table vs Separate Tables Per Source

**Problem**: Should we have `fx_rates_frankfurter`, `fx_rates_manual`, etc.?

**Decision**: **Single `fx_rates` table with `source` column**

**Reasoning**:

- **Unified queries**: Provider doesn't need to know about table structure
- **Priority handling**: Single ORDER BY clause handles all sources
- **Schema stability**: Adding sources doesn't require migrations
- **Type safety**: `source` column can be CHECK constraint or enum

**Example**:

```sql
-- Single query across all sources
SELECT * FROM fx_rates
WHERE base_currency = 'USD' AND quote_currency = 'EUR'
  AND is_archived = 0
ORDER BY priority DESC, fetched_at DESC
LIMIT 1;

-- vs separate tables (complex)
SELECT * FROM (
    SELECT *, 100 as priority FROM fx_rates_manual WHERE ...
    UNION
    SELECT *, 50 as priority FROM fx_rates_frankfurter WHERE ...
    UNION
    SELECT *, 40 as priority FROM fx_rates_exchangerate WHERE ...
) ORDER BY priority DESC, fetched_at DESC LIMIT 1;
```

### Decision 3: Rate Staleness Threshold

**Problem**: When should rates be considered "stale"?

**Decision**: **7 days default, configurable per source**

**Reasoning**:

- **Frankfurter updates**: Daily at 16:00 CET
- **User tolerance**: Family trip expenses don't need real-time rates
- **Offline grace period**: 7 days allows week-long trips without internet
- **Manual rates**: Never expire (priority=100 always overrides)

**Implementation**:

```typescript
const STALENESS_THRESHOLD_DAYS = {
  frankfurter: 7,
  "exchangerate-api": 7,
  manual: Infinity, // Never stale
  sync: 14, // More tolerance for synced rates
};

function isStale(rate: FxRate): boolean {
  if (rate.source === "manual") return false;

  const ageDays = daysBetween(rate.fetchedAt, now());
  const threshold = STALENESS_THRESHOLD_DAYS[rate.source];
  return ageDays > threshold;
}
```

### Decision 4: Snapshot Timing

**Problem**: When should fx_rate_snapshots be created?

**Decision**: **Three snapshot types with different triggers**

**Snapshot Types**:

1. **`trip_close`**: When user marks trip as "Closed/Finalized"
   - Captures rates at settlement time
   - Preserves exact calculation inputs
   - One snapshot per currency pair used

2. **`settlement`**: When settlement is calculated/viewed
   - Optional: Only if user wants audit trail for each calculation
   - Allows comparing settlements over time
   - Multiple snapshots per trip possible

3. **`export`**: When trip is exported to file/sync
   - Bundles rates with trip data
   - Enables full reproducibility on import
   - Always created for export feature

**Example Flow**:

```typescript
// User closes trip
async function closeTripWithSnapshot(tripId: string) {
  // 1. Calculate settlement (uses current rates)
  const settlement = await SettlementService.calculate(tripId);

  // 2. Identify rates used
  const usedRates = await FxRateRepository.getRatesUsedInSettlement(settlement);

  // 3. Create snapshots
  for (const rate of usedRates) {
    await FxRateRepository.createSnapshot({
      tripId,
      fxRateId: rate.id,
      snapshotType: "trip_close",
    });
  }

  // 4. Mark trip as closed
  await TripRepository.updateStatus(tripId, "closed");
}
```

---

## Query Patterns

### Pattern 1: Get Latest Rate for Currency Pair

**Use case**: Convert amount from USD to EUR

```sql
SELECT rate
FROM fx_rates
WHERE base_currency = ?
  AND quote_currency = ?
  AND is_archived = 0
ORDER BY priority DESC, fetched_at DESC
LIMIT 1;
```

**Index used**: `fx_rates_currency_pair_idx`

**Performance**: O(log n) via B-tree index

### Pattern 2: Batch Fetch Rates for Multi-Currency Trip

**Use case**: Trip uses USD, EUR, GBP - need all conversion pairs

```sql
SELECT base_currency, quote_currency, rate, fetched_at
FROM fx_rates
WHERE (base_currency, quote_currency) IN (
    ('USD', 'EUR'),
    ('USD', 'GBP'),
    ('EUR', 'USD'),
    ('EUR', 'GBP'),
    ('GBP', 'USD'),
    ('GBP', 'EUR')
  )
  AND is_archived = 0
ORDER BY base_currency, quote_currency, priority DESC, fetched_at DESC;
```

**Optimization**: Provider deduplicates by keeping only highest priority per pair

### Pattern 3: Find Stale Rates Needing Refresh

**Use case**: Background job checks what needs updating

```sql
SELECT DISTINCT base_currency, quote_currency
FROM fx_rates
WHERE source IN ('frankfurter', 'exchangerate-api')
  AND is_archived = 0
  AND fetched_at < datetime('now', '-7 days')
ORDER BY fetched_at ASC
LIMIT 50;  -- Batch size to avoid rate limits
```

**Index used**: `fx_rates_fetched_at_idx`

### Pattern 4: Audit Trail - Find Rates Used by Trip

**Use case**: "Show me all FX rates this trip used"

```sql
SELECT fr.base_currency, fr.quote_currency, fr.rate,
       fr.source, fr.fetched_at, frs.snapshot_type
FROM fx_rate_snapshots frs
JOIN fx_rates fr ON frs.fx_rate_id = fr.id
WHERE frs.trip_id = ?
ORDER BY frs.snapshot_at DESC;
```

**Index used**: `fx_rate_snapshots_trip_id_idx`

### Pattern 5: Find All Trips Using Specific Rate

**Use case**: "Rate abc123 is suspicious - which trips used it?"

```sql
SELECT t.id, t.name, frs.snapshot_type, frs.snapshot_at
FROM fx_rate_snapshots frs
JOIN trips t ON frs.trip_id = t.id
WHERE frs.fx_rate_id = ?
ORDER BY frs.snapshot_at DESC;
```

**Index used**: `fx_rate_snapshots_fx_rate_id_idx`

---

## Edge Cases

### Edge Case 1: No Cached Rate Available

**Scenario**: User enters expense in JPY, but no USD→JPY rate exists

**Behavior**:

1. Provider checks for direct rate (USD→JPY): NOT FOUND
2. Provider checks for inverse rate (JPY→USD): NOT FOUND
3. Provider throws error with code `NO_RATE_AVAILABLE`
4. UI catches error, shows modal: "Exchange rate needed: USD → JPY"
5. User enters manual rate or skips conversion

**Implementation**:

```typescript
class NoRateAvailableError extends Error {
  constructor(
    public fromCurrency: string,
    public toCurrency: string,
  ) {
    super(`No exchange rate available for ${fromCurrency}→${toCurrency}`);
    this.name = "NoRateAvailableError";
  }
}
```

### Edge Case 2: Conflicting Rates from Different Sources

**Scenario**: Manual rate (priority=100) and Frankfurter rate (priority=50) both exist

**Expected Behavior**: Manual rate wins (highest priority)

**Test Case**:

```typescript
// Setup
await repository.storeRate({
  base: "USD",
  quote: "EUR",
  rate: 0.9,
  source: "manual",
  priority: 100,
});
await repository.storeRate({
  base: "USD",
  quote: "EUR",
  rate: 0.92,
  source: "frankfurter",
  priority: 50,
});

// Query
const rate = await provider.getRate("USD", "EUR");

// Assert
expect(rate).toBe(0.9); // Manual rate, not Frankfurter
```

### Edge Case 3: Stale Manual Rate vs Fresh API Rate

**Scenario**: Manual rate from 60 days ago (priority=100), API rate from today (priority=50)

**Expected Behavior**: Manual rate still wins (priority overrides staleness)

**Rationale**: User explicitly set manual rate as override

**UI Consideration**: Show warning "Using manual rate from 60 days ago"

### Edge Case 4: Same Currency Conversion

**Scenario**: Convert USD→USD

**Expected Behavior**: Rate = 1.0, no database lookup needed

**Implementation**:

```typescript
getRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1.0;
  // ... fetch from database
}
```

### Edge Case 5: Archived Rate with Active Snapshot

**Scenario**: Rate abc123 is archived, but fx_rate_snapshots still references it

**Expected Behavior**:

- Normal queries exclude archived rate
- Snapshot queries INCLUDE archived rate (for audit trail)
- Rate cannot be hard-deleted (RESTRICT foreign key)

**Query Pattern**:

```sql
-- Normal lookup: Excludes archived
SELECT * FROM fx_rates WHERE ... AND is_archived = 0;

-- Audit lookup: Includes archived
SELECT fr.* FROM fx_rate_snapshots frs
JOIN fx_rates fr ON frs.fx_rate_id = fr.id
WHERE frs.trip_id = ?;
-- No is_archived filter - shows all historical rates
```

### Edge Case 6: Inverse Rate Calculation

**Scenario**: Have USD→EUR (0.92), need EUR→USD

**Behavior**:

1. Check for direct EUR→USD: NOT FOUND
2. Calculate inverse: 1/0.92 = 1.08695652...
3. Store inverse as derived rate? NO - keep calculation in provider
4. Return 1.08695652... for this conversion

**Rationale**: Avoid polluting database with derived rates

**Implementation**:

```typescript
async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
  // Try direct lookup
  const direct = await this.repository.getRate(fromCurrency, toCurrency);
  if (direct) return direct.rate;

  // Try inverse
  const inverse = await this.repository.getRate(toCurrency, fromCurrency);
  if (inverse) return 1 / inverse.rate;

  throw new NoRateAvailableError(fromCurrency, toCurrency);
}
```

### Edge Case 7: Snapshot with Deleted Trip

**Scenario**: Trip is deleted (CASCADE deletes snapshots), but rate still referenced

**Expected Behavior**:

- `fx_rate_snapshots` rows CASCADE deleted with trip
- `fx_rates` row remains (other trips may use it)
- Rate can be archived manually if no longer needed

**Foreign Key Behavior**:

```sql
-- Trip deletion triggers CASCADE
DELETE FROM trips WHERE id = 'trip_x';
-- Automatically deletes:
--   participants (CASCADE)
--   expenses (CASCADE)
--   fx_rate_snapshots (CASCADE)
-- Does NOT delete:
--   fx_rates (no FK from fx_rates → trips)
```

---

## Conclusion

This schema design prioritizes:

1. **Determinism**: Same inputs always produce same outputs (integer math, versioned rates)
2. **Auditability**: Full trail of which rates were used when (snapshots, timestamps)
3. **Flexibility**: Multi-source support without schema changes (priority, metadata)
4. **Offline-first**: All conversions use local cache (no network dependency)
5. **Performance**: Indexed queries, batch fetching, minimal storage overhead

**Next Steps**:

1. Generate migration with `npx drizzle-kit generate`
2. Implement `FxRateRepository` (database layer)
3. Implement `CachedFxRateProvider` (business logic)
4. Add background sync hook (network layer)
5. Build manual entry UI (presentation layer)

**Files**:

- Schema: `c:\Users\blain\Documents\GitHub\CrewSplit\CrewSplit\src\db\schema\fx-rates.ts`
- Migration Plan: `c:\Users\blain\Documents\GitHub\CrewSplit\CrewSplit\MIGRATION_PLAN_FX_RATES.md`
- Design Doc: `c:\Users\blain\Documents\GitHub\CrewSplit\CrewSplit\FX_SCHEMA_DESIGN.md`
