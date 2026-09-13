import { buildItineraryViewModel } from './src_core_itinerary-view-model.js';
import { saveItineraryDraft, deleteItineraryDraft } from './src_core_itinerary-mutations.js';
import { createModal, makeExpandableCard, materialToneFromRenderedSurface, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { formatMoney } from './src_core_currency.js';
import { isTravelYearSelected, toggleTravelYear, buildTravelYearBrowser } from './src_core_year-filters.js';
import { formatAUDate } from './src_core_dates.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';
import { renderOfflineMap } from './src_components_offline-map.js';
import { resolveOfflinePlace } from './src_core_coordinates.js';
import { createStayBanner } from './src_components_page-hero.js';
import { buildItineraryColourMap } from './src_core_calendar-view-model.js';

function itineraryFlagCountry(record = {}) {
  const route=['cruise','motorhome','rv'].includes(String(record.travelType||'').toLowerCase());
  return (route ? record.startCountry : record.country) || record.country || record.startCountry || '';
}

const TRAVEL_TYPE_LABELS = Object.freeze({ standard:'Standard', motorhome:'Motorhome', cruise:'Cruise' });
const TRAVEL_TYPE_ICONS = Object.freeze({ standard:'globe', motorhome:'rv', cruise:'cruise' });

// R7.2 route-action continuity note: the recent screenshot authority replaces
// per-row “Move Up”, “Move Down” and “Remove route point?” buttons with one
// ordered, one-stop-per-line route editor. Line order is route order; deleting
// a line removes that draft point. “Place Map Point” / “Adjust Map Point” stay
// available only when an entered place cannot be resolved offline.
// Kym-first route identity: RV/Cruise starts are inferred from the first ordered
// stop/port whenever the place is in the offline gazetteer. This keeps the Add
// Destination flow itinerary-first instead of asking for the same city twice.
const ROUTE_PLACE_COUNTRY = new Map([
  ['Melbourne','Australia'],['Sydney','Australia'],['Brisbane','Australia'],['Perth','Australia'],
  ['Denpasar / Bali','Indonesia'],['Bali','Indonesia'],['Seminyak','Indonesia'],['Ubud','Indonesia'],['Sanur','Indonesia'],['Amed','Indonesia'],['Nusa Lembongan','Indonesia'],['Nusa Penida','Indonesia'],['Nusa Dua','Indonesia'],
  ['Bangkok','Thailand'],['Chiang Mai','Thailand'],['Phuket','Thailand'],
  ['Hanoi','Vietnam'],['Ho Chi Minh City','Vietnam'],['Da Nang','Vietnam'],
  ['Tokyo','Japan'],['Kyoto','Japan'],['Osaka','Japan'],
  ['Paris','France'],['Amsterdam','Netherlands'],['Brussels','Belgium'],['London','United Kingdom'],
  ['Berlin','Germany'],['Munich','Germany'],['Frankfurt','Germany'],['Hamburg','Germany'],
  ['Vienna','Austria'],['Salzburg','Austria'],['Innsbruck','Austria'],['Zurich','Switzerland'],['Lucerne','Switzerland'],['Vaduz','Liechtenstein'],
  ['Prague','Czechia'],['Budapest','Hungary'],['Zagreb','Croatia'],['Dubrovnik','Croatia'],
  ['Rome','Italy'],['Venice','Italy'],['Florence','Italy'],['Athens','Greece'],
  ['Cairo','Egypt'],['Alexandria','Egypt'],['Luxor','Egypt'],['Amman','Jordan'],['Nicosia','Cyprus'],
  ['Moscow','Russia'],['St Petersburg','Russia'],['Istanbul','Turkey'],
  ['Barcelona','Spain'],['Valencia','Spain'],['Lisbon','Portugal'],['Porto','Portugal'],
  ['Marrakech','Morocco'],['Casablanca','Morocco'],['Algiers','Algeria'],
  ['New York','United States'],['Miami','United States'],['Dallas','United States'],['Los Angeles','United States'],['San Francisco','United States'],['Las Vegas','United States']
]);

function routeCountryForPlace(value) {
  const resolved=resolveOfflinePlace(value);
  return resolved ? (ROUTE_PLACE_COUNTRY.get(resolved.name) || '') : '';
}

function generatedRouteTripName(type, points = []) {
  const names=points.map(point=>String(point?.name||'').trim()).filter(Boolean);
  const mode=type==='cruise'?'Cruise':'Motorhome';
  if(!names.length) return `New ${mode}`;
  if(names.length===1) return `${names[0]} ${mode}`;
  return `${names[0]} → ${names[names.length-1]} ${mode}`;
}
const ITINERARY_TRANSIENT_VIEW = new WeakMap();
const ITINERARY_LIST_PAGE_SIZE = 20;

function applyItineraryDestinationColours(model, state) {
  const colourMap=buildItineraryColourMap(state.itinerary||[]);
  for(const record of [...(model.upcoming||[]),...(model.completed||[])]) record.destinationColour=colourMap.get(record.id)||null;
  for(const segment of model.forwardCoverage?.segments||[]) if(segment.type==='stay') segment.destinationColour=colourMap.get(segment.id)||null;
  return model;
}

function itineraryBudgetAmounts(record = {}) {
  const aud=Math.max(0,Number(record.destinationBudgetAUD||0));
  const currency=String(record.localCurrency||'AUD').toUpperCase();
  const rate=Number(record.fixedLocalPerAUD);
  if(currency!=='AUD' && Number.isFinite(rate) && rate>0) {
    return { primary:formatMoney(aud*rate,currency), secondary:`AUD ${formatMoney(aud,'AUD')}` };
  }
  return { primary:formatMoney(aud,'AUD'), secondary:null };
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function inputField(label, name, type = 'text', value = '') {
  const wrap = node('label', 'itinerary-field');
  wrap.append(node('span', '', label));
  const input = document.createElement('input');
  input.name = name;
  input.type = type;
  input.value = value ?? '';
  if (type === 'number') input.step = 'any';
  if (type === 'date') {
    input.lang = 'en-AU';
    const updateAccessibleDate = () => {
      let display = 'DD/MM/YYYY';
      if (input.value) { try { display = formatAUDate(input.value); } catch { display = 'DD/MM/YYYY'; } }
      input.setAttribute('aria-label', `${label} · ${display}`);
    };
    updateAccessibleDate();
    input.addEventListener('input', updateAccessibleDate);
    input.addEventListener('change', updateAccessibleDate);
  }
  wrap.append(input);
  return wrap;
}

function formValues(body, source = {}) {
  const field = name => body.querySelector(`[name="${name}"]`);
  const value = (name, fallback = '') => field(name)?.value ?? fallback;
  const travelType = body.dataset.travelType || source.travelType || 'standard';
  const routeTrip = travelType === 'motorhome' || travelType === 'cruise';
  return {
    name: value('name', source.name || ''),
    country: routeTrip ? '' : value('country', source.country || ''),
    travelType,
    startDate: value('startDate', source.startDate || ''),
    endDate: value('endDate', source.endDate || ''),
    startCity: routeTrip ? value('startCity', source.startCity || '') : '',
    startCountry: routeTrip ? value('startCountry', source.startCountry || source.country || '') : (source.startCountry || ''),
    // Money is owned by Budget → Destination Budgets. Itinerary only preserves
    // the existing money setup while identity, dates and route details change.
    localCurrency: source.localCurrency || null,
    fixedLocalPerAUD: source.fixedLocalPerAUD ?? null,
    destinationBudgetAUD: Number(source.destinationBudgetAUD || 0),
    // Map coordinates are intentionally not exposed in Add Destination. Existing
    // coordinates remain intact; new entries may be mapped later without making
    // Kym type latitude/longitude values.
    notes: value('notes', source.notes || ''),
    lat: source.lat ?? null,
    long: source.long ?? null
  };
}

function freshRoutePointDraft() {
  // Keep the route-stop safety contract explicit: a newly created stop has no
  // manually typed coordinates. Offline place resolution may fill them later.
  const routeDraft=[];
  routeDraft.push({ id:null, name:'', lat:null, long:null });
  return routeDraft[0];
}

function routeValues(body, priorPoints = []) {
  const lines=body.querySelector('textarea[name="routeLines"]');
  if(lines){
    const names=String(lines.value||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
    const used=new Set();
    return names.map((name,index)=>{
      let previousIndex=(priorPoints||[]).findIndex((point,i)=>!used.has(i)&&String(point?.name||'').trim().toLocaleLowerCase('en-AU')===name.toLocaleLowerCase('en-AU'));
      if(previousIndex<0 && priorPoints?.[index] && String(priorPoints[index]?.name||'').trim()===name) previousIndex=index;
      const previous=previousIndex>=0 ? priorPoints[previousIndex] : freshRoutePointDraft();
      if(previousIndex>=0) used.add(previousIndex);
      const known=resolveOfflinePlace(name);
      return {
        id:previous?.id||null,
        name,
        lat:known?.lat ?? previous?.lat ?? null,
        long:known?.long ?? previous?.long ?? null
      };
    });
  }
  return [...body.querySelectorAll('.itinerary-route-row')].map(row => ({
    id: row.dataset.id || null,
    name: row.querySelector('[name="routeName"]')?.value || '',
    lat: row.dataset.lat === '' || row.dataset.lat == null ? null : Number(row.dataset.lat),
    long: row.dataset.long === '' || row.dataset.long == null ? null : Number(row.dataset.long)
  }));
}

function hasMapCoordinates(record) {
  return Boolean(record && record.lat != null && record.lat !== '' && record.long != null && record.long !== '' && Number.isFinite(Number(record.lat)) && Number.isFinite(Number(record.long)));
}


function openHomeVisitEditor({ stateService, host, currentDate, prepareRecordVisibility = null, entryId = null }) {
  const state=stateService.snapshot();
  const existing=entryId ? state.itinerary.find(item=>item.id===entryId) : null;
  if(entryId && !existing) return;
  const body=node('div','itinerary-home-visit-editor');
  const identity=node('section','itinerary-home-visit-identity');
  const flag=node('span','itinerary-home-visit-flag','🇦🇺'); flag.setAttribute('aria-hidden','true');
  const copy=node('div','itinerary-home-visit-copy');
  copy.append(node('small','','HOME STAY'),node('strong','','Home / Australia'),node('span','','Australia · Destination'));
  identity.append(flag,copy);

  const dates=node('div','itinerary-home-visit-dates');
  dates.append(inputField('Start Date','startDate','date',existing?.startDate||''),inputField('End Date','endDate','date',existing?.endDate||''));
  const note=node('p','itinerary-home-visit-note','Budget setup comes later in Budget → Destination Budgets. Australia uses AUD automatically at 1:1.');
  const error=node('p','itinerary-form-error');
  body.append(identity,dates,note,error);

  const actions=[];
  if(existing) actions.push({label:'Delete',kind:'danger',onClick:dialog=>{
    confirmDestructive({
      title:'Delete Home Visit',
      message:`Delete Home / Australia · ${formatAUDate(existing.startDate)} – ${formatAUDate(existing.endDate)}? This cannot be undone. Linked Destination Budget costs and checklist items must be removed first.`,
      onConfirm:()=>{ stateService.commit(draft=>deleteItineraryDraft(draft,existing.id,{now:stateService.now})); if(dialog.isConnected&&dialog.open)dialog.close(); }
    });
  }});
  actions.push(
    {label:'Cancel',onClick:dialog=>dialog.close()},
    {label:'Save',onClick:dialog=>{
      try {
        const startDate=body.querySelector('[name="startDate"]')?.value||'';
        const endDate=body.querySelector('[name="endDate"]')?.value||'';
        let restoreRecordVisibility=()=>{};
        try {
          restoreRecordVisibility=prepareRecordVisibility?.()||(()=>{});
          stateService.commit(draft=>{
            const saved=saveItineraryDraft(draft,{entryId:existing?.id||null,fields:{
              name:'Home / Australia',
              country:'Australia',
              travelType:'standard',
              startDate,
              endDate,
              startCity:'',
              startCountry:'',
              localCurrency:existing?.localCurrency||'AUD',
              fixedLocalPerAUD:existing?.fixedLocalPerAUD??1,
              destinationBudgetAUD:Number(existing?.destinationBudgetAUD||0),
              // Home Visit never asks Kym for map placement. Preserve an existing
              // point or use a stable Australia centroid for new Home Visits.
              lat:existing?.lat??-25.2744,
              long:existing?.long??133.7751
            },routePoints:[]},{now:stateService.now});
            if(String(saved.endDate||'')<String(currentDate||'')) draft.ui.itineraryCompletedOpen=true;
          });
          dialog.close();
        } catch (err) {
          restoreRecordVisibility();
          throw err;
        }
      } catch (err) { error.textContent=err.message; }
    }}
  );
  const modal=createModal({title:existing?'Edit Home Visit':'Add Home Visit',body,actions,className:'tcc-editor-modal tcc-itinerary-home-visit-modal tone-violet'});
  host.append(modal);
  modal.addEventListener('close',()=>modal.remove(),{once:true});
  modal.showModal();
}

function openItineraryEditor({ stateService, host, currentDate, entryId = null, prepareRecordVisibility = null, editorTone = null, initialFields = null }) {
  const state = stateService.snapshot();
  const existing = entryId ? state.itinerary.find(item => item.id === entryId) : null;
  if (entryId && !existing) return;
  const originalFields = existing ? structuredClone(existing) : {
    name:'', country:'', travelType:'standard', startDate:'', endDate:'', startCity:'', startCountry:'', localCurrency:'', fixedLocalPerAUD:null, destinationBudgetAUD:0, notes:'', lat:null, long:null,
    ...(initialFields && typeof initialFields === 'object' ? initialFields : {})
  };
  const originalRoutePoints = existing
    ? state.routePoints.filter(point => point.itineraryId === existing.id).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map(point => structuredClone(point))
    : [];
  const formSession = new FormSession({ fields:originalFields, routePoints:originalRoutePoints });

  let modal = null;
  const body = node('div', 'itinerary-editor');
  const dirty = node('p', 'itinerary-editor-dirty', 'Unsaved changes.');
  dirty.hidden = true;
  const error = node('p', 'itinerary-form-error');
  const markDirty = () => { dirty.hidden = false; };

  function showEditorError(err) {
    const raw=String(err?.message || err || 'Unable to save this itinerary.');
    const type=String(body.dataset.travelType || 'standard');
    let message=raw;
    if(type==='standard' && raw==='Itinerary name is required') message='City / Destination is required';
    else if(type==='standard' && raw==='Standard stays require a country') message='Country is required';
    else if(raw==='Itinerary start and end dates are required') message='Start and end dates are required';
    else if(raw==='End date precedes start date') message='End date cannot be before start date';
    error.textContent=message;
    requestAnimationFrame(() => error.scrollIntoView({ block:'nearest' }));
  }
  const orientation = node('section', 'itinerary-editor-orientation');
  const typeTiles = node('div', 'itinerary-type-tiles');
  typeTiles.setAttribute('role', 'group');
  typeTiles.setAttribute('aria-label', 'Travel type');
  const fields = node('div', 'itinerary-form-grid');
  const locationSection = node('section', 'itinerary-location-editor');
  const routeSection = node('section', 'itinerary-route-editor');
  let routeDraft = originalRoutePoints.map(point => structuredClone(point));
  let editorFields = structuredClone(originalFields);

  function renderOrientation() {
    const type=body.dataset.travelType||'standard';
    if(!existing){
      orientation.classList.add('is-new-prompt');
      orientation.replaceChildren();
      const icon=node('span','itinerary-editor-orientation-flag itinerary-editor-prompt-icon');
      icon.append(createLineIcon('pin'));
      const copy=node('div','itinerary-editor-orientation-copy');
      copy.append(
        node('small','','ADD TRAVEL'),
        node('strong','','What are you adding?'),
        node('span','','Choose Destination, RV / Motorhome or Cruise, then enter only the details for that travel type.')
      );
      orientation.append(icon,copy);
      return;
    }
    orientation.classList.remove('is-new-prompt');
    const typeLabel=type==='motorhome'?'RV / Motorhome':type==='cruise'?'Cruise':'Destination';
    const routeTrip=type==='motorhome'||type==='cruise';
    const liveRoute=routeTrip ? routeValues(body,routeDraft).filter(point=>String(point?.name||'').trim()) : [];
    const firstRouteName=String(liveRoute[0]?.name||'').trim();
    const routeName=routeTrip&&liveRoute.length ? generatedRouteTripName(type,liveRoute) : '';
    const name=routeName || String(fields.querySelector('[name="name"]')?.value||editorFields.name||'').trim() || (existing?.name || (routeTrip ? `New ${type==='cruise'?'cruise':'motorhome'} trip` : 'New destination'));
    const countryField=type==='standard'?'country':'startCountry';
    const inferredRouteCountry=routeTrip&&firstRouteName ? routeCountryForPlace(firstRouteName) : '';
    const country=inferredRouteCountry || String(fields.querySelector(`[name="${countryField}"]`)?.value||editorFields[countryField]||'').trim() || (type==='standard'?existing?.country:existing?.startCountry) || '';
    const start=String(fields.querySelector('[name="startDate"]')?.value||editorFields.startDate||'').trim();
    const end=String(fields.querySelector('[name="endDate"]')?.value||editorFields.endDate||'').trim();
    orientation.replaceChildren();
    const flag=node('span','itinerary-editor-orientation-flag',countryFlagEmoji(country));flag.setAttribute('aria-hidden','true');
    const copy=node('div','itinerary-editor-orientation-copy');
    copy.append(
      node('small','',existing?'EDITING DESTINATION / TRIP':'ADD TRAVEL'),
      node('strong','',name),
      node('span','',[country||'Country not set',typeLabel].join(' · '))
    );
    const dates=node('div','itinerary-editor-orientation-dates');
    dates.append(
      node('small','','STAY / TRIP DATES'),
      node('strong','',start&&end?`${formatAUDate(start)} → ${formatAUDate(end)}`:(start?`${formatAUDate(start)} → set end date`:(end?`set start date → ${formatAUDate(end)}`:'Set start and end dates')))
    );
    orientation.append(flag,copy,dates);
  }

  function resolvePointDraft(point) {
    const named=resolveOfflinePlace(point?.name);
    if(!named) return point;
    if(hasMapCoordinates(point)) return point;
    return {...point,lat:named.lat,long:named.long};
  }

  function openRoutePointMapPicker(index) {
    routeDraft=routeValues(body,routeDraft).map(resolvePointDraft);
    const point=routeDraft[index];
    if(!point) return;
    const startName=String(fields.querySelector('[name="startCity"]')?.value||editorFields.startCity||'').trim();
    const anchor=resolveOfflinePlace(startName);
    const mapStay=hasMapCoordinates(point)
      ? {id:'route-picker',name:point.name||`Stop ${index+1}`,travelType:body.dataset.travelType||'motorhome',lat:Number(point.lat),long:Number(point.long)}
      : anchor ? {id:'route-picker',name:startName||anchor.name,travelType:body.dataset.travelType||'motorhome',lat:anchor.lat,long:anchor.long} : null;
    const pickerBody=node('div','itinerary-route-map-picker');
    pickerBody.append(node('p','itinerary-route-map-help',`Tap the offline map once to place ${String(point.name||'this route stop').trim()||'this route stop'}. Pinch/zoom and pan do not place a point.`));
    let picker=null;
    const map=renderOfflineMap({stays:mapStay?[mapStay]:[],routePoints:[]},{ariaLabel:'Place route point on offline map',fitToPoints:Boolean(mapStay),labelMode:'key',interactive:true,onMapTap:placed=>{
      routeDraft=routeValues(body,routeDraft);
      routeDraft[index]={...routeDraft[index],lat:placed.lat,long:placed.long};
      markDirty();
      renderRouteRows(routeDraft);
      picker?.close();
    }});
    map.classList.add('itinerary-route-picker-map');
    pickerBody.append(map);
    picker=createModal({title:hasMapCoordinates(point)?'Adjust Map Point':'Place Map Point',body:pickerBody,actions:[{label:'Cancel',onClick:d=>d.close()}],className:'tcc-expanded-modal tone-indigo itinerary-route-picker-modal'});
    host.append(picker);picker.showModal();picker.addEventListener('close',()=>picker.remove(),{once:true});
  }

  function renderRouteRows(points = routeDraft) {
    routeDraft = points.map(point => structuredClone(point));
    routeSection.replaceChildren();
    if (body.dataset.travelType === 'standard') return;
    const isCruise=body.dataset.travelType==='cruise';
    const head = node('div', 'itinerary-route-head');
    const headCopy=node('div','itinerary-route-head-copy');
    headCopy.append(
      node('strong','',isCruise?'Cruise itinerary':'RV / Motorhome itinerary'),
      node('small','','Enter route stops in order, one per line.')
    );
    head.append(headCopy);
    routeSection.append(head);

    const listWrap=node('label','itinerary-route-lines-wrap');
    listWrap.append(node('span','itinerary-route-lines-label',isCruise?'Ports / stops in order':'Route stops in order'));
    const lines=document.createElement('textarea');
    lines.name='routeLines';
    lines.className='itinerary-route-lines';
    lines.rows=4;
    lines.value=routeDraft.map(point=>point.name||'').filter(Boolean).join('\n');
    lines.placeholder=isCruise?'Barcelona\nMarseille\nGenoa\nRome':'Munich\nSalzburg\nInnsbruck\nZurich';
    listWrap.append(lines);
    routeSection.append(listWrap);

    const derived=node('div','itinerary-route-derived');
    routeSection.append(derived);
    const hint=node('small','itinerary-route-first-stop-note','Your first stop sets the trip starting city and country automatically.');
    routeSection.append(hint, planningNoteField(editorFields));

    const updateDerived=()=>{
      routeDraft=routeValues(body,routeDraft).map(resolvePointDraft);
      const first=routeDraft[0]?.name||'';
      const last=routeDraft[routeDraft.length-1]?.name||'';
      derived.replaceChildren();
      const summary=node('div','itinerary-route-summary');
      const start=node('span','itinerary-route-endpoint'); start.append(node('small','','START'),node('strong','',first||'Add first stop'));
      const arrow=node('span','itinerary-route-summary-arrow','→');
      const end=node('span','itinerary-route-endpoint'); end.append(node('small','','END'),node('strong','',last||'Add last stop'));
      const count=node('b','itinerary-route-count',`${routeDraft.length} stop${routeDraft.length===1?'':'s'}`);
      summary.append(start,arrow,end,count);
      derived.append(summary);
      const unresolved=routeDraft.map((point,index)=>({point,index})).filter(({point})=>String(point.name||'').trim()&&!hasMapCoordinates(point));
      if(unresolved.length){
        const mapping=node('div','itinerary-route-map-needed');
        mapping.append(node('small','','Map any place that is not in the offline place list:'));
        for(const {point,index} of unresolved){
          const mapButton=node('button','button itinerary-route-map-button',`Map ${String(point.name||`Stop ${index+1}`).trim()}`);
          mapButton.type='button'; mapButton.addEventListener('click',()=>openRoutePointMapPicker(index)); mapping.append(mapButton);
        }
        derived.append(mapping);
      }
      renderOrientation();
    };
    lines.addEventListener('input',()=>{ markDirty(); updateDerived(); });
    lines.addEventListener('change',()=>{ markDirty(); updateDerived(); });
    updateDerived();
  }

  function locationNameFor(fieldsValue = editorFields) {
    const type=String(fieldsValue?.travelType || body.dataset.travelType || 'standard');
    return String(type === 'standard' ? fieldsValue?.name : fieldsValue?.startCity || '').trim();
  }

  function resolveParentDraft(fieldsValue = editorFields) {
    const next={...fieldsValue};
    if(hasMapCoordinates(next)) return next;
    const known=resolveOfflinePlace(locationNameFor(next));
    return known ? {...next,lat:known.lat,long:known.long} : next;
  }

  function renderLocationEditor() {
    locationSection.replaceChildren();
    // Route trips use the first ordered stop/port as the parent map anchor.
    // Do not ask Kym to enter and map the same starting city twice.
    if (body.dataset.travelType !== 'standard') return;
    const current=resolveParentDraft(editorFields);
    const locationName=locationNameFor(current);
    const mapped=hasMapCoordinates(current);
    if(mapped && !hasMapCoordinates(editorFields)) editorFields={...editorFields,lat:current.lat,long:current.long};
    if(!locationName || mapped) return;
    const title=node('div','itinerary-location-head');
    const copy=node('div','itinerary-location-copy');
    copy.append(
      node('strong','',body.dataset.travelType==='standard'?'Destination Map Point':'Starting City Map Point'),
      node('small','',mapped ? 'Mapped offline. Adjust only if the marker needs correcting.' : (locationName ? 'This place is not in the offline place list yet. Tap once on the map to place it.' : 'Enter the destination / starting city first.'))
    );
    const button=node('button','button itinerary-location-map-button',mapped?'Adjust Map Location':'Place Map Location');
    button.type='button'; button.disabled=!locationName; button.addEventListener('click',openParentMapPicker);
    title.append(copy,button); locationSection.append(title);
  }

  function openParentMapPicker() {
    editorFields=formValues(body,editorFields);
    editorFields=resolveParentDraft(editorFields);
    const locationName=locationNameFor(editorFields);
    if(!locationName) return;
    const mapped=hasMapCoordinates(editorFields);
    const mapStay=mapped ? {id:'itinerary-parent-picker',name:locationName,travelType:body.dataset.travelType||'standard',lat:Number(editorFields.lat),long:Number(editorFields.long)} : null;
    const pickerBody=node('div','itinerary-route-map-picker itinerary-parent-map-picker');
    pickerBody.append(node('p','itinerary-route-map-help',`Tap the offline map once to place ${locationName}. Pinch/zoom and pan do not place a point.`));
    let picker=null;
    const map=renderOfflineMap({stays:mapStay?[mapStay]:[],routePoints:[]},{ariaLabel:'Place destination on offline map',fitToPoints:Boolean(mapStay),labelMode:'key',interactive:true,onMapTap:placed=>{
      editorFields={...formValues(body,editorFields),lat:placed.lat,long:placed.long};
      markDirty();
      renderFields(editorFields); renderLocationEditor(); renderRouteRows(routeDraft); renderOrientation();
      picker?.close();
    }});
    map.classList.add('itinerary-route-picker-map'); pickerBody.append(map);
    picker=createModal({title:mapped?'Adjust Map Location':'Place Map Location',body:pickerBody,actions:[{label:'Cancel',onClick:d=>d.close()}],className:'tcc-expanded-modal tone-indigo itinerary-route-picker-modal'});
    host.append(picker);picker.showModal();picker.addEventListener('close',()=>picker.remove(),{once:true});
  }

  function planningNoteField(savedFields = editorFields) {
    const details=document.createElement('details');
    details.className='itinerary-planning-note';
    const summary=document.createElement('summary');
    summary.className='itinerary-planning-note-summary';
    const label=node('span','itinerary-planning-note-label','Planning note');
    const optional=node('small','itinerary-planning-note-optional','optional');
    summary.append(label,optional);
    const wrap=node('label','itinerary-planning-note-field');
    const textarea=document.createElement('textarea');
    textarea.name='notes';
    textarea.rows=3;
    textarea.placeholder='Add anything useful for this stay or route';
    textarea.value=String(savedFields.notes || '');
    wrap.append(textarea);
    details.append(summary,wrap);
    if(textarea.value.trim()) details.open=true;
    textarea.addEventListener('input',()=>{ editorFields=formValues(body,editorFields); markDirty(); });
    textarea.addEventListener('change',()=>{ editorFields=formValues(body,editorFields); markDirty(); });
    return details;
  }

  function renderFields(savedFields = editorFields) {
    const type=body.dataset.travelType||'standard';
    const routeTrip=type==='motorhome'||type==='cruise';
    const next=[];
    if(routeTrip){
      // Kym-first route workflow: dates first, then ordered stops/ports. The
      // first route point supplies the starting city and usually the country.
      next.push(
        inputField(type==='cruise'?'Cruise Start Date':'Hire / Trip Start Date','startDate','date',savedFields.startDate||''),
        inputField(type==='cruise'?'Cruise End Date':'Hire / Trip End Date','endDate','date',savedFields.endDate||'')
      );
    }else{
      next.push(
        inputField('Country','country','text',savedFields.country||''),
        inputField('City / Destination','name','text',savedFields.name||''),
        inputField('Start Date','startDate','date',savedFields.startDate||''),
        inputField('End Date','endDate','date',savedFields.endDate||'')
      );
    }
    fields.replaceChildren(...next);
    const countryInput=fields.querySelector('[name="country"]'); if(countryInput) countryInput.required=true;
    const nameInput=fields.querySelector('[name="name"]'); if(nameInput) nameInput.required=true;
    const locationFieldName=routeTrip?null:'name';
    const initialLocationName=locationFieldName ? String(savedFields?.[locationFieldName]||'').trim() : '';
    fields.querySelectorAll('input').forEach(input=>{
      input.addEventListener('input',()=>{
        editorFields=formValues(body,editorFields);
        markDirty();
        renderOrientation();
        if(!routeTrip) renderLocationEditor();
      });
      input.addEventListener('change',()=>{
        const next=formValues(body,editorFields);
        if(locationFieldName && input.name===locationFieldName){
          const after=String(next[locationFieldName]||'').trim();
          if(after!==initialLocationName){
            const known=resolveOfflinePlace(after);
            next.lat=known?.lat??null; next.long=known?.long??null;
          }
        }
        editorFields=next;
        markDirty();
        renderOrientation();
        if(!routeTrip) renderLocationEditor();
      });
    });
    const budgetNote=node('section','itinerary-budget-handoff-note');
    budgetNote.append(
      node('strong','',savedFields.destinationBudgetAUD>0?'Destination Budget is preserved':'Money is set after the itinerary'),
      node('span','',savedFields.destinationBudgetAUD>0
        ? 'Budget amount, local currency and the locked exchange rate stay in Budget → Destination Budgets.'
        : 'Save this travel plan first. Budget then supplies the local currency automatically and asks only for the AUD budget and fixed rate.')
    );
    fields.append(budgetNote);
    if(!routeTrip) fields.append(planningNoteField(savedFields));
  }

  function renderTypeTiles() {
    typeTiles.replaceChildren();
    for (const [type, label] of [['standard','Destination'],['motorhome','RV / Motorhome'],['cruise','Cruise']]) {
      const button = node('button', 'itinerary-type-tile');
      button.type = 'button';
      button.dataset.travelType = type;
      button.append(createLineIcon(TRAVEL_TYPE_ICONS[type] || 'globe', 'itinerary-type-choice-icon'), node('span', 'itinerary-type-choice-label', label));
      const active = type === body.dataset.travelType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      if (active) button.append(createLineIcon('check', 'itinerary-selected-tick'));
      button.addEventListener('click', () => {
        editorFields=formValues(body,editorFields);
        if (body.dataset.travelType !== 'standard') routeDraft = routeValues(body,routeDraft);
        const previousType=body.dataset.travelType;
        body.dataset.travelType = type;
        editorFields.travelType=type;
        if(previousType==='standard'&&type!=='standard'){
          if(!editorFields.startCountry)editorFields.startCountry=editorFields.country||'';
          if(!editorFields.startCity)editorFields.startCity=editorFields.name||'';
        }
        if(previousType!=='standard'&&type==='standard'&&!editorFields.country)editorFields.country=editorFields.startCountry||'';
        markDirty();
        if (!editorTone) setModalTone(modal, type === 'motorhome' ? 'orange' : type === 'cruise' ? 'violet' : 'sky');
        renderTypeTiles();
        renderFields(editorFields);
        renderLocationEditor();
        renderRouteRows(routeDraft);
        renderOrientation();
      });
      typeTiles.append(button);
    }
  }

  function populate(savedFields, savedRoutePoints) {
    error.textContent = '';
    dirty.hidden = true;
    editorFields=structuredClone(savedFields);
    body.dataset.travelType = editorFields.travelType || 'standard';
    setModalTone(modal, existing ? (editorTone || (body.dataset.travelType === 'motorhome' ? 'orange' : body.dataset.travelType === 'cruise' ? 'violet' : 'indigo')) : 'sky');
    routeDraft = savedRoutePoints.map(point => structuredClone(point));
    renderTypeTiles();
    renderFields(editorFields);
    renderLocationEditor();
    renderRouteRows(routeDraft);
    renderOrientation();
  }

  body.append(orientation, typeTiles, fields, locationSection, routeSection, dirty, error);
  populate(originalFields, originalRoutePoints);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete itinerary entry',
        message:`Delete ${existing.name} · ${formatAUDate(existing.startDate)} – ${formatAUDate(existing.endDate)}? This cannot be undone.${originalRoutePoints.length ? ` Its ${originalRoutePoints.length} saved route point${originalRoutePoints.length === 1 ? '' : 's'} will also be deleted.` : ''} Linked Destination Budget expenses/reservations, destination checklist items and personal Calendar reminders/notes must be removed first. Annual-only bookings are preserved and their stay context is reconciled automatically.`,
        onConfirm:() => {
          stateService.commit(draft => deleteItineraryDraft(draft, existing.id, { now:stateService.now }));
          if (dialog.isConnected && dialog.open) dialog.close();
        }
      });
    }});
  }
  actions.push(
    { label:'Undo Changes', onClick:() => { const saved = formSession.undo(); populate(saved.fields, saved.routePoints); } },
    { label:'Cancel', onClick:dialog => { formSession.cancel(); dialog.close(); } },
    { label:'Save', onClick:dialog => {
      try {
        let fieldsValue = resolveParentDraft(formValues(body, editorFields));
        let points = fieldsValue.travelType === 'standard' ? [] : routeValues(body,routeDraft).map(resolvePointDraft);
        if(fieldsValue.travelType !== 'standard') {
          const namedPoints=points.filter(point=>String(point?.name||'').trim());
          if(!namedPoints.length) throw new Error(fieldsValue.travelType==='cruise'?'Add the first cruise port / stop before saving.':'Add the first RV / Motorhome stop before saving.');
          const unresolved=namedPoints.find(point=>!hasMapCoordinates(point));
          if(unresolved) throw new Error(`Place “${String(unresolved.name).trim()}” on the offline map before saving.`);
          const first=namedPoints[0];
          const firstName=String(first.name||'').trim();
          const inferredCountry=routeCountryForPlace(firstName) || String(fieldsValue.startCountry||existing?.startCountry||'').trim();
          if(!inferredCountry) throw new Error(`Starting country could not be inferred from “${firstName}”. Use a mapped offline place for the first stop.`);
          fieldsValue={
            ...fieldsValue,
            name:generatedRouteTripName(fieldsValue.travelType,namedPoints),
            country:'',
            startCity:firstName,
            startCountry:inferredCountry,
            lat:Number(first.lat),
            long:Number(first.long)
          };
          points=namedPoints;
        } else {
          const locationName=locationNameFor(fieldsValue);
          if(locationName && !hasMapCoordinates(fieldsValue)) throw new Error(`Place “${locationName}” on the offline map before saving.`);
        }
        const formDraft = formSession.update(draft => { draft.fields = fieldsValue; draft.routePoints = points; });
        const retainedRouteIds = new Set(formDraft.routePoints.map(point => point?.id).filter(Boolean));
        const removedSavedRoutePoints = existing
          ? originalRoutePoints.filter(point => fieldsValue.travelType === 'standard' || !retainedRouteIds.has(point.id))
          : [];

        const commitSave = (allowRoutePointRemoval = false) => {
          let restoreRecordVisibility = () => {};
          try {
            // If this editor was opened while the Itinerary list had an active
            // year/search filter, keep the saved stay visible behind the modal.
            // Otherwise a successful add/edit can appear to vanish immediately
            // when its name/date no longer matches the remembered filter.
            restoreRecordVisibility = prepareRecordVisibility?.() || (()=>{});
            stateService.commit(draft => {
              const saved = saveItineraryDraft(
                draft,
                { entryId:existing?.id || null, fields:formDraft.fields, routePoints:formDraft.routePoints },
                { now:stateService.now, allowRoutePointRemoval }
              );
              if (String(saved.endDate || '') < String(currentDate || '')) draft.ui.itineraryCompletedOpen = true;
            });
            formSession.markSaved(formDraft);
            if (dialog.isConnected && dialog.open) dialog.close();
          } catch (err) {
            // Visibility filters are transient UI state and must roll back when
            // the Save itself does not commit. Otherwise a blocked/failed Save
            // changes the surrounding Itinerary even though no record changed.
            restoreRecordVisibility();
            showEditorError(err);
            throw err;
          }
        };

        if (removedSavedRoutePoints.length) {
          const count = removedSavedRoutePoints.length;
          const changingToStandard = fieldsValue.travelType === 'standard' && originalFields.travelType !== 'standard';
          const exactTrip=`${existing.name} · ${formatAUDate(existing.startDate)} – ${formatAUDate(existing.endDate)}`;
          confirmDestructive({
            title:changingToStandard ? 'Change trip to Standard?' : 'Remove saved route points?',
            message:changingToStandard
              ? `Changing ${exactTrip} to Standard will permanently remove ${count} saved route point${count === 1 ? '' : 's'}. Continue and Save?`
              : `Saving these changes will permanently remove ${count} saved route point${count === 1 ? '' : 's'} from ${exactTrip}. Continue?`,
            confirmLabel:'Save Changes',
            onConfirm:() => commitSave(true)
          });
          return;
        }
        commitSave(false);
      } catch (err) {
        showEditorError(err);
      }
    }}
  );

  const itineraryTone = existing ? (originalFields.travelType === 'motorhome' ? 'orange' : originalFields.travelType === 'cruise' ? 'violet' : 'indigo') : 'indigo';
  const addingHomeVisit = !existing && originalFields.country === 'Australia' && /^home(?:\s*\/|$)/i.test(String(originalFields.name || ''));
  modal = createModal({ title:existing ? 'Edit Destination / Trip' : addingHomeVisit ? 'Add Home Visit' : 'Add Destination', body, actions, className:`tcc-editor-modal tcc-itinerary-editor-modal tone-${existing ? (editorTone || itineraryTone) : (addingHomeVisit ? 'violet' : 'sky')}` });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function renderStats(model) {
  const stats = node('section', 'itinerary-stats');
  const items = [
    ['countries','Countries Planned',model.stats.countriesPlanned,'globe'],
    ['routes','Route Trips',model.stats.routeTrips,'rv'],
    ['stops','Planned Stops',model.stats.plannedStops,'pin'],
    ['gaps','Unplanned Gaps',model.stats.missingCoverage,'warning'],
    ['stays','Missing Stays',model.stats.missingStays,'accommodation'],
    ['overlaps','Date Overlaps',model.stats.dateOverlaps,'calendar']
  ];
  for (const [key,label,value,iconName] of items) {
    const card = node('article', `itinerary-stat itinerary-stat-${key}`);
    const icon=node('span','itinerary-stat-icon'); icon.append(createLineIcon(iconName));
    const copy=node('span','itinerary-stat-copy'); copy.append(node('strong','',String(value)),node('span','',label));
    card.append(icon,copy);
    stats.append(card);
  }
  return stats;
}

