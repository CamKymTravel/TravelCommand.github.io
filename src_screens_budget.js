import { buildBudgetViewModel } from './src_core_budget-view-model.js';
import { setDestinationBudgetDraft } from './src_core_itinerary-mutations.js';
import { saveExpenseDraft, deleteExpenseDraft } from './src_core_expense-mutations.js';
import { staysCoveringDate, sameDayHandoffCandidates, isDestinationBudgetUsable, annualBudgetForYear } from './src_core_budget.js';
import { localToAUD, audToLocal, formatMoney } from './src_core_currency.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { formatAUDate, toISODate } from './src_core_dates.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';
import { saveGeneralSettingsDraft } from './src_core_settings-mutations.js';
import { canonicalCountrySlug } from './src_core_entities.js';

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

const CATEGORY_TONES = Object.freeze({ groceries:'teal', 'eating-out':'orange', transport:'sky', entertainment:'magenta', shopping:'red', miscellaneous:'gold' });
const CATEGORY_ICONS = Object.freeze({ groceries:'groceries', 'eating-out':'restaurant', transport:'transport', entertainment:'entertainment', shopping:'shopping', miscellaneous:'misc' });

const RESERVATION_TYPE_LABELS = Object.freeze({ flight:'Flight', train:'Train', cruise:'Cruise', rv:'RV / Motorhome', hotel:'Hotel', airbnb:'Airbnb', accommodation:'Hotel', ticket:'Tickets & Attractions' });
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


function displayCountryForStay(stay = null) {
  if (!stay) return '';
  const type = String(stay.travelType || '').toLowerCase();
  if (type === 'cruise' || type === 'motorhome' || type === 'rv') return stay.startCountry || stay.country || '';
  return stay.country || stay.startCountry || '';
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
      secondary:`AUD ${signedMoney(aud, 'AUD')}`
    };
  }
  return { primary:signedMoney(aud, 'AUD'), secondary:'' };
}

