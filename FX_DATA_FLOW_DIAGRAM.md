# FX Rates: Complete Data Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                             │
│                                                                      │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │  Trip Screen │  │ Manual Rate   │  │  Settings Screen        │  │
│  │              │  │  Entry Modal  │  │  - Refresh rates        │  │
│  │ Display:     │  │               │  │  - View rate history    │  │
│  │ USD 12.34    │  │ USD → EUR     │  │  - Last updated: 2d ago │  │
│  │ (€11.35)     │  │ Rate: 0.92    │  │                         │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬────────────────┘  │
│         │                   │                   │                    │
└─────────┼───────────────────┼───────────────────┼────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         HOOKS LAYER                                  │
│                                                                      │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │ use-settlement-with- │  │ use-fx-sync.ts  │  │ use-fx-      │   │
│  │ display.ts           │  │                 │  │ provider.ts  │   │
│  │ (UI integration)     │  │ - Check stale   │  │              │   │
│  │                      │  │ - Trigger fetch │  │ - Get rate   │   │
│  │ Wraps settlement     │  │ - Show toast    │  │ - Set rate   │   │
│  │ with display FX      │  │                 │  │              │   │
│  └──────────┬───────────┘  └────────┬────────┘  └──────┬───────┘   │
│             │                       │                   │            │
└─────────────┼───────────────────────┼───────────────────┼────────────┘
              │                       │                   │
              ▼                       ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                            │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │           DisplayCurrencyAdapter (Existing)                    │  │
│  │                                                                 │  │
│  │  convertSettlement(settlement, displayCurrency)                 │  │
│  │    └─> For each amount: round(amount * getRate(trip, display)) │  │
│  └─────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
│  ┌─────────────────────────────▼───────────────────────────────────┐  │
│  │           CachedFxRateProvider (NEW - Phase 2)                  │  │
│  │                                                                  │  │
│  │  getRate(from, to):                                             │  │
│  │    1. If from === to: return 1.0                                │  │
│  │    2. Try direct lookup (USD→EUR)                               │  │
│  │    3. Try inverse lookup (EUR→USD → 1/rate)                     │  │
│  │    4. Throw NoRateAvailableError                                │  │
│  │                                                                  │  │
│  │  setRate(from, to, rate):                                       │  │
│  │    → Store as source='manual', priority=100                     │  │
│  └─────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                               │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │           FxRateRepository (NEW - Phase 1)                     │  │
│  │                                                                 │  │
│  │  getRate(base, quote):                                         │  │
│  │    SELECT * FROM fx_rates                                      │  │
│  │    WHERE base_currency = ? AND quote_currency = ?              │  │
│  │      AND is_archived = 0                                       │  │
│  │    ORDER BY priority DESC, fetched_at DESC                     │  │
│  │    LIMIT 1                                                     │  │
│  │                                                                 │  │
│  │  storeRate(rate):                                              │  │
│  │    INSERT INTO fx_rates VALUES (...)                           │  │
│  │                                                                 │  │
│  │  getRatesForCurrencies(currencies):                            │  │
│  │    Batch fetch all pairs: USD→EUR, EUR→USD, USD→GBP, etc.     │  │
│  │                                                                 │  │
│  │  getStaleRates(maxAgeDays):                                    │  │
│  │    SELECT * WHERE fetched_at < datetime('now', '-7 days')      │  │
│  └─────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                               │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   SQLite (crewsplit.db)                        │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ fx_rates                                                 │  │  │
│  │  │ ─────────────────────────────────────────────────────── │  │  │
│  │  │ id | base | quote | rate | source | fetched_at | ...    │  │  │
│  │  │ abc| USD  | EUR   | 0.92 | frank. | 2025-01-15 | ...    │  │  │
│  │  │ def| USD  | GBP   | 0.79 | frank. | 2025-01-15 | ...    │  │  │
│  │  │ ghi| USD  | EUR   | 0.90 | manual | 2025-01-10 | ...    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ fx_rate_snapshots (Optional)                            │  │  │
│  │  │ ─────────────────────────────────────────────────────── │  │  │
│  │  │ id  | trip_id | fx_rate_id | snapshot_type | ...        │  │  │
│  │  │ xyz | trip_1  | abc        | trip_close    | ...        │  │  │
│  │  │ uvw | trip_1  | def        | trip_close    | ...        │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Online Rate Refresh