function itineraryStatExpandedBody(kind, model) {
  const body=node('div',`itinerary-stat-expanded itinerary-stat-expanded-${kind}`);
  const details=model.statDetails?.[kind]||[];
  const intro=node('p','itinerary-stat-expanded-intro');
  const labels={
    countries:'All unique countries represented in future planned stays and route trips.',
    routes:'All future Motorhome and Cruise route trips with their route-point coverage.',
    stops:'Every future stay plus every detailed future route point.',
    gaps:'Every uncovered forward-planning period in the selected coverage window.',
    stays:'Standard future stays that do not yet have linked accommodation.',
    overlaps:'Every current/future itinerary date overlap.'
  };
  intro.textContent=labels[kind]||'Planning details';body.append(intro);
  const list=node('div','itinerary-stat-expanded-list');
  if(!details.length){list.append(node('p','itinerary-empty',kind==='gaps'?'No unplanned gaps.':kind==='stays'?'No missing stays.':kind==='overlaps'?'No date overlaps.':'No entries yet'));body.append(list);return body;}
  if(kind==='countries'){
    for(const item of details){const row=node('article','itinerary-stat-detail-row');const flag=node('span','itinerary-stat-detail-flag',countryFlagEmoji(item.label));flag.setAttribute('aria-hidden','true');const copy=node('span','itinerary-stat-detail-copy');copy.append(node('strong','',item.label),node('span','',`${item.count} planned stay${item.count===1?'':'s'}`));row.append(flag,copy);list.append(row);}
  } else if(kind==='routes'){
    for(const item of details){const row=node('article','itinerary-stat-detail-row');const flag=node('span','itinerary-stat-detail-flag',countryFlagEmoji(itineraryFlagCountry(item)));flag.setAttribute('aria-hidden','true');const copy=node('span','itinerary-stat-detail-copy');copy.append(node('strong','',item.name),node('span','',[item.country||item.startCountry,item.travelType==='cruise'?'Cruise':'Motorhome',item.displayDates,`${item.routePointCount} route point${item.routePointCount===1?'':'s'}`].filter(Boolean).join(' · ')));row.append(flag,copy);list.append(row);}
  } else if(kind==='stops'){
    for(const item of details){const row=node('article','itinerary-stat-detail-row');if(item.kind==='route-point'){row.append(node('strong','',item.name),node('span','',`${item.parentName} · route point ${item.order}`));}else{const flag=node('span','itinerary-stat-detail-flag',countryFlagEmoji(itineraryFlagCountry(item)));flag.setAttribute('aria-hidden','true');const copy=node('span','itinerary-stat-detail-copy');copy.append(node('strong','',item.name),node('span','',[item.country,item.travelType==='standard'?'Standard':item.travelType,item.startDate&&item.endDate?`${formatAUDate(item.startDate)} – ${formatAUDate(item.endDate)}`:''].filter(Boolean).join(' · ')));row.append(flag,copy);}list.append(row);}
  } else if(kind==='gaps'){
    for(const item of details){const row=node('article','itinerary-stat-detail-row itinerary-stat-detail-warning');row.append(node('strong','',`${item.days} unplanned day${item.days===1?'':'s'}`),node('span','',`${formatAUDate(item.startDate)} – ${formatAUDate(item.endDate)}`));list.append(row);}
  } else if(kind==='stays'){
    for(const item of details){const row=node('article','itinerary-stat-detail-row itinerary-stat-detail-warning');const flag=node('span','itinerary-stat-detail-flag',countryFlagEmoji(itineraryFlagCountry(item)));flag.setAttribute('aria-hidden','true');const copy=node('span','itinerary-stat-detail-copy');copy.append(node('strong','',item.name),node('span','',[item.country,item.displayDates,'Accommodation not linked'].filter(Boolean).join(' · ')));row.append(flag,copy);list.append(row);}
  } else if(kind==='overlaps'){
    for(const item of details){const row=node('article','itinerary-stat-detail-row itinerary-stat-detail-danger');const range=item.overlapStart&&item.overlapEnd?`${formatAUDate(item.overlapStart)} – ${formatAUDate(item.overlapEnd)}`:'';row.append(node('strong','',`${item.days} overlapping day${item.days===1?'':'s'}`),node('span','',[item.first?.name&&item.second?.name?`${item.first.name} ↔ ${item.second.name}`:'',range].filter(Boolean).join(' · ')));list.append(row);}
  }
  body.append(list);
  return body;
}


