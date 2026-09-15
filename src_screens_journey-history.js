import { buildJourneyHistoryViewModel } from './src_core_journey-history-view-model.js';
import { createPageHero } from './src_components_page-hero.js';
import { formatMoney } from './src_core_currency.js';
import { renderOfflineMap, buildMapGeometry } from './src_components_offline-map.js';
import { toggleTravelYear, isTravelYearSelected, buildTravelYearBrowser } from './src_core_year-filters.js';
import { formatAUDate } from './src_core_dates.js';
import { createModal, makeExpandableCard, preserveLocalFocus } from './src_components_modal.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';

const TYPE_ICONS = Object.freeze({ standard:'globe', motorhome:'rv', cruise:'cruise' });
const TYPE_LABELS = Object.freeze({ standard:'Standard', motorhome:'Motorhome', cruise:'Cruise', rv:'Motorhome' });
const JOURNEY_EXPENSE_LABELS = Object.freeze({ groceries:'Groceries', 'eating-out':'Eating Out', transport:'Transport', entertainment:'Entertainment', shopping:'Shopping', miscellaneous:'Miscellaneous' });
const JOURNEY_RESERVATION_LABELS = Object.freeze({ flight:'Flights', train:'Trains', cruise:'Cruises', rv:'RV / Motorhome', hotel:'Hotels', airbnb:'Airbnb', accommodation:'Hotels', ticket:'Tickets & Attractions' });
const SUMMARY_ICONS = Object.freeze({ countries:'globe', destinations:'pin', days:'days', years:'years', spend:'spend' });
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
    const icon = node('span', 'journey-summary-icon');
    icon.append(createLineIcon(SUMMARY_ICONS[kind] || 'pin'));
    icon.setAttribute('aria-hidden', 'true');
    const copy = node('span', 'journey-summary-copy');
    copy.append(node('strong', '', value), node('span', '', label));
    card.append(icon, copy);
    grid.append(card);
  }
  return grid;
}

function journeySummaryExpandedBody(kind, model, state, currentDate) {
  const body=node('div',`journey-summary-expanded journey-summary-expanded-${kind}`);
  const list=node('div','journey-summary-expanded-list');
  if(kind==='countries'){
    body.append(node('p','journey-summary-expanded-intro',`${integer(model.summary.countriesVisited)} countries visited to date · ${integer(model.summary.destinationsCompleted)} completed stays & trips.`));
    for(const item of model.visitedCountries||[]){
      const row=node('article','journey-summary-expanded-row journey-country-visited-row');
      const flag=node('span','journey-summary-expanded-flag',countryFlagEmoji(item.name));flag.setAttribute('aria-hidden','true');
      const copy=node('span','journey-summary-expanded-copy');copy.append(node('strong','',item.name),node('span','','Visited on the journey to date'));
      const status=node('b','journey-country-visited-status','Visited');
      row.append(flag,copy,status);list.append(row);
    }
  } else if(kind==='destinations'){
    for(const item of model.rows){const row=node('article','journey-summary-expanded-row');const flag=node('span','journey-summary-expanded-flag',countryFlagEmoji(item.flagCountry||item.country||''));flag.setAttribute('aria-hidden','true');const copy=node('span','journey-summary-expanded-copy');copy.append(node('strong','',item.name),node('span','',[item.country,item.displayDates,`${integer(item.days)} days`,`Living ${formatMoney(item.livingCostAUD,'AUD')}`].filter(Boolean).join(' · ')));row.append(flag,copy,node('b','',`Total ${formatMoney(item.totalCostAUD,'AUD')}`));list.append(row);}
  } else if(kind==='days'||kind==='years'){
    const completedByYear=new Map();
    for(const item of model.rows){const key=Number(item.travelYear)||0;const row=completedByYear.get(key)||{stays:0};row.stays+=1;completedByYear.set(key,row);}
    const intro=kind==='years'
      ? `${model.summary.yearsOnRoad} years on the road to date · ${integer(model.summary.daysTravelled)} travelled days including the current stay.`
      : `${integer(model.summary.daysTravelled)} travelled days to date, including the current stay.`;
    body.append(node('p','journey-summary-expanded-intro',intro));
    for(const item of model.travelledDaysByYear||[]){
      const completed=completedByYear.get(Number(item.year))||{stays:0};
      const row=node('article','journey-summary-expanded-row');
      row.append(node('strong','',`Travel Year ${item.year}`),node('span','',`${integer(item.days)} travelled days · ${completed.stays} completed stay${completed.stays===1?'':'s'}`),node('b','','Time milestone'));list.append(row);
    }
  } else if(kind==='spend'){
    const totals=spendingBreakdown(state,model,currentDate);
    const labels={accommodation:'Accommodation',travel:'Travel between destinations',food:'Food',transport:'Local Transport',entertainment:'Entertainment',shopping:'Shopping',other:'Other'};
    const exactTotal=Object.values(totals).reduce((sum,value)=>sum+Number(value||0),0);
    body.append(node('p','journey-summary-expanded-intro',`${formatMoney(model.summary.lifetimeTravelSpendAUD,'AUD')} spent to date across completed travel and the current stay.`));
    const maxValue=Math.max(0,...Object.values(totals).map(value=>Number(value||0)));
    for(const [key,label] of Object.entries(labels)){
      const value=Number(totals[key]||0);
      const row=node('article',`journey-summary-expanded-row journey-lifetime-spend-row journey-lifetime-spend-${key}`);
      const copy=node('span','journey-summary-expanded-copy');copy.append(node('strong','',label),node('span','',exactTotal>0?`${Math.round(value/exactTotal*100)}% of lifetime travel spend`:'No spend recorded'));
      const amount=node('b','',formatMoney(value,'AUD'));
      const bar=node('span','journey-lifetime-spend-bar');
      const fill=node('i','journey-lifetime-spend-bar-fill');
      fill.style.setProperty('--journey-lifetime-share',`${maxValue>0?Math.max(value>0?3:0,(value/maxValue)*100):0}%`);
      bar.append(fill);row.append(copy,amount,bar);list.append(row);
    }
  }
  if(!list.childElementCount)list.append(node('p','journey-empty','No entries yet'));
  body.append(list);return body;
}

