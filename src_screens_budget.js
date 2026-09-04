import { buildBudgetViewModel } from './src_core_budget-view-model.js';
import { setDestinationBudgetDraft } from './src_core_itinerary-mutations.js';
import { saveExpenseDraft, deleteExpenseDraft } from './src_core_expense-mutations.js';
import { resolveDestinationBudgetForDate, staysCoveringDate, isDestinationBudgetUsable, deriveAUDForStay } from './src_core_budget.js';
import { localToAUD, audToLocal, formatMoney } from './src_core_currency.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { formatAUDate, toISODate } from './src_core_dates.js';

const CATEGORY_LABELS = Object.freeze({
  groceries:'Groceries',
  'eating-out':'Eating Out',
  transport:'Transport',
  entertainment:'Entertainment',
  shopping:'Shopping',
  miscellaneous:'Miscellaneous'
});

const CATEGORY_COLOURS = Object.freeze({
  groceries:'var(--feature-teal)',
  'eating-out':'var(--feature-blue)',
  transport:'var(--feature-indigo)',
  entertainment:'var(--feature-violet)',
  shopping:'var(--feature-magenta)',
  miscellaneous:'var(--feature-orange)'
});

const CATEGORY_TONES = Object.freeze({ groceries:'teal', 'eating-out':'blue', transport:'indigo', entertainment:'violet', shopping:'magenta', miscellaneous:'orange' });

