import { createRecord } from './src_core_records.js';
import { TRAVEL_TYPES, RESERVATION_TYPES, RESERVATION_STATUSES } from './src_core_schema.js';
import { toISODate, validateDateTime } from './src_core_dates.js';
import { allowedExpenseAllocations } from './src_core_budget.js';
import { normalizeCoordinates } from './src_core_coordinates.js';

export function createItineraryEntry(fields, options) {
  const coordinates = normalizeCoordinates(fields?.lat, fields?.long);
  if (!fields?.name?.trim()) throw new Error('Itinerary name is required');
  if (!TRAVEL_TYPES.includes(fields.travelType)) throw new Error('Invalid travel type');
  const startDate = toISODate(fields.startDate);
  const endDate = toISODate(fields.endDate);
  if (new Date(endDate) < new Date(startDate)) throw new Error('End date precedes start date');
  const startCity = fields.startCity?.trim() || '';
  const fixedLocalPerAUD = fields.fixedLocalPerAUD == null || fields.fixedLocalPerAUD === '' ? null : Number(fields.fixedLocalPerAUD);
  const destinationBudgetAUD = Number(fields.destinationBudgetAUD || 0);
  if ((fields.travelType === 'motorhome' || fields.travelType === 'cruise') && !startCity) throw new Error('Route trips require a starting city');
  if (fixedLocalPerAUD != null && (!Number.isFinite(fixedLocalPerAUD) || fixedLocalPerAUD <= 0)) throw new Error('Exchange rate must be greater than zero');
  if (!Number.isFinite(destinationBudgetAUD) || destinationBudgetAUD < 0) throw new Error('Destination budget cannot be negative');
  return createRecord('itinerary', {
    name: fields.name.trim(),
    travelType: fields.travelType,
    startDate,
    endDate,
    startCity,
    country: fields.country?.trim() || '',
    localCurrency: fields.localCurrency?.trim().toUpperCase() || null,
    fixedLocalPerAUD,
    destinationBudgetAUD,
    lat: coordinates.lat,
    long: coordinates.long
  }, options);
}

export function createExpense(fields, options) {
  const allowed = allowedExpenseAllocations(fields.category);
  if (!allowed.includes(fields.allocation)) throw new Error(`Allocation ${fields.allocation} is not allowed for ${fields.category}`);
  if (fields.allocation === 'destination' && !fields.itineraryId) throw new Error('Destination expense requires an itinerary');
  const originalAmount = Number(fields.originalAmount ?? 0);
  const audAmount = Number(fields.audAmount ?? 0);
  if (!Number.isFinite(originalAmount) || originalAmount < 0) throw new Error('Expense original amount must be zero or greater');
  if (!Number.isFinite(audAmount) || audAmount < 0) throw new Error('Expense AUD amount must be zero or greater');
  return createRecord('expense', {
    itineraryId: fields.itineraryId || null,
    date: toISODate(fields.date),
    category: fields.category,
    allocation: fields.allocation,
    description: fields.description?.trim() || '',
    originalCurrency: fields.originalCurrency?.toUpperCase() || 'AUD',
    originalAmount,
    audAmount
  }, options);
}

export function createReservation(fields, options) {
  if (!RESERVATION_TYPES.includes(fields.type)) throw new Error('Invalid reservation type');
  if (fields.allocation != null && !['destination','annual'].includes(fields.allocation)) throw new Error('Invalid reservation allocation');
  if (fields.allocation === 'destination' && !fields.itineraryId) throw new Error('Destination reservation requires an itinerary');
  if (!RESERVATION_STATUSES.includes(fields.status)) throw new Error('Invalid reservation status');
  if (!fields.title?.trim()) throw new Error('Reservation title is required');
  if (fields.dateTime) validateDateTime(fields.dateTime);
  const originalAmount = Number(fields.originalAmount ?? 0);
  const audAmount = Number(fields.audAmount ?? 0);
  if (!Number.isFinite(originalAmount) || originalAmount < 0) throw new Error('Reservation original amount must be zero or greater');
  if (!Number.isFinite(audAmount) || audAmount < 0) throw new Error('Reservation AUD amount must be zero or greater');
  return createRecord('reservation', {
    itineraryId: fields.itineraryId || null,
    type: fields.type,
    title: fields.title.trim(),
    dateTime: fields.dateTime || null,
    originalCurrency: fields.originalCurrency?.trim().toUpperCase() || 'AUD',
    originalAmount,
    audAmount,
    status: fields.status,
    allocation: fields.allocation || null,
    notes: fields.notes?.trim() || ''
  }, options);
}

export function createRoutePoint(fields, options) {
  if (!fields?.itineraryId) throw new Error('Route point requires an itinerary');
  if (!fields?.name?.trim()) throw new Error('Route point name is required');
  const coordinates = normalizeCoordinates(fields.lat, fields.long, { allowEmpty:false });
  return createRecord('route-point', {
    itineraryId: fields.itineraryId,
    name: fields.name?.trim() || '',
    order: Number(fields.order ?? fields.sequence ?? 0),
    lat: coordinates.lat,
    long: coordinates.long
  }, options);
}