function destinationTotalsExpandedBody(model){
  const body=node('div','journey-destination-totals-expanded');
  const totals=[...(model.destinationTotals||[])];
  const totalLiving=totals.reduce((sum,item)=>sum+Number(item.livingCostAUD||0),0);
  const totalCost=totals.reduce((sum,item)=>sum+Number(item.totalCostAUD||0),0);
  const intro=node('section','journey-destination-totals-summary');
  intro.append(
    node('strong','',`${totals.length} destination${totals.length===1?'':'s'}`),
    node('span','',`${formatMoney(totalLiving,'AUD')} living · ${formatMoney(totalCost,'AUD')} total cost`)
  );
  body.append(intro);
  const list=node('div','journey-summary-expanded-list journey-destination-totals-list');
  const maxSpend=Math.max(0,...totals.map(item=>Number(item.livingCostAUD||0)));
  for(const total of totals){
    const spend=Number(total.livingCostAUD||0);
    const row=node('article','journey-summary-expanded-row journey-destination-total-row');
    const flag=node('span','journey-summary-expanded-flag',countryFlagEmoji(total.flagCountry||total.country||''));flag.setAttribute('aria-hidden','true');
    const copy=node('span','journey-summary-expanded-copy');
    copy.append(
      node('strong','',total.name),
      node('span','',`${total.visits} stay${total.visits===1?'':'s'} · ${total.days} days · ${kilometres(total.kilometresTravelled)}`),
      node('small','journey-destination-average',`${formatMoney(total.livingCostPerDayAUD,'AUD')} living/day · Total ${formatMoney(total.totalCostAUD,'AUD')}`)
    );
    const amount=node('b','',formatMoney(spend,'AUD'));
    const bar=node('span','journey-destination-total-bar');
    const fill=node('i','journey-destination-total-bar-fill');
    fill.style.setProperty('--journey-total-share',`${maxSpend>0?Math.max(3,(spend/maxSpend)*100):0}%`);
    bar.append(fill);
    row.append(flag,copy,amount,bar);
    list.append(row);
  }
  if(!list.childElementCount)list.append(node('p','journey-empty','No entries yet'));
  body.append(list);return body;
}