```
1. APP STARTUP
   ├─> useDbMigrations() runs
   │   └─> fx_rates, fx_rate_snapshots tables created
   │
   └─> use-fx-sync.ts hook initializes
       └─> Check staleness

2. STALENESS CHECK
   ├─> Query: SELECT MIN(fetched_at) FROM fx_rates
   │           WHERE source IN ('frankfurter', 'exchangerate-api')
   │             AND is_archived = 0
   │
   ├─> ageDays = daysBetween(minFetchedAt, now())
   │
   └─> If ageDays > 7 AND navigator.onLine:
       └─> Trigger background refresh

3. BACKGROUND REFRESH (Phase 3)
   ├─> Try Frankfurter API:
   │   GET https://api.frankfurter.dev/latest?base=USD&symbols=EUR,GBP,JPY
   │   │
   │   ├─> Success:
   │   │   └─> FrankfurterFetcher.parse(response)
   │   │       └─> Repository.storeRate(USD→EUR, 0.92, 'frankfurter')
   │   │       └─> Repository.storeRate(USD→GBP, 0.79, 'frankfurter')
   │   │       └─> Repository.storeRate(USD→JPY, 149.85, 'frankfurter')
   │   │       └─> Show toast: "Exchange rates updated"
   │   │
   │   └─> Fail:
   │       └─> Try ExchangeRate-API (fallback)
   │           GET https://open.er-api.com/v6/latest/USD
   │           │
   │           ├─> Success:
   │           │   └─> Store with source='exchangerate-api', priority=40
   │           │
   │           └─> Fail:
   │               └─> Log warning, continue with cached rates

4. RATE STORAGE
   ├─> Generate UUID: id = crypto.randomUUID()
   │
   ├─> INSERT INTO fx_rates VALUES (
   │     id: 'abc123',
   │     base_currency: 'USD',
   │     quote_currency: 'EUR',
   │     rate: 0.92,
   │     source: 'frankfurter',
   │     fetched_at: '2025-01-15T16:00:00Z',
   │     priority: 50,
   │     metadata: '{"api_date":"2025-01-15"}',
   │     is_archived: 0
   │   )
   │
   └─> Old rate (same pair, same source) remains in table
       (versioning - audit trail)
```

---

## Data Flow: Display Currency Conversion

```
1. USER VIEWS SETTLEMENT
   ├─> Trip currency: USD
   ├─> Display currency: EUR (user preference)
   └─> Settlement result: Alice owes Bob $12.34 (1234 cents)

2. UI CALLS HOOK
   use-settlement-with-display.ts:
   └─> const { settlement, displaySettlement } = useSettlementWithDisplay(tripId, 'EUR')

3. HOOK WRAPS SETTLEMENT SERVICE
   ├─> Settlement calculated in trip currency (USD):
   │   {
   │     transactions: [
   │       { from: 'Alice', to: 'Bob', amountMinor: 1234 }
   │     ],
   │     currency: 'USD'
   │   }
   │
   └─> DisplayCurrencyAdapter.convertSettlement(settlement, 'EUR')

4. ADAPTER CONVERTS AMOUNTS
   For each transaction:
   ├─> getRate('USD', 'EUR')
   │   │
   │   └─> CachedFxRateProvider.getRate('USD', 'EUR')
   │       │
   │       ├─> Check: USD === EUR? No
   │       │
   │       ├─> Direct lookup:
   │       │   FxRateRepository.getRate('USD', 'EUR')
   │       │   │
   │       │   └─> Query: SELECT * FROM fx_rates
   │       │               WHERE base_currency = 'USD'
   │       │                 AND quote_currency = 'EUR'
   │       │                 AND is_archived = 0
   │       │               ORDER BY priority DESC, fetched_at DESC
   │       │               LIMIT 1
   │       │       │
   │       │       ├─> Found: { rate: 0.92, source: 'frankfurter', ... }
   │       │       └─> Return 0.92
   │       │
   │       └─> Rate: 0.92
   │
   └─> Convert: Math.round(1234 * 0.92) = 1135 cents

5. UI DISPLAYS RESULT
   Alice owes Bob €11.35
   (Last updated: 2 days ago)
```

---

## Data Flow: Manual Rate Entry

