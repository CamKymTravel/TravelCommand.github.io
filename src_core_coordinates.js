export function normalizeCoordinates(lat, long, { allowEmpty = true } = {}) {
  const latEmpty = lat == null || lat === '';
  const longEmpty = long == null || long === '';
  if (latEmpty && longEmpty && allowEmpty) return { lat:null, long:null };
  if (latEmpty !== longEmpty) throw new Error('Latitude and longitude must be supplied together');
  const latitude = Number(lat);
  const longitude = Number(long);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude out of range');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude out of range');
  return { lat:latitude, long:longitude };
}
