import { createTripExportV1 } from "../create-trip-export";
import { stableStringify } from "../stable-json";

describe("trip export", () => {
  it("stableStringify sorts object keys recursively", () => {
    const json = stableStringify({ b: 1, a: { d: 2, c: 3 } }, 0);
    expect(json).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("createTripExportV1 sorts arrays deterministically", () => {
    const meta = {
      format: "crewledger.trip-export" as const,
      version: 1 as const,
      exportedAt: "2025-01-01T00:00:00.000Z",
    };

    const trip = {
      id: "t1",
      name: "Test Trip",
      description: null,
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: null,
      currency: "USD",
      currencyCode: "USD",
      emoji: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    } as const;

    const participants = [
      {
        id: "p2",
        tripId: "t1",
        name: "B",
        avatarColor: null,
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
      {
        id: "p1",
        tripId: "t1",
        name: "A",
        avatarColor: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ];

    const expenses = [
      {
        id: "e2",
        tripId: "t1",
        description: "Later",
        amount: 200,
        currency: "USD",
        originalCurrency: "USD",
        originalAmountMinor: 200,
        fxRateToTrip: null,
        convertedAmountMinor: 200,
        paidBy: "p1",
        categoryId: "cat-other",
        category: null,
        date: "2025-01-03T00:00:00.000Z",
        createdAt: "2025-01-03T00:00:00.000Z",
        updatedAt: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "e1",
        tripId: "t1",
        description: "Earlier",
        amount: 100,
        currency: "USD",
        originalCurrency: "USD",
        originalAmountMinor: 100,
        fxRateToTrip: null,
        convertedAmountMinor: 100,
        paidBy: "p2",
        categoryId: "cat-other",
        category: null,
        date: "2025-01-02T00:00:00.000Z",
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ];

    const expenseSplits = [
      {
        id: "s2",
        expenseId: "e1",
        participantId: "p2",
        share: 1,
        shareType: "weight",
        amount: null,
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
      {
        id: "s1",
        expenseId: "e1",
        participantId: "p1",
        share: 1,
        shareType: "weight",
        amount: null,
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ];

    const categories = [
      {
        id: "cat-b",
        name: "B",
        emoji: "🅱️",
        tripId: "t1",
        isSystem: false,
        sortOrder: 2,
        isArchived: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "cat-a",
        name: "A",
        emoji: "🅰️",
        tripId: "t1",
        isSystem: false,
        sortOrder: 1,
        isArchived: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ];

    const result = createTripExportV1({
      meta,
      trip: trip as any,
      participants: participants as any,
      expenses: expenses as any,
      expenseSplits: expenseSplits as any,
      categories: categories as any,
    });

    expect(result.participants?.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(result.expenses?.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(result.expenseSplits?.map((s) => s.participantId)).toEqual([
      "p1",
      "p2",
    ]);
    expect(result.categories?.map((c) => c.id)).toEqual(["cat-a", "cat-b"]);
  });
});
