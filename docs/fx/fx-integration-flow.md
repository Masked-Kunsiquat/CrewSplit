# FX Rate Integration Flow Diagram

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Opens Screen                            │
│                  (Settlement or Expense Details)                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    useSettlementWithDisplay                          │
│                  OR displayAmounts (useMemo)                         │
│                                                                       │
│  Attempts to convert from trip currency to display currency          │
└──────────────────┬────────────────────────────┬─────────────────────┘
                   │                            │
         ┌─────────┴────────┐        ┌─────────┴────────┐
         │   SUCCESS        │        │    FAILURE       │
         │  (Rate found)    │        │ (Rate missing)   │
         └─────────┬────────┘        └─────────┬────────┘
                   │                            │
                   ▼                            ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Check Rate Staleness        │  │  Set conversionError         │
│  (useFxSync hook)            │  │  Show NoRateAvailableModal   │
│                              │  │                              │
│  - Query database for age    │  │  User Options:              │
│  - Calculate days old        │  │  1. Fetch Online            │
│  - Set isStale flag          │  │  2. Enter Manually          │
└──────────────┬───────────────┘  │  3. Cancel                  │
               │                   └──────────────┬───────────────┘
     ┌─────────┴─────────┐                       │
     │                   │                       │
     ▼                   ▼                       ▼
┌─────────┐      ┌───────────────┐   ┌──────────────────────────┐
│ Fresh   │      │ Stale         │   │ User Chooses Action      │
│ (<7d)   │      │ (>7d)         │   │                          │
│         │      │               │   │ [Fetch Online]           │
│ No      │      │ Show          │   │    ↓                     │
│ Warning │      │ Staleness     │   │ Call refreshFxRates()    │
│         │      │ Banner        │   │    ↓                     │
└─────────┘      │               │   │ Close modal              │
                 │ User Can:     │   │    ↓                     │
                 │ - Refresh     │   │ Refetch settlement/data  │
                 │ - Ignore      │   │                          │
                 └───────┬───────┘   │ [Enter Manually]         │
                         │           │    ↓                     │
                         │           │ Navigate to             │
                         ▼           │ /fx-rates/manual        │
             ┌────────────────────┐  │ with prefilled params   │
             │ User Taps Refresh  │  │                          │
             │ on Banner          │  │ [Cancel]                 │
             └──────────┬─────────┘  │    ↓                     │
                        │            │ Close modal              │
                        │            │ Show trip currency only  │
                        ▼            └──────────────────────────┘
            ┌────────────────────┐
            │ refreshFxRates()   │
            │                    │
            │ Steps:             │
            │ 1. Fetch from API  │
            │ 2. Persist to DB   │
            │ 3. Refresh cache   │
            │ 4. Refetch data    │
            └──────────┬─────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Updated Amounts    │
            │ Displayed          │
            │                    │
            │ Banner updates or  │
            │ disappears         │
            └────────────────────┘
```

## Component Communication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SettlementSummaryScreen                          │
└────────┬─────────────────────────────────┬────────────────┬─────────┘
         │                                 │                │
         ▼                                 ▼                ▼
┌──────────────────┐           ┌──────────────────┐  ┌──────────────┐
│ useSettlement    │           │ useFxSync        │  │ useState     │
│ WithDisplay      │           │                  │  │              │
│                  │           │ Returns:         │  │ - modal      │
│ Returns:         │           │ - isStale        │  │   visible    │
│ - settlement     │           │ - daysOld        │  │              │
│ - conversionError│           │ - refreshing     │  └──────────────┘
│ - refetch        │           │ - refreshNow     │
└────────┬─────────┘           └──────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │      Event Handlers          │
         │                              │
         │ handleFetchOnline()          │
         │ handleEnterManually()        │
         │ handleRefreshStaleRates()    │
         └──────────────┬───────────────┘
                        │
         ┌──────────────┴───────────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌──────────────────────┐
│ NoRateAvailable  │         │ StalenessWarning     │
│ Modal            │         │ Banner               │
│                  │         │                      │
│ Props:           │         │ Props:               │
│ - visible        │         │ - currencyPair       │
│ - fromCurrency   │         │ - daysOld            │
│ - toCurrency     │         │ - onRefresh          │
│ - onFetchOnline  │         │ - refreshing         │
│ - onEnterManually│         └──────────────────────┘
│ - onDismiss      │
│ - fetching       │
└──────────────────┘
```

## Data Flow Through Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI Layer (Screens)                          │
│  SettlementSummaryScreen, ExpenseDetailsScreen                       │
│                                                                       │
│  Responsibilities:                                                    │
│  - Render UI components                                              │
│  - Handle user interactions                                          │
│  - Show modals/banners based on hook data                            │
└───────────────────────────┬───────────────────────────────────────┬─┘
                            │                                       │
