/**
 * AUTOMERGE MODULE - Document Manager Service
 * SETTLEMENT INTEGRATION ENGINEER: Automerge document lifecycle management
 * SERVICE LAYER: Orchestration, uses dependency injection
 *
 * Manages the lifecycle of Automerge documents:
 * - Creating new documents
 * - Loading existing documents
 * - Applying mutations
 * - Saving documents
 *
 * This service coordinates between the pure engine functions and the storage repository.
 */

import * as Automerge from "@automerge/automerge";
import * as Storage from "../repository/automerge-storage";
import {
  updateTripMetadata,
  createParticipant,
  updateParticipant,
  createExpense,
  updateExpense,
  createSettlement,
  updateSettlement,
  validateTripDoc,
} from "../engine/doc-operations";
import { CURRENT_SCHEMA_VERSION } from "../engine/doc-schema";
import type { TripAutomergeDoc } from "../types";
import { createAppError } from "@utils/errors";

/**
 * Repository interface for dependency injection
 * Allows for easier testing by mocking the storage layer
 */
export interface IAutomergeStorage {
  saveDoc: typeof Storage.saveDoc;
  loadDoc: typeof Storage.loadDoc;
  deleteDoc: typeof Storage.deleteDoc;
  docExists: typeof Storage.docExists;
}

/**
 * Default storage implementation
 */
const defaultStorage: IAutomergeStorage = {
  saveDoc: Storage.saveDoc,
  loadDoc: Storage.loadDoc,
  deleteDoc: Storage.deleteDoc,
  docExists: Storage.docExists,
};

/**
 * AutomergeManager - Manages Automerge document lifecycle
 *
 * Provides high-level operations for working with trip Automerge documents.
 * Uses dependency injection for testability.
 */
export class AutomergeManager {
  private storage: IAutomergeStorage;

  constructor(storage: IAutomergeStorage = defaultStorage) {
    this.storage = storage;
  }

  /**
   * Creates a new trip Automerge document
   *
   * @param tripData - Initial trip metadata
   * @returns New Automerge document
   *
   * @example
   * const manager = new AutomergeManager();
   * const doc = await manager.createTrip({
   *   id: 'trip-123',
   *   name: 'Paris Trip',
   *   emoji: '🗼',
   *   currency: 'EUR',
   *   startDate: '2024-01-01',
   *   endDate: null,
   * });
   */
  async createTrip(tripData: {
    id: string;
    name: string;
    emoji: string;
    currency: string;
    startDate: string;
    endDate: string | null;
  }): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const now = new Date().toISOString();

    // Create and initialize document (Automerge 3.x pattern)
    // Note: Cannot use generics with init() - must use runtime typing
    const doc = Automerge.change(
      Automerge.init(),
      "Initialize trip",
      (d: any) => {
        d.id = tripData.id;
        d.name = tripData.name;
        d.emoji = tripData.emoji;
        d.currency = tripData.currency;
        d.startDate = tripData.startDate;
        d.endDate = tripData.endDate;
        d.createdAt = now;
        d.updatedAt = now;
        d.participants = {};
        d.expenses = {};
        d.settlements = {};
        d._metadata = {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          lastSyncedAt: null,
        };
      },
    ) as Automerge.Doc<TripAutomergeDoc>;

    // Save to filesystem
    await this.storage.saveDoc(tripData.id, doc);

