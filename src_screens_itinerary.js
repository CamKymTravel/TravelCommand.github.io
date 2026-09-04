import { buildItineraryViewModel } from './src_core_itinerary-view-model.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { saveItineraryDraft, deleteItineraryDraft } from './src_core_itinerary-mutations.js';
import { renderOfflineMap } from './src_components_offline-map.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { formatMoney } from './src_core_currency.js';
import { isTravelYearSelected, toggleTravelYear } from './src_core_year-filters.js';
import { formatAUDate } from './src_core_dates.js';

const TRAVEL_TYPE_LABELS = Object.freeze({ standard:'Standard', motorhome:'Motorhome', cruise:'Cruise' });
const ITINERARY_TRANSIENT_VIEW = new WeakMap();

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

function formValues(body) {
  const value = name => body.querySelector(`[name="${name}"]`)?.value ?? '';
  return {
    name: value('name'),
    country: value('country'),
    travelType: body.dataset.travelType,
    startDate: value('startDate'),
    endDate: value('endDate'),
    startCity: value('startCity'),
    startCountry: value('startCountry'),
    localCurrency: value('localCurrency') || null,
    fixedLocalPerAUD: value('fixedLocalPerAUD') === '' ? null : Number(value('fixedLocalPerAUD')),
    destinationBudgetAUD: 0,
    lat: value('lat') === '' ? null : Number(value('lat')),
    long: value('long') === '' ? null : Number(value('long'))
  };
}

function routeValues(body) {
  return [...body.querySelectorAll('.itinerary-route-row')].map(row => ({
    id: row.dataset.id || null,
    name: row.querySelector('[name="routeName"]')?.value || '',
    lat: row.querySelector('[name="routeLat"]')?.value === '' ? null : Number(row.querySelector('[name="routeLat"]')?.value),
    long: row.querySelector('[name="routeLong"]')?.value === '' ? null : Number(row.querySelector('[name="routeLong"]')?.value)
  }));
}