┌───────────────────────────▼─────────────────────┐  ┌──────────────▼──┐
│          Hook Layer                             │  │  Component Layer│
│  useSettlementWithDisplay, useFxSync            │  │  Modal, Banner  │
│                                                 │  │                 │
│  Responsibilities:                              │  │  Responsibilities│
│  - Orchestrate data fetching                    │  │  - Pure UI      │
│  - Detect errors/staleness                      │  │  - Accessibility│
│  - Provide loading states                       │  │  - Styling      │
│  - Expose refetch functions                     │  └─────────────────┘
└───────────────────────────┬─────────────────────┘
                            │
┌───────────────────────────▼─────────────────────┐
│        Service/Adapter Layer                    │
│  SettlementService, DisplayCurrencyAdapter      │
│  FxRateService                                  │
│                                                 │
│  Responsibilities:                              │
│  - Business logic                               │
│  - Data transformation                          │
│  - Rate conversions                             │
└───────────────────────────┬─────────────────────┘
                            │
┌───────────────────────────▼─────────────────────┐
│         Repository/Provider Layer               │
│  FxRateRepository, cachedFxRateProvider         │
│                                                 │
│  Responsibilities:                              │
│  - Database queries                             │
│  - Cache management                             │
│  - Rate lookups                                 │
└───────────────────────────┬─────────────────────┘
                            │
┌───────────────────────────▼─────────────────────┐
│            Data Layer                           │
│  SQLite Database (fx_rates table)               │
│                                                 │
│  Schema:                                        │
│  - from_currency, to_currency                   │
│  - rate, inverse_rate                           │
│  - fetched_at (for staleness check)             │
└─────────────────────────────────────────────────┘
```

## State Management Flow

```
Initial State
─────────────
rateModalVisible: false
conversionError: null
isStale: false
daysOld: null


Rate Missing Detected
─────────────────────
conversionError: { fromCurrency: 'USD', toCurrency: 'EUR' }
    ↓
useEffect triggers
    ↓
rateModalVisible: true
    ↓
Modal renders


User Action: Fetch Online
──────────────────────────
onClick → handleFetchOnline()
    ↓
fxRefreshing: true (modal shows loading)
    ↓
await refreshFxRates() (API call)
    ↓
Cache refreshed
    ↓
rateModalVisible: false
    ↓
conversionError: null
    ↓
await refetchSettlement() (re-render with new rate)
    ↓
fxRefreshing: false


User Action: Enter Manually
────────────────────────────
onClick → handleEnterManually()
    ↓
rateModalVisible: false
    ↓
router.push('/fx-rates/manual?from=USD&to=EUR')
    ↓
User enters rate manually
    ↓
Cache updated
    ↓
Return to previous screen
    ↓
conversionError: null (rate now available)


Staleness Detected
──────────────────
isStale: true
daysOld: 14
    ↓
Banner renders


User Action: Refresh from Banner
─────────────────────────────────
onClick → handleRefreshStaleRates()
    ↓
fxRefreshing: true (banner shows "Refreshing...")
    ↓
await refreshFxRates()
    ↓
await refetchSettlement()
    ↓
isStale: false (or daysOld updated)
    ↓
fxRefreshing: false
    ↓
Banner disappears or updates
```

## Error Recovery Decision Tree

```
                    ┌─────────────────┐
                    │ Conversion Error│
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ Online Available │        │ Offline          │
    └────────┬─────────┘        └────────┬─────────┘
             │                            │
             ▼                            ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ Show Modal with  │        │ Show Modal with  │
    │ "Fetch" option   │        │ "Enter Manually" │
    └────────┬─────────┘        │ option only      │
             │                   └────────┬─────────┘
             │                            │
    ┌────────┴────────┐                  │
    │                 │                  │
    ▼                 ▼                  ▼
┌─────────┐   ┌──────────────┐   ┌──────────────┐
│ Fetch   │   │ Enter        │   │ Enter        │
│ Online  │   │ Manually     │   │ Manually     │
└────┬────┘   └──────┬───────┘   └──────┬───────┘
     │               │                   │
     │               └────────┬──────────┘
     │                        │
     ▼                        ▼
┌─────────┐          ┌──────────────┐
│ Success │          │ Manual Entry │
└────┬────┘          │ Screen       │
     │               └──────┬───────┘
     │                      │
     │                      ▼
     │               ┌──────────────┐
     │               │ User Enters  │
     │               │ Custom Rate  │
     │               └──────┬───────┘
     │                      │
     └──────────┬───────────┘
                │
                ▼
        ┌──────────────┐
        │ Rate Cached  │
        │ Display      │
        │ Updated      │
        └──────────────┘
```

## Summary

This integration provides:

1. **Automatic Detection**: Errors and staleness detected automatically
2. **Non-Blocking UI**: Users can always view trip currency amounts
3. **Multiple Recovery Options**: Online fetch, manual entry, or cancel
4. **Proactive Warnings**: Stale rates warned before they cause problems
5. **Seamless Updates**: Refreshed data appears immediately after fetch
6. **Offline Resilience**: Manual entry works without internet
7. **Accessibility**: All flows support screen readers and keyboard navigation

The flow ensures users are never stuck or confused when rate issues occur.