    return doc;
  }

  /**
   * Loads an existing trip Automerge document
   *
   * @param tripId - Trip UUID
   * @returns Automerge document or null if not found
   *
   * @throws Error with code DOC_INVALID if document validation fails
   *
   * @example
   * const manager = new AutomergeManager();
   * const doc = await manager.loadTrip('trip-123');
   * if (doc) {
   *   console.log(doc.name);
   * }
   */
  async loadTrip(
    tripId: string,
  ): Promise<Automerge.Doc<TripAutomergeDoc> | null> {
    const result = await this.storage.loadDoc<TripAutomergeDoc>(tripId);

    if (!result.exists) {
      return null;
    }

    // Validate the loaded document
    try {
      validateTripDoc(result.doc);
    } catch (error) {
      throw createAppError(
        "DOC_INVALID",
        `Loaded document for trip ${tripId} failed validation`,
        {
          details: {
            tripId,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      );
    }

    return result.doc;
  }

  /**
   * Updates trip metadata
   *
   * @param tripId - Trip UUID
   * @param updates - Fields to update
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.updateTrip('trip-123', {
   *   name: 'Updated Trip Name',
   *   emoji: '🎉',
   * });
   */
  async updateTrip(
    tripId: string,
    updates: {
      name?: string;
      emoji?: string;
      currency?: string;
      startDate?: string;
      endDate?: string | null;
    },
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const newDoc = Automerge.change(doc, "Update trip metadata", (d) => {
      const updatedAt = new Date().toISOString();
      const fieldsToUpdate = updateTripMetadata(updates, updatedAt);
      Object.assign(d, fieldsToUpdate);
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Adds a participant to the trip
   *
   * @param tripId - Trip UUID
   * @param participant - Participant data
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.addParticipant('trip-123', {
   *   id: 'p1',
   *   name: 'Alice',
   *   color: '#FF5733',
   * });
   */
  async addParticipant(
    tripId: string,
    participant: {
      id: string;
      name: string;
      color: string;
    },
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const now = new Date().toISOString();

    const newDoc = Automerge.change(doc, "Add participant", (d) => {
      const participantData = createParticipant({
        ...participant,
        createdAt: now,
        updatedAt: now,
      });
      d.participants[participant.id] = participantData;
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Updates a participant
   *
   * @param tripId - Trip UUID
   * @param participantId - Participant UUID
   * @param updates - Fields to update
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip or participant doesn't exist
   *
   * @example
   * const doc = await manager.updateParticipant('trip-123', 'p1', {
   *   name: 'Alice Smith',
   * });
   */
  async updateParticipantData(
    tripId: string,
    participantId: string,
    updates: {
      name?: string;
      color?: string;
    },
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    if (!doc.participants[participantId]) {
      throw createAppError(
        "DOC_NOT_FOUND",
        `Participant ${participantId} not found in trip ${tripId}`,
        {
          details: { tripId, participantId },
        },
      );
    }

    const newDoc = Automerge.change(doc, "Update participant", (d) => {
      const updatedAt = new Date().toISOString();
      const fieldsToUpdate = updateParticipant(updates, updatedAt);
      Object.assign(d.participants[participantId], fieldsToUpdate);
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Removes a participant from the trip
   *
   * @param tripId - Trip UUID
   * @param participantId - Participant UUID
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.removeParticipant('trip-123', 'p1');
   */
  async removeParticipant(
    tripId: string,
    participantId: string,
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const newDoc = Automerge.change(doc, "Remove participant", (d) => {
      delete d.participants[participantId];
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Adds an expense to the trip
   *
   * @param tripId - Trip UUID
   * @param expense - Expense data including splits
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.addExpense('trip-123', {
   *   id: 'e1',
   *   description: 'Dinner',
   *   originalAmountMinor: 5000,
   *   originalCurrency: 'USD',
   *   convertedAmountMinor: 5000,
   *   fxRateToTrip: null,
   *   categoryId: null,
   *   paidById: 'p1',
   *   date: '2024-01-01',
   *   splits: {
   *     p1: { shareType: 'equal', shareValue: 1 },
   *     p2: { shareType: 'equal', shareValue: 1 },
   *   },
   * });
   */
  async addExpense(
    tripId: string,
    expense: {
      id: string;
      description: string;
      originalAmountMinor: number;
      originalCurrency: string;
      convertedAmountMinor: number;
      fxRateToTrip: number | null;
      categoryId: string | null;
      paidById: string;
      date: string;
      splits: {
        [participantId: string]: {
          shareType: "equal" | "percentage" | "exact_amount" | "shares";
          shareValue: number;
        };
      };
    },
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const now = new Date().toISOString();

    const newDoc = Automerge.change(doc, "Add expense", (d) => {
      const expenseData = createExpense({
        ...expense,
        createdAt: now,
        updatedAt: now,
      });
      d.expenses[expense.id] = expenseData;
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Updates an expense
   *
   * @param tripId - Trip UUID
   * @param expenseId - Expense UUID
   * @param updates - Fields to update
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip or expense doesn't exist
   *
   * @example
   * const doc = await manager.updateExpenseData('trip-123', 'e1', {
   *   description: 'Lunch',
   *   originalAmountMinor: 3000,
   * });
   */
  async updateExpenseData(
    tripId: string,
    expenseId: string,
    updates: Parameters<typeof updateExpense>[0],
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    if (!doc.expenses[expenseId]) {
      throw createAppError(
        "DOC_NOT_FOUND",
        `Expense ${expenseId} not found in trip ${tripId}`,
        {
          details: { tripId, expenseId },
        },
      );
    }

    const newDoc = Automerge.change(doc, "Update expense", (d) => {
      const updatedAt = new Date().toISOString();
      const fieldsToUpdate = updateExpense(updates, updatedAt);
      Object.assign(d.expenses[expenseId], fieldsToUpdate);
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Removes an expense from the trip
   *
   * @param tripId - Trip UUID
   * @param expenseId - Expense UUID
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.removeExpense('trip-123', 'e1');
   */
  async removeExpense(
    tripId: string,
    expenseId: string,
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const newDoc = Automerge.change(doc, "Remove expense", (d) => {
      delete d.expenses[expenseId];
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Adds a settlement to the trip
   *
   * @param tripId - Trip UUID
   * @param settlement - Settlement data
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.addSettlement('trip-123', {
   *   id: 's1',
   *   fromParticipantId: 'p2',
   *   toParticipantId: 'p1',
   *   originalAmountMinor: 2500,
   *   originalCurrency: 'USD',
   *   convertedAmountMinor: 2500,
   *   fxRateToTrip: null,
   *   date: '2024-01-01',
   *   description: 'Payment',
   *   paymentMethod: 'venmo',
   *   expenseSplitId: null,
   * });
   */
  async addSettlement(
    tripId: string,
    settlement: {
      id: string;
      fromParticipantId: string;
      toParticipantId: string;
      originalAmountMinor: number;
      originalCurrency: string;
      convertedAmountMinor: number;
      fxRateToTrip: number | null;
      date: string;
      description: string | null;
      paymentMethod: string | null;
      expenseSplitId: string | null;
    },
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const now = new Date().toISOString();

    const newDoc = Automerge.change(doc, "Add settlement", (d) => {
      const settlementData = createSettlement({
        ...settlement,
        createdAt: now,
        updatedAt: now,
      });
      d.settlements[settlement.id] = settlementData;
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Updates a settlement
   *
   * @param tripId - Trip UUID
   * @param settlementId - Settlement UUID
   * @param updates - Fields to update
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip or settlement doesn't exist
   *
   * @example
   * const doc = await manager.updateSettlementData('trip-123', 's1', {
   *   description: 'Updated payment',
   *   originalAmountMinor: 3000,
   * });
   */
  async updateSettlementData(
    tripId: string,
    settlementId: string,
    updates: {
      originalAmountMinor?: number;
      originalCurrency?: string;
      convertedAmountMinor?: number;
      fxRateToTrip?: number | null;
      date?: string;
      description?: string | null;
      paymentMethod?: string | null;
    },
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    if (!doc.settlements[settlementId]) {
      throw createAppError(
        "DOC_NOT_FOUND",
        `Settlement ${settlementId} not found in trip ${tripId}`,
        {
          details: { tripId, settlementId },
        },
      );
    }

    const newDoc = Automerge.change(doc, "Update settlement", (d) => {
      const updatedAt = new Date().toISOString();
      const fieldsToUpdate = updateSettlement(updates, updatedAt);
      Object.assign(d.settlements[settlementId], fieldsToUpdate);
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Removes a settlement from the trip
   *
   * @param tripId - Trip UUID
   * @param settlementId - Settlement UUID
   * @returns Updated Automerge document
   *
   * @throws Error with code DOC_NOT_FOUND if trip doesn't exist
   *
   * @example
   * const doc = await manager.removeSettlement('trip-123', 's1');
   */
  async removeSettlement(
    tripId: string,
    settlementId: string,
  ): Promise<Automerge.Doc<TripAutomergeDoc>> {
    const doc = await this.loadTrip(tripId);

    if (!doc) {
      throw createAppError("DOC_NOT_FOUND", `Trip ${tripId} not found`, {
        details: { tripId },
      });
    }

    const newDoc = Automerge.change(doc, "Remove settlement", (d) => {
      delete d.settlements[settlementId];
    });

    await this.storage.saveDoc(tripId, newDoc);

    return newDoc;
  }

  /**
   * Deletes a trip Automerge document
   *
   * @param tripId - Trip UUID
   *
   * @example
   * await manager.deleteTrip('trip-123');
   */
  async deleteTrip(tripId: string): Promise<void> {
    await this.storage.deleteDoc(tripId);
  }

  /**
   * Checks if a trip document exists
   *
   * @param tripId - Trip UUID
   * @returns true if document exists
   *
   * @example
   * const exists = await manager.tripExists('trip-123');
   */
  async tripExists(tripId: string): Promise<boolean> {
    return await this.storage.docExists(tripId);
  }
}
