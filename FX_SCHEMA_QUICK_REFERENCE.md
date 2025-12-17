# FX Rates Schema: Quick Reference Card

## Schema at a Glance

### `fx_rates` Table

```sql
CREATE TABLE fx_rates (
  id TEXT PRIMARY KEY,                    -- UUID
  base_currency TEXT NOT NULL,            -- "USD"
  quote_currency TEXT NOT NULL,           -- "EUR"
  rate REAL NOT NULL,                     -- 0.92 (USD→EUR)
  source TEXT NOT NULL,                   -- 'frankfurter' | 'exchangerate-api' | 'manual' | 'sync'
  fetched_at TEXT NOT NULL,               -- ISO 8601 timestamp
  priority INTEGER NOT NULL DEFAULT 50,   -- manual=100, frankfurter=50, exchangerate-api=40, sync=30
  metadata TEXT,                          -- JSON (source-specific data)
  is_archived INTEGER NOT NULL DEFAULT 0, -- Soft delete
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX fx_rates_currency_pair_idx ON fx_rates(base_currency, quote_currency, is_archived);
CREATE INDEX fx_rates_fetched_at_idx ON fx_rates(fetched_at);
CREATE INDEX fx_rates_source_idx ON fx_rates(source);
```

### `fx_rate_snapshots` Table (Optional)

```sql
CREATE TABLE fx_rate_snapshots (
  id TEXT PRIMARY KEY,                    -- UUID
  trip_id TEXT NOT NULL,                  -- FK → trips.id (CASCADE)
  fx_rate_id TEXT NOT NULL,               -- FK → fx_rates.id (RESTRICT)
  snapshot_type TEXT NOT NULL,            -- 'trip_close' | 'settlement' | 'export'
  snapshot_at TEXT NOT NULL,              -- ISO 8601 timestamp
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX fx_rate_snapshots_trip_id_idx ON fx_rate_snapshots(trip_id);
CREATE INDEX fx_rate_snapshots_fx_rate_id_idx ON fx_rate_snapshots(fx_rate_id);
```

---

## Priority System

| Source             | Priority | When to Use                           |
| ------------------ | -------- | ------------------------------------- |
| `manual`           | 100      | User explicitly sets rate (overrides) |
| `frankfurter`      | 50       | Primary API (no key required)         |
| `exchangerate-api` | 40       | Fallback API (no key required)        |
| `sync`             | 30       | Synced from another device            |

**Resolution**: Highest priority + most recent `fetched_at` wins

---

## Common Queries

### 1. Get Latest Rate

```typescript
// TypeScript
const rate = await db
  .select()
  .from(fxRates)
  .where(
    and(
      eq(fxRates.baseCurrency, "USD"),
      eq(fxRates.quoteCurrency, "EUR"),
      eq(fxRates.isArchived, false),
    ),
  )
  .orderBy(desc(fxRates.priority), desc(fxRates.fetchedAt))
  .limit(1);
```

```sql
-- SQL
SELECT * FROM fx_rates
WHERE base_currency = 'USD'
  AND quote_currency = 'EUR'
  AND is_archived = 0
ORDER BY priority DESC, fetched_at DESC
LIMIT 1;
```

### 2. Batch Fetch for Multi-Currency Trip

```typescript
// TypeScript
const pairs = [
  ["USD", "EUR"],
  ["USD", "GBP"],
  ["EUR", "USD"],
];

const rates = await db
  .select()
  .from(fxRates)
  .where(
    and(
      inArray(sql`(${fxRates.baseCurrency}, ${fxRates.quoteCurrency})`, pairs),
      eq(fxRates.isArchived, false),
    ),
  )
  .orderBy(desc(fxRates.priority), desc(fxRates.fetchedAt));
```

### 3. Find Stale Rates

```typescript
// TypeScript
const sevenDaysAgo = new Date(
  Date.now() - 7 * 24 * 60 * 60 * 1000,
).toISOString();

const staleRates = await db
  .select({
    baseCurrency: fxRates.baseCurrency,
    quoteCurrency: fxRates.quoteCurrency,
  })
  .from(fxRates)
  .where(
    and(
      lt(fxRates.fetchedAt, sevenDaysAgo),
      eq(fxRates.isArchived, false),
      inArray(fxRates.source, ["frankfurter", "exchangerate-api"]),
    ),
  )
  .groupBy(fxRates.baseCurrency, fxRates.quoteCurrency);
```

