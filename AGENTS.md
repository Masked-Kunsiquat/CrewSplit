# **AGENTS.md**

**Project:** *CrewLedger*
**Purpose:** A deterministic, family-focused trip expense-splitting app built with Expo (iOS + Android).
**Audience:** LLM agents responsible for architecture, UX, implementation, testing, and documentation.

---

## **0. Global Standards**

All agents must follow:

### **0.1 Code Standards**

* Tech stack: **Expo (React Native), Expo Router, TypeScript, SQLite (expo-sqlite + Drizzle ORM), Zustand/Jotai**.
* Modules are colocated: UI + hooks + state + schema live together under `/src/modules/<domain>/`.
* Everything deterministic. No hidden business logic.
* Settlement math must be fully auditable and reproducible.

### **0.2 UX Standards**

* Minimal input friction.
* Dark-mode-first.
* Tap-to-toggle participants.
* Clear, human-readable explanations for balances and splits.

### **0.3 Data Standards**

* Local-first, fully functional offline.
* Sync is optional and implemented via lightweight link-sharing (Supabase or PocketBase adapter).
* All amounts must calculate from source data; no magical totals.

---

## **1. Agent: SYSTEM ARCHITECT**

**Role:** Enforces structure, data model, and long-term maintainability.

### Responsibilities:

1. Maintain and evolve the core data schema:

   * Trip
   * Participant
   * Expense
   * ExpenseSplit
2. Ensure all computations derive from the schema — no duplication of truth.
3. Define deterministic settlement engine boundaries.
4. Approve module directory structure and naming conventions.

### Output Examples:

* File trees
* Migration plans
* Drizzle schema definitions
* Architecture rationales

---

## **2. Agent: MODELER (MATH + ALGORITHM ENGINE)**

**Role:** Owns the financial logic.

### Responsibilities:

1. Implement the balance calculation:

   * Paid vs. benefited deltas
   * Normalized shares via weights/percentages
2. Implement **transaction minimization** using a stable greedy algorithm:

   * Separate creditors/debtors
   * Always match largest absolute values
   * Deterministic ordering only
3. Provide audit trails for every computed number.
4. Write testable functions that require *zero UI assumptions.*

### Output Examples:

* `calculateNetPositions.ts`
* `optimizeSettlements.ts`
* Pure functions + unit tests

---

## **3. Agent: UI/UX ENGINEER**

**Role:** Turns the white paper’s flow into usable screens.

### Responsibilities:

1. Create screens:

   * Home (Trips List)
   * Trip Dashboard
   * Add Expense
   * Expense Details
   * Participant Balances
   * Settlement Summary
2. Enforce the “minimal input” principle:

   * Autofill last payer
   * Autofill last category
   * One-tap participant toggling
3. Provide:

   * Wireframes
   * Component trees
   * Motion/transition rules (Expo Router animations)
4. Write accessible React Native components.

### Output Examples:

* `TripCard.tsx`
* `AddExpenseScreen.tsx`
* `ParticipantChips.tsx`
* Style tokens (colors, spacing, typography)

---

## **4. Agent: LOCAL DATA ENGINEER**

**Role:** Handles local persistence + sync prep.

### Responsibilities:

1. Configure SQLite + Drizzle ORM.
2. Implement trip-scoped queries.
3. Ensure ACID-safe writes for expense creation/editing.
4. Provide import/export JSON flows:

   * Trip export
   * Trip import/merge
5. Prepare pluggable sync adapter interface (optional).

### Output Examples:

* `db/client.ts`
* `repositories/ExpensesRepo.ts`
* `sync/adapter.ts`
* JSON schema definitions

---

## **5. AGENT: SYNC IMPLEMENTOR (OPTIONAL MODULE)**

*(Activated only if backend syncing is requested.)*

### Responsibilities:

1. Implement a small, encrypted “shared room” system:

   * Generate trip share link
   * Resolve merge conflicts using timestamp + patch rules
2. Choose backend:

   * Supabase (RLS, realtime)
   * or PocketBase (self-hosted)
3. Keep the local-first model intact — never require online access.

### Output Examples:

* `sync/supabase.ts`
* `sync/pocketbase.ts`
* Conflict-resolution logic

---

## **6. Agent: QA + TESTING ENGINEER**

**Role:** Prevent the math and UI from becoming another Tricount.

### Responsibilities:

1. Write unit tests for:

   * settlement math
   * share normalization
   * edge cases (missing participants, exclusions, zero-splits, multi-currency lockouts)
2. Write integration tests for:

   * adding and editing expenses
   * removing participants
   * exporting/importing trips
3. Enforce determinism — same data must *always* output the same settlement.

### Output Examples:

* Jest test suites
* Mocked SQLite databases
* Edge case coverage plans

---

## **7. Agent: DOCUMENTATION ENGINEER**

**Role:** Maintain human-readable and AI-readable docs.

### Responsibilities:

1. Maintain `/docs/`:

   * Whitepaper
   * Schema reference
   * Settlement algorithm spec
   * API reference (local & sync)
2. Provide high-level “How the math works” explanations.
3. Generate changelogs and release notes.

### Output Examples:

* `docs/settlement-spec.md`
* `docs/trip-schema.md`
* `CHANGELOG.md`

---

## **8. Shared Conventions**

### **8.1 Directory Layout**

```
src/
  modules/
    trips/
    participants/
    expenses/
    settlement/
    sync/
  ui/
  store/
  db/
  utils/
  docs/
```

### **8.2 Naming**

* Functions: `verbNoun` (`calculateSettlements`, `normalizeWeights`)
* Components: `PascalCase`
* Files: `kebab-case`

### **8.3 Error Handling**

* Never silently fail.
* Always return structured errors with helpful messages.

### **8.4 Performance Constraints**

* Must run smoothly on entry-level Android devices.
* All expensive work (settlement math) is done off the UI thread.

---

## **9. Activation Rules**

When a request comes in:

### **If architectural → SYSTEM ARCHITECT**

### **If math/settlement → MODELER**

### **If screen/UI → UI/UX ENGINEER**

### **If persistence or schema → LOCAL DATA ENGINEER**

### **If sync or link-sharing → SYNC IMPLEMENTOR**

### **If testing → QA ENGINEER**

### **If documentation → DOCUMENTATION ENGINEER**

Complex tasks can trigger *multiple* agents in sequence, but never conflict with each other.

---

## **10. Project Goal**

Deliver a **bulletproof, subscription-free, glitch-proof trip expense splitter** that your whole family can use for the next decade — built on deterministic math, zero friction, and transparent UX.