function renderMap(model, host) {
  const panel = node('section', 'itinerary-panel itinerary-map-panel');
  panel.setAttribute('aria-label','Forward Journey Map');
  const head = node('div', 'itinerary-map-title-row');
  const copy=node('div'); copy.append(node('p','eyebrow','FORWARD PLANNING MAP'),node('h2','',"Where We're Going"));
  const expand=node('button','button itinerary-expand-map'); expand.type='button'; expand.append(createLineIcon('expand'),document.createTextNode(' Expand Map'));
  expand.addEventListener('click',()=>{ const body=node('div','itinerary-expanded-map'); body.append(renderOfflineMap(model.journeyMap,{ariaLabel:'Expanded forward planning map',fitToPoints:true,labelMode:'key',interactive:true})); const mapTone=materialToneFromRenderedSurface(panel,'teal'); const modal=createModal({title:'Forward Journey Plan',body,actions:[],className:`tcc-expanded-modal itinerary-map-expanded-modal tone-${mapTone}`}); host.append(modal); modal.showModal(); modal.addEventListener('close',()=>modal.remove(),{once:true}); });
  head.append(copy,expand); panel.append(head);
  const first=model.currentStay||null, next=model.nextDestination||null; const routePoints=model.upcoming.reduce((sum,record)=>sum+Number(record.routePointCount||0),0);
  const metrics=node('div','itinerary-map-metrics'); const data=[['Current',first?.name||'—'],['Next',next?.name||'—'],['Planned Stops',String(model.stats.plannedStops)],['Detailed Route Points',String(routePoints)],['Route Trips',String(model.stats.routeTrips)],['Unplanned Gaps',String(model.stats.missingCoverage)]]; for(const [label,value] of data){const metric=node('article','itinerary-map-metric');metric.append(node('span','',label),node('strong','',value));metrics.append(metric);} panel.append(metrics);
  const stage = node('div', 'itinerary-map-stage'); stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Itinerary forward planning map', fitToPoints:true, labelMode:'key' })); panel.append(stage);
  const legend=node('div','itinerary-map-legend'); for(const [cls,label] of [['standard','Flight / Standard'],['motorhome','Motorhome'],['cruise','Cruise']]){const item=node('span','');item.append(node('i',`itinerary-legend-line itinerary-legend-${cls}`),node('b','',label));legend.append(item);} panel.append(legend);
  return panel;
}

