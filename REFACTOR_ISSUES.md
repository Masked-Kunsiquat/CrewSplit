# Post-MVP Hardening: GitHub Issues Created

All issues have been created and are ready to track the refactoring work.

## Quick Reference

### Milestone 1: Quick Wins (1-2 days)
- [#65](https://github.com/Masked-Kunsiquat/CrewSplit/issues/65) - Create mutation hooks to replace direct repository calls ⭐ **START HERE**
- [#66](https://github.com/Masked-Kunsiquat/CrewSplit/issues/66) - Extract currency conversion logic from repository to engine
- [#67](https://github.com/Masked-Kunsiquat/CrewSplit/issues/67) - Centralize FX conversion utility and eliminate duplication
- [#68](https://github.com/Masked-Kunsiquat/CrewSplit/issues/68) - Add named constants for epsilon values

### Milestone 2: Service Layer & Architecture (3-4 days)
- [#69](https://github.com/Masked-Kunsiquat/CrewSplit/issues/69) - Create ExpenseService
- [#70](https://github.com/Masked-Kunsiquat/CrewSplit/issues/70) - Create TripService
- [#71](https://github.com/Masked-Kunsiquat/CrewSplit/issues/71) - Centralize error handling with factories
- [#72](https://github.com/Masked-Kunsiquat/CrewSplit/issues/72) - Replace singleton FxRateProvider with React Context

### Milestone 3: Centralization & Standards (2-3 days)
- [#73](https://github.com/Masked-Kunsiquat/CrewSplit/issues/73) - Create centralized validation utilities
- [#74](https://github.com/Masked-Kunsiquat/CrewSplit/issues/74) - Create centralized formatting utilities
- [#75](https://github.com/Masked-Kunsiquat/CrewSplit/issues/75) - Add JSDoc contracts to public APIs

### Milestone 4: Architecture Enforcement (2-3 days)
- [#76](https://github.com/Masked-Kunsiquat/CrewSplit/issues/76) - Restrict module exports to public APIs only
- [#77](https://github.com/Masked-Kunsiquat/CrewSplit/issues/77) - Add ESLint rules to enforce architecture boundaries
- [#78](https://github.com/Masked-Kunsiquat/CrewSplit/issues/78) - Add architecture tests with dependency-cruiser
- [#79](https://github.com/Masked-Kunsiquat/CrewSplit/issues/79) - Create ARCHITECTURE.md documentation ⭐ **HIGH VALUE**

### Milestone 5: Optional Enhancements
- [#80](https://github.com/Masked-Kunsiquat/CrewSplit/issues/80) - Add runtime invariant checks
- [#81](https://github.com/Masked-Kunsiquat/CrewSplit/issues/81) - Add floating-point documentation
- [#82](https://github.com/Masked-Kunsiquat/CrewSplit/issues/82) - Create contribution guide

---

## Execution Strategy

### Week 1: Foundation (Issues #65-72)
Focus on boundary violations and service layer establishment. These create the biggest immediate improvement in architecture quality.

**Day 1-2: Quick Wins**
1. Start with #65 (mutation hooks) - Fixes 8 boundary violations
2. Complete #66 (extract conversion logic) - Makes testable
3. Complete #67 (centralize FX utility) - Prevents drift
4. Complete #68 (epsilon constants) - Quick clarity win

**Day 3-5: Service Layer**
5. Complete #69 (ExpenseService) - Biggest architectural improvement
6. Complete #70 (TripService) - Consistent pattern
7. Complete #71 (error factories) - Eliminates 20+ duplications
8. Complete #72 (Context over singleton) - Better testability

### Week 2: Standards (Issues #73-75)
Eliminate remaining duplication and establish coding standards.

**Day 6-8: Centralization**
9. Complete #73 (validation utilities)
10. Complete #74 (formatting utilities)
11. Complete #75 (JSDoc contracts)

### Week 3: Enforcement (Issues #76-79)
Lock in architecture improvements with automation.

**Day 9-11: Architecture Enforcement**
12. Complete #76 (restrict exports)
13. Complete #77 (ESLint rules)
14. Complete #78 (dependency tests)
15. Complete #79 (ARCHITECTURE.md) ⭐

### Optional: Enhancements (Issues #80-82)
Complete as time permits.

---

## Success Metrics

Track progress against these targets:

| Metric | Current | Target | Issues |
|--------|---------|--------|--------|
| Screen → Repository violations | 8 | 0 | #65 |
| Business logic in repositories | 3 modules | 0 | #66, #69, #70 |
| FX conversion duplication | 6+ locations | 1 utility | #67 |
| Error handling duplication | 20+ manual | Centralized | #71 |
| Validation duplication | 3 implementations | 1 utility | #73 |
| Module exports expose internals | All modules | 0 | #76 |
| Architecture violations (linting) | N/A | 0 (enforced) | #77, #78 |
| Architecture documentation | None | Complete | #79 |

---

## How to Use This

1. **Start with Milestone 1** (Issues #65-68) - These are quick wins with high leverage
2. **Work sequentially within milestones** - Issues build on each other
3. **Mark issues complete** - Close when all tasks checked off and PR merged
4. **Update metrics** - Track progress against success metrics above
5. **Reference [REFACTOR_ROADMAP.md](./REFACTOR_ROADMAP.md)** - Contains full implementation details

---

## Labels to Add (Optional)

You can organize issues better by creating these labels in GitHub:

- `refactor` - Code quality improvement
- `architecture` - Architectural change
- `quick-win` - High leverage, low effort
- `service-layer` - Service pattern work
- `duplication` - Eliminates repeated code
- `documentation` - Docs and comments
- `tooling` - Build/test infrastructure
- `testing` - Test coverage
- `validation` - Input validation work
- `error-handling` - Error management

**To create labels:**
```bash
gh label create refactor --color "0E8A16" --description "Code quality improvement"
gh label create architecture --color "1D76DB" --description "Architectural change"
gh label create quick-win --color "FBCA04" --description "High leverage, low effort"
# ... etc
```

Then apply to issues:
```bash
gh issue edit 65 --add-label "refactor,architecture,quick-win"
gh issue edit 66 --add-label "refactor,architecture,quick-win,testing"
# ... etc
```

---

## Notes

- All issues link back to [REFACTOR_ROADMAP.md](./REFACTOR_ROADMAP.md) for implementation details
- Each issue is scoped to be completable in a single PR
- Issues are ordered for maximum benefit and minimal rework
- Milestones reflect estimated effort, not calendar time
- Issues #65-72 (first 8) provide ~80% of the value
