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
  const safeValue=Number.isFinite(value)?value:0;
  // XXX is the explicit legacy-repair/unknown-currency sentinel. Intl formats
  // it as the generic currency sign (¤), which is too ambiguous for a repair
  // surface. Keep the unknown code visible; real currencies still use Intl.
  if(safeCurrency==='XXX')return `XXX ${safeValue.toFixed(2)}`;
  try { return new Intl.NumberFormat('en-AU', { style:'currency', currency:safeCurrency, maximumFractionDigits:2 }).format(safeValue); }
  catch { return `${safeCurrency} ${safeValue.toFixed(2)}`; }
}
