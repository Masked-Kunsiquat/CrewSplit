# Settlements Implementation Guide

**Quick Start Guide for Implementing the Settlements Feature**

## Overview

This guide provides step-by-step instructions for implementing the settlements/transactions feature in CrewSplit. Follow these steps in order for a smooth implementation.

---

## Prerequisites

- [x] Schema created: `src/db/schema/settlements.ts`
- [x] Migration generated: `src/db/migrations/0005_wealthy_cammi.sql`
- [x] Types defined: `src/modules/settlements/types.ts`

---

## Phase 1: Database & Repository (Week 1)

### Step 1.1: Update Migration File

The migration has been auto-generated. Update `src/db/migrations/migrations.js`:

```javascript
// src/db/migrations/migrations.js
import journal from './meta/_journal.json';
import m0000 from './0000_initial.sql';
import m0001 from './0001_add_fx_rates.sql';
// ... other migrations ...
import m0005 from './0005_wealthy_cammi.sql'; // ADD THIS

export const migrations = [
  { id: '0000', sql: m0000 },
  { id: '0001', sql: m0001 },
  // ... other migrations ...
  { id: '0005', sql: m0005 }, // ADD THIS
];
```

### Step 1.2: Test Migration

```bash
# Run app to apply migration automatically
npm start

# Verify table created
# Use DB Browser for SQLite or Expo DevTools to inspect settlements table
```

### Step 1.3: Create SettlementsRepository

Create `src/modules/settlements/repository/SettlementsRepository.ts`:

```typescript
/**
 * LOCAL DATA ENGINEER: Settlements Repository
 * Database access layer for settlement transactions
 */

import { db } from "@db/client";
import { settlements, Settlement, NewSettlement } from "@db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { generateId } from "@utils/id";
import { cachedFxRateProvider } from "@modules/fx-rates";
import { getTrip } from "@modules/trips/repository";

/**
 * Get all settlements for a trip
 */
export async function getSettlementsForTrip(
  tripId: string
): Promise<Settlement[]> {
  return db
    .select()
    .from(settlements)
    .where(eq(settlements.tripId, tripId))
    .orderBy(desc(settlements.date));
}

/**
 * Get settlements for a specific participant (paid or received)
 */
export async function getSettlementsForParticipant(
  participantId: string
): Promise<Settlement[]> {
  return db
    .select()
    .from(settlements)
    .where(
      or(
        eq(settlements.fromParticipantId, participantId),
        eq(settlements.toParticipantId, participantId)
      )
    )
    .orderBy(desc(settlements.date));
}

/**
 * Get settlements linked to a specific expense split
 */
export async function getSettlementsForExpenseSplit(
  expenseSplitId: string
): Promise<Settlement[]> {
  return db
    .select()
    .from(settlements)
    .where(eq(settlements.expenseSplitId, expenseSplitId))
    .orderBy(desc(settlements.date));
}

/**
 * Get a single settlement by ID
 */
export async function getSettlement(id: string): Promise<Settlement | null> {
  const result = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a new settlement
 * Automatically converts currency if needed
 */
export async function createSettlement(data: {
  tripId: string;
  fromParticipantId: string;
  toParticipantId: string;
  expenseSplitId?: string;
  originalCurrency: string;
  originalAmountMinor: number;
  date: string;
  description?: string;
  paymentMethod?: string;
}): Promise<Settlement> {
  // Validation
  if (data.fromParticipantId === data.toParticipantId) {
    throw new Error("Cannot create settlement from participant to themselves");
  }

  if (data.originalAmountMinor <= 0) {
    throw new Error("Settlement amount must be greater than zero");
  }

  // Get trip to determine trip currency
  const trip = await getTrip(data.tripId);
  if (!trip) {
    throw new Error(`Trip not found: ${data.tripId}`);
  }

  // Convert to trip currency if needed
  let fxRateToTrip: number | null = null;
  let convertedAmountMinor: number;

  if (data.originalCurrency === trip.currency) {
    // Same currency - no conversion needed
    convertedAmountMinor = data.originalAmountMinor;
    fxRateToTrip = null;
  } else {
    // Different currency - fetch rate and convert
    fxRateToTrip = await cachedFxRateProvider.getRate(
      data.originalCurrency,
      trip.currency,
      data.date
    );
    convertedAmountMinor = Math.round(data.originalAmountMinor * fxRateToTrip);
  }

  // Build settlement record
  const newSettlement: NewSettlement = {
    id: generateId(),
    tripId: data.tripId,
    fromParticipantId: data.fromParticipantId,
    toParticipantId: data.toParticipantId,
    expenseSplitId: data.expenseSplitId || null,
    originalCurrency: data.originalCurrency,
    originalAmountMinor: data.originalAmountMinor,
    fxRateToTrip,
    convertedAmountMinor,
    date: data.date,
    description: data.description || null,
    paymentMethod: data.paymentMethod || null,
  };

  // Insert and return
  const result = await db
    .insert(settlements)
    .values(newSettlement)
    .returning();

  return result[0];
}

/**
 * Update a settlement
 * If currency/amount changed, recalculates conversion
 */
export async function updateSettlement(
  id: string,
  data: {
    originalCurrency?: string;
    originalAmountMinor?: number;
    date?: string;
    description?: string;
    paymentMethod?: string;
  }
): Promise<Settlement> {
  // Get existing settlement
  const existing = await getSettlement(id);
  if (!existing) {
    throw new Error(`Settlement not found: ${id}`);
  }

  // Get trip
  const trip = await getTrip(existing.tripId);
  if (!trip) {
    throw new Error(`Trip not found: ${existing.tripId}`);
  }

  // Determine if currency conversion needs recalculation
  const newCurrency = data.originalCurrency || existing.originalCurrency;
  const newAmountMinor = data.originalAmountMinor || existing.originalAmountMinor;
  const newDate = data.date || existing.date;

  let fxRateToTrip: number | null = null;
  let convertedAmountMinor: number;

  if (newCurrency === trip.currency) {
    convertedAmountMinor = newAmountMinor;
    fxRateToTrip = null;
  } else {
    fxRateToTrip = await cachedFxRateProvider.getRate(
      newCurrency,
      trip.currency,
      newDate
    );
    convertedAmountMinor = Math.round(newAmountMinor * fxRateToTrip);
  }

  // Update record
  const result = await db
    .update(settlements)
    .set({
      originalCurrency: newCurrency,
      originalAmountMinor: newAmountMinor,
      fxRateToTrip,
      convertedAmountMinor,
      date: newDate,
      description: data.description !== undefined ? data.description : existing.description,
      paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : existing.paymentMethod,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(settlements.id, id))
    .returning();

  return result[0];
}

/**
 * Delete a settlement
 */
export async function deleteSettlement(id: string): Promise<void> {
  await db.delete(settlements).where(eq(settlements.id, id));
}

/**
 * Calculate total settlements paid by a participant
 */
export async function getTotalSettlementsPaid(
  participantId: string
): Promise<number> {
  const participantSettlements = await getSettlementsForParticipant(participantId);
  return participantSettlements
    .filter((s) => s.fromParticipantId === participantId)
    .reduce((sum, s) => sum + s.convertedAmountMinor, 0);
}

/**
 * Calculate total settlements received by a participant
 */
export async function getTotalSettlementsReceived(
  participantId: string
): Promise<number> {
  const participantSettlements = await getSettlementsForParticipant(participantId);
  return participantSettlements
    .filter((s) => s.toParticipantId === participantId)
    .reduce((sum, s) => sum + s.convertedAmountMinor, 0);
}
```