function fixedRateLabel(stay) {
  const rate = Number(stay?.fixedLocalPerAUD || 0);
  const currency=String(stay?.localCurrency||'').trim().toUpperCase();
  if (!currency || !(rate > 0)) return 'Fixed rate not set';
  if(currency==='AUD')return '1 AUD = 1 AUD';
  return `1 AUD = ${rate.toLocaleString('en-AU',{maximumFractionDigits:4})} ${currency}`;
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
  const initialDate = existing ? (existing.date || '') : toISODate(currentDate);
  // Never invent today's date for an old repair record whose original date is
  // missing. Leaving it blank forces a deliberate date choice before Save and
  // prevents accidental routing to the current Destination Budget.
  const initialStay = initialDate ? uniqueStayCoveringDate(state, initialDate) : null;
  const defaultCurrency = state.settings?.defaultCurrency || 'AUD';
  const savedValue = {
    category:existing?.category || initialCategory,
    budgetScope:existing?.budgetScope === 'annual' ? 'annual' : 'destination',
    date:initialDate,
    description:existing?.description || '',
    originalCurrency:existing?.originalCurrency || initialStay?.localCurrency || defaultCurrency,
    originalAmount:existing?.originalAmount ?? '',
    audAmount:existing?.audAmount ?? '',
    itineraryId:existing?.budgetScope === 'annual' ? null : (existing?.itineraryId || null)
  };
  const formSession = new FormSession(savedValue);

  let modal = null;
  const body = node('div', 'budget-expense-editor');
  const categoryTiles = node('div', 'budget-category-tiles');
  categoryTiles.setAttribute('role', 'group');
  categoryTiles.setAttribute('aria-label', 'Expense category');
  const categoryStep = node('section', 'budget-editor-step budget-editor-step-category');
  const categoryHead = node('div', 'budget-editor-step-head');
  categoryHead.append(node('b', 'budget-editor-step-number', '1'), node('div', 'budget-editor-step-copy'));
  categoryHead.querySelector('.budget-editor-step-copy').append(node('strong', '', 'What was it for?'));
  categoryStep.append(categoryHead, categoryTiles);
  const routingStatus = node('div', 'budget-routing-status');
  const fields = node('div', 'budget-editor-fields');
  const error = node('p', 'budget-form-error');
  body.append(categoryStep, fields, error);

  function currentScope() {
    return body.dataset.category === 'miscellaneous' && body.dataset.budgetScope === 'annual' ? 'annual' : 'destination';
  }

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }

  function capture() {
    const date=value('date');
    const budgetScope=currentScope();
    let stay=null;
    if(budgetScope==='destination'){
      try{
        const snapshot=stateService.snapshot();
        const matches=staysCoveringDate(snapshot.itinerary||[],date);
        if(matches.length===1&&isDestinationBudgetUsable(matches[0])) stay=matches[0];
        else if(matches.length>1){
          const handoff=sameDayHandoffCandidates(snapshot.itinerary||[],date);
          const selected=handoff.find(item=>item.id===body.dataset.destinationItineraryId) || null;
          if(selected&&isDestinationBudgetUsable(selected)) stay=selected;
        }
      }catch{}
    }
    const originalAmount=value('originalAmount') === '' ? 0 : Number(value('originalAmount'));
    return {
      category:body.dataset.category,
      budgetScope,
      itineraryId:budgetScope==='destination' ? (stay?.id || body.dataset.destinationItineraryId || null) : null,
      date,
      description:value('description'),
      originalCurrency:budgetScope==='annual' ? 'AUD' : String(stay?.localCurrency || existing?.originalCurrency || defaultCurrency).trim().toUpperCase(),
      originalAmount,
      audAmount:budgetScope==='annual' ? originalAmount : null
    };
  }

  function renderCategories() {
    categoryTiles.replaceChildren();
    for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
      const button = node('button', `budget-category-tile budget-category-${category}`);
      button.type = 'button';
      button.append(createLineIcon(CATEGORY_ICONS[category] || 'budget', 'budget-category-choice-icon'), node('span', 'budget-category-choice-label', label));
      const active = category === body.dataset.category;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      if (active) button.append(createLineIcon('check', 'budget-selected-tick'));
      button.addEventListener('click', () => {
        const draft=capture();
        draft.category=category;
        if(category!=='miscellaneous')draft.budgetScope='destination';
        populate(draft);
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
      routingStatus.append(node('strong', '', 'CHOOSE A TRANSACTION DATE'), node('span', '', currentScope()==='annual' ? 'The date places this AUD item into the correct Annual Budget year.' : 'The Destination Budget is selected automatically from the date.'));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    if(currentScope()==='annual'){
      routingStatus.classList.add('is-ok','is-annual');
      body.dataset.destinationItineraryId='';
      const identity=node('div','budget-routing-identity');
      const copy=node('span','budget-routing-copy');
      copy.append(
        node('strong','','ANNUAL BUDGET · AUD'),
        node('span','','This Miscellaneous expense comes directly out of the Annual Budget.'),
        node('small','','No Destination Budget or exchange rate is used.')
      );
      identity.append(createLineIcon('budget','budget-routing-scope-icon'),copy);
      routingStatus.append(identity);
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
      const handoff=sameDayHandoffCandidates(stateService.snapshot().itinerary || [], date);
      if(handoff.length===2){
        const selected=handoff.find(item=>item.id===body.dataset.destinationItineraryId) || null;
        routingStatus.classList.add(selected&&isDestinationBudgetUsable(selected)?'is-ok':'is-warning');
        routingStatus.append(
          node('strong','',selected ? `HANDOFF DAY · ${selected.name}` : `HANDOFF DAY · CHOOSE DESTINATION BUDGET`),
          node('span','',`Both stays meet on ${formatAUDate(date)}. Choose whether this cost belongs to the stay you are leaving or the stay you are arriving in.`)
        );
        const choices=node('div','budget-expense-scope-choices');
        choices.setAttribute('role','group');
        choices.setAttribute('aria-label',`Destination Budget for ${formatAUDate(date)}`);
        for(const candidate of handoff){
          const active=selected?.id===candidate.id;
          const button=node('button',`budget-expense-scope-choice scope-destination${active?' is-selected':''}`);
          button.type='button';
          button.setAttribute('aria-pressed',String(active));
          button.append(
            node('strong','',candidate.name),
            node('span','',displayCountryForStay(candidate) || 'Destination / Trip'),
            node('small','',`${formatAUDate(candidate.startDate)} – ${formatAUDate(candidate.endDate)} · ${candidate.localCurrency || 'Currency not set'}`)
          );
          if(active) button.append(createLineIcon('check','budget-selected-tick'));
          button.addEventListener('click',()=>{ body.dataset.destinationItineraryId=candidate.id; updateConversion(); });
          choices.append(button);
        }
        routingStatus.append(choices);
        if(!selected) return null;
        if(!isDestinationBudgetUsable(selected)){
          routingStatus.append(node('small','',`${selected.name} needs a complete Destination Budget before this handoff-day cost can be saved.`));
          return null;
        }
        routingStatus.append(budgetDateTicket(selected,{compact:true}));
        return selected;
      }
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', `DATE OVERLAP ON ${formatAUDate(date)}`), node('span', '', `${matches.length} itinerary stays genuinely overlap on this date. Fix the itinerary before saving.`));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    const stay = matches[0];
    if (!isDestinationBudgetUsable(stay)) {
      routingStatus.classList.add('is-warning');
      routingStatus.append(node('strong', '', 'DESTINATION BUDGET NEEDS SETUP'), node('span', '', `${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)} covers ${formatAUDate(date)}, but its AUD budget or fixed exchange rate is incomplete. The local currency comes automatically from the itinerary.`));
      body.dataset.destinationItineraryId = '';
      return null;
    }
    body.dataset.destinationItineraryId = stay.id;
    routingStatus.classList.add('is-ok');
    const identity=node('div','budget-routing-identity');
    const flag=node('span','budget-routing-flag',countryFlagEmoji(displayCountryForStay(stay)));
    flag.setAttribute('aria-hidden','true');
    const copy=node('span','budget-routing-copy');
    copy.append(
      node('strong', '', 'AUTOMATIC DESTINATION BUDGET'),
      node('span', '', [stay.name,displayCountryForStay(stay)].filter(Boolean).join(' · ')),
      node('small', '', `${stay.localCurrency} · ${fixedRateLabel(stay)}`)
    );
    identity.append(flag,copy);
    routingStatus.append(identity,budgetDateTicket(stay,{compact:true}));
    return stay;
  }

  function updateConversion() {
    const stay = renderRouting();
    const amountInput = fields.querySelector('[name="originalAmount"]');
    const currencyLabel = fields.querySelector('.budget-expense-locked-currency');
    const conversionHintBox = fields.querySelector('.budget-expense-auto-conversion');
    if (!amountInput) return;
    const annual=currentScope()==='annual';
    if (currencyLabel) {
      currencyLabel.replaceChildren();
      currencyLabel.append(node('span','budget-expense-locked-label','EXPENSE CURRENCY'));
      if(annual){
        currencyLabel.append(node('strong','','AUD'),node('small','','Annual Budget only'));
      }else if(stay?.localCurrency){
        currencyLabel.append(node('strong','',stay.localCurrency),node('small','',`${stay.name} Destination Budget`));
      }else{
        currencyLabel.append(node('strong','','—'),node('small','','Choose a date with a fully configured Destination Budget'));
      }
    }
    if(conversionHintBox){
      conversionHintBox.replaceChildren();
      const amount=Number(amountInput.value);
      const validAmount=Number.isFinite(amount)&&amount>=0;
      if(annual&&validAmount){
        conversionHintBox.append(
          node('span','budget-expense-auto-kicker','AUD AMOUNT'),
          node('strong','budget-expense-aud-equivalent',`AUD ${formatMoney(amount,'AUD')}`),
          node('small','','Annual Budget · stored directly in AUD.')
        );
      }else if(stay?.localCurrency&&Number(stay.fixedLocalPerAUD)>0&&validAmount){
        const converted=localToAUD(amount,stay.fixedLocalPerAUD);
        conversionHintBox.append(
          node('span','budget-expense-auto-kicker','AUD EQUIVALENT'),
          node('strong','budget-expense-aud-equivalent',`AUD ${formatMoney(converted,'AUD')}`),
          node('small','',`${formatMoney(amount,stay.localCurrency)} · ${stay.name} fixed rate · ${fixedRateLabel(stay)}`)
        );
      }else{
        conversionHintBox.append(
          node('span','budget-expense-auto-kicker','DESTINATION BUDGET CONTROLS THE CURRENCY'),
          node('strong','','Choose the expense date first'),
          node('small','','The date supplies the local currency and locked rate automatically.')
        );
      }
    }
  }

  function populate(saved) {
    error.textContent = '';
    body.dataset.category = saved.category || 'groceries';
    body.dataset.budgetScope = body.dataset.category === 'miscellaneous' && saved.budgetScope === 'annual' ? 'annual' : 'destination';
    body.dataset.destinationItineraryId = saved.itineraryId || '';
    setModalTone(modal, 'sky');
    renderCategories();

    const annualChoiceAllowed=body.dataset.category==='miscellaneous';
    const steps=[];
    let nextStep=2;
    if(annualChoiceAllowed){
      const scopeStep=node('section','budget-editor-step budget-editor-step-scope');
      const scopeHead=node('div','budget-editor-step-head');
      scopeHead.append(node('b','budget-editor-step-number',String(nextStep++)),node('div','budget-editor-step-copy'));
      scopeHead.querySelector('.budget-editor-step-copy').append(node('strong','','Which budget should pay for it?'));
      const choices=node('div','budget-expense-scope-choices');
      for(const scope of ['destination','annual']){
        const active=currentScope()===scope;
        const button=node('button',`budget-expense-scope-choice scope-${scope}${active?' is-selected':''}`);
        button.type='button';
        button.setAttribute('aria-pressed',String(active));
        if(scope==='destination'){
          button.append(node('strong','','Destination Budget'),node('span','','Enter the expense in the stay’s local currency.'),node('small','','Date selects the stay · fixed rate converts to AUD automatically'));
        }else{
          button.append(node('strong','','Annual Budget'),node('span','','Enter the expense directly in AUD.'),node('small','','No Destination Budget · no exchange-rate conversion'));
        }
        if(active)button.append(createLineIcon('check','budget-selected-tick'));
        button.addEventListener('click',()=>{
          const draft=capture();
          draft.budgetScope=scope;
          populate(draft);
        });
        choices.append(button);
      }
      scopeStep.append(scopeHead,choices);
      steps.push(scopeStep);
    }

    const dateStep = node('section', 'budget-editor-step budget-editor-step-date');
    const dateHead = node('div', 'budget-editor-step-head');
    dateHead.append(node('b', 'budget-editor-step-number', String(nextStep++)), node('div', 'budget-editor-step-copy'));
    dateHead.querySelector('.budget-editor-step-copy').append(node('strong', '', 'When did you spend it?'));
    const dateGrid = node('div', 'budget-editor-date-grid');
    dateGrid.append(inputField('Expense date', 'date', 'date', saved.date), routingStatus);
    dateStep.append(dateHead, dateGrid);
    steps.push(dateStep);

    const amountStep = node('section', 'budget-editor-step budget-editor-step-amount');
    const amountHead = node('div', 'budget-editor-step-head');
    amountHead.append(node('b', 'budget-editor-step-number', String(nextStep++)), node('div', 'budget-editor-step-copy'));
    amountHead.querySelector('.budget-editor-step-copy').append(node('strong', '', 'How much did you spend?'));
    const amountGrid = node('div', 'budget-editor-local-money-grid');
    const amountField=inputField(currentScope()==='annual' ? 'Amount (AUD)' : 'Amount in destination currency', 'originalAmount', 'number', saved.originalAmount);
    amountField.classList.add('budget-expense-amount-field');
    const lockedCurrency=node('div','budget-expense-locked-currency');
    const automaticConversion=node('div','budget-expense-auto-conversion');
    amountGrid.append(amountField,lockedCurrency,automaticConversion);
    amountStep.append(amountHead, amountGrid);
    steps.push(amountStep);

    const detailStep = node('section', 'budget-editor-step budget-editor-step-detail budget-editor-step-detail-simple');
    detailStep.append(inputField('Description (optional)', 'description', 'text', saved.description));
    steps.push(detailStep);

    fields.replaceChildren(...steps);
    fields.querySelector('[name="date"]')?.addEventListener('change', updateConversion);
    fields.querySelector('[name="originalAmount"]')?.addEventListener('input', updateConversion);
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
        stateService.commit(draft => saveExpenseDraft(draft, { expenseId:existing?.id || null, fields:formDraft }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) {
        error.textContent = err.message;
        renderRouting();
      }
    }}
  );

  const resolvedTone = 'sky';
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
  if (stay.localCurrency && stay.budgetLocal != null) total.append(node('small', '', `≈ AUD ${signedMoney(stay.budgetAUD, 'AUD')}`));
  card.append(total);
  const trio = node('div', 'budget-current-trio');
  const spent = node('div', 'budget-current-metric budget-current-spent');
  const spentPrimary=stay.localCurrency && stay.spentLocal != null ? signedMoney(stay.spentLocal, stay.localCurrency) : signedMoney(stay.spentAUD, 'AUD');
  const spentSecondary=stay.localCurrency && stay.spentLocal != null ? `AUD ${signedMoney(stay.spentAUD, 'AUD')} equivalent spent` : 'Actual dated spending';
  spent.append(node('span', '', 'ACTUAL SPENT TO DATE'), node('strong', '', spentPrimary), node('small', '', spentSecondary));
  const remaining = node('div', 'budget-current-metric budget-current-remaining');
  const remainingPrimary=stay.localCurrency && stay.remainingLocal != null ? signedMoney(stay.remainingLocal, stay.localCurrency) : signedMoney(stay.remainingAUD, 'AUD');
  const remainingParts=[];
  if(stay.localCurrency && stay.remainingLocal != null)remainingParts.push(`AUD ${signedMoney(stay.remainingAUD, 'AUD')} equivalent remaining`);
  if(stay.committedAUD)remainingParts.push(`AUD ${signedMoney(stay.committedAUD, 'AUD')} future commitments included`);
  if(!remainingParts.length)remainingParts.push('No future commitments');
  remaining.append(node('span', '', 'BUDGET REMAINING AFTER COMMITMENTS'), node('strong', '', remainingPrimary), node('small', '', remainingParts.join(' · ')));
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
  const projectedOverAUD=Math.max(0,-Number(pace.forecastVarianceAUD||0));
  const projectedOverRatio=stay.budgetAUD>0?projectedOverAUD/stay.budgetAUD:0;
  const paceTraffic=pace.forecastStatus==='needs-setup'?'amber':pace.forecastStatus==='under'?'green':projectedOverRatio>0.10?'red':'amber';
  const paceLabel=paceTraffic==='green'?'ON PACE':paceTraffic==='red'?'OVER PACE':pace.forecastStatus==='needs-setup'?'NEEDS SETUP':'WATCH';
  const ring=node('div',`budget-pace-ring budget-pace-ring-${paceTraffic}`); ring.style.setProperty('--pace-value',`${Math.max(0,Math.min(100,spendPercent))}%`); ring.setAttribute('role','progressbar'); ring.setAttribute('aria-label','Destination Budget spend pace'); ring.setAttribute('aria-valuemin','0'); ring.setAttribute('aria-valuemax','100'); ring.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,spendPercent)))); ring.setAttribute('aria-valuetext',pace.forecastStatus==='needs-setup'?'Destination Budget needs setup':`${spendPercent}% spent · ${pace.progress}% of stay elapsed · ${paceTraffic} pace status`); ring.append(node('strong','',paceLabel),node('span','',pace.forecastStatus==='needs-setup'?'Complete Destination Budget setup':`${spendPercent}% spend · ${pace.progress}% stay`));
  const side=node('div','budget-pace-side'); side.append(paceMetric('Stay elapsed',`${pace.progress}%`),paceMetric('Spend pace',`${spendPercent}%`));
  const top=node('div','budget-pace-top'); top.append(ring,side); card.append(top);
  const planned=destinationMoney(stay,pace.plannedDailyBudgetAUD), actual=destinationMoney(stay,pace.averageSpendPerDayAUD), projected=destinationMoney(stay,pace.forecastSpendAUD);
  const metrics=node('div','budget-pace-bottom'); metrics.append(
    paceMetric('Daily budget',planned.primary,'',planned.secondary),
    paceMetric('Actual daily',actual.primary,'',actual.secondary),
    paceMetric('Projected stay spend',projected.primary,'',projected.secondary)
  ); card.append(metrics);
  const remainingPerDayAUD=pace.remainingDays>0?Number(stay.remainingAUD||0)/pace.remainingDays:Number(stay.remainingAUD||0);
  const remainingPerDay=destinationMoney(stay,remainingPerDayAUD);
  const buffer=destinationMoney(stay,Math.abs(Number(pace.forecastVarianceAUD||0)));
  const useful=node('div','budget-pace-useful'); useful.append(
    paceMetric('Available / remaining day',remainingPerDay.primary,Number(stay.remainingAUD||0)>=0?'is-set':'is-missing',remainingPerDay.secondary),
    paceMetric(Number(pace.forecastVarianceAUD||0)>=0?'Projected buffer':'Projected overspend',buffer.primary,paceTraffic==='green'?'is-set':'is-missing',buffer.secondary)
  ); card.append(useful);
  const paceNote=pace.forecastStatus==='needs-setup'?'Set the Destination Budget AUD amount and fixed exchange rate before stay pace is assessed.':pace.forecastStatus==='under'?`Projected under budget by AUD ${signedMoney(Math.abs(pace.forecastVarianceAUD),'AUD')}`:`Projected over budget by AUD ${signedMoney(Math.abs(pace.forecastVarianceAUD),'AUD')}`;
  const note=node('p',`budget-pace-note budget-pace-${pace.forecastStatus}`,paceNote); card.append(note);
  return card;
}


