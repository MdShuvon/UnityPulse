import { redis, EXCHANGE_RATES_CACHE_KEY } from '../lib/redis';

// Supported currencies for display (BDT base)
const SUPPORTED_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'AED', 'SAR', 'MYR', 
  'SGD', 'AUD', 'CAD', 'JPY', 'INR', 'KWD', 'QAR'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

interface ExchangeRateCache {
  base:      'BDT';
  rates:     Record<string, number>;
  fetchedAt: string;
}

const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 ঘণ্টা
const API_TIMEOUT_MS    = 5000;

export class ExchangeRateService {

  /**
   * BDT-base exchange rates (display only)
   * Redis cached, TTL 6 hours
   */
  async getBdtRates(): Promise<ExchangeRateCache> {
    // 1. Cache check
    const cached = await redis.get(EXCHANGE_RATES_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // corrupted cache — delete and refetch
        await redis.del(EXCHANGE_RATES_CACHE_KEY);
      }
    }

    // 2. Fetch from API
    const fresh = await this.fetchFromApi();

    // 3. Cache it
    await redis.set(
      EXCHANGE_RATES_CACHE_KEY,
      JSON.stringify(fresh),
      'EX',
      CACHE_TTL_SECONDS
    );

    return fresh;
  }

  /**
   * Fetch live rates from exchangerate-api.com (free tier)
   * Returns rates where 1 BDT = X foreign currency
   */
  private async fetchFromApi(): Promise<ExchangeRateCache> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      throw new Error('EXCHANGE_RATE_API_KEY not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      // Note: base=BDT, we want all supported currencies
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/BDT`;
      
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Exchange rate API failed: ${res.status}`);
      }

      const data = await res.json();
      if (data.result !== 'success') {
        throw new Error(`API error: ${data['error-type'] || 'unknown'}`);
      }

      // Filter to supported currencies only (keep response small)
      const filteredRates: Record<string, number> = {};
      for (const curr of SUPPORTED_CURRENCIES) {
        if (data.conversion_rates[curr]) {
          filteredRates[curr] = data.conversion_rates[curr];
        }
      }

      return {
        base:      'BDT',
        rates:     filteredRates,
        fetchedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Invalidate cache (for admin manual refresh if needed)
   */
  async invalidateCache(): Promise<void> {
    await redis.del(EXCHANGE_RATES_CACHE_KEY);
  }
}

export const exchangeRateService = new ExchangeRateService();