const RESERVATION_TYPE_LABELS = Object.freeze({ flight:'Flight', train:'Train', cruise:'Cruise', rv:'RV', accommodation:'Accommodation', ticket:'Tickets & Attractions' });
const RESERVATION_STATUS_LABELS = Object.freeze({ paid:'Paid', unpaid:'Unpaid', booked:'Booked', 'to-book':'To Book' });

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function inputField(label, name, type = 'text', value = '') {
  const wrap = node('label', 'budget-field');
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

function uniqueStayCoveringDate(state, value) {
  if (!value) return null;
  try {
    const matches = staysCoveringDate(state.itinerary || [], value);
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}

function signedMoney(amount, currency) {
  return formatMoney(Number(amount || 0), currency || 'AUD');
}

function destinationMoney(stay, audAmount) {
  const aud = Number(audAmount || 0);
  if (stay?.localCurrency && Number(stay.fixedLocalPerAUD) > 0) {
    return {
      primary:signedMoney(Math.sign(aud) * audToLocal(Math.abs(aud), stay.fixedLocalPerAUD), stay.localCurrency),
      secondary:signedMoney(aud, 'AUD')
    };
  }
  return { primary:signedMoney(aud, 'AUD'), secondary:'' };
}

function fixedRateLabel(stay) {
  const rate = Number(stay?.fixedLocalPerAUD || 0);
  if (!stay?.localCurrency || !(rate > 0)) return 'Fixed rate not set';
  return `1 ${stay.localCurrency} = ${signedMoney(1 / rate, 'AUD')}`;
}

function budgetFooterMetric(label, primary, secondary = '') {
  const item = node('div', 'budget-current-footer-metric');
  item.append(node('b', '', label), node('strong', '', primary));
  if (secondary) item.append(node('small', '', secondary));
  return item;
}

function openExpenseEditor({ stateService, host, currentDate, expenseId = null, initialCategory = 'groceries', editorTone = null }) {
  const state = stateService.snapshot();
  const existing = expenseId ? state.expenses.find(record => record.id === expenseId) : null;
  if (expenseId && !existing) return;
  const initialDate = existing?.date || toISODate(currentDate);
  const initialStay = uniqueStayCoveringDate(state, initialDate);
  const defaultCurrency = state.settings?.defaultCurrency || 'AUD';
  const savedValue = {
    category:existing?.category || initialCategory,
    date:initialDate,
    description:existing?.description || '',
    originalCurrency:existing?.originalCurrency || initialStay?.localCurrency || defaultCurrency,
    originalAmount:existing?.originalAmount ?? '',
    audAmount:existing?.audAmount ?? ''
  };
  const formSession = new FormSession(savedValue);

  let modal = null;
  const body = node('div', 'budget-expense-editor');
  const categoryTiles = node('div', 'budget-category-tiles');
  categoryTiles.setAttribute('role', 'group');
  categoryTiles.setAttribute('aria-label', 'Expense category');
  const routingStatus = node('div', 'budget-routing-status');
  const fields = node('div', 'budget-form-grid');
  const conversionHint = node('p', 'budget-conversion-hint');
  const error = node('p', 'budget-form-error');
  body.dataset.currencyAuto = existing ? 'false' : 'true';
  body.dataset.audAuto = 'false';
  body.append(categoryTiles, routingStatus, fields, conversionHint, error);

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }

  function capture() {
    return {
      category:body.dataset.category,
      date:value('date'),
      description:value('description'),
      originalCurrency:value('originalCurrency').trim().toUpperCase() || defaultCurrency,
      originalAmount:value('originalAmount') === '' ? 0 : Number(value('originalAmount')),
      audAmount:value('audAmount') === '' ? null : Number(value('audAmount'))
    };
  }

  function renderCategories() {
    categoryTiles.replaceChildren();
    for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
      const button = node('button', `budget-category-tile budget-category-${category}`, label);
      button.type = 'button';
      const active = category === body.dataset.category;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      if (active) button.append(node('span', 'budget-selected-tick', '✓'));
      button.addEventListener('click', () => {
        body.dataset.category = category;
        if (!editorTone) setModalTone(modal, CATEGORY_TONES[category] || 'sky');
        preserveLocalFocus(() => renderCategories());
      });
      categoryTiles.append(button);
    }
  }

  function renderRouting() {
    routingStatus.replaceChildren();
    routingStatus.className = 'budget-routing-status';
    const date = value('date');
    if (!date) {
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', 'CHOOSE A TRANSACTION DATE'), node('span', '', 'The Destination Budget is selected automatically from the date.'));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    let matches;
    try { matches = staysCoveringDate(stateService.snapshot().itinerary || [], date); }
    catch {
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', 'INVALID DATE'), node('span', '', 'Choose a valid transaction date before saving.'));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    if (!matches.length) {
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', `NO DESTINATION BUDGET FOR ${formatAUDate(date)}`), node('span', '', 'No itinerary stay covers this date. Add the stay and its Destination Budget first.'));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    if (matches.length > 1) {
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', `DATE OVERLAP ON ${formatAUDate(date)}`), node('span', '', `${matches.length} itinerary stays cover this date. Fix the overlap before saving.`));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    const stay = matches[0];
    if (!isDestinationBudgetUsable(stay)) {
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', 'DESTINATION BUDGET NEEDS SETUP'), node('span', '', `${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)} covers ${formatAUDate(date)}, but its amount, local currency or fixed exchange rate is incomplete.`));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    body.dataset.destinationItineraryId = stay.id;
    routingStatus.classList.add('is-ok');
    routingStatus.append(
      node('strong', '', 'AUTOMATIC DESTINATION BUDGET'),
      node('span', '', `${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)}`),
      node('small', '', `${stay.localCurrency} · ${fixedRateLabel(stay)}`)
    );
    return stay;
  }

  function updateConversion({ dateChanged = false } = {}) {
    const stay = renderRouting();
    const currencyInput = fields.querySelector('[name="originalCurrency"]');
    const amountInput = fields.querySelector('[name="originalAmount"]');
    const audInput = fields.querySelector('[name="audAmount"]');
    if (!currencyInput || !amountInput || !audInput) return;
    if (dateChanged && body.dataset.currencyAuto === 'true' && stay?.localCurrency) currencyInput.value = stay.localCurrency;
    const currency = currencyInput.value.trim().toUpperCase();
    const amount = Number(amountInput.value);
    const validAmount = Number.isFinite(amount) && amount >= 0;
    if (currency === 'AUD' && validAmount) {
      audInput.readOnly = true;
      audInput.value = String(Math.round((amount + Number.EPSILON) * 100) / 100);
      body.dataset.audAuto = 'true';
      conversionHint.textContent = `${formatMoney(amount, 'AUD')} = ${formatMoney(amount, 'AUD')} automatically (1:1).`;
      return;
    }
    if (stay?.localCurrency && currency === stay.localCurrency && Number(stay.fixedLocalPerAUD) > 0 && validAmount) {
      const converted = localToAUD(amount, stay.fixedLocalPerAUD);
      audInput.readOnly = true;
      audInput.value = String(Math.round((converted + Number.EPSILON) * 100) / 100);
      body.dataset.audAuto = 'true';
      conversionHint.textContent = `${formatMoney(amount, currency)} = ${formatMoney(converted, 'AUD')} automatically at the fixed stay rate.`;
      return;
    }
    audInput.readOnly = false;
    if (body.dataset.audAuto === 'true') audInput.value = '';
    body.dataset.audAuto = 'false';
    conversionHint.textContent = currency && currency !== 'AUD'
      ? 'This is not the stay’s local currency. Enter the AUD equivalent manually.'
      : 'Enter the original amount. The AUD equivalent will be calculated automatically where possible.';
  }

  function populate(saved) {
    error.textContent = '';
    // Repopulation is used by Undo Changes as well as initial render. Reset
    // conversion provenance before rebuilding fields so a previously automatic
    // conversion cannot clear a restored saved/manual AUD equivalent. New
    // expenses also regain their original date-driven local-currency default.
    body.dataset.currencyAuto = existing ? 'false' : 'true';
    body.dataset.audAuto = 'false';
    body.dataset.category = saved.category;
    setModalTone(modal, editorTone || CATEGORY_TONES[saved.category] || 'sky');
    renderCategories();
    fields.replaceChildren(
      inputField('Date', 'date', 'date', saved.date),
      inputField('Description', 'description', 'text', saved.description),
      inputField('Original Currency', 'originalCurrency', 'text', saved.originalCurrency),
      inputField('Original Amount', 'originalAmount', 'number', saved.originalAmount),
      inputField('AUD Equivalent', 'audAmount', 'number', saved.audAmount)
    );
    fields.querySelector('[name="date"]')?.addEventListener('change', () => updateConversion({ dateChanged:true }));
    fields.querySelector('[name="originalCurrency"]')?.addEventListener('input', () => { body.dataset.currencyAuto = 'false'; updateConversion(); });
    fields.querySelector('[name="originalAmount"]')?.addEventListener('input', () => updateConversion());
    fields.querySelector('[name="audAmount"]')?.addEventListener('input', () => { if (!fields.querySelector('[name="audAmount"]')?.readOnly) body.dataset.audAuto = 'false'; });
    updateConversion();
  }

  populate(savedValue);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete expense',
        tone:resolvedTone,
        message:`Delete ${existing.description || CATEGORY_LABELS[existing.category] || 'this expense'} · ${CATEGORY_LABELS[existing.category] || 'Expense'} · ${existing.date ? formatAUDate(existing.date) : 'Date not set'} · ${formatMoney(existing.originalAmount, existing.originalCurrency || 'AUD')}? This cannot be undone.`,
        onConfirm:() => {
          stateService.commit(draft => deleteExpenseDraft(draft, existing.id));
          if (dialog.isConnected && dialog.open) dialog.close();
        }
      });
    }});
  }
  actions.push(
    { label:'Undo Changes', onClick:() => populate(formSession.undo()) },
    { label:'Cancel', onClick:dialog => { formSession.cancel(); dialog.close(); } },
    { label:'Save', onClick:dialog => {
      try {
        const formDraft = formSession.update(draft => Object.assign(draft, capture()));
        const liveState = stateService.snapshot();
        const stay = resolveDestinationBudgetForDate(liveState.itinerary || [], formDraft.date);
        formDraft.audAmount = deriveAUDForStay(formDraft, stay);
        stateService.commit(draft => saveExpenseDraft(draft, { expenseId:existing?.id || null, fields:formDraft }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) {
        error.textContent = err.message;
        renderRouting();
      }
    }}
  );

  const resolvedTone = editorTone || (existing ? CATEGORY_TONES[existing.category] : CATEGORY_TONES[initialCategory]) || 'sky';
  modal = createModal({ title:existing ? 'Edit Expense' : 'Add Expense', body, actions, className:`tcc-editor-modal tcc-budget-editor-modal tone-${resolvedTone}` });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function renderDestinationSummary(model) {
  const card = node('section', 'budget-summary-card budget-destination-card');
  card.append(node('p', 'budget-card-kicker', 'CURRENT DESTINATION BUDGET'));
  if (!model.currentDestination) {
    card.append(node('h2', 'budget-card-title', 'No current destination'), node('p', 'budget-muted', 'Add or update the itinerary to establish the active stay.'));
    return card;
  }
  const stay = model.currentDestination;
  card.append(node('h2', 'budget-card-title', stay.name), node('p', 'budget-card-dates', stay.dates));
  const total = node('div', 'budget-current-total');
  const localBudget = stay.localCurrency && stay.budgetLocal != null ? signedMoney(stay.budgetLocal, stay.localCurrency) : signedMoney(stay.budgetAUD, 'AUD');
  total.append(node('span', '', 'TOTAL BUDGET'), node('strong', '', localBudget));
  if (stay.localCurrency && stay.budgetLocal != null) total.append(node('small', '', `≈ ${signedMoney(stay.budgetAUD, 'AUD')}`));
  card.append(total);
  const trio = node('div', 'budget-current-trio');
  const spent = node('div', 'budget-current-metric budget-current-spent');
  spent.append(node('span', '', 'SPENT TO DATE'), node('strong', '', stay.localCurrency && stay.spentLocal != null ? signedMoney(stay.spentLocal, stay.localCurrency) : signedMoney(stay.spentAUD, 'AUD')), node('small', '', signedMoney(stay.spentAUD, 'AUD')));
  const remaining = node('div', 'budget-current-metric budget-current-remaining');
  remaining.append(node('span', '', 'AFTER COMMITMENTS'), node('strong', '', stay.localCurrency && stay.remainingLocal != null ? signedMoney(stay.remainingLocal, stay.localCurrency) : signedMoney(stay.remainingAUD, 'AUD')), node('small', '', stay.committedAUD ? `${signedMoney(stay.committedAUD, 'AUD')} future committed` : 'No future commitments'));
  trio.append(spent, remaining);
  card.append(trio);
  const footer = node('div', 'budget-current-footer');
  const daily = destinationMoney(stay, stay.pace?.plannedDailyBudgetAUD || 0);
  footer.append(
    budgetFooterMetric('DAILY ALLOWANCE', daily.primary, daily.secondary),
    budgetFooterMetric('DAYS REMAINING', String(stay.pace?.remainingDays ?? 0), 'days'),
    budgetFooterMetric('FIXED RATE', fixedRateLabel(stay))
  );
  card.append(footer);
  return card;
}

function paceMetric(label, value, tone='', sub='') {
  const metric = node('div', `budget-pace-metric ${tone}`.trim());
  metric.append(node('span', '', label), node('strong', '', value));
  if (sub) metric.append(node('small', '', sub));
  return metric;
}

function renderPaceSummary(model) {
  const card=node('section','budget-summary-card budget-pace-card');
  card.append(node('p','budget-card-kicker','DAILY & STAY PACE'),node('h2','budget-card-title','Stay Pace'));
  if(!model.currentDestination?.pace){ card.append(node('p','budget-muted','No active stay pace available.')); return card; }
  const stay=model.currentDestination, pace=stay.pace;
  const spendPercent=stay.budgetAUD>0?Math.round((stay.spentAUD/stay.budgetAUD)*100):0;
  const paceLabel=pace.forecastStatus==='needs-setup'?'NEEDS SETUP':pace.forecastStatus==='under'?'ON PACE':'WATCH';
  const ring=node('div',`budget-pace-ring${pace.forecastStatus==='needs-setup'?' budget-pace-ring-needs-setup':''}`); ring.style.setProperty('--pace-value',`${Math.max(0,Math.min(100,spendPercent))}%`); ring.setAttribute('role','progressbar'); ring.setAttribute('aria-label','Destination Budget spend pace'); ring.setAttribute('aria-valuemin','0'); ring.setAttribute('aria-valuemax','100'); ring.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,spendPercent)))); ring.setAttribute('aria-valuetext',pace.forecastStatus==='needs-setup'?'Destination Budget needs setup':`${spendPercent}% spent · ${pace.progress}% of stay elapsed`); ring.append(node('strong','',paceLabel),node('span','',pace.forecastStatus==='needs-setup'?'Complete Destination Budget setup':`${spendPercent}% spend · ${pace.progress}% stay`));
  const side=node('div','budget-pace-side'); side.append(paceMetric('Stay elapsed',`${pace.progress}%`),paceMetric('Spend pace',`${spendPercent}%`));
  const top=node('div','budget-pace-top'); top.append(ring,side); card.append(top);
  const planned=destinationMoney(stay,pace.plannedDailyBudgetAUD), actual=destinationMoney(stay,pace.averageSpendPerDayAUD), projected=destinationMoney(stay,pace.forecastSpendAUD);
  const metrics=node('div','budget-pace-bottom'); metrics.append(
    paceMetric('Daily budget',planned.primary,'',planned.secondary),
    paceMetric('Actual daily',actual.primary,'',actual.secondary),
    paceMetric('Projected stay spend',projected.primary,'',projected.secondary)
  ); card.append(metrics);
  const paceNote=pace.forecastStatus==='needs-setup'?'Set the Destination Budget amount, currency and fixed rate before stay pace is assessed.':pace.forecastStatus==='under'?`Projected under budget by ${signedMoney(Math.abs(pace.forecastVarianceAUD),'AUD')}`:`Projected over budget by ${signedMoney(Math.abs(pace.forecastVarianceAUD),'AUD')}`;
  const note=node('p',`budget-pace-note budget-pace-${pace.forecastStatus}`,paceNote); card.append(note);
  return card;
}

