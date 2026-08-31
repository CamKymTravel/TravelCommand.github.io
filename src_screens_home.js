import { buildHomeViewModel } from './src_core_home-view-model.js';
import { formatMoney, audToLocal } from './src_core_currency.js';
import { renderOfflineMap } from './src_components_offline-map.js';
import { isTravelYearSelected, toggleTravelYear } from './src_core_year-filters.js';

const COLLECTION_TO_SCREEN = Object.freeze({
  itinerary: 'itinerary',
  reservations: 'reservations',
  calendarEvents: 'calendar',
  journeyHistory: 'journey-history',
  checklists: 'checklist',
  vault: 'vault',
  expenses: 'budget'
});

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function moneyPair(aud, currency, rate) {
  const wrap = node('div', 'home-money-pair');
  if (currency && currency !== 'AUD' && Number(rate) > 0) {
    const audValue = Number(aud) || 0;
    const localValue = Math.sign(audValue) * audToLocal(Math.abs(audValue), rate);
    wrap.append(node('strong', 'home-money-primary', formatMoney(localValue, currency)));
    wrap.append(node('span', 'home-money-secondary', formatMoney(aud, 'AUD')));
  } else {
    wrap.append(node('strong', 'home-money-primary', formatMoney(aud, 'AUD')));
  }
  return wrap;
}

function empty(text) {
  return node('p', 'home-empty', text);
}

function renderHero(model, navigate) {
  const hero = node('section', 'home-hero');
  hero.setAttribute('aria-labelledby', 'home-current-stay-title');
  const primary = node('div', 'home-hero-primary');
  primary.append(node('p', 'home-kicker', 'CURRENT STAY'));

  if (!model.currentStay) {
    const title = node('h1', 'home-hero-title', 'No current stay');
    title.id = 'home-current-stay-title';
    primary.append(title, empty('Add an itinerary destination to begin the journey view.'));
  } else {
    const title = node('h1', 'home-hero-title', model.currentStay.title);
    title.id = 'home-current-stay-title';
    primary.append(title);
    const meta = node('div', 'home-hero-meta');
    meta.append(node('span', '', model.currentStay.country || model.currentStay.travelType), node('span', '', model.currentStay.dates));
    primary.append(meta);

    const progressBlock = node('div', 'home-progress-block');
    const progressHead = node('div', 'home-progress-head');
    progressHead.append(node('span', '', `Day ${model.currentStay.currentDay} of ${model.currentStay.totalDays}`), node('strong', '', `${model.currentStay.progress}%`));
    const progress = document.createElement('progress');
    progress.max = 100;
    progress.value = model.currentStay.progress;
    progress.setAttribute('aria-label', 'Days in current stay progress');
    progressBlock.append(progressHead, progress);
    if (model.currentStay.remainingDays > 0) progressBlock.append(node('span', 'home-progress-remaining', `${model.currentStay.remainingDays} days remaining after today`));
    else progressBlock.append(node('span', 'home-progress-remaining', 'Final day of this stay')); 
    primary.append(progressBlock);
  }

  const next = node(model.nextDestination ? 'button' : 'aside', 'home-next');
  if (model.nextDestination) {
    next.type = 'button';
    next.setAttribute('aria-label', `Open ${model.nextDestination.title} in Itinerary`);
    next.addEventListener('click', () => navigate('itinerary', { collection:'itinerary', id:model.nextDestination.id }));
  }
  next.append(node('p', 'home-kicker', 'NEXT DESTINATION'));
  if (model.nextDestination) {
    next.append(node('strong', 'home-next-title', model.nextDestination.title));
    if (model.nextDestination.country) next.append(node('span', 'home-next-country', model.nextDestination.country));
    next.append(node('span', 'home-next-date', model.nextDestination.startDate));
  } else {
    next.append(empty('No next destination planned.'));
  }
  hero.append(primary, next);
  return hero;
}