### 4. Store New Rate

```typescript
// TypeScript
await db.insert(fxRates).values({
  id: crypto.randomUUID(),
  baseCurrency: "USD",
  quoteCurrency: "EUR",
  rate: 0.92,
  source: "frankfurter",
  fetchedAt: new Date().toISOString(),
  priority: 50,
  metadata: JSON.stringify({ api_version: "2024-01-15" }),
  isArchived: false,
});
```

### 5. Archive Outdated Rate

```typescript
// TypeScript
await db
  .update(fxRates)
  .set({ isArchived: true })
  .where(eq(fxRates.id, rateId));
```

---

## API Integration

### Frankfurter API (Primary)

**Endpoint**: `https://api.frankfurter.dev/latest`

**Example Request**:

```bash
curl "https://api.frankfurter.dev/latest?base=USD&symbols=EUR,GBP,JPY"
```

**Example Response**:

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

**Processing**:

```typescript
async function storeFrankfurterRates(base: string, data: FrankfurterResponse) {
  const rates = Object.entries(data.rates).map(([quote, rate]) => ({
    id: crypto.randomUUID(),
    baseCurrency: base,
    quoteCurrency: quote,
    rate,
    source: "frankfurter" as const,
    fetchedAt: data.date,
    priority: 50,
    metadata: JSON.stringify({ api_date: data.date }),
    isArchived: false,
  }));

  await db.insert(fxRates).values(rates);
}
```

### ExchangeRate-API (Fallback)

**Endpoint**: `https://open.er-api.com/v6/latest/{base}`

**Example Request**:

```bash
curl "https://open.er-api.com/v6/latest/USD"
```

**Example Response**:

```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_updated": 1705334400,
  "rates": {
    "EUR": 0.92,
    "GBP": 0.79
    // ... 160+ currencies
  }
}
```

**Processing**:

```typescript
async function storeExchangeRateApiRates(data: ExchangeRateApiResponse) {
  const rates = Object.entries(data.rates).map(([quote, rate]) => ({
    id: crypto.randomUUID(),
    baseCurrency: data.base_code,
    quoteCurrency: quote,
    rate,
    source: "exchangerate-api" as const,
    fetchedAt: new Date(data.time_last_updated * 1000).toISOString(),
    priority: 40,
    metadata: JSON.stringify({
      time_next_update: data.time_next_update,
    }),
    isArchived: false,
  }));

  await db.insert(fxRates).values(rates);
}
```

---

## Provider Implementation Pattern

```typescript
interface FxRateProvider {
  getRate(fromCurrency: string, toCurrency: string): Promise<number>;
  setRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
  ): Promise<void>;
}

class CachedFxRateProvider implements FxRateProvider {
  constructor(private repository: FxRateRepository) {}

  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // 1. Same currency → return 1.0
    if (fromCurrency === toCurrency) return 1.0;

    // 2. Try direct lookup (USD→EUR)
    const direct = await this.repository.getRate(fromCurrency, toCurrency);
    if (direct) return direct.rate;

    // 3. Try inverse lookup (EUR→USD → calculate 1/rate)
    const inverse = await this.repository.getRate(toCurrency, fromCurrency);
    if (inverse) return 1 / inverse.rate;

    // 4. No rate found → throw error
    throw new NoRateAvailableError(fromCurrency, toCurrency);
  }

  async setRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
  ): Promise<void> {
    await this.repository.storeRate({
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      rate,
      source: "manual",
      priority: 100, // Overrides API rates
      metadata: JSON.stringify({ note: "Manually entered" }),
    });
  }
}
```

---

## Conversion Example

```typescript
// Input: $12.34 USD → EUR
const amountUSD = 1234; // cents
const rate = await provider.getRate("USD", "EUR"); // 0.92

// Convert with rounding
const amountEUR = Math.round(amountUSD * rate); // 1135 cents (€11.35)

// Result is deterministic:
// Same inputs (1234, 0.92) → always 1135
```

---

## Error Handling

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

