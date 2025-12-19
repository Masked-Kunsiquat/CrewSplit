# Settlements Feature: Real-World Example

**SYSTEM ARCHITECT: Step-by-step example showing settlements in action**

## Scenario: Weekend Ski Trip

**Participants**:
- Alice
- Bob
- Charlie

**Trip Currency**: USD

---

## Phase 1: Expenses Only (No Settlements)

### Expenses Created

```
Expense 1: Hotel - $300
  Paid by: Alice
  Split: Equal (Alice $100, Bob $100, Charlie $100)

Expense 2: Lift Tickets - $150
  Paid by: Bob
  Split: Equal (Alice $50, Bob $50, Charlie $50)

Expense 3: Groceries - $90
  Paid by: Alice
  Split: Equal (Alice $30, Bob $30, Charlie $30)
```

### Database State

**expenses**:
| id | paidBy | amount | date |
|----|--------|--------|------|
| e1 | alice  | 30000  | Jan 15 |
| e2 | bob    | 15000  | Jan 15 |
| e3 | alice  | 9000   | Jan 16 |

**expense_splits**:
| id | expenseId | participantId | amount |
|----|-----------|---------------|--------|
| s1 | e1 | alice | 10000 |
| s2 | e1 | bob | 10000 |
| s3 | e1 | charlie | 10000 |
| s4 | e2 | alice | 5000 |
| s5 | e2 | bob | 5000 |
| s6 | e2 | charlie | 5000 |
| s7 | e3 | alice | 3000 |
| s8 | e3 | bob | 3000 |
| s9 | e3 | charlie | 3000 |

**settlements**: (empty)

### Balance Calculation

```
Alice:
  totalPaid = $300 (e1) + $90 (e3) = $390
  totalOwed = $100 (s1) + $50 (s4) + $30 (s7) = $180
  netPosition = $390 - $180 = +$210 (owed $210)

Bob:
  totalPaid = $150 (e2) = $150
  totalOwed = $100 (s2) + $50 (s5) + $30 (s8) = $180
  netPosition = $150 - $180 = -$30 (owes $30)

Charlie:
  totalPaid = $0
  totalOwed = $100 (s3) + $50 (s6) + $30 (s9) = $180
  netPosition = $0 - $180 = -$180 (owes $180)
```

**Verification**: +$210 + (-$30) + (-$180) = $0 ✓

### Settlement Suggestions (Optimized)

```
Charlie → Alice: $180
Bob → Alice: $30
```

### UI Display

```
┌───────────────────────────────────────┐
│ Balances                              │
├───────────────────────────────────────┤
│ Alice: +$210.00                       │
│   (is owed money)                     │
│                                       │
│ Bob: -$30.00                          │
│   (owes money)                        │
│                                       │
│ Charlie: -$180.00                     │
│   (owes money)                        │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│ Settlement Suggestions                │
├───────────────────────────────────────┤
│ Charlie pays Alice: $180.00           │
│ Bob pays Alice: $30.00                │
└───────────────────────────────────────┘
```

---

## Phase 2: Bob Pays Alice (Partial Payment)

### User Action

Bob pays Alice $20 via Venmo (not the full $30 owed).

### Settlement Created

```
Settlement 1:
  from: Bob
  to: Alice
  originalCurrency: USD
  originalAmountMinor: 2000 ($20.00)
  fxRateToTrip: null (same currency)
  convertedAmountMinor: 2000 ($20.00)
  date: Jan 20
  description: "Partial payment"
  paymentMethod: "venmo"
  expenseSplitId: null (general payment, not linked to specific expense)
```

### Database State

**settlements**:
| id | fromParticipantId | toParticipantId | convertedAmountMinor | date |
|----|-------------------|-----------------|----------------------|------|
| st1 | bob | alice | 2000 | Jan 20 |

### Recalculated Balances

