// Jest setup file for global test configuration

// Mock expo-crypto for tests that don't need actual crypto functionality
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).substr(2, 9)),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: "SHA-256",
  },
}));

// Mock expo-sqlite - must be mocked before drizzle-orm imports
jest.mock("expo-sqlite", () => {
  const createMockDb = () => {
    const mockStatement = {
      executeForRawResultSync: jest.fn(() => ({
        rows: [],
        getAllSync: jest.fn(() => []),
      })),
      executeAsync: jest.fn(() => Promise.resolve({ rows: [], getAllAsync: () => Promise.resolve([]) })),
      finalizeSync: jest.fn(),
      finalizeAsync: jest.fn(() => Promise.resolve()),
    };

    return {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(() => []),
      prepareSync: jest.fn(() => mockStatement),
      closeSync: jest.fn(),
      closeAsync: jest.fn(() => Promise.resolve()),
      withTransactionSync: jest.fn((callback) => callback()),
      withTransactionAsync: jest.fn((callback) => Promise.resolve(callback())),
    };
  };

  return {
    openDatabaseSync: jest.fn(createMockDb),
    SQLiteDatabase: jest.fn(),
  };
});

// Silence console logs during tests (optional - comment out if you need to debug)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