### Step 1.4: Write Repository Tests

Create `src/modules/settlements/repository/__tests__/SettlementsRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  createSettlement,
  getSettlementsForTrip,
  updateSettlement,
  deleteSettlement,
} from "../SettlementsRepository";
import { createTrip } from "@modules/trips/repository";
import { createParticipant } from "@modules/participants/repository";

describe("SettlementsRepository", () => {
  let tripId: string;
  let aliceId: string;
  let bobId: string;

  beforeEach(async () => {
    // Create test trip and participants
    const trip = await createTrip({
      name: "Test Trip",
      startDate: "2025-01-01",
      currency: "USD",
    });
    tripId = trip.id;

    const alice = await createParticipant({ tripId, name: "Alice" });
    aliceId = alice.id;

    const bob = await createParticipant({ tripId, name: "Bob" });
    bobId = bob.id;
  });

  it("should create settlement with same currency", async () => {
    const settlement = await createSettlement({
      tripId,
      fromParticipantId: bobId,
      toParticipantId: aliceId,
      originalCurrency: "USD",
      originalAmountMinor: 5000,
      date: "2025-01-15",
      description: "Dinner payment",
      paymentMethod: "venmo",
    });

    expect(settlement.convertedAmountMinor).toBe(5000);
    expect(settlement.fxRateToTrip).toBeNull();
  });

  it("should prevent self-payment", async () => {
    await expect(
      createSettlement({
        tripId,
        fromParticipantId: aliceId,
        toParticipantId: aliceId,
        originalCurrency: "USD",
        originalAmountMinor: 5000,
        date: "2025-01-15",
      })
    ).rejects.toThrow("Cannot create settlement from participant to themselves");
  });

  // Add more tests...
});
```