function renderAnnualSummary(model) {
  const card = node('section', 'budget-summary-card budget-annual-card');
  card.append(node('p', 'budget-card-kicker', 'ANNUAL BUDGET'), node('h2', 'budget-card-title', `${model.annual.year} Budget`));
  const remaining = node('div', 'budget-primary-money');
  remaining.append(node('strong', '', signedMoney(model.annual.budgetAUD, 'AUD')), node('span', '', 'annual budget'));
  card.append(remaining);
  const meta=node('div','budget-annual-metrics');
  meta.append(
    paceMetric('Spent so far',signedMoney(model.annual.spentAUD,'AUD')),
    paceMetric('After commitments',signedMoney(model.annual.afterCommitmentsAUD,'AUD'),'',model.annual.committedAUD ? `${signedMoney(model.annual.committedAUD,'AUD')} committed` : 'No future commitments')
  );
  card.append(meta);
  return card;
}

function destinationBudgetStatus(state) {
  const entries=[...(state.itinerary||[])].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)));
  const set=entries.filter(item=>isDestinationBudgetUsable(item));
  const missing=entries.filter(item=>!isDestinationBudgetUsable(item));
  const coverage=entries.length?Math.round((set.length/entries.length)*100):0;
  return { entries,set,missing,coverage };
}

