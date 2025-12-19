# Settlements/Transactions Architecture

**SYSTEM ARCHITECT: Comprehensive design for settlement transactions feature**

## Overview

This document defines the schema, data model, and integration architecture for allowing users to record payments between participants to settle debts.

## Requirements Summary

1. **Flexible payment tracking**: Users can enter ANY amount towards any user (not restricted to exact settlement amounts)
2. **Individual expense payoff**: Users can pay off any individual expense split directly
3. **Transaction metadata**: Date, currency support with FX conversion
4. **CRUD operations**: Full edit/delete functionality

---

## 1. Schema Design

### `settlements` Table

**Purpose**: Records payments made between participants to settle debts.

**Key Columns**:

```sql
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,                    -- UUID
  trip_id TEXT NOT NULL,                  -- FK to trips (CASCADE delete)
  from_participant_id TEXT NOT NULL,      -- Who is paying (RESTRICT delete)
  to_participant_id TEXT NOT NULL,        -- Who is receiving (RESTRICT delete)
  expense_split_id TEXT,                  -- Optional: specific split being paid (RESTRICT delete)

  -- Multi-currency support (same pattern as expenses)
  original_currency TEXT NOT NULL,        -- Currency as entered (e.g., "EUR")
  original_amount_minor INTEGER NOT NULL, -- Amount in cents in original currency
  fx_rate_to_trip REAL,                   -- Exchange rate to trip currency (NULL if same)
  converted_amount_minor INTEGER NOT NULL,-- Amount in cents in trip currency

  date TEXT NOT NULL,                     -- Payment date (ISO 8601, user-entered)
  description TEXT,                       -- Optional notes
  payment_method TEXT,                    -- Optional: 'cash', 'venmo', 'paypal', etc.

  created_at TEXT NOT NULL,               -- Record creation timestamp
  updated_at TEXT NOT NULL                -- Record modification timestamp
);
```

**Indexes**:

- `settlements_trip_id_idx` - Fast trip-based queries
- `settlements_from_participant_idx` - Show payments from specific person
- `settlements_to_participant_idx` - Show payments to specific person
- `settlements_expense_split_idx` - Find settlements for specific expense
- `settlements_date_idx` - Chronological view

**Foreign Key Behavior**:

- `trip_id`: CASCADE delete (when trip deleted, settlements auto-delete)
- `from_participant_id`, `to_participant_id`: RESTRICT delete (cannot delete participant with settlements - preserves audit trail)
- `expense_split_id`: RESTRICT delete (cannot delete split if settlement references it)

---

## 2. Data Model & Conceptual Design

### Two Sources of Truth

The settlements feature introduces a **second source of truth** alongside expense splits:

```
Source 1: ExpenseSplits
├── Define "what you owe" from shared expenses
├── Example: Alice owes Bob $50 for dinner split
└── Used by: calculateBalances() to compute totalOwed

Source 2: Settlements
├── Define "what you've paid back" to other participants
├── Example: Alice paid Bob $30 towards debt
└── Used by: NEW calculateBalancesWithSettlements() to compute netBalances
```

### Net Balance Calculation

**Current formula (without settlements)**:

```
netPosition = totalPaid - totalOwed

Where:
- totalPaid = SUM(expenses paid by participant)
- totalOwed = SUM(expense splits owed by participant)
```

**New formula (with settlements)**:

```
netPosition = totalPaid - totalOwed + totalSettled

Where:
- totalPaid = SUM(expenses paid by participant)
- totalOwed = SUM(expense splits owed by participant)
- totalSettled = SUM(settlements received) - SUM(settlements paid)
  - Settlements received: payments TO this participant (reduces debt owed to them)
  - Settlements paid: payments FROM this participant (reduces debt they owe)
```

### Example Scenario

**Setup**:

- Alice paid $100 for dinner, split equally with Bob
- Alice owes $50, Bob owes $50
- Bob pays Alice $30 as partial payment

**Without settlements** (current):

```
Alice: totalPaid=$100, totalOwed=$50 → netPosition=+$50 (owed $50)
Bob:   totalPaid=$0,   totalOwed=$50 → netPosition=-$50 (owes $50)
```

**With settlements** (new):