```
1. USER OPENS SETTINGS
   └─> Tap "Exchange Rates"
       └─> Navigate to ManualRateScreen

2. USER FILLS FORM
   ├─> Base currency: USD (dropdown)
   ├─> Quote currency: EUR (dropdown)
   └─> Rate: 0.92 (number input)

3. USER TAPS "SAVE"
   └─> Validation:
       ├─> Rate > 0? ✓
       ├─> Valid ISO codes? ✓
       └─> Currencies different? ✓

4. SAVE TO DATABASE
   FxRateRepository.storeRate({
     baseCurrency: 'USD',
     quoteCurrency: 'EUR',
     rate: 0.92,
     source: 'manual',
     priority: 100,  // Highest priority - overrides API rates
     metadata: JSON.stringify({
       note: 'Manually entered',
       enteredBy: 'User',
     }),
   })
   │
   └─> INSERT INTO fx_rates VALUES (
         id: crypto.randomUUID(),
         base_currency: 'USD',
         quote_currency: 'EUR',
         rate: 0.92,
         source: 'manual',
         fetched_at: NOW(),  // Entry timestamp
         priority: 100,
         metadata: '{"note":"Manually entered"}',
         is_archived: 0
       )

5. MANUAL RATE NOW ACTIVE
   ├─> Future conversions USD→EUR use 0.92 (manual)
   ├─> API rates (priority=50) are ignored
   └─> Toast: "Manual rate saved: USD → EUR = 0.92"
```

---

## Data Flow: Trip Export with Rate Snapshot

```
1. USER EXPORTS TRIP
   └─> Trip X with expenses in USD, EUR, GBP

2. SETTLEMENT SERVICE IDENTIFIES RATES
   SettlementService.calculate(tripId)
   │
   ├─> Expenses use multiple currencies:
   │   - Expense A: 50 EUR (converted to USD at rate 1.087)
   │   - Expense B: 100 GBP (converted to USD at rate 1.267)
   │
   └─> Identify used rates:
       ├─> EUR→USD: rate_id = 'def456' (rate: 1.087)
       └─> GBP→USD: rate_id = 'ghi789' (rate: 1.267)

3. CREATE SNAPSHOTS
   For each rate:
   │
   ├─> INSERT INTO fx_rate_snapshots VALUES (
   │     id: crypto.randomUUID(),
   │     trip_id: 'trip_x',
   │     fx_rate_id: 'def456',  // EUR→USD
   │     snapshot_type: 'export',
   │     snapshot_at: NOW()
   │   )
   │
   └─> INSERT INTO fx_rate_snapshots VALUES (
         id: crypto.randomUUID(),
         trip_id: 'trip_x',
         fx_rate_id: 'ghi789',  // GBP→USD
         snapshot_type: 'export',
         snapshot_at: NOW()
       )

4. EXPORT BUNDLE INCLUDES
   ├─> Trip metadata (name, dates, currency)
   ├─> Participants
   ├─> Expenses (with originalCurrency, convertedAmountMinor)
   ├─> Expense splits
   ├─> FX rate snapshots (trip_id, fx_rate_id, snapshot_type)
   └─> Actual FX rates (id, base, quote, rate, source, fetched_at)
       │
       └─> Query: SELECT fr.* FROM fx_rate_snapshots frs
                   JOIN fx_rates fr ON frs.fx_rate_id = fr.id
                   WHERE frs.trip_id = 'trip_x'

5. IMPORT ON ANOTHER DEVICE
   ├─> Import trip data
   ├─> Import expenses
   ├─> Import FX rates (if not already present)
   ├─> Import snapshots (link trip to rates)
   │
   └─> Settlement recalculated with EXACT same rates
       → Deterministic: Same inputs = Same outputs
```

---

## Data Flow: Staleness Detection & Warning