function budgetExpandedMetric(label, primary, secondary = '', tone = '') {
  const card=node('div',`budget-expanded-metric${tone?` is-${tone}`:''}`);
  card.append(node('span','',label),node('strong','',primary));
  if(secondary)card.append(node('small','',secondary));
  return card;
}

function budgetExpandedProgress(label, value, tone = 'teal') {
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  const wrap=node('div','budget-expanded-progress');
  const head=node('div','budget-expanded-progress-head');head.append(node('span','',label),node('strong','',`${Math.round(safe)}%`));
  const track=node('span','budget-expanded-progress-track');const fill=node('span',`budget-expanded-progress-fill tone-${tone}`);fill.style.width=`${safe}%`;track.append(fill);wrap.append(head,track);return wrap;
}

function renderDestinationSummaryExpanded(model) {
  const body=node('div','budget-expanded-dashboard budget-destination-expanded');
  const stay=model.currentDestination;
  if(!stay){body.append(node('p','budget-expanded-empty','No current destination. Add or update the itinerary first.'));return body;}
  const total=destinationMoney(stay,stay.budgetAUD),spent=destinationMoney(stay,stay.spentAUD),committed=destinationMoney(stay,stay.committedAUD),remaining=destinationMoney(stay,stay.remainingAUD),daily=destinationMoney(stay,stay.pace?.plannedDailyBudgetAUD||0);
  const stats=node('div','budget-expanded-grid budget-expanded-grid-six');
  stats.append(
    budgetExpandedMetric('TOTAL BUDGET',total.primary,total.secondary,'teal'),
    budgetExpandedMetric('SPENT TO DATE',spent.primary,spent.secondary,'red'),
    budgetExpandedMetric('FUTURE COMMITTED',committed.primary,committed.secondary,'violet'),
    budgetExpandedMetric('AFTER COMMITMENTS',remaining.primary,remaining.secondary,'green'),
    budgetExpandedMetric('DAILY ALLOWANCE',daily.primary,daily.secondary,'blue'),
    budgetExpandedMetric('FIXED RATE',fixedRateLabel(stay),`${stay.dates} · locked to this stay`,'gold')
  );
  body.append(stats);
  const used=stay.budgetAUD>0?((stay.spentAUD+stay.committedAUD)/stay.budgetAUD)*100:0;
  const progress=stay.pace?.progress||0;
  const expected=stay.budgetAUD*(progress/100);
  const delta=expected-(stay.spentAUD+stay.committedAUD);
  const pace=node('section','budget-expanded-section');pace.append(node('h3','','DESTINATION BUDGET PACE'),budgetExpandedProgress('Budget used after commitments',used,delta>=0?'green':'red'),budgetExpandedProgress('Stay elapsed',progress,'violet'));
  pace.append(node('p',`budget-expanded-callout ${delta>=0?'is-good':'is-bad'}`,`${destinationMoney(stay,Math.abs(delta)).primary} ${delta>=0?'under':'over'} planned pace · ${stay.dates}.`));
  body.append(pace);
  const routing=node('section','budget-expanded-section');routing.append(node('h3','','DATE-BASED ROUTING'),node('p','budget-expanded-callout','Destination-scoped living expenses and any reservation deliberately allocated to this stay use this Destination Budget. Those costs still roll into the annual travel total; Annual-only bookings do not use the stay budget. Destination-scoped costs on uncovered or ambiguous dates are blocked rather than silently routed elsewhere.'));body.append(routing);
  return body;
}

function renderPaceSummaryExpanded(model) {
  const body=node('div','budget-expanded-dashboard budget-pace-expanded');
  const stay=model.currentDestination,pace=stay?.pace;
  if(!stay||!pace){body.append(node('p','budget-expanded-empty','No active stay pace available.'));return body;}
  const planned=destinationMoney(stay,pace.plannedDailyBudgetAUD),actual=destinationMoney(stay,pace.averageSpendPerDayAUD),dailyVariance=destinationMoney(stay,Math.abs(pace.plannedDailyBudgetAUD-pace.averageSpendPerDayAUD)),projected=destinationMoney(stay,pace.forecastSpendAUD),forecastVariance=destinationMoney(stay,Math.abs(pace.forecastVarianceAUD));
  const healthyDaily=pace.averageSpendPerDayAUD<=pace.plannedDailyBudgetAUD;
  const healthyForecast=pace.forecastVarianceAUD>=0;
  const stats=node('div','budget-expanded-grid budget-expanded-grid-six');
  stats.append(
    budgetExpandedMetric('PLANNED DAILY',planned.primary,planned.secondary,'blue'),
    budgetExpandedMetric('ACTUAL DAILY',actual.primary,actual.secondary,healthyDaily?'green':'red'),
    budgetExpandedMetric('DAILY VARIANCE',dailyVariance.primary,`${dailyVariance.secondary}${dailyVariance.secondary?' · ':''}${healthyDaily?'under allowance':'over allowance'}`,healthyDaily?'green':'red'),
    budgetExpandedMetric('PROJECTED STAY SPEND',projected.primary,projected.secondary,'violet'),
    budgetExpandedMetric('PROJECTED VARIANCE',forecastVariance.primary,`${forecastVariance.secondary}${forecastVariance.secondary?' · ':''}${healthyForecast?'under budget':'over budget'}`,healthyForecast?'green':'red'),
    budgetExpandedMetric('DAYS REMAINING',String(pace.remainingDays),`${formatAUDate(stay.endDate)} segment end`,'teal')
  );
  body.append(stats);
  const used=stay.budgetAUD>0?(stay.spentAUD/stay.budgetAUD)*100:0;
  const section=node('section','budget-expanded-section');section.append(node('h3','','DAILY & STAY PACE'),budgetExpandedProgress('Actual spend used',used,healthyForecast?'green':'red'),budgetExpandedProgress('Stay elapsed',pace.progress,'violet'));
  const status=pace.forecastStatus==='needs-setup'?'Complete the Destination Budget setup before pace is assessed.':`${forecastVariance.primary} projected ${healthyForecast?'under':'over'} budget at the current daily spend rate.`;
  section.append(node('p',`budget-expanded-callout ${pace.forecastStatus==='over'?'is-bad':pace.forecastStatus==='under'?'is-good':''}`,status));body.append(section);return body;
}

