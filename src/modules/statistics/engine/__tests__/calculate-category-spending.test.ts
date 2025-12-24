/**
 * STATISTICS ENGINE: calculateCategorySpending Tests
 * MODELER: Pure math, no UI assumptions
 */

import { calculateCategorySpending } from "../calculate-category-spending";

const createCategory = (
  id: string,
  name: string,
): { id: string; name: string; emoji: string | null } => ({
  id,
  name,
  emoji: null,
});

describe("calculateCategorySpending", () => {
  it("aggregates totals and percentages across categories", () => {
    // Arrange
    const categories = [
      createCategory("c1", "Food"),
      createCategory("c2", "Lodging"),
    ];
    const expenses = [
      { categoryId: "c1", convertedAmountMinor: 1000 },
      { categoryId: "c1", convertedAmountMinor: 500 },
      { categoryId: "c2", convertedAmountMinor: 1500 },
    ];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    const food = result.find((entry) => entry.categoryId === "c1");
    const lodging = result.find((entry) => entry.categoryId === "c2");
    expect(food).toMatchObject({
      categoryName: "Food",
      categoryEmoji: null,
      totalAmount: 1500,
      expenseCount: 2,
    });
    expect(lodging).toMatchObject({
      categoryName: "Lodging",
      categoryEmoji: null,
      totalAmount: 1500,
      expenseCount: 1,
    });
    expect(food?.percentage).toBeCloseTo(50, 2);
    expect(lodging?.percentage).toBeCloseTo(50, 2);
  });

  it("groups uncategorized expenses from null or undefined category ids", () => {
    // Arrange
    const categories = [createCategory("c1", "Food")];
    const expenses = [
      { categoryId: null, convertedAmountMinor: 500 },
      { categoryId: undefined, convertedAmountMinor: 700 },
    ];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      categoryId: null,
      categoryName: "Uncategorized",
      categoryEmoji: null,
      totalAmount: 1200,
      expenseCount: 2,
      percentage: 100,
    });
  });

  it("creates an Unknown category when the reference is missing", () => {
    // Arrange
    const categories = [createCategory("c1", "Food")];
    const expenses = [{ categoryId: "c-missing", convertedAmountMinor: 400 }];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    expect(result).toEqual([
      {
        categoryId: "c-missing",
        categoryName: "Unknown category",
        categoryEmoji: null,
        totalAmount: 400,
        expenseCount: 1,
        percentage: 100,
      },
    ]);
  });

  it("returns an empty list when there are no expenses", () => {
    // Arrange
    const categories = [createCategory("c1", "Food")];
    const expenses: { categoryId?: string | null; convertedAmountMinor: number }[] =
      [];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    expect(result).toEqual([]);
  });

  it("sorts deterministically with uncategorized entries at the end", () => {
    // Arrange
    const categories = [
      createCategory("c1", "Dining"),
      createCategory("c2", "Lodging"),
    ];
    const expenses = [
      { categoryId: "c1", convertedAmountMinor: 100 },
      { categoryId: "c2", convertedAmountMinor: 100 },
      { categoryId: null, convertedAmountMinor: 100 },
    ];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    expect(result.map((entry) => entry.categoryName)).toEqual([
      "Dining",
      "Lodging",
      "Uncategorized",
    ]);
  });

  it("tracks expenseCount per category", () => {
    // Arrange
    const categories = [createCategory("c1", "Food")];
    const expenses = [
      { categoryId: "c1", convertedAmountMinor: 100 },
      { categoryId: "c1", convertedAmountMinor: 200 },
      { categoryId: null, convertedAmountMinor: 50 },
    ];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    const food = result.find((entry) => entry.categoryId === "c1");
    const uncategorized = result.find((entry) => entry.categoryId === null);
    expect(food?.expenseCount).toBe(2);
    expect(uncategorized?.expenseCount).toBe(1);
  });

  it("handles mixed categorized, uncategorized, and unknown categories", () => {
    // Arrange
    const categories = [createCategory("c1", "Food")];
    const expenses = [
      { categoryId: "c1", convertedAmountMinor: 300 },
      { categoryId: null, convertedAmountMinor: 100 },
      { categoryId: "c-ghost", convertedAmountMinor: 200 },
    ];

    // Act
    const result = calculateCategorySpending(expenses, categories);

    // Assert
    expect(result).toHaveLength(3);
    const food = result.find((entry) => entry.categoryId === "c1");
    const uncategorized = result.find((entry) => entry.categoryId === null);
    const unknown = result.find((entry) => entry.categoryId === "c-ghost");
    expect(food).toMatchObject({ totalAmount: 300, expenseCount: 1 });
    expect(uncategorized).toMatchObject({
      categoryName: "Uncategorized",
      totalAmount: 100,
      expenseCount: 1,
    });
    expect(unknown).toMatchObject({
      categoryName: "Unknown category",
      totalAmount: 200,
      expenseCount: 1,
    });
  });
});
