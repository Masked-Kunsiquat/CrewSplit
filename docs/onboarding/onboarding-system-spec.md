# CrewSplit Onboarding System - Specification

**Version:** 1.0
**Date:** 2025-12-19
**Status:** Design Complete - Ready for Implementation

---

## Executive Summary

This document specifies a comprehensive onboarding and tour system for CrewSplit that:

1. **Guides first-time users** through initial setup (currency, name, sample data)
2. **Provides in-app tours** for returning users to discover features
3. **Manages sample trip data** with archive/restore capabilities
4. **Maintains zero-friction UX** with skip-anywhere functionality

---

## 1. System Architecture

### 1.1 Database Schema

**New Tables:**

1. **`user_settings`** (singleton table)
   - `id` (text, PK, default: 'default')
   - `primary_user_name` (text, nullable)
   - `default_currency` (text, default: 'USD')
   - `created_at` (text, ISO 8601)
   - `updated_at` (text, ISO 8601)

2. **`onboarding_state`** (flow tracking)
   - `id` (text, PK) - Flow identifier ('initial_onboarding', 'tour_mode', etc.)
   - `is_completed` (boolean, default: false)
   - `completed_steps` (text, JSON array of step IDs)
   - `metadata` (text, JSON object for extensibility)
   - `created_at` (text, ISO 8601)
   - `updated_at` (text, ISO 8601)
   - `completed_at` (text, nullable ISO 8601)

**Existing Table Modifications:**

**`trips`** table additions:
- `is_sample_data` (boolean, default: false)
- `sample_data_template_id` (text, nullable)
- `is_archived` (boolean, default: false)

### 1.2 Data Storage Strategy

**Why Database over AsyncStorage:**
- Single source of truth (follows project principles)
- Enables deterministic queries
- Supports atomic transactions
- Future-proof for multi-device sync
- Consistent with "all data in SQLite" approach

### 1.3 Sample Data Flow

```
User triggers "Load Sample Trips"
    ↓
Load JSON from scripts/ directory
    ↓
Parse trip, participants, expenses, splits
    ↓
Insert with isSampleData = true
    ↓
Display in trips list with badge
```

**Archive Flow:**
```
User deletes sample trip
    ↓
Check: trip.isSampleData === true?
    ↓
YES: Set isArchived = true (soft delete)
NO: Confirm hard delete → CASCADE removal
```

**Restore Flow:**
```
User taps "Restore Sample Trips" in Settings
    ↓
Delete existing sample trips (hard delete)
    ↓
Reload from JSON templates
    ↓
Navigate to trips list
```

---

## 2. User Flows

### 2.1 First-Time User Onboarding

**Flow:**
1. App Launch → Check `onboarding_state` where `id = 'initial_onboarding'`
2. If not completed → Redirect to `/onboarding/welcome`
3. Welcome Screen → Tap "Get Started"
4. Currency Selection → Select or skip (defaults to USD)
5. Username Entry → Enter name or skip (can set later)
6. Walkthrough Carousel → Swipe through or skip
7. Load Sample Trips → Automatically loaded
8. Mark onboarding complete → Redirect to home

**Exit Points:**
- Any screen: User can tap "Skip" or back button
- Skipped preferences: Use defaults (USD, no name)
- Progress saved: Can resume later if interrupted

### 2.2 Tour Mode (Returning Users)

**Flow:**
1. Settings → Tap "Take Tour"
2. Tour overlay renders over current screen
3. User progresses through steps with "Next"
4. Can exit anytime with "Exit Tour" button
5. Completion tracked in `onboarding_state` where `id = 'tour_mode'`

