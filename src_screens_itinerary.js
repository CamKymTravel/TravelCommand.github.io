import { buildItineraryViewModel } from './src_core_itinerary-view-model.js';
import { saveItineraryDraft, deleteItineraryDraft } from './src_core_itinerary-mutations.js';
import { renderOfflineMap } from './src_components_offline-map.js';
import { createModal } from './src_components_modal.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { formatMoney } from './src_core_currency.js';
import { isTravelYearSelected, toggleTravelYear } from './src_core_year-filters.js';

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
    localCurrency: value('localCurrency') || null,
    fixedLocalPerAUD: value('fixedLocalPerAUD') === '' ? null : Number(value('fixedLocalPerAUD')),
    destinationBudgetAUD: value('destinationBudgetAUD') === '' ? 0 : Number(value('destinationBudgetAUD')),
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

function openItineraryEditor({ stateService, host, entryId = null }) {
  const state = stateService.snapshot();
  const existing = entryId ? state.itinerary.find(item => item.id === entryId) : null;
  if (entryId && !existing) return;
  const originalFields = existing ? structuredClone(existing) : {
    name:'', country:'', travelType:'standard', startDate:'', endDate:'', startCity:'', localCurrency:'', fixedLocalPerAUD:null, destinationBudgetAUD:0, lat:null, long:null
  };
  const originalRoutePoints = existing
    ? state.routePoints.filter(point => point.itineraryId === existing.id).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map(point => structuredClone(point))
    : [];
  const formSession = new FormSession({ fields:originalFields, routePoints:originalRoutePoints });

  const body = node('div', 'itinerary-editor');
  const error = node('p', 'itinerary-form-error');
  const typeTiles = node('div', 'itinerary-type-tiles');
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
    add.addEventListener('click', () => {
      routeDraft = routeValues(body);
      routeDraft.push({ id:null, name:'', lat:'', long:'' });
      renderRouteRows(routeDraft);
    });
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
      remove.addEventListener('click', () => {
        routeDraft = routeValues(body);
        routeDraft.splice(index, 1);
        renderRouteRows(routeDraft);
      });
      row.append(remove);
      list.append(row);
    });
    if (!points.length) list.append(node('p', 'itinerary-empty', 'No route points yet.'));
    routeSection.append(list);
  }

  function populate(savedFields, savedRoutePoints) {
    error.textContent = '';
    body.dataset.travelType = savedFields.travelType || 'standard';
    typeTiles.replaceChildren();
    for (const [type, label] of [['standard','Standard'],['motorhome','Motorhome'],['cruise','Cruise']]) {
      const button = node('button', 'itinerary-type-tile', label);
      button.type = 'button';
      const active = type === body.dataset.travelType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => {
        if (body.dataset.travelType !== 'standard') routeDraft = routeValues(body);
        body.dataset.travelType = type;
        for (const tile of typeTiles.children) {
          const tileActive = tile.textContent.toLocaleLowerCase() === label.toLocaleLowerCase();
          tile.dataset.active = String(tileActive);
          tile.setAttribute('aria-pressed', String(tileActive));
        }
        renderRouteRows(routeDraft);
      });
      typeTiles.append(button);
    }

    fields.replaceChildren(
      inputField('Destination / Trip Name', 'name', 'text', savedFields.name),
      inputField('Country', 'country', 'text', savedFields.country),
      inputField('Start Date', 'startDate', 'date', savedFields.startDate),
      inputField('End Date', 'endDate', 'date', savedFields.endDate),
      inputField('Starting City', 'startCity', 'text', savedFields.startCity),
      inputField('Local Currency', 'localCurrency', 'text', savedFields.localCurrency || ''),
      inputField('Local per AUD', 'fixedLocalPerAUD', 'number', savedFields.fixedLocalPerAUD ?? ''),
      inputField('Destination / Trip Budget (AUD)', 'destinationBudgetAUD', 'number', savedFields.destinationBudgetAUD ?? 0),
      inputField('Map Latitude', 'lat', 'number', savedFields.lat ?? ''),
      inputField('Map Longitude', 'long', 'number', savedFields.long ?? '')
    );
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
        message:`Delete ${existing.name}? This cannot be undone. Linked financial records must be removed first.`,
        onConfirm:() => {
          try {
            stateService.commit(draft => deleteItineraryDraft(draft, existing.id));
            if (dialog.isConnected && dialog.open) dialog.close();
          } catch (err) {
            error.textContent = err.message;
          }
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
        const points = fieldsValue.travelType === 'standard' ? [] : routeValues(body);
        const formDraft = formSession.update(draft => { draft.fields = fieldsValue; draft.routePoints = points; });
        stateService.commit(draft => saveItineraryDraft(draft, { entryId:existing?.id || null, fields:formDraft.fields, routePoints:formDraft.routePoints }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) {
        error.textContent = err.message;
      }
    }}
  );

  const modal = createModal({ title:existing ? 'Edit Destination / Trip' : 'Add Destination', body, actions });
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
    ['gaps','Unplanned Gaps',model.stats.unplannedGaps],
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

function renderMap(model) {
  const panel = node('section', 'itinerary-panel itinerary-map-panel');
  const head = node('div', 'itinerary-section-head');
  head.append(node('h2', '', 'Forward Planning Map'));
  panel.append(head);
  const stage = node('div', 'itinerary-map-stage');
  stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Itinerary forward planning map' }));
  panel.append(stage);
  return panel;
}