function renderAnnualSummaryExpanded(model, {state=null,stateService=null,host=null} = {}) {
  const body=node('div','budget-annual-manager');
  const snapshot=state || stateService?.snapshot?.() || null;
  const currentYear=Number(model.annual?.year || new Date().getFullYear());
  const configuredYears=Object.keys(snapshot?.settings?.annualBudgetsAUD || {}).map(Number).filter(Number.isFinite);
  const lastYear=Math.max(currentYear + 5, ...configuredYears.filter(year=>year>=currentYear));
  const years=[currentYear - 1];
  for(let year=currentYear; year<=lastYear; year+=1) years.push(year);

  const intro=node('div','budget-annual-manager-intro');
  intro.append(
    node('p','budget-card-kicker','ANNUAL BUDGETS'),
    node('h2','budget-annual-manager-title','Budget by Calendar Year'),
    node('p','budget-annual-manager-copy','Set the annual spending limit for each calendar year. Destination budgets, spending graphs and travel pace are managed elsewhere.')
  );
  body.append(intro);

  const list=node('div','budget-annual-manager-list');
  for(const year of years){
    const amount=annualBudgetForYear(snapshot?.settings || {},year);
    const row=node('div',`budget-annual-manager-row${year===currentYear?' is-current':year<currentYear?' is-history':' is-future'}`);
    const yearCopy=node('div','budget-annual-manager-year');
    yearCopy.append(
      node('small','',year===currentYear?'CURRENT YEAR':year<currentYear?'PREVIOUS YEAR':'FUTURE YEAR'),
      node('strong','',String(year))
    );
    const value=node('div','budget-annual-manager-value');
    value.append(
      node('strong','',amount>0?signedMoney(amount,'AUD'):'Not set'),
      node('small','',amount>0?'AUD annual budget':'No annual budget set')
    );
    row.append(yearCopy,value);
    if(stateService&&host&&year>=currentYear){
      const edit=node('button','button budget-annual-manager-edit',amount>0?'Edit':'Set');
      edit.type='button';
      edit.addEventListener('click',()=>{
        edit.closest('dialog')?.close();
        queueMicrotask(()=>openAnnualBudgetEditor({stateService,host,budgetYear:year}));
      });
      row.append(edit);
    }
    list.append(row);
  }
  body.append(list);
  return body;
}

function openAnnualBudgetEditor({stateService,host,budgetYear}) {
  const state=stateService.snapshot();
  const year=Number(budgetYear || new Date().getFullYear());
  const body=node('div','budget-annual-editor');
  const field=node('label','budget-field budget-field-wide');field.append(node('span','',`Annual Budget ${year} · AUD`));
  const input=document.createElement('input');input.type='number';input.min='0';input.step='100';input.inputMode='decimal';input.value=String(annualBudgetForYear(state.settings,year));field.append(input);
  const help=node('p','budget-editor-help',`${year} is a calendar-year Annual Budget. The first travel year may be partial from Journey Start to 31 December; Destination Budgets remain separate dated stay budgets.`);
  const error=node('p','budget-form-error');body.append(field,help,error);
  const modal=createModal({title:'Edit Annual Budget',body,className:'tcc-editor-modal tone-gold',actions:[
    {label:'Cancel',onClick:d=>d.close()},
    {label:'Save',onClick:d=>{try{stateService.commit(draft=>saveGeneralSettingsDraft(draft,{journeyStartDate:draft.settings.journeyStartDate,defaultCurrency:draft.settings.defaultCurrency,annualBudgetAUD:input.value,annualBudgetYear:year}));if(d.isConnected&&d.open)d.close();}catch(err){error.textContent=err.message;}}}
  ]});
  host.append(modal);modal.addEventListener('close',()=>modal.remove(),{once:true});modal.showModal();
}

function renderAnnualSummary(model, state) {
  const card=node('section','budget-summary-card budget-annual-card budget-annual-planning-card');
  const currentYear=Number(model.annual?.year || new Date().getFullYear());
  const currentBudget=annualBudgetForYear(state.settings,currentYear);
  card.append(
    node('p','budget-card-kicker','ANNUAL BUDGET'),
    node('h2','budget-card-title',`${currentYear} Annual Budget`)
  );
  const amount=node('div','budget-annual-main-value');
  amount.append(
    node('small','',`CURRENT CALENDAR YEAR · ${currentYear}`),
    node('strong','',currentBudget>0?signedMoney(currentBudget,'AUD'):'NOT SET'),
    node('span','',currentBudget>0?'AUD':'Tap to set annual budgets by year')
  );
  card.append(amount,node('p','budget-annual-main-note','Tap this widget to view annual budgets by year and set future years.'));
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
  return canonicalCountrySlug(value);
}

function destinationOccurrenceKey(entry) {
  // Repeat labels are presentation metadata only, but they must follow the same
  // route-trip identity rule as the rest of Budget: RV/Cruise uses Starting
  // Country rather than the deliberately cleared legacy Standard country.
  return `${destinationOccurrenceCountryKey(displayCountryForStay(entry))}|${String(entry?.name||'').normalize('NFC').trim().toLocaleLowerCase('en-AU')}`;
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
    ...(state.reservations||[]).filter(record=>(record.budgetScope||(record.type==='ticket'?'destination':'annual'))==='destination'&&record.itineraryId===itineraryId&&record.status!=='to-book'&&!record.needsBudgetRepair)
  ].reduce((sum,record)=>sum+Number(record.audAmount||0),0);
}

function destinationHasRateLockingCosts(state,itineraryId){
  const hasDestinationExpense=(state.expenses||[]).some(record=>record.budgetScope!=='annual'&&record.itineraryId===itineraryId&&!record.needsBudgetRepair);
  const hasDestinationReservation=(state.reservations||[]).some(record=>(record.budgetScope||(record.type==='ticket'?'destination':'annual'))==='destination'&&record.itineraryId===itineraryId&&!record.needsBudgetRepair);
  return hasDestinationExpense||hasDestinationReservation;
}