function renderYearFilters(model, options, onChange) {
  const filters = node('div', 'itinerary-year-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter itinerary by Travel Year');
  let windowStart=null;
  const renderWindow=()=>{
    const browser=buildTravelYearBrowser(model.journeyMap.availableYears||[],options.mapYears,{windowSize:6,windowStart});
    windowStart=browser.windowStart;
    filters.replaceChildren();
    const all=node('button','itinerary-year-button','All Years'); all.type='button';
    const allActive=isTravelYearSelected(options.mapYears,'all'); all.dataset.active=String(allActive); all.setAttribute('aria-pressed',String(allActive));
    all.addEventListener('click',()=>preserveLocalFocus(()=>onChange(['all']))); filters.append(all);
    const previous=node('button','itinerary-year-nav','Previous Years'); previous.type='button'; previous.disabled=browser.previousStart==null; previous.setAttribute('aria-label','Show previous Travel Years');
    previous.addEventListener('click',()=>{if(browser.previousStart==null)return;windowStart=browser.previousStart;renderWindow();}); filters.append(previous);
    for(const year of browser.visibleYears){
      const button=node('button','itinerary-year-button',`Year ${year}`); button.type='button';
      const active=isTravelYearSelected(options.mapYears,year); button.dataset.active=String(active); button.setAttribute('aria-pressed',String(active));
      button.addEventListener('click',()=>preserveLocalFocus(()=>onChange(toggleTravelYear(options.mapYears,year)))); filters.append(button);
    }
    const next=node('button','itinerary-year-nav','Next Years'); next.type='button'; next.disabled=browser.nextStart==null; next.setAttribute('aria-label','Show later Travel Years');
    next.addEventListener('click',()=>{if(browser.nextStart==null)return;windowStart=browser.nextStart;renderWindow();}); filters.append(next);
    filters.append(node('span','travel-year-selection-summary',`Selected: ${browser.summary}`));
  };
  renderWindow();
  return filters;
}

