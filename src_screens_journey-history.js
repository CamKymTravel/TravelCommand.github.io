import { buildJourneyHistoryViewModel } from './src_core_journey-history-view-model.js';
import { createPageHero } from './src_components_page-hero.js';
import { formatMoney } from './src_core_currency.js';
import { renderOfflineMap, buildMapGeometry } from './src_components_offline-map.js';
import { toggleTravelYear, isTravelYearSelected } from './src_core_year-filters.js';
import { formatAUDate } from './src_core_dates.js';
import { makeExpandableCard, preserveLocalFocus } from './src_components_modal.js';

const TYPE_ICONS = Object.freeze({ standard:'🌐', motorhome:'🚐', cruise:'🚢' });
const TYPE_LABELS = Object.freeze({ standard:'Standard', motorhome:'Motorhome', cruise:'Cruise' });
const SUMMARY_ICONS = Object.freeze({ countries:'◎', destinations:'⌖', days:'▣', years:'⌛', spend:'$' });
const JOURNEY_TRANSIENT_VIEW = new WeakMap();

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function integer(value) { return new Intl.NumberFormat('en-AU', { maximumFractionDigits:0 }).format(Number(value || 0)); }
function kilometres(value) { return `${integer(Math.round(Number(value || 0)))} km`; }

function renderSummary(model) {
  const grid = node('section', 'journey-summary-grid');
  const cards = [
    ['countries', integer(model.summary.countriesVisited), 'Countries Visited'],
    ['destinations', integer(model.summary.destinationsCompleted), 'Destinations Completed'],
    ['days', integer(model.summary.daysTravelled), 'Days Travelled'],
    ['years', String(model.summary.yearsOnRoad), 'Years on the Road'],
    ['spend', formatMoney(model.summary.lifetimeTravelSpendAUD, 'AUD').replace(/\.00$/, ''), 'Lifetime Travel Spend']
  ];
  for (const [kind, value, label] of cards) {
    const card = node('article', `journey-summary-card journey-summary-${kind}`);
    const icon = node('span', 'journey-summary-icon', SUMMARY_ICONS[kind] || '•');
    icon.setAttribute('aria-hidden', 'true');
    const copy = node('span', 'journey-summary-copy');
    copy.append(node('strong', '', value), node('span', '', label));
    card.append(icon, copy);
    grid.append(card);
  }
  return grid;
}

function renderYearFilters(model, options, onChange) {
  const filters = node('div', 'journey-year-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter Journey History by Travel Year');
  for (const year of ['all', ...(model.journeyMap.availableYears || [])]) {
    const button = node('button', 'journey-year-button', year === 'all' ? 'All Years' : `Year ${year}`);
    button.type = 'button';
    const active = isTravelYearSelected(options.years, year);
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => preserveLocalFocus(() => onChange(toggleTravelYear(options.years, year))));
    filters.append(button);
  }
  return filters;
}

function renderTypeFilters(options, onChange, className = 'journey-type-filters') {
  const filters = node('div', className);
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter Journey History by travel type');
  for (const type of ['all', 'standard', 'motorhome', 'cruise']) {
    const label = type === 'all' ? 'All Types' : TYPE_LABELS[type];
    const button = node('button', 'journey-type-button', label);
    button.type = 'button';
    const active = (options.travelType || 'all') === type;
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => preserveLocalFocus(() => onChange(type)));
    filters.append(button);
  }
  return filters;
}