const BUDGET_MONTHS = Object.freeze(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']);

function budgetDateParts(value) {
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return { day:'--',month:'---',year:'----',au:'' };
  const [,year,month,day]=match;
  return { day,month:BUDGET_MONTHS[Number(month)-1]||'---',year,au:formatAUDate(value) };
}

function budgetDateRangeText(entry) {
  const start=budgetDateParts(entry?.startDate), end=budgetDateParts(entry?.endDate);
  if(!start.au||!end.au)return '';
  return `${start.day} ${start.month} ${start.year} → ${end.day} ${end.month} ${end.year}`;
}

function destinationOccurrenceCountryKey(value) {
  const raw=String(value||'').normalize('NFC').trim().toLocaleLowerCase('en-AU');
  const aliases=new Map([
    ['uk','united kingdom'],['u.k.','united kingdom'],['united kingdom','united kingdom'],
    ['usa','united states'],['u.s.a.','united states'],['us','united states'],['u.s.','united states'],['united states of america','united states'],['united states','united states'],
    ['türkiye','turkey'],['turkiye','turkey'],['turkey','turkey'],
    ['czechia','czech republic'],['czech republic','czech republic'],
    ['uae','united arab emirates'],['u.a.e.','united arab emirates'],['united arab emirates','united arab emirates']
  ]);
  return aliases.get(raw)||raw;
}

function destinationOccurrenceKey(entry) {
  return `${destinationOccurrenceCountryKey(entry?.country)}|${String(entry?.name||'').normalize('NFC').trim().toLocaleLowerCase('en-AU')}`;
}

function destinationOccurrenceMeta(entries) {
  const totals=new Map();
  for(const entry of entries){
    const key=destinationOccurrenceKey(entry);
    totals.set(key,(totals.get(key)||0)+1);
  }
  const seen=new Map(), result=new Map();
  entries.forEach((entry,index)=>{
    const key=destinationOccurrenceKey(entry);
    const occurrence=(seen.get(key)||0)+1; seen.set(key,occurrence);
    result.set(entry.id,{ itineraryIndex:index+1, occurrence, total:totals.get(key)||1 });
  });
  return result;
}

function budgetDateTicket(entry,{compact=false}={}) {
  const start=budgetDateParts(entry?.startDate), end=budgetDateParts(entry?.endDate);
  const ticket=node('span',`budget-date-ticket${compact?' is-compact':''}`);
  ticket.setAttribute('aria-label',budgetDateRangeText(entry));
  const makeSide=(parts,label)=>{
    const side=node('span','budget-date-ticket-side');
    side.append(node('small','',label),node('strong','',parts.day),node('b','',parts.month),node('em','',parts.year));
    return side;
  };
  ticket.append(makeSide(start,'FROM'),node('span','budget-date-ticket-arrow','→'),makeSide(end,'TO'));
  return ticket;
}

function destinationAllocatedSpend(state,itineraryId){
  return [
    ...(state.expenses||[]).filter(record=>record.itineraryId===itineraryId&&!record.needsBudgetRepair),
    ...(state.reservations||[]).filter(record=>record.itineraryId===itineraryId&&record.status!=='to-book'&&!record.needsBudgetRepair)
  ].reduce((sum,record)=>sum+Number(record.audAmount||0),0);
}

function destinationHasNormalDatedCosts(state,itineraryId){
  return (state.expenses||[]).some(record=>record.itineraryId===itineraryId&&!record.needsBudgetRepair) ||
    (state.reservations||[]).some(record=>record.itineraryId===itineraryId&&!record.needsBudgetRepair);
}

function openDestinationBudgetEditor({stateService,host,itineraryId,reopenManager,editorTone=null}){
  const state=stateService.snapshot();
  const entry=(state.itinerary||[]).find(item=>item.id===itineraryId);
  if(!entry)return;
  const spent=destinationAllocatedSpend(state,itineraryId);
  const current=Number(entry.destinationBudgetAUD||0);
  const body=node('div','budget-destination-editor');
  const intro=node('div','budget-destination-editor-intro');
  intro.append(node('strong','',entry.name),node('span','',[entry.country,budgetDateRangeText(entry)].filter(Boolean).join(' · ')),budgetDateTicket(entry));
  body.append(intro);
  const snapshot=node('div','budget-destination-editor-snapshot');
  snapshot.append(
    paceMetric('Current budget',signedMoney(current,'AUD'),current>0?'is-set':'is-missing'),
    paceMetric('Dated costs',signedMoney(spent,'AUD')),
    paceMetric('Remaining',signedMoney(current-spent,'AUD'),current-spent>=0?'is-set':'is-missing')
  );
  body.append(snapshot);
  const dates=node('section','budget-destination-editor-dates');
  dates.append(node('div','budget-destination-editor-dates-head','STAY DATES · CALENDAR PICKER'));
  const dateFields=node('div','budget-destination-editor-date-grid');
  dateFields.append(inputField('Start Date','destinationStartDate','date',entry.startDate||''),inputField('End Date','destinationEndDate','date',entry.endDate||''));
  dates.append(dateFields,node('p','budget-destination-editor-date-note','These are the itinerary stay dates. Changing them here updates the same itinerary stay, so the itinerary and automatic dated-cost routing stay aligned.'));
  body.append(dates);
  const field=inputField('Destination Budget (AUD)','destinationBudgetAUD','number',current||'');
  field.classList.add('budget-destination-editor-field'); body.append(field);
  const moneySetup=node('div','budget-destination-editor-money-grid');
  const currencyField=inputField('Local Currency','destinationLocalCurrency','text',entry.localCurrency||'');
  const rateField=inputField('Local per AUD','destinationFixedLocalPerAUD','number',entry.fixedLocalPerAUD??'');
  const lockedCurrency=destinationHasNormalDatedCosts(state,itineraryId);
  if(lockedCurrency){
    currencyField.querySelector('input').disabled=true;
    rateField.querySelector('input').disabled=true;
  }
  moneySetup.append(currencyField,rateField); body.append(moneySetup);
  body.append(node('p','budget-destination-editor-help',lockedCurrency?'Local currency and fixed rate are locked because this stay already has dated costs. Stay dates can still be edited only when those costs remain routed to this exact stay.':'Set amount, itinerary-tied dates, local currency and fixed exchange rate together. A budget is Locked In only when all four are usable.')); 
  const error=node('p','budget-form-error'); body.append(error);
  let reopenQueued=false;
  const queueReopen=()=>{ if(!reopenManager||reopenQueued)return; reopenQueued=true; queueMicrotask(reopenManager); };
  const dialog=createModal({
    title:current>0?'Edit Destination Budget':'Create Destination Budget',body,
    actions:[
      {label:'Cancel',onClick:d=>d.close()},
      {label:'Save',onClick:d=>{
        try{
          const value=body.querySelector('[name="destinationBudgetAUD"]')?.value??'';
          const amount=value===''?0:Number(value);
          const startDate=body.querySelector('[name="destinationStartDate"]')?.value||entry.startDate;
          const endDate=body.querySelector('[name="destinationEndDate"]')?.value||entry.endDate;
          const localCurrency=body.querySelector('[name="destinationLocalCurrency"]')?.value??entry.localCurrency??'';
          const fixedValue=body.querySelector('[name="destinationFixedLocalPerAUD"]')?.value??entry.fixedLocalPerAUD??'';
          const fixedLocalPerAUD=fixedValue===''?null:Number(fixedValue);
          stateService.commit(draft=>setDestinationBudgetDraft(draft,itineraryId,amount,{now:stateService.now,startDate,endDate,localCurrency,fixedLocalPerAUD}));
          if(d.isConnected&&d.open)d.close();else queueReopen();
        }catch(err){error.textContent=err.message;}
      }}
    ],className:`tcc-editor-modal tcc-budget-destination-editor-modal tone-${editorTone || 'green'}`
  });
  host.append(dialog); dialog.showModal();
  dialog.addEventListener('close',()=>{dialog.remove(); queueReopen();},{once:true});
}

function openDestinationBudgetsManager({stateService,host,currentDate,initialFilter='all'}) {
  const state=stateService.snapshot(); const status=destinationBudgetStatus(state); const model=buildBudgetViewModel(state,currentDate);
  const occurrenceMeta=destinationOccurrenceMeta(status.entries);
  const body=node('div','budget-destination-manager');
  if(model.currentDestination){
    const currentEntry=status.entries.find(item=>item.id===model.currentDestination.id) || model.currentDestination;
    const current=node('section','budget-destination-manager-current');
    const remaining=destinationMoney(model.currentDestination,model.currentDestination.remainingAUD);
    const currentCopy=node('div','budget-destination-manager-current-copy');
    currentCopy.append(node('span','budget-destination-manager-current-label','CURRENT DESTINATION'),node('strong','',model.currentDestination.name),node('small','',`${remaining.primary}${remaining.secondary?` · ${remaining.secondary}`:''} remaining`));
    current.append(currentCopy,budgetDateTicket(currentEntry,{compact:true}));
    body.append(current);
  }
  const summary=node('div','budget-destination-manager-summary');
  summary.append(
    paceMetric('Itinerary stays',String(status.entries.length)),
    paceMetric('Have budget',String(status.set.length),'is-set'),
    paceMetric('Need budget',String(status.missing.length),status.missing.length?'is-missing':'is-set'),
    paceMetric('Coverage',`${status.coverage}%`,status.coverage===100?'is-set':'')
  ); body.append(summary);
  const coverage=node('div','budget-destination-coverage'); coverage.setAttribute('role','progressbar'); coverage.setAttribute('aria-label','Destination Budget setup coverage'); coverage.setAttribute('aria-valuemin','0'); coverage.setAttribute('aria-valuemax','100'); coverage.setAttribute('aria-valuenow',String(status.coverage)); coverage.setAttribute('aria-valuetext',`${status.set.length} of ${status.entries.length} itinerary stays have a complete Destination Budget · ${status.coverage}%`);
  const fill=node('span','budget-destination-coverage-fill'); fill.style.width=`${status.coverage}%`; coverage.append(fill); body.append(coverage);
  body.append(node('p','budget-destination-manager-guidance','Dates are deliberately prominent. Match the exact dated stay before setting a budget or checking automatic date routing—especially where the same city appears more than once.'));

  let activeFilter=['all','missing','set'].includes(initialFilter)?initialFilter:'all';
  const filters=node('div','budget-destination-manager-filters'); filters.setAttribute('role','group'); filters.setAttribute('aria-label','Filter Destination Budgets');
  const list=node('div','budget-destination-manager-list');
  const filterDefs=[['all',`All ${status.entries.length}`],['missing',`Need Budget ${status.missing.length}`],['set',`Locked In ${status.set.length}`]];

  function renderRows(){
    list.replaceChildren();
    const entries=status.entries.filter(entry=>activeFilter==='all'||(activeFilter==='set'&&isDestinationBudgetUsable(entry))||(activeFilter==='missing'&&!isDestinationBudgetUsable(entry)));
    for(const entry of entries){
      const hasBudget=isDestinationBudgetUsable(entry);
      const meta=occurrenceMeta.get(entry.id)||{itineraryIndex:0,occurrence:1,total:1};
      const row=node('button',`budget-destination-manager-row ${hasBudget?'is-set':'is-missing'}`); row.type='button';
      row.setAttribute('aria-label',`${entry.name}, ${budgetDateRangeText(entry)}, ${hasBudget?'budget set':'budget needed'}`);
      const copy=node('span','budget-destination-manager-copy');
      const labels=node('span','budget-destination-manager-labels');
      labels.append(node('small','budget-destination-stay-sequence',`STAY ${String(meta.itineraryIndex).padStart(2,'0')}`));
      if(meta.total>1)labels.append(node('small','budget-destination-repeat-sequence',`${entry.name.toUpperCase()} ${meta.occurrence} OF ${meta.total}`));
      copy.append(labels,node('strong','',entry.name),node('small','budget-destination-country',entry.country||'Destination / Trip'));
      const value=node('span','budget-destination-manager-value');
      const incompleteAmount=Number(entry.destinationBudgetAUD)>0;
      value.append(node('strong','',hasBudget?'LOCKED IN':incompleteAmount?'NEEDS SETUP':'NEEDS BUDGET'),node('small','',hasBudget?`${signedMoney(entry.destinationBudgetAUD,'AUD')} · EDIT`:incompleteAmount?'ADD CURRENCY / RATE':'TAP TO SET'));
      row.append(budgetDateTicket(entry,{compact:true}),copy,value);
      row.addEventListener('click',()=>{
        dialog.close();
        queueMicrotask(()=>openDestinationBudgetEditor({stateService,host,itineraryId:entry.id,reopenManager:()=>{const liveHost=document.querySelector('[data-screen="budget"]');if(liveHost)openDestinationBudgetsManager({stateService,host:liveHost,currentDate,initialFilter:activeFilter});}}));
      });
      list.append(row);
    }
    if(!status.entries.length)list.append(node('p','budget-muted','No itinerary destinations yet. Add destinations in Itinerary first.'));
    else if(!entries.length)list.append(node('p','budget-muted',activeFilter==='missing'?'Every itinerary stay has a Destination Budget.':'No stays in this view.'));
  }

  for(const [filter,label] of filterDefs){
    const button=node('button',`budget-destination-manager-filter filter-${filter}`,label); button.type='button';
    button.dataset.active=String(activeFilter===filter); button.setAttribute('aria-pressed',String(activeFilter===filter));
    button.addEventListener('click',()=>{
      activeFilter=filter;
      filters.querySelectorAll('.budget-destination-manager-filter').forEach(item=>{ const on=item===button; item.dataset.active=String(on); item.setAttribute('aria-pressed',String(on)); });
      renderRows();
    });
    filters.append(button);
  }
  body.append(filters,list);
  renderRows();
  const dialog=createModal({title:'Destination Budgets',body,actions:[{label:'Close',onClick:d=>d.close()}],className:'tone-green'}); host.append(dialog); dialog.showModal(); dialog.addEventListener('close',()=>dialog.remove(),{once:true});
}

function renderDestinationBudgets(model,state,{stateService,host,currentDate}){
  const status=destinationBudgetStatus(state); const card=node('button','budget-summary-card budget-destination-budgets-card'); card.type='button';
  card.append(node('p','budget-card-kicker','ITINERARY BUDGET COVERAGE'),node('h2','budget-card-title','Destination Budgets'));
  if(model.currentDestination){
    const current=node('div','budget-destination-current-strip');
    const remaining=destinationMoney(model.currentDestination,model.currentDestination.remainingAUD);
    current.append(node('span','','CURRENT DESTINATION'),node('strong','',model.currentDestination.name),node('b','',remaining.primary));
    current.append(node('em','budget-destination-current-dates',budgetDateRangeText(model.currentDestination)));
    if(remaining.secondary)current.append(node('small','',`${remaining.secondary} remaining`)); else current.append(node('small','','remaining'));
    card.append(current);
  }
  const metrics=node('div','budget-destination-readiness-metrics budget-destination-readiness-metrics-four');
  metrics.append(
    paceMetric('Itinerary stays',String(status.entries.length)),
    paceMetric('Have budget',String(status.set.length),'is-set'),
    paceMetric('Need budget',String(status.missing.length),status.missing.length?'is-missing':'is-set'),
    paceMetric('Coverage',`${status.coverage}%`,status.coverage===100?'is-set':'')
  ); card.append(metrics);
  const coverage=node('div','budget-destination-coverage'); const fill=node('span','budget-destination-coverage-fill'); fill.style.width=`${status.coverage}%`; coverage.setAttribute('aria-hidden','true'); coverage.append(fill); card.append(coverage);
  const readiness=status.entries.length===0
    ? 'No itinerary destinations yet. Add destinations in Itinerary first.'
    : status.missing.length
      ? `${status.missing.length} itinerary destination${status.missing.length===1?'':'s'} still need complete Destination Budget setup. Tap to manage.`
      : 'Every itinerary destination is Locked In. Tap to manage.';
  card.append(node('p','budget-destination-readiness-note',readiness));
  card.addEventListener('click',()=>openDestinationBudgetsManager({stateService,host,currentDate})); return card;
}

function renderAnnualForecast(model){
  const panel=node('section','budget-panel budget-forecast-panel');
  const head=node('div','budget-section-head');
  const statusLabel=model.annual.forecastStatus==='needs-setup'?'NEEDS SETUP':model.annual.forecastStatus==='under'?'ON TRACK':'WATCH';
  const status=node('span',`budget-forecast-status budget-forecast-status-${model.annual.forecastStatus}`,statusLabel);
  head.append(node('h2','','Year Forecast & Budget Summary'),status); panel.append(head);

  const budget=Math.max(0,Number(model.annual.budgetAUD||0));
  const spent=Math.max(0,Number(model.annual.spentAUD||0));
  const committed=Math.max(0,Number(model.annual.committedAUD||0));
  const available=Math.max(0,Number(model.annual.afterCommitmentsAUD||0));
  const denom=Math.max(1,budget);
  const flow=node('div','budget-forecast-flow');
  const flowHead=node('div','budget-flow-head'); flowHead.append(node('span','','ANNUAL BUDGET FLOW'),node('strong','',signedMoney(budget,'AUD'))); flow.append(flowHead);
  const track=node('div','budget-flow-track');
  const spentSeg=node('span','budget-flow-segment budget-flow-spent'); spentSeg.style.width=`${Math.min(100,(spent/denom)*100)}%`;
  const committedSeg=node('span','budget-flow-segment budget-flow-committed'); committedSeg.style.width=`${Math.min(Math.max(0,100-(spent/denom)*100),(committed/denom)*100)}%`;
  const bufferSeg=node('span','budget-flow-segment budget-flow-buffer'); bufferSeg.style.width=`${Math.min(Math.max(0,100-((spent+committed)/denom)*100),(available/denom)*100)}%`;
  track.append(spentSeg,committedSeg,bufferSeg); flow.append(track);
  const legend=node('div','budget-flow-legend');
  for(const [label,value,tone] of [['Spent so far',spent,'spent'],['Future commitments',committed,'committed'],['Available after commitments',model.annual.afterCommitmentsAUD,'buffer']]){
    const item=node('span',`budget-flow-legend-item ${tone}`); item.append(node('small','',label),node('strong','',signedMoney(value,'AUD'))); legend.append(item);
  }
  flow.append(legend); panel.append(flow);

  const avg=model.annual.elapsedDays?model.annual.spentAUD/Math.max(1,Math.ceil(model.annual.elapsedDays/30.44)):0;
  const metrics=node('div','budget-forecast-grid budget-forecast-grid-refined');
  const progressMetric=paceMetric('Year progress',`${model.annual.progress}%`,'',`Day ${model.annual.elapsedDays} of ${model.annual.daysInYear}`);
  const forecastMetric=paceMetric('Projected year-end',signedMoney(model.annual.forecastAUD,'AUD'),'',`${signedMoney(model.annual.forecastAUD/12,'AUD')} projected monthly`);
  const bufferTone=model.annual.forecastStatus==='needs-setup'?'':model.annual.forecastStatus==='under'?'budget-flow-good':'budget-flow-bad';
  const bufferMetric=paceMetric('Forecast annual buffer',signedMoney(model.annual.forecastVarianceAUD,'AUD'),bufferTone,`${signedMoney(avg,'AUD')} avg monthly so far`);
  metrics.append(progressMetric,forecastMetric,bufferMetric); panel.append(metrics);
  const forecastNote=model.annual.forecastStatus==='needs-setup'?'Set the Annual Budget in Settings before year-end pace is assessed.':model.annual.forecastStatus==='under'?"You're on track to finish the year with a healthy buffer.":'Current pace is projected to finish over the annual budget.';
  panel.append(node('p',`budget-forecast-note budget-forecast-${model.annual.forecastStatus}`,forecastNote));
  return panel;
}

function renderLivingExpenses(model, openNewExpense) {
  const panel = node('section', 'budget-panel budget-living-panel');
  const head = node('div', 'budget-section-head');
  head.append(node('h2', '', 'Living Expenses'));
  const add = node('button', 'button budget-add-expense', 'Add Expense');
  add.type = 'button';
  add.addEventListener('click', () => openNewExpense('groceries', 'violet'));
  head.append(add);
  panel.append(head);
  const grid = node('div', 'budget-category-grid');
  for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
    const button = node('button', `budget-category-summary budget-category-${category}`);
    button.type = 'button';
    button.addEventListener('click', () => openNewExpense(category, CATEGORY_TONES[category] || 'sky'));
    button.append(node('span', '', label));
    const localAmount = model.categories.destinationLocal?.[category];
    if (model.currentDestination?.localCurrency && localAmount != null) {
      button.append(node('strong', '', signedMoney(localAmount, model.currentDestination.localCurrency)), node('small', '', signedMoney(model.categories.destination[category], 'AUD')));
    } else {
      button.append(node('strong', '', signedMoney(model.categories.destination[category], 'AUD')));
    }
    grid.append(button);
  }
  panel.append(grid);
  return panel;
}

