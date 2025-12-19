# Settlements Data Flow Diagram

**SYSTEM ARCHITECT: Visual representation of settlements feature data flow**

## Overview

This document provides visual diagrams to understand how settlements integrate with the existing expense tracking system.

---

## 1. Database Schema Relationships

```
┌─────────────────┐
│     trips       │
│─────────────────│
│ id (PK)         │◄─────────────────────────────┐
│ name            │                              │
│ currency        │◄──┐                          │
│ start_date      │   │                          │
└─────────────────┘   │                          │
                      │                          │
                      │                          │
┌─────────────────┐   │   ┌──────────────────┐  │   ┌──────────────────┐
│  participants   │   │   │    expenses      │  │   │   settlements    │
│─────────────────│   │   │──────────────────│  │   │──────────────────│
│ id (PK)         │◄──┼───│ id (PK)          │  │   │ id (PK)          │
│ trip_id (FK)    │───┘   │ trip_id (FK)     │──┘   │ trip_id (FK)     │───┐
│ name            │       │ amount           │      │ from_participant │   │
│ avatar_color    │   ┌───│ paid_by (FK)     │  ┌───│ to_participant   │   │
└─────────────────┘   │   │ original_curr    │  │   │ expense_split_id │   │
        ▲             │   │ converted_amount │  │   │ original_curr    │   │
        │             │   │ fx_rate_to_trip  │  │   │ converted_amount │   │
        │             │   │ date             │  │   │ fx_rate_to_trip  │   │
        │             │   └──────────────────┘  │   │ date             │   │
        │             │            │            │   │ description      │   │
        │             │            │            │   │ payment_method   │   │
        │             │            ▼            │   └──────────────────┘   │
        │             │   ┌──────────────────┐ │            │             │
        │             │   │ expense_splits   │ │            │             │
        │             │   │──────────────────│ │            │             │
        │             │   │ id (PK)          │◄┘            │             │
        │             └───│ participant_id   │              │             │
        │                 │ expense_id (FK)  │──────────────┘             │
        │                 │ share            │                             │
        └─────────────────│ share_type       │                             │
                          │ amount           │                             │
                          └──────────────────┘                             │
                                                                           │
                          ┌────────────────────────────────────────────────┘
                          │
                          ▼
                      Foreign Keys:
                      - trip_id → trips.id (CASCADE)
                      - from_participant_id → participants.id (RESTRICT)
                      - to_participant_id → participants.id (RESTRICT)
                      - expense_split_id → expense_splits.id (RESTRICT, optional)
```