function renderMap(model, options, updateYears, updateType) {
  const panel = node('section', 'journey-panel journey-map-panel');
  const head = node('div', 'journey-section-head journey-map-head');
  head.append(node('h2', '', 'Journey Map'));
  panel.append(head);
  const filterStack = node('div', 'journey-map-filter-stack');
  filterStack.append(renderYearFilters(model, options, updateYears), renderTypeFilters(options, updateType));
  panel.append(filterStack);

  const geometry = buildMapGeometry(model.journeyMap);
  const stats = node('div', 'journey-map-stats');
  const values = [
    [model.mapStats.journeys, 'Journeys'],
    [model.mapStats.detailedRoutePoints, 'Detailed Route Points'],
    [geometry.segments.length, 'Map Legs'],
    [model.mapStats.stays, 'Stays'],
    [model.mapStats.motorhome, 'Motorhome'],
    [model.mapStats.cruise, 'Cruise'],
    [integer(model.mapStats.recordedKilometres), 'Recorded km']
  ];
  for (const [value, label] of values) {
    const stat = node('article', 'journey-map-stat');
    stat.append(node('strong', '', String(value)), node('span', '', label));
    stats.append(stat);
  }
  panel.append(stats);

  const stage = node('div', 'journey-map-stage');
  stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Journey History map', labelMode:'none' }));
  panel.append(stage);
  const legend = node('div', 'journey-map-legend');
  for (const type of ['standard','motorhome','cruise']) {
    const item = node('span', `journey-map-legend-${type}`);
    item.append(node('i', ''), node('b', '', TYPE_LABELS[type]));
    legend.append(item);
  }
  panel.append(legend);
  return panel;
}

function typeIcon(row) {
  const icon = node('span', 'journey-type-icon', TYPE_ICONS[row.travelType] || '🌐');
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', TYPE_LABELS[row.travelType] || 'Standard');
  icon.title = TYPE_LABELS[row.travelType] || 'Standard';
  return icon;
}

