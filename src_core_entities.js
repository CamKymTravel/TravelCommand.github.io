import { createRecord } from './src_core_records.js';
import { TRAVEL_TYPES, RESERVATION_TYPES, RESERVATION_STATUSES, FLIGHT_SCOPES, EXPENSE_CATEGORIES } from './src_core_schema.js';
import { toISODate, validateDateOrDateTime } from './src_core_dates.js';
import { normalizeCoordinates } from './src_core_coordinates.js';

export function canonicalCountrySlug(country = '') {
  const aliases = {
    'türkiye':'turkey', 'turkiye':'turkey',
    'usa':'united-states', 'u.s.a.':'united-states', 'us':'united-states', 'u.s.':'united-states', 'united states of america':'united-states',
    'uk':'united-kingdom', 'u.k.':'united-kingdom', 'great britain':'united-kingdom',
    'england':'united-kingdom', 'scotland':'united-kingdom', 'wales':'united-kingdom', 'northern ireland':'united-kingdom',
    'uae':'united-arab-emirates', 'u.a.e.':'united-arab-emirates',
    'czech republic':'czechia',
    'the bahamas':'bahamas', 'the netherlands':'netherlands', 'the philippines':'philippines',
    'the united kingdom':'united-kingdom', 'the united states':'united-states'
  };
  const raw = String(country || '').normalize('NFC').trim().toLocaleLowerCase('en-AU');
  if (aliases[raw]) return aliases[raw];
  const slug = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return aliases[slug] || slug;
}

const DESTINATION_CURRENCY_BY_COUNTRY = Object.freeze({
  albania:'ALL', algeria:'DZD', argentina:'ARS', australia:'AUD', austria:'EUR', bahamas:'BSD',
  belgium:'EUR', brazil:'BRL', bulgaria:'EUR', cambodia:'KHR', canada:'CAD', chile:'CLP', china:'CNY',
  colombia:'COP', croatia:'EUR', cyprus:'EUR', czechia:'CZK', 'costa-rica':'CRC', denmark:'DKK',
  'dominican-republic':'DOP', egypt:'EGP', estonia:'EUR', finland:'EUR', france:'EUR', germany:'EUR',
  greece:'EUR', hungary:'HUF', iceland:'ISK', india:'INR', indonesia:'IDR', ireland:'EUR', italy:'EUR',
  jamaica:'JMD', japan:'JPY', jordan:'JOD', laos:'LAK', latvia:'EUR', liechtenstein:'CHF', lithuania:'EUR',
  luxembourg:'EUR', malaysia:'MYR', malta:'EUR', mexico:'MXN', monaco:'EUR', montenegro:'EUR', morocco:'MAD',
  netherlands:'EUR', 'new-zealand':'NZD', 'north-macedonia':'MKD', norway:'NOK', oman:'OMR', panama:'PAB',
  peru:'PEN', philippines:'PHP', poland:'PLN', portugal:'EUR', qatar:'QAR', romania:'RON', russia:'RUB',
  serbia:'RSD', singapore:'SGD', slovakia:'EUR', slovenia:'EUR', 'south-africa':'ZAR', 'south-korea':'KRW',
  spain:'EUR', 'sri-lanka':'LKR', sweden:'SEK', switzerland:'CHF', taiwan:'TWD', thailand:'THB', tunisia:'TND',
  turkey:'TRY', 'united-arab-emirates':'AED', 'united-kingdom':'GBP', 'united-states':'USD', vietnam:'VND',
  'bosnia-and-herzegovina':'BAM'
});

export function destinationCurrencyForCountry(country = '') {
  const slug = canonicalCountrySlug(country);
  return DESTINATION_CURRENCY_BY_COUNTRY[slug] || null;
}

function numeric(value, label, { min = 0, nullable = false } = {}) {
  if ((value == null || value === '') && nullable) return null;
  if (typeof value === 'boolean' || Array.isArray(value) || (typeof value === 'object' && value != null)) throw new Error(`${label} must be numeric`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) throw new Error(`${label} must be ${min} or greater`);
  if (Math.abs(number) > Number.MAX_SAFE_INTEGER) throw new Error(`${label} exceeds the safe numeric range`);
  return number;
}

