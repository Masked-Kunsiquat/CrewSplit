# FX Rate UI Components - Quick Reference

## Component Hierarchy

```
Settings Screen
│
├─ Exchange Rates Section (Card)
│  ├─ Summary (rate count, last updated)
│  └─ "Manage Exchange Rates" Button
│     └─ Routes to: RateListScreen
│
└─ Display Currency Section (existing)

────────────────────────────────────────────────────

RateListScreen (/fx-rates/)
│
├─ Header (inside FlatList)
│  ├─ StalenessWarningBanner (if stale)
│  │  ├─ Warning icon + message
│  │  └─ "Refresh" button
│  │
│  ├─ Summary Card
│  │  ├─ Total rates
│  │  └─ Oldest update
│  │
│  └─ "Refresh Rates" Button
│
├─ Rate Cards (FlatList items)
│  ├─ Currency pair (USD → EUR)
│  ├─ Rate value (0.9200)
│  ├─ Source icon + label
│  └─ Age (color-coded)
│
├─ Empty State (if no rates)
│  ├─ Icon + message
│  └─ "Add Manual Rate" button
│
└─ Footer
   └─ "Add Manual Rate" Button
      └─ Routes to: ManualRateEntryScreen

────────────────────────────────────────────────────

ManualRateEntryScreen (/fx-rates/manual)
│
├─ Info Card
│  └─ "Manual rates override..." message
│
├─ Currency Pair Section
│  ├─ CurrencyPicker (From)
│  └─ CurrencyPicker (To)
│
├─ Rate Section
│  └─ Input (decimal)
│
├─ Preview Card (conditional)
│  ├─ "1 USD = 0.9200 EUR"
│  └─ "100 USD = 92.00 EUR"
│
└─ Footer
   ├─ "Cancel" Button
   └─ "Save Rate" Button

────────────────────────────────────────────────────

NoRateAvailableModal (overlay component)
│
├─ Backdrop (dismissible)
│
└─ Modal Card
   ├─ Header (icon + title)
   │
   ├─ Body
   │  ├─ Currency pair display (JPY → USD)
   │  └─ Explanation message
   │
   ├─ Loading State (conditional)
   │  ├─ Spinner
   │  └─ "Fetching rates..." text
   │
   └─ Actions (conditional, hidden when loading)
      ├─ "Fetch Online" Button
      ├─ "Enter Manually" Button
      └─ "Cancel" Button (ghost)

────────────────────────────────────────────────────

StalenessWarningBanner (reusable component)
│
├─ Content Row
│  ├─ Warning icon (⚠️)
│  └─ Text Content
│     ├─ Title: "Exchange rate is X days old"
│     └─ Message: "The USD → EUR rate may be..."
│
└─ Refresh Button (optional)
   └─ "Refresh" / "Refreshing..."
```

---

## Color Coding Guide

### Rate Age Colors (in RateListScreen)

