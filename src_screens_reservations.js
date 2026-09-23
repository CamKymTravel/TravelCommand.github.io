import { buildReservationsViewModel, RESERVATION_TABS } from './src_core_reservations-view-model.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { saveReservationDraft, deleteReservationDraft } from './src_core_reservation-mutations.js';
import { localToAUD, formatMoney } from './src_core_currency.js';
import { staysCoveringDate, sameDayHandoffCandidates, isDestinationBudgetUsable, canonicalAUDAmount } from './src_core_budget.js';
import { formatAUDate } from './src_core_dates.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';
import { canonicalCountrySlug } from './src_core_entities.js';

const RESERVATION_TONES = Object.freeze({ flight:'blue', train:'teal', cruise:'violet', rv:'copper', hotel:'gold', airbnb:'pink', accommodation:'gold', ticket:'rose' });
const RESERVATION_EDITOR_ICONS = Object.freeze({ flight:'flight', train:'train', cruise:'cruise', rv:'rv', hotel:'hotel', airbnb:'airbnb', accommodation:'hotel', ticket:'ticket' });
const reservationLiveType = type => type === 'accommodation' ? 'hotel' : type;
const RESERVATION_MONTHS = Object.freeze(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']);

const STATUS_OPTIONS = Object.freeze([
  ['paid','Paid'],
  ['unpaid','Unpaid'],
  ['booked','Booked'],
  ['to-book','To Book']
]);

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function inputField(label, name, type = 'text', value = '') {
  const wrap = node('label', 'reservation-field');
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

function selectField(label, name, options, value = '') {
  const wrap = node('label', 'reservation-field');
  wrap.append(node('span', '', label));
  const select = document.createElement('select');
  select.name = name;
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    if (String(optionValue) === String(value ?? '')) option.selected = true;
    select.append(option);
  }
  wrap.append(select);
  return wrap;
}

function textAreaField(label, name, value = '') {
  const wrap = node('label', 'reservation-field reservation-field-wide');
  wrap.append(node('span', '', label));
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.rows = 4;
  textarea.value = value ?? '';
  wrap.append(textarea);
  return wrap;
}

function reservationDateParts(value) {
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return { day:'--',month:'---',year:'----' };
  const [,year,month,day]=match;
  return { day,month:RESERVATION_MONTHS[Number(month)-1]||'---',year };
}

function reservationStayCountry(entry = null) {
  const type=String(entry?.travelType||'standard').toLowerCase();
  if(type==='cruise'||type==='motorhome'||type==='rv') return entry?.startCountry || entry?.country || '';
  return entry?.country || entry?.startCountry || '';
}

function reservationOccurrenceCountryKey(value) {
  return canonicalCountrySlug(value);
}

function reservationOccurrenceKey(entry) {
  return `${reservationOccurrenceCountryKey(reservationStayCountry(entry))}|${String(entry?.name||'').normalize('NFC').trim().toLocaleLowerCase('en-AU')}`;
}

function reservationStayPreview(stay,state,{budgetUsable=isDestinationBudgetUsable(stay)}={}) {
  const preview=node('section',`reservation-destination-preview${budgetUsable?'':' is-warning'}`);
  if(!stay){
    preview.classList.add('is-empty');
    preview.append(node('span','reservation-destination-preview-label','DATE-MATCHED DESTINATION BUDGET'),node('strong','','Choose a reservation date to match its stay'));
    return preview;
  }
  const all=[...(state.itinerary||[])].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)));
  const key=reservationOccurrenceKey(stay);
  const same=all.filter(item=>reservationOccurrenceKey(item)===key);
  const occurrence=Math.max(1,same.findIndex(item=>item.id===stay.id)+1);
  const start=reservationDateParts(stay.startDate), end=reservationDateParts(stay.endDate);
  const copy=node('div','reservation-destination-preview-copy');
  copy.append(node('span','reservation-destination-preview-label','DATE-MATCHED DESTINATION BUDGET'),node('strong','',stay.name),node('small','',[reservationStayCountry(stay),same.length>1?`${stay.name} ${occurrence} of ${same.length}`:''].filter(Boolean).join(' · ')));
  const identity=node('div','reservation-destination-preview-identity');
  const flag=node('span','reservation-destination-preview-flag',countryFlagEmoji(reservationStayCountry(stay)));
  flag.setAttribute('aria-hidden','true');
  identity.append(flag,copy);
  const dates=node('div','reservation-destination-date-ticket');
  const side=(parts,label)=>{ const el=node('span','reservation-destination-date-side'); el.append(node('small','',label),node('strong','',parts.day),node('b','',parts.month),node('em','',parts.year)); return el; };
  dates.append(side(start,'FROM'),node('span','reservation-destination-date-arrow','→'),side(end,'TO'));
  dates.setAttribute('aria-label',`${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)}`);
  const budget=node('div','reservation-destination-budget-status');
  budget.append(
    node('span','',budgetUsable?'BUDGET LOCKED':'BUDGET NEEDS SETUP'),
    node('strong','',Number(stay.destinationBudgetAUD)>0?formatMoney(Number(stay.destinationBudgetAUD),'AUD'):'NOT LOCKED')
  );
  preview.append(identity,dates,budget);
  return preview;
}

function splitReservationDateTime(value) {
  const text=String(value||'').trim();
  return { date:text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '', time:text.match(/T(\d{2}:\d{2})/)?.[1] || '' };
}

function existingAnnualReservationUsesManualAUD(record, state) {
  if (!record || (record.budgetScope || (record.type === 'ticket' ? 'destination' : 'annual')) !== 'annual') return false;
  if(record.audAmountManual === true) return true;
  if(record.audAmountManual === false) return false;
  const currency=String(record.originalCurrency || '').trim().toUpperCase();
  if (!currency || currency === 'AUD') return false;
  const stay=(state.itinerary || []).find(item=>item.id===record.itineraryId) || null;
  if (!stay || !isDestinationBudgetUsable(stay)) return true;
  if (currency !== String(stay.localCurrency || '').trim().toUpperCase()) return true;
  const original=Number(record.originalAmount || 0);
  const expected=canonicalAUDAmount(localToAUD(original, stay.fixedLocalPerAUD), original);
  return Math.abs(Number(record.audAmount) - expected) > 0.005;
}

