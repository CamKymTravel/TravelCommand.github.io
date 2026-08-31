import { buildBudgetViewModel } from './src_core_budget-view-model.js';
import { saveExpenseDraft, deleteExpenseDraft } from './src_core_expense-mutations.js';
import { allowedExpenseAllocations } from './src_core_budget.js';
import { localToAUD, formatMoney } from './src_core_currency.js';
import { createModal } from './src_components_modal.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';

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
  wrap.append(input);
  return wrap;
}

function expenseLinkedStay(state, expense, currentDestination) {
  if (expense?.itineraryId) return state.itinerary.find(item => item.id === expense.itineraryId) || null;
  if (currentDestination?.id) return state.itinerary.find(item => item.id === currentDestination.id) || null;
  return null;
}

function signedMoney(amount, currency) {
  return formatMoney(Number(amount || 0), currency || 'AUD');
}

function openExpenseEditor({ stateService, host, currentDate, expenseId = null, initialCategory = 'groceries' }) {
  const state = stateService.snapshot();
  const existing = expenseId ? state.expenses.find(record => record.id === expenseId) : null;
  if (expenseId && !existing) return;
  const budgetModel = buildBudgetViewModel(state, currentDate);
  const currentDestination = budgetModel.currentDestination;
  const linkedStay = expenseLinkedStay(state, existing, currentDestination);
  const defaultCurrency = existing?.originalCurrency || linkedStay?.localCurrency || 'AUD';
  const destinationTargetId = existing?.allocation === 'destination' ? existing.itineraryId : currentDestination?.id || null;
  const savedValue = {
    category:existing?.category || initialCategory,
    allocation:existing?.allocation || (initialCategory === 'miscellaneous' && !currentDestination ? 'annual' : 'destination'),
    itineraryId:existing?.allocation === 'annual' ? null : destinationTargetId,
    date:existing?.date || currentDate,
    description:existing?.description || '',
    originalCurrency:defaultCurrency,
    originalAmount:existing?.originalAmount ?? '',
    audAmount:existing?.audAmount ?? ''
  };
  if (!allowedExpenseAllocations(savedValue.category).includes(savedValue.allocation)) savedValue.allocation = 'destination';
  const formSession = new FormSession(savedValue);

  const body = node('div', 'budget-expense-editor');
  const categoryTiles = node('div', 'budget-category-tiles');
  const allocationBlock = node('div', 'budget-allocation-block');
  const fields = node('div', 'budget-form-grid');
  const conversionHint = node('p', 'budget-conversion-hint');
  const error = node('p', 'budget-form-error');
  body.append(categoryTiles, allocationBlock, fields, conversionHint, error);

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }

  function capture() {
    const category = body.dataset.category;
    const allowed = allowedExpenseAllocations(category);
    const selectedAllocation = body.dataset.allocation;
    const allocation = allowed.includes(selectedAllocation) ? selectedAllocation : allowed[0];
    return {
      category,
      allocation,
      itineraryId:allocation === 'destination' ? (body.dataset.destinationItineraryId || null) : null,
      date:value('date'),
      description:value('description'),
      originalCurrency:value('originalCurrency').trim().toUpperCase() || 'AUD',
      originalAmount:value('originalAmount') === '' ? 0 : Number(value('originalAmount')),
      audAmount:value('audAmount') === '' ? null : Number(value('audAmount'))
    };
  }

  function renderAllocation() {
    allocationBlock.replaceChildren();
    const allowed = allowedExpenseAllocations(body.dataset.category);
    if (allowed.length === 1) {
      body.dataset.allocation = allowed[0];
      allocationBlock.append(node('p', 'budget-allocation-fixed', 'Allocated to Destination Budget'));
      return;
    }
    const label = node('span', 'budget-allocation-label', 'Allocate Miscellaneous to');
    const tiles = node('div', 'budget-allocation-tiles');
    for (const allocation of allowed) {
      const button = node('button', 'budget-allocation-tile', allocation === 'destination' ? 'Destination Budget' : 'Annual Budget');
      button.type = 'button';
      const active = allocation === body.dataset.allocation;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => {
        body.dataset.allocation = allocation;
        renderAllocation();
      });
      tiles.append(button);
    }
    allocationBlock.append(label, tiles);
  }

  function renderCategories() {
    categoryTiles.replaceChildren();
    for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
      const button = node('button', `budget-category-tile budget-category-${category}`, label);
      button.type = 'button';
      const active = category === body.dataset.category;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => {
        body.dataset.category = category;
        if (!allowedExpenseAllocations(category).includes(body.dataset.allocation)) body.dataset.allocation = 'destination';
        renderCategories();
        renderAllocation();
      });
      categoryTiles.append(button);
    }
  }

  function updateHint() {
    const stay = expenseLinkedStay(state, { itineraryId:body.dataset.destinationItineraryId || null }, currentDestination);
    const currency = value('originalCurrency').trim().toUpperCase();
    const amount = Number(value('originalAmount'));
    if (stay?.localCurrency && stay?.fixedLocalPerAUD && currency === stay.localCurrency && Number.isFinite(amount) && amount >= 0) {
      conversionHint.textContent = `${formatMoney(amount, currency)} = ${formatMoney(localToAUD(amount, stay.fixedLocalPerAUD), 'AUD')} at the fixed stay rate.`;
    } else if (currency === 'AUD' && Number.isFinite(amount) && amount >= 0) {
      conversionHint.textContent = `${formatMoney(amount, 'AUD')} will use the same AUD amount unless you enter a different AUD equivalent.`;
    } else {
      conversionHint.textContent = 'Enter the AUD equivalent manually when the fixed stay rate does not apply.';
    }
  }

  function populate(saved) {
    error.textContent = '';
    body.dataset.category = saved.category;
    body.dataset.allocation = saved.allocation;
    body.dataset.itineraryId = saved.itineraryId || '';
    body.dataset.destinationItineraryId = saved.itineraryId || destinationTargetId || '';
    renderCategories();
    renderAllocation();
    fields.replaceChildren(
      inputField('Date', 'date', 'date', saved.date),
      inputField('Description', 'description', 'text', saved.description),
      inputField('Original Currency', 'originalCurrency', 'text', saved.originalCurrency),
      inputField('Original Amount', 'originalAmount', 'number', saved.originalAmount),
      inputField('AUD Equivalent', 'audAmount', 'number', saved.audAmount)
    );
    fields.querySelector('[name="originalCurrency"]')?.addEventListener('input', updateHint);
    fields.querySelector('[name="originalAmount"]')?.addEventListener('input', updateHint);
    updateHint();
  }

  populate(savedValue);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete expense',
        message:`Delete ${existing.description || CATEGORY_LABELS[existing.category] || 'this expense'}? This cannot be undone.`,
        onConfirm:() => {
          try {
            stateService.commit(draft => deleteExpenseDraft(draft, existing.id));
            if (dialog.isConnected && dialog.open) dialog.close();
          } catch (err) {
            error.textContent = err.message;
          }
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
        const selectedStay = expenseLinkedStay(state, { itineraryId:formDraft.itineraryId }, currentDestination);
        if (formDraft.allocation === 'destination' && !formDraft.itineraryId) throw new Error('A current destination is required for this expense category.');
        if (formDraft.audAmount == null) {
          if (formDraft.originalCurrency === 'AUD') formDraft.audAmount = formDraft.originalAmount;
          else if (selectedStay?.localCurrency === formDraft.originalCurrency && selectedStay?.fixedLocalPerAUD) {
            formDraft.audAmount = localToAUD(formDraft.originalAmount, selectedStay.fixedLocalPerAUD);
          } else {
            throw new Error('Enter the AUD equivalent for this expense.');
          }
        }
        stateService.commit(draft => saveExpenseDraft(draft, { expenseId:existing?.id || null, fields:formDraft }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) {
        error.textContent = err.message;
      }
    }}
  );

  const modal = createModal({ title:existing ? 'Edit Expense' : 'Add Expense', body, actions });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function renderDestinationSummary(model) {
  const card = node('section', 'budget-summary-card budget-destination-card');
  card.append(node('p', 'budget-card-kicker', 'DESTINATION BUDGET'));
  if (!model.currentDestination) {
    card.append(node('h2', 'budget-card-title', 'No current destination'), node('p', 'budget-muted', 'Add or update the itinerary to establish the active stay.'));
    return card;
  }
  const stay = model.currentDestination;
  card.append(node('h2', 'budget-card-title', stay.name), node('p', 'budget-card-dates', stay.dates));
  const remaining = node('div', 'budget-primary-money');
  if (stay.localCurrency && stay.remainingLocal != null) remaining.append(node('strong', '', signedMoney(stay.remainingLocal, stay.localCurrency)));
  remaining.append(node('span', '', signedMoney(stay.remainingAUD, 'AUD')));
  card.append(remaining);
  const meta = node('div', 'budget-summary-meta');
  meta.append(
    node('span', '', `Budget ${signedMoney(stay.budgetAUD, 'AUD')}`),
    node('span', '', `Spent ${signedMoney(stay.spentAUD, 'AUD')}`),
    node('span', '', stay.localCurrency && stay.fixedLocalPerAUD ? `Fixed rate · 1 AUD = ${Number(stay.fixedLocalPerAUD).toLocaleString('en-AU', { maximumFractionDigits:4 })} ${stay.localCurrency}` : 'Fixed rate not set')
  );
  card.append(meta);
  if (stay.pace) {
    const pace = node('div', 'budget-pace-grid');
    pace.append(
      paceMetric('Day', `${stay.pace.currentDay} / ${stay.pace.totalDays}`),
      paceMetric('Daily pace', signedMoney(stay.pace.averageSpendPerDayAUD, 'AUD')),
      paceMetric('Planned pace', signedMoney(stay.pace.plannedDailyBudgetAUD, 'AUD')),
      paceMetric('Remaining/day', signedMoney(stay.pace.remainingDailyBudgetAUD, 'AUD'))
    );
    card.append(node('p', 'budget-pace-title', 'Daily & Stay Pace'), pace);
  }
  return card;
}