**Key Points**:
1. **settlements** is a new table with NO changes to existing tables
2. Settlements link to participants (from/to) and optionally to expense splits
3. Foreign key constraints preserve data integrity
4. CASCADE delete on trip_id (settlements deleted with trip)
5. RESTRICT delete on participants (can't delete if settlements exist)

---

## 2. Balance Calculation Flow (Without Settlements)

**Current State**:

```
┌────────────────────────────────────────────────────────────────────┐
│ Input Data (from Database)                                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  expenses = [                                                      │
│    { id: 'e1', amount: 10000, paidBy: 'alice' }  ($100)           │
│  ]                                                                 │
│                                                                    │
│  expense_splits = [                                                │
│    { expenseId: 'e1', participantId: 'alice', share: 1 }          │
│    { expenseId: 'e1', participantId: 'bob', share: 1 }            │
│  ]                                                                 │
│                                                                    │
│  participants = [                                                  │
│    { id: 'alice', name: 'Alice' }                                 │
│    { id: 'bob', name: 'Bob' }                                     │
│  ]                                                                 │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Layer 1: Pure Math (calculateBalances)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Initialize balances for all participants                       │
│     alice: { totalPaid: 0, totalOwed: 0 }                         │
│     bob:   { totalPaid: 0, totalOwed: 0 }                         │
│                                                                    │
│  2. Process expenses                                               │
│     Expense e1: $100 paid by Alice                                │
│       → alice.totalPaid += 10000                                  │
│                                                                    │
│  3. Normalize splits (equal split)                                │
│     Split amounts: [5000, 5000]  ($50 each)                       │
│                                                                    │
│  4. Process splits                                                 │
│     Split for alice: $50                                          │
│       → alice.totalOwed += 5000                                   │
│     Split for bob: $50                                            │
│       → bob.totalOwed += 5000                                     │
│                                                                    │
│  5. Calculate net positions                                        │
│     alice: netPosition = 10000 - 5000 = +5000  (+$50)            │
│     bob:   netPosition = 0 - 5000 = -5000      (-$50)            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Output: ParticipantBalance[]                                       │
├────────────────────────────────────────────────────────────────────┤
│  [                                                                 │
│    {                                                               │
│      participantId: 'alice',                                       │
│      participantName: 'Alice',                                     │
│      totalPaid: 10000,      // $100                               │
│      totalOwed: 5000,       // $50                                │
│      netPosition: 5000      // +$50 (owed to her)                 │
│    },                                                              │
│    {                                                               │
│      participantId: 'bob',                                         │
│      participantName: 'Bob',                                       │
│      totalPaid: 0,          // $0                                 │
│      totalOwed: 5000,       // $50                                │
│      netPosition: -5000     // -$50 (owes money)                  │
│    }                                                               │
│  ]                                                                 │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Layer 1: Pure Math (optimizeSettlements)                          │
├────────────────────────────────────────────────────────────────────┤
│  Input: balances (from above)                                      │
│  Output: Settlement suggestions                                    │
│                                                                    │
│  [                                                                 │
│    {                                                               │
│      from: 'bob',                                                  │
│      to: 'alice',                                                  │
│      amount: 5000  // Bob should pay Alice $50                    │
│    }                                                               │
│  ]                                                                 │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Balance Calculation Flow (WITH Settlements)

**New State**:

```
┌────────────────────────────────────────────────────────────────────┐
│ Input Data (from Database)                                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  expenses = [                                                      │
│    { id: 'e1', amount: 10000, paidBy: 'alice' }  ($100)           │
│  ]                                                                 │
│                                                                    │
│  expense_splits = [                                                │
│    { expenseId: 'e1', participantId: 'alice', share: 1 }          │
│    { expenseId: 'e1', participantId: 'bob', share: 1 }            │
│  ]                                                                 │
│                                                                    │
│  settlements = [  ◄───────────────── NEW                          │
│    {                                                               │
│      from: 'bob',                                                  │
│      to: 'alice',                                                  │
│      convertedAmountMinor: 3000  ($30)                            │
│    }                                                               │
│  ]                                                                 │
│                                                                    │
│  participants = [                                                  │
│    { id: 'alice', name: 'Alice' }                                 │
│    { id: 'bob', name: 'Bob' }                                     │
│  ]                                                                 │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Layer 1: Pure Math (calculateBalances with settlements)           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Steps 1-5: Same as before (calculate base balances)              │
│     alice: totalPaid=10000, totalOwed=5000, net=+5000             │
│     bob:   totalPaid=0,     totalOwed=5000, net=-5000             │
│                                                                    │
│  Step 6: Apply settlement adjustments  ◄───────────── NEW         │
│                                                                    │
│    Settlement: Bob → Alice ($30)                                  │
│                                                                    │
│    Conceptual model:                                               │
│      "Bob paid Alice $30, which reduces Bob's debt"               │
│                                                                    │
│    Implementation approach:                                        │
│      Treat settlement as "phantom expense":                        │
│        - Alice "paid" an extra $30 (credit)                       │
│        - Bob "owes" an extra $30 (debit)                          │
│                                                                    │
│    Adjustment logic:                                               │
│      payer (Bob):                                                  │
│        balances[bob].totalPaid += 3000                            │
│        → New totalPaid = 0 + 3000 = 3000                          │
│        → New netPosition = 3000 - 5000 = -2000  (-$20)           │
│                                                                    │
│      receiver (Alice):                                             │
│        balances[alice].totalOwed += 3000                          │
│        → New totalOwed = 5000 + 3000 = 8000                       │
│        → New netPosition = 10000 - 8000 = +2000  (+$20)          │
│                                                                    │
│    Verification:                                                   │
│      alice (+2000) + bob (-2000) = 0  ✓                           │
│      Original debt: $50                                            │
│      Payment: $30                                                  │
│      Remaining: $20  ✓                                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Output: ParticipantBalance[] (settlement-adjusted)                 │
├────────────────────────────────────────────────────────────────────┤
│  [                                                                 │
│    {                                                               │
│      participantId: 'alice',                                       │
│      participantName: 'Alice',                                     │
│      totalPaid: 10000,      // $100 (unchanged)                   │
│      totalOwed: 8000,       // $80 ($50 + $30 settlement)         │
│      netPosition: 2000      // +$20 (was +$50, received $30)      │
│    },                                                              │
│    {                                                               │
│      participantId: 'bob',                                         │
│      participantName: 'Bob',                                       │
│      totalPaid: 3000,       // $30 (was $0, paid $30 settlement)  │
│      totalOwed: 5000,       // $50 (unchanged)                    │
│      netPosition: -2000     // -$20 (was -$50, paid $30)          │
│    }                                                               │
│  ]                                                                 │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Layer 1: Pure Math (optimizeSettlements)                          │
├────────────────────────────────────────────────────────────────────┤
│  Input: balances (settlement-adjusted)                             │
│  Output: Settlement suggestions                                    │
│                                                                    │
│  [                                                                 │
│    {                                                               │
│      from: 'bob',                                                  │
│      to: 'alice',                                                  │
│      amount: 2000  // Bob should pay Alice $20 (was $50)          │
│    }                                                               │
│  ]                                                                 │
│                                                                    │
│  NOTE: Suggestion now reflects remaining debt after payment        │
└────────────────────────────────────────────────────────────────────┘
```

**Key Insight**: Settlements are modeled as "phantom expenses" where:
- Payer's `totalPaid` increases (as if they paid an expense)
- Receiver's `totalOwed` increases (as if they owe more)
- This mathematically reduces the net debt between them

**Why this works**:
```
Original formula:
  netPosition = totalPaid - totalOwed

After settlement (Bob pays Alice $30):
  Bob:   netPosition = (0 + 30) - 50 = -20  ✓
  Alice: netPosition = 100 - (50 + 30) = +20  ✓

Verification:
  Sum of net positions: +20 + (-20) = 0  ✓ (conservation law holds)
```

---

## 4. Multi-Currency Settlement Flow

```
┌────────────────────────────────────────────────────────────────────┐
│ User Input: Create Settlement                                      │
├────────────────────────────────────────────────────────────────────┤
│  Trip currency: USD                                                │
│  Settlement:                                                       │
│    from: Bob                                                       │
│    to: Alice                                                       │
│    originalCurrency: EUR                                           │
│    originalAmountMinor: 5000  (€50.00)                            │
│    date: 2025-01-15                                                │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Repository Layer: Currency Conversion                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Fetch trip currency                                            │
│     trip.currency = "USD"                                          │
│                                                                    │
│  2. Check if conversion needed                                     │
│     originalCurrency (EUR) ≠ trip.currency (USD)                  │
│     → Conversion required                                          │
│                                                                    │
│  3. Fetch FX rate from cache                                       │
│     cachedFxRateProvider.getRate("EUR", "USD", "2025-01-15")      │
│     → Returns: 1.08 (1 EUR = 1.08 USD)                            │
│                                                                    │
│  4. Convert amount                                                 │
│     convertedAmountMinor = Math.round(5000 * 1.08)                │
│                           = Math.round(5400)                       │
│                           = 5400  ($54.00)                         │
│                                                                    │
│  5. Build settlement record                                        │
│     {                                                              │
│       id: "st1",                                                   │
│       tripId: "trip1",                                             │
│       fromParticipantId: "bob",                                    │
│       toParticipantId: "alice",                                    │
│       originalCurrency: "EUR",                                     │
│       originalAmountMinor: 5000,     // €50.00                    │
│       fxRateToTrip: 1.08,                                          │
│       convertedAmountMinor: 5400,    // $54.00                    │
│       date: "2025-01-15"                                           │
│     }                                                              │
│                                                                    │
│  6. Save to database                                               │
│     INSERT INTO settlements VALUES (...)                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Settlement Calculations: Use convertedAmountMinor                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  calculateBalances() receives:                                     │
│    settlements = [                                                 │
│      { from: 'bob', to: 'alice', convertedAmountMinor: 5400 }     │
│    ]                                                               │
│                                                                    │
│  Adjustment (in trip currency USD):                                │
│    bob.totalPaid += 5400    // $54.00                             │
│    alice.totalOwed += 5400  // $54.00                             │
│                                                                    │
│  NOTE: Original currency (EUR) is preserved for display only       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Display Layer: Show Both Currencies                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  UI displays:                                                      │
│    "Bob paid Alice €50.00 EUR ($54.00 USD)"                       │
│    "Exchange rate: 1.08"                                           │
│    "Date: Jan 15, 2025"                                            │
│                                                                    │
│  If user has display currency set to EUR:                          │
│    "Bob paid Alice €50.00 EUR (€50.00 EUR)"                       │
│    → Shows original currency since it matches display preference   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Pattern Consistency**:
- Settlements use the **exact same multi-currency pattern** as expenses
- Repository handles conversion on write (deterministic)
- Calculations always use `convertedAmountMinor` (trip currency)
- Display layer shows both original and converted amounts
- FX rates are cached for offline support

---

## 5. Expense-Specific Settlement Flow

**User Journey: "Pay My Share of Dinner"**

```
┌────────────────────────────────────────────────────────────────────┐
│ Step 1: User Views Expense Detail                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Expense: Dinner - $100                                            │
│  Paid by: Alice                                                    │
│  Date: Jan 10, 2025                                                │
│                                                                    │
│  Splits:                                                           │
│    ┌─────────────────────────────────────────────────┐           │
│    │ Alice: $50                                       │           │
│    │   Status: Paid (she paid the expense)           │           │
│    ├─────────────────────────────────────────────────┤           │
│    │ Bob: $50                                         │           │
│    │   Status: Unpaid                                 │           │
│    │   [Mark as Paid] ◄─── User taps this            │           │
│    └─────────────────────────────────────────────────┘           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 2: Pre-filled Settlement Form                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Pay Settlement                                                    │
│                                                                    │
│  From: Bob ◄─── Auto-filled from split.participantId             │
│  To: Alice ◄─── Auto-filled from expense.paidBy                  │
│                                                                    │
│  Amount: $50 ◄─── Auto-filled from split amount                  │
│  Currency: USD                                                     │
│                                                                    │
│  Linked to expense:                                                │
│  [✓] Dinner - Jan 10 ($50 owed) ◄─── Auto-linked                 │
│                                                                    │
│  Date: Jan 15, 2025                                                │
│  Method: [Venmo ▼]                                                 │
│  Notes: [Paid via @alice-venmo____]                               │
│                                                                    │
│          [Cancel]  [Save Payment]                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 3: Repository Validation                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Validate settlement data:                                         │
│    ✓ expenseSplitId references valid split                        │
│    ✓ fromParticipantId matches split.participantId                │
│    ✓ toParticipantId matches expense.paidBy                       │
│    ✓ amount > 0                                                    │
│    ✓ from ≠ to (can't pay yourself)                               │
│                                                                    │
│  Optional warning (not blocking):                                  │
│    - If amount > split amount: "You're paying more than owed"     │
│    - If total settlements > split: "This split is already paid"   │
│                                                                    │
│  Create settlement:                                                │
│    {                                                               │
│      id: "st1",                                                    │
│      tripId: "trip1",                                              │
│      fromParticipantId: "bob",                                     │
│      toParticipantId: "alice",                                     │
│      expenseSplitId: "split_bob_dinner", ◄─── LINKED              │
│      originalCurrency: "USD",                                      │
│      originalAmountMinor: 5000,                                    │
│      convertedAmountMinor: 5000,                                   │
│      fxRateToTrip: null,  (same currency)                         │
│      date: "2025-01-15",                                           │
│      description: "Dinner split payment",                          │
│      paymentMethod: "venmo"                                        │
│    }                                                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 4: Updated Expense Detail View                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Expense: Dinner - $100                                            │
│  Paid by: Alice                                                    │
│  Date: Jan 10, 2025                                                │
│                                                                    │
│  Splits:                                                           │
│    ┌─────────────────────────────────────────────────┐           │
│    │ Alice: $50                                       │           │
│    │   Status: Paid (she paid the expense)           │           │
│    ├─────────────────────────────────────────────────┤           │
│    │ Bob: $50                                         │           │
│    │   Status: Fully Paid ✓ ◄─── Updated             │           │
│    │   Settlements:                                   │           │
│    │     • $50 on Jan 15, 2025 (Venmo) ◄─── Shows   │           │
│    └─────────────────────────────────────────────────┘           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Database Query to Show Settlement Status**:

```sql
-- Get settlement status for an expense split
SELECT
  es.id as split_id,
  es.participant_id,
  p.name as participant_name,
  es.amount as owed_amount,
  COALESCE(SUM(s.converted_amount_minor), 0) as settled_amount,
  es.amount - COALESCE(SUM(s.converted_amount_minor), 0) as remaining_amount,
  CASE
    WHEN COALESCE(SUM(s.converted_amount_minor), 0) >= es.amount THEN 'paid'
    WHEN COALESCE(SUM(s.converted_amount_minor), 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END as status
FROM expense_splits es
JOIN participants p ON es.participant_id = p.id
LEFT JOIN settlements s ON s.expense_split_id = es.id
WHERE es.expense_id = ?
GROUP BY es.id
```

---

## 6. End-to-End Data Flow

**Complete flow from user action to UI update**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Action: Create Settlement                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. React Hook: useCreateSettlement()                            │
│    - Validates form data                                        │
│    - Calls repository                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Repository: SettlementsRepository.createSettlement()         │
│    - Fetches trip currency                                      │
│    - Converts amount if multi-currency                          │
│    - Validates foreign keys                                     │
│    - Inserts record into database                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Database: INSERT INTO settlements                            │
│    - Record persisted to SQLite                                 │
│    - Foreign key constraints checked                            │
│    - Indexes updated                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Hook Callback: refetch()                                     │
│    - Triggers useSettlement() re-fetch                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Service: SettlementService.computeSettlement()               │
│    - Loads expenses, splits, participants, settlements          │
│    - Passes to pure math functions                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Pure Math: calculateBalances(expenses, splits, settlements)  │
│    - Calculates base balances from expenses                     │
│    - Applies settlement adjustments                             │
│    - Returns updated ParticipantBalance[]                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Pure Math: optimizeSettlements(balances)                     │
│    - Generates minimized settlement suggestions                 │
│    - Returns Settlement[] (what's still owed)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Service Return: SettlementSummary                            │
│    {                                                            │
│      balances: [...],         // Updated with settlements       │
│      settlements: [...],      // Optimized suggestions          │
│      totalExpenses: 10000,                                      │
│      currency: "USD"                                            │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Hook State Update: useSettlement()                          │
│     - setData(summary)                                          │
│     - setLoading(false)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. React Re-render                                             │
│     - All components consuming useSettlement() re-render        │
│     - Balance views show updated net positions                  │
│     - Settlement suggestions reflect remaining debt             │
│     - Expense detail shows settlement history                   │
└─────────────────────────────────────────────────────────────────┘
```

**Time Complexity**:
- User sees loading state immediately (optimistic UI)
- Database write: ~5-10ms
- Recalculation: ~20-50ms (for typical trip with 50 expenses)
- UI update: ~16ms (single frame at 60fps)
- **Total perceived latency**: <100ms (feels instant)

---

## 7. Partial Payment Example

**Scenario**: Bob owes Alice $120 across 3 expenses, pays $90

```
┌──────────────────────────────────────────────────────────────────┐
│ Initial State (No Settlements)                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Expenses (all paid by Alice):                                    │
│   e1: Dinner $60 (Alice $30, Bob $30)                           │
│   e2: Gas $40 (Alice $20, Bob $20)                              │
│   e3: Hotel $140 (Alice $70, Bob $70)                           │
│                                                                  │
│ Balances:                                                        │
│   Alice: totalPaid=$240, totalOwed=$120 → net=+$120             │
│   Bob:   totalPaid=$0,   totalOwed=$120 → net=-$120             │
│                                                                  │
│ Settlement Suggestion:                                           │
│   Bob → Alice: $120                                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ User Action: Bob Pays $90 (General Payment)                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Settlement Created:                                              │
│   {                                                              │
│     from: 'bob',                                                 │
│     to: 'alice',                                                 │
│     amount: 9000,  ($90)                                         │
│     expenseSplitId: null  ← Not linked to specific expense      │
│   }                                                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Recalculation: Balances After Settlement                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Base balances (from expenses):                                   │
│   Alice: totalPaid=$240, totalOwed=$120                         │
│   Bob:   totalPaid=$0,   totalOwed=$120                         │
│                                                                  │
│ Settlement adjustments:                                          │
│   Bob (payer):                                                   │
│     totalPaid += 9000                                            │
│     → totalPaid = 0 + 9000 = 9000                               │
│     → netPosition = 9000 - 12000 = -3000  (-$30)                │
│                                                                  │
│   Alice (receiver):                                              │
│     totalOwed += 9000                                            │
│     → totalOwed = 12000 + 9000 = 21000                          │
│     → netPosition = 24000 - 21000 = +3000  (+$30)               │
│                                                                  │
│ Updated Balances:                                                │
│   Alice: net=+$30 (was +$120, received $90)                     │
│   Bob:   net=-$30 (was -$120, paid $90)                         │
│                                                                  │
│ New Settlement Suggestion:                                       │
│   Bob → Alice: $30 (reduced from $120)                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Points**:
1. General payments (not linked to specific expenses) reduce overall debt
2. Settlement math is transparent and auditable
3. Remaining debt is recalculated automatically
4. Settlement suggestions update to reflect partial payment

---

## Conclusion

The settlements feature integrates seamlessly with existing architecture:

- ✅ **Deterministic**: Same inputs → same outputs
- ✅ **Local-first**: All calculations offline
- ✅ **Auditable**: Every step traceable
- ✅ **Multi-currency**: Consistent pattern with expenses
- ✅ **Flexible**: General or expense-specific payments
- ✅ **Performant**: Fast recalculation (<100ms)

The "phantom expense" model for settlements is mathematically sound and preserves the existing pure function architecture while adding powerful new capabilities.
