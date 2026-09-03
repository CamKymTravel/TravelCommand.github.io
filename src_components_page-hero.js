import { formatAUDate } from './src_core_dates.js';
let indexPromise = null;
let archivePromise = null;
const objectUrls = new Map();

function normalizeCountry(country = '') {
  const aliases = {
    'türkiye':'turkey', 'turkiye':'turkey', 'usa':'united-states', 'u.s.a.':'united-states', 'us':'united-states', 'u.s.':'united-states', 'united states of america':'united-states',
    'uk':'united-kingdom', 'u.k.':'united-kingdom', 'czechia':'czech-republic', 'uae':'united-arab-emirates', 'u.a.e.':'united-arab-emirates', 'south korea':'south-korea',
    'north macedonia':'north-macedonia', 'new zealand':'new-zealand', 'south africa':'south-africa',
    'dominican republic':'dominican-republic', 'costa rica':'costa-rica', 'sri lanka':'sri-lanka', 'taiwan':'taiwan'
  };
  const raw = String(country || '').normalize('NFC').trim().toLocaleLowerCase('en-AU');
  if (aliases[raw]) return aliases[raw];
  return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function keyForStay(stay) {
  if (!stay) return 'home-hero';
  const type = String(stay.travelType || '').toLowerCase();
  if (type === 'cruise') return 'banner-cruise-princess';
  if (type === 'motorhome' || type === 'rv') {
    const explicit=normalizeCountry(stay.startCountry);
    if(explicit) return explicit === 'united-states' ? 'banner-motorhome-usa' : 'banner-motorhome-europe';
    const startCity=String(stay.startCity||'').trim().toLocaleLowerCase('en-AU');
    return ['miami','nashville','dallas','los angeles','new york'].includes(startCity) ? 'banner-motorhome-usa' : 'banner-motorhome-europe';
  }
  return `banner-${normalizeCountry(stay.country)}`;
}

async function loadIndex() {
  if (!indexPromise) indexPromise = fetch('./header-index.json').then(response => {
    if (!response.ok) throw new Error('Header index unavailable');
    return response.json();
  });
  return indexPromise;
}

async function loadArchive() {
  if (!archivePromise) archivePromise = fetch('./header-assets.bin').then(response => {
    if (!response.ok) throw new Error('Header archive unavailable');
    return response.arrayBuffer();
  });
  return archivePromise;
}

export async function headerUrl(key) {
  if (objectUrls.has(key)) return objectUrls.get(key);
  const [index, buffer] = await Promise.all([loadIndex(), loadArchive()]);
  const entry = index[key];
  if (!entry) return null;
  const bytes = buffer.slice(entry.offset, entry.offset + entry.length);
  const url = URL.createObjectURL(new Blob([bytes], { type:entry.mime || 'image/jpeg' }));
  objectUrls.set(key, url);
  return url;
}

export function applyHeaderImage(element, key, { position = 'center center' } = {}) {
  element.classList.add('tcc-image-hero');
  element.dataset.headerKey = key;
  element.style.setProperty('--hero-position', position);
  headerUrl(key).then(url => {
    if (!url || !element.isConnected || element.dataset.headerKey !== key) return;
    element.style.setProperty('--hero-image', `url("${url}")`);
    element.dataset.imageReady = 'true';
  }).catch(() => {});
  return element;
}

export function applyStayHeaderImage(element, stay, options = {}) {
  return applyHeaderImage(element, keyForStay(stay), options);
}

export function createPageHero({ key, eyebrow = '', title = '', subtitle = '', className = '', actions = null, position = 'center center' }) {
  const section = document.createElement('section');
  section.className = `tcc-page-hero ${className}`.trim();
  const copy = document.createElement('div');
  copy.className = 'tcc-page-hero-copy';
  if (eyebrow) {
    const label = document.createElement('p'); label.className = 'eyebrow'; label.textContent = eyebrow; copy.append(label);
  }
  if (title) { const h = document.createElement('h1'); h.textContent = title; copy.append(h); }
  if (subtitle) { const p = document.createElement('p'); p.className = 'tcc-page-hero-subtitle'; p.textContent = subtitle; copy.append(p); }
  section.append(copy);
  if (actions) section.append(actions);
  applyHeaderImage(section, key, { position });
  return section;
}

export { keyForStay };

export function createStayBanner({ currentStay = null, nextDestination = null, navigate = null, className = '' } = {}) {
  const section = document.createElement('section');
  section.className = `tcc-stay-banner ${className}`.trim();
  applyStayHeaderImage(section, currentStay, { position:'center center' });
  const card = (kind, label) => { const el=document.createElement(kind === 'next' && nextDestination && navigate ? 'button' : 'div'); el.className=`tcc-stay-banner-card tcc-stay-banner-${kind}`; if(el.tagName==='BUTTON') el.type='button'; const k=document.createElement('p'); k.className='eyebrow'; k.textContent=label; el.append(k); return el; };
  const current=card('current','CURRENT STAY');
  if (currentStay) {
    const name=document.createElement('strong'); name.className='tcc-stay-banner-name'; name.textContent=`${currentStay.name || currentStay.title}${currentStay.country ? `, ${currentStay.country}` : ''}`;
    const dates=document.createElement('span'); dates.textContent=currentStay.dates || (currentStay.startDate&&currentStay.endDate?`${formatAUDate(currentStay.startDate)} – ${formatAUDate(currentStay.endDate)}`:'');
    current.append(name,dates);
    if (Number.isFinite(Number(currentStay.remainingDays))) { const remaining=document.createElement('span'); remaining.className='tcc-stay-banner-detail'; remaining.textContent=`${Number(currentStay.remainingDays)} day${Number(currentStay.remainingDays)===1?'':'s'} remaining`; current.append(remaining); }
    if(currentStay.travelType==='cruise'||currentStay.travelType==='motorhome'||currentStay.travelType==='rv'){ const mode=document.createElement('span'); mode.className='tcc-stay-mode-marker'; mode.textContent=currentStay.travelType==='cruise'?'⚓ Cruise':'▣ Motorhome'; current.append(mode); }
    if (Number.isFinite(Number(currentStay.progress))) { const p=document.createElement('progress'); const progress=Math.max(0,Math.min(100,Number(currentStay.progress))); p.max=100; p.value=progress; p.setAttribute('aria-label','Days in current stay'); p.setAttribute('aria-valuetext',`${Math.round(progress)}% of current stay elapsed`); current.append(p); }
  } else { const empty=document.createElement('strong'); empty.textContent='No current stay'; current.append(empty); }
  const next=card('next','NEXT DESTINATION');
  if (nextDestination) {
    const name=document.createElement('strong'); name.className='tcc-stay-banner-name'; name.textContent=nextDestination.title || nextDestination.name || '';
    const date=document.createElement('span'); date.textContent=nextDestination.startDate ? `${formatAUDate(nextDestination.startDate)}${nextDestination.endDate ? ` – ${formatAUDate(nextDestination.endDate)}` : ''}` : (nextDestination.dates || '');
    next.append(name,date);
    if (Number.isFinite(Number(nextDestination.durationDays))) { const duration=document.createElement('span'); duration.className='tcc-stay-banner-detail'; duration.textContent=`${Number(nextDestination.durationDays)} day${Number(nextDestination.durationDays)===1?'':'s'} planned`; next.append(duration); }
    if (navigate && next.tagName === 'BUTTON') next.addEventListener('click',()=>navigate('itinerary',{collection:'itinerary',id:nextDestination.id}));
  } else { const empty=document.createElement('strong'); empty.textContent='Nothing planned'; next.append(empty); }
  section.append(current,next);
  return section;
}