export function createItineraryEntry(fields, options) {
  const coordinates = normalizeCoordinates(fields?.lat, fields?.long);
  if (typeof fields?.name !== 'string' || !fields.name.trim()) throw new Error('Itinerary name is required');
  if (!TRAVEL_TYPES.includes(fields.travelType)) throw new Error('Invalid travel type');
  if (!fields.startDate || !fields.endDate) throw new Error('Itinerary start and end dates are required');
  const startDate = toISODate(fields.startDate);
  const endDate = toISODate(fields.endDate);
  if (endDate < startDate) throw new Error('End date precedes start date');
  const startCity = typeof fields.startCity === 'string' ? fields.startCity.trim() : '';
  const routeTrip = fields.travelType === 'motorhome' || fields.travelType === 'cruise';
  const country = typeof fields.country === 'string' ? fields.country.trim() : '';
  if (!routeTrip && !country) throw new Error('Standard stays require a country');
  const startCountry = routeTrip && typeof fields.startCountry === 'string' ? fields.startCountry.trim() : '';
  if (routeTrip && /\s*(?:\/|→|->)\s*/.test(startCountry)) throw new Error('Itinerary starting country must name one explicit country, not a composite route');
  const destinationCountry = routeTrip ? startCountry : country;
  const localCurrency = destinationCurrencyForCountry(destinationCountry);
  if (!localCurrency) throw new Error(`Travel Command Centre does not yet have the offline local-currency mapping for ${destinationCountry || 'this destination'}. Add the country mapping before saving the itinerary so Kym is never asked to choose a currency manually.`);
  const previousCurrency = fields.localCurrency == null || fields.localCurrency === '' ? null : String(fields.localCurrency).trim().toUpperCase();
  let fixedLocalPerAUD = fields.fixedLocalPerAUD == null || fields.fixedLocalPerAUD === '' ? null : numeric(fields.fixedLocalPerAUD, 'Exchange rate', { min:Number.EPSILON });
  if (localCurrency === 'AUD') fixedLocalPerAUD = 1;
  else if (previousCurrency && previousCurrency !== localCurrency) fixedLocalPerAUD = null;
  const destinationBudgetAUD = numeric(fields.destinationBudgetAUD ?? 0, 'Destination budget');
  if (routeTrip && !startCity) throw new Error('Route trips require a starting city');
  if (routeTrip && !startCountry) throw new Error('Route trips require a starting country');
  return createRecord('itinerary', {
    name: fields.name.trim(),
    travelType: fields.travelType,
    startDate,
    endDate,
    startCity,
    startCountry,
    country: routeTrip ? '' : country,
    localCurrency,
    fixedLocalPerAUD,
    destinationBudgetAUD,
    notes: typeof fields.notes === 'string' ? fields.notes.trim() : '',
    lat: coordinates.lat,
    long: coordinates.long
  }, options);
}

export function createExpense(fields, options) {
  if (!EXPENSE_CATEGORIES.includes(fields.category)) throw new Error('Invalid expense category');
  if (!fields.date) throw new Error('Expense date is required');
  const budgetScope = fields.budgetScope === 'annual' ? 'annual' : 'destination';
  if (budgetScope === 'annual' && fields.category !== 'miscellaneous') throw new Error('Only Miscellaneous expenses can be charged directly to the Annual Budget');
  if (budgetScope === 'destination' && !fields.itineraryId) throw new Error('Destination expense requires an itinerary');
  const originalCurrencyInput = fields.originalCurrency == null || fields.originalCurrency === '' ? 'AUD' : fields.originalCurrency;
  if (typeof originalCurrencyInput !== 'string') throw new Error('Currency must be a valid 3-letter code');
  const originalCurrency = originalCurrencyInput.trim().toUpperCase();
  if (originalCurrency === 'XXX' || !/^[A-Z]{3}$/.test(originalCurrency)) throw new Error('Choose a real 3-letter currency code');
  if (budgetScope === 'annual' && originalCurrency !== 'AUD') throw new Error('Annual Budget expenses are entered directly in AUD');
  const originalAmount = numeric(fields.originalAmount ?? 0, 'Expense original amount');
  const audAmount = budgetScope === 'annual' ? originalAmount : numeric(fields.audAmount ?? 0, 'Expense AUD amount');
  if (originalAmount > 0 && audAmount <= 0) throw new Error('Expense AUD equivalent is required');
  return createRecord('expense', {
    budgetScope,
    itineraryId: budgetScope === 'annual' ? null : fields.itineraryId,
    date: toISODate(fields.date),
    category: fields.category,
    needsBudgetRepair: false,
    description: typeof fields.description === 'string' ? fields.description.trim() : '',
    originalCurrency,
    originalAmount,
    audAmount
  }, options);
}

