function indexById(records) { return new Map(records.map(record => [record.id, record])); }

export function validateRelationships(state) {
  const itinerary = indexById(state.itinerary);
  const reservations = indexById(state.reservations);
  const vault = indexById(state.vault);

  for (const point of state.routePoints) {
    if (point.itineraryId && !itinerary.has(point.itineraryId)) throw new Error(`routePoints: missing itinerary ${point.itineraryId}`);
  }
  for (const expense of state.expenses) {
    if (expense.itineraryId && !itinerary.has(expense.itineraryId)) throw new Error(`expenses: missing itinerary ${expense.itineraryId}`);
  }
  for (const reservation of state.reservations) {
    if (reservation.itineraryId && !itinerary.has(reservation.itineraryId)) throw new Error(`reservations: missing itinerary ${reservation.itineraryId}`);
  }
  for (const item of state.checklists || []) {
    if (item.itineraryId && !itinerary.has(item.itineraryId)) throw new Error(`checklists: missing itinerary ${item.itineraryId}`);
  }
  for (const record of state.journeyHistory || []) {
    if (record.itineraryId && !itinerary.has(record.itineraryId)) throw new Error(`journeyHistory: missing itinerary ${record.itineraryId}`);
  }
  for (const event of state.calendarEvents) {
    if (event.reservationId && !reservations.has(event.reservationId)) throw new Error(`calendarEvents: missing reservation ${event.reservationId}`);
    if (event.itineraryId && !itinerary.has(event.itineraryId)) throw new Error(`calendarEvents: missing itinerary ${event.itineraryId}`);
  }
  for (const attachment of state.attachments) {
    if (attachment.vaultRecordId && !vault.has(attachment.vaultRecordId)) throw new Error(`attachments: missing vault record ${attachment.vaultRecordId}`);
  }
  return true;
}
