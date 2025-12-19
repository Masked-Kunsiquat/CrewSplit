# Settlements Feature Documentation Index

**Complete reference for the settlements/transactions feature**

---

## Quick Links

### For Developers

1. **[SETTLEMENTS_SUMMARY.md](SETTLEMENTS_SUMMARY.md)** - START HERE
   - Quick answers to all requirements questions
   - High-level architecture overview
   - Implementation checklist

2. **[SETTLEMENTS_IMPLEMENTATION_GUIDE.md](SETTLEMENTS_IMPLEMENTATION_GUIDE.md)** - IMPLEMENTATION
   - Step-by-step implementation instructions
   - Code examples for each layer
   - Testing strategy

3. **[SETTLEMENTS_ARCHITECTURE.md](SETTLEMENTS_ARCHITECTURE.md)** - DEEP DIVE
   - Comprehensive schema design rationale
   - Data model and conceptual design
   - Integration with existing settlement engine
   - Multi-currency support details

4. **[SETTLEMENTS_DATA_FLOW.md](SETTLEMENTS_DATA_FLOW.md)** - VISUAL DIAGRAMS
   - Database schema relationships
   - Balance calculation flow
   - Multi-currency settlement flow
   - End-to-end data flow

5. **[SETTLEMENTS_EXAMPLE.md](SETTLEMENTS_EXAMPLE.md)** - REAL-WORLD SCENARIO
   - Complete example: Weekend ski trip
   - Step-by-step balance calculations
   - Multi-currency payment example
   - Overpayment handling

---

## Document Purpose Matrix

| Document                                | Purpose                     | Audience                | Read Time |
| --------------------------------------- | --------------------------- | ----------------------- | --------- |
| **SETTLEMENTS_SUMMARY.md**              | Quick reference, Q&A        | All developers          | 10 min    |
| **SETTLEMENTS_IMPLEMENTATION_GUIDE.md** | Hands-on coding guide       | Backend/Full-stack devs | 30 min    |
| **SETTLEMENTS_ARCHITECTURE.md**         | Design decisions, rationale | Architects, senior devs | 45 min    |
| **SETTLEMENTS_DATA_FLOW.md**            | Visual understanding        | All developers, QA      | 20 min    |
| **SETTLEMENTS_EXAMPLE.md**              | Practical demonstration     | All team members        | 15 min    |

---

## Reading Paths

### Path 1: "I need to understand the feature quickly"

1. **SETTLEMENTS_SUMMARY.md** - Read "Quick Answers" section
2. **SETTLEMENTS_EXAMPLE.md** - Skim Phase 1-3
3. Done! (20 minutes total)

### Path 2: "I'm implementing this feature"

1. **SETTLEMENTS_SUMMARY.md** - Full read
2. **SETTLEMENTS_IMPLEMENTATION_GUIDE.md** - Follow step-by-step
3. **SETTLEMENTS_DATA_FLOW.md** - Reference as needed
4. **SETTLEMENTS_EXAMPLE.md** - Use for testing scenarios
5. **SETTLEMENTS_ARCHITECTURE.md** - Consult for edge cases

### Path 3: "I need to review the architecture"

1. **SETTLEMENTS_ARCHITECTURE.md** - Full read
2. **SETTLEMENTS_DATA_FLOW.md** - Review diagrams
3. **SETTLEMENTS_SUMMARY.md** - Quick reference

### Path 4: "I'm writing tests"

1. **SETTLEMENTS_EXAMPLE.md** - Use as test scenarios
2. **SETTLEMENTS_IMPLEMENTATION_GUIDE.md** - Testing section
3. **SETTLEMENTS_DATA_FLOW.md** - Verify data flow correctness

---

## Key Files Reference

### Schema & Database

```
src/db/schema/settlements.ts
├── settlements table definition
├── Foreign key relationships
├── Indexes for performance
└── Type exports

src/db/migrations/0005_wealthy_cammi.sql
├── CREATE TABLE settlements
├── CREATE INDEX statements
└── Migration SQL
```

### Types

```
src/modules/settlements/types.ts
├── Settlement interface
├── NewSettlementData interface
├── SettlementWithParticipants interface
├── ExpenseSplitSettlementStatus interface
└── Display currency types
```

### Repository (To Be Implemented)

```
src/modules/settlements/repository/SettlementsRepository.ts
├── getSettlementsForTrip()
├── getSettlementsForParticipant()
├── getSettlementsForExpenseSplit()
├── createSettlement()
├── updateSettlement()
├── deleteSettlement()
└── Currency conversion logic
```

### Settlement Engine (To Be Modified)

```
src/modules/settlement/calculate-balances.ts
└── Add optional settlements parameter

src/modules/settlement/service/SettlementService.ts
└── Load and pass settlements to calculator
```

---

## Architecture Principles

### Core Concepts

1. **Single Source of Truth**
   - ExpenseSplits: Define what you owe
   - Settlements: Define what you've paid back
   - Net balance = totalPaid - totalOwed (with settlement adjustments)

2. **Deterministic Math**
   - Same inputs → same outputs
   - Pure functions with no side effects
   - Testable and reproducible

3. **Local-First**
   - Fully functional offline
   - FX rates cached locally
   - No network dependencies

4. **Multi-Currency Consistency**
   - Same pattern as expenses
   - Store original + converted amounts
   - Use FX rate cache