function renderYearFilters(model, options, onChange) {
  const filters = node('div', 'itinerary-year-filters');
  filters.setAttribute('aria-label', 'Filter itinerary by Travel Year');
  for (const year of ['all', ...(model.journeyMap.availableYears || [])]) {
    const button = node('button', 'itinerary-year-button', year === 'all' ? 'All Years' : `Year ${year}`);
    button.type = 'button';
    const active = isTravelYearSelected(options.mapYears, year);
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => onChange(toggleTravelYear(options.mapYears, year)));
    filters.append(button);
  }
  return filters;
}

function renderCoverage(model) {
  const panel = node('section', 'itinerary-panel itinerary-coverage');
  const head = node('div', 'itinerary-section-head');
  head.append(node('h2', '', 'Forward Coverage'), node('strong', 'itinerary-coverage-percent', `${model.forwardCoverage.coveragePercent}%`));
  panel.append(head);
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = model.forwardCoverage.coveragePercent;
  progress.setAttribute('aria-label', 'Forward itinerary coverage');
  panel.append(progress);
  const meta = node('div', 'itinerary-coverage-meta');
  meta.append(
    node('span', '', `${model.forwardCoverage.plannedDays} planned days`),
    node('span', '', `${model.forwardCoverage.gapDays} uncovered days`)
  );
  panel.append(meta);
  return panel;
}

function renderEntry(record, openEditor) {
  const button = node('button', 'itinerary-entry');
  button.type = 'button';
  button.addEventListener('click', () => openEditor(record.id));
  const copy = node('span', 'itinerary-entry-copy');
  copy.append(node('strong', '', record.name));
  const line = [record.country, record.displayDates, `Year ${record.travelYear || '—'}`].filter(Boolean).join(' · ');
  copy.append(node('small', '', line));
  const meta = node('span', 'itinerary-entry-meta');
  meta.append(node('span', 'itinerary-type-badge', record.travelType));
  if (record.travelType !== 'standard') meta.append(node('small', '', `${record.routePointCount} route points`));
  meta.append(node('strong', '', formatMoney(record.destinationBudgetAUD, 'AUD')));
  button.append(copy, meta);
  return button;
}

export function renderItineraryScreen({ stateService, currentDate }) {
  const main = node('main', 'screen-root itinerary-screen');
  main.dataset.screen = 'itinerary';
  let options = { mapYears:['all'], searchQuery:'', completedOpen:false };

  const openEditor = entryId => openItineraryEditor({ stateService, host:main, entryId });

  function renderContent() {
    const state = stateService.snapshot();
    const model = buildItineraryViewModel(state, currentDate, options);
    main.replaceChildren();

    const toolbar = node('header', 'itinerary-toolbar');
    const title = node('div');
    title.append(node('p', 'eyebrow', 'TRAVEL PLANNING'), node('h1', '', 'Itinerary'));
    toolbar.append(title);
    main.append(toolbar);

    main.append(renderMap(model), renderCoverage(model), renderStats(model));

    const controls = node('section', 'itinerary-controls');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'itinerary-search';
    search.placeholder = 'Search itinerary';
    search.setAttribute('aria-label', 'Search itinerary');
    search.value = options.searchQuery;
    const add = node('button', 'button itinerary-add', 'Add Destination');
    add.type = 'button';
    add.addEventListener('click', () => openEditor(null));
    const years = renderYearFilters(model, options, nextYears => {
      options = { ...options, mapYears:nextYears };
      renderContent();
    });
    controls.append(search, years, add);
    main.append(controls);

    const upcomingPanel = node('section', 'itinerary-panel');
    const upcomingHead = node('div', 'itinerary-section-head');
    upcomingHead.append(node('h2', '', 'Upcoming Itinerary'), node('span', 'itinerary-count', String(model.upcoming.length)));
    upcomingPanel.append(upcomingHead);
    const upcomingList = node('div', 'itinerary-list');
    if (!model.upcoming.length) upcomingList.append(node('p', 'itinerary-empty', 'No entries yet'));
    else for (const record of model.upcoming) upcomingList.append(renderEntry(record, openEditor));
    upcomingPanel.append(upcomingList);
    main.append(upcomingPanel);

    const completed = document.createElement('details');
    completed.className = 'itinerary-panel itinerary-completed';
    completed.open = options.completedOpen;
    const summary = node('summary', '', `Completed Itinerary (${model.completed.length})`);
    completed.append(summary);
    const completedList = node('div', 'itinerary-list');
    if (!model.completed.length) completedList.append(node('p', 'itinerary-empty', 'No entries yet'));
    else for (const record of model.completed) completedList.append(renderEntry(record, openEditor));
    completed.append(completedList);
    completed.addEventListener('toggle', () => { options = { ...options, completedOpen:completed.open }; });
    main.append(completed);

    search.addEventListener('input', event => {
      options = { ...options, searchQuery:event.target.value };
      renderContent();
      const nextSearch = main.querySelector('.itinerary-search');
      nextSearch?.focus();
      nextSearch?.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
    });

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'itinerary' && pending.id && state.itinerary.some(record => record.id === pending.id)) {
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => { draft.ui.pendingOpen = null; });
        const liveHost = document.querySelector('[data-screen="itinerary"]');
        if (liveHost) openItineraryEditor({ stateService, host:liveHost, entryId:pending.id });
      });
    }

  }

  renderContent();
  return main;
}
