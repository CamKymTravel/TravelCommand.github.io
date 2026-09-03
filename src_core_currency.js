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
  const raw=String(currency||'').trim().toUpperCase();
  const safeCurrency=/^[A-Z]{3}$/.test(raw)?raw:'XXX';
  const value=Number(amount);
  try { return new Intl.NumberFormat('en-AU', { style:'currency', currency:safeCurrency, maximumFractionDigits:2 }).format(Number.isFinite(value)?value:0); }
  catch { return `${safeCurrency} ${(Number.isFinite(value)?value:0).toFixed(2)}`; }
}