function openReservationEditor({ stateService, host, currentDate, reservationId = null, initialType = 'flight', editorTone = null }) {
  const state = stateService.snapshot();
  const existing = reservationId ? state.reservations.find(record => record.id === reservationId) : null;
  if (reservationId && !existing) return;
  const existingManualAnnualAUD=existingAnnualReservationUsesManualAUD(existing,state);

  const existingDateTime=splitReservationDateTime(existing?.dateTime);
  const defaultCurrency=state.settings?.defaultCurrency || 'AUD';
  const savedValue = {
    type:reservationLiveType(existing?.type || initialType),
    budgetScope:existing?.budgetScope || ((existing?.type || initialType) === 'ticket' ? 'destination' : 'annual'),
    flightScope:existing?.type === 'flight' ? (existing?.flightScope || '') : '',
    title:existing?.title || '',
    date:existingDateTime.date,
    time:existingDateTime.time,
    originalCurrency:existing?.originalCurrency || defaultCurrency,
    originalAmount:existing?.originalAmount ?? '',
    audAmount:existing?.audAmount ?? '',
    status:existing?.status === 'completed' ? 'booked' : (existing?.status || 'booked'),
    bookingReference:existing?.bookingReference || '',
    notes:existing?.notes || '',
    itineraryId:existing?.budgetScope === 'destination' ? (existing?.itineraryId || null) : null
  };
  const formSession = new FormSession(savedValue);
  const resolvedTone = RESERVATION_TONES[reservationLiveType(existing?.type || initialType)] || editorTone || 'blue';
  let modal = null;
  const body = node('div', 'reservation-editor');
  body.dataset.audAuto = 'false';
  body.dataset.currencyAuto = existing ? 'false' : 'true';
  const typeTiles = node('div', 'reservation-type-tiles');
  typeTiles.setAttribute('role', 'group');
  typeTiles.setAttribute('aria-label', 'Reservation type');
  const flightScopeTiles = node('div', 'reservation-flight-scope-tiles');
  flightScopeTiles.setAttribute('role', 'group');
  flightScopeTiles.setAttribute('aria-label', 'Flight scope');
  const allocationTiles = node('div', 'reservation-allocation-tiles');
  allocationTiles.setAttribute('role', 'group');
  allocationTiles.setAttribute('aria-label', 'Reservation budget allocation');
  const typeStep = node('section', 'reservation-editor-step reservation-editor-step-type reservation-editor-simple-section');
  const typeHead = node('div', 'reservation-editor-simple-head');
  typeHead.append(node('strong', '', 'RESERVATION TYPE'));
  typeStep.append(typeHead, typeTiles, flightScopeTiles);
  const destinationPreview = node('div', 'reservation-destination-preview-host');
  const fields = node('div', 'reservation-editor-fields');
  const conversionHint = node('p', 'reservation-conversion-hint');
  const error = node('p', 'reservation-form-error');
  body.append(typeStep, fields, error);

  const value = name => body.querySelector(`[name="${name}"]`)?.value ?? '';

  function capture() {
    return {
      type:body.dataset.type,
      budgetScope:body.dataset.budgetScope === 'destination' ? 'destination' : 'annual',
      flightScope:body.dataset.type === 'flight' ? (body.dataset.flightScope || null) : null,
      title:value('title'),
      dateTime:value('date') ? `${value('date')}${value('time') ? `T${value('time')}` : ''}` : null,
      originalCurrency:value('originalCurrency').trim().toUpperCase() || defaultCurrency,
      originalAmount:value('originalAmount') === '' ? 0 : Number(value('originalAmount')),
      audAmount:value('audAmount') === '' ? null : Number(value('audAmount')),
      status:value('status'),
      bookingReference:value('bookingReference'),
      notes:value('notes'),
      itineraryId:body.dataset.budgetScope === 'destination' ? (body.dataset.destinationItineraryId || null) : null
    };
  }

  function renderTypes() {
    typeTiles.replaceChildren();
    for (const [type, label] of RESERVATION_TABS) {
      const button = node('button', `reservation-type-tile reservation-type-${type}`);
      button.type = 'button';
      button.append(createLineIcon(RESERVATION_EDITOR_ICONS[type] || 'reservations', 'reservation-type-choice-icon'), node('span', 'reservation-type-choice-label', label));
      const active = body.dataset.type === type;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      if (active) button.append(createLineIcon('check', 'reservation-selected-tick'));
      button.addEventListener('click', () => preserveLocalFocus(() => {
        const previousType = body.dataset.type;
        body.dataset.type = type;
        setModalTone(modal, RESERVATION_TONES[type] || editorTone || 'blue');
        renderTypes(); renderFlightScope(); renderAllocation(); updateRoutingPreview();
      }));
      typeTiles.append(button);
    }
  }

  function renderFlightScope() {
    flightScopeTiles.replaceChildren();
    flightScopeTiles.hidden = body.dataset.type !== 'flight';
    if (flightScopeTiles.hidden) return;
    flightScopeTiles.append(node('span', 'reservation-flight-scope-label', 'FLIGHT TYPE'));
    const grid = node('div', 'reservation-flight-scope-grid');
    for (const [scope, label] of [['domestic','Domestic'],['international','International']]) {
      const button = node('button', 'reservation-flight-scope-tile', label);
      button.type = 'button';
      const active = body.dataset.flightScope === scope;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      if (active) { const tick=node('span','reservation-selected-tick'); tick.append(createLineIcon('check')); button.append(tick); }
      button.addEventListener('click', () => preserveLocalFocus(() => { body.dataset.flightScope = active ? '' : scope; renderFlightScope(); }));
      grid.append(button);
    }
    flightScopeTiles.append(grid);
  }

  function renderAllocation() {
    allocationTiles.replaceChildren();
    allocationTiles.hidden = false;
    allocationTiles.append(node('span', 'reservation-allocation-label', 'BUDGET ALLOCATION'));
    const grid = node('div', 'reservation-allocation-grid');
    for (const [scope, label, support] of [
      ['destination','Destination Budget','Use the exact stay budget; this still rolls into the annual total.'],
      ['annual','Annual Budget','Annual total only; do not use the stay Destination Budget.']
    ]) {
      const button = node('button', 'reservation-allocation-tile');
      button.type = 'button';
      const active = body.dataset.budgetScope === scope;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.append(node('strong','',label), node('small','',support));
      if (active) button.append(createLineIcon('check', 'reservation-selected-tick'));
      button.addEventListener('click', () => preserveLocalFocus(() => { body.dataset.budgetScope = scope; renderAllocation(); updateRoutingPreview(); }));
      grid.append(button);
    }
    allocationTiles.append(grid);
  }

  function routeForDate() {
    const date=value('date');
    const destinationAllocation = body.dataset.budgetScope === 'destination';
    if(!date) return { stay:null, error:'Choose a reservation date before saving.', destinationAllocation };
    let matches;
    try { matches=staysCoveringDate(state.itinerary || [], date); }
    catch { return { stay:null, error:'Choose a valid reservation date before saving.', destinationAllocation }; }
    if (!destinationAllocation) {
      // Annual reservations may legitimately sit on an uncovered transit day.
      // Keep a contextual stay link when the date is unique, and mirror the
      // core save rule on a legal same-day handoff by preserving an existing
      // valid stay ID. Otherwise the editor can falsely say "unlinked" even
      // though Save/relaunch correctly retain the established relationship.
      if(matches.length===1) return { stay:matches[0], error:null, destinationAllocation:false, ambiguous:false, handoffAmbiguous:false };
      const handoff=matches.length===2 ? sameDayHandoffCandidates(state.itinerary || [], date) : [];
      const preserved=handoff.length===2 && existing?.itineraryId ? handoff.find(item=>item.id===existing.itineraryId) || null : null;
      return { stay:preserved, error:null, destinationAllocation:false, ambiguous:matches.length>1, handoffAmbiguous:handoff.length===2, preservedHandoffLink:Boolean(preserved) };
    }
    if(!matches.length) return { stay:null, error:`No itinerary stay covers ${formatAUDate(date)}. Add the stay and its Destination Budget before allocating this booking to Destination Budget.`, destinationAllocation:true };
    if(matches.length>1){
      const handoff=sameDayHandoffCandidates(state.itinerary || [], date);
      if(handoff.length===2){
        const selected=handoff.find(item=>item.id===body.dataset.destinationItineraryId) || null;
        if(!selected) return { stay:null, error:null, destinationAllocation:true, handoffCandidates:handoff, requiresHandoffChoice:true };
        if(!isDestinationBudgetUsable(selected)) return { stay:selected, error:`${selected.name} · ${formatAUDate(selected.startDate)} – ${formatAUDate(selected.endDate)} needs a complete Destination Budget before this booking can use it.`, destinationAllocation:true, handoffCandidates:handoff };
        return { stay:selected, error:null, destinationAllocation:true, handoffCandidates:handoff };
      }
      return { stay:null, error:`${matches.length} itinerary stays genuinely overlap on ${formatAUDate(date)}. Fix the itinerary before allocating this booking to Destination Budget.`, destinationAllocation:true };
    }
    const stay=matches[0];
    if(!isDestinationBudgetUsable(stay)) return { stay, error:`${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)} needs a complete Destination Budget before this booking can use it.`, destinationAllocation:true };
    return { stay, error:null, destinationAllocation:true };
  }

  function updateRoutingPreview() {
    destinationPreview.replaceChildren();
    const route=routeForDate();
    const autoRoute = fields.querySelector('.reservation-editor-auto-route');
    if (autoRoute) {
      const label=autoRoute.querySelector('.reservation-auto-route-label'); const support=autoRoute.querySelector('small');
      if(label) label.textContent=route.destinationAllocation?'DESTINATION BUDGET':'ANNUAL BUDGET COST';
      if(support) {
        if(route.destinationAllocation) support.textContent='Matched automatically from the reservation date.';
        else if(route.handoffAmbiguous && route.preservedHandoffLink) support.textContent=`${route.stay?.name || 'Existing stay'} context link is preserved on this handoff date.`;
        else if(route.handoffAmbiguous) support.textContent='Two stays meet on this handoff date; this Annual Budget booking stays unlinked to either stay.';
        else support.textContent='This booking is using Annual Budget only.';
      }
    }
    if(route.destinationAllocation && route.stay) destinationPreview.append(reservationStayPreview(route.stay,state,{budgetUsable:!route.error}));
    if(route.destinationAllocation && route.handoffCandidates?.length===2){
      const chooser=node('section',`reservation-destination-preview${route.stay?'':' is-warning'}`);
      chooser.append(
        node('span','reservation-destination-preview-label','HANDOFF DAY · CHOOSE DESTINATION BUDGET'),
        node('strong','',route.stay ? `Selected: ${route.stay.name}` : 'Two stays meet on this date')
      );
      const grid=node('div','reservation-allocation-grid');
      grid.setAttribute('role','group');
      grid.setAttribute('aria-label',`Destination Budget for ${formatAUDate(value('date'))}`);
      for(const candidate of route.handoffCandidates){
        const active=route.stay?.id===candidate.id;
        const button=node('button','reservation-allocation-tile');
        button.type='button';
        button.dataset.active=String(active);
        button.setAttribute('aria-pressed',String(active));
        button.append(
          node('strong','',candidate.name),
          node('small','',[reservationStayCountry(candidate),`${formatAUDate(candidate.startDate)} – ${formatAUDate(candidate.endDate)}`,candidate.localCurrency || 'Currency not set'].filter(Boolean).join(' · '))
        );
        if(active) button.append(createLineIcon('check','reservation-selected-tick'));
        button.addEventListener('click',()=>preserveLocalFocus(()=>{ body.dataset.destinationItineraryId=candidate.id; updateRoutingPreview(); }));
        grid.append(button);
      }
      chooser.append(grid);
      destinationPreview.append(chooser);
    }
    if(route.error && (route.destinationAllocation || value('date'))) {
      const warning=node('section','reservation-destination-preview is-empty is-warning');
      warning.append(node('span','reservation-destination-preview-label',route.destinationAllocation?'DESTINATION BUDGET REQUIRED':'RESERVATION DATE REQUIRED'),node('strong','',route.error));
      destinationPreview.append(warning);
    }
    if(route.destinationAllocation && route.stay) body.dataset.destinationItineraryId=route.stay.id;
    else if(!route.destinationAllocation || (!route.handoffCandidates && !route.stay)) body.dataset.destinationItineraryId='';
    const currencyInput = fields.querySelector('[name="originalCurrency"]');
    // Currency identity belongs to the dated itinerary stay even when that stay's
    // Destination Budget is not yet usable. A missing budget/rate is a setup
    // warning; it must never make the editor retain the previous stay's currency.
    const matchedStay = route.stay || null;
    const conversionStay = route.error ? null : matchedStay;
    if (matchedStay && body.dataset.currencyAuto === 'true' && currencyInput) currencyInput.value = String(matchedStay.localCurrency || defaultCurrency).toUpperCase();
    const currency = value('originalCurrency').trim().toUpperCase();
    const amount = Number(value('originalAmount'));
    const audInput = fields.querySelector('[name="audAmount"]');
    const validAmount = Number.isFinite(amount) && amount >= 0;
    const preserveManualAnnualAUD = body.dataset.annualAudManual === 'true' && !route.destinationAllocation && currency !== 'AUD';
    if (currency === 'AUD' && validAmount) {
      const converted = Math.round((amount + Number.EPSILON) * 100) / 100;
      if (audInput) { audInput.readOnly = true; audInput.value = String(converted); }
      body.dataset.audAuto = 'true';
      conversionHint.textContent = `${formatMoney(amount, 'AUD')} will use the same AUD amount.`;
    } else if (preserveManualAnnualAUD) {
      if (audInput) audInput.readOnly = false;
      body.dataset.audAuto = 'false';
      conversionHint.textContent = 'This Annual Budget booking has a saved manual AUD equivalent. It stays manual even if a later itinerary correction makes the booking currency match the stay currency.';
    } else if (conversionStay?.localCurrency === currency && conversionStay?.fixedLocalPerAUD && validAmount) {
      const converted = canonicalAUDAmount(localToAUD(amount, conversionStay.fixedLocalPerAUD), amount);
      if (audInput) { audInput.readOnly = true; audInput.value = String(converted); }
      body.dataset.audAuto = 'true';
      conversionHint.textContent = `${formatMoney(amount, currency)} = AUD ${formatMoney(converted, 'AUD')} at ${conversionStay.name}'s fixed stay rate.`;
    } else {
      if (audInput) {
        audInput.readOnly = false;
        if (body.dataset.audAuto === 'true') audInput.value = '';
      }
      body.dataset.audAuto = 'false';
      conversionHint.textContent = 'If the booking currency is neither AUD nor the matched stay currency, enter its AUD equivalent manually.';
    }
  }

  function populate(saved) {
    error.textContent = '';
    // Undo must restore the saved AUD equivalent exactly when it was entered
    // manually. Clear stale automatic-conversion provenance before the rebuilt
    // fields run their routing/conversion preview.
    body.dataset.audAuto = 'false';
    body.dataset.annualAudManual = existingManualAnnualAUD ? 'true' : 'false';
    body.dataset.currencyAuto = existing ? 'false' : 'true';
    body.dataset.type = saved.type;
    body.dataset.budgetScope = saved.budgetScope === 'destination' ? 'destination' : 'annual';
    body.dataset.flightScope = saved.flightScope || '';
    body.dataset.destinationItineraryId = saved.itineraryId || '';
    setModalTone(modal, resolvedTone);
    renderTypes();
    renderFlightScope();
    renderAllocation();
    const essentialsStep = node('section', 'reservation-editor-step reservation-editor-step-essentials reservation-editor-simple-section');
    const essentialsHead = node('div', 'reservation-editor-simple-head');
    essentialsHead.append(node('strong', '', 'RESERVATION DETAILS'));
    const essentialsGrid = node('div', 'reservation-editor-essentials-grid');
    essentialsGrid.append(
      inputField('Reservation name', 'title', 'text', saved.title),
      inputField('Date', 'date', 'date', saved.date),
      inputField('Time', 'time', 'time', saved.time)
    );
    essentialsStep.append(essentialsHead, essentialsGrid, destinationPreview);

    const costStep = node('section', 'reservation-editor-step reservation-editor-step-cost reservation-editor-simple-section');
    const costHead = node('div', 'reservation-editor-simple-head');
    costHead.append(node('strong', '', 'COST & BUDGET'));
    const costGrid = node('div', 'reservation-editor-cost-grid');
    const amountField=inputField('Amount', 'originalAmount', 'number', saved.originalAmount);
    const currencyField=inputField('Currency', 'originalCurrency', 'text', saved.originalCurrency);
    const audField=inputField('AUD equivalent', 'audAmount', 'number', saved.audAmount);
    amountField.classList.add('reservation-money-field','reservation-money-original');
    currencyField.classList.add('reservation-money-field','reservation-money-currency');
    audField.classList.add('reservation-money-field','reservation-money-aud');
    costGrid.append(amountField,currencyField,audField);
    const autoRoute = node('div', 'reservation-editor-auto-route');
    const allocationLabel = saved.budgetScope === 'destination' ? 'DESTINATION BUDGET' : 'ANNUAL BUDGET';
    autoRoute.append(createLineIcon('check'), node('span', 'reservation-auto-route-label', allocationLabel), node('small', '', allocationLabel === 'DESTINATION BUDGET' ? 'Matched to the exact dated stay.' : 'Counted once against the calendar-year Annual Budget.'));
    costStep.append(costHead, costGrid, allocationTiles, autoRoute, conversionHint);

    const trackingStep = node('section', 'reservation-editor-step reservation-editor-step-tracking reservation-editor-simple-section');
    const trackingHead = node('div', 'reservation-editor-simple-head');
    trackingHead.append(node('strong', '', 'BOOKING DETAILS'));
    const trackingGrid = node('div', 'reservation-editor-tracking-grid');
    trackingGrid.append(
      selectField('Status', 'status', STATUS_OPTIONS, saved.status),
      inputField('Booking reference', 'bookingReference', 'text', saved.bookingReference)
    );
    const notesField = textAreaField('Notes', 'notes', saved.notes);
    trackingStep.append(trackingHead, trackingGrid, notesField);

    fields.replaceChildren(essentialsStep, costStep, trackingStep);
    for (const name of ['date','time','originalAmount','audAmount']) {
      fields.querySelector(`[name="${name}"]`)?.addEventListener('input', updateRoutingPreview);
      fields.querySelector(`[name="${name}"]`)?.addEventListener('change', updateRoutingPreview);
    }
    const currencyInput=fields.querySelector('[name="originalCurrency"]');
    const markCurrencyManual=()=>{ body.dataset.currencyAuto='false'; updateRoutingPreview(); };
    currencyInput?.addEventListener('input',markCurrencyManual);
    currencyInput?.addEventListener('change',markCurrencyManual);
    updateRoutingPreview();
  }

  populate(savedValue);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      const existingParts=splitReservationDateTime(existing.dateTime);
      const existingWhen=existing.dateTime ? `${formatAUDate(existing.dateTime)}${existingParts.time ? ` · ${existingParts.time}` : ''}` : 'Date not set';
      const existingLiveType=reservationLiveType(existing.type);
      const existingType=RESERVATION_TABS.find(([value])=>value===existingLiveType)?.[1] || existingLiveType || 'Reservation';
      const existingStatus=STATUS_OPTIONS.find(([value])=>value===existing.status)?.[1] || existing.status || 'Booked';
      const existingAmount=formatMoney(existing.originalAmount,existing.originalCurrency || 'AUD');
      confirmDestructive({
        title:'Delete reservation',
        tone:resolvedTone,
        message:`Delete ${existing.title} · ${existingType} · ${existingWhen} · ${existingStatus} · ${existingAmount}? This cannot be undone.`,
        onConfirm:() => {
          stateService.commit(draft => deleteReservationDraft(draft, existing.id));
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
        if (formDraft.type !== 'flight') formDraft.flightScope = null;
        // Core save applies Annual-vs-Destination allocation. Annual bookings may sit
        // on transit days; destination-allocated reservations require one exact configured stay.
        stateService.commit(draft => {
          const saved = saveReservationDraft(draft, { reservationId:existing?.id || null, fields:formDraft }, { now:stateService.now });
          draft.ui.reservationType = reservationLiveType(saved.type);
          if (saved.status !== 'to-book' && String(saved.dateTime || '').slice(0, 10) < String(currentDate || '')) draft.ui.reservationCompletedOpen = true;
        });
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) {
        error.textContent = err.message;
        requestAnimationFrame(() => error.scrollIntoView({ block:'nearest' }));
      }
    }}
  );

  modal = createModal({ title:existing ? 'Edit Reservation' : 'Add Reservation', body, actions, className:`tcc-editor-modal tcc-reservation-editor-modal tone-${resolvedTone}` });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function amountBlock(record) {
  const wrap = node('span', 'reservation-amounts');
  if (record.needsBudgetRepair) {
    wrap.append(node('strong', 'reservation-repair-amount', 'REPAIR REQUIRED'), node('small', '', formatMoney(record.originalAmount, record.originalCurrency)));
    return wrap;
  }
  wrap.append(node('strong', '', formatMoney(record.originalAmount, record.originalCurrency)));
  if (record.originalCurrency !== 'AUD' || Number(record.originalAmount) !== Number(record.audAmount)) wrap.append(node('small', 'reservation-aud-secondary', `AUD ${formatMoney(record.audAmount, 'AUD')}`));
  return wrap;
}