function renderYearFilters(model, options, onChange) {
  const filters = node('div', 'journey-year-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter Journey History by Travel Year');
  let windowStart=null;
  const renderWindow=()=>{
    const browser=buildTravelYearBrowser(model.journeyMap.availableYears||[],options.years,{windowSize:6,windowStart});
    windowStart=browser.windowStart;
    filters.replaceChildren();
    const all=node('button','journey-year-button','All Years'); all.type='button';
    const allActive=isTravelYearSelected(options.years,'all'); all.dataset.active=String(allActive); all.setAttribute('aria-pressed',String(allActive));
    all.addEventListener('click',()=>preserveLocalFocus(()=>onChange(['all']))); filters.append(all);
    const previous=node('button','journey-year-nav','Previous Years'); previous.type='button'; previous.disabled=browser.previousStart==null; previous.setAttribute('aria-label','Show previous Travel Years');
    previous.addEventListener('click',()=>{if(browser.previousStart==null)return;windowStart=browser.previousStart;renderWindow();}); filters.append(previous);
    for(const year of browser.visibleYears){
      const button=node('button','journey-year-button',`Year ${year}`); button.type='button';
      const active=isTravelYearSelected(options.years,year); button.dataset.active=String(active); button.setAttribute('aria-pressed',String(active));
      button.addEventListener('click',()=>preserveLocalFocus(()=>onChange(toggleTravelYear(options.years,year)))); filters.append(button);
    }
    const next=node('button','journey-year-nav','Next Years'); next.type='button'; next.disabled=browser.nextStart==null; next.setAttribute('aria-label','Show later Travel Years');
    next.addEventListener('click',()=>{if(browser.nextStart==null)return;windowStart=browser.nextStart;renderWindow();}); filters.append(next);
    filters.append(node('span','travel-year-selection-summary',`Selected: ${browser.summary}`));
  };
  renderWindow();
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

function journeyMapExpandedBody(state, currentDate, initialOptions = {}) {
  const body = node('div', 'journey-map-expanded-body');
  let localOptions = {
    years:Array.isArray(initialOptions.years) && initialOptions.years.length ? [...initialOptions.years] : ['all'],
    travelType:['all','standard','motorhome','cruise'].includes(initialOptions.travelType) ? initialOptions.travelType : 'all'
  };
  const rerender = () => {
    const model = buildJourneyHistoryViewModel(state, currentDate, localOptions);
    const map = renderMap(
      model,
      localOptions,
      years => { localOptions = { ...localOptions, years:[...years] }; rerender(); },
      travelType => { localOptions = { ...localOptions, travelType }; rerender(); },
      true
    );
    body.replaceChildren(map);
  };
  rerender();
  return body;
}

function renderMap(model, options, updateYears, updateType, expanded = false) {
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
  stage.append(renderOfflineMap(model.journeyMap, { ariaLabel:'Journey History map', fitToPoints:expanded, labelMode:expanded?'all':'key', interactive:expanded }));
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
  const icon = node('span', 'journey-type-icon');
  icon.append(createLineIcon(TYPE_ICONS[row.travelType] || 'globe'));
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', TYPE_LABELS[row.travelType] || 'Standard');
  icon.title = TYPE_LABELS[row.travelType] || 'Standard';
  return icon;
}

function renderRecordFilters(model, options, updateOptions) {
  const panel = node('section', 'journey-record-filter-panel');
  const top = node('div', 'journey-record-filter-row');
  const searchWrap = node('label', 'journey-search-wrap');
  const searchIcon=node('span','journey-search-icon'); searchIcon.append(createLineIcon('search')); searchWrap.append(searchIcon);
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

function journeyLinkedSpendBreakdown(state, itineraryId, attributedReservationIds = []) {
  const groups=new Map();
  const add=(label,amount)=>groups.set(label,(groups.get(label)||0)+Number(amount||0));
  for(const record of state.expenses||[]){
    if(record.itineraryId!==itineraryId||record.needsBudgetRepair)continue;
    add(JOURNEY_EXPENSE_LABELS[record.category]||record.category||'Expense',record.audAmount);
  }
  const attributed=new Set(attributedReservationIds||[]);
  for(const record of state.reservations||[]){
    if((record.itineraryId!==itineraryId&&!attributed.has(record.id))||record.status==='to-book'||record.needsBudgetRepair)continue;
    add(JOURNEY_RESERVATION_LABELS[record.type]||record.type||'Reservation',record.audAmount);
  }
  return [...groups.entries()].map(([label,amountAUD])=>({label,amountAUD})).sort((a,b)=>b.amountAUD-a.amountAUD||a.label.localeCompare(b.label));
}

function journeyRecordTone(row){
  if(row?.travelType==='motorhome'||row?.travelType==='rv') return 'orange';
  if(row?.travelType==='cruise') return 'violet';
  return 'sky';
}

function openJourneyRecordDetail(host,row,state,navigate){
  const body=node('section','journey-record-detail');
  const hero=node('div','journey-record-detail-hero');
  const flag=node('span','journey-record-detail-flag',countryFlagEmoji(row.flagCountry||row.country||''));
  flag.setAttribute('aria-hidden','true');
  const copy=node('div','journey-record-detail-hero-copy');
  copy.append(node('p','eyebrow','COMPLETED STAY / TRIP'),node('h2','',row.name),node('strong','',row.country||'—'),node('span','',row.displayDates));
  hero.append(flag,copy);
  const facts=node('div','journey-record-detail-facts');
  const fact=(label,value)=>{const item=node('div','journey-record-detail-fact');item.append(node('small','',label),node('strong','',value));return item;};
  facts.append(
    fact('Travel type',TYPE_LABELS[row.travelType]||row.travelType||'Standard'),
    fact('Duration',`${integer(row.days)} days`),
    fact('Living cost',formatMoney(row.livingCostAUD,'AUD')),
    fact('Living / day',formatMoney(row.livingCostPerDayAUD,'AUD')),
    fact('Total cost',formatMoney(row.totalCostAUD,'AUD')),
    fact('All-in / day',formatMoney(row.allInCostPerDayAUD,'AUD')),
    fact('Distance',kilometres(row.kilometresTravelled)),
    fact('Travel year',row.travelYearLabel||'—')
  );
  if(row.travelType==='motorhome'||row.travelType==='cruise'||row.travelType==='rv'){
    facts.append(fact('Route points',integer(Number(row.routePointCount||0))));
    facts.append(fact('Route countries',row.routeCountrySummary||row.country||'—'));
  }
  const breakdown=journeyLinkedSpendBreakdown(state,row.id,row.attributedReservationIds);
  const spend=node('section','journey-record-detail-spend');
  spend.append(node('h3','','Linked Spend Breakdown'));
  const spendList=node('div','journey-record-detail-spend-list');
  if(!breakdown.length)spendList.append(node('p','journey-empty','No linked expense or booked reservation spend.'));
  for(const item of breakdown){const spendRow=node('div','journey-record-detail-spend-row');spendRow.append(node('strong','',item.label),node('b','',formatMoney(item.amountAUD,'AUD')));spendList.append(spendRow);}
  spend.append(spendList);
  body.append(hero,facts,spend,node('p','journey-record-menu-note','Journey History is read-only. Open the original Itinerary stay only when you deliberately need to edit that completed trip.'));
  const actions=[];
  if(typeof navigate==='function')actions.push({label:'Open Original Itinerary Stay',onClick:d=>{d.close();queueMicrotask(()=>navigate('itinerary',{collection:'itinerary',id:row.id}));}});
  actions.push({label:'Close',onClick:d=>d.close()});
  const dialog=createModal({title:`${row.name} · Journey Detail`,body,className:`tcc-expanded-modal tcc-expanded-inherits-source journey-record-detail-modal tone-${journeyRecordTone(row)}`,actions});
  host.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}

function renderRows(model, navigate, options, updateOptions, state) {
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
  for (const label of ['Type','Destination','Stay','Days','Living / Day','Living Cost','Kilometres']) header.append(node('span', '', label));
  table.append(header);
  if (!rows.length) table.append(node('p', 'journey-empty', 'No entries yet'));
  for (const row of rows) {
    const rowTone=journeyRecordTone(row);
    const button = node('button', `journey-row journey-record-row journey-record-tone-${rowTone}`);
    button.type = 'button';
    button.dataset.recordId = row.id;
    button.dataset.expandTone = rowTone;
    const destination = node('span', 'journey-destination');
    const destinationFlag=node('span','journey-destination-flag',countryFlagEmoji(row.flagCountry||row.country||'')); destinationFlag.setAttribute('aria-hidden','true');
    const destinationCopy=node('span','journey-destination-copy'); destinationCopy.append(node('strong', '', row.name), node('small', '', [row.country, row.travelYearLabel || ''].filter(Boolean).join(' · ')));
    destination.append(destinationFlag,destinationCopy);
    button.append(
      typeIcon(row),
      destination,
      node('span', 'journey-stay-dates', row.displayDates),
      node('span', 'journey-days', integer(row.days)),
      node('span', 'journey-average-cost', formatMoney(row.livingCostPerDayAUD, 'AUD')),
      node('span', 'journey-destination-cost', formatMoney(row.livingCostAUD, 'AUD')),
      node('span', 'journey-distance', kilometres(row.kilometresTravelled))
    );
    button.setAttribute('aria-label', [
      'Enlarge completed stay details',
      row.name,
      row.country,
      row.displayDates,
      row.travelYearLabel || '',
      `${integer(row.days)} days`,
      `Living ${formatMoney(row.livingCostAUD, 'AUD')}`,
      `Total ${formatMoney(row.totalCostAUD, 'AUD')}`
    ].filter(Boolean).join(' · '));
    button.addEventListener('click',()=>openJourneyRecordDetail(panel,row,state,navigate));
    table.append(button);
  }
  panel.append(table);

  const footer = node('div', 'journey-record-footer');
  const totals = node('div', 'journey-record-totals');
  totals.append(node('strong', '', `Filtered living ${formatMoney(model.totalLivingCostAUD, 'AUD')}`), node('strong', '', `Filtered total ${formatMoney(model.totalCostAUD, 'AUD')}`), node('strong', '', `Filtered distance ${kilometres(model.totalKilometres)}`));
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
    const totalFlag=node('span','journey-destination-flag',countryFlagEmoji(total.flagCountry||total.country||'')); totalFlag.setAttribute('aria-hidden','true');
    const totalCopy=node('span','journey-destination-copy'); totalCopy.append(node('strong', '', total.name), node('small', '', [total.country, `${total.visits} ${total.visits === 1 ? 'visit' : 'visits'}`].filter(Boolean).join(' · ')));
    copy.append(totalFlag,totalCopy);
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
    if(['hotel','airbnb','accommodation'].includes(reservation.type)) totals.accommodation+=value;
    else if(reservation.type==='ticket') totals.entertainment+=value;
    else totals.travel+=value;
  }
  return totals;
}
function renderSpendBreakdown(state, model, currentDate){
  const panel=node('section','journey-panel journey-spend-panel');
  const head=node('div','journey-section-head'); head.append(node('h2','','Lifetime Travel Spend · AUD')); panel.append(head);
  const totals=spendingBreakdown(state,model,currentDate);
  const total=Object.values(totals).reduce((a,b)=>a+b,0);
  const labels={accommodation:'Accommodation',travel:'Travel between destinations',food:'Food',transport:'Local Transport',entertainment:'Entertainment',shopping:'Shopping',other:'Other'};
  const list=node('div','journey-spend-bars');
  for(const [key,label] of Object.entries(labels)){
    const value=totals[key]; const pct=total>0?(value/total)*100:0; const row=node('div','journey-spend-row');
    const labelWrap=node('span','journey-spend-label'); labelWrap.append(node('i',`journey-spend-dot journey-spend-${key}`),node('strong','',label));
    const track=node('span','journey-spend-track'); const fill=node('span',`journey-spend-fill journey-spend-${key}`); fill.style.width=`${pct}%`; track.append(fill);
    row.append(labelWrap,track,node('strong','',formatMoney(value,'AUD')),node('small','',`${Math.round(pct)}%`)); list.append(row);
  }
  const ranked=Object.entries(totals).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0));
  const biggest=ranked[0]||['other',0];
  const days=Math.max(0,Number(model.summary.daysTravelled||0));
  const travelBookings=Number(totals.travel||0);
  const insights=node('div','journey-spend-insights');
  const insight=(label,value,sub)=>{const item=node('article','journey-spend-insight');item.append(node('span','',label),node('strong','',value),node('small','',sub));return item;};
  insights.append(
    insight('BIGGEST CATEGORY',labels[biggest[0]]||'Other',formatMoney(biggest[1]||0,'AUD')),
    insight('AVERAGE / TRAVEL DAY',days?formatMoney(total/days,'AUD'):'—',days?`${integer(days)} recorded travel days`:'No completed travel days'),
    insight('TRAVEL BOOKINGS',formatMoney(travelBookings,'AUD'),total?`${Math.round(travelBookings/total*100)}% of lifetime spend`:'0% of lifetime spend')
  );
  panel.append(node('strong','journey-spend-total',formatMoney(model.summary.lifetimeTravelSpendAUD,'AUD')),list,insights);
  return panel;
}

