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


const OFFLINE_PLACES = Object.freeze([
  ['melbourne','Melbourne',-37.8136,144.9631],['sydney','Sydney',-33.8688,151.2093],['brisbane','Brisbane',-27.4698,153.0251],['perth','Perth',-31.9523,115.8613],
  ['denpasar','Denpasar / Bali',-8.65,115.2167],['bali','Bali',-8.4095,115.1889],['seminyak','Seminyak',-8.6913,115.1682],['ubud','Ubud',-8.5069,115.2625],['sanur','Sanur',-8.6705,115.262],['amed','Amed',-8.3405,115.6526],['nusa lembongan','Nusa Lembongan',-8.6785,115.4555],['nusa penida','Nusa Penida',-8.7278,115.5444],['nusa dua','Nusa Dua',-8.8005,115.2302],
  ['bangkok','Bangkok',13.7563,100.5018],['chiang mai','Chiang Mai',18.7883,98.9853],['phuket','Phuket',7.8804,98.3923],['hanoi','Hanoi',21.0278,105.8342],['ho chi minh','Ho Chi Minh City',10.8231,106.6297],['saigon','Ho Chi Minh City',10.8231,106.6297],['da nang','Da Nang',16.0544,108.2022],
  ['tokyo','Tokyo',35.6762,139.6503],['kyoto','Kyoto',35.0116,135.7681],['osaka','Osaka',34.6937,135.5023],
  ['paris','Paris',48.8566,2.3522],['amsterdam','Amsterdam',52.3676,4.9041],['brussels','Brussels',50.8503,4.3517],['london','London',51.5074,-0.1278],['berlin','Berlin',52.52,13.405],['munich','Munich',48.1351,11.582],['frankfurt','Frankfurt',50.1109,8.6821],['hamburg','Hamburg',53.5511,9.9937],
  ['vienna','Vienna',48.2082,16.3738],['salzburg','Salzburg',47.8095,13.055],['innsbruck','Innsbruck',47.2692,11.4041],['dolomites','Dolomites',46.5405,11.796],['black forest','Black Forest',48.2767,8.188],['zurich','Zurich',47.3769,8.5417],['lucerne','Lucerne',47.0502,8.3093],['vaduz','Vaduz',47.141,9.5209],['prague','Prague',50.0755,14.4378],['budapest','Budapest',47.4979,19.0402],['zagreb','Zagreb',45.815,15.9819],['dubrovnik','Dubrovnik',42.6507,18.0944],['rome','Rome',41.9028,12.4964],['venice','Venice',45.4408,12.3155],['florence','Florence',43.7696,11.2558],
  ['athens','Athens',37.9838,23.7275],['cairo','Cairo',30.0444,31.2357],['alexandria','Alexandria',31.2001,29.9187],['luxor','Luxor',25.6872,32.6396],['amman','Amman',31.9539,35.9106],['nicosia','Nicosia',35.1856,33.3823],
  ['moscow','Moscow',55.7558,37.6173],['st petersburg','St Petersburg',59.9311,30.3609],['saint petersburg','St Petersburg',59.9311,30.3609],['istanbul','Istanbul',41.0082,28.9784],
  ['barcelona','Barcelona',41.3874,2.1686],['valencia','Valencia',39.4699,-0.3763],['lisbon','Lisbon',38.7223,-9.1393],['porto','Porto',41.1579,-8.6291],['marrakech','Marrakech',31.6295,-7.9811],['casablanca','Casablanca',33.5731,-7.5898],['algiers','Algiers',36.7538,3.0588],
  ['new york','New York',40.7128,-74.006],['miami','Miami',25.7617,-80.1918],['dallas','Dallas',32.7767,-96.797],['los angeles','Los Angeles',34.0522,-118.2437],['san francisco','San Francisco',37.7749,-122.4194],['las vegas','Las Vegas',36.1699,-115.1398]
]);

const OFFLINE_PLACE_COUNTRIES = Object.freeze({
  'Melbourne':'Australia','Sydney':'Australia','Brisbane':'Australia','Perth':'Australia',
  'Denpasar / Bali':'Indonesia','Bali':'Indonesia','Seminyak':'Indonesia','Ubud':'Indonesia','Sanur':'Indonesia','Amed':'Indonesia','Nusa Lembongan':'Indonesia','Nusa Penida':'Indonesia','Nusa Dua':'Indonesia',
  'Bangkok':'Thailand','Chiang Mai':'Thailand','Phuket':'Thailand','Hanoi':'Vietnam','Ho Chi Minh City':'Vietnam','Da Nang':'Vietnam',
  'Tokyo':'Japan','Kyoto':'Japan','Osaka':'Japan',
  'Paris':'France','Amsterdam':'Netherlands','Brussels':'Belgium','London':'United Kingdom',
  'Berlin':'Germany','Munich':'Germany','Frankfurt':'Germany','Hamburg':'Germany',
  'Vienna':'Austria','Salzburg':'Austria','Innsbruck':'Austria','Dolomites':'Italy','Black Forest':'Germany','Zurich':'Switzerland','Lucerne':'Switzerland','Vaduz':'Liechtenstein',
  'Prague':'Czechia','Budapest':'Hungary','Zagreb':'Croatia','Dubrovnik':'Croatia',
  'Rome':'Italy','Venice':'Italy','Florence':'Italy','Athens':'Greece',
  'Cairo':'Egypt','Alexandria':'Egypt','Luxor':'Egypt','Amman':'Jordan','Nicosia':'Cyprus',
  'Moscow':'Russia','St Petersburg':'Russia','Istanbul':'Turkey',
  'Barcelona':'Spain','Valencia':'Spain','Lisbon':'Portugal','Porto':'Portugal',
  'Marrakech':'Morocco','Casablanca':'Morocco','Algiers':'Algeria',
  'New York':'United States','Miami':'United States','Dallas':'United States','Los Angeles':'United States','San Francisco':'United States','Las Vegas':'United States'
});

function normalizedPlaceText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

export function resolveOfflinePlace(value) {
  const query=normalizedPlaceText(value);
  if(!query) return null;
  let best=null;
  for(const [key,label,lat,long] of OFFLINE_PLACES){
    if(query===key) return {name:label,lat,long,source:'offline-gazetteer'};
    if(query.includes(key) && (!best || key.length>best.key.length)) best={key,label,lat,long};
  }
  return best ? {name:best.label,lat:best.lat,long:best.long,source:'offline-gazetteer'} : null;
}

export function countryForOfflinePlace(value) {
  const resolved=resolveOfflinePlace(value);
  return resolved ? (OFFLINE_PLACE_COUNTRIES[resolved.name] || '') : '';
}
