# CrewSplit Onboarding - Quick Start Implementation Guide

**Quick reference for implementing the onboarding system**

See [onboarding-system-spec.md](onboarding-system-spec.md) for complete specification.

---

## Implementation Order

### 1. Database Schema (Start Here)

**Create schema files:**

```bash
# Create these files:
src/db/schema/user-settings.ts
src/db/schema/onboarding-state.ts
```

**Update trips schema:**

```typescript
// src/db/schema/trips.ts
// Add these columns:
isSampleData: integer("is_sample_data", { mode: "boolean" }).notNull().default(false),
sampleDataTemplateId: text("sample_data_template_id"),
isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
```

**Generate migration:**

```bash
npx drizzle-kit generate --config drizzle.config.ts
```

**Test migration:**

1. Create test trip with existing schema
2. Restart app
3. Verify: existing trips have `is_sample_data = 0`, `is_archived = 0`
4. Verify: `user_settings` row exists with id='default'

---

### 2. Repository Layer

**Create:**

```bash
src/modules/onboarding/repository/OnboardingRepository.ts
src/modules/onboarding/types.ts
```

**Key methods:**

```typescript
// User settings (singleton)
getUserSettings(): Promise<UserSettings>
updateUserSettings(update): Promise<UserSettings>

// Onboarding state
getOnboardingState(flowId): Promise<OnboardingState | null>
markStepCompleted(flowId, stepId): Promise<OnboardingState>
markFlowCompleted(flowId): Promise<OnboardingState>
isInitialOnboardingCompleted(): Promise<boolean>

// Sample data
getSampleTrips(): Promise<Trip[]>
archiveSampleTrips(): Promise<void>
restoreSampleTrips(): Promise<void>
hasSampleData(): Promise<boolean>
```

---

### 3. Sample Data Service

**Prepare sample trip JSON:**

```bash
# Edit: scripts/crewledger-summer-road-trip-2025-12-18.json
# ADD settlement transactions:
{
  "settlements": [
    {
      "id": "settlement-1",
      "tripId": "95d61d07-8581-49d1-a86b-8c7b8fcdc35f",
      "fromParticipantId": "4bcd6d96-f450-4fc6-a2b7-921183b40361",
      "toParticipantId": "f8081ac9-f51e-4148-bda6-435c6f349f31",
      "amountMinor": 5000,
      "currency": "USD",
      "status": "pending",
      "createdAt": "2025-12-15T09:15:00.000Z"
    }
  ]
}
```

**Create service:**

```bash
src/modules/onboarding/services/SampleDataService.ts
```

**Key method:**

```typescript
async loadSampleTrip(templateId: string): Promise<string> {
  // Read JSON file
  // Parse trip, participants, expenses, splits, settlements
  // Insert all in transaction
  // Mark as isSampleData = true
  // Return trip ID
}
```

---

### 4. Hooks

**Create:**

```bash
src/modules/onboarding/hooks/use-onboarding-state.ts
src/modules/onboarding/hooks/use-user-settings.ts
src/modules/onboarding/hooks/use-tour.ts
```

**use-onboarding-state.ts:**

```typescript
export function useOnboardingState() {
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const completed = await onboardingRepository.isInitialOnboardingCompleted();
    setIsComplete(completed);
    setLoading(false);
  };

  const markComplete = async () => {
    await onboardingRepository.markFlowCompleted("initial_onboarding");
    setIsComplete(true);
  };

  return { isComplete, loading, markComplete };
}
```

---

### 5. Onboarding Screens

**Create routes:**

```bash
app/onboarding/_layout.tsx
app/onboarding/welcome.tsx
app/onboarding/currency.tsx
app/onboarding/username.tsx
app/onboarding/walkthrough.tsx
```

**\_layout.tsx:**

```typescript
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
```

**Screen progression:**

```
/onboarding/welcome     → Tap "Get Started"
/onboarding/currency    → Select currency, tap "Next" or "Skip"
/onboarding/username    → Enter name, tap "Next" or "Skip"
/onboarding/walkthrough → Swipe through, tap "Skip" or "Finish"
→ Load sample trips
→ Mark onboarding complete
→ Redirect to home
```

---

### 6. Root Layout Integration

**Update app/\_layout.tsx:**

```typescript
export default function RootLayout() {
  const { success, error } = useDbMigrations();
  const [fxInitialized, setFxInitialized] = useState(false);
  const { isComplete, loading: onboardingLoading } = useOnboardingState();

  // ... existing FX initialization ...

  // Show loading screen while initializing
  if (!success || !fxInitialized || onboardingLoading) {
    return <LoadingScreen />;
  }

  // Redirect to onboarding if not complete
  if (!isComplete) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <Stack screenOptions={{...}} />;
}
```

---

### 7. Sample Trip Badge

**Create component:**

```bash
src/modules/onboarding/components/SampleTripBadge.tsx
```

**Add to TripCard:**

```typescript
// In TripCard component:
{trip.isSampleData && <SampleTripBadge />}
```

**Styling:**

```typescript
const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.bold,
    color: theme.colors.background,
    textTransform: "uppercase",
  },
});
```

---

### 8. Archive/Restore Logic

**Update delete trip logic:**

```typescript
async function handleDeleteTrip(tripId: string) {
  const trip = await tripRepository.getTripById(tripId);

  if (trip.isSampleData) {
    // Archive instead of delete
    await onboardingRepository.archiveSampleTrips();
    showToast("Sample trip archived. Restore from Settings anytime.");
  } else {
    // Confirm hard delete
    Alert.alert(
      "Delete Trip?",
      "This will permanently delete all expenses and participants.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await tripRepository.deleteTrip(tripId);
            showToast("Trip deleted.");
          },
        },
      ],
    );
  }
}
```

---

