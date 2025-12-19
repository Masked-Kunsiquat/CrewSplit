# FX Rate UI Integration Guide

**Phase 6 Completion: Error Recovery Modals and Staleness Warnings**

This document describes the complete UI integration of exchange rate error handling and staleness warnings in the CrewSplit application.

## Overview

The FX rate UI integration provides non-blocking, user-friendly error recovery when exchange rates are missing or stale. Users can:

1. **See staleness warnings** when rates are >7 days old
2. **Fetch rates online** with a single tap
3. **Enter rates manually** as a fallback
4. **Dismiss warnings** without blocking core functionality

## Components

### 1. NoRateAvailableModal

**Location**: `src/ui/components/NoRateAvailableModal.tsx`

**Purpose**: Shown when a required exchange rate is completely missing from the cache.

**Props**:
- `visible: boolean` - Whether modal is displayed
- `fromCurrency: string` - Source currency code
- `toCurrency: string` - Target currency code
- `onFetchOnline?: () => void` - Handler for "Fetch Online" button
- `onEnterManually?: () => void` - Handler for "Enter Manually" button
- `onDismiss?: () => void` - Handler for modal dismissal
- `fetching?: boolean` - Show loading state during fetch

**Usage Example**:
```tsx
<NoRateAvailableModal
  visible={rateModalVisible}
  fromCurrency="USD"
  toCurrency="EUR"
  onFetchOnline={handleFetchOnline}
  onEnterManually={handleEnterManually}
  onDismiss={() => setRateModalVisible(false)}
  fetching={fxRefreshing}
/>
```

### 2. StalenessWarningBanner

**Location**: `src/ui/components/StalenessWarningBanner.tsx`

**Purpose**: Non-intrusive banner shown at top of screen when rates are >7 days old.

**Props**:
- `currencyPair?: string` - Display string like "USD → EUR"
- `daysOld: number` - Age of oldest rate
- `onRefresh?: () => void` - Handler for refresh button
- `refreshing?: boolean` - Show loading state during refresh

**Usage Example**:
```tsx
{isStale && daysOld && (
  <StalenessWarningBanner
    currencyPair="USD → EUR"
    daysOld={14}
    onRefresh={handleRefreshStaleRates}
    refreshing={fxRefreshing}
  />
)}
```

## Integrated Screens

### SettlementSummaryScreen

**Location**: `src/modules/settlement/screens/SettlementSummaryScreen.tsx`

**Integration Points**:

1. **Imports**:
   ```tsx
   import { NoRateAvailableModal, StalenessWarningBanner } from "@ui/components";
   import { useFxSync } from "@modules/fx-rates/hooks/use-fx-sync";
   ```

2. **Hooks**:
   ```tsx
   const {
     settlement,
     conversionError, // NEW - error when rate missing
     refetch: refetchSettlement,
   } = useSettlementWithDisplay(tripId, displayCurrency);

   const {
     isStale,
     daysOld,
     refreshing: fxRefreshing,
     refreshNow: refreshFxRates,
   } = useFxSync({ autoRefresh: false });
   ```

3. **State**:
   ```tsx
   const [rateModalVisible, setRateModalVisible] = useState(false);
   ```

4. **Handlers**:
   ```tsx
   const handleFetchOnline = async () => {
     await refreshFxRates();
     setRateModalVisible(false);
     await refetchSettlement();
   };

   const handleEnterManually = () => {
     setRateModalVisible(false);
     router.push(`/fx-rates/manual?from=${fromCurrency}&to=${toCurrency}`);
   };

   const handleRefreshStaleRates = async () => {
     await refreshFxRates();
     await refetchSettlement();
   };
   ```

5. **UI Placement**:
   - **Staleness Banner**: At top of ScrollView, before expense breakdown
   - **No Rate Modal**: After TripExportModal at end of component

### ExpenseDetailsScreen

**Location**: `src/modules/expenses/screens/ExpenseDetailsScreen.tsx`

**Integration Points**:

1. **Imports**: Same as SettlementSummaryScreen

2. **Conversion Logic**:
   ```tsx
   const displayAmounts = useMemo(() => {
     try {
       setConversionError(null);
       const fxRate = cachedFxRateProvider.getRate(
         expense.currency,
         displayCurrency,
       );
       // ... conversion logic
     } catch (error) {
       setConversionError({
         fromCurrency: expense.currency,
         toCurrency: displayCurrency,
       });
       return null;
     }
   }, [expense, displayCurrency]);
   ```

3. **State**:
   ```tsx
   const [rateModalVisible, setRateModalVisible] = useState(false);
   const [conversionError, setConversionError] = useState<{
     fromCurrency: string;
     toCurrency: string;
   } | null>(null);
   ```

4. **UI Placement**:
   - **Staleness Banner**: At top of ScrollView, before expense info
   - **No Rate Modal**: After TripExportModal

## User Flows

### Happy Path (Fresh Rates)

1. User opens settlement/expense screen
2. Display currency conversion works (rates < 7 days old)
3. No warnings or modals shown
4. Amounts displayed in both trip and display currencies

### Missing Rate Flow

1. User opens settlement/expense screen
2. Conversion fails (rate not in cache)
3. **NoRateAvailableModal** appears immediately
4. User has 3 options:
   - **Fetch Online**: Downloads latest rates, modal closes on success
   - **Enter Manually**: Navigates to manual entry screen with pre-filled currency pair
   - **Cancel**: Closes modal, amounts shown in trip currency only