```
Settlement: from=Bob, to=Alice, amount=$30

Alice:
  totalPaid=$100, totalOwed=$50, settlementsReceived=$30
  → netPosition = $100 - $50 + $30 = +$80 (now owed $80 instead of $50)

Bob:
  totalPaid=$0, totalOwed=$50, settlementsPaid=$30
  → netPosition = $0 - $50 - $30 = -$80 (wait, this is wrong!)
```

**CORRECTION**: Settlement should REDUCE debt, not increase it:

```
netPosition = totalPaid - totalOwed + settlementsReceived - settlementsPaid

Alice:
  totalPaid=$100, totalOwed=$50
  settlementsReceived=$30, settlementsPaid=$0
  → netPosition = $100 - $50 + $30 - $0 = +$80 ❌ WRONG

Bob:
  totalPaid=$0, totalOwed=$50
  settlementsReceived=$0, settlementsPaid=$30
  → netPosition = $0 - $50 + $0 - $30 = -$80 ❌ WRONG
```

**CORRECT FORMULA**:

The issue is conceptual. Let's think about it differently:

- **Expenses create debt**: When Alice pays $100 and Bob owes $50, Bob has a $50 debt TO Alice
- **Settlements pay down debt**: When Bob pays Alice $30, this REDUCES Bob's debt by $30

So the correct formula is:

```
For the CREDITOR (person owed money):
  netPosition = (totalPaid - totalOwed) - settlementsReceived

For the DEBTOR (person who owes money):
  netPosition = (totalPaid - totalOwed) + settlementsPaid
```

Wait, that's also wrong. Let me reconsider from first principles:

**First Principles**:

