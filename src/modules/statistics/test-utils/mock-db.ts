// ROLE: QA + TESTING ENGINEER — Repository test utilities
/**
 * In-memory Drizzle/SQLite mock for Statistics repository tests.
 * Supports select/from/leftJoin/where/limit with expense-category joins.
 */

export type ColumnRef = {
  table: "expenses" | "expenseCategories" | "trips";
  column: string;
};

export type MockExpenseRow = {
  id: string;
  tripId: string;
  description: string;
  notes: string | null;
  currency: string;
  originalCurrency: string;
  originalAmountMinor: number;
  fxRateToTrip: number | null;
  convertedAmountMinor: number;
  paidBy: string;
  categoryId: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type MockCategoryRow = {
  id: string;
  name: string;
  emoji: string | null;
  [key: string]: string | null;
};

export type MockTripRow = {
  id: string;
  currencyCode: string;
};

type Condition = {
  type: "eq";
  left: ColumnRef;
  right: ColumnRef | unknown;
};

export const eq = (left: ColumnRef, right: ColumnRef | unknown): Condition => ({
  type: "eq",
  left,
  right,
});

type Selection = Record<string, ColumnRef>;

type JoinDescriptor = {
  table: "expenseCategories";
  on: Condition;
};

type QueryMeta = {
  selection?: Selection;
  fromTable?: "expenses" | "trips";
  join?: JoinDescriptor;
  where?: Condition;
  limit?: number;
};

class QueryBuilder {
  private fromTable?: "expenses" | "trips";
  private join?: JoinDescriptor;
  private whereCond?: Condition;
  private limitCount?: number;

  constructor(
    private readonly db: InMemoryDb,
    private readonly selection?: Selection,
  ) {}

  from(table: { __table: "expenses" | "trips" }) {
    this.fromTable = table.__table;
    return this;
  }

  leftJoin(
    table: { __table: "expenseCategories" },
    on: Condition,
  ): QueryBuilder {
    this.join = { table: table.__table, on };
    return this;
  }

  where(cond?: Condition) {
    this.whereCond = cond;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private matchesWhere(row: Record<string, unknown>): boolean {
    if (!this.whereCond) return true;
    if (this.whereCond.type !== "eq") return true;
    if (typeof this.whereCond.right === "object") {
      return true;
    }
    return row[this.whereCond.left.column] === this.whereCond.right;
  }

  private applySelection(
    expenseRow: MockExpenseRow | null,
    categoryRow: MockCategoryRow | null,
    tripRow: MockTripRow | null,
  ) {
    if (!this.selection) {
      if (expenseRow) return { ...expenseRow };
      if (tripRow) return { ...tripRow };
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const [key, columnRef] of Object.entries(this.selection)) {
      if (columnRef.table === "expenses") {
        result[key] = expenseRow ? (expenseRow as any)[columnRef.column] : null;
      } else if (columnRef.table === "expenseCategories") {
        result[key] = categoryRow
          ? (categoryRow as any)[columnRef.column]
          : null;
      } else if (columnRef.table === "trips") {
        result[key] = tripRow ? (tripRow as any)[columnRef.column] : null;
      }
    }
    return result;
  }

  private buildResult(): any[] {
    this.db.lastQuery = {
      selection: this.selection,
      fromTable: this.fromTable,
      join: this.join,
      where: this.whereCond,
      limit: this.limitCount,
    };

    if (this.fromTable === "trips") {
      let rows = this.db.tripRows.filter((row) => this.matchesWhere(row));
      if (typeof this.limitCount === "number") {
        rows = rows.slice(0, this.limitCount);
      }
      return rows.map((row) => this.applySelection(null, null, row));
    }

    if (this.fromTable !== "expenses") {
      return [];
    }

    let rows = this.db.expenseRows.filter((row) => this.matchesWhere(row));
    if (typeof this.limitCount === "number") {
      rows = rows.slice(0, this.limitCount);
    }

    const joinedRows = rows.map((expenseRow) => {
      let categoryRow: MockCategoryRow | null = null;
      if (this.join?.table === "expenseCategories") {
        const left = this.join.on.left;
        const right = this.join.on.right;
        if (
          this.join.on.type === "eq" &&
          left.table === "expenses" &&
          typeof right === "object" &&
          right &&
          (right as ColumnRef).table === "expenseCategories"
        ) {
          const expenseCategoryId = (expenseRow as any)[left.column];
          categoryRow =
            this.db.categoryRows.find(
              (row) => row[(right as ColumnRef).column] === expenseCategoryId,
            ) ?? null;
        }
      }
      return this.applySelection(expenseRow, categoryRow, null);
    });

    return joinedRows;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any[]) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ) {
    return Promise.resolve(this.buildResult()).then(onfulfilled, onrejected);
  }
}

export class InMemoryDb {
  expenseRows: MockExpenseRow[] = [];
  categoryRows: MockCategoryRow[] = [];
  tripRows: MockTripRow[] = [];
  lastQuery: QueryMeta | null = null;

  select(selection?: Selection) {
    return new QueryBuilder(this, selection);
  }

  reset({
    expenses = [],
    categories = [],
    trips = [],
  }: {
    expenses?: MockExpenseRow[];
    categories?: MockCategoryRow[];
    trips?: MockTripRow[];
  } = {}) {
    this.expenseRows = expenses.map((row) => ({ ...row }));
    this.categoryRows = categories.map((row) => ({ ...row }));
    this.tripRows = trips.map((row) => ({ ...row }));
    this.lastQuery = null;
  }
}

export const mockDb = new InMemoryDb();

export const mockExpensesTable = {
  __table: "expenses" as const,
  id: { table: "expenses", column: "id" },
  tripId: { table: "expenses", column: "tripId" },
  description: { table: "expenses", column: "description" },
  notes: { table: "expenses", column: "notes" },
  currency: { table: "expenses", column: "currency" },
  originalCurrency: { table: "expenses", column: "originalCurrency" },
  originalAmountMinor: { table: "expenses", column: "originalAmountMinor" },
  fxRateToTrip: { table: "expenses", column: "fxRateToTrip" },
  convertedAmountMinor: { table: "expenses", column: "convertedAmountMinor" },
  paidBy: { table: "expenses", column: "paidBy" },
  categoryId: { table: "expenses", column: "categoryId" },
  date: { table: "expenses", column: "date" },
  createdAt: { table: "expenses", column: "createdAt" },
  updatedAt: { table: "expenses", column: "updatedAt" },
} as const;

export const mockTripsTable = {
  __table: "trips" as const,
  id: { table: "trips", column: "id" },
  currencyCode: { table: "trips", column: "currencyCode" },
} as const;

export const mockExpenseCategoriesTable = {
  __table: "expenseCategories" as const,
  id: { table: "expenseCategories", column: "id" },
  name: { table: "expenseCategories", column: "name" },
  emoji: { table: "expenseCategories", column: "emoji" },
} as const;

export const createExpenseRow = (
  overrides: Partial<MockExpenseRow> = {},
): MockExpenseRow => ({
  id: overrides.id ?? "expense-1",
  tripId: overrides.tripId ?? "trip-1",
  description: overrides.description ?? "Taxi",
  notes: overrides.notes ?? null,
  currency: overrides.currency ?? "USD",
  originalCurrency: overrides.originalCurrency ?? "USD",
  originalAmountMinor: overrides.originalAmountMinor ?? 1000,
  fxRateToTrip: overrides.fxRateToTrip ?? null,
  convertedAmountMinor: overrides.convertedAmountMinor ?? 1000,
  paidBy: overrides.paidBy ?? "participant-1",
  categoryId: overrides.categoryId ?? null,
  date: overrides.date ?? "2024-01-01",
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
});

export const createTripRow = (
  overrides: Partial<MockTripRow> = {},
): MockTripRow => ({
  id: overrides.id ?? "trip-1",
  currencyCode: overrides.currencyCode ?? "USD",
});

export const drizzleOrmMock = { eq };
