/**
 * EXPENSE SERVICE TESTS
 * QA + TESTING ENGINEER: Service orchestration and error handling
 *
 * Tests the ExpenseService layer with mocked dependencies.
 * Verifies:
 * - Dependency injection
 * - Trip currency lookup
 * - Currency conversion via computeConversion
 * - Category validation
 * - Notes normalization
 * - Split amount normalization with FX rates
 * - Error propagation with proper codes
 */

// Mock the computeConversion engine function BEFORE imports
import {
  createExpense,
  updateExpense,
  deleteExpense,
  type IExpenseRepository,
  type ITripRepository,
  type ICategoryRepository,
} from "../ExpenseService";
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../../types";

const mockComputeConversion = jest.fn();
jest.mock("../../engine", () => ({
  computeConversion: (...args: unknown[]) => mockComputeConversion(...args),
}));

// Mock the logger BEFORE imports
let mockExpenseLogger: {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};

jest.mock("@utils/logger", () => {
  mockExpenseLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { expenseLogger: mockExpenseLogger };
});

// Mock Crypto.randomUUID BEFORE imports
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-expense-id"),
}));

/**
 * Factory function for creating mock expense repository
 */
const createMockExpenseRepository = (
  overrides: Partial<IExpenseRepository> = {},
): IExpenseRepository => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getById: jest.fn(),
  ...overrides,
});

/**
 * Factory function for creating mock trip repository
 */
const createMockTripRepository = (
  overrides: Partial<ITripRepository> = {},
): ITripRepository => ({
  getById: jest.fn(),
  ...overrides,
});

/**
 * Factory function for creating mock category repository
 */
const createMockCategoryRepository = (
  overrides: Partial<ICategoryRepository> = {},
): ICategoryRepository => ({
  exists: jest.fn(),
  ...overrides,
});

/**
 * Factory function for creating test expense data
 */
const createTestExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: overrides.id ?? "expense-1",
  tripId: overrides.tripId ?? "trip-1",
  description: overrides.description ?? "Test Expense",
  notes: overrides.notes ?? null,
  amount: overrides.amount ?? 10000,
  currency: overrides.currency ?? "USD",
  originalCurrency: overrides.originalCurrency ?? "USD",
  originalAmountMinor: overrides.originalAmountMinor ?? 10000,
  fxRateToTrip: overrides.fxRateToTrip ?? null,
  convertedAmountMinor: overrides.convertedAmountMinor ?? 10000,
  paidBy: overrides.paidBy ?? "participant-1",
  categoryId: overrides.categoryId ?? "cat-food",
  date: overrides.date ?? "2024-01-01T00:00:00.000Z",
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
});