| Age | Color | Token | Example |
|-----|-------|-------|---------|
| < 1 day | Green | `theme.colors.success` (#4ade80) | Just refreshed |
| 1-7 days | Gray | `theme.colors.textSecondary` (#a0a0a0) | Still fresh |
| > 7 days | Amber | `theme.colors.warning` (#fbbf24) | Stale warning |

### Source Icons

| Source | Icon | Label | Priority |
|--------|------|-------|----------|
| `manual` | ✏️ | Manual | 100 (highest) |
| `frankfurter` | 🏦 | Frankfurter API | 50 |
| `exchangerate-api` | 🌐 | ExchangeRate API | 40 |

---

## Component Props Reference

### StalenessWarningBanner

```typescript
<StalenessWarningBanner
  currencyPair="USD → EUR"  // Optional, shows in message
  daysOld={14}              // Number of days since update
  onRefresh={handleRefresh} // Optional, shows refresh button
  refreshing={false}        // Optional, loading state
/>
```

**When to use:**
- In settlement screens when display currency rate is stale
- In expense screens with multi-currency
- In RateListScreen header

---

### NoRateAvailableModal

```typescript
<NoRateAvailableModal
  visible={showModal}           // Control visibility
  fromCurrency="JPY"            // Source currency code
  toCurrency="USD"              // Target currency code
  onFetchOnline={handleFetch}   // Optional, shows "Fetch Online"
  onEnterManually={handleManual}// Optional, shows "Enter Manually"
  onDismiss={handleDismiss}     // Optional, shows "Cancel"
  fetching={isFetching}         // Optional, shows loading state
/>
```

**When to use:**
- When `FxRateProvider.getRate()` throws `FX_RATE_NOT_FOUND` error
- In settlement calculations with missing display currency rate
- In expense creation with unsupported currencies

**Example integration:**
```typescript
try {
  const rate = cachedFxRateProvider.getRate(from, to);
} catch (error) {
  if (error.code === 'FX_RATE_NOT_FOUND') {
    setShowModal(true);
    setMissingPair({ from, to });
  }
}
```

---

## Screen Flow Diagrams

### User Journey: Add Manual Rate

```
┌──────────────┐
│   Settings   │
└──────┬───────┘
       │ Tap "Manage Exchange Rates"
       ▼
┌──────────────────┐
│ Rate List Screen │
└──────┬───────────┘
       │ Tap "Add Manual Rate"
       ▼
┌────────────────────────┐
│ Manual Rate Entry Form │
│                        │
│ From: [USD ▼]         │
│ To:   [EUR ▼]         │
│ Rate:  0.92           │
│                        │
│ Preview:              │
│ 1 USD = 0.9200 EUR    │
│                        │
│ [Cancel] [Save Rate]  │
└────────┬───────────────┘
         │ Tap "Save Rate"
         ▼
┌────────────────────┐
│  Success Alert     │
│  "Rate saved:      │
│   USD → EUR = 0.92"│
└────────┬───────────┘
         │ Tap "OK"
         ▼
┌──────────────────┐
│ Rate List Screen │ (updated with new rate)
└──────────────────┘
```

---

### Error Recovery: Missing Rate

```
┌─────────────────┐
│ Settlement View │
│ (Trip: USD)     │
│ (Display: JPY)  │
└────────┬────────┘
         │ Try to convert USD → JPY
         │ No rate found!
         ▼
┌────────────────────────┐
│ NoRateAvailableModal   │
│                        │
│   🔄                   │
│ Exchange Rate Needed   │
│                        │
│   JPY → USD            │
│                        │
│ No exchange rate is... │
│                        │
│ [Fetch Online]         │
│ [Enter Manually]       │
│ [Cancel]               │
└────┬───────────────┬───┘
     │               │
     │               │ User taps "Enter Manually"
     │               ▼
     │         ┌─────────────────────┐
     │         │ Manual Rate Entry   │
     │         │ From: JPY (prefilled)
     │         │ To:   USD (prefilled)
     │         │ Rate: [empty]       │
     │         └─────────┬───────────┘
     │                   │ User enters rate
     │                   ▼
     │         ┌─────────────────────┐
     │         │ Rate saved!         │
     │         └─────────┬───────────┘
     │                   │
     └──────┬────────────┘
            │ Modal dismisses
            ▼
     ┌─────────────────┐
     │ Settlement View │
     │ (with JPY rate  │
     │  now available) │
     └─────────────────┘
```

---

## Styling Patterns

### Card Variants

**Standard Card (RateListScreen item):**
```typescript
<Card style={styles.rateCard}>
  {/* backgroundColor: theme.colors.surface */}
</Card>
```

**Info Card (ManualRateEntryScreen):**
```typescript
<Card style={styles.infoCard}>
  {/* Lighter background, icon + text */}
</Card>
```

**Warning Card (StalenessWarningBanner):**
```typescript
<Card style={styles.warningCard}>
  {/* backgroundColor: theme.colors.warningBg */}
  {/* borderColor: theme.colors.warning */}
</Card>
```

---

### Typography Hierarchy

**Screen Titles** (in header):
```typescript
fontSize: theme.typography.xl     // 19px
fontWeight: theme.typography.bold // "700"
```

**Section Titles:**
```typescript
fontSize: theme.typography.lg       // 17px
fontWeight: theme.typography.semibold // "600"
```

**Body Text:**
```typescript
fontSize: theme.typography.base // 15px
color: theme.colors.text        // #ffffff
```

**Helper Text:**
```typescript
fontSize: theme.typography.sm       // 13px
color: theme.colors.textSecondary  // #a0a0a0
```

**Metadata / Labels:**
```typescript
fontSize: theme.typography.xs     // 11px
color: theme.colors.textMuted    // #666666
```

---

### Common Layout Patterns

**Form Section:**
```typescript
<View style={styles.formSection}>
  <Text style={styles.sectionTitle}>Currency Pair</Text>
  <Text style={styles.sectionHelper}>Select the currencies...</Text>
  {/* Form fields */}
</View>

const styles = StyleSheet.create({
  formSection: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  sectionHelper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.sm, // Reduce gap after title
  },
});
```

**Footer with Buttons:**
```typescript
<View style={styles.footer}>
  <Button title="Cancel" variant="outline" onPress={...} fullWidth />
  <View style={{ height: theme.spacing.md }} />
  <Button title="Save" onPress={...} fullWidth />
</View>

const styles = StyleSheet.create({
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
```

---

## Integration Examples

### Example 1: Show Staleness Warning in Settlement Screen

```typescript
// In SettlementSummaryScreen.tsx

import { StalenessWarningBanner } from "@ui/components";
import { cachedFxRateProvider } from "@modules/fx-rates/provider";

function SettlementSummaryScreen() {
  const { trip, displayCurrency } = useSettlement();
  const { refreshRates, refreshing } = useFxRates();

  // Check rate staleness
  const lastUpdated = displayCurrency
    ? cachedFxRateProvider.getLastUpdated(trip.currency, displayCurrency)
    : null;

  const daysOld = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isStale = daysOld > 7;

  return (
    <ScrollView>
      {isStale && displayCurrency && (
        <StalenessWarningBanner
          currencyPair={`${trip.currency} → ${displayCurrency}`}
          daysOld={daysOld}
          onRefresh={refreshRates}
          refreshing={refreshing}
        />
      )}

      {/* Settlement content */}
    </ScrollView>
  );
}
```

---

### Example 2: Handle Missing Rate Error

```typescript
// In DisplayCurrencyAdapter or settlement hook

import { NoRateAvailableModal } from "@ui/components";
import { useRouter } from "expo-router";

function useSettlementWithDisplay(tripId: string, displayCurrency: string | null) {
  const [showNoRateModal, setShowNoRateModal] = useState(false);
  const [missingPair, setMissingPair] = useState<{ from: string; to: string } | null>(null);
  const { refreshRates } = useFxRates();
  const router = useRouter();

  const convertSettlement = useCallback((settlement, displayCurr) => {
    try {
      return adapter.convertSettlement(settlement, displayCurr);
    } catch (error) {
      if (error.code === 'FX_RATE_NOT_FOUND') {
        setMissingPair({ from: settlement.currency, to: displayCurr });
        setShowNoRateModal(true);
        return null; // Fallback
      }
      throw error;
    }
  }, []);

  const handleFetchOnline = async () => {
    try {
      await refreshRates();
      setShowNoRateModal(false);
      // Retry conversion
    } catch (err) {
      Alert.alert("Fetch Failed", "Could not update rates. Try manual entry.");
    }
  };

  const handleEnterManually = () => {
    setShowNoRateModal(false);
    if (missingPair) {
      router.push(
        `/fx-rates/manual?fromCurrency=${missingPair.from}&toCurrency=${missingPair.to}`
      );
    }
  };

  return {
    settlement,
    displaySettlement,
    NoRateModal: (
      <NoRateAvailableModal
        visible={showNoRateModal}
        fromCurrency={missingPair?.from ?? ""}
        toCurrency={missingPair?.to ?? ""}
        onFetchOnline={handleFetchOnline}
        onEnterManually={handleEnterManually}
        onDismiss={() => setShowNoRateModal(false)}
      />
    ),
  };
}
```

---

## Accessibility Checklist

When integrating these components:

- [ ] All buttons have `accessibilityLabel`
- [ ] All buttons have `accessibilityHint` (if action isn't obvious)
- [ ] Interactive elements have `accessibilityRole`
- [ ] Loading states use `accessibilityState={{ busy: true }}`
- [ ] Modals have `onRequestClose` for Android back button
- [ ] Touch targets are ≥44x44pt
- [ ] Color isn't the only indicator (use icons/text too)
- [ ] Forms use `KeyboardAvoidingView`
- [ ] ScrollViews use `keyboardShouldPersistTaps="handled"`

---

## Quick Tips

### Do's
✅ Use `theme.spacing.*` for all spacing (never magic numbers)
✅ Use `theme.colors.*` for all colors
✅ Use `Alert.alert()` for important confirmations
✅ Show loading states during async operations
✅ Provide clear error messages
✅ Test with VoiceOver/TalkBack enabled

### Don'ts
❌ Don't hardcode colors or spacing values
❌ Don't use ScrollView for long lists (use FlatList)
❌ Don't forget error handling on async operations
❌ Don't show technical error messages to users
❌ Don't skip accessibility attributes
❌ Don't use complex gestures (keep it simple)

---

## Performance Tips

1. **Use FlatList for lists > 10 items**
   - RateListScreen uses FlatList ✓

2. **Memoize expensive computations**
   - `formatRelativeTime` is cheap, no memo needed

3. **Avoid unnecessary re-renders**
   - State is scoped to components
   - No global state pollution

4. **Use native components**
   - RefreshControl for pull-to-refresh ✓
   - ActivityIndicator for loading ✓

5. **Optimize images**
   - No images in FX UI (text/emoji only) ✓

---

This guide provides quick reference for integrating and customizing the FX rate UI components. For detailed implementation, see `FX_UI_IMPLEMENTATION.md`.
