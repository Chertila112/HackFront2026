const CURRENCY_CODES: Record<string, string> = {
  EUR_CENTS: 'EUR',
  RUB: 'RUB',
  USD: 'USD',
}

// Коды валют, которые приходят уже в мелких единицах (копейках/центах).
const CENTS_CURRENCIES = new Set(['EUR_CENTS'])

export interface CurrencyOption {
  key: string
  label: string
}

export function formatMoney(value: number, currency = 'EUR_CENTS'): string {
  const divisor = CENTS_CURRENCIES.has(currency) ? 100 : 1

  const intlCode = CURRENCY_CODES[currency]

  if (intlCode === undefined) {
    // Незнакомый код валюты не отдаём в Intl — он бросит RangeError.
    // Показываем сумму и код как есть.
    return `${new Intl.NumberFormat('ru-RU').format(value / divisor)} ${currency}`
  }

  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: intlCode,
  })

  return formatter.format(value / divisor)
}