```
Alice:
  Base balance:
    totalPaid = $390
    totalOwed = $180
  Settlement adjustment:
    Received $20 from Bob → totalOwed += $20 = $200
  netPosition = $390 - $200 = +$190

Bob:
  Base balance:
    totalPaid = $150
    totalOwed = $180
  Settlement adjustment:
    Paid $20 to Alice → totalPaid += $20 = $170
  netPosition = $170 - $180 = -$10

Charlie:
  Base balance:
    totalPaid = $0
    totalOwed = $180
  Settlement adjustment: (none)
  netPosition = $0 - $180 = -$180
```

**Verification**: +$190 + (-$10) + (-$180) = $0 ✓

### Updated Settlement Suggestions

```
Charlie → Alice: $180
Bob → Alice: $10 (reduced from $30)
```

### UI Display

```
┌───────────────────────────────────────┐
│ Balances                              │
├───────────────────────────────────────┤
│ Alice: +$190.00                       │
│   (was +$210.00)                      │
│   Settlements received: $20.00        │
│                                       │
│ Bob: -$10.00                          │
│   (was -$30.00)                       │
│   Settlements paid: $20.00            │
│                                       │
│ Charlie: -$180.00                     │
│   (unchanged)                         │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│ Settlement Suggestions                │
├───────────────────────────────────────┤
│ Charlie pays Alice: $180.00           │
│ Bob pays Alice: $10.00 ← reduced      │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│ Settlement History                    │
├───────────────────────────────────────┤
│ Jan 20, 2025                          │
│ Bob → Alice: $20.00                   │
│ Method: Venmo                         │
│ Note: Partial payment                 │
└───────────────────────────────────────┘
```

---

## Phase 3: Charlie Pays His Hotel Share (Expense-Specific)

### User Action

Charlie wants to specifically pay off his share of the hotel bill ($100).

### Settlement Created

```
Settlement 2:
  from: Charlie
  to: Alice
  originalCurrency: USD
  originalAmountMinor: 10000 ($100.00)
  fxRateToTrip: null
  convertedAmountMinor: 10000 ($100.00)
  date: Jan 21
  description: "Hotel split payment"
  paymentMethod: "cash"
  expenseSplitId: s3 ← LINKED to Charlie's hotel split
```

### Database State

**settlements**:
| id | fromParticipantId | toParticipantId | convertedAmountMinor | expenseSplitId | date |
|----|-------------------|-----------------|----------------------|----------------|------|
| st1 | bob | alice | 2000 | null | Jan 20 |
| st2 | charlie | alice | 10000 | s3 | Jan 21 |

### Recalculated Balances

```
Alice:
  Base balance:
    totalPaid = $390
    totalOwed = $180
  Settlement adjustments:
    Received $20 from Bob → +$20
    Received $100 from Charlie → +$100
    totalOwed = $180 + $20 + $100 = $300
  netPosition = $390 - $300 = +$90

Bob:
  Base balance:
    totalPaid = $150
    totalOwed = $180
  Settlement adjustment:
    Paid $20 to Alice → +$20
    totalPaid = $150 + $20 = $170
  netPosition = $170 - $180 = -$10

Charlie:
  Base balance:
    totalPaid = $0
    totalOwed = $180
  Settlement adjustment:
    Paid $100 to Alice → +$100
    totalPaid = $0 + $100 = $100
  netPosition = $100 - $180 = -$80
```

**Verification**: +$90 + (-$10) + (-$80) = $0 ✓

### Updated Settlement Suggestions

```
Charlie → Alice: $80 (reduced from $180)
Bob → Alice: $10
```

### Expense Detail View