function reservationRow(record, openEditor) {
  const button = node('button', 'reservation-row');
  if (record.completed) button.classList.add('reservation-row-completed');
  button.type = 'button';
  button.addEventListener('click', () => { const dialog=button.closest('dialog'); if(dialog?.open)dialog.close(); queueMicrotask(()=>openEditor(record.id)); });
  const copy = node('span', 'reservation-row-copy');
  copy.append(node('strong', '', record.title));
  const flightLabel = record.type === 'flight' && record.flightScope ? `${record.flightScope === 'domestic' ? 'Domestic' : 'International'} Flight` : null;
  const detail = [record.displayDateTime, flightLabel, record.itineraryName].filter(Boolean).join(' · ');
  copy.append(node('small', '', detail));
  if (record.notes) copy.append(node('small', 'reservation-row-note', record.notes));
  if (record.needsBudgetRepair) copy.append(node('small', 'reservation-row-repair', 'DESTINATION BUDGET REPAIR REQUIRED'));
  const meta = node('span', 'reservation-row-meta');
  meta.append(node('span', `reservation-status reservation-status-${record.status}`, record.statusLabel), amountBlock(record));
  button.append(copy, meta);
  button.setAttribute('aria-label', ['Open reservation', record.title, record.displayDateTime, flightLabel, record.itineraryName, record.statusLabel, record.needsBudgetRepair ? 'Destination Budget repair required' : ''].filter(Boolean).join(' · '));
  return button;
}