export function createReservation(fields, options) {
  if (!RESERVATION_TYPES.includes(fields.type)) throw new Error('Invalid reservation type');
  const budgetScope = fields.budgetScope === 'destination' ? 'destination' : fields.budgetScope === 'annual' ? 'annual' : (fields.type === 'ticket' ? 'destination' : 'annual');
  if (budgetScope === 'destination' && !fields.itineraryId) throw new Error('Destination reservation requires an itinerary');
  if (!RESERVATION_STATUSES.includes(fields.status)) throw new Error('Invalid reservation status');
  const flightScope = fields.type === 'flight' ? (fields.flightScope || null) : null;
  if (flightScope != null && !FLIGHT_SCOPES.includes(flightScope)) throw new Error('Invalid flight classification');
  if (typeof fields.title !== 'string' || !fields.title.trim()) throw new Error('Reservation title is required');
  if (!fields.dateTime) throw new Error('Reservation date is required');
  const dateTime = validateDateOrDateTime(fields.dateTime);
  const originalCurrencyInput = fields.originalCurrency == null || fields.originalCurrency === '' ? 'AUD' : fields.originalCurrency;
  if (typeof originalCurrencyInput !== 'string') throw new Error('Currency must be a valid 3-letter code');
  const originalCurrency = originalCurrencyInput.trim().toUpperCase();
  if (originalCurrency === 'XXX' || !/^[A-Z]{3}$/.test(originalCurrency)) throw new Error('Choose a real 3-letter currency code');
  const originalAmount = numeric(fields.originalAmount ?? 0, 'Reservation original amount');
  const audAmount = numeric(fields.audAmount ?? 0, 'Reservation AUD amount');
  if (originalAmount > 0 && audAmount <= 0) throw new Error('Reservation AUD equivalent is required');
  return createRecord('reservation', {
    budgetScope,
    itineraryId: fields.itineraryId || null,
    type: fields.type,
    flightScope,
    title: fields.title.trim(),
    dateTime,
    originalCurrency,
    originalAmount,
    audAmount,
    audAmountManual: fields.budgetScope === 'annual' ? fields.audAmountManual === true : false,
    status: fields.status,
    needsBudgetRepair: false,
    bookingReference: typeof fields.bookingReference === 'string' ? fields.bookingReference.trim() : '',
    notes: typeof fields.notes === 'string' ? fields.notes.trim() : ''
  }, options);
}

export function createRoutePoint(fields, options) {
  if (!fields?.itineraryId) throw new Error('Route point requires an itinerary');
  if (typeof fields?.name !== 'string' || !fields.name.trim()) throw new Error('Route point name is required');
  const coordinates = normalizeCoordinates(fields.lat, fields.long, { allowEmpty:true });
  const order = numeric(fields.order ?? fields.sequence, 'Route point order', { min:1 });
  if (!Number.isInteger(order)) throw new Error('Route point order must be a whole number');
  return createRecord('route-point', {
    itineraryId: fields.itineraryId,
    name: fields.name.trim(),
    order,
    lat: coordinates.lat,
    long: coordinates.long
  }, options);
}
