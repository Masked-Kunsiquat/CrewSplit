/**
 * DISPLAY INTEGRATION ENGINEER: Display Currency Adapter
 * Converts settlement amounts to user's preferred display currency
 * CRITICAL: This is purely visual - never modifies underlying settlement data
 */

import type {
  SettlementSummary,
  SettlementSummaryWithDisplay,
  DisplayAmount,
  ParticipantBalanceWithDisplay,
  SuggestedSettlementWithDisplay,
} from "../types";
import { cachedFxRateProvider } from "@modules/fx-rates/provider";

/**
 * FX rate provider interface
 * Can be implemented with manual rates, cached rates, or live API
 * Note: Synchronous for simplicity; async providers should cache rates
 */
export interface FxRateProvider {
  getRate(fromCurrency: string, toCurrency: string): number;
}

/**
 * Stub FX rate provider for initial implementation
 * Returns 1.0 for same currency, throws for different currencies
 */
export class StubFxRateProvider implements FxRateProvider {
  private rates: Map<string, number> = new Map();

  /**
   * Set a manual exchange rate
   * @param fromCurrency - Source currency code (e.g., 'USD')
   * @param toCurrency - Target currency code (e.g., 'EUR')
   * @param rate - Exchange rate (e.g., 0.85 for USD to EUR)
   */
  setRate(fromCurrency: string, toCurrency: string, rate: number): void {
    const key = `${fromCurrency}-${toCurrency}`;
    this.rates.set(key, rate);
  }

  getRate(fromCurrency: string, toCurrency: string): number {
    // Same currency = no conversion needed
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const key = `${fromCurrency}-${toCurrency}`;
    const rate = this.rates.get(key);

    if (rate === undefined) {
      throw new Error(
        `No exchange rate available for ${fromCurrency} to ${toCurrency}. ` +
          `Please set a manual rate using setRate() or implement a live FX provider.`,
      );
    }

    return rate;
  }
}

/**
 * Display Currency Adapter
 * Wraps settlement results with display currency equivalents
 */
export class DisplayCurrencyAdapter {
  constructor(private fxRateProvider: FxRateProvider) {}

  /**
   * Convert a single amount from trip currency to display currency
   * @param tripCurrency - Trip currency code
   * @param tripAmount - Amount in trip currency (cents)
   * @param displayCurrency - User's preferred display currency
   * @returns DisplayAmount with both trip and display values
   */
  private convertAmount(
    tripCurrency: string,
    tripAmount: number,
    displayCurrency: string,
  ): DisplayAmount {
    const fxRate = this.fxRateProvider.getRate(tripCurrency, displayCurrency);

    // Convert: multiply by FX rate and round to nearest cent
    const displayAmount = Math.round(tripAmount * fxRate);

    return {
      tripCurrency,
      tripAmount,
      displayCurrency,
      displayAmount,
      fxRate,
    };
  }

  /**
   * Enrich settlement summary with display currency equivalents
   * @param settlement - Raw settlement summary (trip currency only)
   * @param displayCurrency - User's preferred display currency (optional)
   * @returns Settlement summary with display currency data (if displayCurrency provided)
   */
  enrichSettlement(
    settlement: SettlementSummary,
    displayCurrency?: string,
  ): SettlementSummaryWithDisplay {
    // If no display currency or same as trip currency, return as-is
    if (!displayCurrency || displayCurrency === settlement.currency) {
      return {
        ...settlement,
        displayCurrency: undefined,
        displayTotalExpenses: undefined,
      };
    }

    const tripCurrency = settlement.currency;

    // Convert total expenses
    const displayTotalExpenses = this.convertAmount(
      tripCurrency,
      settlement.totalExpenses,
      displayCurrency,
    );

    // Convert balances
    const balances: ParticipantBalanceWithDisplay[] = settlement.balances.map(
      (balance) => ({
        ...balance,
        displayNetPosition: this.convertAmount(
          tripCurrency,
          balance.netPosition,
          displayCurrency,
        ),
        displayTotalPaid: this.convertAmount(
          tripCurrency,
          balance.totalPaid,
          displayCurrency,
        ),
        displayTotalOwed: this.convertAmount(
          tripCurrency,
          balance.totalOwed,
          displayCurrency,
        ),
      }),
    );

    // Convert settlements
    const settlements: SuggestedSettlementWithDisplay[] = settlement.settlements.map(
      (s) => ({
        ...s,
        displayAmount: this.convertAmount(
          tripCurrency,
          s.amount,
          displayCurrency,
        ),
      }),
    );

    return {
      balances,
      settlements,
      totalExpenses: settlement.totalExpenses,
      currency: settlement.currency,
      displayCurrency,
      displayTotalExpenses,
    };
  }
}

/**
 * Default adapter instance with cached FX provider
 * Provider is initialized at app startup after migrations complete (see app/_layout.tsx)
 */
export const defaultDisplayCurrencyAdapter = new DisplayCurrencyAdapter(
  cachedFxRateProvider,
);