function listPanel(title, records, className, openEditor, emptyText = 'No entries yet') {
  const panel = node('section', `reservation-panel ${className || ''}`.trim());
  const head = node('div', 'reservation-section-head');
  head.append(node('h2', '', title), node('span', 'reservation-count', String(records.length)));
  panel.append(head);
  const list = node('div', 'reservation-list');
  if (!records.length) list.append(node('p', 'reservation-empty', emptyText));
  for (const record of records) list.append(reservationRow(record, openEditor));
  panel.append(list);
  return panel;
}

function reservationPanelExpandedBody(title, records, openEditor) {
  const body=node('div','reservation-expanded-detail');
  const trusted=records.filter(record=>!record.needsBudgetRepair);
  const totalAUD=trusted.reduce((sum,record)=>sum+Number(record.audAmount||0),0);
  const destinations=new Set(records.map(record=>record.itineraryName).filter(Boolean));
  const paid=records.filter(record=>record.status==='paid').length;
  const open=records.filter(record=>record.status==='unpaid'||record.status==='booked').length;
  const repairs=records.length-trusted.length;
  const summary=node('div','reservation-expanded-summary');
  summary.append(
    node('strong','',`${records.length} ${records.length===1?'booking':'bookings'}`),
    node('span','',`${formatMoney(totalAUD,'AUD')} trusted total`),
    node('span','',`${destinations.size} destination${destinations.size===1?'':'s'}`),
    node('small','',`Paid ${paid} · Open ${open}${repairs?` · Repair ${repairs}`:''}`)
  );
  body.append(summary);
  const section=node('section','reservation-expanded-list-section');
  const head=node('div','reservation-section-head');head.append(node('h3','',title),node('span','reservation-count',String(records.length)));section.append(head);
  const list=node('div','reservation-list');
  if(!records.length)list.append(node('p','reservation-empty','No entries yet'));
  for(const record of records)list.append(reservationRow(record,openEditor));
  section.append(list);body.append(section);
  return body;
}

