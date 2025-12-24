/**
 * STATISTICS MODULE - Type Definitions
 */

export interface ParticipantSpending {
  participantId: string;
  participantName: string;
  totalPaid: number; // In trip currency minor units
  percentage: number;
}

export interface CategorySpending {
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  totalAmount: number; // In trip currency minor units
  expenseCount: number;
  percentage: number;
}

export interface TripStatistics {
  totalCost: number; // In trip currency minor units
  currency: string;
  participantSpending: ParticipantSpending[];
  categorySpending: CategorySpending[];
  timestamp: string;
}
