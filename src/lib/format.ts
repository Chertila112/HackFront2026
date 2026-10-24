const euroFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'EUR',
})

// Балансы приходят в еврокопейках — приводим к евро.
export function formatMoney(cents: number): string {
  return euroFormat.format(cents / 100)
}
