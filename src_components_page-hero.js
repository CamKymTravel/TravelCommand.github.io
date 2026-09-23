import { formatAUDate } from './src_core_dates.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';
import { canonicalCountrySlug } from './src_core_entities.js';
let indexPromise = null;
let archivePromise = null;
const objectUrls = new Map();
// These supplied header artworks contain baked title treatment. Mark them so
// the shared CSS can fit the full artwork and place one readable live title
// treatment over the left side without stretching/cropping the image.
const BAKED_HEADER_ART_KEYS = new Set(['header-journey-history','header-checklist','header-settings','header-vault']);
// These three were repeatedly showing Safari edge seams when painted through a
// pseudo-element background. Render them as one real overscanned image layer.
const FRAMELESS_BAKED_HEADER_KEYS = new Set(['header-journey-history','header-checklist','header-vault']);
const TRAVEL_MODE_HEADER_KEYS = new Set(['banner-cruise-princess','banner-motorhome-europe','banner-motorhome-usa']);

// Destination photography is deliberately allowed to crop vertically so it
// fills the wide iPad hero without the grey/empty side bands produced by
// `contain`.  These focal points protect low/vertical landmarks on the few
// country images where a dead-centre crop is less flattering.  All other
// country banners use the audited `center 54%` default.
const HEADER_FOCAL_POINTS = new Map([
  // 13 Sep 2026 — S14 full country-header focal audit. Every packed country
  // banner has an explicit vertical focal point so wide iPad `cover` crops are
  // deterministic at both approved landscape sizes instead of inheriting one
  // generic crop. Values were visually checked against the packed artwork at
  // the stricter ~4.55:1 hero ratio used by the smaller iPad viewport.
  ['banner-albania','center 58%'],
  ['banner-algeria','center 54%'],
  ['banner-argentina','center 54%'],
  ['banner-australia','center 58%'],
  ['banner-austria','center 56%'],
  ['banner-bahamas','center 54%'],
  ['banner-belgium','center 56%'],
  ['banner-bosnia-and-herzegovina','center 56%'],
  ['banner-brazil','center 58%'],
  ['banner-bulgaria','center 54%'],
  ['banner-cambodia','center 58%'],
  ['banner-canada','center 54%'],
  ['banner-chile','center 56%'],
  ['banner-china','center 56%'],
  ['banner-colombia','center 58%'],
  ['banner-costa-rica','center 54%'],
  ['banner-croatia','center 54%'],
  ['banner-cyprus','center 54%'],
  ['banner-czech-republic','center 58%'],
  ['banner-denmark','center 56%'],
  ['banner-dominican-republic','center 54%'],
  ['banner-egypt','center 61%'],
  ['banner-estonia','center 58%'],
  ['banner-finland','center 58%'],
  ['banner-france','center 57%'],
  ['banner-germany','center 54%'],
  ['banner-greece','center 54%'],
  ['banner-hungary','center 56%'],
  ['banner-iceland','center 54%'],
  ['banner-india','center 58%'],
  ['banner-indonesia','center 54%'],
  ['banner-ireland','center 52%'],
  ['banner-italy','center 54%'],
  ['banner-jamaica','center 54%'],
  ['banner-japan','center 58%'],
  ['banner-jordan','center 58%'],
  ['banner-laos','center 56%'],
  ['banner-latvia','center 58%'],
  ['banner-liechtenstein','center 54%'],
  ['banner-lithuania','center 56%'],
  ['banner-luxembourg','center 54%'],
  ['banner-malaysia','center 58%'],
  ['banner-malta','center 56%'],
  ['banner-mexico','center 56%'],
  ['banner-monaco','center 54%'],
  ['banner-montenegro','center 54%'],
  ['banner-morocco','center 58%'],
  ['banner-netherlands','center 52%'],
  ['banner-new-zealand','center 54%'],
  ['banner-north-macedonia','center 56%'],
  ['banner-norway','center 54%'],
  ['banner-oman','center 58%'],
  ['banner-panama','center 54%'],
  ['banner-peru','center 58%'],
  ['banner-philippines','center 58%'],
  ['banner-poland','center 56%'],
  ['banner-portugal','center 58%'],
  ['banner-qatar','center 54%'],
  ['banner-romania','center 56%'],
  ['banner-russia','center 56%'],
  ['banner-serbia','center 54%'],
  ['banner-singapore','center 58%'],
  ['banner-slovakia','center 56%'],
  ['banner-slovenia','center 54%'],
  ['banner-south-africa','center 58%'],
  ['banner-south-korea','center 60%'],
  ['banner-spain','center 58%'],
  ['banner-sri-lanka','center 54%'],
  ['banner-sweden','center 56%'],
  ['banner-switzerland','center 56%'],
  ['banner-taiwan','center 58%'],
  ['banner-thailand','center 58%'],
  ['banner-tunisia','center 60%'],
  ['banner-turkey','center 58%'],
  ['banner-united-arab-emirates','center 58%'],
  ['banner-united-kingdom','center 58%'],
  ['banner-united-states','center 56%'],
  ['banner-vietnam','center 54%']
]);