function paceMetric(label, value) {
  const metric = node('div', 'budget-pace-metric');
  metric.append(node('span', '', label), node('strong', '', value));
  return metric;
}

function renderAnnualSummary(model) {
  const card = node('section', 'budget-summary-card budget-annual-card');
  card.append(node('p', 'budget-card-kicker', `${model.annual.year} ANNUAL BUDGET`), node('h2', 'budget-card-title', 'Annual Budget'));
  const remaining = node('div', 'budget-primary-money');
  remaining.append(node('strong', '', signedMoney(model.annual.remainingAUD, 'AUD')), node('span', '', 'remaining'));
  card.append(remaining);
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = model.annual.progress;
  progress.setAttribute('aria-label', 'Calendar year progress');
  card.append(progress);
  const meta = node('div', 'budget-summary-meta');
  meta.append(
    node('span', '', `Spent ${signedMoney(model.annual.spentAUD, 'AUD')}`),
    node('span', '', `Forecast ${signedMoney(model.annual.forecastAUD, 'AUD')}`),
    node('span', `budget-forecast-${model.annual.forecastStatus}`, model.annual.forecastStatus === 'over' ? 'Forecast over budget' : 'Forecast under budget')
  );
  card.append(meta);
  return card;
}

function renderLivingExpenses(model, openNewExpense) {
  const panel = node('section', 'budget-panel budget-living-panel');
  const head = node('div', 'budget-section-head');
  head.append(node('h2', '', 'Living Expenses'));
  const add = node('button', 'button budget-add-expense', 'Add Expense');
  add.type = 'button';
  add.addEventListener('click', () => openNewExpense());
  head.append(add);
  panel.append(head);
  const grid = node('div', 'budget-category-grid');
  for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
    const button = node('button', `budget-category-summary budget-category-${category}`);
    button.type = 'button';
    button.addEventListener('click', () => openNewExpense(category));
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

function renderReservations(model) {
  const panel = node('section', 'budget-panel');
  const head = node('div', 'budget-section-head');
  const reservationHeadMeta = node('div', 'budget-head-meta');
  reservationHeadMeta.append(node('strong', '', signedMoney(model.currentDestination?.linkedReservationTotalAUD || 0, 'AUD')), node('span', 'budget-count', String(model.reservations.length)));
  head.append(node('h2', '', 'Reservations'), reservationHeadMeta);
  panel.append(head);
  const list = node('div', 'budget-list');
  if (!model.reservations.length) list.append(node('p', 'budget-muted', 'No entries yet'));
  for (const record of model.reservations) {
    const row = node('div', 'budget-list-row');
    const copy = node('div');
    copy.append(node('strong', '', record.title), node('small', '', `${record.type} · ${record.status} · ${record.allocation === 'destination' ? 'Destination Budget' : 'Annual Budget'}`));
    const amounts = node('div', 'budget-row-amounts');
    amounts.append(node('strong', '', signedMoney(record.originalAmount, record.originalCurrency)));
    if (record.originalCurrency !== 'AUD' || Number(record.originalAmount) !== Number(record.audAmount)) amounts.append(node('small', '', signedMoney(record.audAmount, 'AUD')));
    row.append(copy, amounts);
    list.append(row);
  }
  panel.append(list);
  return panel;
}

function renderAccounts(model) {
  const details = document.createElement('details');
  details.className = 'budget-panel budget-accounts';
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

function donutBackground(totals) {
  const entries = Object.entries(CATEGORY_LABELS).map(([category]) => [category, Number(totals?.[category] || 0)]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) return 'rgba(255,255,255,.07)';
  let cursor = 0;
  const slices = [];
  for (const [category, amount] of entries) {
    const start = cursor;
    cursor += (amount / total) * 100;
    slices.push(`${CATEGORY_COLOURS[category]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);
  }
  return `conic-gradient(${slices.join(', ')})`;
}

function renderCategoryChart(model) {
  const panel = node('section', 'budget-panel budget-chart-panel');
  const head = node('div', 'budget-section-head');
  const heading = node('div');
  heading.append(node('h2', '', 'Budget by Category'), node('p', 'budget-chart-caption', 'Expense entries · AUD'));
  const controls = node('div', 'budget-chart-controls');
  head.append(heading, controls);
  panel.append(head);

  const content = node('div', 'budget-chart-content');
  const chart = node('div', 'budget-bars');
  const donutWrap = node('div', 'budget-donut-wrap');
  const donut = node('div', 'budget-donut');
  const donutCenter = node('div', 'budget-donut-center');
  donut.append(donutCenter);
  donutWrap.append(donut);
  content.append(chart, donutWrap);
  panel.append(content);

  let mode = 'month';

  function renderMode() {
    controls.replaceChildren();
    for (const [key, label] of [['month','Monthly'],['year','Yearly']]) {
      const button = node('button', 'budget-chart-toggle', label);
      button.type = 'button';
      const active = key === mode;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => { mode = key; renderMode(); });
      controls.append(button);
    }

    const period = model.categories[mode];
    const values = Object.values(period.totals).map(Number);
    const max = Math.max(1, ...values);
    chart.replaceChildren();
    for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
      const amount = Number(period.totals[category] || 0);
      const row = node('div', 'budget-bar-row');
      const labelNode = node('span', '', label);
      const track = node('div', 'budget-bar-track');
      const fill = node('span', `budget-bar-fill budget-bar-${category}`);
      fill.style.width = `${Math.round((amount / max) * 100)}%`;
      track.append(fill);
      row.append(labelNode, track, node('strong', '', signedMoney(amount, 'AUD')));
      chart.append(row);
    }
    donut.style.background = donutBackground(period.totals);
    donutCenter.replaceChildren(
      node('strong', '', signedMoney(period.totalAUD, 'AUD')),
      node('small', '', categoryPeriodLabel(mode, period.label))
    );
    donut.setAttribute('aria-label', `${categoryPeriodLabel(mode, period.label)} category spending ${signedMoney(period.totalAUD, 'AUD')}`);
  }

  renderMode();
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
    button.addEventListener('click', () => openExistingExpense(expense.id));
    const copy = node('div');
    copy.append(node('strong', '', expense.description || CATEGORY_LABELS[expense.category] || expense.category), node('small', '', `${expense.displayDate} · ${CATEGORY_LABELS[expense.category] || expense.category} · ${expense.allocation}`));
    const amounts = node('div', 'budget-row-amounts');
    amounts.append(node('strong', '', signedMoney(expense.originalAmount, expense.originalCurrency)));
    if (expense.originalCurrency !== 'AUD' || Number(expense.originalAmount) !== Number(expense.audAmount)) amounts.append(node('small', '', signedMoney(expense.audAmount, 'AUD')));
    button.append(copy, amounts);
    list.append(button);
  }
  panel.append(list);
  return panel;
}

export function renderBudgetScreen({ stateService, currentDate }) {
  const main = node('main', 'screen-root budget-screen');
  main.dataset.screen = 'budget';

  const openNewExpense = (category = 'groceries') => openExpenseEditor({ stateService, host:main, currentDate, initialCategory:category });
  const openExistingExpense = expenseId => openExpenseEditor({ stateService, host:main, currentDate, expenseId });

  const state = stateService.snapshot();
  const model = buildBudgetViewModel(state, currentDate);
  const toolbar = node('header', 'budget-toolbar');
  const title = node('div');
  title.append(node('p', 'eyebrow', 'MONEY & SPENDING'), node('h1', '', 'Budget'));
  if (model.currentDestination) title.append(node('p', 'budget-toolbar-subtitle', `${model.currentDestination.name} · ${model.currentDestination.dates}`));
  toolbar.append(title);
  main.append(toolbar);

  const summaries = node('section', 'budget-summary-grid');
  summaries.append(renderDestinationSummary(model), renderAnnualSummary(model));
  main.append(summaries, renderLivingExpenses(model, openNewExpense));

  const middle = node('section', 'budget-two-column');
  middle.append(renderReservations(model), renderAccounts(model));
  main.append(middle);

  const bottom = node('section', 'budget-two-column budget-bottom-grid');
  bottom.append(renderCategoryChart(model), renderRecentExpenses(model, openExistingExpense));
  main.append(bottom);

  const pending = state.ui?.pendingOpen;
  if (pending?.collection === 'expenses' && pending.id && state.expenses.some(record => record.id === pending.id)) {
    queueMicrotask(() => {
      if (!main.isConnected) return;
      stateService.commit(draft => { draft.ui.pendingOpen = null; });
      const liveHost = document.querySelector('[data-screen="budget"]');
      if (liveHost) openExpenseEditor({ stateService, host:liveHost, currentDate, expenseId:pending.id });
    });
  }
  return main;
}