function itineraryCoverageExpandedBody(state, currentDate, initialMonths = 6, openDetail = null) {
  const body = node('div', 'itinerary-coverage-expanded-body');
  let months = [3,6,12].includes(Number(initialMonths)) ? Number(initialMonths) : 6;
  const rerender = () => {
    const model = applyItineraryDestinationColours(buildItineraryViewModel(state, currentDate, { coverageMonths:months }), state);
    body.replaceChildren(renderCoverage(model, months, value => { months = value; rerender(); }, openDetail));
  };
  rerender();
  return body;
}

function renderCoverage(model, months = 6, onMonthsChange = null, openDetail = null) {
  const panel = node('section', 'itinerary-panel itinerary-coverage itinerary-coverage-reference');
  const hasItinerary=Boolean((model.upcoming||[]).length || (model.completed||[]).length);
  const hasCoverage=Number(model.forwardCoverage.horizonDays)>0 && hasItinerary;
  const head = node('div', 'itinerary-section-head'); const title=node('div'); title.append(node('h2','','Forward Coverage'),node('small','',hasCoverage?`${formatAUDate(model.forwardCoverage.startDate)} – ${formatAUDate(model.forwardCoverage.endDate)}`:'Planning not started'));
  if(hasCoverage){const switches=node('div','itinerary-coverage-switches'); switches.setAttribute('role','group'); switches.setAttribute('aria-label','Forward coverage period'); for(const value of [3,6,12]){const b=node('button','itinerary-coverage-switch',`${value} months`);b.type='button';const active=value===months;b.dataset.active=String(active);b.setAttribute('aria-pressed',String(active));b.addEventListener('click',()=>preserveLocalFocus(()=>onMonthsChange?.(value)));switches.append(b);} head.append(title,switches);} else head.append(title);
  panel.append(head);
  if(!hasCoverage){panel.append(node('p','itinerary-empty','Set Journey Start in Settings or add your first destination to begin Forward Coverage.'));return panel;}
  const summary=node('div','itinerary-coverage-summary');
  const nextGap=(model.forwardCoverage.segments||[]).find(segment=>segment.type==='gap')||null;
  summary.append(
    paceCoverage(`${model.forwardCoverage.plannedDays}`,'days planned','planned'),
    paceCoverage(`${model.forwardCoverage.gapDays}`,'days unplanned',model.forwardCoverage.gapDays?'warn':'clear'),
    paceCoverage(nextGap ? formatAUDate(nextGap.startDate) : 'NONE','next gap',nextGap?'warn':'clear')
  );
  panel.append(summary);
  const timeline=node('div','itinerary-coverage-timeline');
  for(const segment of model.forwardCoverage.segments||[]){
    if(segment.type==='gap'){
      const gap=node('div','itinerary-coverage-segment itinerary-segment-gap');gap.style.flexGrow=String(Math.max(1,segment.days));gap.append(node('strong','','UNCOVERED'),node('small','',`${segment.days}d`));gap.setAttribute('role','img');gap.setAttribute('aria-label',`Uncovered itinerary dates · ${formatAUDate(segment.startDate)} – ${formatAUDate(segment.endDate)} · ${segment.days} day${segment.days===1?'':'s'}`);timeline.append(gap);continue;
    }
    if(segment.type==='flight-transit'){
      const transit=node('div','itinerary-coverage-segment itinerary-segment-flight-transit');transit.style.flexGrow='1';transit.append(node('strong','','FLIGHT TRANSIT'),node('small','',formatAUDate(segment.startDate)));transit.setAttribute('role','img');transit.setAttribute('aria-label',`Flight Transit day · ${formatAUDate(segment.startDate)} · saved flight covers this otherwise unplanned travel day`);timeline.append(transit);continue;
    }
    const seg=node('button',`itinerary-coverage-segment itinerary-segment-${segment.travelType}`);seg.type='button';seg.style.flexGrow=String(Math.max(1,segment.days));if(segment.destinationColour){seg.style.setProperty('--itinerary-destination-color',segment.destinationColour.color);seg.style.setProperty('--itinerary-destination-rgb',segment.destinationColour.rgb);}seg.append(node('strong','',segment.name),node('small','',`${segment.days}d`));seg.setAttribute('aria-label',`Enlarge ${segment.name} itinerary details · ${formatAUDate(segment.startDate)} – ${formatAUDate(segment.endDate)}`);seg.addEventListener('click',()=>openDetail?.(segment.id));timeline.append(seg);
  }
 panel.append(timeline); return panel;
}
function paceCoverage(value,label,tone=''){const m=node('article',`itinerary-coverage-box ${tone}`);m.append(node('strong','',value),node('span','',label));return m;}

