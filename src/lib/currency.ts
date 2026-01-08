export const CURRENCIES = {
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano', locale: 'es-DO' },
  USD: { code: 'USD', symbol: '$', name: 'Dólar Americano', locale: 'en-US' },
  MXN: { code: 'MXN', symbol: '$', name: 'Peso Mexicano', locale: 'es-MX' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'es-ES' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrency(amount: number, currencyCode: string = 'DOP'): string {
  const code = currencyCode as CurrencyCode;
  const currency = CURRENCIES[code] || CURRENCIES.DOP;
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
  }).format(amount);
}
