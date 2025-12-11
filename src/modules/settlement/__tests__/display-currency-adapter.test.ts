/**
 * DISPLAY INTEGRATION ENGINEER: Display Currency Adapter Tests
 * Tests for currency conversion and display enrichment
 */

import {
  DisplayCurrencyAdapter,
  StubFxRateProvider,
} from '../service/DisplayCurrencyAdapter';
import type { SettlementSummary } from '../types';

describe('DisplayCurrencyAdapter', () => {
  describe('StubFxRateProvider', () => {
    it('should return 1.0 for same currency', () => {
      const provider = new StubFxRateProvider();
      expect(provider.getRate('USD', 'USD')).toBe(1.0);
      expect(provider.getRate('EUR', 'EUR')).toBe(1.0);
    });

    it('should return manually set rate for different currencies', () => {
      const provider = new StubFxRateProvider();
      provider.setRate('USD', 'EUR', 0.85);
      expect(provider.getRate('USD', 'EUR')).toBe(0.85);
    });

    it('should throw error if rate not set for different currencies', () => {
      const provider = new StubFxRateProvider();
      expect(() => provider.getRate('USD', 'EUR')).toThrow(
        'No exchange rate available for USD to EUR'
      );
    });

    it('should handle multiple currency pairs', () => {
      const provider = new StubFxRateProvider();
      provider.setRate('USD', 'EUR', 0.85);
      provider.setRate('USD', 'GBP', 0.73);
      provider.setRate('EUR', 'GBP', 0.86);

      expect(provider.getRate('USD', 'EUR')).toBe(0.85);
      expect(provider.getRate('USD', 'GBP')).toBe(0.73);
      expect(provider.getRate('EUR', 'GBP')).toBe(0.86);
    });
  });

  describe('DisplayCurrencyAdapter', () => {
    let adapter: DisplayCurrencyAdapter;
    let provider: StubFxRateProvider;

    beforeEach(() => {
      provider = new StubFxRateProvider();
      adapter = new DisplayCurrencyAdapter(provider);
    });

    const createMockSettlement = (currency: string = 'USD'): SettlementSummary => ({
      balances: [
        {
          participantId: 'p1',
          participantName: 'Alice',
          netPosition: 5000, // $50.00 owed to Alice
          totalPaid: 10000,
          totalOwed: 5000,
        },
        {
          participantId: 'p2',
          participantName: 'Bob',
          netPosition: -3000, // Bob owes $30.00
          totalPaid: 2000,
          totalOwed: 5000,
        },
        {
          participantId: 'p3',
          participantName: 'Charlie',
          netPosition: -2000, // Charlie owes $20.00
          totalPaid: 3000,
          totalOwed: 5000,
        },
      ],
      settlements: [
        {
          from: 'p2',
          fromName: 'Bob',
          to: 'p1',
          toName: 'Alice',
          amount: 3000,
        },
        {
          from: 'p3',
          fromName: 'Charlie',
          to: 'p1',
          toName: 'Alice',
          amount: 2000,
        },
      ],
      totalExpenses: 15000,
      currency,
    });

    describe('enrichSettlement - same currency', () => {
      it('should return original settlement when display currency is undefined', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, undefined);

        expect(result.displayCurrency).toBeUndefined();
        expect(result.displayTotalExpenses).toBeUndefined();
        expect(result.balances).toEqual(settlement.balances);
        expect(result.settlements).toEqual(settlement.settlements);
      });

      it('should return original settlement when display currency matches trip currency', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'USD');

        expect(result.displayCurrency).toBeUndefined();
        expect(result.displayTotalExpenses).toBeUndefined();
        expect(result.balances).toEqual(settlement.balances);
        expect(result.settlements).toEqual(settlement.settlements);
      });
    });

    describe('enrichSettlement - different currency', () => {
      beforeEach(() => {
        // USD to EUR: 1 USD = 0.85 EUR
        provider.setRate('USD', 'EUR', 0.85);
      });

      it('should convert total expenses to display currency', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.displayCurrency).toBe('EUR');
        expect(result.displayTotalExpenses).toBeDefined();
        expect(result.displayTotalExpenses?.tripCurrency).toBe('USD');
        expect(result.displayTotalExpenses?.tripAmount).toBe(15000);
        expect(result.displayTotalExpenses?.displayCurrency).toBe('EUR');
        expect(result.displayTotalExpenses?.displayAmount).toBe(12750); // 15000 * 0.85
        expect(result.displayTotalExpenses?.fxRate).toBe(0.85);
      });

      it('should convert all participant balances to display currency', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.balances).toHaveLength(3);

        // Alice
        const alice = result.balances[0];
        expect(alice.participantName).toBe('Alice');
        expect(alice.displayNetPosition?.tripAmount).toBe(5000);
        expect(alice.displayNetPosition?.displayAmount).toBe(4250); // 5000 * 0.85
        expect(alice.displayTotalPaid?.tripAmount).toBe(10000);
        expect(alice.displayTotalPaid?.displayAmount).toBe(8500);
        expect(alice.displayTotalOwed?.tripAmount).toBe(5000);
        expect(alice.displayTotalOwed?.displayAmount).toBe(4250);

        // Bob
        const bob = result.balances[1];
        expect(bob.participantName).toBe('Bob');
        expect(bob.displayNetPosition?.tripAmount).toBe(-3000);
        expect(bob.displayNetPosition?.displayAmount).toBe(-2550); // -3000 * 0.85
        expect(bob.displayTotalPaid?.tripAmount).toBe(2000);
        expect(bob.displayTotalPaid?.displayAmount).toBe(1700);
      });

      it('should convert all settlements to display currency', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.settlements).toHaveLength(2);

        // Bob -> Alice
        const settlement1 = result.settlements[0];
        expect(settlement1.from).toBe('p2');
        expect(settlement1.to).toBe('p1');
        expect(settlement1.displayAmount?.tripAmount).toBe(3000);
        expect(settlement1.displayAmount?.displayAmount).toBe(2550); // 3000 * 0.85

        // Charlie -> Alice
        const settlement2 = result.settlements[1];
        expect(settlement2.from).toBe('p3');
        expect(settlement2.displayAmount?.tripAmount).toBe(2000);
        expect(settlement2.displayAmount?.displayAmount).toBe(1700); // 2000 * 0.85
      });

      it('should preserve original trip currency values', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.currency).toBe('USD');
        expect(result.totalExpenses).toBe(15000);
        expect(result.balances[0].netPosition).toBe(5000);
        expect(result.settlements[0].amount).toBe(3000);
      });
    });

    describe('enrichSettlement - edge cases', () => {
      it('should handle zero amounts correctly', () => {
        provider.setRate('USD', 'EUR', 0.85);

        const settlement: SettlementSummary = {
          balances: [
            {
              participantId: 'p1',
              participantName: 'Alice',
              netPosition: 0,
              totalPaid: 0,
              totalOwed: 0,
            },
          ],
          settlements: [],
          totalExpenses: 0,
          currency: 'USD',
        };

        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.displayTotalExpenses?.displayAmount).toBe(0);
        expect(result.balances[0].displayNetPosition?.displayAmount).toBe(0);
      });

      it('should round converted amounts to nearest cent', () => {
        // Rate that will produce fractional cents
        provider.setRate('USD', 'EUR', 0.8567);

        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        // 15000 * 0.8567 = 12850.5 -> rounds to 12851
        expect(result.displayTotalExpenses?.displayAmount).toBe(12851);

        // 5000 * 0.8567 = 4283.5 -> rounds to 4284
        expect(result.balances[0].displayNetPosition?.displayAmount).toBe(4284);
      });

      it('should handle negative amounts correctly', () => {
        provider.setRate('USD', 'EUR', 0.85);

        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        // Bob owes -3000 cents
        expect(result.balances[1].displayNetPosition?.displayAmount).toBe(-2550);
      });

      it('should handle large amounts without overflow', () => {
        provider.setRate('USD', 'EUR', 0.85);

        const settlement: SettlementSummary = {
          balances: [],
          settlements: [],
          totalExpenses: 1_000_000_00, // $1,000,000.00
          currency: 'USD',
        };

        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.displayTotalExpenses?.displayAmount).toBe(85_000_000); // €850,000.00
      });
    });

    describe('enrichSettlement - multiple currency pairs', () => {
      beforeEach(() => {
        provider.setRate('USD', 'EUR', 0.85);
        provider.setRate('USD', 'GBP', 0.73);
        provider.setRate('EUR', 'USD', 1.18);
      });

      it('should use correct rate for USD to EUR', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'EUR');

        expect(result.displayTotalExpenses?.fxRate).toBe(0.85);
        expect(result.displayTotalExpenses?.displayAmount).toBe(12750);
      });

      it('should use correct rate for USD to GBP', () => {
        const settlement = createMockSettlement('USD');
        const result = adapter.enrichSettlement(settlement, 'GBP');

        expect(result.displayTotalExpenses?.fxRate).toBe(0.73);
        expect(result.displayTotalExpenses?.displayAmount).toBe(10950); // 15000 * 0.73
      });

      it('should use correct rate for EUR to USD', () => {
        const settlement = createMockSettlement('EUR');
        const result = adapter.enrichSettlement(settlement, 'USD');

        expect(result.displayTotalExpenses?.fxRate).toBe(1.18);
        expect(result.displayTotalExpenses?.displayAmount).toBe(17700); // 15000 * 1.18
      });
    });
  });
});