function itineraryDetailTone(record) {
  if(record?.travelType==='motorhome'||record?.travelType==='rv') return 'orange';
  if(record?.travelType==='cruise') return 'violet';
  return 'blue';
}

function openItineraryEntryDetail({ host, stateService, record, openEditor }) {
  const body=node('section',`itinerary-entry-detail itinerary-entry-detail-${record.travelType||'standard'}`);
  const hero=node('div','itinerary-entry-detail-hero');
  const flag=node('span','itinerary-entry-detail-flag',countryFlagEmoji(itineraryFlagCountry(record)));
  flag.setAttribute('aria-hidden','true');
  const heroCopy=node('div','itinerary-entry-detail-hero-copy');
  heroCopy.append(
    node('p','eyebrow','DESTINATION / TRIP'),
    node('h2','',record.name||'Destination'),
    node('strong','itinerary-entry-detail-country',record.country||record.startCountry||'—'),
    node('span','itinerary-entry-detail-dates',record.displayDates||'—')
  );
  hero.append(flag,heroCopy);
  const facts=node('div','itinerary-entry-detail-facts');
  const fact=(label,value)=>{const item=node('div','itinerary-entry-detail-fact');item.append(node('small','',label),node('strong','',value||'—'));return item;};
  facts.append(
    fact('Travel type',TRAVEL_TYPE_LABELS[record.travelType]||record.travelType||'Standard'),
    fact('Duration',`${record.days} days`),
    fact('Destination Budget',[itineraryBudgetAmounts(record).primary,itineraryBudgetAmounts(record).secondary].filter(Boolean).join(' · ')),
    fact('Accommodation',record.hasAccommodation?'Linked':'Not linked')
  );
  if(record.startCity) facts.append(fact('Starting city',record.startCity));
  if(record.localCurrency) facts.append(fact('Local currency',record.localCurrency));
  if(record.travelType!=='standard') {
    const routePoints=(stateService.snapshot().routePoints||[]).filter(point=>point.itineraryId===record.id).sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    facts.append(fact('Route points',String(routePoints.length)));
    if(routePoints.length){
      const route=node('div','itinerary-entry-detail-route');
      route.append(node('h3','','Route Points'));
      const list=node('div','itinerary-entry-detail-route-list');
      routePoints.forEach((point,index)=>{const row=node('div','itinerary-entry-detail-route-row');row.append(node('span','',String(index+1).padStart(2,'0')),node('strong','',point.name||`Stop ${index+1}`));list.append(row);});
      route.append(list); body.append(hero,facts,route);
    } else body.append(hero,facts);
  } else body.append(hero,facts);
  body.append(node('p','itinerary-entry-detail-help','This is a read-only enlargement. Use Edit below only when you deliberately want to change this stay or trip.'));
  const tone=itineraryDetailTone(record);
  const dialog=createModal({
    title:`${record.name||'Destination'} · Details`,
    body,
    className:`tcc-expanded-modal itinerary-entry-detail-modal tone-${tone}`,
    actions:[
      {label:'Edit',onClick:d=>{d.close();queueMicrotask(()=>openEditor(record.id,tone));}},
      {label:'Close',onClick:d=>d.close()}
    ]
  });
  host.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.showModal();
}