### 9. Settings Integration

**Update app/settings.tsx:**

```typescript
// Add after Exchange Rates section

<Card style={styles.section}>
  <Text style={styles.sectionTitle}>Help & Tour</Text>
  <Text style={styles.sectionDescription}>
    Take a guided tour of CrewSplit's features, or restore sample trips
    to explore the app.
  </Text>

  <Button
    title="Take Tour"
    variant="outline"
    onPress={() => {
      // TODO: Start tour overlay
      tourControls.startTour();
    }}
    fullWidth
  />

  <Button
    title="Restore Sample Trips"
    variant="outline"
    onPress={handleRestoreSampleTrips}
    fullWidth
  />
</Card>
```

**Restore handler:**

```typescript
const handleRestoreSampleTrips = async () => {
  try {
    setLoading(true);

    // Delete existing samples
    await onboardingRepository.deleteSampleTrips();

    // Load from JSON
    const sampleService = new SampleDataService();
    const tripId = await sampleService.loadSampleTrip("summer_road_trip");

    showToast("Sample trips restored!");
    router.push("/"); // Navigate to trips list
  } catch (error) {
    console.error("Failed to restore sample trips:", error);
    showToast("Failed to restore sample trips. Please try again.");
  } finally {
    setLoading(false);
  }
};
```

---

### 10. Tour Mode (Optional - Can defer)

**Create tour overlay:**

```bash
src/modules/onboarding/components/TourOverlay.tsx
src/modules/onboarding/hooks/use-tour.ts
```

**Tour step definition:**

```typescript
const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to CrewSplit",
    description: "This is your trips list. Tap a trip to see details.",
    tooltipPosition: "center",
  },
  {
    id: "create-trip",
    title: "Create Your First Trip",
    description: "Tap here to create a new trip with your crew.",
    tooltipPosition: "top",
    spotlight: {
      /* ... */
    },
  },
  // ... more steps
];
```

**Usage:**

```typescript
const { activeTour, currentStep, nextStep, exitTour } = useTour({
  steps: TOUR_STEPS,
  onComplete: () => {
    onboardingRepository.markFlowCompleted('tour_mode');
  },
});

return (
  <View>
    <YourScreenContent />
    {activeTour && (
      <TourOverlay
        step={currentStep}
        onNext={nextStep}
        onExit={exitTour}
      />
    )}
  </View>
);
```

---

## Testing Checklist

**Database:**

- [ ] Migration runs without errors
- [ ] Existing trips unaffected
- [ ] `user_settings` singleton created
- [ ] Indexes created correctly

**Repository:**

- [ ] `getUserSettings()` returns default row
- [ ] `updateUserSettings()` persists changes
- [ ] `markStepCompleted()` tracks progress
- [ ] `archiveSampleTrips()` soft-deletes
- [ ] `restoreSampleTrips()` reloads data

**Onboarding Flow:**

- [ ] First launch → redirects to `/onboarding/welcome`
- [ ] Can skip any step (defaults applied)
- [ ] Can exit mid-flow (progress saved)
- [ ] Complete flow → marks onboarding done
- [ ] Sample trips load automatically
- [ ] Redirects to home after completion

**Sample Data:**

- [ ] Sample trips show badge
- [ ] Delete → archives (not hard deletes)
- [ ] Restore from Settings → reloads
- [ ] Archive → trips hidden from list
- [ ] Restore → trips visible again

**Settings:**

- [ ] "Take Tour" button visible
- [ ] "Restore Sample Trips" button visible
- [ ] Restore works when no samples exist
- [ ] Restore works when archived samples exist

---

## Quick Commands

**Database:**

```bash
# Generate migration
npx drizzle-kit generate

# View schema
npx drizzle-kit studio
```

**Testing:**

```bash
# Run tests
npm test -- onboarding

# Type check
npm run type-check

# Lint
npm run lint
```

**Development:**

```bash
# Start dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

## Key Files Reference

**Schema:**

- `src/db/schema/user-settings.ts`
- `src/db/schema/onboarding-state.ts`
- `src/db/schema/trips.ts` (update)

**Repository:**

- `src/modules/onboarding/repository/OnboardingRepository.ts`
- `src/modules/onboarding/services/SampleDataService.ts`

**Hooks:**

- `src/modules/onboarding/hooks/use-onboarding-state.ts`
- `src/modules/onboarding/hooks/use-user-settings.ts`
- `src/modules/onboarding/hooks/use-tour.ts` (optional)

**Screens:**

- `app/onboarding/_layout.tsx`
- `app/onboarding/welcome.tsx`
- `app/onboarding/currency.tsx`
- `app/onboarding/username.tsx`
- `app/onboarding/walkthrough.tsx`

**Components:**

- `src/modules/onboarding/components/SampleTripBadge.tsx`
- `src/modules/onboarding/components/TourOverlay.tsx` (optional)

**Integrations:**

- `app/_layout.tsx` (add onboarding redirect)
- `app/settings.tsx` (add tour + restore buttons)
- Trip card component (add badge)

**Sample Data:**

- `scripts/crewledger-summer-road-trip-2025-12-18.json` (add settlements)

---

## Common Issues & Solutions

**Issue:** Migration fails on existing data

- **Solution:** Verify all new columns have defaults or are nullable

**Issue:** Onboarding never completes

- **Solution:** Check `onboardingRepository.markFlowCompleted()` is called

**Issue:** Sample trips not showing badge

- **Solution:** Verify `isSampleData` flag is set on import

**Issue:** Archived trips still visible

- **Solution:** Filter query: `WHERE is_archived = 0`

**Issue:** Restore doesn't work

- **Solution:** Check JSON file path and permissions

---

**For complete details, see:** [onboarding-system-spec.md](onboarding-system-spec.md)
