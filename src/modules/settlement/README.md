# Settlement Module

**MODELER (MATH + ALGORITHM ENGINE)**: Pure mathematical functions for expense settlement

## Overview

This module implements the core mathematical logic for splitting expenses and calculating optimal settlements. All functions are **strictly pure** with no side effects, ensuring deterministic and auditable calculations.

## Core Functions

### 1. `normalizeShares(splits, expenseAmount): number[]`

Converts different split types to actual amounts in cents.

**Supported split types**:
- `equal`: Divide expense evenly among participants
- `percentage`: Split by percentage (must sum to 100)
- `weight`: Split by weighted ratio
- `amount`: Use exact amounts (must sum to expense total)

**Rounding strategy**:
- Uses `Math.floor` to get base amounts
- Distributes remainder cents to participants with largest fractional parts
- Ensures sum exactly equals expense amount (no rounding errors)

**Example**:
```typescript
const splits: ExpenseSplit[] = [
  { participantId: 'alice', share: 0, shareType: 'equal' },
  { participantId: 'bob', share: 0, shareType: 'equal' },
  { participantId: 'charlie', share: 0, shareType: 'equal' },
];

const normalized = normalizeShares(splits, 1000); // $10.00
// Result: [334, 333, 333] cents (Alice gets extra cent)
```

---

### 2. `calculateBalances(expenses, splits, participants): ParticipantBalance[]`

Calculates net positions for all participants across all expenses.

**Net position formula**:
```
netPosition = totalPaid - totalOwed
```

- **Positive**: Participant is owed money (creditor)
- **Negative**: Participant owes money (debtor)
- **Zero**: Participant is settled

**Example**:
```typescript
// Alice paid $30, owes $10 → net +$20 (creditor)
// Bob paid $0, owes $10 → net -$10 (debtor)
// Charlie paid $0, owes $10 → net -$10 (debtor)
```

**Properties**:
- Net positions always sum to zero (conservation of money)
- Output is sorted by `participantId` for determinism
- Handles participants with no expenses (zero balances)

---

### 3. `optimizeSettlements(balances): Settlement[]`

Minimizes transactions using a greedy algorithm.

**Algorithm**:
1. Separate participants into creditors (net > 0) and debtors (net < 0)
2. Sort both by absolute value descending, then by ID
3. Match largest creditor with largest debtor
4. Create settlement for `min(creditor, abs(debtor))`
5. Repeat until all balanced

**Example**:
```typescript
// Alice: +$20, Bob: -$10, Charlie: -$10
// Settlements:
// 1. Bob → Alice: $10
// 2. Charlie → Alice: $10
```

**Properties**:
- Minimizes number of transactions (at most N-1 for N participants)
- No circular payment chains
- Deterministic ordering ensures same output for same input

---

## Usage

```typescript
import { calculateBalances, optimizeSettlements } from '@modules/settlement';

// 1. Calculate balances from expenses
const balances = calculateBalances(expenses, splits, participants);

// 2. Optimize settlements
const settlements = optimizeSettlements(balances);

// 3. Display to user
settlements.forEach(s => {
  console.log(`${s.fromName} pays ${s.toName} $${s.amount / 100}`);
});
```

## Type Definitions

See [types.ts](./types.ts) for complete type definitions:
- `ExpenseSplit`: How an expense is divided
- `ParticipantBalance`: Net position for a participant
- `Settlement`: A payment transaction from one person to another
- `SettlementSummary`: Complete settlement result with metadata

## Design Principles

### 1. **Pure Functions**
- No side effects
- No database or UI dependencies
- Same inputs → same outputs
- See [PURITY_VERIFICATION.md](./PURITY_VERIFICATION.md)

### 2. **Determinism**
- Stable sorting with explicit tie-breaking
- No random values
- No dependency on system time or external state

### 3. **Integer Math (Cents)**
- All amounts stored as integers (cents)
- Avoids floating-point rounding errors
- Explicit remainder distribution

### 4. **Traceability**
- Every output value can be traced to input data
- No magic numbers or hidden calculations
- Fully auditable

### 5. **Conservation**
- Net positions always sum to zero
- Total paid always equals total owed
- No money created or destroyed

## Testing

Comprehensive test suite in [\_\_tests\_\_](./__tests__/):

- **normalize-shares.test.ts**: All split types, edge cases, rounding
- **calculate-balances.test.ts**: Multi-expense scenarios, missing participants, zero values
- **optimize-settlements.test.ts**: Greedy algorithm, no circular debts, determinism
- **integration.test.ts**: End-to-end settlement calculation, correctness properties

Run tests:
```bash
npm test -- settlement
```

## Edge Cases Handled

- Empty expense/participant lists
- Zero-value expenses
- Expenses with no splits
- Participants not involved in any expenses
- Uneven amounts requiring rounding
- Percentage splits that don't sum exactly to 100 (tolerance)
- Single-participant trips
- Mixed split types (throws validation error)

## Future Enhancements

When implementing the sync module, consider:
- **Conflict resolution**: How to merge balances from different devices
- **Partial sync**: Incremental balance updates
- **Version tracking**: Schema versioning for migrations

## References

- **Algorithm**: Greedy debt minimization (optimal for N participants)
- **Rounding**: Largest remainder method for fair distribution
- **Design pattern**: Pure functional composition