describe("ExpenseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createExpense", () => {
    describe("dependency injection", () => {
      it("should throw error if expenseRepository is missing", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        // Act & Assert
        await expect(
          createExpense(input, {
            tripRepository: createMockTripRepository(),
            categoryRepository: createMockCategoryRepository(),
          }),
        ).rejects.toThrow("expenseRepository dependency is required");
      });

      it("should throw error if tripRepository is missing", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        // Act & Assert
        await expect(
          createExpense(input, {
            expenseRepository: createMockExpenseRepository(),
            categoryRepository: createMockCategoryRepository(),
          }),
        ).rejects.toThrow("tripRepository dependency is required");
      });

      it("should throw error if categoryRepository is missing", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        // Act & Assert
        await expect(
          createExpense(input, {
            expenseRepository: createMockExpenseRepository(),
            tripRepository: createMockTripRepository(),
          }),
        ).rejects.toThrow("categoryRepository dependency is required");
      });
    });

    describe("happy path", () => {
      it("should create expense with same currency (no conversion)", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          notes: "Great meal",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          categoryId: "cat-food",
          date: "2024-01-15T12:00:00.000Z",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
            { participantId: "participant-2", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockCreatedExpense = createTestExpense({ id: "test-expense-id" });

        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(mockCreatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        const result = await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockTripRepo.getById).toHaveBeenCalledWith("trip-1");
        expect(mockCategoryRepo.exists).toHaveBeenCalledWith("cat-food");
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          tripCurrencyCode: "USD",
          providedRate: undefined,
          providedConverted: undefined,
        });
        expect(mockExpenseRepo.create).toHaveBeenCalledWith({
          id: "test-expense-id",
          tripId: "trip-1",
          description: "Dinner",
          notes: "Great meal",
          amount: 10000,
          currency: "USD",
          originalCurrency: "USD",
          originalAmountMinor: 10000,
          fxRateToTrip: null,
          convertedAmountMinor: 10000,
          paidBy: "participant-1",
          categoryId: "cat-food",
          date: "2024-01-15T12:00:00.000Z",
          splits: [
            {
              participantId: "participant-1",
              share: 1,
              shareType: "equal",
              amount: null,
            },
            {
              participantId: "participant-2",
              share: 1,
              shareType: "equal",
              amount: null,
            },
          ],
        });
        expect(result).toBe(mockCreatedExpense);
      });

      it("should create expense with currency conversion", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Hotel",
          originalAmountMinor: 10000, // 100 EUR
          originalCurrency: "EUR",
          fxRateToTrip: 1.1, // EUR to USD
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockCreatedExpense = createTestExpense({
          id: "test-expense-id",
          convertedAmountMinor: 11000,
          fxRateToTrip: 1.1,
        });

        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(mockCreatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 11000,
          fxRateToTrip: 1.1,
        });

        // Act
        const result = await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          tripCurrencyCode: "USD",
          providedRate: 1.1,
          providedConverted: undefined,
        });
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalAmountMinor: 10000,
            originalCurrency: "EUR",
            convertedAmountMinor: 11000,
            fxRateToTrip: 1.1,
            currency: "USD",
          }),
        );
        expect(result).toBe(mockCreatedExpense);
      });

      it("should default to cat-other if no categoryId provided", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Misc",
          originalAmountMinor: 5000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockCreatedExpense = createTestExpense({
          categoryId: "cat-other",
        });

        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(mockCreatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 5000,
          fxRateToTrip: null,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockCategoryRepo.exists).toHaveBeenCalledWith("cat-other");
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            categoryId: "cat-other",
          }),
        );
      });
    });

    describe("notes normalization", () => {
      it("should trim whitespace from notes", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          notes: "  Great meal  ",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: "Great meal",
          }),
        );
      });

      it("should convert empty string notes to null", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          notes: "   ",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: null,
          }),
        );
      });

      it("should convert null notes to null", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          notes: null,
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: null,
          }),
        );
      });
    });

    describe("split amount normalization", () => {
      it("should preserve split amounts when no FX conversion", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            {
              participantId: "participant-1",
              share: 0.6,
              shareType: "percentage",
              amount: 6000,
            },
            {
              participantId: "participant-2",
              share: 0.4,
              shareType: "percentage",
              amount: 4000,
            },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            splits: [
              {
                participantId: "participant-1",
                share: 0.6,
                shareType: "percentage",
                amount: 6000,
              },
              {
                participantId: "participant-2",
                share: 0.4,
                shareType: "percentage",
                amount: 4000,
              },
            ],
          }),
        );
      });

      it("should convert split amounts with FX rate", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Hotel",
          originalAmountMinor: 10000, // 100 EUR
          originalCurrency: "EUR",
          fxRateToTrip: 1.2, // EUR to USD
          paidBy: "participant-1",
          splits: [
            {
              participantId: "participant-1",
              share: 0,
              shareType: "amount",
              amount: 5000, // 50 EUR
            },
            {
              participantId: "participant-2",
              share: 0,
              shareType: "amount",
              amount: 5000, // 50 EUR
            },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 12000, // 120 USD
          fxRateToTrip: 1.2,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            splits: [
              {
                participantId: "participant-1",
                share: 0,
                shareType: "amount",
                amount: 6000, // 50 EUR * 1.2 = 60 USD
              },
              {
                participantId: "participant-2",
                share: 0,
                shareType: "amount",
                amount: 6000, // 50 EUR * 1.2 = 60 USD
              },
            ],
          }),
        );
      });

      it("should convert null split amounts to null", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            {
              participantId: "participant-1",
              share: 1,
              shareType: "equal",
            },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            splits: [
              {
                participantId: "participant-1",
                share: 1,
                shareType: "equal",
                amount: null,
              },
            ],
          }),
        );
      });
    });

    describe("error handling", () => {
      it("should throw TRIP_NOT_FOUND error when trip does not exist", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "invalid-trip",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockExpenseRepo = createMockExpenseRepository();
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(null),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        // Act & Assert
        await expect(
          createExpense(input, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toMatchObject({
          message: "Trip not found: invalid-trip",
          code: "TRIP_NOT_FOUND",
        });

        expect(mockExpenseLogger.error).toHaveBeenCalledWith("Trip not found", {
          tripId: "invalid-trip",
        });
      });

      it("should throw CATEGORY_NOT_FOUND error when category does not exist", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          paidBy: "participant-1",
          categoryId: "invalid-category",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };

        const mockExpenseRepo = createMockExpenseRepository();
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(false),
        });

        // Act & Assert
        await expect(
          createExpense(input, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toMatchObject({
          message: "Category not found: invalid-category",
          code: "CATEGORY_NOT_FOUND",
        });

        expect(mockExpenseLogger.error).toHaveBeenCalledWith(
          "Invalid category ID",
          { categoryId: "invalid-category" },
        );
      });

      it("should throw FX_RATE_REQUIRED error when currencies differ and no rate provided", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Hotel",
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository();
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        const fxError = new Error(
          "fxRateToTrip is required when expense currency differs from trip currency",
        ) as Error & { code: string };
        fxError.code = "FX_RATE_REQUIRED";
        mockComputeConversion.mockImplementation(() => {
          throw fxError;
        });

        // Act & Assert
        await expect(
          createExpense(input, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toBe(fxError);
      });

      it("should throw FX_RATE_INVALID error when rate is zero or negative", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Hotel",
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          fxRateToTrip: -1.1,
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const mockExpenseRepo = createMockExpenseRepository();
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        const fxError = new Error("fxRateToTrip must be positive") as Error & {
          code: string;
        };
        fxError.code = "FX_RATE_INVALID";
        mockComputeConversion.mockImplementation(() => {
          throw fxError;
        });

        // Act & Assert
        await expect(
          createExpense(input, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toBe(fxError);
      });
    });

    describe("edge cases", () => {
      it("should handle case-insensitive currency matching", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Dinner",
          originalAmountMinor: 10000,
          originalCurrency: "usd", // lowercase
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" }; // uppercase

        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null, // Same currency, no conversion
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 10000,
          originalCurrency: "usd",
          tripCurrencyCode: "USD",
          providedRate: undefined,
          providedConverted: undefined,
        });
      });

      it("should use provided convertedAmountMinor when available", async () => {
        // Arrange
        const input: CreateExpenseInput = {
          tripId: "trip-1",
          description: "Hotel",
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          fxRateToTrip: 1.2,
          convertedAmountMinor: 12050, // Pre-computed value
          paidBy: "participant-1",
          splits: [
            { participantId: "participant-1", share: 1, shareType: "equal" },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };

        const mockExpenseRepo = createMockExpenseRepository({
          create: jest.fn().mockResolvedValue(createTestExpense()),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 12050,
          fxRateToTrip: 1.2,
        });

        // Act
        await createExpense(input, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          tripCurrencyCode: "USD",
          providedRate: 1.2,
          providedConverted: 12050,
        });
      });
    });
  });

  describe("updateExpense", () => {
    describe("dependency injection", () => {
      it("should throw error if expenseRepository is missing", async () => {
        // Arrange
        const patch: UpdateExpenseInput = {
          description: "Updated dinner",
        };

        // Act & Assert
        await expect(
          updateExpense("expense-1", patch, {
            tripRepository: createMockTripRepository(),
            categoryRepository: createMockCategoryRepository(),
          }),
        ).rejects.toThrow("expenseRepository dependency is required");
      });

      it("should throw error if tripRepository is missing", async () => {
        // Arrange
        const patch: UpdateExpenseInput = {
          description: "Updated dinner",
        };

        // Act & Assert
        await expect(
          updateExpense("expense-1", patch, {
            expenseRepository: createMockExpenseRepository(),
            categoryRepository: createMockCategoryRepository(),
          }),
        ).rejects.toThrow("tripRepository dependency is required");
      });

      it("should throw error if categoryRepository is missing", async () => {
        // Arrange
        const patch: UpdateExpenseInput = {
          description: "Updated dinner",
        };

        // Act & Assert
        await expect(
          updateExpense("expense-1", patch, {
            expenseRepository: createMockExpenseRepository(),
            tripRepository: createMockTripRepository(),
          }),
        ).rejects.toThrow("categoryRepository dependency is required");
      });
    });

    describe("happy path", () => {
      it("should update expense with description change only", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          id: "expense-1",
          description: "Old description",
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        const patch: UpdateExpenseInput = {
          description: "New description",
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense({
          id: "expense-1",
          description: "New description",
        });

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        const result = await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.getById).toHaveBeenCalledWith("expense-1");
        expect(mockTripRepo.getById).toHaveBeenCalledWith("trip-1");
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 10000,
          originalCurrency: "USD",
          tripCurrencyCode: "USD",
          providedRate: undefined,
          providedConverted: 10000,
        });
        expect(mockExpenseRepo.update).toHaveBeenCalledWith("expense-1", {
          description: "New description",
          amount: 10000,
          currency: "USD",
          originalCurrency: "USD",
          originalAmountMinor: 10000,
          fxRateToTrip: null,
          convertedAmountMinor: 10000,
        });
        expect(result).toBe(updatedExpense);
      });

      it("should update expense with currency conversion change", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          id: "expense-1",
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          convertedAmountMinor: 11000,
          fxRateToTrip: 1.1,
        });

        const patch: UpdateExpenseInput = {
          originalAmountMinor: 15000, // Changed amount
          fxRateToTrip: 1.2, // Changed rate
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense({
          id: "expense-1",
          convertedAmountMinor: 18000,
        });

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 18000, // 15000 * 1.2
          fxRateToTrip: 1.2,
        });

        // Act
        const result = await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 15000,
          originalCurrency: "EUR",
          tripCurrencyCode: "USD",
          providedRate: 1.2,
          providedConverted: 11000, // Existing converted amount
        });
        expect(mockExpenseRepo.update).toHaveBeenCalledWith(
          "expense-1",
          expect.objectContaining({
            originalAmountMinor: 15000,
            convertedAmountMinor: 18000,
            fxRateToTrip: 1.2,
          }),
        );
        expect(result).toBe(updatedExpense);
      });

      it("should update category and validate it exists", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          id: "expense-1",
          categoryId: "cat-food",
        });

        const patch: UpdateExpenseInput = {
          categoryId: "cat-transport",
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense({
          id: "expense-1",
          categoryId: "cat-transport",
        });

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(true),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockCategoryRepo.exists).toHaveBeenCalledWith("cat-transport");
        expect(mockExpenseRepo.update).toHaveBeenCalledWith(
          "expense-1",
          expect.objectContaining({
            categoryId: "cat-transport",
          }),
        );
      });

      it("should update splits with FX conversion", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          id: "expense-1",
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          convertedAmountMinor: 11000,
          fxRateToTrip: 1.1,
        });

        const patch: UpdateExpenseInput = {
          splits: [
            {
              participantId: "participant-1",
              share: 0,
              shareType: "amount",
              amount: 5000, // 50 EUR
            },
            {
              participantId: "participant-2",
              share: 0,
              shareType: "amount",
              amount: 5000, // 50 EUR
            },
          ],
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense();

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 11000,
          fxRateToTrip: 1.1,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.update).toHaveBeenCalledWith(
          "expense-1",
          expect.objectContaining({
            splits: [
              {
                participantId: "participant-1",
                share: 0,
                shareType: "amount",
                amount: 5500, // 5000 * 1.1 = 5500
              },
              {
                participantId: "participant-2",
                share: 0,
                shareType: "amount",
                amount: 5500, // 5000 * 1.1 = 5500
              },
            ],
          }),
        );
      });
    });

    describe("notes normalization", () => {
      it("should trim whitespace from updated notes", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          notes: "Old notes",
        });

        const patch: UpdateExpenseInput = {
          notes: "  New notes  ",
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense();

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.update).toHaveBeenCalledWith(
          "expense-1",
          expect.objectContaining({
            notes: "New notes",
          }),
        );
      });

      it("should convert empty string notes to null", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          notes: "Old notes",
        });

        const patch: UpdateExpenseInput = {
          notes: "   ",
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense();

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockExpenseRepo.update).toHaveBeenCalledWith(
          "expense-1",
          expect.objectContaining({
            notes: null,
          }),
        );
      });
    });

    describe("error handling", () => {
      it("should throw EXPENSE_NOT_FOUND error when expense does not exist", async () => {
        // Arrange
        const patch: UpdateExpenseInput = {
          description: "Updated",
        };

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(null),
        });
        const mockTripRepo = createMockTripRepository();
        const mockCategoryRepo = createMockCategoryRepository();

        // Act & Assert
        await expect(
          updateExpense("invalid-expense", patch, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toMatchObject({
          message: "Expense not found: invalid-expense",
          code: "EXPENSE_NOT_FOUND",
        });

        expect(mockExpenseLogger.error).toHaveBeenCalledWith(
          "Expense not found on update",
          { expenseId: "invalid-expense" },
        );
      });

      it("should throw TRIP_NOT_FOUND error when trip does not exist", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          tripId: "invalid-trip",
        });

        const patch: UpdateExpenseInput = {
          description: "Updated",
        };

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(null),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        // Act & Assert
        await expect(
          updateExpense("expense-1", patch, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toMatchObject({
          message: "Trip not found: invalid-trip",
          code: "TRIP_NOT_FOUND",
        });

        expect(mockExpenseLogger.error).toHaveBeenCalledWith("Trip not found", {
          tripId: "invalid-trip",
        });
      });

      it("should throw CATEGORY_NOT_FOUND error when updating to invalid category", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          categoryId: "cat-food",
        });

        const patch: UpdateExpenseInput = {
          categoryId: "invalid-category",
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn().mockResolvedValue(false),
        });

        // Act & Assert
        await expect(
          updateExpense("expense-1", patch, {
            expenseRepository: mockExpenseRepo,
            tripRepository: mockTripRepo,
            categoryRepository: mockCategoryRepo,
          }),
        ).rejects.toMatchObject({
          message: "Category not found: invalid-category",
          code: "CATEGORY_NOT_FOUND",
        });

        expect(mockExpenseLogger.error).toHaveBeenCalledWith(
          "Invalid category ID",
          { categoryId: "invalid-category" },
        );
      });
    });

    describe("edge cases", () => {
      it("should not validate category if not being updated", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          categoryId: "cat-food",
        });

        const patch: UpdateExpenseInput = {
          description: "Updated description",
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense();

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository({
          exists: jest.fn(),
        });

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockCategoryRepo.exists).not.toHaveBeenCalled();
      });

      it("should merge existing values with patch for conversion", async () => {
        // Arrange
        const existingExpense = createTestExpense({
          originalAmountMinor: 10000,
          originalCurrency: "EUR",
          convertedAmountMinor: 11000,
          fxRateToTrip: 1.1,
        });

        // Only update currency, amount should stay the same
        const patch: UpdateExpenseInput = {
          originalCurrency: "GBP",
          fxRateToTrip: 1.3,
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense();

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 13000, // 10000 * 1.3
          fxRateToTrip: 1.3,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        expect(mockComputeConversion).toHaveBeenCalledWith({
          originalAmountMinor: 10000, // From existing expense
          originalCurrency: "GBP", // From patch
          tripCurrencyCode: "USD",
          providedRate: 1.3, // From patch
          providedConverted: 11000, // From existing expense
        });
      });

      it("should remove undefined fields from update payload", async () => {
        // Arrange
        const existingExpense = createTestExpense();

        const patch: UpdateExpenseInput = {
          description: "Updated",
          // All other fields undefined
        };

        const mockTrip = { id: "trip-1", currencyCode: "USD" };
        const updatedExpense = createTestExpense();

        const mockExpenseRepo = createMockExpenseRepository({
          getById: jest.fn().mockResolvedValue(existingExpense),
          update: jest.fn().mockResolvedValue(updatedExpense),
        });
        const mockTripRepo = createMockTripRepository({
          getById: jest.fn().mockResolvedValue(mockTrip),
        });
        const mockCategoryRepo = createMockCategoryRepository();

        mockComputeConversion.mockReturnValue({
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
        });

        // Act
        await updateExpense("expense-1", patch, {
          expenseRepository: mockExpenseRepo,
          tripRepository: mockTripRepo,
          categoryRepository: mockCategoryRepo,
        });

        // Assert
        const updateCall = (mockExpenseRepo.update as jest.Mock).mock.calls[0];
        const updateData = updateCall[1];

        // Should only have defined fields
        expect(updateData).toHaveProperty("description", "Updated");
        expect(updateData).toHaveProperty("amount");
        expect(updateData).toHaveProperty("currency");
        expect(updateData).not.toHaveProperty("paidBy");
        expect(updateData).not.toHaveProperty("date");
        expect(updateData).not.toHaveProperty("categoryId");
      });
    });
  });

  describe("deleteExpense", () => {
    describe("dependency injection", () => {
      it("should throw error if expenseRepository is missing", async () => {
        // Act & Assert
        await expect(deleteExpense("expense-1", {})).rejects.toThrow(
          "expenseRepository dependency is required",
        );
      });
    });

    describe("happy path", () => {
      it("should delete expense successfully", async () => {
        // Arrange
        const mockExpenseRepo = createMockExpenseRepository({
          delete: jest.fn().mockResolvedValue(undefined),
        });

        // Act
        await deleteExpense("expense-1", {
          expenseRepository: mockExpenseRepo,
        });

        // Assert
        expect(mockExpenseRepo.delete).toHaveBeenCalledWith("expense-1");
        expect(mockExpenseLogger.debug).toHaveBeenCalledWith(
          "Deleting expense via service",
          { expenseId: "expense-1" },
        );
        expect(mockExpenseLogger.info).toHaveBeenCalledWith("Expense deleted", {
          expenseId: "expense-1",
        });
      });

      it("should not throw error when deleting non-existent expense", async () => {
        // Arrange
        const mockExpenseRepo = createMockExpenseRepository({
          delete: jest.fn().mockResolvedValue(undefined),
        });

        // Act & Assert - should not throw
        await expect(
          deleteExpense("non-existent", {
            expenseRepository: mockExpenseRepo,
          }),
        ).resolves.toBeUndefined();

        expect(mockExpenseRepo.delete).toHaveBeenCalledWith("non-existent");
      });
    });
  });
});