function renderSnapshot(state, model) {
  const panel = node('section', 'journey-panel journey-snapshot-panel');
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Journey Snapshot'));
  panel.append(head);

  const rows = model.rows;
  const avg = rows.reduce((sum, row) => sum + Number(row.livingCostAUD||0), 0) / Math.max(1, rows.reduce((sum, row) => sum + row.days, 0));
  const lowest = [...rows].sort((a, b) => a.livingCostPerDayAUD - b.livingCostPerDayAUD)[0];
  const highest = [...rows].sort((a, b) => b.livingCostPerDayAUD - a.livingCostPerDayAUD)[0];
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
    metric('Lowest cost / day', lowest ? lowest.name : '—', lowest ? `${formatMoney(lowest.livingCostPerDayAUD, 'AUD')}/day` : ''),
    metric('Highest cost / day', highest ? highest.name : '—', highest ? `${formatMoney(highest.livingCostPerDayAUD, 'AUD')}/day` : ''),
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
    ['Intl Flights', bookings.filter(record => record.type === 'flight' && record.flightScope === 'international')],
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
function journeyMilestoneFacts(model){
  const rows=model.rows||[];
  const cruises=rows.filter(r=>r.travelType==='cruise');
  const motorhomes=rows.filter(r=>r.travelType==='motorhome'||r.travelType==='rv');
  const km=model.totalKilometres||rows.reduce((sum,row)=>sum+Number(row.kilometresTravelled||0),0);
  const spend=Number(model.summary.lifetimeTravelSpendAUD||0);
  const chronological=[...rows].sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')));
  const first=chronological[0]||null;
  const longest=[...rows].sort((a,b)=>Number(b.days||0)-Number(a.days||0))[0]||null;
  const highest=[...rows].sort((a,b)=>Number(b.livingCostPerDayAUD||0)-Number(a.livingCostPerDayAUD||0))[0]||null;
  return [
    ['1st',model.journeyStartDate?formatAUDate(model.journeyStartDate):'—','First journey'],
    [first?.country||'—','First country','visited'],
    [integer(model.summary.countriesVisited),'Countries','visited'],
    [integer(model.summary.destinationsCompleted||rows.length),'Completed','stays & trips'],
    [integer(model.summary.daysTravelled),'Travel','days'],
    [kilometres(km).replace(' km',''),'Recorded km','travelled'],
    [integer(cruises.length),'Cruises','completed'],
    [integer(motorhomes.length),'Motorhome','trips'],
    [String(Math.floor(model.summary.yearsOnRoad)),'Full travel','years'],
    [spend>=1000?`$${Math.round(spend/1000)}k`:formatMoney(spend,'AUD'),'Lifetime','spend · AUD'],
    [longest?.name||'—','Longest stay',longest?`${integer(longest.days)} days`:'No completed stay'],
    [highest?.name||'—','Highest living / day',highest?`${formatMoney(highest.livingCostPerDayAUD,'AUD')}/day`:'No completed stay']
  ];
}

function renderMilestones(model){
  const panel=node('section','journey-panel journey-milestones-panel');
  const head=node('div','journey-section-head'); head.append(node('h2','','Milestones · Automatic')); panel.append(head);
  const grid=node('div','journey-milestones-grid');
  for(const [value,label,sub] of journeyMilestoneFacts(model)){ const m=node('article','journey-milestone'); m.append(node('strong','',value),node('span','',label),node('small','',sub)); grid.append(m); }
  panel.append(grid); return panel;
}
function renderTravelMix(model){
  const panel=node('section','journey-panel journey-mix-panel'); const head=node('div','journey-section-head'); head.append(node('h2','','Travel Mix')); panel.append(head);
  const groups={standard:{days:0,count:0,km:0,spend:0},motorhome:{days:0,count:0,km:0,spend:0},cruise:{days:0,count:0,km:0,spend:0}};
  for(const row of model.rows){ const key=row.travelType==='rv'?'motorhome':(groups[row.travelType]?row.travelType:'standard'); const g=groups[key]; g.days+=Number(row.days||0);g.count+=1;g.km+=Number(row.kilometresTravelled||0);g.spend+=Number(row.totalCostAUD||0); }
  const totalDays=Object.values(groups).reduce((s,g)=>s+g.days,0)||1; const list=node('div','journey-mix-list');
  for(const [type,g] of Object.entries(groups)){ const item=node('article',`journey-mix-item journey-mix-${type}`); const top=node('div'); const percent=Math.round(g.days/totalDays*100); top.append(node('strong','',TYPE_LABELS[type]),node('strong','',`${percent}%`)); const progress=document.createElement('progress');progress.max=100;progress.value=percent; progress.setAttribute('aria-label',`${TYPE_LABELS[type]} travel mix`); progress.setAttribute('aria-valuetext',`${percent}% · ${integer(g.days)} days · ${g.count} trips · ${kilometres(g.km)} · ${formatMoney(g.spend,'AUD')}`); const facts=node('span','journey-mix-facts');facts.append(node('small','',`${integer(g.days)} days · ${g.count} trips`),node('small','',`${kilometres(g.km)} · ${formatMoney(g.spend,'AUD')}`)); item.append(top,progress,facts); list.append(item); }
  const totals=Object.values(groups).reduce((a,g)=>({days:a.days+g.days,trips:a.trips+g.count,km:a.km+g.km,spend:a.spend+g.spend}),{days:0,trips:0,km:0,spend:0});
  const summary=node('div','journey-mix-summary');
  summary.append(node('span','',`${integer(totals.days)} total days`),node('span','',`${integer(totals.trips)} trips`),node('span','',kilometres(totals.km)),node('span','',formatMoney(totals.spend,'AUD')));
  panel.append(list,summary); return panel;
}
function renderTopDestinations(model){
  const panel=node('section','journey-panel journey-top-destinations'); const head=node('div','journey-section-head');head.append(node('h2','','Destination Totals'),node('span','journey-count',String(model.destinationTotals.length)));panel.append(head);
  const list=node('div','journey-top-list'); if(!model.destinationTotals.length)list.append(node('p','journey-empty','No entries yet'));
  for(const total of model.destinationTotals.slice(0,5)){ const item=node('article','journey-top-item'); const avg=Number(total.days||0)>0?Number(total.totalCostAUD||0)/Number(total.days):0; item.append(node('strong','',total.name),node('span','',`${total.visits} stay${total.visits===1?'':'s'} · ${total.days} days · ${kilometres(total.kilometresTravelled)}`),node('b','',`${formatMoney(total.totalCostAUD,'AUD')} total · ${formatMoney(avg,'AUD')}/day`)); list.append(item); }
  const destinationSummary=model.destinationTotals.reduce((a,total)=>({visits:a.visits+Number(total.visits||0),days:a.days+Number(total.days||0),spend:a.spend+Number(total.totalCostAUD||0)}),{visits:0,days:0,spend:0});
  const summary=node('div','journey-top-summary');
  summary.append(node('span','',`${integer(destinationSummary.visits)} stays`),node('span','',`${integer(destinationSummary.days)} days`),node('span','',`${formatMoney(destinationSummary.spend,'AUD')} total`));
  panel.append(list,summary); return panel;
}

function renderHealth(model) {
  const panel = node('section', `journey-panel journey-health journey-health-${model.health.status}`);
  const head = node('div', 'journey-section-head');
  head.append(node('h2', '', 'Journey Check'));
  if (model.health.status !== 'verified') head.append(node('strong', 'journey-health-status', 'Needs Attention'));
  panel.append(head);
  if (!model.health.issues.length) panel.append(node('p', 'journey-health-copy', 'Completed journey records and map relationships are consistent.'));
  else {
    const list = node('ul', 'journey-health-issues');
    for (const issue of model.health.issues) list.append(node('li', '', issue));
    panel.append(list);
  }
  return panel;
}


function journeyExpandedStat(label,value,sub='',tone=''){
  const item=node('article',`journey-expanded-stat${tone?` is-${tone}`:''}`);
  item.append(node('span','',label),node('strong','',String(value)));
  if(sub)item.append(node('small','',sub));
  return item;
}

function journeySnapshotExpandedBody(state,model){
  const body=node('section','journey-insight-expanded journey-snapshot-expanded');
  const rows=model.rows||[];
  const totalDays=rows.reduce((sum,row)=>sum+Number(row.days||0),0);
  const totalLiving=rows.reduce((sum,row)=>sum+Number(row.livingCostAUD||0),0);
  const totalCost=rows.reduce((sum,row)=>sum+Number(row.totalCostAUD||0),0);
  const avg=totalLiving/Math.max(1,totalDays);
  const lowest=[...rows].sort((a,b)=>a.livingCostPerDayAUD-b.livingCostPerDayAUD)[0];
  const highest=[...rows].sort((a,b)=>b.livingCostPerDayAUD-a.livingCostPerDayAUD)[0];
  const longest=[...rows].sort((a,b)=>b.days-a.days)[0];
  const stats=node('div','journey-expanded-stat-grid');
  stats.append(
    journeyExpandedStat('AVERAGE LIVING / DAY',formatMoney(avg,'AUD'),`${integer(totalDays)} completed travel days`,'teal'),
    journeyExpandedStat('LOWEST COST / DAY',lowest?.name||'—',lowest?`${formatMoney(lowest.livingCostPerDayAUD,'AUD')} / day`:'No completed stay','green'),
    journeyExpandedStat('HIGHEST COST / DAY',highest?.name||'—',highest?`${formatMoney(highest.livingCostPerDayAUD,'AUD')} / day`:'No completed stay','gold'),
    journeyExpandedStat('LONGEST STAY / TRIP',longest?.name||'—',longest?`${integer(longest.days)} days`:'No completed stay','violet'),
    journeyExpandedStat('COMPLETED STAYS',integer(rows.length),`${integer(model.summary.countriesVisited)} countries visited`,'blue'),
    journeyExpandedStat('TOTAL DISTANCE',kilometres(model.totalKilometres),'recorded journey distance','orange')
  );body.append(stats);
  const travelTypes=new Set(['flight','train','cruise','rv']);
  const bookings=(state.reservations||[]).filter(record=>{if(!travelTypes.has(record.type)||record.status==='to-book')return false;const date=String(record.dateTime||'').slice(0,10);return Boolean(date&&date<model.today&&!record.needsBudgetRepair);});
  const bookingSpend=bookings.reduce((sum,record)=>sum+Number(record.audAmount||0),0);
  const section=node('section','journey-expanded-section');section.append(node('h3','','COMPLETED TRAVEL BOOKINGS'),node('p','journey-expanded-intro',`${bookings.length} completed travel bookings · ${formatMoney(bookingSpend,'AUD')}`));
  const groups=[
    ['International Flights',bookings.filter(r=>r.type==='flight'&&r.flightScope==='international'),'sky'],
    ['Domestic Flights',bookings.filter(r=>r.type==='flight'&&r.flightScope==='domestic'),'blue'],
    ['Trains',bookings.filter(r=>r.type==='train'),'green'],
    ['Cruises',bookings.filter(r=>r.type==='cruise'),'violet'],
    ['RV / Motorhome',bookings.filter(r=>r.type==='rv'),'orange']
  ];
  const unclassified=bookings.filter(r=>r.type==='flight'&&!r.flightScope);if(unclassified.length)groups.splice(2,0,['Flights · Unclassified',unclassified,'indigo']);
  const list=node('div','journey-expanded-booking-grid');
  for(const [label,records,tone] of groups){const item=node('article',`journey-expanded-booking is-${tone}`);item.append(node('span','',label),node('strong','',integer(records.length)),node('b','',formatMoney(records.reduce((sum,r)=>sum+Number(r.audAmount||0),0),'AUD')));list.append(item);}section.append(list);body.append(section);return body;
}

function journeyMilestonesExpandedBody(model){
  const body=node('section','journey-insight-expanded journey-milestones-expanded');
  const tones=['sky','teal','blue','green','orange','violet','gold','indigo','magenta','copper','lime','maroon'];
  const stats=node('div','journey-expanded-stat-grid journey-expanded-milestone-grid');
  journeyMilestoneFacts(model).forEach(([value,label,sub],index)=>stats.append(journeyExpandedStat(label.toUpperCase(),value,sub,tones[index%tones.length])));
  body.append(stats,node('p','journey-expanded-callout','Milestones are calculated automatically from Itinerary, Reservations, Expenses and Journey History. There is no manual favourite-destination field to maintain.'));return body;
}

function journeyTravelMixExpandedBody(model){
  const body=node('section','journey-insight-expanded journey-mix-expanded');
  const groups={standard:{days:0,count:0,km:0,spend:0},motorhome:{days:0,count:0,km:0,spend:0},cruise:{days:0,count:0,km:0,spend:0}};
  for(const row of model.rows||[]){const key=row.travelType==='rv'?'motorhome':(groups[row.travelType]?row.travelType:'standard');const g=groups[key];g.days+=Number(row.days||0);g.count+=1;g.km+=Number(row.kilometresTravelled||0);g.spend+=Number(row.totalCostAUD||0);}
  const totalDays=Object.values(groups).reduce((sum,g)=>sum+g.days,0)||1;
  const cards=node('div','journey-expanded-mix-grid');
  for(const [type,g] of Object.entries(groups)){
    const pct=Math.round(g.days/totalDays*100);const item=node('article',`journey-expanded-mix-card is-${type}`);
    const head=node('div','journey-expanded-mix-head');head.append(node('strong','',TYPE_LABELS[type]),node('b','',`${pct}%`));
    const progress=document.createElement('progress');progress.max=100;progress.value=pct;progress.setAttribute('aria-label',`${TYPE_LABELS[type]} share of completed travel days`);progress.setAttribute('aria-valuetext',`${pct}% · ${integer(g.days)} days`);
    const facts=node('div','journey-expanded-mix-facts');facts.append(node('span','',`${integer(g.count)} trips`),node('span','',`${integer(g.days)} days`),node('span','',kilometres(g.km)),node('span','',formatMoney(g.spend,'AUD')));
    item.append(head,progress,facts);cards.append(item);
  }
  body.append(cards,node('p','journey-expanded-callout','Travel Mix is based on completed journey days, with route distance and Total Cost shown alongside each travel mode.'));return body;
}

function journeyHealthExpandedBody(model){
  const body=node('section','journey-insight-expanded journey-health-expanded');
  const verified=model.health.status==='verified';
  const stats=node('div','journey-expanded-stat-grid');stats.append(
    journeyExpandedStat('STATUS',verified?'CLEAR':'NEEDS ATTENTION',verified?'completed journey relationships are consistent':'one or more journey relationships need review',verified?'green':'gold'),
    journeyExpandedStat('ISSUES',integer(model.health.issues.length),verified?'no detected journey issues':'items requiring review',model.health.issues.length?'red':'green'),
    journeyExpandedStat('COMPLETED STAYS',integer(model.rows.length),'records checked','blue'),
    journeyExpandedStat('RECORDED DISTANCE',kilometres(model.totalKilometres),'journey distance checked','teal')
  );body.append(stats);
  const section=node('section','journey-expanded-section');section.append(node('h3','','JOURNEY CHECK RESULTS'));
  if(!model.health.issues.length)section.append(node('p','journey-expanded-success','Completed journey records, itinerary relationships and map relationships are consistent.'));
  else{const list=node('ul','journey-expanded-issues');for(const issue of model.health.issues)list.append(node('li','',issue));section.append(list);}
  body.append(section);return body;
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
    main.append(renderRecordFilters(recordsModel, recordOptions, updateRecordOptions), renderRows(recordsModel, navigate, recordOptions, updateRecordOptions, state), renderHealth(lifetimeModel));

    const summaryTones={countries:'teal',destinations:'blue',days:'violet',years:'orange',spend:'magenta'};
    for(const card of main.querySelectorAll('.journey-summary-card')) {
      const kind=[...card.classList].find(name=>name.startsWith('journey-summary-')&&name!=='journey-summary-card')?.replace('journey-summary-','')||'blue';
      const label=card.querySelector('.journey-summary-copy > span')?.textContent||'Journey Summary';
      makeExpandableCard(card,{host:main,title:label,tone:summaryTones[kind]||'blue',bodyBuilder:()=>journeySummaryExpandedBody(kind,lifetimeModel,state,currentDate)});
    }
    const journeyExpanders=[
      ['.journey-map-panel','Journey Map','sky'],
      ['.journey-spend-panel','Lifetime Travel Spend','gold'],
      ['.journey-snapshot-panel','Journey Snapshot','maroon'],
      ['.journey-milestones-panel','Milestones','teal'],
      ['.journey-top-destinations','Destination Totals','copper'],
      ['.journey-mix-panel','Travel Mix','violet'],
      ['.journey-health','Journey Check','neutral']
    ];
    for(const [selector,title,tone] of journeyExpanders){
      const card=main.querySelector(selector);
      if(!card)continue;
      const resolvedTone=selector==='.journey-health'?(card.classList.contains('journey-health-needs-attention')?'gold':'green'):tone;
      const bodyBuilder=selector==='.journey-top-destinations'?()=>destinationTotalsExpandedBody(lifetimeModel)
        :selector==='.journey-map-panel'?()=>journeyMapExpandedBody(state,currentDate,mapOptions)
        :selector==='.journey-spend-panel'?()=>journeySummaryExpandedBody('spend',lifetimeModel,state,currentDate)
        :selector==='.journey-snapshot-panel'?()=>journeySnapshotExpandedBody(state,lifetimeModel)
        :selector==='.journey-milestones-panel'?()=>journeyMilestonesExpandedBody(lifetimeModel)
        :selector==='.journey-mix-panel'?()=>journeyTravelMixExpandedBody(lifetimeModel)
        :selector==='.journey-health'?()=>journeyHealthExpandedBody(lifetimeModel)
        :null;
      makeExpandableCard(card,{host:main,title,tone:resolvedTone,bodyBuilder});
    }

    if (pending?.collection === 'journeyHistory' && pending.id) {
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          if (pendingTargetPage) draft.ui.journeyHistoryPage = pendingTargetPage;
        });
        if (!pendingTargetId) return;
        queueMicrotask(() => {
          const liveHost=document.querySelector('[data-screen="journey-history"]');
          const targetNode=liveHost?.querySelector(`[data-record-id="${CSS.escape(pendingTargetId)}"]`);
          targetNode?.scrollIntoView({ block:'center' });
          const liveState=stateService.snapshot();
          const liveModel=buildJourneyHistoryViewModel(liveState,currentDate,{ years:['all'], travelType:'all', searchQuery:'' });
          const liveRow=liveModel.rows.find(row=>row.id===pendingTargetId);
          if(liveHost&&liveRow) openJourneyRecordDetail(liveHost,liveRow,liveState,navigate);
        });
      });
    }
  }

  renderContent();
  return main;
}