5. **Backward Compatibility**
   - Zero changes to existing tables
   - Purely additive design
   - Safe migration with no data loss

---

## Implementation Status

### Completed ✅

- [x] Schema design (`settlements.ts`)
- [x] Migration generation (`0005_wealthy_cammi.sql`)
- [x] Type definitions (`types.ts`)
- [x] Documentation (5 comprehensive docs)
- [x] TypeScript compilation verified

### In Progress 🚧

- [ ] Repository implementation
- [ ] Settlement engine integration
- [ ] React hooks
- [ ] UI screens

### Not Started ⏳

- [ ] Testing (unit, integration, UI)
- [ ] Settlement export features
- [ ] Payment method integrations

---

## Testing Scenarios

From **SETTLEMENTS_EXAMPLE.md**:

1. **Basic Settlement**: Bob pays Alice $20 (partial payment)
2. **Expense-Specific**: Charlie pays his hotel share ($100)
3. **Full Settlement**: Bob pays remaining $10 balance
4. **Multi-Currency**: Charlie pays in EUR, converts to USD
5. **Overpayment**: Charlie overpays by $1, balance flips

Use these scenarios for:

- Unit tests (pure math)
- Integration tests (database + service)
- UI tests (user flows)
- Manual QA (real device testing)

---

## Common Questions & Answers

### Q: Do settlements replace the existing settlement calculation engine?

**A**: No. Settlements are an _input_ to the existing engine, not a replacement. The pure math functions (`calculateBalances`, `optimizeSettlements`) continue to work as before, but now accept an optional `settlements` parameter.

### Q: What happens if a user deletes an expense that has settlements linked to it?

**A**: Settlements linked to expense splits use `ON DELETE RESTRICT`, which prevents deletion of the split if settlements reference it. User must delete settlements first, or we can implement cascade logic to clean up settlements when expense is deleted.

### Q: How do we handle currency conversion when FX rates are missing?

**A**: Repository throws `NoRateAvailableError`, which triggers the existing error recovery modal (already implemented in FX rates system). User is prompted to enter manual rate or retry sync.

### Q: Can settlements be edited after creation?

**A**: Yes. `updateSettlement()` allows editing amount, currency, date, description, and payment method. If currency or amount changes, conversion is recalculated automatically.

### Q: What if someone pays more than they owe?

**A**: System handles overpayment gracefully. The balance calculation will show the payer is now owed money (negative becomes positive). Settlement suggestions will flip to show who needs to pay whom.

---

## Migration Checklist

Before applying migration in production:

1. **Backup Database**
   - Export existing SQLite database
   - Test restoration procedure

2. **Review Migration SQL**
   - Verify foreign key constraints
   - Check index definitions
   - Confirm no DROP statements

3. **Test with Sample Data**
   - Create test trip with expenses
   - Add test settlements
   - Verify balance calculations
   - Test CRUD operations

4. **Verify Rollback Plan**
   - Document how to revert migration
   - Test rollback on copy of production data

5. **Monitor Performance**
   - Check query performance with indexes
   - Verify recalculation time <100ms
   - Test on low-end devices

---

## Support & Resources

### Internal Documentation

- **Project README**: `README.md`
- **Agent Roles**: `AGENTS.md`
- **Architecture Principles**: `CLAUDE.md`
- **Settlement Module Docs**: `docs/SETTLEMENTS_*.md`

### Database Schema

- **All Schemas**: `src/db/schema/`
- **Migrations**: `src/db/migrations/`
- **Mappers**: `src/db/mappers/`

### Existing Settlement Engine

- **Pure Math**: `src/modules/settlement/calculate-balances.ts`
- **Service**: `src/modules/settlement/service/SettlementService.ts`
- **Hooks**: `src/modules/settlement/hooks/`

### FX Rates System

- **Provider**: `src/modules/fx-rates/provider/cached-fx-rate-provider.ts`
- **Repository**: `src/modules/fx-rates/repository/`
- **Docs**: `docs/FX_DATA_FLOW_DIAGRAM.md`

---

## Version History

| Version | Date       | Changes                          |
| ------- | ---------- | -------------------------------- |
| 1.0     | 2025-12-18 | Initial design and documentation |

---

## Contributors

**Design**: SYSTEM ARCHITECT (Claude Code)
**Documentation**: DOCUMENTATION ENGINEER (Claude Code)
**Schema**: LOCAL DATA ENGINEER (Claude Code)
**Math**: MODELER (Claude Code)

---

## Feedback & Improvements

For questions, issues, or suggested improvements to this documentation:

1. Check if answer exists in one of the 5 documents above
2. Review the "Common Questions & Answers" section
3. Consult the SYSTEM ARCHITECT role in `AGENTS.md`
4. Propose changes via pull request with clear rationale

---

## Quick Command Reference

```bash
# Generate migration (if schema changed)
npx drizzle-kit generate

# Run tests
npm test -- settlements

# Type check
npm run type-check

# Lint
npm run lint

# Start dev server
npm start
```

---

**Last Updated**: 2025-12-18
**Status**: Design Complete, Implementation Pending
**Next Step**: Implement `SettlementsRepository.ts` (see SETTLEMENTS_IMPLEMENTATION_GUIDE.md Phase 1)