```
1. USER OPENS SETTLEMENT SCREEN
   └─> Display currency: EUR

2. HOOK FETCHES RATE
   CachedFxRateProvider.getRate('USD', 'EUR')
   │
   └─> Repository returns:
       {
         rate: 0.92,
         source: 'frankfurter',
         fetchedAt: '2025-01-01T16:00:00Z'  // 14 days ago
       }

3. ADAPTER CHECKS STALENESS
   ageDays = daysBetween('2025-01-01', NOW())  // 14 days
   │
   ├─> Is manual? No (source='frankfurter')
   ├─> ageDays > 7? Yes (14 > 7)
   └─> isStale = true

4. UI SHOWS WARNING
   ┌─────────────────────────────────────────┐
   │ Settlement                              │
   │ ─────────────────────────────────────── │
   │ Alice owes Bob €11.35                   │
   │                                         │
   │ ⚠️ Exchange rate is 14 days old         │
   │ [Tap to refresh rates]                  │
   └─────────────────────────────────────────┘

5. USER TAPS "REFRESH"
   └─> Trigger use-fx-sync.ts refresh()
       └─> Fetch from API → Store new rates
           └─> Toast: "Rates updated. Settlement recalculated."
```

---

## Data Flow: Priority Conflict Resolution

```
SCENARIO: Multiple rates exist for USD→EUR

Database state:
┌──────┬──────┬───────┬──────┬────────────┬─────────────┬──────────┐
│ id   │ base │ quote │ rate │ source     │ fetched_at  │ priority │
├──────┼──────┼───────┼──────┼────────────┼─────────────┼──────────┤
│ abc  │ USD  │ EUR   │ 0.90 │ manual     │ 2025-01-10  │ 100      │
│ def  │ USD  │ EUR   │ 0.92 │ frankfurter│ 2025-01-15  │ 50       │
│ ghi  │ USD  │ EUR   │ 0.91 │ sync       │ 2025-01-14  │ 30       │
└──────┴──────┴───────┴──────┴────────────┴─────────────┴──────────┘

QUERY:
  SELECT * FROM fx_rates
  WHERE base_currency = 'USD'
    AND quote_currency = 'EUR'
    AND is_archived = 0
  ORDER BY priority DESC,     -- 1st sort: 100 > 50 > 30
           fetched_at DESC    -- 2nd sort: 2025-01-15 > 2025-01-14 > 2025-01-10
  LIMIT 1

RESULT:
  Row 1: abc (manual, priority=100, rate=0.90)

EXPLANATION:
  Manual rate (priority=100) wins, even though:
  - It's older (2025-01-10 vs 2025-01-15)
  - Frankfurter rate is more recent
  → User override takes precedence
```

---

## Data Flow: Inverse Rate Calculation

```
SCENARIO: Need EUR→USD, but only USD→EUR exists

Database state:
┌──────┬──────┬───────┬──────┬────────────┬─────────────┐
│ id   │ base │ quote │ rate │ source     │ fetched_at  │
├──────┼──────┼───────┼──────┼────────────┼─────────────┤
│ abc  │ USD  │ EUR   │ 0.92 │ frankfurter│ 2025-01-15  │
└──────┴──────┴───────┴──────┴────────────┴─────────────┘

QUERY FLOW:

1. getRate('EUR', 'USD')
   │
   ├─> Direct lookup: EUR→USD
   │   Query: WHERE base='EUR' AND quote='USD'
   │   Result: NOT FOUND
   │
   └─> Inverse lookup: USD→EUR
       Query: WHERE base='USD' AND quote='EUR'
       Result: FOUND { rate: 0.92 }
       │
       └─> Calculate inverse: 1 / 0.92 = 1.08695652...
           Return: 1.08695652

2. Conversion: €10.00 → USD
   Math.round(1000 * 1.08695652) = 1087 cents ($10.87)

NOTE: Inverse is calculated on-the-fly, NOT stored in database
      → Avoids duplication, preserves single source of truth
```

---

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                      Module Structure                        │
└─────────────────────────────────────────────────────────────┘

src/modules/fx/
├── repository/
│   └── FxRateRepository.ts        (Phase 1)
│       └─> Depends on: db, schema
│
├── providers/
│   └── CachedFxRateProvider.ts    (Phase 2)
│       └─> Depends on: FxRateRepository
│
├── fetchers/
│   ├── FrankfurterFetcher.ts      (Phase 3)
│   └── ExchangeRateApiFetcher.ts  (Phase 3)
│       └─> Depends on: FxRateRepository
│
├── hooks/
│   ├── use-fx-provider.ts         (Phase 2)
│   │   └─> Depends on: CachedFxRateProvider
│   │
│   └── use-fx-sync.ts             (Phase 4)
│       └─> Depends on: Fetchers, Repository
│
├── screens/
│   ├── ManualRateScreen.tsx       (Phase 5)
│   └── RateListScreen.tsx         (Phase 5)
│       └─> Depends on: use-fx-provider
│
└── types.ts                        (Phase 1)