1. When you pay for an expense, your balance goes UP (you're owed money)
2. When you owe a split, your balance goes DOWN (you owe money)
3. When you PAY someone (settlement FROM you), your balance goes UP (debt reduced)
4. When you RECEIVE payment (settlement TO you), your balance goes DOWN (credit reduced)

**Correct Formula**:

```
netPosition = totalPaid - totalOwed + settlementsPaid - settlementsReceived

Alice (creditor):
  totalPaid=$100, totalOwed=$50, settlementsPaid=$0, settlementsReceived=$30
  → netPosition = $100 - $50 + $0 - $30 = +$20 ✓
  (She's still owed $20 after Bob paid $30 of his $50 debt)

Bob (debtor):
  totalPaid=$0, totalOwed=$50, settlementsPaid=$30, settlementsReceived=$0
  → netPosition = $0 - $50 + $30 - $0 = -$20 ✓
  (He still owes $20 after paying $30 of his $50 debt)
```

**Verification**: Alice (+$20) + Bob (-$20) = $0 ✓ (balances sum to zero)

---

## 3. Integration with Existing Settlement Engine

### Current Three-Layer Architecture

**Layer 1 - Pure Math** (`normalize-shares.ts`, `calculate-balances.ts`, `optimize-settlements.ts`):

- Pure functions with zero dependencies
- Operate on plain data structures
- Deterministic: same inputs → same outputs

**Layer 2 - Service** (`service/SettlementService.ts`):

- Loads data from database
- Calls pure functions
- Returns settlement summary

**Layer 3 - Hooks** (`hooks/use-settlement.ts`):

- React hooks for UI integration
- Manages loading states
- Triggers recalculations

### Required Changes

#### Layer 1 - Pure Math

**NEW**: `calculate-balances-with-settlements.ts`

```typescript
/**
 * MODELER: Calculate net positions INCLUDING settlement transactions
 *
 * @param expenses - All expenses for the trip
 * @param splits - All expense splits
 * @param settlements - All settlement transactions
 * @param participants - All participants
 * @returns Array of participant balances with settlement-adjusted net positions
 */
export const calculateBalancesWithSettlements = (
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[],
  participants: Participant[],
): ParticipantBalance[] => {
  // Step 1: Calculate base balances from expenses (existing logic)
  const baseBalances = calculateBalances(expenses, splits, participants);

  // Step 2: Adjust balances based on settlements
  const settlementAdjustments = new Map<string, number>();

  settlements.forEach((settlement) => {
    // Payer's debt decreases (balance goes UP)
    const payerAdjustment =
      settlementAdjustments.get(settlement.fromParticipantId) || 0;
    settlementAdjustments.set(
      settlement.fromParticipantId,
      payerAdjustment + settlement.convertedAmountMinor,
    );

    // Receiver's credit decreases (balance goes DOWN)
    const receiverAdjustment =
      settlementAdjustments.get(settlement.toParticipantId) || 0;
    settlementAdjustments.set(
      settlement.toParticipantId,
      receiverAdjustment - settlement.convertedAmountMinor,
    );
  });

  // Step 3: Apply adjustments to base balances
  return baseBalances.map((balance) => ({
    ...balance,
    netPosition:
      balance.netPosition +
      (settlementAdjustments.get(balance.participantId) || 0),
  }));
};
```

**ALTERNATIVE**: Modify existing `calculateBalances()` to accept optional `settlements` parameter

```typescript
export const calculateBalances = (
  expenses: Expense[],
  splits: ExpenseSplit[],
  participants: Participant[],
  settlements?: Settlement[], // NEW: optional settlements
): ParticipantBalance[] => {
  // Existing logic...

  // NEW: Apply settlement adjustments if provided
  if (settlements && settlements.length > 0) {
    settlements.forEach((settlement) => {
      const payer = balanceMap.get(settlement.fromParticipantId);
      const receiver = balanceMap.get(settlement.toParticipantId);

      if (payer) {
        // Payer's balance increases (debt reduced)
        payer.totalPaid += settlement.convertedAmountMinor;
      }

      if (receiver) {
        // Receiver's balance decreases (credit reduced)
        payer.totalOwed += settlement.convertedAmountMinor;
      }
    });
  }

  // Rest of existing logic...
};
```

**RECOMMENDATION**: Use the **second approach** (modify existing function) because:

1. Maintains single function for balance calculation
2. Settlement adjustments are mathematically equivalent to "phantom expenses"
3. Simpler to test and maintain

#### Layer 2 - Service

**MODIFIED**: `service/SettlementService.ts`

```typescript
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

#### Layer 3 - Hooks

**NO CHANGES REQUIRED**: Existing hooks (`use-settlement.ts`, `use-settlement-with-display.ts`) will automatically reflect settlement adjustments once service is updated.

---

## 4. Expense-Specific Settlement Tracking

### Use Case

User wants to pay off a specific expense split directly:

- "I'm paying my $50 share of the dinner bill"
- Links settlement to `expenseSplitId`

### Database Design

**settlements.expenseSplitId**:

- `NULL`: General payment (not tied to specific expense)
- `NOT NULL`: Paying off this specific expense split

### UI Implications

**Expense Detail Screen**:

```
Dinner - $100 (paid by Alice)
Split: Alice $50, Bob $50

Bob's split: $50
  Settlements:
  - $30 paid on 2025-01-15 (via Venmo)
  - $20 paid on 2025-01-20 (cash)
  Status: Fully settled ✓
```

**Settlement Entry Form**:

```
┌─────────────────────────────────────┐
│ Pay Settlement                      │
├─────────────────────────────────────┤
│ From: Bob                           │
│ To: Alice                           │
│                                     │
│ Amount: $30                         │
│ Currency: USD                       │
│                                     │
│ Link to expense (optional):         │
│ [√] Dinner - Jan 15 ($50 owed)     │
│                                     │
│ Date: Jan 20, 2025                  │
│ Method: Venmo                       │
│ Notes: Paid via @alice-venmo        │
│                                     │
│          [Cancel]  [Save Payment]   │
└─────────────────────────────────────┘
```

### Business Logic

**Validation**:

1. If `expenseSplitId` is set:
   - Verify split belongs to trip
   - Verify `fromParticipantId` matches split's `participantId`
   - Verify `toParticipantId` matches expense's `paidBy`

2. Prevent overpayment warning (optional):
   - Calculate total settlements for this split
   - Warn if total > split amount
   - Still allow (user might be paying extra or for multiple things)

**Querying**:

```sql
-- Get all settlements for a specific expense
SELECT s.* FROM settlements s
JOIN expense_splits es ON s.expense_split_id = es.id
WHERE es.expense_id = ?

-- Get settlement status for an expense split
SELECT
  es.amount as owed_amount,
  COALESCE(SUM(s.converted_amount_minor), 0) as settled_amount,
  es.amount - COALESCE(SUM(s.converted_amount_minor), 0) as remaining_amount
FROM expense_splits es
LEFT JOIN settlements s ON s.expense_split_id = es.id
WHERE es.id = ?
GROUP BY es.id
```

---

## 5. Multi-Currency Support

### Pattern Consistency

Settlements use the **exact same multi-currency pattern** as expenses:

| Field                  | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `originalCurrency`     | Currency as entered by user (e.g., "EUR")                  |
| `originalAmountMinor`  | Amount in cents in original currency (e.g., 5000 = €50.00) |
| `fxRateToTrip`         | Exchange rate to trip currency (NULL if same currency)     |
| `convertedAmountMinor` | Amount in cents in trip currency (always set)              |

### Repository Responsibilities

**SettlementsRepository.createSettlement()**:

```typescript
async createSettlement(data: {
  tripId: string;
  fromParticipantId: string;
  toParticipantId: string;
  originalCurrency: string;
  originalAmountMinor: number;
  date: string;
  expenseSplitId?: string;
  description?: string;
  paymentMethod?: string;
}): Promise<Settlement> {
  // 1. Get trip to determine trip currency
  const trip = await getTrip(data.tripId);

  // 2. Convert to trip currency if needed
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

  // 3. Insert settlement record
  const settlement: NewSettlement = {
    id: generateId(),
    tripId: data.tripId,
    fromParticipantId: data.fromParticipantId,
    toParticipantId: data.toParticipantId,
    expenseSplitId: data.expenseSplitId,
    originalCurrency: data.originalCurrency,
    originalAmountMinor: data.originalAmountMinor,
    fxRateToTrip,
    convertedAmountMinor,
    date: data.date,
    description: data.description,
    paymentMethod: data.paymentMethod,
  };

  return db.insert(settlements).values(settlement).returning();
}
```

### Display Currency Support

**DisplayCurrencyAdapter** (already exists) will automatically handle display conversions:

```typescript
// Settlement with display currency
const settlementWithDisplay = {
  ...settlement,
  displayAmount: {
    tripCurrency: "USD",
    tripAmount: 5400, // $54.00
    displayCurrency: "EUR",
    displayAmount: 5000, // €50.00
    fxRate: 0.926,
  },
};
```

---

## 6. Data Flow for Recalculation

### Trigger Points

Settlements affect balance calculations when:

1. Settlement created
2. Settlement updated (amount, date, participants)
3. Settlement deleted

### Recalculation Flow

```
User Action → Repository → Database
                              ↓
                        Trigger Hook
                              ↓
                    useSettlement() refetch
                              ↓
              SettlementService.computeSettlement()
                              ↓
         calculateBalances(expenses, splits, settlements)
                              ↓
              optimizeSettlements(balances)
                              ↓
                      UI updates with new net positions
```

### React Hook Pattern

**hooks/use-settlement.ts** (existing, no changes needed):

```typescript
export function useSettlement(tripId: string) {
  const [data, setData] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const summary = await computeSettlement(tripId);
      setData(summary);
      setLoading(false);
    }
    load();
  }, [tripId]);

  // Refetch function for manual refresh (after settlement CRUD)
  const refetch = useCallback(() => {
    setLoading(true);
    load();
  }, [tripId]);

  return { data, loading, refetch };
}
```

**Settlement CRUD Hooks**:

```typescript
// hooks/use-create-settlement.ts
export function useCreateSettlement(tripId: string) {
  const { refetch } = useSettlement(tripId);

  const createSettlement = useCallback(
    async (data: NewSettlementData) => {
      const settlement = await createSettlement(data);
      refetch(); // Trigger recalculation
      return settlement;
    },
    [tripId, refetch],
  );

  return { createSettlement };
}
```

---

## 7. Migration Strategy

### Schema Changes

**NO CHANGES** to existing tables:

- ✅ `trips` - unchanged
- ✅ `participants` - unchanged
- ✅ `expenses` - unchanged
- ✅ `expense_splits` - unchanged

**NEW TABLE**: `settlements`

### Migration Script

```sql
-- Migration: 0009_add_settlements_table.sql
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  from_participant_id TEXT NOT NULL,
  to_participant_id TEXT NOT NULL,
  expense_split_id TEXT,
  original_currency TEXT NOT NULL,
  original_amount_minor INTEGER NOT NULL,
  fx_rate_to_trip REAL,
  converted_amount_minor INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  payment_method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (from_participant_id) REFERENCES participants(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_participant_id) REFERENCES participants(id) ON DELETE RESTRICT,
  FOREIGN KEY (expense_split_id) REFERENCES expense_splits(id) ON DELETE RESTRICT
);

