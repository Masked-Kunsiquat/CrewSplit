/**
 * STATISTICS ENGINE: Calculate participant spending totals and percentages
 * MODELER: Pure math, no UI assumptions
 */

import type { Participant } from "@modules/participants";
import type { ParticipantSpending } from "../types";

interface ExpenseForParticipantSpending {
  paidBy: string;
  convertedAmountMinor: number;
}

interface ParticipantAccumulator {
  participantId: string;
  participantName: string;
  totalPaid: number;
}

export const calculateParticipantSpending = (
  expenses: ExpenseForParticipantSpending[],
  participants: Participant[],
): ParticipantSpending[] => {
  const spendingByParticipant = new Map<string, ParticipantAccumulator>();

  for (const participant of participants) {
    spendingByParticipant.set(participant.id, {
      participantId: participant.id,
      participantName: participant.name,
      totalPaid: 0,
    });
  }

  const totalCost = expenses.reduce((total, expense) => {
    const amount = expense.convertedAmountMinor;
    const existing = spendingByParticipant.get(expense.paidBy);
    if (existing) {
      existing.totalPaid += amount;
    } else {
      spendingByParticipant.set(expense.paidBy, {
        participantId: expense.paidBy,
        participantName: "Unknown",
        totalPaid: amount,
      });
    }
    return total + amount;
  }, 0);

  const totals = Array.from(spendingByParticipant.values()).map((entry) => ({
    participantId: entry.participantId,
    participantName: entry.participantName,
    totalPaid: entry.totalPaid,
    percentage: totalCost > 0 ? (entry.totalPaid / totalCost) * 100 : 0,
  }));

  totals.sort((a, b) => {
    if (b.totalPaid !== a.totalPaid) return b.totalPaid - a.totalPaid;
    if (a.participantName !== b.participantName) {
      return a.participantName.localeCompare(b.participantName);
    }
    return a.participantId.localeCompare(b.participantId);
  });

  return totals;
};