---

## Phase 2: Settlement Engine Integration (Week 2)

### Step 2.1: Modify `calculateBalances()`

Update `src/modules/settlement/calculate-balances.ts`:

```typescript
/**
 * MODELER: Calculate net positions INCLUDING settlement transactions
 *
 * @param expenses - All expenses for the trip
 * @param splits - All expense splits
 * @param participants - All participants
 * @param settlements - Optional settlement transactions
 * @returns Array of participant balances with settlement-adjusted net positions
 */
export const calculateBalances = (
  expenses: Expense[],
  splits: ExpenseSplit[],
  participants: Participant[],
  settlements?: Settlement[], // NEW: optional settlements parameter
): ParticipantBalance[] => {
  // Initialize balance map for all participants
  const balanceMap = new Map<
    string,
    { totalPaid: number; totalOwed: number }
  >();
  const validParticipantIds = new Set<string>();

  participants.forEach((p) => {
    balanceMap.set(p.id, { totalPaid: 0, totalOwed: 0 });
    validParticipantIds.add(p.id);
  });

  // ... existing validation logic ...

  // ... existing expense processing logic ...

  // NEW: Apply settlement adjustments
  if (settlements && settlements.length > 0) {
    settlements.forEach((settlement) => {
      // Payer's balance increases (debt reduced)
      // Model as: payer "paid" an additional expense
      const payer = balanceMap.get(settlement.fromParticipantId);
      if (payer) {
        payer.totalPaid += settlement.convertedAmountMinor;
      }

      // Receiver's balance decreases (credit reduced)
      // Model as: receiver "owes" an additional amount
      const receiver = balanceMap.get(settlement.toParticipantId);
      if (receiver) {
        receiver.totalOwed += settlement.convertedAmountMinor;
      }
    });
  }

  // ... existing balance calculation and return logic ...
};
```

### Step 2.2: Update SettlementService

Modify `src/modules/settlement/service/SettlementService.ts`:

```typescript
import { getSettlementsForTrip } from "@modules/settlements/repository";

export async function computeSettlement(
  tripId: string,
): Promise<SettlementSummary> {
  // Load all data in parallel (including settlements)
  const [expenses, participants, settlements] = await Promise.all([
    getExpensesForTrip(tripId),
    getParticipantsForTrip(tripId),
    getSettlementsForTrip(tripId), // NEW
  ]);

  // ... existing logic ...

  // Calculate balances WITH settlements
  const balances = calculateBalances(
    splitExpenses,
    splitsForCalculation,
    participants,
    settlements, // NEW: pass settlements
  );

  // ... rest of existing logic ...
}
```

### Step 2.3: Write Integration Tests

Create `src/modules/settlement/__tests__/integration-with-settlements.test.ts`:

```typescript
describe("Settlement calculations with transactions", () => {
  it("should reduce debt when settlement is recorded", async () => {
    // Create trip, participants, expense
    // Record settlement
    // Verify balances are adjusted correctly
  });

  it("should handle partial payments", async () => {
    // Bob owes Alice $50
    // Bob pays $30
    // Verify Bob owes $20
  });

  it("should handle multi-currency settlements", async () => {
    // Trip in USD
    // Settlement in EUR
    // Verify conversion and balance adjustment
  });
});
```

---

## Phase 3: React Hooks (Week 3)

### Step 3.1: Create `useSettlements` Hook

Create `src/modules/settlements/hooks/use-settlements.ts`:

```typescript
/**
 * Hook to fetch all settlements for a trip
 */
export function useSettlements(tripId: string) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSettlementsForTrip(tripId);
      setSettlements(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  return { settlements, loading, error, refetch };
}
```

### Step 3.2: Create CRUD Hooks

Create `src/modules/settlements/hooks/use-create-settlement.ts`:

```typescript
export function useCreateSettlement(tripId: string) {
  const { refetch: refetchSettlements } = useSettlements(tripId);
  const { refetch: refetchBalances } = useSettlement(tripId);

  const createSettlement = useCallback(
    async (data: NewSettlementData) => {
      const settlement = await createSettlement(data);

      // Trigger recalculation
      refetchSettlements();
      refetchBalances();

      return settlement;
    },
    [tripId, refetchSettlements, refetchBalances]
  );

  return { createSettlement };
}
```

Similar hooks for `useUpdateSettlement` and `useDeleteSettlement`.

---

