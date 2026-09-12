export interface ExchangeRateData {
  base:      string;
  rates:     Record<string, number>;
  fetchedAt: string;
}

// Detect user's currency from browser locale/timezone
export function detectUserCurrency(): string {
  try {
    // Try Intl API (widely supported)
    const locale = navigator.language || 'en-BD';
    const region = locale.split('-')[1]?.toUpperCase();
    
    // Map common regions to currencies
    const regionToCurrency: Record<string, string> = {
      'US': 'USD', 'GB': 'GBP', 'EU': 'EUR', 'AE': 'AED',
      'SA': 'SAR', 'MY': 'MYR', 'SG': 'SGD', 'AU': 'AUD',
      'CA': 'CAD', 'JP': 'JPY', 'IN': 'INR', 'KW': 'KWD',
      'QA': 'QAR', 'BD': 'BDT',
    };
    
    return regionToCurrency[region || ''] || 'USD';
  } catch {
    return 'USD';
  }
}

// Fetch exchange rates (with frontend cache via localStorage, 6h)
export async function fetchExchangeRates(): Promise<ExchangeRateData | null> {
  try {
    const CACHE_KEY = 'exchange_rates_cache';
    const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

    // Check localStorage cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          return parsed.data;
        }
      } catch {}
    }

    // Fetch from backend
    const res = await fetch('http://localhost:3001/exchange-rates', {
      credentials: 'include',
    });

    if (!res.ok) return null;

    const data = await res.json();
    
    // Save to localStorage
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));

    return data;
  } catch (err) {
    console.error('Exchange rate fetch failed:', err);
    return null;
  }
}

// Format currency with symbol
export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$', 'GBP': '£', 'EUR': '€', 'AED': 'د.إ',
    'SAR': '﷼', 'MYR': 'RM', 'SGD': 'S$', 'AUD': 'A$',
    'CAD': 'C$', 'JPY': '¥', 'INR': '₹', 'KWD': 'د.ك',
    'QAR': '﷼', 'BDT': '৳',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}