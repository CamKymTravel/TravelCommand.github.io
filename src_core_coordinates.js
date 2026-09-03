export function normalizeCoordinates(lat, long, { allowEmpty = true } = {}) {
  const latEmpty = lat == null || lat === '';
  const longEmpty = long == null || long === '';
  if (latEmpty && longEmpty && allowEmpty) return { lat:null, long:null };
  if (latEmpty !== longEmpty) throw new Error('Latitude and longitude must be supplied together');
  if (typeof lat === 'boolean' || typeof long === 'boolean' || Array.isArray(lat) || Array.isArray(long) || (typeof lat === 'object' && lat != null) || (typeof long === 'object' && long != null)) throw new Error('Latitude and longitude must be numeric');
  const latitude = typeof lat === 'number' ? lat : (typeof lat === 'string' && lat.trim() !== '' ? Number(lat) : NaN);
  const longitude = typeof long === 'number' ? long : (typeof long === 'string' && long.trim() !== '' ? Number(long) : NaN);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude out of range');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude out of range');
  return { lat:latitude, long:longitude };
}