function openItineraryEditor({ stateService, host, currentDate, entryId = null, prepareRecordVisibility = null, editorTone = null }) {
  const state = stateService.snapshot();
  const existing = entryId ? state.itinerary.find(item => item.id === entryId) : null;
  if (entryId && !existing) return;
  const originalFields = existing ? structuredClone(existing) : {
    name:'', country:'', travelType:'standard', startDate:'', endDate:'', startCity:'', startCountry:'', localCurrency:'', fixedLocalPerAUD:null, destinationBudgetAUD:0, lat:null, long:null
  };
  const originalRoutePoints = existing
    ? state.routePoints.filter(point => point.itineraryId === existing.id).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map(point => structuredClone(point))
    : [];
  const formSession = new FormSession({ fields:originalFields, routePoints:originalRoutePoints });

  let modal = null;
  const body = node('div', 'itinerary-editor');
  const error = node('p', 'itinerary-form-error');
  const typeTiles = node('div', 'itinerary-type-tiles');
  typeTiles.setAttribute('role', 'group');
  typeTiles.setAttribute('aria-label', 'Travel type');
  const fields = node('div', 'itinerary-form-grid');
  const routeSection = node('section', 'itinerary-route-editor');
  let routeDraft = originalRoutePoints.map(point => structuredClone(point));

  function renderRouteRows(points = routeDraft) {
    routeDraft = points.map(point => structuredClone(point));
    routeSection.replaceChildren();
    if (body.dataset.travelType === 'standard') return;
    const head = node('div', 'itinerary-route-head');
    head.append(node('div', '', 'Route Points'));
    const add = node('button', 'button itinerary-small-button', 'Add Route Point');
    add.type = 'button';
    add.addEventListener('click', () => preserveLocalFocus(() => {
      routeDraft = routeValues(body);
      routeDraft.push({ id:null, name:'', lat:'', long:'' });
      renderRouteRows(routeDraft);
    }));
    head.append(add);
    routeSection.append(head);
    const list = node('div', 'itinerary-route-list');
    points.forEach((point, index) => {
      const row = node('div', 'itinerary-route-row');
      if (point.id) row.dataset.id = point.id;
      row.append(inputField(`Stop ${index + 1}`, 'routeName', 'text', point.name));
      row.append(inputField('Latitude', 'routeLat', 'number', point.lat ?? ''));
      row.append(inputField('Longitude', 'routeLong', 'number', point.long ?? ''));
      const remove = node('button', 'button itinerary-route-remove', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove route stop ${index + 1}: ${String(point.name || '').trim() || 'unnamed stop'}`);
      remove.addEventListener('click', () => preserveLocalFocus(() => {
        routeDraft = routeValues(body);
        routeDraft.splice(index, 1);
        renderRouteRows(routeDraft);
      }, { fallbackSelector:'.itinerary-small-button' }));
      row.append(remove);
      list.append(row);
    });
    if (!points.length) list.append(node('p', 'itinerary-empty', 'No route points yet.'));
    routeSection.append(list);
  }

  function populate(savedFields, savedRoutePoints) {
    error.textContent = '';
    body.dataset.travelType = savedFields.travelType || 'standard';
    setModalTone(modal, editorTone || (body.dataset.travelType === 'motorhome' ? 'orange' : body.dataset.travelType === 'cruise' ? 'violet' : 'indigo'));
    typeTiles.replaceChildren();
    for (const [type, label] of [['standard','Standard'],['motorhome','Motorhome'],['cruise','Cruise']]) {
      const button = node('button', 'itinerary-type-tile', label);
      button.type = 'button';
      button.dataset.travelType = type;
      const active = type === body.dataset.travelType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      if (active) button.append(node('span', 'itinerary-selected-tick', '✓'));
      button.addEventListener('click', () => {
        if (body.dataset.travelType !== 'standard') routeDraft = routeValues(body);
        body.dataset.travelType = type;
        const startCountryInput = fields.querySelector('[name="startCountry"]');
        const startCountryField = startCountryInput?.closest('label');
        if (startCountryField) startCountryField.hidden = type === 'standard';
        if (startCountryInput) startCountryInput.required = type !== 'standard';
        if (!editorTone) setModalTone(modal, type === 'motorhome' ? 'orange' : type === 'cruise' ? 'violet' : 'indigo');
        for (const tile of typeTiles.children) {
          const tileActive = tile.dataset.travelType === type;
          tile.dataset.active = String(tileActive);
          tile.setAttribute('aria-pressed', String(tileActive));
          tile.querySelector('.itinerary-selected-tick')?.remove();
          if (tileActive) tile.append(node('span', 'itinerary-selected-tick', '✓'));
        }
        renderRouteRows(routeDraft);
      });
      typeTiles.append(button);
    }

    const currencyField = inputField('Local Currency', 'localCurrency', 'text', savedFields.localCurrency || '');
    const rateField = inputField('Local per AUD', 'fixedLocalPerAUD', 'number', savedFields.fixedLocalPerAUD ?? '');
    const normalDatedCostsExist = Boolean(existing && [
      ...(state.expenses || []),
      ...(state.reservations || [])
    ].some(record => record.itineraryId === existing.id && !record.needsBudgetRepair));
    if (normalDatedCostsExist) {
      const currencyInput = currencyField.querySelector('input');
      const rateInput = rateField.querySelector('input');
      if (currencyInput) currencyInput.disabled = true;
      if (rateInput) rateInput.disabled = true;
      currencyField.classList.add('is-locked');
      rateField.classList.add('is-locked');
    }
    const startCountryField = inputField('Starting Country', 'startCountry', 'text', savedFields.startCountry || '');
    startCountryField.hidden = body.dataset.travelType === 'standard';
    const startCountryInput = startCountryField.querySelector('input');
    if (startCountryInput) startCountryInput.required = body.dataset.travelType !== 'standard';
    fields.replaceChildren(
      inputField('Destination / Trip Name', 'name', 'text', savedFields.name),
      inputField('Country', 'country', 'text', savedFields.country),
      inputField('Start Date', 'startDate', 'date', savedFields.startDate),
      inputField('End Date', 'endDate', 'date', savedFields.endDate),
      inputField('Starting City', 'startCity', 'text', savedFields.startCity),
      startCountryField,
      currencyField,
      rateField,
      inputField('Map Latitude', 'lat', 'number', savedFields.lat ?? ''),
      inputField('Map Longitude', 'long', 'number', savedFields.long ?? '')
    );
    if (normalDatedCostsExist) {
      const note = node('p', 'itinerary-field-lock-note', 'Local currency and fixed exchange rate are locked because this stay already has dated costs. Stay dates can still be changed when every dated cost remains safely linked to this exact stay.');
      fields.append(note);
    }
    routeDraft = savedRoutePoints.map(point => structuredClone(point));
    renderRouteRows(routeDraft);
  }

  body.append(typeTiles, fields, routeSection, error);
  populate(originalFields, originalRoutePoints);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete itinerary entry',
        message:`Delete ${existing.name} · ${formatAUDate(existing.startDate)} – ${formatAUDate(existing.endDate)}? This cannot be undone.${originalRoutePoints.length ? ` Its ${originalRoutePoints.length} saved route point${originalRoutePoints.length === 1 ? '' : 's'} will also be deleted.` : ''} Linked Expenses, Reservations, Checklist items and Calendar reminders/notes must be removed first.`,
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
        const fieldsValue = formValues(body);
        fieldsValue.destinationBudgetAUD = Number(existing?.destinationBudgetAUD || 0);
        const points = fieldsValue.travelType === 'standard' ? [] : routeValues(body);
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
            error.textContent = err.message;
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
        error.textContent = err.message;
      }
    }}
  );

  const itineraryTone = existing ? (originalFields.travelType === 'motorhome' ? 'orange' : originalFields.travelType === 'cruise' ? 'violet' : 'indigo') : 'indigo';
  modal = createModal({ title:existing ? 'Edit Destination / Trip' : 'Add Destination', body, actions, className:`tcc-editor-modal tcc-itinerary-editor-modal tone-${editorTone || itineraryTone}` });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function renderStats(model) {
  const stats = node('section', 'itinerary-stats');
  const items = [
    ['countries','Countries Planned',model.stats.countriesPlanned],
    ['routes','Route Trips',model.stats.routeTrips],
    ['stops','Planned Stops',model.stats.plannedStops],
    ['gaps','Unplanned Gaps',model.stats.missingCoverage],
    ['stays','Missing Stays',model.stats.missingStays],
    ['overlaps','Date Overlaps',model.stats.dateOverlaps]
  ];
  for (const [key,label,value] of items) {
    const card = node('article', `itinerary-stat itinerary-stat-${key}`);
    card.append(node('strong', '', String(value)), node('span', '', label));
    stats.append(card);
  }
  return stats;
}

function renderMap(model, host) {
  const panel = node('section', 'itinerary-panel itinerary-map-panel');
  const head = node('div', 'itinerary-map-title-row');
  const copy=node('div'); copy.append(node('p','eyebrow','FORWARD PLANNING MAP'),node('h2','','Where We\'re Going'));
  const expand=node('button','button itinerary-expand-map','Expand Map'); expand.type='button';
  expand.addEventListener('click',()=>{ const body=node('div','itinerary-expanded-map'); body.append(renderOfflineMap(model.journeyMap,{ariaLabel:'Expanded forward planning map',fitToPoints:true,labelMode:'key'})); const modal=createModal({title:'Forward Journey Plan',body,actions:[{label:'Close / Return to Itinerary',onClick:d=>d.close()}],className:'tone-blue'}); host.append(modal); modal.showModal(); modal.addEventListener('close',()=>modal.remove(),{once:true}); });
  head.append(copy,expand); panel.append(head);
  const first=model.currentStay||null, next=model.nextDestination||null; const routePoints=model.upcoming.reduce((s,r)=>s+Number(r.routePointCount||0),0);
  const metrics=node('div','itinerary-map-metrics'); const data=[['Current',first?.name||'—'],['Next',next?.name||'—'],['Planned Stops',String(model.stats.plannedStops)],['Detailed Route Points',String(routePoints)],['Route Trips',String(model.stats.routeTrips)],['Missing Coverage',String(model.stats.missingCoverage)]]; for(const [label,value] of data){const m=node('article','itinerary-map-metric');m.append(node('span','',label),node('strong','',value));metrics.append(m);} panel.append(metrics);
  const stage = node('div', 'itinerary-map-stage'); stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Itinerary forward planning map', fitToPoints:true, labelMode:'key' })); panel.append(stage);
  const legend=node('div','itinerary-map-legend'); for(const [cls,label] of [['standard','Flight / Standard'],['motorhome','Motorhome'],['cruise','Cruise']]){const item=node('span','');item.append(node('i',`itinerary-legend-line itinerary-legend-${cls}`),node('b','',label));legend.append(item);} panel.append(legend); return panel;
}

function renderYearFilters(model, options, onChange) {
  const filters = node('div', 'itinerary-year-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter itinerary by Travel Year');
  for (const year of ['all', ...(model.journeyMap.availableYears || [])]) {
    const button = node('button', 'itinerary-year-button', year === 'all' ? 'All Years' : `Year ${year}`);
    button.type = 'button';
    const active = isTravelYearSelected(options.mapYears, year);
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => preserveLocalFocus(() => onChange(toggleTravelYear(options.mapYears, year))));
    filters.append(button);
  }
  return filters;
}

function renderCoverage(model, months = 6, onMonthsChange = null, openEditor = null) {
  const panel = node('section', 'itinerary-panel itinerary-coverage itinerary-coverage-reference');
  const hasCoverage=Number(model.forwardCoverage.horizonDays)>0;
  const head = node('div', 'itinerary-section-head'); const title=node('div'); title.append(node('h2','','Forward Coverage'),node('small','',hasCoverage?`${formatAUDate(model.forwardCoverage.startDate)} – ${formatAUDate(model.forwardCoverage.endDate)}`:'Planning not started'));
  if(hasCoverage){const switches=node('div','itinerary-coverage-switches'); switches.setAttribute('role','group'); switches.setAttribute('aria-label','Forward coverage period'); for(const value of [3,6,12]){const b=node('button','itinerary-coverage-switch',`${value} months`);b.type='button';const active=value===months;b.dataset.active=String(active);b.setAttribute('aria-pressed',String(active));b.addEventListener('click',()=>preserveLocalFocus(()=>onMonthsChange?.(value)));switches.append(b);} head.append(title,switches);} else head.append(title);
  panel.append(head);
  if(!hasCoverage){panel.append(node('p','itinerary-empty','Set Journey Start in Settings or add your first destination to begin Forward Coverage.'));return panel;}
  const summary=node('div','itinerary-coverage-summary');
  const gapTone=model.forwardCoverage.gapDays?'warn':'clear';
  const coverageTone=model.forwardCoverage.coveragePercent>=100?'complete':model.forwardCoverage.coveragePercent>=80?'progress':'warn';
  summary.append(
    paceCoverage(`${model.forwardCoverage.plannedDays}`,'days planned','planned'),
    paceCoverage(`${model.forwardCoverage.gapDays}`,'uncovered days',gapTone),
    paceCoverage(`${model.forwardCoverage.overlapDays}`,'overlap days',model.forwardCoverage.overlapDays?'warn':'clear'),
    paceCoverage(`${model.forwardCoverage.coveragePercent}%`,'covered',coverageTone)
  );
  panel.append(summary);
  const timeline=node('div','itinerary-coverage-timeline');
  for(const segment of model.forwardCoverage.segments||[]){
    if(segment.type==='gap'){
      const gap=node('div','itinerary-coverage-segment itinerary-segment-gap');gap.style.flexGrow=String(Math.max(1,segment.days));gap.append(node('strong','','UNCOVERED'),node('small','',`${segment.days}d`));gap.setAttribute('role','img');gap.setAttribute('aria-label',`Uncovered itinerary dates · ${formatAUDate(segment.startDate)} – ${formatAUDate(segment.endDate)} · ${segment.days} day${segment.days===1?'':'s'}`);timeline.append(gap);continue;
    }
    const seg=node('button',`itinerary-coverage-segment itinerary-segment-${segment.travelType}`);seg.type='button';seg.style.flexGrow=String(Math.max(1,segment.days));seg.append(node('strong','',segment.name),node('small','',`${segment.days}d`));seg.setAttribute('aria-label',`Open ${segment.name} itinerary · ${formatAUDate(segment.startDate)} – ${formatAUDate(segment.endDate)}`);seg.addEventListener('click',()=>openEditor?.(segment.id));timeline.append(seg);
  }
 panel.append(timeline); return panel;
}
function paceCoverage(value,label,tone=''){const m=node('article',`itinerary-coverage-box ${tone}`);m.append(node('strong','',value),node('span','',label));return m;}

function renderEntry(record, openEditor) {
  const button = node('button', `itinerary-entry itinerary-entry-${record.travelType}`); button.type='button'; button.addEventListener('click',()=>openEditor(record.id));
  const dates=node('span','itinerary-entry-dates'); dates.append(node('strong','',record.displayDates.split(' – ')[0]||''),node('small','','TO'),node('strong','',record.displayDates.split(' – ')[1]||''),node('em','',`${record.days} days`));
  const copy=node('span','itinerary-entry-copy'); copy.append(node('strong','',record.name),node('small','',[record.country,TRAVEL_TYPE_LABELS[record.travelType] || record.travelType].filter(Boolean).join(' · '))); const badges=node('span','itinerary-entry-badges'); if(record.hasAccommodation)badges.append(node('i','','ACCOMMODATION LINKED')); if(record.travelType!=='standard')badges.append(node('i','',`${record.routePointCount} ROUTE POINTS`)); copy.append(badges);
  const plan=node('span','itinerary-entry-plan'); plan.append(node('small','','TRAVEL PLAN'),node('strong','',record.travelType==='motorhome'?'Motorhome':record.travelType==='cruise'?'Cruise':'Standard'));
  const budget=node('span','itinerary-entry-budget'); budget.append(node('small','','DESTINATION BUDGET'),node('strong','',formatMoney(record.destinationBudgetAUD,'AUD')));
  button.append(dates,copy,plan,budget);
  button.setAttribute('aria-label',[
    'Open itinerary stay',
    record.name,
    record.country,
    record.displayDates,
    TRAVEL_TYPE_LABELS[record.travelType] || record.travelType
  ].filter(Boolean).join(' · '));
  return button;
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
    coverageMonths:[3,6,12].includes(Number(remembered?.coverageMonths)) ? Number(remembered.coverageMonths) : 6
  };
  const rememberOptions = () => ITINERARY_TRANSIENT_VIEW.set(stateService, { mapYears:[...options.mapYears], searchQuery:options.searchQuery, coverageMonths:options.coverageMonths });
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

  const openEditor = (entryId, editorTone = null) => openItineraryEditor({ stateService, host:main, currentDate, entryId, prepareRecordVisibility, editorTone });

  function renderContent() {
    const state = stateService.snapshot();
    const pending = state.ui?.pendingOpen;
    // Exact-record navigation must show the selected stay in the surrounding
    // Itinerary as well as in the editor. Clear only the row filters; coverage
    // horizon and other screen state are retained.
    if (pending?.collection === 'itinerary' && pending.id && state.itinerary.some(record => record.id === pending.id)) prepareRecordVisibility();
    const model = buildItineraryViewModel(state, currentDate, options);
    main.replaceChildren();

    const homeModel = buildHomeViewModel(state, currentDate, { alertLimit:0, eventLimit:0 });
    main.append(createStayBanner({ currentStay:homeModel.currentStay, nextDestination:homeModel.nextDestination, navigate, className:'itinerary-stay-banner' }));

    const toolbar = node('header', 'itinerary-toolbar');
    const title = node('div');
    title.append(node('p', 'eyebrow', 'TRAVEL PLANNING'), node('h1', '', 'Itinerary'));
    toolbar.append(title);
    main.append(toolbar);

    const mapPanel=renderMap(model, main);
    const coveragePanel=renderCoverage(model, options.coverageMonths, months => { options={...options,coverageMonths:months}; rememberOptions(); renderContent(); }, id=>openEditor(id,'indigo'));
    const statsPanel=renderStats(model);
    main.append(mapPanel,coveragePanel,statsPanel);
    makeExpandableCard(coveragePanel,{host:main,title:'Forward Coverage',tone:'indigo'});
    const statTones={countries:'teal',routes:'indigo',stops:'blue',gaps:'gold',stays:'orange',overlaps:'red'};
    for(const stat of statsPanel.querySelectorAll('.itinerary-stat')){
      const kind=[...stat.classList].find(name=>name.startsWith('itinerary-stat-'))?.replace('itinerary-stat-','')||'blue';
      makeExpandableCard(stat,{host:main,title:stat.querySelector('span')?.textContent||'Itinerary Statistic',tone:statTones[kind]||'blue'});
    }

    const controls = node('section', 'itinerary-controls');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'itinerary-search';
    search.placeholder = 'Search itinerary';
    search.setAttribute('aria-label', 'Search itinerary');
    search.value = options.searchQuery;
    const years = renderYearFilters(model, options, nextYears => {
      options = { ...options, mapYears:nextYears };
      rememberOptions();
      renderContent();
    });
    const addBar=node('button','itinerary-add-bar','＋ ADD DESTINATION'); addBar.type='button'; addBar.addEventListener('click',()=>openEditor(null));
    main.append(addBar);
    controls.append(search, years);
    main.append(controls);

    const upcomingPanel = node('section', 'itinerary-panel');
    const upcomingHead = node('div', 'itinerary-section-head');
    upcomingHead.append(node('h2', '', 'Upcoming Itinerary'), node('span', 'itinerary-count', String(model.upcoming.length)));
    upcomingPanel.append(upcomingHead);
    const upcomingList = node('div', 'itinerary-list');
    if (!model.upcoming.length) upcomingList.append(node('p', 'itinerary-empty', 'No entries yet'));
    else for (const record of model.upcoming) upcomingList.append(renderEntry(record, id=>openEditor(id,'blue')));
    upcomingPanel.append(upcomingList);
    main.append(upcomingPanel);
    makeExpandableCard(upcomingPanel,{host:main,title:'Upcoming Itinerary',tone:'blue'});

    const completed = document.createElement('details');
    completed.className = 'itinerary-panel itinerary-completed';
    completed.open = options.completedOpen;
    const summary = node('summary', '', `Completed Itinerary (${model.completed.length})`);
    completed.append(summary);
    const completedList = node('div', 'itinerary-list');
    if (!model.completed.length) completedList.append(node('p', 'itinerary-empty', 'No entries yet'));
    else for (const record of model.completed) completedList.append(renderEntry(record, openEditor));
    completed.append(completedList);
    completed.addEventListener('toggle', () => { options = { ...options, completedOpen:completed.open }; rememberOptions(); if (stateService.snapshot().ui?.itineraryCompletedOpen === completed.open) return; stateService.commit(draft => { draft.ui.itineraryCompletedOpen = completed.open; }); });
    main.append(completed);

    search.addEventListener('input', event => {
      const caret = event.target.selectionStart ?? event.target.value.length;
      const selectionEnd = event.target.selectionEnd ?? caret;
      options = { ...options, searchQuery:event.target.value };
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
        if (liveHost) openItineraryEditor({ stateService, host:liveHost, currentDate, entryId:pending.id, editorTone:pending.editorTone || null });
      });
    }

  }

  renderContent();
  return main;
}