function itineraryUpcomingExpandedBody(model, openDetail) {
  const body=node('div','itinerary-upcoming-expanded');
  const records=model.upcoming||[];
  const routeTrips=records.filter(record=>record.travelType==='motorhome'||record.travelType==='cruise').length;
  const missingAccommodation=records.filter(record=>record.travelType==='standard'&&!record.hasAccommodation).length;
  const totalDays=records.reduce((sum,record)=>sum+Number(record.days||0),0);
  const stats=node('div','itinerary-upcoming-expanded-stats');
  const stat=(label,value,sub,tone='')=>{const item=node('article',`itinerary-upcoming-expanded-stat ${tone}`);item.append(node('small','',label),node('strong','',String(value)),node('span','',sub));return item;};
  stats.append(
    stat('UPCOMING STAYS / TRIPS',records.length,'full forward itinerary','blue'),
    stat('PLANNED DAYS',totalDays,'days represented below','teal'),
    stat('ROUTE TRIPS',routeTrips,'Motorhome + Cruise','indigo'),
    stat('ACCOMMODATION TO LINK',missingAccommodation,missingAccommodation===1?'standard stay':'standard stays',missingAccommodation?'gold':'green')
  );
  body.append(stats);
  const intro=node('p','itinerary-upcoming-expanded-intro',records.length
    ? `Next: ${records[0].name} · ${records[0].displayDates}. Tap any stay or trip for its full details.`
    : 'There are no upcoming itinerary entries.');
  body.append(intro);
  const list=node('div','itinerary-upcoming-expanded-list');
  const pager=node('div','itinerary-list-pager');
  const previous=node('button','button itinerary-page-button','Previous'); previous.type='button';
  const status=node('span','itinerary-page-status');
  const next=node('button','button itinerary-page-button','Next'); next.type='button';
  pager.append(previous,status,next);
  let page=1;
  const draw=()=>{
    list.replaceChildren();
    const pageCount=Math.max(1,Math.ceil(records.length/ITINERARY_LIST_PAGE_SIZE));
    page=Math.max(1,Math.min(page,pageCount));
    if(!records.length) list.append(node('p','itinerary-empty','No entries yet'));
    else for(const record of records.slice((page-1)*ITINERARY_LIST_PAGE_SIZE,page*ITINERARY_LIST_PAGE_SIZE)) list.append(renderEntry(record,openDetail));
    status.textContent=`Page ${page} of ${pageCount}`;
    previous.disabled=page<=1; next.disabled=page>=pageCount; pager.hidden=records.length<=ITINERARY_LIST_PAGE_SIZE;
  };
  previous.addEventListener('click',()=>{if(page>1){page-=1;draw();}});
  next.addEventListener('click',()=>{const count=Math.max(1,Math.ceil(records.length/ITINERARY_LIST_PAGE_SIZE));if(page<count){page+=1;draw();}});
  body.append(list,pager); draw();
  return body;
}

function renderEntry(record, openDetail) {
  const button = node('button', `itinerary-entry itinerary-entry-${record.travelType} itinerary-entry-destination-colour`); button.type='button'; if(record.destinationColour){button.style.setProperty('--itinerary-destination-color',record.destinationColour.color);button.style.setProperty('--itinerary-destination-rgb',record.destinationColour.rgb);} button.addEventListener('click',()=>openDetail(record));
  const dates=node('span','itinerary-entry-dates'); dates.append(node('strong','',record.displayDates.split(' – ')[0]||''),node('small','','TO'),node('strong','',record.displayDates.split(' – ')[1]||''),node('em','',`${record.days} days`));
  const copy=node('span','itinerary-entry-copy');
  const identity=node('span','itinerary-entry-identity');
  const identityIcon=node('span','itinerary-entry-icon'); identityIcon.append(createLineIcon(TRAVEL_TYPE_ICONS[record.travelType]||'globe'));
  const identityFlag=node('span','itinerary-entry-flag',countryFlagEmoji(itineraryFlagCountry(record))); identityFlag.setAttribute('aria-hidden','true');
  const identityCopy=node('span','itinerary-entry-identity-copy'); identityCopy.append(node('strong','',record.name),node('small','',[record.country,TRAVEL_TYPE_LABELS[record.travelType] || record.travelType].filter(Boolean).join(' · ')));
  identity.append(identityIcon,identityFlag,identityCopy); copy.append(identity);
  const badges=node('span','itinerary-entry-badges'); if(record.hasAccommodation)badges.append(node('i','','ACCOMMODATION LINKED')); if(record.travelType!=='standard')badges.append(node('i','',`${record.routePointCount} ROUTE POINTS`)); copy.append(badges);
  const plan=node('span','itinerary-entry-plan'); plan.append(node('small','','TRAVEL PLAN'),node('strong','',record.travelType==='motorhome'?'Motorhome':record.travelType==='cruise'?'Cruise':'Standard'));
  const budget=node('span','itinerary-entry-budget'); const budgetAmounts=itineraryBudgetAmounts(record); budget.append(node('small','','DESTINATION BUDGET'),node('strong','',budgetAmounts.primary)); if(budgetAmounts.secondary)budget.append(node('em','',budgetAmounts.secondary));
  button.append(dates,copy,plan,budget);
  button.setAttribute('aria-label',[
    'Enlarge itinerary stay details',
    record.name,
    record.country,
    record.displayDates,
    TRAVEL_TYPE_LABELS[record.travelType] || record.travelType
  ].filter(Boolean).join(' · '));
  return button;
}

function itineraryPagedList(records, page, openDetail, onPageChange) {
  const list=node('div','itinerary-list');
  const pageCount=Math.max(1,Math.ceil(records.length/ITINERARY_LIST_PAGE_SIZE));
  const safePage=Math.max(1,Math.min(Number(page)||1,pageCount));
  if(!records.length) list.append(node('p','itinerary-empty','No entries yet'));
  else for(const record of records.slice((safePage-1)*ITINERARY_LIST_PAGE_SIZE,safePage*ITINERARY_LIST_PAGE_SIZE)) list.append(renderEntry(record,openDetail));
  const pager=node('div','itinerary-list-pager');
  const previous=node('button','button itinerary-page-button','Previous'); previous.type='button'; previous.disabled=safePage<=1;
  const status=node('span','itinerary-page-status',`Page ${safePage} of ${pageCount}`);
  const next=node('button','button itinerary-page-button','Next'); next.type='button'; next.disabled=safePage>=pageCount;
  previous.addEventListener('click',()=>{if(safePage>1)onPageChange(safePage-1);});
  next.addEventListener('click',()=>{if(safePage<pageCount)onPageChange(safePage+1);});
  pager.append(previous,status,next); pager.hidden=records.length<=ITINERARY_LIST_PAGE_SIZE;
  return {list,pager,page:safePage};
}