function renderBudgetCard(model) {
  const card = node('section', 'home-card home-card-destination');
  card.append(node('p', 'home-kicker', 'DESTINATION BUDGET'));
  if (!model.currentStay) {
    card.append(empty('No active destination budget.'));
    return card;
  }
  card.append(node('h2', 'home-card-title', 'Remaining'));
  card.append(moneyPair(model.currentStay.destinationRemainingAUD, model.currentStay.localCurrency, model.currentStay.fixedLocalPerAUD));
  const footer = node('div', 'home-budget-meta');
  footer.append(
    node('span', '', `Spent ${formatMoney(model.currentStay.destinationSpentAUD, 'AUD')}`),
    node('span', '', `Budget ${formatMoney(model.currentStay.destinationBudgetAUD, 'AUD')}`)
  );
  card.append(footer);
  return card;
}

function renderAnnualCard(model) {
  const card = node('section', 'home-card home-card-annual');
  card.append(node('p', 'home-kicker', `${model.annual.year} ANNUAL BUDGET`), node('h2', 'home-card-title', 'Remaining'));
  card.append(moneyPair(model.annual.remainingAUD, 'AUD', null));
  const footer = node('div', 'home-budget-meta');
  footer.append(node('span', '', `Spent ${formatMoney(model.annual.spentAUD, 'AUD')}`), node('span', '', `Budget ${formatMoney(model.annual.budgetAUD, 'AUD')}`));
  card.append(footer);
  return card;
}

function renderSchengen(model) {
  const card = node('section', `home-card home-card-schengen home-schengen-${model.schengen.status}`);
  card.append(node('p', 'home-kicker', 'SCHENGEN STATUS'));
  const labels = { allowed: 'Allowed', 'not-allowed': 'Not Allowed', 'not-checked': 'Not Checked' };
  card.append(node('h2', 'home-status-title', labels[model.schengen.status]));
  const meta = node('div', 'home-schengen-meta');
  if (model.schengen.daysUsed != null) meta.append(node('span', '', `${model.schengen.daysUsed} days used`));
  if (model.schengen.daysRemaining != null) meta.append(node('span', '', `${model.schengen.daysRemaining} days remaining`));
  if (!meta.childElementCount) meta.append(node('span', '', 'Manual tracker has not been checked.'));
  card.append(meta);
  return card;
}

function renderAlerts(model) {
  const card = node('section', 'home-panel home-alerts');
  const header = node('div', 'home-section-head');
  header.append(node('h2', '', 'Alerts'), node('span', 'home-count', String(model.alerts.length)));
  card.append(header);
  if (!model.alerts.length) return card.append(empty('No alerts.')), card;
  const list = node('div', 'home-list');
  for (const alert of model.alerts) {
    const item = node('article', `home-list-item home-alert-priority-${alert.priority}`);
    const copy = node('div');
    copy.append(node('strong', '', alert.title));
    if (alert.message) copy.append(node('span', '', alert.message));
    if (alert.displayDueDate) copy.append(node('small', 'home-alert-date', `Due ${alert.displayDueDate}`));
    item.append(copy, node('span', 'home-priority', alert.priority));
    list.append(item);
  }
  card.append(list);
  return card;
}

function renderUpcoming(model, navigate) {
  const card = node('section', 'home-panel home-upcoming');
  const header = node('div', 'home-section-head');
  header.append(node('h2', '', 'Upcoming Events'), node('span', 'home-count', String(model.upcomingEvents.length)));
  card.append(header);
  if (!model.upcomingEvents.length) return card.append(empty('No upcoming events.')), card;
  const list = node('div', 'home-list');
  for (const event of model.upcomingEvents) {
    const item = node('button', 'home-list-item home-event-button');
    item.type = 'button';
    item.addEventListener('click', () => navigate(event.kind === 'reservation' ? 'reservations' : 'calendar', { collection:event.kind === 'reservation' ? 'reservations' : 'calendarEvents', id:event.sourceId }));
    const copy = node('div');
    copy.append(node('strong', '', event.title), node('span', '', `${event.kind === 'reservation' ? 'Reservation' : 'Calendar'} · ${event.displayDate}`));
    item.append(copy);
    list.append(item);
  }
  card.append(list);
  return card;
}