```
┌───────────────────────────────────────┐
│ Expense: Hotel - $300.00              │
├───────────────────────────────────────┤
│ Paid by: Alice                        │
│ Date: Jan 15, 2025                    │
│                                       │
│ Split Breakdown:                      │
│                                       │
│ Alice: $100.00                        │
│   Status: Paid (she paid the expense) │
│                                       │
│ Bob: $100.00                          │
│   Status: Unpaid                      │
│   [Mark as Paid]                      │
│                                       │
│ Charlie: $100.00                      │
│   Status: Fully Paid ✓                │
│   Settlements:                        │
│     • $100.00 on Jan 21 (Cash)        │
│       Note: Hotel split payment       │
└───────────────────────────────────────┘
```

---

## Phase 4: Bob Pays Remaining Balance (Full Settlement)

### User Action

Bob pays his remaining $10 owed to Alice.

### Settlement Created

```
Settlement 3:
  from: Bob
  to: Alice
  originalCurrency: USD
  originalAmountMinor: 1000 ($10.00)
  fxRateToTrip: null
  convertedAmountMinor: 1000 ($10.00)
  date: Jan 22
  description: "Final payment"
  paymentMethod: "venmo"
  expenseSplitId: null
```

### Database State

**settlements**:
| id | fromParticipantId | toParticipantId | convertedAmountMinor | date |
|----|-------------------|-----------------|----------------------|------|
| st1 | bob | alice | 2000 | Jan 20 |
| st2 | charlie | alice | 10000 | Jan 21 |
| st3 | bob | alice | 1000 | Jan 22 |

### Recalculated Balances

```
Alice:
  Base balance:
    totalPaid = $390
    totalOwed = $180
  Settlement adjustments:
    Received $20 + $100 + $10 = $130
    totalOwed = $180 + $130 = $310
  netPosition = $390 - $310 = +$80

Bob:
  Base balance:
    totalPaid = $150
    totalOwed = $180
  Settlement adjustments:
    Paid $20 + $10 = $30
    totalPaid = $150 + $30 = $180
  netPosition = $180 - $180 = $0 ← SETTLED!

Charlie:
  Base balance:
    totalPaid = $0
    totalOwed = $180
  Settlement adjustment:
    Paid $100
    totalPaid = $0 + $100 = $100
  netPosition = $100 - $180 = -$80
```

**Verification**: +$80 + $0 + (-$80) = $0 ✓

### Updated Settlement Suggestions

```
Charlie → Alice: $80
```

### UI Display

```
┌───────────────────────────────────────┐
│ Balances                              │
├───────────────────────────────────────┤
│ Alice: +$80.00                        │
│   Settlements received: $130.00       │
│                                       │
│ Bob: $0.00 ✓ SETTLED                  │
│   Settlements paid: $30.00            │
│                                       │
│ Charlie: -$80.00                      │
│   Settlements paid: $100.00           │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│ Settlement Suggestions                │
├───────────────────────────────────────┤
│ Charlie pays Alice: $80.00            │
│                                       │
│ ✓ Bob is settled up!                  │
└───────────────────────────────────────┘
```

---

## Phase 5: Charlie Pays in EUR (Multi-Currency)

### User Action

Charlie is in Europe and pays Alice €75 via PayPal.

### FX Rate Lookup

```
Date: Jan 23, 2025
From: EUR
To: USD
Rate: 1.08 (1 EUR = 1.08 USD)
Source: CachedFxRateProvider (fetched from Frankfurter API)
```

### Settlement Created

```
Settlement 4:
  from: Charlie
  to: Alice
  originalCurrency: EUR
  originalAmountMinor: 7500 (€75.00)
  fxRateToTrip: 1.08
  convertedAmountMinor: 8100 (round(7500 * 1.08) = $81.00)
  date: Jan 23
  description: "PayPal payment from Europe"
  paymentMethod: "paypal"
  expenseSplitId: null
```

### Database State

**settlements**:
| id | fromParticipantId | toParticipantId | originalCurrency | originalAmountMinor | fxRateToTrip | convertedAmountMinor | date |
|----|-------------------|-----------------|------------------|---------------------|--------------|----------------------|------|
| st1 | bob | alice | USD | 2000 | null | 2000 | Jan 20 |
| st2 | charlie | alice | USD | 10000 | null | 10000 | Jan 21 |
| st3 | bob | alice | USD | 1000 | null | 1000 | Jan 22 |
| st4 | charlie | alice | EUR | 7500 | 1.08 | 8100 | Jan 23 |