function renderRecordFilters(model, options, updateOptions) {
  const panel = node('section', 'journey-record-filter-panel');
  const top = node('div', 'journey-record-filter-row');
  const searchWrap = node('label', 'journey-search-wrap');
  searchWrap.append(node('span', 'journey-search-icon', '⌕'));
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'journey-search';
  search.placeholder = 'Search destination, country or travel type';
  search.setAttribute('aria-label', 'Search Journey History destinations');
  search.value = options.searchQuery;
  search.addEventListener('input', event => {
    const value = event.target.value;
    const caret = event.target.selectionStart ?? value.length;
    const selectionEnd = event.target.selectionEnd ?? caret;
    updateOptions({ searchQuery:value, page:1 });
    // updateOptions synchronously replaces the search node. Restore both focus
    // and the user's actual selection so mid-query edits stay at the tap point.
    const nextSearch = document.querySelector('[data-screen="journey-history"] .journey-search');
    nextSearch?.focus();
    nextSearch?.setSelectionRange(Math.min(caret, value.length), Math.min(selectionEnd, value.length));
  });
  searchWrap.append(search);

  const typeSelect = document.createElement('select');
  typeSelect.className = 'journey-record-select';
  typeSelect.setAttribute('aria-label', 'Filter completed stays by travel type');
  for (const type of ['all','standard','motorhome','cruise']) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type === 'all' ? 'All travel types' : TYPE_LABELS[type];
    option.selected = (options.travelType || 'all') === type;
    typeSelect.append(option);
  }
  typeSelect.addEventListener('change', event => preserveLocalFocus(() => updateOptions({ travelType:event.target.value, page:1 })));

  const pageSize = document.createElement('select');
  pageSize.className = 'journey-record-select journey-page-size';
  pageSize.setAttribute('aria-label', 'Rows per page');
  for (const count of [8, 10, 15]) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count} rows`;
    option.selected = Number(options.pageSize || 10) === count;
    pageSize.append(option);
  }
  pageSize.addEventListener('change', event => preserveLocalFocus(() => updateOptions({ pageSize:Number(event.target.value), page:1 })));

  const clear = node('button', 'journey-clear-button', 'Clear');
  clear.type = 'button';
  clear.addEventListener('click', () => preserveLocalFocus(() => updateOptions({ years:['all'], travelType:'all', searchQuery:'', page:1 })));
  top.append(searchWrap, typeSelect, pageSize, clear);
  panel.append(top, renderYearFilters(model, options, years => updateOptions({ years, page:1 })));

  const status = node('div', 'journey-filter-status');
  status.append(
    node('span', '', `${integer(model.rows.length)} completed stays`),
    node('span', '', `${integer(model.destinationTotals.length)} destinations`),
    node('span', '', `${formatMoney(model.totalSpendAUD, 'AUD')} filtered spend`)
  );
  panel.append(status);
  return panel;
}

function renderRows(model, navigate, options, updateOptions) {
  const panel = node('section', 'journey-panel journey-records');
  const pageSize = Number(options.pageSize || 10);
  const pageCount = Math.max(1, Math.ceil(model.rows.length / pageSize));
  const page = Math.min(Math.max(1, Number(options.page || 1)), pageCount);
  const startIndex = (page - 1) * pageSize;
  const rows = model.rows.slice(startIndex, startIndex + pageSize);
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Completed Stays & Trips'), node('span', 'journey-count', String(model.rows.length)));
  panel.append(head);

  const table = node('div', 'journey-table');
  const header = node('div', 'journey-row journey-row-header');
  for (const label of ['Type','Destination','Stay','Days','Avg / Day','Destination Cost','Kilometres']) header.append(node('span', '', label));
  table.append(header);
  if (!rows.length) table.append(node('p', 'journey-empty', 'No entries yet'));
  for (const row of rows) {
    const button = node('button', 'journey-row journey-record-row');
    button.type = 'button';
    button.dataset.recordId = row.id;
    button.addEventListener('click', () => navigate?.('itinerary', { collection:'itinerary', id:row.id }));
    const destination = node('span', 'journey-destination');
    destination.append(node('strong', '', row.name), node('small', '', [row.country, row.travelYear ? `Year ${row.travelYear}` : ''].filter(Boolean).join(' · ')));
    button.append(
      typeIcon(row),
      destination,
      node('span', 'journey-stay-dates', row.displayDates),
      node('span', '', integer(row.days)),
      node('span', '', formatMoney(row.averageCostPerDayAUD, 'AUD')),
      node('span', 'journey-destination-cost', formatMoney(row.spendAUD, 'AUD')),
      node('span', '', kilometres(row.kilometresTravelled))
    );
    button.setAttribute('aria-label', [
      'Open completed itinerary stay',
      row.name,
      row.country,
      row.displayDates,
      row.travelYear ? `Year ${row.travelYear}` : '',
      `${integer(row.days)} days`,
      formatMoney(row.spendAUD, 'AUD')
    ].filter(Boolean).join(' · '));
    table.append(button);
  }
  panel.append(table);

  const footer = node('div', 'journey-record-footer');
  const totals = node('div', 'journey-record-totals');
  totals.append(node('strong', '', `Filtered spend ${formatMoney(model.totalSpendAUD, 'AUD')}`), node('strong', '', `Filtered distance ${kilometres(model.totalKilometres)}`));
  footer.append(totals);
  if (model.rows.length > pageSize) {
    const pager = node('div', 'journey-pagination');
    const previous = node('button', 'journey-page-button', 'Previous');
    previous.type = 'button'; previous.disabled = page <= 1;
    previous.addEventListener('click', () => preserveLocalFocus(() => updateOptions({ page:page - 1 }), { fallbackSelector:'.journey-records h2' }));
    const label = node('span', '', `Page ${page} of ${pageCount}`);
    const next = node('button', 'journey-page-button', 'Next');
    next.type = 'button'; next.disabled = page >= pageCount;
    next.addEventListener('click', () => preserveLocalFocus(() => updateOptions({ page:page + 1 }), { fallbackSelector:'.journey-records h2' }));
    pager.append(previous, label, next);
    footer.append(pager);
  }
  panel.append(footer);
  return panel;
}

function renderDestinationTotals(model) {
  const panel = node('section', 'journey-panel journey-destination-totals');
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Destination Totals'), node('span', 'journey-count', String(model.destinationTotals.length)));
  panel.append(head);
  const list = node('div', 'journey-destination-list');
  if (!model.destinationTotals.length) list.append(node('p', 'journey-empty', 'No entries yet'));
  for (const total of model.destinationTotals) {
    const row = node('article', 'journey-destination-total');
    const copy = node('span', 'journey-destination');
    copy.append(node('strong', '', total.name), node('small', '', [total.country, `${total.visits} ${total.visits === 1 ? 'visit' : 'visits'}`].filter(Boolean).join(' · ')));
    const metrics = node('span', 'journey-destination-metrics');
    metrics.append(
      node('span', '', `${integer(total.days)} days`),
      node('span', '', formatMoney(total.spendAUD, 'AUD')),
      node('span', '', `${formatMoney(total.averageCostPerDayAUD, 'AUD')} / day`),
      node('span', '', kilometres(total.kilometresTravelled))
    );
    row.append(copy, metrics);
    list.append(row);
  }
  panel.append(list);
  return panel;
}


function spendingBreakdown(state, model, currentDate) {
  const totals={ accommodation:0, travel:0, food:0, transport:0, entertainment:0, shopping:0, other:0 };
  for(const expense of state.expenses||[]){
    const date=String(expense.date||'').slice(0,10);
    if(expense.needsBudgetRepair || !date || date>currentDate) continue;
    const value=Number(expense.audAmount||0);
    if(expense.category==='groceries'||expense.category==='eating-out') totals.food+=value;
    else if(expense.category==='transport') totals.transport+=value;
    else if(expense.category==='entertainment') totals.entertainment+=value;
    else if(expense.category==='shopping') totals.shopping+=value;
    else totals.other+=value;
  }
  for(const reservation of state.reservations||[]){
    const date=String(reservation.dateTime||'').slice(0,10);
    if(reservation.needsBudgetRepair || reservation.status==='to-book' || !date || date>currentDate) continue;
    const value=Number(reservation.audAmount||0);
    if(reservation.type==='accommodation') totals.accommodation+=value;
    else if(reservation.type==='ticket') totals.entertainment+=value;
    else totals.travel+=value;
  }
  return totals;
}
function renderSpendBreakdown(state, model, currentDate){ const panel=node('section','journey-panel journey-spend-panel'); const head=node('div','journey-section-head'); head.append(node('h2','','Lifetime Travel Spend · AUD')); panel.append(head); const totals=spendingBreakdown(state,model,currentDate); const total=Object.values(totals).reduce((a,b)=>a+b,0); const labels={accommodation:'Accommodation',travel:'Travel between destinations',food:'Food',transport:'Local Transport',entertainment:'Entertainment',shopping:'Shopping',other:'Other'}; const list=node('div','journey-spend-bars'); for(const [key,label] of Object.entries(labels)){ const value=totals[key]; const pct=total>0?(value/total)*100:0; const row=node('div','journey-spend-row'); const labelWrap=node('span','journey-spend-label'); labelWrap.append(node('i',`journey-spend-dot journey-spend-${key}`),node('strong','',label)); const track=node('span','journey-spend-track'); const fill=node('span',`journey-spend-fill journey-spend-${key}`); fill.style.width=`${pct}%`; track.append(fill); row.append(labelWrap,track,node('strong','',formatMoney(value,'AUD')),node('small','',`${Math.round(pct)}%`)); list.append(row); } panel.append(node('strong','journey-spend-total',formatMoney(model.summary.lifetimeTravelSpendAUD,'AUD')),list); return panel; }

function renderSnapshot(state, model) {
  const panel = node('section', 'journey-panel journey-snapshot-panel');
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Journey Snapshot'));
  panel.append(head);

  const rows = model.rows;
  const avg = rows.reduce((sum, row) => sum + row.spendAUD, 0) / Math.max(1, rows.reduce((sum, row) => sum + row.days, 0));
  const lowest = [...rows].sort((a, b) => a.averageCostPerDayAUD - b.averageCostPerDayAUD)[0];
  const highest = [...rows].sort((a, b) => b.averageCostPerDayAUD - a.averageCostPerDayAUD)[0];
  const longest = [...rows].sort((a, b) => b.days - a.days)[0];
  const metric = (label, value, sub = '') => {
    const item = node('article', 'journey-snapshot-metric');
    item.append(node('span', '', label), node('strong', '', value));
    if (sub) item.append(node('small', '', sub));
    return item;
  };

  const grid = node('div', 'journey-snapshot-grid');
  grid.append(
    metric('Average cost / day', formatMoney(avg, 'AUD'), 'completed destinations & trips'),
    metric('Lowest cost / day', lowest ? lowest.name : '—', lowest ? `${formatMoney(lowest.averageCostPerDayAUD, 'AUD')}/day` : ''),
    metric('Highest cost / day', highest ? highest.name : '—', highest ? `${formatMoney(highest.averageCostPerDayAUD, 'AUD')}/day` : ''),
    metric('Longest stay / trip', longest ? longest.name : '—', longest ? `${longest.days} days` : '')
  );
  panel.append(grid);

  const travelTypes = new Set(['flight', 'train', 'cruise', 'rv']);
  const bookings = (state.reservations || []).filter(record => {
    if (!travelTypes.has(record.type) || record.status === 'to-book') return false;
    const date = String(record.dateTime || '').slice(0, 10);
    return Boolean(date && date < model.today && !record.needsBudgetRepair);
  });
  const bookingSpend = bookings.reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const bookingSection = node('section', 'journey-booking-summary');
  const bookingHead = node('div', 'journey-booking-summary-head');
  const bookingCopy = node('span', 'journey-booking-summary-copy');
  bookingCopy.append(node('small', '', 'Completed travel bookings'), node('strong', '', `${bookings.length} bookings`));
  bookingHead.append(bookingCopy, node('b', '', formatMoney(bookingSpend, 'AUD')));
  bookingSection.append(bookingHead);

  const groups = [
    ['International Flights', bookings.filter(record => record.type === 'flight' && record.flightScope === 'international')],
    ['Domestic Flights', bookings.filter(record => record.type === 'flight' && record.flightScope === 'domestic')],
    ['Trains', bookings.filter(record => record.type === 'train')],
    ['Cruises', bookings.filter(record => record.type === 'cruise')],
    ['RV / Motorhome', bookings.filter(record => record.type === 'rv')]
  ];
  const unclassifiedFlights = bookings.filter(record => record.type === 'flight' && !record.flightScope);
  if (unclassifiedFlights.length) groups.splice(2, 0, ['Flights · Unclassified', unclassifiedFlights]);

  const groupGrid = node('div', 'journey-booking-grid');
  for (const [label, records] of groups) {
    const item = node('article', 'journey-booking-card');
    item.append(
      node('span', '', label),
      node('strong', '', integer(records.length)),
      node('small', '', formatMoney(records.reduce((sum, record) => sum + Number(record.audAmount || 0), 0), 'AUD'))
    );
    groupGrid.append(item);
  }
  bookingSection.append(groupGrid);
  panel.append(bookingSection);

  const distance = node('div', 'journey-kilometres-total');
  distance.append(node('span', '', 'Total kilometres travelled'), node('strong', '', kilometres(model.totalKilometres)));
  panel.append(distance);
  return panel;
}
function renderMilestones(model){ const panel=node('section','journey-panel journey-milestones-panel'); const head=node('div','journey-section-head'); head.append(node('h2','','Milestones · Automatic')); panel.append(head); const rows=model.rows; const cruises=rows.filter(r=>r.travelType==='cruise').length; const motorhomes=rows.filter(r=>r.travelType==='motorhome').length; const grid=node('div','journey-milestones-grid'); const items=[['1st',model.journeyStartDate?formatAUDate(model.journeyStartDate):'—','First journey'],[integer(model.summary.countriesVisited),'Countries','visited'],[integer(model.summary.daysTravelled),'Travel','days'],[integer(cruises),'Cruises','completed'],[integer(motorhomes),'Motorhome','trips'],[String(Math.floor(model.summary.yearsOnRoad)),'Full travel','years']]; for(const [value,label,sub] of items){ const m=node('article','journey-milestone'); m.append(node('strong','',value),node('span','',label),node('small','',sub)); grid.append(m); } panel.append(grid); return panel; }
function renderTravelMix(model){ const panel=node('section','journey-panel journey-mix-panel'); const head=node('div','journey-section-head'); head.append(node('h2','','Travel Mix')); panel.append(head); const groups={standard:{days:0,count:0,km:0},motorhome:{days:0,count:0,km:0},cruise:{days:0,count:0,km:0}}; for(const row of model.rows){ const g=groups[row.travelType]||groups.standard; g.days+=row.days;g.count+=1;g.km+=row.kilometresTravelled; } const totalDays=Object.values(groups).reduce((s,g)=>s+g.days,0)||1; const list=node('div','journey-mix-list'); for(const [type,g] of Object.entries(groups)){ const item=node('article',`journey-mix-item journey-mix-${type}`); const top=node('div'); top.append(node('strong','',TYPE_LABELS[type]),node('strong','',`${Math.round(g.days/totalDays*100)}%`)); const percent=Math.round(g.days/totalDays*100); const progress=document.createElement('progress');progress.max=100;progress.value=percent; progress.setAttribute('aria-label',`${TYPE_LABELS[type]} travel mix`); progress.setAttribute('aria-valuetext',`${percent}% · ${integer(g.days)} days · ${g.count} trips · ${kilometres(g.km)}`); item.append(top,progress,node('small','',`${integer(g.days)} days · ${g.count} trips · ${kilometres(g.km)}`)); list.append(item); } panel.append(list); return panel; }
function renderTopDestinations(model){ const panel=node('section','journey-panel journey-top-destinations'); const head=node('div','journey-section-head');head.append(node('h2','','Destination Totals'));panel.append(head); const list=node('div','journey-top-list'); if(!model.destinationTotals.length)list.append(node('p','journey-empty','No entries yet')); for(const total of model.destinationTotals.slice(0,3)){ const item=node('article','journey-top-item'); item.append(node('strong','',total.name),node('span','',`${total.visits} stay${total.visits===1?'':'s'} · ${total.days} days · ${kilometres(total.kilometresTravelled)}`),node('b','',formatMoney(total.spendAUD,'AUD'))); list.append(item); } panel.append(list); return panel; }

function renderHealth(model) {
  const panel = node('section', `journey-panel journey-health journey-health-${model.health.status}`);
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Journey Check'), node('strong', 'journey-health-status', model.health.status === 'verified' ? 'Verified' : 'Needs Attention'));
  panel.append(head);
  if (!model.health.issues.length) panel.append(node('p', 'journey-health-copy', 'Completed journey records and map relationships are consistent.'));
  else {
    const list = node('ul', 'journey-health-issues');
    for (const issue of model.health.issues) list.append(node('li', '', issue));
    panel.append(list);
  }
  return panel;
}

export function renderJourneyHistoryScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root journey-history-screen');
  main.dataset.screen = 'journey-history';
  const sameScreenRerender = Boolean(document.querySelector('[data-screen="journey-history"]'));
  const remembered = sameScreenRerender ? JOURNEY_TRANSIENT_VIEW.get(stateService) : null;
  let options = {
    mapYears:Array.isArray(remembered?.mapYears) && remembered.mapYears.length ? [...remembered.mapYears] : ['all'],
    mapTravelType:['all','standard','motorhome','cruise'].includes(remembered?.mapTravelType) ? remembered.mapTravelType : 'all',
    recordYears:Array.isArray(remembered?.recordYears) && remembered.recordYears.length ? [...remembered.recordYears] : ['all'],
    recordTravelType:['all','standard','motorhome','cruise'].includes(remembered?.recordTravelType) ? remembered.recordTravelType : 'all',
    searchQuery:typeof remembered?.searchQuery === 'string' ? remembered.searchQuery : '',
    page:Number.isInteger(remembered?.page) && remembered.page >= 1 ? remembered.page : (stateService.snapshot().ui?.journeyHistoryPage || 1),
    pageSize:[8,10,15].includes(Number(remembered?.pageSize)) ? Number(remembered.pageSize) : 10
  };
  const rememberOptions = () => JOURNEY_TRANSIENT_VIEW.set(stateService, {
    mapYears:[...options.mapYears], mapTravelType:options.mapTravelType, recordYears:[...options.recordYears],
    recordTravelType:options.recordTravelType, searchQuery:options.searchQuery, page:options.page, pageSize:options.pageSize
  });
  rememberOptions();

  function renderContent() {
    const state = stateService.snapshot();
    const pending = state.ui?.pendingOpen;
    const pendingHistoryRecord = pending?.collection === 'journeyHistory' && pending.id ? state.journeyHistory.find(record => record.id === pending.id) : null;
    const pendingTargetId = pendingHistoryRecord?.itineraryId || null;

    // Exact-record deep-links (for example from Home Global Search) must not be
    // stranded behind a previously remembered completed-stay filter. Journey
    // History is read-only, so make the target row visible rather than merely
    // navigating to a filtered table that cannot show it. Map filters are kept.
    if (pendingTargetId) {
      options.recordYears = ['all'];
      options.recordTravelType = 'all';
      options.searchQuery = '';
    }

    const lifetimeModel = buildJourneyHistoryViewModel(state, currentDate, { years:['all'], travelType:'all', searchQuery:'' });
    const mapOptions = { years:options.mapYears, travelType:options.mapTravelType };
    const mapModel = buildJourneyHistoryViewModel(state, currentDate, mapOptions);
    const recordOptions = { years:options.recordYears, travelType:options.recordTravelType, searchQuery:options.searchQuery, page:options.page, pageSize:options.pageSize };
    const recordsModel = buildJourneyHistoryViewModel(state, currentDate, recordOptions);
    let pendingTargetPage = null;
    if (pendingTargetId) {
      const index = recordsModel.rows.findIndex(row => row.id === pendingTargetId);
      if (index >= 0) {
        pendingTargetPage = Math.floor(index / Number(options.pageSize || 10)) + 1;
        options.page = pendingTargetPage;
        rememberOptions();
      }
      recordOptions.page = options.page;
    }
    main.replaceChildren();

    main.append(createPageHero({ key:'header-journey-history', eyebrow:'YOUR JOURNEY', title:'Journey History', subtitle:'Completed journeys, memories and travel milestones around the world.', className:'journey-reference-hero', position:'center center' }));

    main.append(renderSummary(lifetimeModel));

    const updateMapOptions = patch => { options = { ...options, ...patch }; rememberOptions(); renderContent(); };
    const updateRecordOptions = patch => {
      const translated = { ...patch };
      if (Object.hasOwn(translated, 'years')) { translated.recordYears = translated.years; delete translated.years; }
      if (Object.hasOwn(translated, 'travelType')) { translated.recordTravelType = translated.travelType; delete translated.travelType; }
      options = { ...options, ...translated };
      rememberOptions();
      renderContent();
    };
    main.append(renderMap(mapModel, mapOptions, years => updateMapOptions({ mapYears:years }), travelType => updateMapOptions({ mapTravelType:travelType })));
    const analytics=node('section','journey-analytics-two'); analytics.append(renderSpendBreakdown(state,lifetimeModel,currentDate),renderSnapshot(state,lifetimeModel)); main.append(analytics);
    const insightRow=node('section','journey-insight-three'); insightRow.append(renderMilestones(lifetimeModel),renderTopDestinations(lifetimeModel),renderTravelMix(lifetimeModel)); main.append(insightRow);
    main.append(renderRecordFilters(recordsModel, recordOptions, updateRecordOptions), renderRows(recordsModel, navigate, recordOptions, updateRecordOptions), renderHealth(lifetimeModel));

    const summaryTones={countries:'teal',destinations:'blue',days:'violet',years:'orange',spend:'magenta'};
    for(const card of main.querySelectorAll('.journey-summary-card')) {
      const kind=[...card.classList].find(name=>name.startsWith('journey-summary-')&&name!=='journey-summary-card')?.replace('journey-summary-','')||'blue';
      const label=card.querySelector('.journey-summary-copy > span')?.textContent||'Journey Summary';
      makeExpandableCard(card,{host:main,title:label,tone:summaryTones[kind]||'blue'});
    }
    const journeyExpanders=[
      ['.journey-map-panel','Journey Map','blue'],
      ['.journey-spend-panel','Lifetime Travel Spend','gold'],
      ['.journey-snapshot-panel','Journey Snapshot','indigo'],
      ['.journey-milestones-panel','Milestones','magenta'],
      ['.journey-top-destinations','Destination Totals','teal'],
      ['.journey-mix-panel','Travel Mix','violet'],
      ['.journey-health','Journey Check','green']
    ];
    for(const [selector,title,tone] of journeyExpanders){ const card=main.querySelector(selector); if(card) makeExpandableCard(card,{host:main,title,tone}); }

    if (pending?.collection === 'journeyHistory' && pending.id) {
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          if (pendingTargetPage) draft.ui.journeyHistoryPage = pendingTargetPage;
        });
        if (!pendingTargetId) return;
        queueMicrotask(() => document.querySelector(`[data-screen="journey-history"] [data-record-id="${CSS.escape(pendingTargetId)}"]`)?.scrollIntoView({ block:'center' }));
      });
    }
  }

  renderContent();
  return main;
}