function renderReservations(model, navigate) {
  const panel = node('section', 'budget-panel');
  const head = node('div', 'budget-section-head');
  const reservationHeadMeta = node('div', 'budget-head-meta');
  reservationHeadMeta.append(node('strong', '', signedMoney(model.currentDestination?.linkedReservationTotalAUD || 0, 'AUD')), node('span', 'budget-count', String(model.reservations.length)));
  head.append(node('h2', '', 'Reservations'), reservationHeadMeta);
  panel.append(head);
  const list = node('div', 'budget-list');
  if (!model.reservations.length) list.append(node('p', 'budget-muted', 'No entries yet'));
  for (const record of model.reservations) {
    const row = node('button', 'budget-list-row budget-reservation-row');
    row.type = 'button';
    const copy = node('div');
    const typeLabel = RESERVATION_TYPE_LABELS[record.type] || record.type;
    const statusLabel = RESERVATION_STATUS_LABELS[record.status] || record.status;
    copy.append(node('strong', '', record.title), node('small', '', `${typeLabel} · ${statusLabel}`));
    const amounts = node('div', 'budget-row-amounts');
    amounts.append(node('strong', '', signedMoney(record.originalAmount, record.originalCurrency)));
    if (record.originalCurrency !== 'AUD' || Number(record.originalAmount) !== Number(record.audAmount)) amounts.append(node('small', '', signedMoney(record.audAmount, 'AUD')));
    row.append(copy, amounts);
    row.setAttribute('aria-label', ['Open reservation', record.title, formatAUDate(toISODate(record.dateTime)), typeLabel, statusLabel].join(' · '));
    row.addEventListener('click', () => navigate('reservations', { collection:'reservations', id:record.id, editorTone:'indigo' }));
    list.append(row);
  }
  panel.append(list);
  return panel;
}