### Recalculated Balances

```
Alice:
  Base balance:
    totalPaid = $390
    totalOwed = $180
  Settlement adjustments:
    Received $20 + $100 + $10 + $81 = $211
    totalOwed = $180 + $211 = $391
  netPosition = $390 - $391 = -$1 ← Charlie overpaid by $1!

Bob:
  Base balance:
    totalPaid = $150
    totalOwed = $180
  Settlement adjustments:
    Paid $20 + $10 = $30
    totalPaid = $150 + $30 = $180
  netPosition = $180 - $180 = $0

Charlie:
  Base balance:
    totalPaid = $0
    totalOwed = $180
  Settlement adjustments:
    Paid $100 + $81 = $181
    totalPaid = $0 + $181 = $181
  netPosition = $181 - $180 = +$1 ← Charlie is now owed $1!
```

**Verification**: -$1 + $0 + $1 = $0 ✓

### Updated Settlement Suggestions

```
Alice → Charlie: $1 (Charlie overpaid by $1)
```

### UI Display

```
┌───────────────────────────────────────┐
│ Balances                              │
├───────────────────────────────────────┤
│ Alice: -$1.00                         │
│   Settlements received: $211.00       │
│   Note: Owes Charlie $1 (overpayment) │
│                                       │
│ Bob: $0.00 ✓ SETTLED                  │
│                                       │
│ Charlie: +$1.00                       │
│   Settlements paid: $181.00           │
│   Note: Overpaid by $1                │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│ Settlement History                    │
├───────────────────────────────────────┤
│ Jan 23, 2025                          │
│ Charlie → Alice: €75.00 EUR           │
│   (=$81.00 USD @ 1.08)                │
│ Method: PayPal                        │
│ Note: PayPal payment from Europe      │
│                                       │
│ Jan 22, 2025                          │
│ Bob → Alice: $10.00 USD               │
│ Method: Venmo                         │
│                                       │
│ Jan 21, 2025                          │
│ Charlie → Alice: $100.00 USD          │
│ Method: Cash                          │
│ Linked to: Hotel expense              │
│                                       │
│ Jan 20, 2025                          │
│ Bob → Alice: $20.00 USD               │
│ Method: Venmo                         │
└───────────────────────────────────────┘
```

---

## Summary Statistics

### Total Trip Expenses
```
$300 (Hotel) + $150 (Lift Tickets) + $90 (Groceries) = $540
```

### Total Settlements Recorded
```
$20 + $100 + $10 + $81 = $211
```

### Remaining Debt
```
$1 (Alice owes Charlie due to overpayment)
```

### Settlement Breakdown by Participant

**Alice**:
- Paid for expenses: $390
- Owed for splits: $180
- Received in settlements: $211
- Net position: -$1 (owes Charlie)

**Bob**:
- Paid for expenses: $150
- Owed for splits: $180
- Paid in settlements: $30
- Net position: $0 (settled)

**Charlie**:
- Paid for expenses: $0
- Owed for splits: $180
- Paid in settlements: $181
- Net position: +$1 (owed by Alice)

---

## Key Takeaways

1. **Flexible payments**: Bob paid in two installments ($20 + $10)
2. **Expense-specific tracking**: Charlie's hotel payment linked to specific split
3. **Multi-currency support**: Charlie's EUR payment converted to USD automatically
4. **Automatic recalculation**: Balance suggestions updated after each settlement
5. **Overpayment handling**: System correctly shows when someone overpays
6. **Audit trail**: Complete history of who paid what, when, and how
7. **Deterministic**: Same data always produces same balances (testable)

This example demonstrates all core features of the settlements system working together in a realistic scenario.