function renderMap(model, options, rerenderMap) {
  const panel = node('section', 'home-panel home-map');
  const header = node('div', 'home-section-head home-map-head');
  header.append(node('h2', '', 'Journey Map'));
  const filters = node('div', 'home-year-filters');
  for (const year of ['all', ...(model.journeyMap.availableYears || [])]) {
    const button = node('button', 'home-year-button', year === 'all' ? 'All Years' : `Year ${year}`);
    button.type = 'button';
    const active = isTravelYearSelected(options.mapYears, year);
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => rerenderMap(toggleTravelYear(options.mapYears, year)));
    filters.append(button);
  }
  header.append(filters);
  panel.append(header);

  const stage = node('div', 'home-map-stage');
  stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Home journey map' }));
  panel.append(stage);
  return panel;
}

function renderSearchResults(model, navigate) {
  const wrap = node('div', 'home-search-results');
  if (!model.searchResults.length) {
    wrap.append(empty('No matching records.'));
    return wrap;
  }
  for (const result of model.searchResults) {
    const button = node('button', 'home-search-result');
    button.type = 'button';
    const copy = node('span');
    copy.append(node('strong', '', result.title), node('small', '', result.screenLabel));
    button.append(copy);
    button.addEventListener('click', () => navigate(COLLECTION_TO_SCREEN[result.collection] || 'home', { collection:result.collection, id:result.id }));
    wrap.append(button);
  }
  return wrap;
}

export function renderHomeScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root home-screen');
  main.dataset.screen = 'home';
  let options = { mapYears: ['all'], searchQuery: '' };

  const renderContent = () => {
    const state = stateService.snapshot();
    const model = buildHomeViewModel(state, currentDate, options);
    main.replaceChildren();

    const toolbar = node('header', 'home-toolbar');
    const titleBlock = node('div');
    titleBlock.append(node('p', 'home-kicker', 'TRAVEL COMMAND CENTRE'), node('h1', 'home-page-title', 'Home'));
    const searchWrap = node('div', 'home-search-wrap');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'home-search';
    search.placeholder = 'Search Travel Command Centre';
    search.setAttribute('aria-label', 'Global search');
    search.value = options.searchQuery;
    searchWrap.append(search);
    toolbar.append(titleBlock, searchWrap);
    main.append(toolbar);

    if (options.searchQuery.trim()) {
      const searchPanel = node('section', 'home-panel home-search-panel');
      const head = node('div', 'home-section-head');
      head.append(node('h2', '', 'Search Results'), node('span', 'home-count', String(model.searchResults.length)));
      searchPanel.append(head, renderSearchResults(model, navigate));
      main.append(searchPanel);
    }

    main.append(renderHero(model, navigate));
    const statusGrid = node('div', 'home-status-grid');
    statusGrid.append(renderBudgetCard(model), renderAnnualCard(model), renderSchengen(model));
    main.append(statusGrid);

    const dashboardGrid = node('div', 'home-dashboard-grid');
    dashboardGrid.append(renderAlerts(model), renderUpcoming(model, navigate));
    main.append(dashboardGrid);

    const mapMount = node('div', 'home-map-mount');
    const rerenderMap = years => {
      options = { ...options, mapYears: years };
      const nextModel = buildHomeViewModel(stateService.snapshot(), currentDate, options);
      mapMount.replaceChildren(renderMap(nextModel, options, rerenderMap));
    };
    mapMount.append(renderMap(model, options, rerenderMap));
    main.append(mapMount);

    search.addEventListener('input', event => {
      options = { ...options, searchQuery: event.target.value };
      renderContent();
      const nextSearch = main.querySelector('.home-search');
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      }
    });
  };

  renderContent();
  return main;
}