function openDestinationBudgetEditor({stateService,host,itineraryId,reopenManager,editorTone=null}){
  const state=stateService.snapshot();
  const entry=(state.itinerary||[]).find(item=>item.id===itineraryId);
  if(!entry)return;
  const spent=destinationAllocatedSpend(state,itineraryId);
  const current=Number(entry.destinationBudgetAUD||0);
  const body=node('div','budget-destination-editor');
  const intro=node('div','budget-destination-editor-intro');
  intro.append(node('strong','',entry.name),node('span','',[displayCountryForStay(entry),budgetDateRangeText(entry)].filter(Boolean).join(' · ')),budgetDateTicket(entry));
  body.append(intro);
  const snapshot=node('div','budget-destination-editor-snapshot');
  const currentMoney=destinationMoney(entry,current), spentMoney=destinationMoney(entry,spent), remainingMoney=destinationMoney(entry,current-spent);
  snapshot.append(
    paceMetric('Destination budget total',currentMoney.primary,current>0?'is-set':'is-missing',currentMoney.secondary?`${currentMoney.secondary} equivalent`:''),
    paceMetric('Dated costs allocated to this stay',spentMoney.primary,'',spentMoney.secondary?`${spentMoney.secondary} equivalent`:''),
    paceMetric('Budget remaining after dated costs',remainingMoney.primary,current-spent>=0?'is-set':'is-missing',remainingMoney.secondary?`${remainingMoney.secondary} equivalent`:'')
  );
  body.append(snapshot);
  const dates=node('section','budget-destination-editor-dates');
  dates.append(
    node('div','budget-destination-editor-dates-head','STAY DATES · FROM ITINERARY'),
    budgetDateTicket(entry),
    node('p','budget-destination-editor-date-note','Dates are set once in Itinerary and are read-only here. Destination Budgets only asks Kym for the AUD budget and the fixed exchange rate.')
  );
  body.append(dates);
  const localCurrency=String(entry.localCurrency||'').trim().toUpperCase();
  const setupIntro=node('section','budget-destination-conversion-intro');
  setupIntro.append(
    node('span','budget-destination-conversion-kicker','SET THIS STAY UP ONCE'),
    node('strong','',localCurrency ? `${entry.name || 'This destination'} uses ${localCurrency}. Enter only the AUD budget and the exchange rate.` : 'Destination currency is missing from the itinerary.'),
    node('p','',localCurrency
      ? `The itinerary supplies ${localCurrency} automatically, so Kym cannot accidentally choose the wrong currency. Travel Command Centre converts the AUD budget into ${localCurrency} and locks that rate to these dates.`
      : 'Return to Itinerary and re-save this stay after its country is corrected. Currency is assigned automatically from the destination and is never chosen manually in Destination Budgets.')
  );
  body.append(setupIntro);
  const field=inputField('Budget for this stay (AUD)','destinationBudgetAUD','number',current||'');
  field.classList.add('budget-destination-editor-field'); body.append(field);
  const currencyReadout=node('section','budget-destination-currency-readout');
  currencyReadout.append(
    node('span','budget-destination-currency-readout-label','LOCAL CURRENCY · FROM ITINERARY'),
    node('strong','',localCurrency||'Not available'),
    node('small','',localCurrency ? `${entry.name} · no currency selection required` : 'Correct the itinerary country before setting this Destination Budget')
  );
  body.append(currencyReadout);
  const rateField=inputField(`Exchange Rate · ${localCurrency || 'local currency'} for 1 AUD`,'destinationFixedLocalPerAUD','number',entry.fixedLocalPerAUD??'');
  rateField.classList.add('budget-destination-editor-rate-field');
  const lockedCurrency=destinationHasRateLockingCosts(state,itineraryId);
  const rateInput=rateField.querySelector('input');
  if(rateInput){rateInput.step='0.0001';rateInput.min='0';rateInput.inputMode='decimal';rateInput.placeholder=localCurrency==='AUD'?'1': 'e.g. 0.60';}
  if(localCurrency==='AUD'&&rateInput) rateInput.value='1';
  if(lockedCurrency&&rateInput) rateInput.disabled=true;
  body.append(rateField);
  const conversionPreview=node('section','budget-destination-conversion-preview');
  body.append(conversionPreview);
  const updateBudgetConversionPreview=()=>{
    conversionPreview.replaceChildren();
    const amountValue=Number(body.querySelector('[name="destinationBudgetAUD"]')?.value||0);
    let rate=Number(body.querySelector('[name="destinationFixedLocalPerAUD"]')?.value||0);
    if(localCurrency==='AUD'){
      rate=1;
      if(rateInput&&!rateInput.disabled)rateInput.value='1';
    }
    const validAmount=Number.isFinite(amountValue)&&amountValue>0;
    const validCurrency=/^[A-Z]{3}$/.test(localCurrency)&&localCurrency!=='XXX';
    const validRate=Number.isFinite(rate)&&rate>0;
    conversionPreview.append(node('div','budget-destination-conversion-preview-head','CONVERSION PREVIEW'));
    if(!(validAmount&&validCurrency&&validRate)){
      const message=!validCurrency
        ? 'The itinerary must supply a valid local currency before this Destination Budget can be created.'
        : `Enter the AUD budget and the ${localCurrency} exchange rate. The converted local budget will appear here before you save.`;
      conversionPreview.append(node('p','budget-destination-conversion-empty',message));
      return;
    }
    const localAmount=audToLocal(amountValue,rate);
    const reverse=1/rate;
    const grid=node('div','budget-destination-conversion-grid');
    grid.append(
      paceMetric('AUD BUDGET',signedMoney(amountValue,'AUD'),'is-set','What you are allowing for this stay'),
      paceMetric('LOCKED EXCHANGE RATE',`1 AUD = ${rate.toLocaleString('en-AU',{maximumFractionDigits:4})} ${localCurrency}`,'is-set',`1 ${localCurrency} = AUD ${signedMoney(reverse,'AUD')}`),
      paceMetric('LOCAL BUDGET CREATED',signedMoney(localAmount,localCurrency),'is-set','This is the amount Kym will see and spend against')
    );
    conversionPreview.append(grid,node('p','budget-destination-conversion-lock-note',`Once saved, expenses dated to this stay are entered in ${localCurrency}. Their AUD equivalent is calculated automatically using this locked rate—there is no currency choice or exchange-rate entry in Add Expense.`));
  };
  field.querySelector('input')?.addEventListener('input',updateBudgetConversionPreview);
  rateInput?.addEventListener('input',updateBudgetConversionPreview);
  updateBudgetConversionPreview();
  body.append(node('p','budget-destination-editor-help',lockedCurrency
    ? `The ${localCurrency||'local'} exchange rate is locked because this stay already has Destination Budget costs (living expenses and/or destination-allocated reservations). Annual-only bookings do not lock this rate.`
    : `The itinerary supplies ${localCurrency||'the local currency'} automatically. Set only the AUD budget and exchange rate here; Destination Budgets is the only place where that conversion is established.`)); 
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
          const fixedValue=body.querySelector('[name="destinationFixedLocalPerAUD"]')?.value??entry.fixedLocalPerAUD??'';
          const fixedLocalPerAUD=fixedValue===''?null:Number(fixedValue);
          stateService.commit(draft=>setDestinationBudgetDraft(draft,itineraryId,amount,{now:stateService.now,fixedLocalPerAUD}));
          if(d.isConnected&&d.open)d.close();else queueReopen();
        }catch(err){error.textContent=err.message;}
      }}
    ],className:'tcc-editor-modal tcc-budget-destination-editor-modal tone-sky'
  });
  host.append(dialog); dialog.showModal();
  dialog.addEventListener('close',()=>{dialog.remove(); queueReopen();},{once:true});
}

function openDestinationBudgetsManager({stateService,host,currentDate,initialFilter='all'}) {
  const state=stateService.snapshot(); const status=destinationBudgetStatus(state); const model=buildBudgetViewModel(state,currentDate);
  const occurrenceMeta=destinationOccurrenceMeta(status.entries);
  const body=node('div','budget-destination-manager');
  // First use must be obvious rather than showing a meaningless filter bar
  // over an empty manager. Destination Budgets are created only from exact
  // dated itinerary occurrences, so route the user to Itinerary first.
  if(!status.entries.length){
    const firstUse=node('section','budget-destination-first-use');
    const icon=node('span','budget-destination-first-use-icon'); icon.append(createLineIcon('pin'));
    const copy=node('div','budget-destination-first-use-copy');
    copy.append(
      node('p','eyebrow','DESTINATION BUDGETS'),
      node('h2','','Add your itinerary first'),
      node('p','','Each Destination Budget belongs to one exact dated stay or trip. Add the stay in Itinerary, then return here to set its AUD budget and fixed local exchange rate.')
    );
    const openItinerary=node('button','button budget-destination-open-itinerary','OPEN ITINERARY'); openItinerary.type='button';
    firstUse.append(icon,copy,openItinerary); body.append(firstUse);
    const dialog=createModal({title:'Destination Budgets',body,actions:[{label:'Close',onClick:d=>d.close()}],className:'tcc-expanded-modal tcc-expanded-inherits-source tone-violet budget-destination-manager-modal budget-destination-first-use-modal'});
    openItinerary.addEventListener('click',()=>{
      if(dialog.open)dialog.close();
      queueMicrotask(()=>stateService.commit(draft=>{draft.ui.activeScreen='itinerary';}));
    });
    host.append(dialog); dialog.showModal(); dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    return;
  }
  if(model.currentDestination){
    const currentEntry=status.entries.find(item=>item.id===model.currentDestination.id) || model.currentDestination;
    const current=node('section','budget-destination-manager-current');
    const remaining=destinationMoney(model.currentDestination,model.currentDestination.remainingAUD);
    const currentCopy=node('div','budget-destination-manager-current-copy');
    currentCopy.append(node('span','budget-destination-manager-current-label','CURRENT DESTINATION'),node('strong','',model.currentDestination.name));
    const currentMoney=node('div','budget-destination-manager-current-money');
    currentMoney.append(node('span','budget-destination-manager-money-label',remaining.secondary?'LOCAL BUDGET REMAINING':'BUDGET REMAINING'),node('b','budget-destination-manager-money-primary',remaining.primary));
    if(remaining.secondary)currentMoney.append(node('span','budget-destination-manager-money-secondary',`${remaining.secondary} remaining`));
    currentCopy.append(currentMoney);
    current.append(currentCopy,budgetDateTicket(currentEntry,{compact:true}));
    body.append(current);
  }
  const summary=node('div','budget-destination-manager-summary');
  summary.append(
    paceMetric('Total itinerary stays',String(status.entries.length)),
    paceMetric('Stays with a budget',String(status.set.length),'is-set'),
    paceMetric('Stays needing a budget',String(status.missing.length),status.missing.length?'is-missing':'is-set'),
    paceMetric('Itinerary budget coverage',`${status.coverage}%`,status.coverage===100?'is-set':'')
  ); body.append(summary);
  const coverage=node('div','budget-destination-coverage'); coverage.setAttribute('role','progressbar'); coverage.setAttribute('aria-label','Destination Budget setup coverage'); coverage.setAttribute('aria-valuemin','0'); coverage.setAttribute('aria-valuemax','100'); coverage.setAttribute('aria-valuenow',String(status.coverage)); coverage.setAttribute('aria-valuetext',`${status.set.length} of ${status.entries.length} itinerary stays have a complete Destination Budget · ${status.coverage}%`);
  const fill=node('span','budget-destination-coverage-fill'); fill.style.width=`${status.coverage}%`; coverage.append(fill); body.append(coverage);
  body.append(node('p','budget-destination-manager-guidance','Dates are deliberately prominent. Match the exact dated stay before setting a budget or checking automatic date routing—especially where the same city appears more than once.'));

  let activeFilter=['all','missing','set'].includes(initialFilter)?initialFilter:'all';
  const filters=node('div','budget-destination-manager-filters'); filters.setAttribute('role','group'); filters.setAttribute('aria-label','Filter Destination Budgets');
  const list=node('div','budget-destination-manager-list');
  const filterDefs=[['all',`All stays (${status.entries.length})`],['missing',`Need budget (${status.missing.length})`],['set',`Locked in (${status.set.length})`]];

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
      copy.append(labels,node('strong','',entry.name),node('small','budget-destination-country',displayCountryForStay(entry)||'Destination / Trip'));
      const value=node('span','budget-destination-manager-value');
      const incompleteAmount=Number(entry.destinationBudgetAUD)>0;
      if(hasBudget){
        const budgetMoney=destinationMoney(entry,entry.destinationBudgetAUD);
        value.append(node('strong','budget-destination-manager-state','LOCKED IN BUDGET'),node('b','budget-destination-manager-amount-primary',budgetMoney.primary));
        if(budgetMoney.secondary)value.append(node('small','budget-destination-manager-amount-secondary',`${budgetMoney.secondary} equivalent`));
        value.append(node('small','budget-destination-manager-action','TAP TO EDIT'));
      }else if(incompleteAmount){
        value.append(node('strong','budget-destination-manager-state','SETUP INCOMPLETE'),node('b','budget-destination-manager-amount-primary',signedMoney(entry.destinationBudgetAUD,'AUD')),node('small','budget-destination-manager-action','ADD EXCHANGE RATE'));
      }else{
        value.append(node('strong','budget-destination-manager-state','NO BUDGET SET'),node('small','budget-destination-manager-action','TAP TO SET BUDGET'));
      }
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
  const dialog=createModal({title:'Destination Budgets',body,actions:[{label:'Close',onClick:d=>d.close()}],className:'tcc-expanded-modal tcc-expanded-inherits-source tone-violet budget-destination-manager-modal'}); host.append(dialog); dialog.showModal(); dialog.addEventListener('close',()=>dialog.remove(),{once:true});
}

