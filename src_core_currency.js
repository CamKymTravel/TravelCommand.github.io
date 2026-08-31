export function localToAUD(localAmount, localPerAUD) {
  const amount = Number(localAmount);
  const rate = Number(localPerAUD);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid amount');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid exchange rate');
  return amount / rate;
}

export function audToLocal(audAmount, localPerAUD) {
  const amount = Number(audAmount);
  const rate = Number(localPerAUD);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid amount');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid exchange rate');
  return amount * rate;
}

export function formatMoney(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0);
}