CREATE INDEX settlements_trip_id_idx ON settlements(trip_id);
CREATE INDEX settlements_from_participant_idx ON settlements(from_participant_id);
CREATE INDEX settlements_to_participant_idx ON settlements(to_participant_id);
CREATE INDEX settlements_expense_split_idx ON settlements(expense_split_id);
CREATE INDEX settlements_date_idx ON settlements(date);
```

### Backward Compatibility

**100% backward compatible**:

- No existing data affected
- Existing settlement calculations continue to work (ignore settlements if none exist)
- New feature is purely additive

---

## 8. Testing Strategy

### Unit Tests (Layer 1 - Pure Math)

**calculate-balances-with-settlements.test.ts**:

```typescript
describe("calculateBalances with settlements", () => {
  it("should reduce debtor balance when settlement is paid", () => {
    const expenses = [
      { id: "e1", amount: 10000, paidBy: "alice", currency: "USD" },
    ];
    const splits = [
      {
        id: "s1",
        expenseId: "e1",
        participantId: "alice",
        share: 1,
        shareType: "equal",
      },
      {
        id: "s2",
        expenseId: "e1",
        participantId: "bob",
        share: 1,
        shareType: "equal",
      },
    ];
    const settlements = [
      {
        id: "st1",
        fromParticipantId: "bob",
        toParticipantId: "alice",
        convertedAmountMinor: 3000,
      },
    ];
    const participants = [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ];

    const balances = calculateBalances(
      expenses,
      splits,
      participants,
      settlements,
    );

    // Alice: paid $100, owed $50, received $30 → net = $100 - $50 - $30 = +$20
    expect(balances.find((b) => b.participantId === "alice").netPosition).toBe(
      2000,
    );

    // Bob: paid $0, owed $50, paid $30 → net = $0 - $50 + $30 = -$20
    expect(balances.find((b) => b.participantId === "bob").netPosition).toBe(
      -2000,
    );
  });

  it("should handle expense-specific settlements", () => {
    // Test that settlements linked to specific splits are still counted
  });

  it("should handle multi-currency settlements", () => {
    // Test that settlements in different currencies use convertedAmountMinor
  });

  it("should handle overpayment scenarios", () => {
    // Test when settlements exceed the original debt
  });
});
```

### Integration Tests

**settlement-service-with-settlements.test.ts**:

```typescript
describe("SettlementService with settlements", () => {
  it("should include settlements in balance calculations", async () => {
    // Create trip, participants, expense, settlement
    // Verify computeSettlement() returns adjusted balances
  });

  it("should optimize settlements considering existing payments", async () => {
    // Complex scenario: multiple expenses + partial settlements
    // Verify optimized settlement suggestions only cover remaining debt
  });
});
```

### Repository Tests

**settlements-repository.test.ts**:

```typescript
describe("SettlementsRepository", () => {
  it("should create settlement with currency conversion", async () => {
    // Create settlement in EUR for USD trip
    // Verify fxRateToTrip and convertedAmountMinor are set correctly
  });

  it("should prevent deletion of referenced expense split", async () => {
    // Create settlement linked to split
    // Attempt to delete split
    // Verify RESTRICT constraint is enforced
  });

  it("should cascade delete settlements when trip is deleted", async () => {
    // Create trip with settlements
    // Delete trip
    // Verify settlements are auto-deleted
  });
});
```

---

## 9. UI/UX Considerations

### Settlement Entry Flow

**Option 1: From Settlement Screen** (general payment)

```
1. User navigates to "Settlements" tab
2. Taps "Record Payment"
3. Selects FROM participant (dropdown)
4. Selects TO participant (dropdown)
5. Enters amount and currency
6. Optionally links to expense
7. Adds date, method, notes
8. Saves → settlement recorded
```

**Option 2: From Expense Detail** (expense-specific)

```
1. User views expense detail (e.g., "Dinner $100")
2. Sees split breakdown: "Bob owes $50"
3. Taps "Mark as Paid" next to Bob's split
4. Pre-filled form:
   - FROM: Bob (auto-filled from split)
   - TO: Alice (auto-filled from expense.paidBy)
   - Amount: $50 (auto-filled from split amount)
   - Linked to: This expense split (auto-set)