function isCountryHeaderKey(key = '') {
  return String(key).startsWith('banner-') && !TRAVEL_MODE_HEADER_KEYS.has(String(key));
}

function defaultHeaderPosition(key = '') {
  if (isCountryHeaderKey(key)) return HEADER_FOCAL_POINTS.get(key) || 'center 56%';
  return 'center center';
}

function normalizeCountry(country = '') {
  // Header identity must use the same canonical country aliases as Itinerary,
  // currency inference, flags and country outlines. Keep only the one header-
  // archive naming exception here (Czechia is stored as czech-republic).
  const slug = canonicalCountrySlug(country);
  return slug === 'czechia' ? 'czech-republic' : slug;
}

function keyForStay(stay) {
  if (!stay) return null;
  const type = String(stay.travelType || '').toLowerCase();
  if (type === 'cruise') return 'banner-cruise-princess';
  if (type === 'motorhome' || type === 'rv') {
    // Header authority is trip geography, not a small city allow-list. Older
    // records may omit startCountry but still carry the trip country, so check
    // both before falling back to a conservative city hint.
    const tripCountry=normalizeCountry(stay.startCountry || stay.country);
    if(tripCountry) return tripCountry === 'united-states' ? 'banner-motorhome-usa' : 'banner-motorhome-europe';
    const startCity=String(stay.startCity||'').trim().toLocaleLowerCase('en-AU');
    const usaCityHints=['miami','nashville','dallas','los angeles','new york','chicago','phoenix','seattle','san francisco','las vegas','denver','boston','washington','orlando'];
    return usaCityHints.includes(startCity) ? 'banner-motorhome-usa' : 'banner-motorhome-europe';
  }
  return `banner-${normalizeCountry(stay.country)}`;
}

async function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch('./header-index.json').then(response => {
      if (!response.ok) throw new Error('Header index unavailable');
      return response.json();
    }).catch(error => {
      // A transient first-read failure (for example while Safari is handing
      // control to a freshly activated offline worker) must not poison every
      // country/cruise/RV header for the rest of the app session. Clear only
      // the failed shared read so the next rendered header can retry locally.
      indexPromise = null;
      throw error;
    });
  }
  return indexPromise;
}