**Key Difference from Onboarding:**
- Works with user's existing data (no sample trips required)
- Overlay-based (doesn't change navigation)
- Re-runnable anytime
- Doesn't modify user preferences

---

## 3. UI/UX Design

### 3.1 Onboarding Screens

**WelcomeScreen:**
- Large app logo/emoji (👥💰)
- App name: "CrewSplit"
- Tagline: "Split expenses with zero friction"
- Feature cards with icons:
  - 🧮 Deterministic Math
  - 📴 Works Offline
  - 💱 Multi-Currency
- "Get Started" button (primary, full-width)

**SetDefaultCurrencyScreen:**
- Title: "Set Your Default Currency"
- Popular currencies grid (USD, EUR, GBP, CAD, AUD, JPY)
- Full CurrencyPicker component
- "Next" button (enabled when selected)
- "Skip" button (sets USD)

**SetUserNameScreen:**
- Title: "What's Your Name?"
- Description: Auto-add to new trips
- Large text input (autofocus)
- "Next" button (enabled when entered)
- "Skip" button with confirmation

**WalkthroughScreen:**
- Full-screen carousel
- 5 slides with illustrations:
  1. Create Trips
  2. Add Expenses
  3. Split Options
  4. Settlement View
  5. Multi-Currency
- Progress dots at bottom
- "Skip" (top-right) and "Next" buttons
- Last slide: "Get Started" instead of "Next"

### 3.2 Visual Indicators

**SampleTripBadge:**
- Position: Top-right of trip card
- Background: `theme.colors.warning` (amber)
- Text: "SAMPLE" (uppercase, bold, xs)
- Padding: 4px 8px
- Border radius: small

**TourOverlay:**
- Backdrop: `rgba(0, 0, 0, 0.7)`
- Spotlight: 2px primary border with pulse animation
- Tooltip: Elevated surface with shadow
  - Title: xl, bold
  - Description: base, secondary color
  - Progress: "3 of 7" centered
  - Buttons: "Exit Tour" (ghost) + "Next" (primary)

### 3.3 Accessibility

- All buttons: 44x44pt minimum touch target
- Screen reader labels on all interactive elements
- Color contrast: WCAG AAA (7:1+)
- Keyboard navigation support
- Skip anywhere: Never trap users

---

## 4. Technical Implementation

### 4.1 Module Structure

```
src/modules/onboarding/
├── repository/
│   └── OnboardingRepository.ts
├── services/
│   └── SampleDataService.ts
├── hooks/
│   ├── use-onboarding-state.ts
│   ├── use-user-settings.ts
│   └── use-tour.ts
├── screens/
│   ├── WelcomeScreen.tsx
│   ├── SetDefaultCurrencyScreen.tsx
│   ├── SetUserNameScreen.tsx
│   └── WalkthroughScreen.tsx
├── components/
│   ├── SampleTripBadge.tsx
│   ├── TourOverlay.tsx
│   └── ProgressDots.tsx
├── types.ts
└── __tests__/
```

### 4.2 Repository Interface

**OnboardingRepository:**

```typescript
// User Settings
getUserSettings(): Promise<UserSettings>
updateUserSettings(update: UserPreferencesUpdate): Promise<UserSettings>

// Onboarding State
getOnboardingState(flowId: OnboardingFlowId): Promise<OnboardingState | null>
markStepCompleted(flowId: OnboardingFlowId, stepId: OnboardingStepId): Promise<OnboardingState>
markFlowCompleted(flowId: OnboardingFlowId): Promise<OnboardingState>
isInitialOnboardingCompleted(): Promise<boolean>

// Sample Data
getSampleTrips(includeArchived?: boolean): Promise<Trip[]>
archiveSampleTrips(): Promise<void>
restoreSampleTrips(): Promise<void>
deleteSampleTrips(): Promise<void>
hasSampleData(): Promise<boolean>
hasActiveSampleData(): Promise<boolean>
```

### 4.3 Routes

```
app/
├── onboarding/
│   ├── _layout.tsx          # Stack layout
│   ├── welcome.tsx
│   ├── currency.tsx
│   ├── username.tsx
│   └── walkthrough.tsx
├── _layout.tsx              # Add onboarding redirect
└── settings.tsx             # Add tour trigger
```

### 4.4 Root Layout Integration

**app/_layout.tsx:**

```typescript
const { isComplete, loading } = useOnboardingStatus();

if (!success || !fxInitialized || loading) {
  return <LoadingScreen />;
}

if (!isComplete) {
  return <Redirect href="/onboarding/welcome" />;
}

return <Stack {...} />;
```

### 4.5 Settings Integration

**Add to app/settings.tsx:**

```typescript
<Card style={styles.section}>
  <Text style={styles.sectionTitle}>Help & Tour</Text>
  <Text style={styles.sectionDescription}>
    Take a guided tour of CrewSplit's features, or restore sample trips.
  </Text>

  <Button
    title="Take Tour"
    variant="outline"
    onPress={() => tourControls.startTour()}
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

---

## 5. Sample Data Specification

### 5.1 Required Sample Trips

Using existing JSON export from `scripts/`:
- **Summer Road Trip** (from crewledger-summer-road-trip-2025-12-18.json)

**Enhancements Needed:**
- Add settlement/transaction records (missing from export)
- Ensure varied split types (equal, percentage, exact amounts)
- Multi-currency examples if possible

### 5.2 Sample Data Template Format

**Import from JSON:**
```typescript
{
  "trip": {...},
  "participants": [...],
  "expenses": [...],
  "expenseSplits": [...],
  "settlements": [...]  // ADD THIS
}
```

**Settlement transactions to add:**
```typescript
{
  "settlements": [
    {
      "id": "...",
      "tripId": "...",
      "fromParticipantId": "...",
      "toParticipantId": "...",
      "amountMinor": 5000,
      "currency": "USD",
      "status": "pending",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## 6. Migration Plan

### 6.1 Migration File: `0006_add_onboarding_system.sql`

**Safe for existing users:**
- All new columns have defaults
- No data loss
- Backward compatible

**Contents:**
1. Create `user_settings` table + initialize singleton
2. Create `onboarding_state` table
3. Add 3 columns to `trips` (all with defaults)
4. Create indexes on `is_sample_data`, `is_archived`
5. Add update triggers for timestamps

**Verification Steps:**
- [ ] Existing trips have `is_sample_data = 0`
- [ ] `user_settings` singleton exists
- [ ] No data loss
- [ ] Indexes created

### 6.2 Migration Testing

**Test Cases:**
1. Fresh install → Onboarding flows → Sample trips loaded
2. Existing user (100 trips) → Migration runs → No data loss
3. Archive sample → Restore sample → Verify data integrity
4. Delete sample → Verify CASCADE (participants, expenses deleted)

---

## 7. Performance Considerations

**Lazy Loading:**
- Don't load sample JSON on every app launch
- Load only when:
  - Onboarding completes
  - User taps "Restore Sample Trips"

**Animation Performance:**
- All animations use `useNativeDriver: true`
- Tour overlay: fade in/out (300ms)
- Spotlight: pulse effect (1s loop)

**Memory Management:**
- Unload tour overlay when not active
- Don't keep sample JSON in memory after loading
- Clear tour state on exit

---

## 8. Testing Strategy

### 8.1 Critical User Flows

**Test Cases:**
1. First launch → Complete onboarding → Verify sample trips loaded
2. Skip all onboarding steps → Verify defaults (USD, no name)
3. Delete sample trip → Verify archived (not hard deleted)
4. Restore samples from Settings → Verify loaded
5. Start tour → Complete → Verify `tour_mode` completed
6. Exit tour mid-way → Verify clean state
7. Interrupt onboarding (kill app) → Resume → Verify state preserved

### 8.2 Edge Cases

- No internet during onboarding (should work offline)
- Onboarding interrupted mid-flow
- Tour started with empty trip list
- Sample trips already exist + restore (should replace)
- 100+ trips + sample trips (performance check)

### 8.3 Accessibility Testing

- VoiceOver/TalkBack navigation
- External keyboard navigation
- Color contrast verification
- Touch target size verification

---

## 9. Success Metrics

**Onboarding Completion:**
- % of users completing full onboarding
- % of users skipping steps
- Average time to complete

**Sample Data Usage:**
- % of users keeping sample trips
- % of users deleting samples immediately
- % of users restoring samples

**Tour Engagement:**
- % of users taking tour from Settings
- Average tour completion rate
- Most-skipped tour steps

---

## 10. Implementation Phases

### Phase 1: Database Schema (PRIORITY)
- [ ] Create schema files (user_settings, onboarding_state)
- [ ] Update trips schema (3 new columns)
- [ ] Generate migration file
- [ ] Test migration with existing data
- [ ] Create repository implementation
- [ ] Write repository tests

### Phase 2: Sample Data Service
- [ ] Add settlement transactions to sample trip JSON
- [ ] Create SampleDataService
- [ ] Implement JSON import logic
- [ ] Add archive/restore/delete methods
- [ ] Write service tests

### Phase 3: Onboarding Screens
- [ ] Create onboarding routes
- [ ] Build WelcomeScreen
- [ ] Build SetDefaultCurrencyScreen
- [ ] Build SetUserNameScreen
- [ ] Build WalkthroughScreen
- [ ] Add navigation flow
- [ ] Test complete flow

### Phase 4: Tour Mode
- [ ] Create TourOverlay component
- [ ] Implement spotlight mechanism
- [ ] Create tour step definitions
- [ ] Add tour hooks
- [ ] Integrate with Settings
- [ ] Test tour interactions

### Phase 5: Integration
- [ ] Update root layout with onboarding check
- [ ] Add SampleTripBadge to trip cards
- [ ] Add Settings UI (tour trigger, restore samples)
- [ ] Test archive/restore flow
- [ ] End-to-end testing

### Phase 6: Polish & Testing
- [ ] Accessibility audit
- [ ] Performance testing (low-end devices)
- [ ] Animation tuning
- [ ] Error handling
- [ ] Documentation

---

## 11. Key Design Decisions

### Why Database Instead of AsyncStorage?
- **Single source of truth**: Aligns with project principles
- **Deterministic queries**: Can join with trips/expenses
- **Future-proof**: Enables sync, backup, analytics
- **Consistency**: All data in SQLite

### Why Archive Instead of Hard Delete?
- **Reversible**: Users can restore samples anytime
- **Safe**: Accidental deletion doesn't lose templates
- **Transparent**: Clear "undo" path via Settings

### Why Overlay Tour Instead of Guided Navigation?
- **Non-disruptive**: Works with user's actual data
- **Realistic**: Shows features in real context
- **Flexible**: Can be run anytime, anywhere
- **Exit-friendly**: Doesn't trap user in flow

### Why Singleton user_settings Table?
- **Simplicity**: Single row is easier to query
- **Performance**: No joins needed
- **Clarity**: One place for global preferences
- **Type-safe**: Always returns a row (never null)

---

## 12. Dependencies

**Existing:**
- Expo Router (navigation)
- Drizzle ORM (database)
- AsyncStorage (temporary onboarding flag)
- React Native Reanimated (animations)

**New (if needed):**
- None - using existing dependencies

---

## 13. Rollout Plan

### For Existing Users
- Migration auto-applies on app start
- No disruption to existing trips
- Settings menu gains two new options:
  - "Take Tour"
  - "Restore Sample Trips"
- No forced onboarding (already using app)

### For New Users
- Onboarding flows on first launch
- Sample trips auto-load
- Can skip/exit anytime
- Preferences saved for future use

---

## 14. Future Enhancements

**Potential additions (NOT in scope):**
- Multiple sample trip templates (beach trip, ski trip, etc.)
- Contextual tooltips (show hint on first feature use)
- Onboarding progress sync (multi-device)
- Analytics integration (track completion rates)
- Customizable tour paths (user selects interests)

---

## Appendix A: Type Definitions

```typescript
// User Settings
export interface UserSettings {
  id: string; // Always 'default'
  primaryUserName: string | null;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

// Onboarding Flows
export type OnboardingFlowId =
  | 'initial_onboarding'
  | 'tour_mode';

export type OnboardingStepId =
  | 'welcome'
  | 'preferences'
  | 'sample_trip_loaded'
  | 'tour_started'
  | 'tour_complete';

export interface OnboardingState {
  id: OnboardingFlowId;
  isCompleted: boolean;
  completedSteps: OnboardingStepId[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Sample Trips
export interface SampleTripMetadata {
  isSampleData: boolean;
  sampleDataTemplateId: string | null;
  isArchived: boolean;
}
```

---

## Appendix B: File Checklist

**Schema Files:**
- [ ] `src/db/schema/user-settings.ts`
- [ ] `src/db/schema/onboarding-state.ts`
- [ ] Update `src/db/schema/trips.ts`
- [ ] `src/db/migrations/0006_add_onboarding_system.sql`
- [ ] Update `src/db/migrations/migrations.js`

**Repository:**
- [ ] `src/modules/onboarding/repository/OnboardingRepository.ts`
- [ ] `src/modules/onboarding/services/SampleDataService.ts`
- [ ] `src/modules/onboarding/types.ts`

**Hooks:**
- [ ] `src/modules/onboarding/hooks/use-onboarding-state.ts`
- [ ] `src/modules/onboarding/hooks/use-user-settings.ts`
- [ ] `src/modules/onboarding/hooks/use-tour.ts`

**Screens:**
- [ ] `src/modules/onboarding/screens/WelcomeScreen.tsx`
- [ ] `src/modules/onboarding/screens/SetDefaultCurrencyScreen.tsx`
- [ ] `src/modules/onboarding/screens/SetUserNameScreen.tsx`
- [ ] `src/modules/onboarding/screens/WalkthroughScreen.tsx`

**Components:**
- [ ] `src/modules/onboarding/components/SampleTripBadge.tsx`
- [ ] `src/modules/onboarding/components/TourOverlay.tsx`
- [ ] `src/modules/onboarding/components/ProgressDots.tsx`

**Routes:**
- [ ] `app/onboarding/_layout.tsx`
- [ ] `app/onboarding/welcome.tsx`
- [ ] `app/onboarding/currency.tsx`
- [ ] `app/onboarding/username.tsx`
- [ ] `app/onboarding/walkthrough.tsx`
- [ ] Update `app/_layout.tsx`
- [ ] Update `app/settings.tsx`

**Data:**
- [ ] Update `scripts/crewledger-summer-road-trip-2025-12-18.json` (add settlements)

**Tests:**
- [ ] `src/modules/onboarding/__tests__/repository.test.ts`
- [ ] `src/modules/onboarding/__tests__/sample-data-service.test.ts`
- [ ] Integration tests for complete flows

---

**END OF SPECIFICATION**