function renderDestinationBudgets(model,state,{stateService,host,currentDate}){
  const status=destinationBudgetStatus(state); const card=node('button','budget-summary-card budget-destination-budgets-card'); card.type='button'; card.dataset.expandable='true'; card.dataset.expandTone='violet';
  card.append(node('p','budget-card-kicker','ITINERARY BUDGET COVERAGE'),node('h2','budget-card-title','Destination Budgets'));
  if(model.currentDestination){
    const current=node('div','budget-destination-current-strip');
    const remaining=destinationMoney(model.currentDestination,model.currentDestination.remainingAUD);
    current.append(node('span','','CURRENT DESTINATION'),node('strong','',model.currentDestination.name),node('b','',remaining.primary));
    current.append(node('em','budget-destination-current-dates',budgetDateRangeText(model.currentDestination)));
    if(remaining.secondary)current.append(node('small','',`${remaining.secondary} remaining`)); else current.append(node('small','','budget remaining'));
    card.append(current);
  }
  const metrics=node('div','budget-destination-readiness-metrics budget-destination-readiness-metrics-four');
  metrics.append(
    paceMetric('Total itinerary stays',String(status.entries.length)),
    paceMetric('Stays with a budget',String(status.set.length),'is-set'),
    paceMetric('Stays needing a budget',String(status.missing.length),status.missing.length?'is-missing':'is-set'),
    paceMetric('Itinerary budget coverage',`${status.coverage}%`,status.coverage===100?'is-set':'')
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

function renderLivingExpenses(model) {
  const panel = node('section', 'budget-panel budget-living-panel');
  const head = node('div', 'budget-section-head');
  const heading = node('div');
  heading.append(node('h2', '', 'Living Expenses'), node('p', 'budget-section-subtitle', 'Tap to enlarge, review and add expenses.'));
  head.append(heading);
  panel.append(head);
  const grid = node('div', 'budget-category-grid');
  for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
    // Main Budget is a clean summary surface. Creation/editing lives in the
    // enlarged Living Expenses manager so Kym never has to target small Add
    // controls while scrolling the overview.
    const summary = node('article', `budget-category-summary budget-category-${category}`);
    summary.append(node('span', '', label));
    const localAmount = model.categories.destinationLocal?.[category];
    if (model.currentDestination?.localCurrency && localAmount != null) {
      summary.append(node('strong', '', signedMoney(localAmount, model.currentDestination.localCurrency)), node('small', '', `AUD ${signedMoney(model.categories.destination[category], 'AUD')} equivalent`));
    } else {
      summary.append(node('strong', '', signedMoney(model.categories.destination[category], 'AUD')));
    }
    grid.append(summary);
  }
  panel.append(grid);
  return panel;
}

function livingExpensesExpandedBody(model, state, currentDate, openNewExpense, openExistingExpense) {
  const body=node('div','budget-living-expanded');
  const currentId=model.currentDestination?.id || null;
  const trusted=(state.expenses||[]).filter(record=>{
    if(record.needsBudgetRepair)return false;
    const scope=record.budgetScope==='annual'?'annual':'destination';
    if(scope==='annual')return true;
    return Boolean(currentId&&record.itineraryId===currentId);
  });
  const intro=node('section','budget-living-expanded-intro');
  const destinationLabel=model.currentDestination?.name || 'No current destination';
  intro.append(
    node('p','eyebrow','LIVING EXPENSES'),
    node('h3','',destinationLabel),
    node('p','',currentId
      ? 'Review the current stay by category. Add or edit expenses here; the main Budget screen stays summary-only. Miscellaneous can be sent directly to the Annual Budget in AUD.'
      : 'There is no current stay today. You can still add a past or future expense: choose its transaction date and the app will select the exact Destination Budget automatically. Miscellaneous can also be sent directly to the Annual Budget in AUD.')
  );
  body.append(intro);
  const grid=node('div','budget-living-expanded-grid');
  for(const [category,label] of Object.entries(CATEGORY_LABELS)){
    const records=trusted.filter(record=>record.category===category).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const annualRecords=records.filter(record=>record.budgetScope==='annual');
    const destinationRecords=records.filter(record=>record.budgetScope!=='annual');
    const card=node('section',`budget-living-manager-card budget-category-${category}`);
    const head=node('div','budget-living-manager-head');
    const copy=node('div');
    copy.append(node('span','',label.toUpperCase()));
    const localAmount=model.categories.destinationLocal?.[category];
    if(model.currentDestination?.localCurrency && localAmount!=null){
      const secondary=[`AUD ${signedMoney(model.categories.destination[category],'AUD')} equivalent`,`${destinationRecords.length} destination ${destinationRecords.length===1?'entry':'entries'}`];
      if(category==='miscellaneous'&&annualRecords.length)secondary.push(`${annualRecords.length} Annual Budget ${annualRecords.length===1?'item':'items'} in AUD`);
      copy.append(node('strong','',signedMoney(localAmount,model.currentDestination.localCurrency)),node('small','',secondary.join(' · ')));
    }else{
      const secondary=[`${destinationRecords.length} destination ${destinationRecords.length===1?'entry':'entries'}`];
      if(category==='miscellaneous'&&annualRecords.length)secondary.push(`${annualRecords.length} Annual Budget ${annualRecords.length===1?'item':'items'} in AUD`);
      copy.append(node('strong','',signedMoney(model.categories.destination[category],'AUD')),node('small','',secondary.join(' · ')));
    }
    const add=node('button','button budget-living-manager-add',`Add ${label}`);add.type='button';
    // Expense routing is date-owned, not current-stay-owned. Backdated and future
    // living expenses must remain addable even while today falls in an itinerary
    // gap; the editor itself blocks Save until the entered date resolves to one
    // fully configured Destination Budget.
    add.addEventListener('click',()=>{const dialog=add.closest('dialog');if(dialog?.open)dialog.close();queueMicrotask(()=>openNewExpense(category,CATEGORY_TONES[category]||'sky'));});
    head.append(copy,add);card.append(head);
    const list=node('div','budget-living-manager-list');
    if(!records.length)list.append(node('p','budget-muted','No entries yet'));
    for(const expense of records.slice(0,6)){
      const annual=expense.budgetScope==='annual';
      const row=node('button',`budget-living-manager-row${annual?' is-annual':''}`);row.type='button';
      const rowCopy=node('span');
      const context=annual?'Annual Budget · AUD':'Destination Budget';
      rowCopy.append(
        node('strong','',expense.description||label),
        node('small','',`${expense.date?formatAUDate(expense.date):'Date required'}${String(expense.date||'')>String(currentDate||'').slice(0,10)?' · Future':''} · ${context}`)
      );
      const amount=node('span','budget-row-amounts');
      amount.append(node('strong','',signedMoney(expense.originalAmount,expense.originalCurrency)));
      if(!annual&&(expense.originalCurrency!=='AUD'||Number(expense.originalAmount)!==Number(expense.audAmount)))amount.append(node('small','',`AUD ${signedMoney(expense.audAmount,'AUD')}`));
      row.append(rowCopy,amount);
      row.addEventListener('click',()=>{const dialog=row.closest('dialog');if(dialog?.open)dialog.close();queueMicrotask(()=>openExistingExpense(expense.id,CATEGORY_TONES[category]||'sky'));});
      list.append(row);
    }
    if(records.length>6)list.append(node('p','budget-living-manager-more',`${records.length-6} more ${label.toLowerCase()} ${records.length-6===1?'entry':'entries'} · use Recent Expense Entries to review the full history.`));
    card.append(list);grid.append(card);
  }
  body.append(grid);return body;
}

function renderReservations(model, host, navigate) {
  const panel = node('section', 'budget-panel budget-reservations-panel');
  const head = node('div', 'budget-section-head');
  const reservationHeadMeta = node('div', 'budget-head-meta');
  reservationHeadMeta.append(node('strong', '', `AUD ${signedMoney(model.currentDestination?.linkedReservationTotalAUD || 0, 'AUD')}`), node('span', 'budget-count', String(model.reservations.length)));
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
    const allocationLabel = record.budgetScope === 'destination' ? 'Destination Budget' : 'Annual Budget';
    copy.append(node('strong', '', record.title), node('small', '', `${typeLabel} · ${statusLabel} · ${allocationLabel}`));
    const amounts = node('div', 'budget-row-amounts');
    amounts.append(node('strong', '', signedMoney(record.originalAmount, record.originalCurrency)));
    if (record.originalCurrency !== 'AUD' || Number(record.originalAmount) !== Number(record.audAmount)) amounts.append(node('small', '', `AUD ${signedMoney(record.audAmount, 'AUD')}`));
    row.append(copy, amounts);
    row.setAttribute('aria-label', ['View reservation', record.title, formatAUDate(toISODate(record.dateTime)), typeLabel, statusLabel].join(' · '));
    row.addEventListener('click', () => {
      const body=node('section','budget-reservation-detail');
      const facts=node('div','budget-reservation-detail-facts');
      const fact=(label,value)=>{const item=node('div','budget-reservation-detail-fact');item.append(node('small','',label),node('strong','',value||'—'));return item;};
      facts.append(
        fact('Reservation',record.title),
        fact('Type',typeLabel),
        fact('Status',statusLabel),
        fact('Date',formatAUDate(toISODate(record.dateTime))),
        fact('Original amount',signedMoney(record.originalAmount,record.originalCurrency)),
        fact('AUD',signedMoney(record.audAmount,'AUD')),
        fact('Budget allocation',allocationLabel)
      );
      body.append(facts,node('p','budget-reservation-detail-note','This Budget view is read-only. Open the booking in Reservations if you need to edit it.'));
      const actions=[];
      if(typeof navigate==='function')actions.push({label:'Open in Reservations',onClick:d=>{d.close();queueMicrotask(()=>navigate('reservations',{collection:'reservations',id:record.id}));}});
      actions.push({label:'Close',onClick:d=>d.close()});
      const dialog=createModal({title:record.title,body,className:'tcc-expanded-modal tcc-expanded-inherits-source tone-sky',actions});
      host.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
    });
    list.append(row);
  }
  panel.append(list);
  return panel;
}