// Usage
try {
  const rate = await provider.getRate("USD", "JPY");
} catch (error) {
  if (error instanceof NoRateAvailableError) {
    // Show manual entry prompt
    showManualRateDialog(error.fromCurrency, error.toCurrency);
  } else {
    throw error;
  }
}
```

---

## Migration Steps

1. **Generate**:

   ```bash
   npx drizzle-kit generate --config drizzle.config.ts
   ```

2. **Review** generated SQL in `src/db/migrations/NNNN_*.sql`

3. **Update** `src/db/migrations/migrations.js`:

   ```javascript
   const m0004 = "CREATE TABLE fx_rates ...";
   export default { "0004_add_fx_rates": m0004 };
   ```

4. **Test** locally: `npm run android`

5. **Commit** all migration files + schema

---

## Implementation Phases

| Phase | Owner                        | Deliverable                        | ETA    |
| ----- | ---------------------------- | ---------------------------------- | ------ |
| 0     | SYSTEM ARCHITECT             | Schema design (✅ DONE)            | Done   |
| 1     | LOCAL DATA ENGINEER          | FxRateRepository                   | Week 1 |
| 2     | DISPLAY INTEGRATION ENGINEER | CachedFxRateProvider               | Week 2 |
| 3     | LOCAL DATA ENGINEER          | API Fetchers (Frankfurter, ExchRt) | Week 3 |
| 4     | LOCAL DATA ENGINEER          | Background sync hook               | Week 4 |
| 5     | UI/UX ENGINEER               | Manual rate entry UI               | Week 5 |
| 6     | SETTLEMENT INTEGRATION ENG   | Trip snapshots (optional)          | Week 6 |

---

## Key Files

| File                           | Purpose                         |
| ------------------------------ | ------------------------------- |
| `src/db/schema/fx-rates.ts`    | Schema definition               |
| `MIGRATION_PLAN_FX_RATES.md`   | Migration step-by-step guide    |
| `FX_SCHEMA_DESIGN.md`          | Architecture deep-dive (25 pgs) |
| `FX_IMPLEMENTATION_SUMMARY.md` | Implementation roadmap          |
| `FX_SCHEMA_QUICK_REFERENCE.md` | This file (quick lookup)        |

---

## Testing Checklist

### Unit Tests

- [ ] Store rate and retrieve by currency pair
- [ ] Priority system (manual > frankfurter > exchangerate-api > sync)
- [ ] Most recent rate wins when priorities equal
- [ ] Inverse conversion (1/rate)
- [ ] Same currency returns 1.0
- [ ] Archived rates excluded from lookups
- [ ] Batch fetch returns correct rates

### Integration Tests

- [ ] Fetch from Frankfurter → store → retrieve
- [ ] Fetch from ExchangeRate-API → store → retrieve
- [ ] Offline conversion uses cached rate
- [ ] Manual rate overrides API rate
- [ ] Stale rate shows warning but still usable
- [ ] Snapshot preserves trip rates

### Edge Cases

- [ ] No rate available → error thrown
- [ ] Stale rate (>7 days) → warning shown
- [ ] Conflicting sources → highest priority wins
- [ ] Network failure → graceful fallback
- [ ] Trip deletion → snapshots CASCADE deleted
- [ ] Rate deletion blocked if snapshots exist (RESTRICT)

---

## Performance Targets

| Operation              | Target | Index Used          |
| ---------------------- | ------ | ------------------- |
| Get single rate        | <10ms  | `currency_pair_idx` |
| Batch fetch (10 pairs) | <50ms  | `currency_pair_idx` |
| Find stale rates       | <100ms | `fetched_at_idx`    |
| Store rate             | <20ms  | N/A (INSERT)        |
| Archive rate           | <20ms  | N/A (UPDATE)        |

**Storage estimate**: ~900 KB for 4,500 versioned rates (1 year usage)

---

## Compliance

### Frankfurter

- No API key required
- No usage limits
- Attribution: Optional but recommended

### ExchangeRate-API

- No API key required (open endpoint)
- Rate limit: Lenient (1/day acceptable)
- Attribution: **REQUIRED** - Add to About screen:
  ```
  Exchange rates provided by ExchangeRate-API
  https://www.exchangerate-api.com
  ```

---

## Support

**Questions?** Refer to:

- **Schema questions**: `FX_SCHEMA_DESIGN.md`
- **Migration questions**: `MIGRATION_PLAN_FX_RATES.md`
- **Implementation questions**: `FX_IMPLEMENTATION_SUMMARY.md`
- **Quick lookup**: This file

**Ready to start?** Run:

```bash
npx drizzle-kit generate --config drizzle.config.ts
```