async function loadArchive() {
  if (!archivePromise) {
    archivePromise = fetch('./header-assets.bin').then(response => {
      if (!response.ok) throw new Error('Header archive unavailable');
      return response.arrayBuffer();
    }).catch(error => {
      // Keep the successful 19 MiB packed archive shared, but never retain a
      // rejected fetch forever. A later screen/header render can safely retry
      // once the offline shell or device storage is available again.
      archivePromise = null;
      throw error;
    });
  }
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

export function applyHeaderImage(element, key, { position = null } = {}) {
  element.classList.add('tcc-image-hero');
  element.dataset.headerKey = key;
  if (BAKED_HEADER_ART_KEYS.has(key)) element.dataset.bakedHeaderArt = 'true';
  else delete element.dataset.bakedHeaderArt;
  // Main country photographs fill the wide hero; supplied baked artwork and
  // travel-mode composites remain fully visible.  Keep this as data rather
  // than a screen-specific CSS exception so every current/future header uses
  // the same fitting rule.
  element.dataset.headerFit = isCountryHeaderKey(key) ? 'cover' : 'contain';
  element.style.setProperty('--hero-position', position || defaultHeaderPosition(key));
  if (FRAMELESS_BAKED_HEADER_KEYS.has(key) && !element.querySelector(':scope > .tcc-baked-hero-image')) {
    const image = document.createElement('img');
    image.className = 'tcc-baked-hero-image';
    image.alt = '';
    image.setAttribute('aria-hidden','true');
    image.decoding = 'async';
    element.prepend(image);
  }
  headerUrl(key).then(url => {
    if (!url || !element.isConnected || element.dataset.headerKey !== key) return;
    if (FRAMELESS_BAKED_HEADER_KEYS.has(key)) {
      // These three physically cropped headers must have one paint path only.
      // Do not publish --hero-image: legacy pseudo/background rules are then
      // unable to repaint the same artwork or recreate an edge/frame.
      element.style.removeProperty('--hero-image');
      const image = element.querySelector(':scope > .tcc-baked-hero-image');
      if (image && image.src !== url) image.src = url;
    } else {
      element.style.setProperty('--hero-image', `url("${url}")`);
    }
    element.dataset.imageReady = 'true';
    // Expanded-card snapshots may have been cloned before the packed header
    // finished resolving. Publish one local readiness event so an already-open
    // enlarged copy can mirror the final offline background image.
    element.dispatchEvent(new Event('tcc-header-image-ready'));
  }).catch(() => {});
  return element;
}

export function applyStayHeaderImage(element, stay, options = {}) {
  if (!stay) {
    // A missing current stay must not masquerade as Indonesia (the historical
    // keyForStay(null) fallback) and must not reuse the obsolete baked-text
    // Home composite. Keep the established image-hero material/gradient only;
    // the banner copy remains the truthful No current stay / next destination.
    element.classList.add('tcc-image-hero');
    element.dataset.headerKey = 'no-current-stay';
    element.dataset.headerFit = 'none';
    element.style.setProperty('--hero-position', options.position || 'center center');
    return element;
  }
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

function flagCountryForStay(stay = null) {
  if (!stay) return '';
  const type = String(stay.travelType || '').toLowerCase();
  if (type === 'cruise' || type === 'motorhome' || type === 'rv') return stay.startCountry || stay.country || '';
  return stay.country || stay.startCountry || '';
}

export function createStayBanner({ currentStay = null, nextDestination = null, navigate = null, className = '' } = {}) {
  const section = document.createElement('section');
  section.className = `tcc-stay-banner ${className}`.trim();
  applyStayHeaderImage(section, currentStay);
  const card = (kind, label) => { const el=document.createElement('div'); el.className=`tcc-stay-banner-card tcc-stay-banner-${kind}`; const k=document.createElement('p'); k.className='eyebrow'; k.textContent=label; el.append(k); return el; };
  const current=card('current','CURRENT STAY');
  if (currentStay) {
    const identity=document.createElement('div'); identity.className='tcc-stay-banner-identity';
    const flag=document.createElement('span'); flag.className='tcc-stay-banner-flag'; flag.textContent=countryFlagEmoji(flagCountryForStay(currentStay)); flag.setAttribute('aria-hidden','true');
    const name=document.createElement('strong'); name.className='tcc-stay-banner-name'; const currentCountry=flagCountryForStay(currentStay); name.textContent=`${currentStay.name || currentStay.title}${currentCountry ? `, ${currentCountry}` : ''}`;
    identity.append(flag,name);
    const dates=document.createElement('span'); dates.textContent=currentStay.dates || (currentStay.startDate&&currentStay.endDate?`${formatAUDate(currentStay.startDate)} – ${formatAUDate(currentStay.endDate)}`:'');
    current.append(identity,dates);
    if (Number.isFinite(Number(currentStay.remainingDays))) { const remaining=document.createElement('span'); remaining.className='tcc-stay-banner-detail'; remaining.textContent=`${Number(currentStay.remainingDays)} day${Number(currentStay.remainingDays)===1?'':'s'} remaining`; current.append(remaining); }
    if(currentStay.travelType==='cruise'||currentStay.travelType==='motorhome'||currentStay.travelType==='rv'){ const mode=document.createElement('span'); mode.className='tcc-stay-mode-marker'; mode.append(createLineIcon(currentStay.travelType==='cruise'?'cruise':'rv'),document.createTextNode(currentStay.travelType==='cruise'?' Cruise':' Motorhome')); current.append(mode); }
    if (Number.isFinite(Number(currentStay.progress))) { const p=document.createElement('progress'); const progress=Math.max(0,Math.min(100,Number(currentStay.progress))); p.max=100; p.value=progress; p.setAttribute('aria-label','Days in current stay'); p.setAttribute('aria-valuetext',`${Math.round(progress)}% of current stay elapsed`); current.append(p); }
  } else { const empty=document.createElement('strong'); empty.textContent='No current stay'; current.append(empty); }
  const next=card('next','NEXT DESTINATION');
  if (nextDestination) {
    const identity=document.createElement('div'); identity.className='tcc-stay-banner-identity';
    const flag=document.createElement('span'); flag.className='tcc-stay-banner-flag'; flag.textContent=countryFlagEmoji(flagCountryForStay(nextDestination)); flag.setAttribute('aria-hidden','true');
    const name=document.createElement('strong'); name.className='tcc-stay-banner-name'; name.textContent=nextDestination.title || nextDestination.name || '';
    identity.append(flag,name);
    const date=document.createElement('span'); date.textContent=nextDestination.startDate ? `${formatAUDate(nextDestination.startDate)}${nextDestination.endDate ? ` – ${formatAUDate(nextDestination.endDate)}` : ''}` : (nextDestination.dates || '');
    next.append(identity,date);
    if (Number.isFinite(Number(nextDestination.durationDays))) { const duration=document.createElement('span'); duration.className='tcc-stay-banner-detail'; duration.textContent=`${Number(nextDestination.durationDays)} day${Number(nextDestination.durationDays)===1?'':'s'} planned`; next.append(duration); }
  } else { const empty=document.createElement('strong'); empty.textContent='Nothing planned'; next.append(empty); }
  section.append(current,next);
  return section;
}