function allUpcomingPresented(state,currentDate) {
  return buildReservationsViewModel(state,currentDate,{activeType:'flight'}).allUpcoming;
}

function nextUpcomingExpandedBody(state,currentDate,openEditor) {
  const body=reservationPanelExpandedBody('All Upcoming Across All Categories',allUpcomingPresented(state,currentDate),openEditor);
  body.classList.add('reservation-upcoming-all-expanded');
  return body;
}

function bookedTotalExpandedBody(state) {
  const body=node('div','reservation-booked-expanded');
  const booked=(state.reservations||[]).filter(record=>record.status!=='to-book');
  const totalTrusted=booked.filter(record=>!record.needsBudgetRepair).reduce((sum,record)=>sum+Number(record.audAmount||0),0);
  const intro=node('div','reservation-expanded-summary');
  intro.append(node('strong','',`${booked.length} booked reservations`),node('span','',`${formatMoney(totalTrusted,'AUD')} trusted total`));
  body.append(intro);
  const groups=node('div','reservation-booked-category-list');
  for(const [type,label] of RESERVATION_TABS){
    const records=booked.filter(record=>reservationLiveType(record.type)===type);
    const trusted=records.filter(record=>!record.needsBudgetRepair);
    const amount=trusted.reduce((sum,record)=>sum+Number(record.audAmount||0),0);
    const paid=records.filter(record=>record.status==='paid').length;
    const repair=records.length-trusted.length;
    const row=node('article',`reservation-booked-category reservation-booked-category-${type}`);
    row.append(node('strong','',label),node('span','',`${records.length} booked · ${formatMoney(amount,'AUD')}`),node('small','',`Paid ${paid}${repair?` · Repair ${repair}`:''}`));
    groups.append(row);
  }
  body.append(groups);return body;
}