const ACCOUNT_BRAND_ASSETS = Object.freeze([
  [/commonwealth|commbank|cba/i,'./brand-bank-commonwealth.png'],
  [/\bnab\b|national australia/i,'./brand-bank-nab.png'],
  [/\banz\b|australia and new zealand/i,'./brand-bank-anz.png'],
  [/\bme bank\b|\bmebank\b|^me$/i,'./brand-bank-me.png'],
  [/\bwise\b|transferwise/i,'./brand-bank-wise.png']
]);
function accountBrandIcon(name){
  const match=ACCOUNT_BRAND_ASSETS.find(([pattern])=>pattern.test(String(name||'')));
  if(!match)return null;
  const wrap=node('span','budget-account-brand');const img=document.createElement('img');img.src=match[1];img.alt='';img.loading='eager';img.decoding='async';wrap.append(img);wrap.setAttribute('aria-hidden','true');return wrap;
}

function openAccountsViewer({model,host}){
  const body=node('div','budget-accounts-manager budget-accounts-viewer');
  const intro=node('section','budget-accounts-manager-summary');
  intro.append(
    node('p','eyebrow','ACCOUNT SNAPSHOT'),
    node('strong','',signedMoney(model.accounts.audTotal,'AUD')),
    node('span','',`${model.accounts.records.length} saved ${model.accounts.records.length===1?'account':'accounts'} · AUD subtotal only · other currencies stay separate`),
    node('small','budget-accounts-readonly-note','Read-only travel-money snapshot · no transfers · no live bank connection')
  );
  body.append(intro);
  const list=node('div','budget-account-manager-list');
  if(!model.accounts.records.length){
    list.append(node('p','budget-muted','No entries yet'));
  }
  for(const account of model.accounts.records){
    const row=node('div','budget-list-row budget-account-row budget-account-manager-row');
    const rowCopy=node('span','budget-account-row-copy');
    rowCopy.append(node('strong','',account.name),node('small','',`${account.currency} balance`));
    const amount=node('span','budget-account-row-amount');
    amount.append(node('strong','',signedMoney(account.balance,account.currency)));
    const brand=accountBrandIcon(account.name);
    if(brand) row.append(brand);
    row.append(rowCopy,amount);
    list.append(row);
  }
  body.append(list);
  const dialog=createModal({title:'Accounts',body,actions:[{label:'Close',onClick:d=>d.close()}],className:'tcc-expanded-modal tcc-expanded-inherits-source tone-gold budget-accounts-manager-modal'});
  host.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.showModal();
}

function renderAccounts(model, stateService, host) {
  const panel = node('button', 'budget-panel budget-accounts budget-accounts-summary-card');panel.type='button';
  const head=node('div','budget-section-head budget-accounts-head');
  const copy=node('div','budget-accounts-title');
  copy.append(node('h2','','Accounts'),node('small','',`${model.accounts.records.length} account${model.accounts.records.length===1?'':'s'} · AUD ${signedMoney(model.accounts.audTotal, 'AUD')} subtotal · read-only`));
  head.append(copy);panel.append(head);
  const list = node('div', 'budget-list budget-account-list');
  if (!model.accounts.records.length) list.append(node('p', 'budget-muted', 'No entries yet'));
  for (const account of model.accounts.records.slice(0,5)) {
    const row = node('div', 'budget-list-row budget-account-row');
    const rowCopy=node('span','budget-account-row-copy');rowCopy.append(node('strong','',account.name),node('small','',`${account.currency} balance`));
    const amount=node('span','budget-account-row-amount');amount.append(node('strong','',signedMoney(account.balance, account.currency)));
    const brand=accountBrandIcon(account.name); if(brand) row.append(brand); row.append(rowCopy,amount);list.append(row);
  }
  if(model.accounts.records.length>5)list.append(node('p','budget-account-more',`+${model.accounts.records.length-5} more · tap to view all`));
  panel.append(list);
  panel.setAttribute('aria-description','Tap to enlarge the read-only Accounts snapshot. No transfers or account editing are available.');
  panel.addEventListener('click',()=>openAccountsViewer({model,host}));
  return panel;
}

