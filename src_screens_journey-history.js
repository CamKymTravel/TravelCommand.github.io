import { buildJourneyHistoryViewModel } from './src_core_journey-history-view-model.js';
import { formatMoney } from './src_core_currency.js';
import { renderOfflineMap } from './src_components_offline-map.js';
import { toggleTravelYear, isTravelYearSelected } from './src_core_year-filters.js';

const TYPE_ICONS = Object.freeze({ standard:'🌐', motorhome:'🚐', cruise:'🚢' });
const TYPE_LABELS = Object.freeze({ standard:'Standard', motorhome:'Motorhome', cruise:'Cruise' });

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
    ['spend', formatMoney(model.summary.lifetimeTravelSpendAUD, 'AUD'), 'Lifetime Travel Spend']
  ];
  for (const [kind, value, label] of cards) {
    const card = node('article', `journey-summary-card journey-summary-${kind}`);
    card.append(node('strong', '', value), node('span', '', label));
    grid.append(card);
  }
  return grid;
}

function renderYearFilters(model, options, onChange) {
  const filters = node('div', 'journey-year-filters');
  filters.setAttribute('aria-label', 'Filter Journey History by Travel Year');
  for (const year of ['all', ...(model.journeyMap.availableYears || [])]) {
    const button = node('button', 'journey-year-button', year === 'all' ? 'All Years' : `Year ${year}`);
    button.type = 'button';
    const active = isTravelYearSelected(options.years, year);
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => onChange(toggleTravelYear(options.years, year)));
    filters.append(button);
  }
  return filters;
}

function renderMap(model, options, updateYears) {
  const panel = node('section', 'journey-panel journey-map-panel');
  const head = node('div', 'journey-section-head journey-map-head');
  head.append(node('h2', '', 'Journey Map'), renderYearFilters(model, options, updateYears));
  panel.append(head);
  const stage = node('div', 'journey-map-stage');
  stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Journey History map' }));
  panel.append(stage);
  return panel;
}

function typeIcon(row) {
  const icon = node('span', 'journey-type-icon', TYPE_ICONS[row.travelType] || '🌐');
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', TYPE_LABELS[row.travelType] || 'Standard');
  icon.title = TYPE_LABELS[row.travelType] || 'Standard';
  return icon;
}

function renderRows(model, navigate) {
  const panel = node('section', 'journey-panel journey-records');
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Completed Stays & Trips'), node('span', 'journey-count', String(model.rows.length)));
  panel.append(head);

  const table = node('div', 'journey-table');
  const header = node('div', 'journey-row journey-row-header');
  for (const label of ['Type','Destination','Dates','Days','Spend','Avg / Day','Kilometres']) header.append(node('span', '', label));
  table.append(header);
  if (!model.rows.length) table.append(node('p', 'journey-empty', 'No entries yet'));
  for (const row of model.rows) {
    const button = node('button', 'journey-row journey-record-row');
    button.type = 'button';
    button.dataset.recordId = row.id;
    button.addEventListener('click', () => navigate?.('itinerary', { collection:'itinerary', id:row.id }));
    const destination = node('span', 'journey-destination');
    destination.append(node('strong', '', row.name), node('small', '', [row.country, row.travelYear ? `Year ${row.travelYear}` : ''].filter(Boolean).join(' · ')));
    button.append(
      typeIcon(row),
      destination,
      node('span', '', row.displayDates),
      node('span', '', integer(row.days)),
      node('span', '', formatMoney(row.spendAUD, 'AUD')),
      node('span', '', formatMoney(row.averageCostPerDayAUD, 'AUD')),
      node('span', '', kilometres(row.kilometresTravelled))
    );
    table.append(button);
  }
  panel.append(table);
  const totals = node('div', 'journey-record-totals');
  totals.append(node('strong', '', `Filtered spend ${formatMoney(model.totalSpendAUD, 'AUD')}`), node('strong', '', `Filtered distance ${kilometres(model.totalKilometres)}`));
  panel.append(totals);
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
  let options = { years:['all'], searchQuery:'' };

  function renderContent() {
    const state = stateService.snapshot();
    const model = buildJourneyHistoryViewModel(state, currentDate, options);
    main.replaceChildren();

    const toolbar = node('header', 'journey-toolbar');
    const heading = node('div');
    heading.append(node('p', 'eyebrow', 'YOUR JOURNEY'), node('h1', '', 'Journey History'));
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'journey-search';
    search.placeholder = 'Search destinations';
    search.setAttribute('aria-label', 'Search Journey History destinations');
    search.value = options.searchQuery;
    search.addEventListener('input', event => { options = { ...options, searchQuery:event.target.value }; renderContent(); });
    toolbar.append(heading, search);
    main.append(toolbar, renderSummary(model));

    main.append(renderMap(model, options, years => { options = { ...options, years }; renderContent(); }));
    main.append(renderRows(model, navigate), renderDestinationTotals(model), renderHealth(model));

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'journeyHistory' && pending.id) {
      const historyRecord = state.journeyHistory.find(record => record.id === pending.id);
      const targetId = historyRecord?.itineraryId || null;
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => { draft.ui.pendingOpen = null; });
        if (!targetId) return;
        queueMicrotask(() => document.querySelector(`[data-screen="journey-history"] [data-record-id="${CSS.escape(targetId)}"]`)?.scrollIntoView({ block:'center' }));
      });
    }
  }

  renderContent();
  return main;
}
