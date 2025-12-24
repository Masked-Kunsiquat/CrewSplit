/**
 * STATISTICS ENGINE: calculateParticipantSpending Tests
 * MODELER: Pure math, no UI assumptions
 */

import type { Participant } from "@modules/participants";
import { calculateParticipantSpending } from "../calculate-participant-spending";

const createParticipant = (id: string, name: string): Participant => ({
  id,
  tripId: "trip-1",
  name,
  createdAt: "2024-01-01T00:00:00.000Z",
});

describe("calculateParticipantSpending", () => {
  it("calculates totals and percentages for multiple participants", () => {
    // Arrange
    const participants = [
      createParticipant("p1", "Alice"),
      createParticipant("p2", "Bob"),
    ];
    const expenses = [
      { paidBy: "p1", convertedAmountMinor: 1200 },
      { paidBy: "p2", convertedAmountMinor: 1800 },
      { paidBy: "p2", convertedAmountMinor: 500 },
    ];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].participantId).toBe("p2");
    expect(result[1].participantId).toBe("p1");

    const bob = result.find((entry) => entry.participantId === "p2");
    const alice = result.find((entry) => entry.participantId === "p1");
    expect(bob).toMatchObject({ totalPaid: 2300, participantName: "Bob" });
    expect(alice).toMatchObject({ totalPaid: 1200, participantName: "Alice" });
    expect(bob?.percentage).toBeCloseTo(65.714, 3);
    expect(alice?.percentage).toBeCloseTo(34.286, 3);
  });

  it("handles zero total cost with empty expenses", () => {
    // Arrange
    const participants = [
      createParticipant("p1", "Alice"),
      createParticipant("p2", "Bob"),
    ];
    const expenses: { paidBy: string; convertedAmountMinor: number }[] = [];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      participantId: "p1",
      participantName: "Alice",
      totalPaid: 0,
      percentage: 0,
    });
    expect(result[1]).toMatchObject({
      participantId: "p2",
      participantName: "Bob",
      totalPaid: 0,
      percentage: 0,
    });
  });

  it("handles zero total cost with zero-amount expenses", () => {
    // Arrange
    const participants = [createParticipant("p1", "Solo")];
    const expenses = [{ paidBy: "p1", convertedAmountMinor: 0 }];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    expect(result).toEqual([
      {
        participantId: "p1",
        participantName: "Solo",
        totalPaid: 0,
        percentage: 0,
      },
    ]);
  });

  it("returns 100% for a single participant paying all costs", () => {
    // Arrange
    const participants = [createParticipant("p1", "Solo")];
    const expenses = [{ paidBy: "p1", convertedAmountMinor: 5000 }];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    expect(result).toEqual([
      {
        participantId: "p1",
        participantName: "Solo",
        totalPaid: 5000,
        percentage: 100,
      },
    ]);
  });

  it('creates an "Unknown" entry for expenses paid by missing participants', () => {
    // Arrange
    const participants = [createParticipant("p1", "Alice")];
    const expenses = [{ paidBy: "p2", convertedAmountMinor: 700 }];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      participantId: "p2",
      participantName: "Unknown",
      totalPaid: 700,
      percentage: 100,
    });
    expect(result[1]).toMatchObject({
      participantId: "p1",
      participantName: "Alice",
      totalPaid: 0,
      percentage: 0,
    });
  });

  it("sorts deterministically by amount desc, name, then id", () => {
    // Arrange
    const participants = [
      createParticipant("p1", "Ben"),
      createParticipant("p2", "Anna"),
      createParticipant("p3", "Anna"),
      createParticipant("p4", "Zed"),
    ];
    const expenses = [
      { paidBy: "p4", convertedAmountMinor: 200 },
      { paidBy: "p2", convertedAmountMinor: 100 },
      { paidBy: "p3", convertedAmountMinor: 100 },
      { paidBy: "p1", convertedAmountMinor: 100 },
    ];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    expect(result.map((entry) => entry.participantId)).toEqual([
      "p4",
      "p2",
      "p3",
      "p1",
    ]);
  });

  it("keeps precise percentages for uneven splits", () => {
    // Arrange
    const participants = [
      createParticipant("p1", "Alex"),
      createParticipant("p2", "Blair"),
      createParticipant("p3", "Casey"),
    ];
    const expenses = [
      { paidBy: "p1", convertedAmountMinor: 1 },
      { paidBy: "p2", convertedAmountMinor: 1 },
      { paidBy: "p3", convertedAmountMinor: 1 },
    ];

    // Act
    const result = calculateParticipantSpending(expenses, participants);

    // Assert
    const alex = result.find((entry) => entry.participantId === "p1");
    const blair = result.find((entry) => entry.participantId === "p2");
    const casey = result.find((entry) => entry.participantId === "p3");
    expect(alex?.percentage).toBeCloseTo(33.333, 3);
    expect(blair?.percentage).toBeCloseTo(33.333, 3);
    expect(casey?.percentage).toBeCloseTo(33.333, 3);
  });
});