## Phase 4: UI Screens (Week 4-5)

### Step 4.1: Settlement List Screen

Create `src/modules/settlements/screens/SettlementsListScreen.tsx`:

```tsx
export function SettlementsListScreen({ tripId }: { tripId: string }) {
  const { settlements, loading } = useSettlements(tripId);

  if (loading) return <LoadingSpinner />;

  return (
    <View>
      <Text>Settlements</Text>
      <FlatList
        data={settlements}
        renderItem={({ item }) => <SettlementCard settlement={item} />}
        keyExtractor={(item) => item.id}
      />
      <Button title="Record Payment" onPress={() => navigateToEntryForm()} />
    </View>
  );
}
```

### Step 4.2: Settlement Entry Form

Create `src/modules/settlements/screens/SettlementEntryScreen.tsx`:

```tsx
export function SettlementEntryScreen({ tripId }: { tripId: string }) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");

  const { createSettlement } = useCreateSettlement(tripId);

  const handleSubmit = async () => {
    await createSettlement({
      tripId,
      fromParticipantId: from,
      toParticipantId: to,
      originalCurrency: currency,
      originalAmountMinor: parseFloat(amount) * 100,
      date: new Date().toISOString(),
    });
    navigation.goBack();
  };

  return (
    <View>
      <ParticipantPicker label="From" value={from} onChange={setFrom} />
      <ParticipantPicker label="To" value={to} onChange={setTo} />
      <CurrencyInput value={amount} onChange={setAmount} />
      <Button title="Save Payment" onPress={handleSubmit} />
    </View>
  );
}
```

### Step 4.3: Expense Detail Integration

Update `src/modules/expenses/screens/ExpenseDetailScreen.tsx`:

```tsx
// Add "Mark as Paid" button for each split
<View>
  <Text>{participant.name}: ${split.amount / 100}</Text>
  {split.participantId !== expense.paidBy && (
    <Button
      title="Mark as Paid"
      onPress={() =>
        navigateToSettlementForm({
          prefilledData: {
            from: split.participantId,
            to: expense.paidBy,
            amount: split.amount,
            expenseSplitId: split.id,
          },
        })
      }
    />
  )}
</View>
```

---

## Phase 5: Testing & Polish (Week 6)

### Checklist

- [ ] All repository tests passing
- [ ] All integration tests passing
- [ ] UI tests for settlement screens
- [ ] Multi-currency conversion working
- [ ] Settlement edit/delete functionality
- [ ] Validation (prevent self-payment, negative amounts)
- [ ] Overpayment warnings
- [ ] Settlement history on participant screen
- [ ] Display currency support
- [ ] Settlement export (CSV/PDF)

---

## Verification Steps

After implementation, verify:

1. **Create settlement**: User can record payment between participants
2. **Balance updates**: Settlement reduces net debt correctly
3. **Multi-currency**: Settlement in EUR converts to USD trip correctly
4. **Expense link**: Settlement linked to split shows on expense detail
5. **Edit/delete**: User can modify or remove settlement
6. **Persistence**: Settlements survive app restart
7. **Recalculation**: Settlement suggestions update after payment

---

## Common Issues & Solutions

### Issue 1: Balances don't update after settlement

**Solution**: Ensure `useCreateSettlement` calls both `refetchSettlements()` and `refetchBalances()`.

### Issue 2: Foreign key constraint error

**Solution**: Verify participant IDs exist before creating settlement. Add validation in repository.

### Issue 3: Currency conversion fails

**Solution**: Ensure FX rate cache is initialized (`cachedFxRateProvider.initialize()`) before creating settlements.

### Issue 4: Settlement shows wrong amount

**Solution**: Verify you're using `convertedAmountMinor` (not `originalAmountMinor`) in balance calculations.

---

## Next Steps After Completion

1. **Analytics**: Track settlement patterns (most common payment methods, average settlement time)
2. **Notifications**: Remind users to settle debts
3. **Settlement suggestions**: Auto-suggest settlements based on calculated optimizations
4. **Payment integration**: Connect to Venmo/PayPal APIs for actual money transfer
5. **Export**: Generate settlement reports for tax purposes

---

## Resources

- **Schema**: `src/db/schema/settlements.ts`
- **Types**: `src/modules/settlements/types.ts`
- **Architecture**: `docs/SETTLEMENTS_ARCHITECTURE.md`
- **Data Flow**: `docs/SETTLEMENTS_DATA_FLOW.md`
- **Migration**: `src/db/migrations/0005_wealthy_cammi.sql`

For questions, refer to the architecture documents or consult the SYSTEM ARCHITECT role.
