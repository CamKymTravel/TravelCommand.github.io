const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 500;

const LAND_POLYGONS = Object.freeze([
  [[-168,72],[-140,70],[-125,56],[-112,50],[-97,49],[-82,53],[-60,48],[-52,34],[-66,20],[-85,16],[-101,23],[-117,31],[-126,42],[-145,58]],
  [[-81,12],[-68,9],[-54,-4],[-48,-19],[-55,-36],[-67,-55],[-76,-42],[-80,-18]],
  [[-53,83],[-24,82],[-20,69],[-42,60],[-61,63]],
  [[-11,36],[-5,55],[12,71],[31,71],[39,58],[58,54],[70,60],[92,74],[122,72],[147,59],[168,54],[178,45],[158,35],[140,36],[125,25],[108,20],[101,8],[80,8],[68,23],[53,28],[42,34],[31,41],[19,45],[8,43]],
  [[-17,36],[9,37],[31,31],[43,12],[40,-12],[29,-35],[16,-35],[2,-29],[-7,-12],[-15,12]],
  [[111,-10],[128,-12],[145,-20],[153,-37],[137,-44],[116,-35]],
  [[46,-13],[51,-17],[49,-26],[43,-24]],
  [[-8,50],[2,51],[1,58],[-6,58]],
  [[129,31],[145,44],[141,46],[131,36]],
  [[166,-34],[178,-38],[174,-47],[168,-45]],
  [[-180,-72],[-120,-70],[-60,-74],[0,-71],[60,-74],[120,-70],[180,-72],[180,-90],[-180,-90]]
]);

function svgNode(tag, attrs = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

export function projectCoordinate(lat, long, width = VIEWBOX_WIDTH, height = VIEWBOX_HEIGHT) {
  const latitude = Number(lat);
  const longitude = Number(long);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude out of range');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude out of range');
  return {
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height
  };
}

function polygonPoints(points) {
  return points.map(([long, lat]) => {
    const { x, y } = projectCoordinate(lat, long);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function validPoint(point) {
  return Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.long));
}

export function buildMapGeometry(model) {
  const routeByItinerary = new Map();
  for (const point of model.routePoints || []) {
    if (!validPoint(point)) continue;
    if (!routeByItinerary.has(point.itineraryId)) routeByItinerary.set(point.itineraryId, []);
    routeByItinerary.get(point.itineraryId).push(point);
  }
  for (const points of routeByItinerary.values()) points.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  const points = [];
  const segments = [];
  let previousStandardAnchor = null;

  for (const stay of model.stays || []) {
    const detailed = routeByItinerary.get(stay.id) || [];
    const stayAnchor = validPoint(stay) ? { ...stay, kind:'stay' } : null;
    const pathPoints = [];
    if (stayAnchor) pathPoints.push(stayAnchor);
    for (const point of detailed) pathPoints.push({ ...point, travelType: stay.travelType, kind:'route' });

    if (stay.travelType === 'standard') {
      const anchor = stayAnchor || detailed[0] || null;
      if (anchor) {
        const normalized = { ...anchor, travelType:'standard', name: anchor.name || stay.name, itineraryId:stay.id };
        points.push(normalized);
        if (previousStandardAnchor) segments.push({ from:previousStandardAnchor, to:normalized, travelType:'standard', itineraryId:stay.id });
        previousStandardAnchor = normalized;
      }
      continue;
    }

    if (pathPoints.length) {
      const normalized = pathPoints.map(point => ({ ...point, travelType:stay.travelType, itineraryId:stay.id }));
      points.push(...normalized);
      for (let index = 1; index < normalized.length; index += 1) {
        segments.push({ from:normalized[index - 1], to:normalized[index], travelType:stay.travelType, itineraryId:stay.id });
      }
      previousStandardAnchor = normalized.at(-1);
    }
  }

  return { points, segments };
}

export function renderOfflineMap(model, { ariaLabel = 'Offline journey map' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'offline-map';

  const svg = svgNode('svg', { viewBox:`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`, role:'img', 'aria-label':ariaLabel, preserveAspectRatio:'xMidYMid meet' });
  const defs = svgNode('defs');
  const glow = svgNode('filter', { id:'mapPointGlow', x:'-100%', y:'-100%', width:'300%', height:'300%' });
  glow.append(svgNode('feGaussianBlur', { stdDeviation:'4', result:'blur' }));
  defs.append(glow);
  svg.append(defs);

  const ocean = svgNode('rect', { x:0, y:0, width:VIEWBOX_WIDTH, height:VIEWBOX_HEIGHT, class:'offline-map-ocean' });
  svg.append(ocean);

  const grid = svgNode('g', { class:'offline-map-grid', 'aria-hidden':'true' });
  for (let long = -120; long <= 120; long += 60) {
    const a = projectCoordinate(-80, long);
    const b = projectCoordinate(80, long);
    grid.append(svgNode('line', { x1:a.x, y1:a.y, x2:b.x, y2:b.y }));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const a = projectCoordinate(lat, -180);
    const b = projectCoordinate(lat, 180);
    grid.append(svgNode('line', { x1:a.x, y1:a.y, x2:b.x, y2:b.y }));
  }
  svg.append(grid);

  const land = svgNode('g', { class:'offline-map-land', 'aria-hidden':'true' });
  for (const polygon of LAND_POLYGONS) land.append(svgNode('polygon', { points:polygonPoints(polygon) }));
  svg.append(land);

  const { points, segments } = buildMapGeometry(model);
  const routes = svgNode('g', { class:'offline-map-routes', 'aria-hidden':'true' });
  for (const segment of segments) {
    const from = projectCoordinate(segment.from.lat, segment.from.long);
    const to = projectCoordinate(segment.to.lat, segment.to.long);
    routes.append(svgNode('line', { x1:from.x, y1:from.y, x2:to.x, y2:to.y, class:`offline-map-line offline-map-line-${segment.travelType}` }));
  }
  svg.append(routes);

  const markers = svgNode('g', { class:'offline-map-markers' });
  for (const point of points) {
    const projected = projectCoordinate(point.lat, point.long);
    const group = svgNode('g', { class:`offline-map-marker offline-map-marker-${point.travelType}` });
    group.append(svgNode('circle', { cx:projected.x, cy:projected.y, r:8, class:'offline-map-marker-glow', 'aria-hidden':'true' }));
    group.append(svgNode('circle', { cx:projected.x, cy:projected.y, r:4.4, class:'offline-map-marker-core' }));
    const label = svgNode('text', { x:projected.x + 9, y:projected.y - 8, class:'offline-map-label' });
    label.textContent = point.name || '';
    group.append(label);
    markers.append(group);
  }
  svg.append(markers);

  if (!points.length) {
    const text = svgNode('text', { x:500, y:250, 'text-anchor':'middle', class:'offline-map-empty' });
    text.textContent = 'No mapped coordinates for this filter';
    svg.append(text);
  }

  wrap.append(svg);
  return wrap;
}