export function renderItineraryScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root itinerary-screen');
  main.dataset.screen = 'itinerary';
  const sameScreenRerender = Boolean(document.querySelector('[data-screen="itinerary"]'));
  const remembered = sameScreenRerender ? ITINERARY_TRANSIENT_VIEW.get(stateService) : null;
  let options = {
    mapYears:Array.isArray(remembered?.mapYears) && remembered.mapYears.length ? [...remembered.mapYears] : ['all'],
    searchQuery:typeof remembered?.searchQuery === 'string' ? remembered.searchQuery : '',
    completedOpen:stateService.snapshot().ui?.itineraryCompletedOpen === true,
    coverageMonths:[3,6,12].includes(Number(remembered?.coverageMonths)) ? Number(remembered.coverageMonths) : 6,
    upcomingPage:Number.isInteger(Number(remembered?.upcomingPage)) && Number(remembered.upcomingPage)>0 ? Number(remembered.upcomingPage) : 1,
    completedPage:Number.isInteger(Number(remembered?.completedPage)) && Number(remembered.completedPage)>0 ? Number(remembered.completedPage) : 1
  };
  const rememberOptions = () => ITINERARY_TRANSIENT_VIEW.set(stateService, { mapYears:[...options.mapYears], searchQuery:options.searchQuery, coverageMonths:options.coverageMonths, upcomingPage:options.upcomingPage, completedPage:options.completedPage });
  const prepareRecordVisibility = () => {
    const previous={mapYears:[...options.mapYears],searchQuery:options.searchQuery};
    const allYears = options.mapYears.length === 1 && options.mapYears[0] === 'all';
    if (allYears && !String(options.searchQuery || '').trim()) return () => {};
    options = { ...options, mapYears:['all'], searchQuery:'' };
    rememberOptions();
    return () => {
      options={...options,mapYears:[...previous.mapYears],searchQuery:previous.searchQuery};
      rememberOptions();
    };
  };
  rememberOptions();

  const openEditor = (entryId, editorTone = null, initialFields = null) => {
    const record=entryId ? stateService.snapshot().itinerary.find(item=>item.id===entryId) : null;
    const isHomeVisit=Boolean(record && record.travelType==='standard' && record.country==='Australia' && /^home(?:\s*\/|$)/i.test(String(record.name||'')));
    if(isHomeVisit) return openHomeVisitEditor({stateService,host:main,currentDate,prepareRecordVisibility,entryId});
    return openItineraryEditor({ stateService, host:main, currentDate, entryId, prepareRecordVisibility, editorTone, initialFields });
  };

  function renderContent() {
    const state = stateService.snapshot();
    const pending = state.ui?.pendingOpen;
    // Exact-record navigation must show the selected stay in the surrounding
    // Itinerary as well as in the editor. Clear only the row filters; coverage
    // horizon and other screen state are retained.
    if (pending?.collection === 'itinerary' && pending.id && state.itinerary.some(record => record.id === pending.id)) prepareRecordVisibility();
    const model = applyItineraryDestinationColours(buildItineraryViewModel(state, currentDate, options), state);
    if(pending?.collection==='itinerary' && pending.id){
      const upcomingIndex=model.upcoming.findIndex(record=>record.id===pending.id);
      const completedIndex=model.completed.findIndex(record=>record.id===pending.id);
      if(upcomingIndex>=0) options={...options,upcomingPage:Math.floor(upcomingIndex/ITINERARY_LIST_PAGE_SIZE)+1};
      if(completedIndex>=0) options={...options,completedPage:Math.floor(completedIndex/ITINERARY_LIST_PAGE_SIZE)+1,completedOpen:true};
      rememberOptions();
    }
    const mapPanel = renderMap(model, main);
    main.replaceChildren();

    // R31: restore the shared destination/header orientation above the planning
    // map. This is read-only on Itinerary: the left menu remains the only way
    // to change screens.
    const itineraryBanner=createStayBanner({
      currentStay:model.currentStay?{...model.currentStay,title:model.currentStay.name,dates:model.currentStay.displayDates}:null,
      nextDestination:model.nextDestination?{...model.nextDestination,title:model.nextDestination.name,durationDays:model.nextDestination.days}:null,
      className:'itinerary-stay-banner'
    });
    main.append(itineraryBanner);

    // Cameron's physical iPad review moved the forward map to the top of the
    // working screen. It remains the primary planning tool directly beneath
    // the destination orientation header.
    main.append(mapPanel);

    const coveragePanel=renderCoverage(model, options.coverageMonths, months => { options={...options,coverageMonths:months}; rememberOptions(); renderContent(); }, id=>{const item=[...model.upcoming,...model.completed].find(record=>record.id===id);if(item)openItineraryEntryDetail({host:main,stateService,record:item,openEditor});});
    const statsPanel=renderStats(model);
    main.append(coveragePanel,statsPanel);
    makeExpandableCard(coveragePanel,{host:main,title:'Forward Coverage',tone:'indigo',bodyBuilder:()=>itineraryCoverageExpandedBody(state,currentDate,options.coverageMonths,id=>{const item=[...model.upcoming,...model.completed].find(record=>record.id===id);if(item)openItineraryEntryDetail({host:main,stateService,record:item,openEditor});})});
    const statTones={countries:'teal',routes:'indigo',stops:'blue',gaps:'gold',stays:'orange',overlaps:'red'};
    for(const stat of statsPanel.querySelectorAll('.itinerary-stat')){
      const kind=[...stat.classList].find(name=>name.startsWith('itinerary-stat-'))?.replace('itinerary-stat-','')||'blue';
      makeExpandableCard(stat,{
        host:main,
        title:stat.querySelector('.itinerary-stat-copy > span')?.textContent||'Itinerary Statistic',
        tone:statTones[kind]||'blue',
        bodyBuilder:()=>itineraryStatExpandedBody(kind,model)
      });
    }

    const controls = node('section', 'itinerary-controls');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'itinerary-search';
    search.placeholder = 'Search itinerary';
    search.setAttribute('aria-label', 'Search itinerary');
    search.value = options.searchQuery;
    const years = renderYearFilters(model, options, nextYears => {
      options = { ...options, mapYears:nextYears, upcomingPage:1, completedPage:1 };
      rememberOptions();
      renderContent();
    });
    const actionRow=node('section','itinerary-action-row');
    const addBar=node('button','itinerary-add-bar'); addBar.type='button'; addBar.append(createLineIcon('plus'),document.createTextNode(' ADD DESTINATION')); addBar.addEventListener('click',()=>openEditor(null));
    const addHome=node('button','itinerary-add-home'); addHome.type='button'; addHome.append(createLineIcon('home'),document.createTextNode(' ADD HOME VISIT'));
    addHome.addEventListener('click',()=>openHomeVisitEditor({stateService,host:main,currentDate,prepareRecordVisibility}));
    actionRow.append(addBar,addHome);
    main.append(actionRow);
    controls.append(search, years);
    main.append(controls);

    const upcomingPanel = node('section', 'itinerary-panel itinerary-upcoming-panel');
    const upcomingHead = node('div', 'itinerary-section-head');
    upcomingHead.append(node('h2', '', 'Upcoming Itinerary'), node('span', 'itinerary-count', String(model.upcoming.length)));
    upcomingPanel.append(upcomingHead);
    const upcomingPaged=itineraryPagedList(model.upcoming,options.upcomingPage,item=>openItineraryEntryDetail({host:main,stateService,record:item,openEditor}),page=>{options={...options,upcomingPage:page};rememberOptions();renderContent();});
    options={...options,upcomingPage:upcomingPaged.page};
    upcomingPanel.append(upcomingPaged.list,upcomingPaged.pager);
    main.append(upcomingPanel);
    makeExpandableCard(upcomingPanel,{host:main,title:'Upcoming Itinerary',tone:'blue',bodyBuilder:()=>itineraryUpcomingExpandedBody(model,item=>openItineraryEntryDetail({host:main,stateService,record:item,openEditor}))});

    const completed = document.createElement('details');
    completed.className = 'itinerary-panel itinerary-completed';
    completed.open = options.completedOpen;
    const summary = node('summary', '', `Completed Itinerary (${model.completed.length})`);
    completed.append(summary);
    const completedPaged=itineraryPagedList(model.completed,options.completedPage,item=>openItineraryEntryDetail({host:main,stateService,record:item,openEditor}),page=>{options={...options,completedPage:page};rememberOptions();renderContent();});
    options={...options,completedPage:completedPaged.page};
    completed.append(completedPaged.list,completedPaged.pager);
    completed.addEventListener('toggle', () => { options = { ...options, completedOpen:completed.open }; rememberOptions(); if (stateService.snapshot().ui?.itineraryCompletedOpen === completed.open) return; stateService.commit(draft => { draft.ui.itineraryCompletedOpen = completed.open; }); });
    main.append(completed);

    search.addEventListener('input', event => {
      const caret = event.target.selectionStart ?? event.target.value.length;
      const selectionEnd = event.target.selectionEnd ?? caret;
      options = { ...options, searchQuery:event.target.value, upcomingPage:1, completedPage:1 };
      rememberOptions();
      renderContent();
      const nextSearch = main.querySelector('.itinerary-search');
      nextSearch?.focus();
      nextSearch?.setSelectionRange(Math.min(caret, nextSearch.value.length), Math.min(selectionEnd, nextSearch.value.length));
    });

    if (pending?.collection === 'itinerary' && pending.id && state.itinerary.some(record => record.id === pending.id)) {
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          const target = draft.itinerary.find(record => record.id === pending.id);
          if (target && String(target.endDate || '') < String(currentDate || '')) draft.ui.itineraryCompletedOpen = true;
        });
        const liveHost = document.querySelector('[data-screen="itinerary"]');
        if (liveHost) openEditor(pending.id,pending.editorTone||null);
      });
    }

  }

  renderContent();
  return main;
}