function categoryPeriodLabel(key, rawLabel) {
  if (key === 'year') return rawLabel;
  const [year, month] = String(rawLabel).split('-').map(Number);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${monthNames[month - 1] || rawLabel} ${year}`;
}

function renderCategoryChart(model, initialMode = 'month') {
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
  let mode = ['month','year'].includes(initialMode) ? initialMode : 'month';

  function renderMode() {
    panel.dataset.periodMode = mode;
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
    else topCard.append(node('span','','SPEND STATUS'),node('strong','','No spend yet'),node('small','','No living expenses yet'));
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

function renderMonthlySpendHistory(model, currentDate, initialYear = null) {
  const panel = node('section', 'budget-panel budget-monthly-history');
  const head = node('div', 'budget-section-head');
  head.append(node('h2', '', 'Monthly Spend History'));
  panel.append(head);

  const years = model.monthlyHistory?.years || [];
  const histories = model.monthlyHistory?.histories || [];
  const currentISO = toISODate(currentDate);
  const currentYear = Number(currentISO.slice(0, 4));
  const currentMonth = Number(currentISO.slice(5, 7));
  const requestedYear = Number(initialYear);
  let selectedYear = years.includes(requestedYear) ? requestedYear : (years.includes(currentYear) ? currentYear : years[0]);

  const yearButtons = node('div', 'budget-history-years');
  yearButtons.setAttribute('role', 'group');
  yearButtons.setAttribute('aria-label', 'Monthly spend history year');
  const meta = node('div', 'budget-history-meta');
  const chart = node('div', 'budget-history-chart');
  const stats = node('div', 'budget-history-stats');
  panel.append(yearButtons, meta, chart, stats);

  function renderYear() {
    if (selectedYear != null) panel.dataset.selectedYear = String(selectedYear);
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
    const historyBudgetConfigured = Number(history.budgetAUD || 0) > 0;
    const targetBasis = history.activeMonths === 12 ? 'annual budget ÷ 12' : `first travel budget period ÷ ${history.activeMonths} active months`;
    target.append(node('span', '', 'AVERAGE MONTHLY TARGET'), node('strong', '', historyBudgetConfigured ? signedMoney(history.monthlyTargetAUD, 'AUD') : '—'), node('small', '', historyBudgetConfigured ? targetBasis : `Set Annual Budget for ${history.year}`));
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
    const positionTone = historyBudgetConfigured ? (history.budgetPositionAUD >= 0 ? 'is-under' : 'is-over') : 'is-setup';
    stats.append(
      stat('Year to Date', signedMoney(history.spentAUD, 'AUD'), `${history.recordedMonths} recorded month${history.recordedMonths === 1 ? '' : 's'}`),
      stat('Average / Recorded Month', signedMoney(history.averageRecordedMonthAUD, 'AUD')),
      stat('Peak Month', history.peakMonth ? (MONTH_NAMES[history.peakMonth - 1] || '—') : '—', history.peakMonth ? signedMoney(history.peakMonthAUD, 'AUD') : 'No actual spend recorded'),
      stat('Annual Budget Position', historyBudgetConfigured ? `${signedMoney(Math.abs(history.budgetPositionAUD), 'AUD')} ${history.budgetPositionAUD >= 0 ? 'UNDER' : 'OVER'}` : 'NEEDS SETUP', historyBudgetConfigured ? '' : `Set Annual Budget for ${history.year}`, positionTone)
    );
  }

  renderYear();
  return panel;
}

function recentExpensesExpandedBody(state, currentDate, openExistingExpense) {
  const body=node('div','budget-recent-expanded');
  const stayById=new Map((state.itinerary||[]).map(item=>[item.id,item]));
  const sorted=[...(state.expenses||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.modifiedAt||'').localeCompare(String(a.modifiedAt||'')));
  const repairs=sorted.filter(item=>item.needsBudgetRepair);
  const normal=sorted.filter(item=>!item.needsBudgetRepair);
  // As with the compact list, repair rows outrank the ordinary display limit.
  // An undated old repair must never fall below thirty newer valid expenses.
  const records=[...repairs,...normal.slice(0,Math.max(0,30-repairs.length))];
  const trusted=records.filter(item=>!item.needsBudgetRepair);
  const trustedTotalAUD=trusted.reduce((sum,item)=>sum+Number(item.audAmount||0),0);
  const repairCount=records.length-trusted.length;
  const futureCount=trusted.filter(item=>String(item.date||'')>String(currentDate||'').slice(0,10)).length;
  const summary=node('div','budget-recent-expanded-summary');
  summary.append(node('strong','',`${records.length} recent entries`),node('span','',`${signedMoney(trustedTotalAUD,'AUD')} recorded across these entries`),node('span','',`${futureCount} future-dated`));
  if(repairCount)summary.append(node('span','budget-expense-repair-summary',`${repairCount} ${repairCount===1?'needs':'need'} expense routing repair`));
  body.append(summary);
  const list=node('div','budget-recent-expanded-list');
  if(!records.length)list.append(node('p','budget-muted','No entries yet'));
  for(const expense of records){
    const annual=expense.budgetScope==='annual';
    const stay=expense.needsBudgetRepair || annual ? null : stayById.get(expense.itineraryId);const row=node('button',`budget-expense-row budget-expense-row-expanded budget-category-${expense.category}${expense.needsBudgetRepair?' is-repair':''}${annual?' is-annual':''}`);row.type='button';
    const dateLabel=expense.date?formatAUDate(expense.date):'DATE REQUIRED';
    const budgetContext=expense.needsBudgetRepair?'Expense routing requires repair':annual?'Annual Budget · AUD':stay?`${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)}`:'Destination Budget unavailable';
    const copy=node('div');copy.append(node('strong','',expense.description||CATEGORY_LABELS[expense.category]||expense.category),node('small','',[dateLabel,CATEGORY_LABELS[expense.category]||expense.category,budgetContext].filter(Boolean).join(' · ')));
    if(expense.needsBudgetRepair)copy.append(node('small','budget-expense-repair-label','EXPENSE ROUTING REPAIR REQUIRED'));
    const amounts=node('div','budget-row-amounts');
    if(expense.needsBudgetRepair){amounts.append(node('strong','budget-expense-repair-amount','REPAIR REQUIRED'),node('small','',signedMoney(expense.originalAmount,expense.originalCurrency)));}
    else {amounts.append(node('strong','',signedMoney(expense.originalAmount,expense.originalCurrency)));if(expense.originalCurrency!=='AUD'||Number(expense.originalAmount)!==Number(expense.audAmount))amounts.append(node('small','',`AUD ${signedMoney(expense.audAmount,'AUD')}`));}
    row.append(copy,amounts);row.setAttribute('aria-label',[`Open expense`,expense.description||CATEGORY_LABELS[expense.category]||expense.category,dateLabel,expense.needsBudgetRepair?'Expense routing repair required':''].filter(Boolean).join(' · '));row.addEventListener('click',()=>{const dialog=row.closest('dialog');if(dialog?.open)dialog.close();queueMicrotask(()=>openExistingExpense(expense.id,CATEGORY_TONES[expense.category]||'sky'));});list.append(row);
  }
  body.append(list);return body;
}

function renderRecentExpenses(model, openExistingExpense) {
  const panel = node('section', 'budget-panel budget-recent');
  const head = node('div', 'budget-section-head');
  head.append(node('h2', '', 'Recent Expense Entries'), node('span', 'budget-count', String(model.recentExpenses.length)));
  panel.append(head);
  const list = node('div', 'budget-list');
  if (!model.recentExpenses.length) list.append(node('p', 'budget-muted', 'No entries yet'));
  for (const expense of model.recentExpenses) {
    // Collapsed Recent Expense Entries is a list-preview widget. The first tap
    // belongs to the widget itself and enlarges the full list; only rows inside
    // that enlarged list open an expense editor on a deliberate second tap.
    const button = node('div', `budget-expense-row budget-expense-preview-row budget-category-${expense.category}`);
    const copy = node('div');
    const scopeLabel=expense.budgetScope==='annual'?'Annual Budget · AUD':'Destination Budget';
    copy.append(node('strong', '', expense.description || CATEGORY_LABELS[expense.category] || expense.category), node('small', '', `${expense.isFuture ? 'Future · ' : ''}${expense.displayDate} · ${CATEGORY_LABELS[expense.category] || expense.category} · ${scopeLabel}`));
    if (expense.needsBudgetRepair) copy.append(node('small', 'budget-expense-repair-label', 'EXPENSE ROUTING REPAIR REQUIRED'));
    const amounts = node('div', 'budget-row-amounts');
    if (expense.needsBudgetRepair) amounts.append(node('strong', 'budget-expense-repair-amount', 'REPAIR REQUIRED'), node('small', '', signedMoney(expense.originalAmount, expense.originalCurrency)));
    else {
      amounts.append(node('strong', '', signedMoney(expense.originalAmount, expense.originalCurrency)));
      if (expense.originalCurrency !== 'AUD' || Number(expense.originalAmount) !== Number(expense.audAmount)) amounts.append(node('small', '', `AUD ${signedMoney(expense.audAmount, 'AUD')}`));
    }
    button.append(copy, amounts);
    button.setAttribute('aria-hidden', 'true');
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
  makeExpandableCard(destinationSummary,{host:main,title:'Current Destination Budget',tone:'sky',bodyBuilder:()=>renderDestinationSummaryExpanded(model)});
  makeExpandableCard(paceSummary,{host:main,title:'Daily & Stay Pace',tone:'green',bodyBuilder:()=>renderPaceSummaryExpanded(model)});

  // Locked Budget structure: keep the prominent top-level Add Expense action
  // visible on the main screen. Editing details may also be available inside
  // Living Expenses, but quick entry must never be hidden behind expansion.
  const addExpenseBar=node('button','budget-add-expense-bar');
  addExpenseBar.type='button';
  addExpenseBar.append(createLineIcon('plus'),node('span','','ADD EXPENSE'));
  addExpenseBar.setAttribute('aria-label','Add Expense');
  addExpenseBar.addEventListener('click',()=>openNewExpense('groceries','sky'));
  main.append(addExpenseBar);

  const annualSummary=renderAnnualSummary(model,state), destinationBudgets=renderDestinationBudgets(model,state,{stateService,host:main,currentDate});
  const planning=node('section','budget-reference-planning'); planning.append(annualSummary,destinationBudgets); main.append(planning);
  makeExpandableCard(annualSummary,{host:main,title:`${model.annual?.year || ''} Annual Budget`.trim(),tone:'gold',bodyBuilder:()=>renderAnnualSummaryExpanded(model,{state,stateService,host:main})});
  makeExpandableCard(destinationBudgets,{host:main,title:'Destination Budgets',tone:'violet'});
  const categoryChart=renderCategoryChart(model), annualForecast=renderAnnualForecast(model);
  const charts=node('section','budget-reference-charts'); charts.append(categoryChart,annualForecast); main.append(charts);
  makeExpandableCard(categoryChart,{host:main,title:'Budget by Category',tone:'copper',bodyBuilder:()=>renderCategoryChart(model,categoryChart.dataset.periodMode)});
  makeExpandableCard(annualForecast,{host:main,title:'Year Forecast & Budget Summary',tone:'magenta'});
  const monthlyHistory=renderMonthlySpendHistory(model,currentDate); main.append(monthlyHistory);
  makeExpandableCard(monthlyHistory,{host:main,title:'Monthly Spend History',tone:'blue',bodyBuilder:()=>renderMonthlySpendHistory(model,currentDate,monthlyHistory.dataset.selectedYear)});
  const livingExpenses=renderLivingExpenses(model); main.append(livingExpenses);
  makeExpandableCard(livingExpenses,{host:main,title:'Living Expenses',tone:'silver',bodyBuilder:()=>livingExpensesExpandedBody(model,state,currentDate,openNewExpense,openExistingExpense)});
  const reservationsPanel=renderReservations(model,main,navigate), accountsPanel=renderAccounts(model,stateService,main);
  const middle=node('section','budget-two-column'); middle.append(reservationsPanel,accountsPanel); main.append(middle);
  makeExpandableCard(reservationsPanel,{host:main,title:'Reservations',tone:'green'});
  const recentExpenses=renderRecentExpenses(model,openExistingExpense);
  main.append(recentExpenses);
  makeExpandableCard(recentExpenses,{host:main,title:'Recent Expense Entries',tone:'maroon',bodyBuilder:()=>recentExpensesExpandedBody(state,currentDate,openExistingExpense)});

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
