/**
 * STATISTICS REPOSITORY TESTS
 * LOCAL DATA ENGINEER: SQL construction and error handling
 */

import {
  mockDb,
  createExpenseRow,
  createTripRow,
  mockExpenseCategoriesTable,
  mockExpensesTable,
  mockTripsTable,
  drizzleOrmMock as mockDrizzleOrm,
} from "../../test-utils/mock-db";
import { StatisticsRepository } from "../index";

jest.mock("@db/client", () => ({
  db: mockDb,
}));

jest.mock("@db/schema/expenses", () => ({
  expenses: mockExpensesTable,
}));

jest.mock("@db/schema/expense-categories", () => ({
  expenseCategories: mockExpenseCategoriesTable,
}));

jest.mock("@db/schema/trips", () => ({
  trips: mockTripsTable,
}));

jest.mock("drizzle-orm", () => mockDrizzleOrm);

jest.mock("@utils/logger", () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { expenseLogger: logger };
});

describe("StatisticsRepository", () => {
  beforeEach(() => {
    mockDb.reset();
  });

  describe("getExpensesWithCategories", () => {
    it("returns expenses with joined category metadata", async () => {
      // Arrange
      mockDb.reset({
        expenses: [
          createExpenseRow({
            id: "e-1",
            tripId: "trip-1",
            categoryId: "cat-1",
            convertedAmountMinor: 1200,
          }),
          createExpenseRow({
            id: "e-2",
            tripId: "trip-1",
            categoryId: null,
            convertedAmountMinor: 800,
          }),
        ],
        categories: [{ id: "cat-1", name: "Meals", emoji: "M" }],
      });

      // Act
      const result =
        await StatisticsRepository.getExpensesWithCategories("trip-1");

      // Assert
      expect(result).toHaveLength(2);
      const withCategory = result.find((row) => row.id === "e-1");
      const withoutCategory = result.find((row) => row.id === "e-2");
      expect(withCategory).toMatchObject({
        categoryId: "cat-1",
        categoryName: "Meals",
        categoryEmoji: "M",
        convertedAmountMinor: 1200,
      });
      expect(withoutCategory).toMatchObject({
        categoryId: null,
        categoryName: null,
        categoryEmoji: null,
        convertedAmountMinor: 800,
      });
    });

    it("returns expenses without categories when categoryId is null", async () => {
      // Arrange
      mockDb.reset({
        expenses: [
          createExpenseRow({
            id: "e-1",
            tripId: "trip-1",
            categoryId: null,
          }),
        ],
      });

      // Act
      const result =
        await StatisticsRepository.getExpensesWithCategories("trip-1");

      // Assert
      expect(result).toEqual([
        expect.objectContaining({
          id: "e-1",
          categoryId: null,
          categoryName: null,
          categoryEmoji: null,
        }),
      ]);
    });

    it("returns empty results when a trip has no expenses", async () => {
      // Arrange
      mockDb.reset({
        expenses: [createExpenseRow({ id: "e-1", tripId: "trip-2" })],
      });

      // Act
      const result =
        await StatisticsRepository.getExpensesWithCategories("trip-1");

      // Assert
      expect(result).toEqual([]);
    });

    it("builds the correct WHERE clause for tripId", async () => {
      // Arrange
      mockDb.reset({
        expenses: [createExpenseRow({ id: "e-1", tripId: "trip-1" })],
      });

      // Act
      await StatisticsRepository.getExpensesWithCategories("trip-1");

      // Assert
      expect(mockDb.lastQuery?.where).toEqual({
        type: "eq",
        left: mockExpensesTable.tripId,
        right: "trip-1",
      });
    });

    it("selects expected fields for expenses and categories", async () => {
      // Arrange
      mockDb.reset();

      // Act
      await StatisticsRepository.getExpensesWithCategories("trip-1");

      // Assert
      const selection = mockDb.lastQuery?.selection;
      expect(selection?.convertedAmountMinor).toBe(
        mockExpensesTable.convertedAmountMinor,
      );
      expect(selection?.categoryId).toBe(mockExpensesTable.categoryId);
      expect(selection?.categoryName).toBe(mockExpenseCategoriesTable.name);
      expect(selection?.categoryEmoji).toBe(mockExpenseCategoriesTable.emoji);
    });
  });

  describe("getTripCurrency", () => {
    it("returns the trip currency code", async () => {
      // Arrange
      mockDb.reset({
        trips: [createTripRow({ id: "trip-1", currencyCode: "EUR" })],
      });

      // Act
      const result = await StatisticsRepository.getTripCurrency("trip-1");

      // Assert
      expect(result).toBe("EUR");
    });

    it("throws a TRIP_NOT_FOUND error when no trip matches", async () => {
      // Arrange
      mockDb.reset();

      // Act
      const promise = StatisticsRepository.getTripCurrency("trip-missing");

      // Assert
      await expect(promise).rejects.toMatchObject({
        code: "TRIP_NOT_FOUND",
      });
      await expect(promise).rejects.toThrow("trip-missing");
    });
  });
});
