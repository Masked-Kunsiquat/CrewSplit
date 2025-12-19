/**
 * SETTLEMENT INTEGRATION ENGINEER: Sample Data Service
 *
 * Service for loading sample trip data from JSON templates
 * Handles import of trips, participants, expenses, splits, and settlements
 */

import { db } from "@/db/client";
import {
  trips,
  participants,
  expenses,
  expenseSplits,
  settlements,
} from "@/db/schema";
import type { SampleDataTemplateId } from "../types";
import { OnboardingError, OnboardingErrorCode } from "../types";

// Import sample trip JSON
import summerRoadTripData from "../../../../scripts/crewledger-summer-road-trip-2025-12-18.json";

/**
 * Service for loading sample trip data
 *
 * Responsibilities:
 * - Load trip data from JSON templates
 * - Insert all related entities (participants, expenses, splits, settlements)
 * - Mark trips as sample data (is_sample_data = true)
 * - Handle transactions for data integrity
 */
export class SampleDataService {
  /**
   * Load sample trip from template ID
   * Inserts trip and all related data in a single transaction
   *
   * @param templateId - Sample data template identifier
   * @returns Created trip ID for navigation
   * @throws OnboardingError if template not found or import fails
   *
   * @example
   * const tripId = await sampleDataService.loadSampleTrip('summer_road_trip');
   * router.push(`/trips/${tripId}`);
   */
  async loadSampleTrip(templateId: SampleDataTemplateId): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new OnboardingError(
        `Sample data template not found: ${templateId}`,
        OnboardingErrorCode.TEMPLATE_NOT_FOUND,
        { templateId },
      );
    }

    try {
      return await db.transaction(async (tx) => {
        // Clean any existing copy of this sample trip to avoid UNIQUE conflicts
        await tx.delete(trips).where(eq(trips.id, template.trip.id));

        // 1. Create trip
        const tripId = template.trip.id; // Use original ID for consistency
        await tx.insert(trips).values({
          id: tripId,
          name: template.trip.name,
          description: template.trip.description,
          emoji: template.trip.emoji,
          currency: template.trip.currency || template.trip.currencyCode,
          currencyCode: template.trip.currencyCode,
          startDate: template.trip.startDate,
          endDate: template.trip.endDate,
          isSampleData: true,
          sampleDataTemplateId: templateId,
          isArchived: false,
          createdAt: template.trip.createdAt,
          updatedAt: template.trip.updatedAt,
        });

        // 2. Create participants (preserve original IDs)
        const participantIdMap = new Map<string, string>();
        for (const participant of template.participants) {
          participantIdMap.set(participant.id, participant.id);
          await tx.insert(participants).values({
            id: participant.id,
            tripId,
            name: participant.name,
            avatarColor: participant.avatarColor,
            createdAt: participant.createdAt,
            updatedAt: participant.updatedAt,
          });
        }

        // 3. Create expenses and splits (preserve original IDs)
        for (const expense of template.expenses) {
          await tx.insert(expenses).values({
            id: expense.id,
            tripId,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            originalCurrency: expense.originalCurrency,
            originalAmountMinor: expense.originalAmountMinor,
            convertedAmountMinor: expense.convertedAmountMinor,
            fxRateToTrip: expense.fxRateToTrip,
            paidBy: expense.paidBy,
            categoryId: expense.categoryId,
            category: expense.category,
            date: expense.date,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
          });

          // Get splits for this expense
          const expenseSplitsForExpense = template.expenseSplits.filter(
            (split) => split.expenseId === expense.id,
          );

          for (const split of expenseSplitsForExpense) {
            await tx.insert(expenseSplits).values({
              id: split.id,
              expenseId: expense.id,
              participantId: split.participantId,
              share: split.share,
              shareType: split.shareType as
                | "equal"
                | "percentage"
                | "weight"
                | "amount",
              amount: split.amount,
              createdAt: split.createdAt,
              updatedAt: split.updatedAt,
            });
          }
        }

        // 4. Create settlements (if present in template)
        if (template.settlements && template.settlements.length > 0) {
          for (const settlement of template.settlements) {
            await tx.insert(settlements).values({
              id: settlement.id,
              tripId,
              fromParticipantId: settlement.fromParticipantId,
              toParticipantId: settlement.toParticipantId,
              originalCurrency: settlement.currency,
              originalAmountMinor: settlement.amountMinor,
              fxRateToTrip: null, // Same currency as trip
              convertedAmountMinor: settlement.amountMinor,
              date: settlement.createdAt, // Use createdAt as settlement date
              description: settlement.description || null,
              paymentMethod: null,
              createdAt: settlement.createdAt,
              updatedAt: settlement.updatedAt,
            });
          }
        }

        return tripId;
      });
    } catch (error) {
      console.error(`Failed to load sample trip: ${templateId}`, error);
      throw new OnboardingError(
        `Failed to import sample data: ${templateId}`,
        OnboardingErrorCode.SAMPLE_DATA_LOAD_FAILED,
        { templateId, error },
      );
    }
  }

  /**
   * Get sample data template by ID
   * Reads from imported JSON files
   *
   * @param templateId - Template identifier
   * @returns Template data or null if not found
   */
  private getTemplate(
    templateId: SampleDataTemplateId,
  ): typeof summerRoadTripData | null {
    const templates: Record<
      SampleDataTemplateId,
      typeof summerRoadTripData | null
    > = {
      summer_road_trip: summerRoadTripData,
      beach_weekend: null, // TODO: Add more templates
      ski_trip: null, // TODO: Add more templates
    };

    return templates[templateId];
  }

  /**
   * Get list of available template IDs
   * Useful for UI to show available sample data options
   *
   * @returns Array of available template IDs
   */
  getAvailableTemplates(): SampleDataTemplateId[] {
    return ["summer_road_trip"]; // Expand as more templates added
  }

  /**
   * Check if a template exists
   *
   * @param templateId - Template identifier
   * @returns true if template exists
   */
  hasTemplate(templateId: SampleDataTemplateId): boolean {
    return this.getTemplate(templateId) !== null;
  }
}

/**
 * Export singleton instance
 * Use this instance throughout the app for consistency
 */
export const sampleDataService = new SampleDataService();