function renderAccounts(model) {
  const details = document.createElement('details');
  details.className = 'budget-panel budget-accounts';
  details.open = true;
  const summary = node('summary');
  summary.append(node('span', '', 'Accounts'), node('strong', '', `${model.accounts.records.length} accounts · ${signedMoney(model.accounts.audTotal, 'AUD')} AUD total`));
  details.append(summary);
  const list = node('div', 'budget-list');
  if (!model.accounts.records.length) list.append(node('p', 'budget-muted', 'No entries yet'));
  for (const account of model.accounts.records) {
    const row = node('div', 'budget-list-row');
    row.append(node('strong', '', account.name), node('span', '', signedMoney(account.balance, account.currency)));
    list.append(row);
  }
  details.append(list);
  return details;
}

function categoryPeriodLabel(key, rawLabel) {
  if (key === 'year') return rawLabel;
  const [year, month] = String(rawLabel).split('-').map(Number);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${monthNames[month - 1] || rawLabel} ${year}`;
}

function renderCategoryChart(model) {
  const panel = node('section', 'budget-panel budget-chart-panel budget-ranked-chart');
  const head = node('div', 'budget-section-head');
  const heading = node('div');
  heading.append(node('h2', '', 'Budget by Category'), node('p', 'budget-chart-caption', 'Ranked living spend · AUD'));
  const controls = node('div', 'budget-chart-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Budget chart period');
  head.append(heading, controls);
  panel.append(head);

  const summary = node('div', 'budget-chart-summary');
  const chart = node('div', 'budget-bars budget-ranked-bars');
  const mix = node('div', 'budget-mix');
  panel.append(summary, chart, mix);
  let mode = 'month';

  function renderMode() {
    controls.replaceChildren();
    for (const [key, label] of [['month','Month'],['year','Year']]) {
      const button = node('button', 'budget-chart-toggle', label);
      button.type = 'button';
      const active = key === mode;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => preserveLocalFocus(() => { mode = key; renderMode(); }));
      controls.append(button);
    }

    const period = model.categories[mode];
    const ranked = Object.entries(CATEGORY_LABELS)
      .map(([category,label]) => ({ category, label, amount:Number(period.totals[category] || 0) }))
      .sort((a,b) => b.amount - a.amount);
    const max = Math.max(1, ...ranked.map(item => item.amount));
    const total = Math.max(0, Number(period.totalAUD || 0));
    const top = ranked[0] || { label:'No spend yet', amount:0 };
    const topPercent = total > 0 ? Math.round((top.amount / total) * 100) : 0;

    const totalCard=node('div');
    totalCard.append(node('span','',categoryPeriodLabel(mode, period.label).toUpperCase()),node('strong','',signedMoney(total,'AUD')),node('small','','Total living spend'));
    const topCard=node('div');
    if(total>0) topCard.append(node('span','','TOP CATEGORY'),node('strong','',top.label),node('small','',`${topPercent}% · ${signedMoney(top.amount,'AUD')}`));
    else topCard.append(node('span','','SPEND STATUS'),node('strong','','No spend yet'),node('small','','No actual living expenses recorded for this period'));
    summary.replaceChildren(totalCard,topCard);

    chart.replaceChildren();
    ranked.forEach((item,index) => {
      const percent = total > 0 ? Math.round((item.amount / total) * 100) : 0;
      const row = node('div', 'budget-bar-row budget-ranked-row');
      const rank=node('span','budget-bar-rank',String(index+1).padStart(2,'0'));
      const labelWrap = node('span', 'budget-bar-label');
      labelWrap.append(node('strong','',item.label), node('small','',`${percent}% of spend`));
      const track = node('div', 'budget-bar-track');
      const fill = node('span', `budget-bar-fill budget-bar-${item.category}`);
      fill.style.width = `${Math.round((item.amount / max) * 100)}%`;
      fill.style.animationDelay = `${index * 55}ms`;
      track.append(fill);
      row.append(rank,labelWrap,track,node('strong','budget-bar-value',signedMoney(item.amount, 'AUD')));
      chart.append(row);
    });

    const mixTrack=node('div','budget-mix-track');
    ranked.forEach((item,index)=>{
      if(item.amount<=0 || total<=0) return;
      const segment=node('span',`budget-mix-segment budget-bar-${item.category}`);
      segment.style.width=`${(item.amount/total)*100}%`;
      segment.style.animationDelay=`${index*45}ms`;
      segment.title=`${item.label}: ${Math.round((item.amount/total)*100)}%`;
      mixTrack.append(segment);
    });
    mix.replaceChildren(node('span','budget-mix-label','SPEND MIX'),mixTrack);
  }

  renderMode();
  return panel;
}

const MONTH_LABELS = Object.freeze(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);
const MONTH_NAMES = Object.freeze(['January','February','March','April','May','June','July','August','September','October','November','December']);

function renderMonthlySpendHistory(model, currentDate) {
  const panel = node('section', 'budget-panel budget-monthly-history');
  const head = node('div', 'budget-section-head');
  head.append(node('h2', '', 'Monthly Spend History'));
  panel.append(head);

  const years = model.monthlyHistory?.years || [];
  const histories = model.monthlyHistory?.histories || [];
  const currentISO = toISODate(currentDate);
  const currentYear = Number(currentISO.slice(0, 4));
  const currentMonth = Number(currentISO.slice(5, 7));
  const annualBudgetConfigured = Number(model.annual?.budgetAUD || 0) > 0;
  let selectedYear = years.includes(currentYear) ? currentYear : years[0];

  const yearButtons = node('div', 'budget-history-years');
  yearButtons.setAttribute('role', 'group');
  yearButtons.setAttribute('aria-label', 'Monthly spend history year');
  const meta = node('div', 'budget-history-meta');
  const chart = node('div', 'budget-history-chart');
  const stats = node('div', 'budget-history-stats');
  panel.append(yearButtons, meta, chart, stats);

  function renderYear() {
    const history = histories.find(item => item.year === selectedYear) || histories[0];
    if (!history) {
      yearButtons.replaceChildren(); meta.replaceChildren(); chart.replaceChildren(node('p','budget-muted','No entries yet')); stats.replaceChildren();
      return;
    }
    yearButtons.replaceChildren();
    for (const year of years) {
      const button = node('button', 'budget-history-year', String(year));
      button.type = 'button';
      const active = year === selectedYear;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => preserveLocalFocus(() => { selectedYear = year; renderYear(); }));
      yearButtons.append(button);
    }

    meta.replaceChildren();
    const viewing = node('div', 'budget-history-meta-card');
    viewing.append(node('span', '', 'VIEWING'), node('strong', '', String(history.year)), node('small', '', history.year === currentYear ? 'CURRENT YEAR' : 'HISTORICAL YEAR'));
    const target = node('div', 'budget-history-meta-card');
    target.append(node('span', '', 'AVERAGE MONTHLY TARGET'), node('strong', '', annualBudgetConfigured ? signedMoney(history.monthlyTargetAUD, 'AUD') : '—'), node('small', '', annualBudgetConfigured ? 'annual budget ÷ 12' : 'Set Annual Budget in Settings'));
    meta.append(viewing, target);

    const maxValue = Math.max(1, history.monthlyTargetAUD, ...history.months.map(month => month.amountAUD));
    const targetPercent = Math.min(100, (history.monthlyTargetAUD / maxValue) * 100);
    chart.replaceChildren();
    history.months.forEach((month, index) => {
      const column = node('article', 'budget-history-month');
      if (history.year === currentYear && month.month === currentMonth) column.dataset.current = 'true';
      const amount = node('strong', 'budget-history-amount', signedMoney(month.amountAUD, 'AUD'));
      const track = node('div', 'budget-history-track');
      track.style.setProperty('--history-target', `${targetPercent}%`);
      const fill = node('span', `budget-history-fill budget-history-fill-${(index % 6) + 1}`);
      fill.style.height = `${Math.max(month.amountAUD > 0 ? 3 : 0, (month.amountAUD / maxValue) * 100)}%`;
      track.append(fill);
      column.append(amount, track, node('span', 'budget-history-month-label', MONTH_LABELS[index]));
      chart.append(column);
    });

    stats.replaceChildren();
    const stat = (label, value, sub = '', tone = '') => {
      const card = node('article', `budget-history-stat ${tone}`.trim());
      card.append(node('span', '', label), node('strong', '', value));
      if (sub) card.append(node('small', '', sub));
      return card;
    };
    const positionTone = annualBudgetConfigured ? (history.budgetPositionAUD >= 0 ? 'is-under' : 'is-over') : 'is-setup';
    stats.append(
      stat('Year to Date', signedMoney(history.spentAUD, 'AUD'), `${history.recordedMonths} recorded month${history.recordedMonths === 1 ? '' : 's'}`),
      stat('Average / Recorded Month', signedMoney(history.averageRecordedMonthAUD, 'AUD')),
      stat('Peak Month', history.peakMonth ? (MONTH_NAMES[history.peakMonth - 1] || '—') : '—', history.peakMonth ? signedMoney(history.peakMonthAUD, 'AUD') : 'No actual spend recorded'),
      stat('Annual Budget Position', annualBudgetConfigured ? `${signedMoney(Math.abs(history.budgetPositionAUD), 'AUD')} ${history.budgetPositionAUD >= 0 ? 'UNDER' : 'OVER'}` : 'NEEDS SETUP', annualBudgetConfigured ? '' : 'Set Annual Budget in Settings', positionTone)
    );
  }

  renderYear();
  return panel;
}

function renderRecentExpenses(model, openExistingExpense) {
  const panel = node('section', 'budget-panel');
  const head = node('div', 'budget-section-head');
  head.append(node('h2', '', 'Recent Expense Entries'), node('span', 'budget-count', String(model.recentExpenses.length)));
  panel.append(head);
  const list = node('div', 'budget-list');
  if (!model.recentExpenses.length) list.append(node('p', 'budget-muted', 'No entries yet'));
  for (const expense of model.recentExpenses) {
    const button = node('button', 'budget-expense-row');
    button.type = 'button';
    button.addEventListener('click', () => openExistingExpense(expense.id, 'blue'));
    const copy = node('div');
    copy.append(node('strong', '', expense.description || CATEGORY_LABELS[expense.category] || expense.category), node('small', '', `${expense.isFuture ? 'Future · ' : ''}${expense.displayDate} · ${CATEGORY_LABELS[expense.category] || expense.category}`));
    const amounts = node('div', 'budget-row-amounts');
    amounts.append(node('strong', '', signedMoney(expense.originalAmount, expense.originalCurrency)));
    if (expense.originalCurrency !== 'AUD' || Number(expense.originalAmount) !== Number(expense.audAmount)) amounts.append(node('small', '', signedMoney(expense.audAmount, 'AUD')));
    button.append(copy, amounts);
    button.setAttribute('aria-label', [
      'Open expense',
      expense.description || CATEGORY_LABELS[expense.category] || expense.category,
      expense.isFuture ? 'Future' : '',
      expense.displayDate,
      CATEGORY_LABELS[expense.category] || expense.category,
      signedMoney(expense.originalAmount, expense.originalCurrency),
      expense.originalCurrency !== 'AUD' || Number(expense.originalAmount) !== Number(expense.audAmount) ? signedMoney(expense.audAmount, 'AUD') : ''
    ].filter(Boolean).join(' · '));
    list.append(button);
  }
  panel.append(list);
  return panel;
}

export function renderBudgetScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root budget-screen');
  main.dataset.screen = 'budget';
  const openNewExpense = (category = 'groceries', editorTone = null) => {
    openExpenseEditor({ stateService, host:main, currentDate, initialCategory:category, editorTone });
  };
  const openExistingExpense = (expenseId, editorTone = null) => openExpenseEditor({ stateService, host:main, currentDate, expenseId, editorTone });
  const state = stateService.snapshot();
  const model = buildBudgetViewModel(state, currentDate);
  const homeModel=buildHomeViewModel(state,currentDate,{alertLimit:0,eventLimit:0});
  main.append(createStayBanner({currentStay:homeModel.currentStay,nextDestination:homeModel.nextDestination,navigate,className:'budget-stay-banner'}));

  const destinationSummary=renderDestinationSummary(model), paceSummary=renderPaceSummary(model);
  const top=node('section','budget-reference-top'); top.append(destinationSummary,paceSummary); main.append(top);
  makeExpandableCard(destinationSummary,{host:main,title:'Current Destination Budget',tone:'teal'});
  makeExpandableCard(paceSummary,{host:main,title:'Daily & Stay Pace',tone:'blue'});
  const add=node('button','budget-add-expense-bar','＋ ADD EXPENSE'); add.type='button'; add.addEventListener('click',()=>openNewExpense()); main.append(add);
  const annualSummary=renderAnnualSummary(model), destinationBudgets=renderDestinationBudgets(model,state,{stateService,host:main,currentDate});
  const planning=node('section','budget-reference-planning'); planning.append(annualSummary,destinationBudgets); main.append(planning);
  makeExpandableCard(annualSummary,{host:main,title:'Annual Budget',tone:'magenta'});
  const categoryChart=renderCategoryChart(model), annualForecast=renderAnnualForecast(model);
  const charts=node('section','budget-reference-charts'); charts.append(categoryChart,annualForecast); main.append(charts);
  makeExpandableCard(categoryChart,{host:main,title:'Budget by Category',tone:'gold'});
  makeExpandableCard(annualForecast,{host:main,title:'Year Forecast & Budget Summary',tone:'sky'});
  const livingExpenses=renderLivingExpenses(model,openNewExpense); main.append(livingExpenses);
  makeExpandableCard(livingExpenses,{host:main,title:'Living Expenses',tone:'violet'});
  const reservationsPanel=renderReservations(model,navigate), accountsPanel=renderAccounts(model);
  const middle=node('section','budget-two-column'); middle.append(reservationsPanel,accountsPanel); main.append(middle);
  makeExpandableCard(reservationsPanel,{host:main,title:'Reservations',tone:'indigo'});
  const recentExpenses=renderRecentExpenses(model,openExistingExpense), monthlyHistory=renderMonthlySpendHistory(model,currentDate);
  main.append(recentExpenses,monthlyHistory);
  makeExpandableCard(recentExpenses,{host:main,title:'Recent Expense Entries',tone:'blue'});
  makeExpandableCard(monthlyHistory,{host:main,title:'Monthly Spend History',tone:'violet'});

  const pending = state.ui?.pendingOpen;
  if (pending?.collection === 'expenses' && pending.id && state.expenses.some(record => record.id === pending.id)) {
    queueMicrotask(() => { if (!main.isConnected) return; stateService.commit(draft => { draft.ui.pendingOpen = null; }); const liveHost=document.querySelector('[data-screen="budget"]'); if(liveHost) openExpenseEditor({stateService,host:liveHost,currentDate,expenseId:pending.id,editorTone:pending.editorTone || null}); });
  } else if (pending?.collection === 'itinerary' && pending.id && state.itinerary.some(record => record.id === pending.id)) {
    queueMicrotask(() => {
      if (!main.isConnected) return;
      stateService.commit(draft => { draft.ui.pendingOpen = null; });
      const liveHost=document.querySelector('[data-screen="budget"]');
      if(liveHost) openDestinationBudgetEditor({stateService,host:liveHost,itineraryId:pending.id,reopenManager:null,editorTone:pending.editorTone || null});
    });
  }
  return main;
}