5. User adjusts amount if partial payment
6. Saves → settlement recorded with expenseSplitId
```

### Settlement Display

**Settlements List**:

```
┌─────────────────────────────────────────┐
│ Settlements                             │
├─────────────────────────────────────────┤
│ Jan 20, 2025                            │
│ Bob → Alice: $30                        │
│ For: Dinner split                       │
│ Method: Venmo                           │
│                                         │
│ Jan 15, 2025                            │
│ Charlie → Alice: $45                    │
│ General payment                         │
│ Method: Cash                            │
└─────────────────────────────────────────┘
```

**Settlement Summary** (integration with existing balance view):

```
┌─────────────────────────────────────────┐
│ Balances                                │
├─────────────────────────────────────────┤
│ Alice: +$20 (was +$50 before payments)  │
│   Total expenses: $100                  │
│   Total owed: $50                       │
│   Settlements received: $30             │
│                                         │
│ Bob: -$20 (was -$50 before payments)    │
│   Total expenses: $0                    │
│   Total owed: $50                       │
│   Settlements paid: $30                 │
└─────────────────────────────────────────┘
```

---

## 10. Implementation Phases

### Phase 1: Database & Repository (Week 1)

- [x] Create `settlements` schema
- [ ] Generate migration via `npx drizzle-kit generate`
- [ ] Create `SettlementsRepository` with CRUD operations
- [ ] Add multi-currency conversion logic (reuse expense pattern)
- [ ] Write repository tests

### Phase 2: Settlement Engine Integration (Week 2)

- [ ] Modify `calculateBalances()` to accept `settlements` parameter
- [ ] Update `SettlementService.computeSettlement()` to load settlements
- [ ] Write unit tests for settlement-adjusted balance calculations
- [ ] Write integration tests for full settlement flow

### Phase 3: React Hooks (Week 3)

- [ ] Create `useSettlements(tripId)` hook (list all settlements)
- [ ] Create `useCreateSettlement()` hook
- [ ] Create `useUpdateSettlement()` hook
- [ ] Create `useDeleteSettlement()` hook
- [ ] Integrate with existing `useSettlement()` for automatic recalculation

### Phase 4: UI Screens (Week 4-5)

- [ ] Settlement list screen (view all settlements for trip)
- [ ] Settlement entry form (create/edit)
- [ ] Expense detail integration ("Mark as Paid" button)
- [ ] Settlement history on participant detail screen
- [ ] Display currency support in settlement views

### Phase 5: Polish & Edge Cases (Week 6)

- [ ] Overpayment warnings
- [ ] Settlement validation (prevent from=to, negative amounts)
- [ ] Settlement deletion confirmation (preserve audit trail)
- [ ] Settlement editing with recalculation
- [ ] Multi-currency settlement display
- [ ] Settlement export (CSV/PDF reports)

---

## 11. Answers to Original Questions

### Q1: What schema design do we need for settlements/transactions table?

**Answer**: The `settlements` table schema is defined above. Key features:

- Multi-currency support (original + converted amounts)
- Optional link to specific expense splits
- Flexible payment tracking (any amount, any participants)
- Comprehensive metadata (date, method, description)
- Proper indexing for performance
- Foreign key constraints for data integrity

### Q2: How do we track partial payments vs full expense payoffs?

**Answer**:

- **Partial payments**: Settlement amount < split amount
- **Full payoffs**: Settlement amount = split amount
- **Tracking**: Link settlement to `expenseSplitId` (optional)
- **Query**: `SUM(settlements.amount) WHERE expenseSplitId = ?` to see total settled
- **UI**: Show "Paid: $30 of $50" on expense detail screen

### Q3: How do we integrate with existing settlement calculation engine?

**Answer**:

- **Minimal changes**: Modify `calculateBalances()` to accept optional `settlements[]` parameter
- **Pure function**: Settlement adjustments are applied within existing math engine
- **Service layer**: `SettlementService` loads settlements from DB and passes to calculator
- **Hooks layer**: No changes needed (automatic propagation)

### Q4: Do we need to modify existing schema (trips, expenses, expense_splits)?

**Answer**: **NO**. The settlements feature is 100% additive:

- ✅ New table: `settlements`
- ✅ No changes to existing tables
- ✅ Backward compatible (works with or without settlements)
- ✅ Safe migration (zero risk to existing data)

### Q5: How do we handle currency conversions for transactions?

**Answer**:

- **Same pattern as expenses**: Store original + converted amounts
- **Repository handles conversion**: Automatically converts to trip currency on write
- **Uses FX rate cache**: `cachedFxRateProvider.getRate()` (already implemented)
- **Display currency**: `DisplayCurrencyAdapter` handles visual conversions

### Q6: What's the data flow for recalculating "what's owed" after a transaction is recorded?

**Answer**:

```
1. User creates settlement → Repository.createSettlement()
2. Settlement saved to DB
3. Hook triggers refetch → useSettlement() re-runs
4. SettlementService.computeSettlement() loads ALL data (expenses, splits, settlements)
5. calculateBalances() computes net positions including settlement adjustments
6. optimizeSettlements() generates minimized payment suggestions
7. UI displays updated balances and settlement recommendations
```

**Key insight**: Settlements are just another input to the deterministic calculation engine, similar to how expenses and splits are inputs.

---

## 12. File Structure

```
src/
├── db/
│   ├── schema/
│   │   ├── settlements.ts          # NEW: Settlement schema
│   │   └── index.ts                # UPDATED: Export settlements
│   └── migrations/
│       └── 0009_add_settlements.sql # NEW: Migration script
│
├── modules/
│   └── settlement/
│       ├── calculate-balances.ts   # MODIFIED: Accept settlements param
│       ├── service/
│       │   └── SettlementService.ts # MODIFIED: Load & pass settlements
│       ├── hooks/
│       │   ├── use-settlement.ts    # UNCHANGED: Auto-updates
│       │   └── use-settlement-with-display.ts # UNCHANGED
│       └── __tests__/
│           └── calculate-balances-with-settlements.test.ts # NEW
│
└── modules/settlements/            # NEW MODULE
    ├── repository/
    │   └── SettlementsRepository.ts # NEW: CRUD operations
    ├── hooks/
    │   ├── use-settlements.ts       # NEW: List settlements
    │   ├── use-create-settlement.ts # NEW: Create hook
    │   ├── use-update-settlement.ts # NEW: Update hook
    │   └── use-delete-settlement.ts # NEW: Delete hook
    ├── screens/
    │   ├── SettlementsListScreen.tsx # NEW: View all settlements
    │   ├── SettlementEntryScreen.tsx # NEW: Create/edit form
    │   └── SettlementDetailScreen.tsx # NEW: View single settlement
    ├── types.ts                     # NEW: Domain types
    └── __tests__/
        └── repository.test.ts       # NEW: Repository tests
```

---

## Conclusion

The settlements/transactions feature is designed to:

1. ✅ **Maintain architectural integrity**: Follows existing patterns (multi-currency, deterministic math, local-first)
2. ✅ **Preserve single source of truth**: Settlements are an additional input, not a replacement
3. ✅ **Enable flexible tracking**: Any amount, any participants, with optional expense linkage
4. ✅ **Minimize changes**: Only adds new code, doesn't modify critical existing logic
5. ✅ **Support CRUD**: Full create/read/update/delete with proper audit trail
6. ✅ **Integrate seamlessly**: Existing UI components auto-update with new calculations

**Next Steps**:

1. Generate migration: `npx drizzle-kit generate`
2. Review generated SQL
3. Implement `SettlementsRepository`
4. Modify `calculateBalances()` to accept settlements
5. Write tests
6. Build UI screens

The architecture is sound, testable, and ready for implementation. 🚀