function reservationAllFuture(state,currentDate){ return allUpcomingPresented(state,currentDate).slice(0,5); }

function shortReservationDate(value){
  const date=String(value||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date not set';
  return new Date(`${date}T00:00:00Z`).toLocaleString('en-AU',{day:'2-digit',month:'short',timeZone:'UTC'});
}

function reservationTabMeta(state,currentDate,type){
  const today=String(currentDate).slice(0,10);
  const records=(state.reservations||[]).filter(record=>reservationLiveType(record.type)===type);
  const completed=records.filter(record=>record.status!=='to-book'&&record.dateTime&&String(record.dateTime).slice(0,10)<today);
  const future=records.filter(record=>record.status!=='to-book'&&record.dateTime&&String(record.dateTime).slice(0,10)>=today).sort((a,b)=>String(a.dateTime).localeCompare(String(b.dateTime)));
  const toBook=records.filter(record=>record.status==='to-book');
  const repairs=records.filter(record=>record.needsBudgetRepair);
  const undatedRepairs=repairs.filter(record=>record.status!=='to-book'&&!record.dateTime);
  const futurePaid=future.filter(record=>record.status==='paid').length;
  const flightDomestic=type==='flight' ? future.filter(record=>record.flightScope==='domestic').length : 0;
  const flightInternational=type==='flight' ? future.filter(record=>record.flightScope==='international').length : 0;
  const flightUnclassified=type==='flight' ? future.filter(record=>!record.flightScope).length : 0;
  let primary='No bookings yet';
  let secondary='Ready to add';
  if(future.length){
    primary=`${future.length} upcoming`;
    secondary=type==='flight' ? `D ${flightDomestic} · INT ${flightInternational}${flightUnclassified ? ` · ${flightUnclassified} ?` : ''}` : `Next ${shortReservationDate(future[0].dateTime)}`;
  } else if(undatedRepairs.length){
    primary=`${undatedRepairs.length} need repair`;
    secondary='Date / budget repair';
  } else if(toBook.length){
    primary=`${toBook.length} to book`;
    secondary='Action needed';
  } else if(completed.length){
    primary=`${completed.length} completed`;
    secondary='View history';
  }
  if(repairs.length && !undatedRepairs.length) secondary=`${repairs.length} budget repair${repairs.length===1?'':'s'}`;
  const support=[primary,secondary].filter(Boolean).join(' · ');
  return { support, primary, secondary, future:future.length, toBook:toBook.length, completed:completed.length, repairs:repairs.length, futurePaid, flightDomestic, flightInternational, flightUnclassified };
}

function reservationTypeLabel(type) {
  return RESERVATION_TABS.find(([value])=>value===reservationLiveType(type))?.[1] || reservationLiveType(type) || 'Reservation';
}

function applyReservationControls(records, controls) {
  const query=String(controls.query||'').normalize('NFC').trim().toLocaleLowerCase('en-AU');
  const type=controls.type||'all';
  const filtered=(records||[]).filter(record=>{
    if(type!=='all' && reservationLiveType(record.type)!==type) return false;
    if(!query) return true;
    const haystack=[record.title,record.itineraryName,reservationTypeLabel(record.type),record.notes,record.statusLabel,record.displayDateTime].filter(Boolean).join(' ').normalize('NFC').toLocaleLowerCase('en-AU');
    return query.split(/\s+/).filter(Boolean).every(token=>haystack.includes(token));
  });
  const dir=controls.direction==='desc'?-1:1;
  filtered.sort((a,b)=>{
    if(controls.sort==='name') return dir*((a.title||'').localeCompare(b.title||'','en-AU',{sensitivity:'base'}) || String(a.dateTime||'9999').localeCompare(String(b.dateTime||'9999')));
    const av=String(a.dateTime||'9999'), bv=String(b.dateTime||'9999');
    return dir*(av.localeCompare(bv) || (a.title||'').localeCompare(b.title||'','en-AU',{sensitivity:'base'}));
  });
  return filtered;
}

function reservationControlsBar(controls,onChange) {
  const bar=node('section','reservation-list-controls');
  bar.setAttribute('aria-label','Search and sort reservations');
  const searchWrap=node('label','reservation-control reservation-control-search');
  searchWrap.append(node('span','','Search'));
  const search=document.createElement('input'); search.type='search'; search.value=controls.query||''; search.placeholder='Search bookings'; search.setAttribute('aria-label','Search bookings');
  search.addEventListener('input',event=>{controls.query=event.target.value; onChange();});
  searchWrap.append(search);

  const sortWrap=node('label','reservation-control'); sortWrap.append(node('span','','Sort'));
  const sort=document.createElement('select'); sort.setAttribute('aria-label','Sort reservations');
  for(const [value,label] of [['date','Date'],['name','Name']]){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=controls.sort===value;sort.append(option);} 
  sort.addEventListener('change',event=>{controls.sort=event.target.value; onChange();}); sortWrap.append(sort);

  const direction=node('button','reservation-control-direction'); direction.type='button'; direction.setAttribute('aria-label',controls.direction==='desc'?'Sort descending; tap for ascending':'Sort ascending; tap for descending');
  direction.append(createLineIcon(controls.direction==='desc'?'chevronLeft':'chevronRight'),document.createTextNode(controls.direction==='desc'?' DESC':' ASC'));
  direction.addEventListener('click',()=>{controls.direction=controls.direction==='desc'?'asc':'desc'; onChange();});

  const typeWrap=node('label','reservation-control'); typeWrap.append(node('span','','Booking Type'));
  const typeSelect=document.createElement('select'); typeSelect.setAttribute('aria-label','Filter by booking type');
  for(const [value,label] of [['all','All Types'],...RESERVATION_TABS]){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=controls.type===value;typeSelect.append(option);} 
  typeSelect.addEventListener('change',event=>{controls.type=event.target.value; onChange();}); typeWrap.append(typeSelect);

  bar.append(searchWrap,sortWrap,direction,typeWrap);
  return bar;
}

function openCompletedReservations({ stateService, host, currentDate }) {
  const model=buildReservationsViewModel(stateService.snapshot(),currentDate,{activeType:'flight'});
  let dialog=null;
  const openRecord=id=>{
    if(dialog?.open) dialog.close();
    queueMicrotask(()=>{const liveHost=document.querySelector('[data-screen="reservations"]');if(liveHost)openReservationEditor({stateService,host:liveHost,currentDate,reservationId:id,initialType:'flight',editorTone:'silver'});});
  };
  const body=reservationPanelExpandedBody('Completed Reservations',model.allCompleted,openRecord);
  dialog=createModal({title:'Completed Reservations',body,className:'tcc-expanded-modal tcc-expanded-inherits-source reservation-completed-expanded-modal tone-silver',actions:[{label:'Close',onClick:d=>d.close()}]});
  host.append(dialog); dialog.addEventListener('close',()=>dialog.remove(),{once:true}); dialog.showModal();
}

function renderNextFive(state,currentDate,host){
  const panel=node('section','reservation-rail-panel reservation-next-five');
  const head=node('div','reservation-section-head'); head.append(node('h2','','Next 5 Upcoming')); panel.append(head);
  const itineraryById=new Map((state.itinerary||[]).map(item=>[item.id,item]));
  const list=node('div','reservation-rail-list'); const records=reservationAllFuture(state,currentDate);
  if(!records.length) list.append(node('p','reservation-empty','No upcoming reservations'));
  for(const r of records){
    const row=node('button','reservation-rail-row'); row.type='button';
    const date=String(r.dateTime||'').slice(0,10); const [,m,d]=date.split('-');
    const badge=node('span','reservation-date-badge'); badge.append(node('strong','',d||'—'),node('small','',new Date(`${date}T00:00:00Z`).toLocaleString('en-AU',{month:'short',timeZone:'UTC'}).toUpperCase()));
    const copy=node('span','reservation-rail-copy');
    const itinerary=r.needsBudgetRepair ? null : itineraryById.get(r.itineraryId);
    const liveType=reservationLiveType(r.type);
    const typeLabel=RESERVATION_TABS.find(([type])=>type===liveType)?.[1]||liveType;
    const time=String(r.dateTime||'').match(/T(\d{2}:\d{2})/)?.[1]||'';
    copy.append(node('strong','',r.title),node('small','',[typeLabel,itinerary?.name,time].filter(Boolean).join(' · ')));
    if(r.needsBudgetRepair) copy.append(node('small','reservation-rail-repair','BUDGET REPAIR REQUIRED'));
    const chevron=node('span','reservation-rail-chevron'); chevron.append(createLineIcon('expand'));
    row.append(badge,copy,chevron);
    row.setAttribute('aria-label', ['Expand Next 5 reservations', r.title, formatAUDate(date), time, typeLabel, itinerary?.name, r.needsBudgetRepair ? 'Destination Budget repair required' : ''].filter(Boolean).join(' · '));
    row.addEventListener('click',()=>{
      if (!host) return;
      const body=reservationPanelExpandedBody('Next 5 Upcoming',records,()=>{});
      for (const button of body.querySelectorAll('button')) { button.disabled=true; button.setAttribute('aria-disabled','true'); }
      const dialog=createModal({title:'Next 5 Upcoming',body,className:'tcc-expanded-modal tcc-expanded-inherits-source reservation-next-five-expanded-modal tone-blue',actions:[{label:'Close',onClick:d=>d.close()}]});
      host.append(dialog); dialog.addEventListener('close',()=>dialog.remove(),{once:true}); dialog.showModal();
    }); list.append(row);
  }
  panel.append(list); return panel;
}

function renderBookedTotal(state){
  const panel=node('section','reservation-rail-panel reservation-booked-total');
  const booked=(state.reservations||[]).filter(r=>r.status!=='to-book');
  const trusted=booked.filter(r=>!r.needsBudgetRepair);
  const repairExcluded=booked.length-trusted.length;
  const total=trusted.reduce((s,r)=>s+Number(r.audAmount||0),0);
  const paid=booked.filter(r=>r.status==='paid').length;
  const open=booked.filter(r=>r.status==='unpaid'||r.status==='booked').length;
  panel.append(node('p','eyebrow','TOTAL BOOKED · AUD'),node('strong','reservation-total-value',formatMoney(total,'AUD')),node('span','reservation-booked-count',`${booked.length} bookings`));
  if(repairExcluded) panel.append(node('small','reservation-total-repair-note',`${repairExcluded} budget-repair ${repairExcluded===1?'booking is':'bookings are'} excluded from the AUD total until repaired.`));
  const stats=node('div','reservation-booked-stats');
  const paidStat=node('span'); paidStat.append(node('small','','PAID'),node('strong','',String(paid)));
  const openStat=node('span'); openStat.append(node('small','','OPEN'),node('strong','',String(open)));
  stats.append(paidStat,openStat); panel.append(stats);
  return panel;
}

function openReservationCategorySummary({ stateService, host, currentDate, type, onSelectType = null }) {
  if(!host)return;
  const state=stateService.snapshot();
  const model=buildReservationsViewModel(state,currentDate,{activeType:type});
  const label=RESERVATION_TABS.find(([value])=>value===type)?.[1]||'Reservations';
  const body=node('div',`reservation-category-expanded reservation-category-expanded-${type}`);
  const meta=reservationTabMeta(state,currentDate,type);
  const summary=node('div','reservation-category-expanded-summary');
  summary.append(
    node('strong','',`${model.upcoming.length} upcoming`),
    node('span','',`${model.toBook.length} to book`),
    node('span','',`${model.completed.length} completed`)
  );
  if(type==='flight') summary.append(node('small','',`Upcoming flights · Domestic ${meta.flightDomestic} · International ${meta.flightInternational}${meta.flightUnclassified?` · Unclassified ${meta.flightUnclassified}`:''}`));
  body.append(summary);
  let dialog=null;
  const openRecord=id=>{
    if(dialog?.open)dialog.close();
    queueMicrotask(()=>{
      const liveHost=document.querySelector('[data-screen="reservations"]');
      if(liveHost)openReservationEditor({stateService,host:liveHost,currentDate,reservationId:id,initialType:type,editorTone:RESERVATION_TONES[type]||'blue'});
    });
  };
  const addGroup=(title,records,empty,{toBook=false}={})=>{
    const section=node('section',`reservation-category-expanded-group${toBook?' reservation-category-expanded-to-book':''}`);
    const head=node('div','reservation-section-head');head.append(node('h3','',title),node('span','reservation-count',String(records.length)));section.append(head);
    const list=node('div','reservation-list');
    if(!records.length)list.append(node('p','reservation-empty',empty));
    for(const record of records)list.append(reservationRow(record,openRecord));
    section.append(list);body.append(section);
  };
  addGroup('Upcoming',model.upcoming,'No upcoming bookings in this category.');
  addGroup('Future Bookings / To Book',model.toBook,'No To Book entries in this category.',{toBook:true});
  addGroup('Completed',model.completed,'No completed bookings in this category.');
  dialog=createModal({
    title:`${label} · All Bookings`,
    body,
    className:`tcc-expanded-modal tcc-expanded-inherits-source reservation-category-expanded-modal tone-${RESERVATION_TONES[type]||'blue'}`,
    actions:[{label:'Close',onClick:d=>d.close()}]
  });
  host.append(dialog);
  dialog.addEventListener('close',()=>{dialog.remove();onSelectType?.(type);},{once:true});
  dialog.showModal();
}

export function renderReservationsScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root reservations-screen');
  main.dataset.screen = 'reservations';
  let options = { activeType:reservationLiveType(stateService.snapshot().ui?.reservationType || 'flight') };
  const controls={ query:'', sort:'date', direction:'asc', type:'all' };
  const openEditor = (reservationId, editorTone = null) => openReservationEditor({ stateService, host:main, currentDate, reservationId, initialType:options.activeType, editorTone });

  function renderContent() {
    const state = stateService.snapshot();
    options.activeType=reservationLiveType(state.ui?.reservationType || options.activeType || 'flight');
    const model = buildReservationsViewModel(state, currentDate, options);
    main.replaceChildren();

    const homeModel = buildHomeViewModel(state, currentDate, { alertLimit:0, eventLimit:0 });
    main.append(createStayBanner({ currentStay:homeModel.currentStay, nextDestination:homeModel.nextDestination, navigate, className:'reservation-stay-banner' }));

    const toolbar = node('header', 'reservation-toolbar');
    const title = node('div');
    title.append(node('p', 'eyebrow', 'BOOKED TRAVEL'), node('h1', '', 'Booked Reservations'));
    toolbar.append(title);
    main.append(toolbar);

    const tabs = node('nav', 'reservation-tabs reservation-dashboard-tabs');
    tabs.setAttribute('aria-label', 'Booked reservation categories');
    for (const tab of model.tabs) {
      const button = node('button', `reservation-tab reservation-tab-${tab.type}`);
      button.type = 'button';
      const meta=reservationTabMeta(state,currentDate,tab.type);
      const top=node('span','reservation-tab-top');
      const tabIcon=node('span','reservation-tab-icon'); tabIcon.append(createLineIcon(tab.type));
      top.append(tabIcon,node('span','reservation-tab-label',tab.label));
      const count=node('span','reservation-tab-count'); count.append(node('strong','',String(tab.count)),node('small','',tab.count===1?'booking':'bookings'));
      button.append(top,count);
      button.setAttribute('aria-label',`${tab.label}: ${tab.count} bookings. ${meta.support}`);
      button.addEventListener('click', () => {
        openReservationCategorySummary({
          stateService,
          host:main,
          currentDate,
          type:tab.type,
          onSelectType:selectedType=>{
            options.activeType=selectedType;
            if(stateService.snapshot().ui?.reservationType===selectedType)return;
            stateService.commit(draft=>{draft.ui.reservationType=selectedType;});
          }
        });
      });
      tabs.append(button);
    }
    const completedTile=node('button','reservation-tab reservation-tab-completed'); completedTile.type='button';
    const completedTop=node('span','reservation-tab-top'); const completedIcon=node('span','reservation-tab-icon'); completedIcon.append(createLineIcon('history'));
    completedTop.append(completedIcon,node('span','reservation-tab-label','Completed'));
    const completedCount=node('span','reservation-tab-count'); completedCount.append(node('strong','',String(model.completedCount)),node('small','',model.completedCount===1?'booking':'bookings'));
    completedTile.append(completedTop,completedCount); completedTile.setAttribute('aria-label',`Completed: ${model.completedCount} bookings. Opens booking history newest first.`);
    completedTile.addEventListener('click',()=>openCompletedReservations({stateService,host:main,currentDate})); tabs.append(completedTile);

    /* Keep the eight booking categories and the primary Add action full-width on
       iPad. The summary rail begins below them, so it can never cover the fourth
       tile column or hide RV / Motorhome and Completed. */
    main.append(tabs);
    const addBar=node('button','reservation-add-bar'); addBar.type='button'; addBar.append(createLineIcon('plus'),document.createTextNode(' ADD RESERVATION')); addBar.addEventListener('click',()=>openReservationEditor({stateService,host:main,currentDate,initialType:options.activeType})); main.append(addBar);

    const contentGrid=node('section','reservation-reference-grid');
    const left=node('div','reservation-reference-main');
    left.append(reservationControlsBar(controls,()=>preserveLocalFocus(renderContent)));

    const filteredToBook=applyReservationControls(model.allToBook,controls);
    const toBookPanel=listPanel('Future Bookings / To Book', filteredToBook, 'reservation-to-book', id=>openEditor(id,'gold'), 'No matching To Book entries yet');
    left.append(toBookPanel);
    makeExpandableCard(toBookPanel,{host:main,title:'Future Bookings / To Book',tone:'gold',bodyBuilder:()=>reservationPanelExpandedBody('Future Bookings / To Book',applyReservationControls(buildReservationsViewModel(stateService.snapshot(),currentDate,{activeType:'flight'}).allToBook,controls),id=>openEditor(id,'gold'))});

    const nextFive=renderNextFive(state,currentDate,main), bookedTotal=renderBookedTotal(state);
    const rail=node('aside','reservation-reference-rail'); rail.setAttribute('aria-label','Reservation summary'); rail.append(nextFive,bookedTotal);
    makeExpandableCard(nextFive,{host:main,title:'Upcoming Reservations · All Categories',tone:'blue',bodyBuilder:()=>nextUpcomingExpandedBody(stateService.snapshot(),currentDate,id=>openEditor(id,'blue'))});
    makeExpandableCard(bookedTotal,{host:main,title:'Total Booked by Category',tone:'green',bodyBuilder:()=>bookedTotalExpandedBody(stateService.snapshot())});
    contentGrid.append(left,rail); main.append(contentGrid);

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'reservations' && pending.id && state.reservations.some(record => record.id === pending.id)) {
      const target = state.reservations.find(record => record.id === pending.id);
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          if (target?.type) draft.ui.reservationType = reservationLiveType(target.type);
        });
        const liveHost = document.querySelector('[data-screen="reservations"]');
        if (liveHost) openReservationEditor({ stateService, host:liveHost, currentDate, reservationId:pending.id, initialType:reservationLiveType(target?.type || options.activeType), editorTone:pending.editorTone || null });
      });
    }
  }

  renderContent();
  return main;
}