Integration points:
├─> DisplayCurrencyAdapter         (Existing)
│   └─> Replace StubFxRateProvider with CachedFxRateProvider
│
└─> use-settlement-with-display.ts (Existing)
    └─> Uses DisplayCurrencyAdapter (no changes needed)
```

---

## Performance Characteristics

### Query Performance

| Query Type          | Index Used           | Time Complexity | Typical Latency |
|---------------------|----------------------|-----------------|-----------------|
| Get single rate     | currency_pair_idx    | O(log n)        | <10ms           |
| Batch fetch 10 pairs| currency_pair_idx    | O(k log n)      | <50ms           |
| Find stale rates    | fetched_at_idx       | O(log n)        | <100ms          |
| Store rate          | None (INSERT)        | O(log n)        | <20ms           |
| Archive rate        | None (UPDATE by PK)  | O(1)            | <20ms           |

**Where**:
- n = total rates in database (~4,500 after 1 year)
- k = number of currency pairs requested

### Storage Growth

```
Year 1:
├─> 30 currencies in use
├─> 30×30 = 900 possible pairs
├─> Store both directions: 1,800 rates
├─> 1 fetch/day × 365 days = 365 versions/pair
└─> Total: ~1,800 rates (versions replace old ones via priority)
    Storage: ~360 KB

Year 2:
├─> Assuming old rates archived
└─> Total: ~2,500 rates
    Storage: ~500 KB

Snapshot growth:
├─> 100 trips/year
├─> Avg 3 currency pairs/trip
├─> 3 snapshots/trip
└─> Total: 300 snapshots/year (~30 KB)
```

---

## Error Recovery Paths

### Error: No Rate Available

```
User enters expense in JPY
  └─> Settlement tries to convert JPY→USD
      └─> CachedFxRateProvider.getRate('JPY', 'USD')
          └─> Direct lookup: NOT FOUND
              └─> Inverse lookup (USD→JPY): NOT FOUND
                  └─> Throw NoRateAvailableError('JPY', 'USD')
                      │
                      └─> UI catches error:
                          ┌──────────────────────────────────┐
                          │ Exchange Rate Needed             │
                          │ ──────────────────────────────── │
                          │ JPY → USD                        │
                          │                                  │
                          │ [Fetch online] [Enter manually]  │
                          └──────────────────────────────────┘
                          │
                          ├─> [Fetch online]:
                          │   └─> Trigger use-fx-sync refresh
                          │       └─> If success: Retry conversion
                          │           If fail: Show manual entry
                          │
                          └─> [Enter manually]:
                              └─> Navigate to ManualRateScreen
                                  pre-filled with JPY→USD
```

### Error: Network Failure During Sync

```
use-fx-sync.ts triggers refresh
  └─> FrankfurterFetcher.fetch()
      └─> fetch('https://api.frankfurter.dev/latest')
          └─> Network error (offline/timeout)
              │
              ├─> Catch error
              │   └─> Log: "Failed to fetch Frankfurter rates"
              │       └─> Try fallback: ExchangeRateApiFetcher
              │           └─> Also fails
              │               │
              │               └─> Log: "All FX sources failed"
              │                   Toast: "Could not update rates. Using cached."
              │                   │
              │                   └─> App continues normally
              │                       (cached rates still usable)
```

### Error: Invalid Rate Entry

```
User enters manual rate
  └─> Form validation:
      ├─> Rate <= 0? → "Rate must be positive"
      ├─> Rate > 1000? → "Rate seems unrealistic. Confirm?"
      ├─> Same currency? → "Cannot convert currency to itself"
      └─> Invalid ISO code? → "Invalid currency code"
```

---

## Key Takeaways

1. **Offline-first**: All conversions use local cache
2. **Deterministic**: Same inputs → same outputs via integer math
3. **Auditable**: Full trail of rates used (snapshots)
4. **Flexible**: Multi-source support without schema changes
5. **User control**: Manual rates always win (priority=100)
6. **Graceful degradation**: Network failures don't block app
7. **Performance**: O(log n) lookups via indexes
8. **Storage efficient**: ~500 KB after 2 years

**Next Step**: Generate migration with `npx drizzle-kit generate`