### Stale Rate Flow

1. User opens settlement/expense screen
2. Conversion succeeds but rates are >7 days old
3. **StalenessWarningBanner** appears at top
4. User can:
   - **Tap Refresh**: Updates rates in background, banner updates/disappears
   - **Ignore**: Continue viewing with stale rates
   - **Pull to refresh**: Also triggers rate refresh via pull-to-refresh gesture

## Error Handling Strategy

### Non-Blocking Design

- Conversion errors **never crash** the app
- Missing rates show modal but allow dismissal
- Stale rates are warnings, not errors
- Users can always view trip currency amounts

### Visual Hierarchy

1. **Critical**: NoRateAvailableModal (centered, darkened backdrop)
2. **Warning**: StalenessWarningBanner (top of screen, yellow/warning color)
3. **Informational**: Display currency amounts (secondary, muted text)

### Loading States

- **Fetching rates**: Modal shows loading spinner with "Fetching rates..." text
- **Refreshing**: Banner button shows "Refreshing..." and disables interaction
- **Pull-to-refresh**: Standard pull gesture triggers both data and rate refresh

## Accessibility

All components follow WCAG AA standards:

### NoRateAvailableModal
- `accessibilityLabel`: Describes each button action
- `accessibilityHint`: Explains outcome of interaction
- `accessibilityRole`: "button" for all interactive elements
- Dismissible via backdrop tap or Cancel button

### StalenessWarningBanner
- `accessibilityLabel`: "Refresh exchange rates"
- `accessibilityHint`: "Updates exchange rates from online sources"
- `accessibilityRole`: "button" for refresh action
- `accessibilityState`: `{ busy: refreshing }` during refresh

## Performance Considerations

### Automatic vs Manual Refresh

- **Automatic**: Disabled in screens (`autoRefresh: false`) to avoid duplicate fetches
- **Manual**: User-initiated via banner or modal
- **Background**: Enabled in app root for startup refresh

### Cache Management

- `cachedFxRateProvider` automatically refreshes after new rates persisted
- Settlement/expense screens refetch data after rate updates
- No redundant database queries during refresh

### Offline Behavior

- Network check before attempting online fetch
- Graceful fallback to manual entry if offline
- No blocking operations during startup

## Testing Recommendations

### Unit Tests

```typescript
describe('NoRateAvailableModal', () => {
  it('shows currency pair correctly', () => {});
  it('calls onFetchOnline when button pressed', () => {});
  it('navigates to manual entry on button press', () => {});
  it('shows loading state when fetching', () => {});
});

describe('StalenessWarningBanner', () => {
  it('displays correct days old', () => {});
  it('calls onRefresh when tapped', () => {});
  it('shows refreshing state', () => {});
});
```

### Integration Tests

1. **Missing Rate**:
   - Set display currency to one without cached rate
   - Open settlement screen
   - Verify modal appears
   - Tap "Fetch Online"
   - Verify modal closes and amounts appear

2. **Stale Rate**:
   - Manually set rate timestamp to 10 days ago
   - Open settlement screen
   - Verify banner appears with "10 days old"
   - Tap refresh
   - Verify banner updates/disappears

3. **Error Recovery**:
   - Disconnect from internet
   - Trigger "Fetch Online"
   - Verify error handling (modal stays open or shows error)

### E2E Tests

1. Complete user journey from missing rate to successful display
2. Test navigation to manual entry screen with pre-filled values
3. Verify pull-to-refresh triggers rate update
4. Test accessibility features with screen reader

## Future Enhancements

### Phase 7+ Considerations

1. **Toast Notifications**: Success/failure messages after refresh
2. **Rate Age Indicator**: Show age inline with amounts (e.g., "EUR 50.00 (7d old)")
3. **Batch Refresh**: Update multiple currency pairs at once
4. **Rate History**: Show historical rates for auditing
5. **Offline Queue**: Queue rate fetches when offline, retry when online

## Troubleshooting

### Modal Doesn't Appear

- Check `conversionError` is being set in catch block
- Verify `useEffect` dependency array includes `conversionError`
- Ensure `NoRateAvailableModal` is rendered at component root level

### Banner Doesn't Show

- Verify `isStale` is true (check `useFxSync` return value)
- Ensure `daysOld` is not null
- Check conditional render logic includes `showDisplayCurrency`

### Refresh Doesn't Work

- Check network connectivity
- Verify API endpoint is accessible
- Check database permissions for rate updates
- Ensure `cachedFxRateProvider.refreshCache()` is called

### Amounts Still Wrong After Refresh

- Verify `refetchSettlement()`/`refetchExpense()` is called after rate refresh
- Check cache invalidation in `cachedFxRateProvider`
- Ensure conversion logic uses refreshed rates

## Summary

Phase 6 completes the FX rate UI integration with:

- **Non-blocking error recovery** via modals and banners
- **User-friendly workflows** for fetching or entering rates
- **Accessible components** following WCAG standards
- **Performance-optimized** with proper cache management
- **Thoroughly documented** for future maintenance

All components follow the "zero friction" UX philosophy: minimal user input, clear visual feedback, and graceful error handling.
