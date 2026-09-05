import { buildReservationsViewModel, RESERVATION_TABS } from './src_core_reservations-view-model.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { saveReservationDraft, deleteReservationDraft } from './src_core_reservation-mutations.js';
import { localToAUD, formatMoney } from './src_core_currency.js';
import { staysCoveringDate, isDestinationBudgetUsable } from './src_core_budget.js';
import { formatAUDate } from './src_core_dates.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';

const RESERVATION_TONES = Object.freeze({ flight:'blue', train:'green', cruise:'teal', rv:'orange', accommodation:'magenta', ticket:'gold' });
const RESERVATION_EDITOR_ICONS = Object.freeze({ flight:'flight', train:'train', cruise:'cruise', rv:'rv', accommodation:'accommodation', ticket:'ticket' });
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

function reservationOccurrenceCountryKey(value) {
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

function reservationOccurrenceKey(entry) {
  return `${reservationOccurrenceCountryKey(entry?.country)}|${String(entry?.name||'').normalize('NFC').trim().toLocaleLowerCase('en-AU')}`;
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
  copy.append(node('span','reservation-destination-preview-label','DATE-MATCHED DESTINATION BUDGET'),node('strong','',stay.name),node('small','',[stay.country,same.length>1?`${stay.name} ${occurrence} of ${same.length}`:''].filter(Boolean).join(' · ')));
  const identity=node('div','reservation-destination-preview-identity');
  const flag=node('span','reservation-destination-preview-flag',countryFlagEmoji((['cruise','motorhome','rv'].includes(String(stay.travelType||'').toLowerCase()) ? stay.startCountry : stay.country) || stay.country || stay.startCountry || ''));
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

function openReservationEditor({ stateService, host, currentDate, reservationId = null, initialType = 'flight', editorTone = null }) {
  const state = stateService.snapshot();
  const existing = reservationId ? state.reservations.find(record => record.id === reservationId) : null;
  if (reservationId && !existing) return;

  const existingDateTime=splitReservationDateTime(existing?.dateTime);
  const defaultCurrency=state.settings?.defaultCurrency || 'AUD';
  const savedValue = {
    type:existing?.type || initialType,
    flightScope:existing?.type === 'flight' ? (existing?.flightScope || '') : '',
    title:existing?.title || '',
    date:existingDateTime.date,
    time:existingDateTime.time,
    originalCurrency:existing?.originalCurrency || defaultCurrency,
    originalAmount:existing?.originalAmount ?? '',
    audAmount:existing?.audAmount ?? '',
    status:existing?.status === 'completed' ? 'booked' : (existing?.status || 'booked'),
    notes:existing?.notes || ''
  };
  const formSession = new FormSession(savedValue);
  let modal = null;
  const body = node('div', 'reservation-editor');
  body.dataset.audAuto = 'false';
  body.dataset.currencyAuto = existing ? 'false' : 'true';
  const intro = node('section', 'reservation-editor-intro');
  intro.append(
    node('strong', '', existing ? 'Edit the essentials and save' : 'Enter the essentials and save'),
    node('span', '', 'The reservation date automatically matches the exact Destination Budget. The same cost also rolls into Annual Budget totals once.')
  );
  const typeTiles = node('div', 'reservation-type-tiles');
  typeTiles.setAttribute('role', 'group');
  typeTiles.setAttribute('aria-label', 'Reservation type');
  const flightScopeTiles = node('div', 'reservation-flight-scope-tiles');
  flightScopeTiles.setAttribute('role', 'group');
  flightScopeTiles.setAttribute('aria-label', 'Flight scope');
  const typeStep = node('section', 'reservation-editor-step reservation-editor-step-type');
  const typeHead = node('div', 'reservation-editor-step-head');
  typeHead.append(node('b', 'reservation-editor-step-number', '1'), node('div', 'reservation-editor-step-copy'));
  typeHead.querySelector('.reservation-editor-step-copy').append(node('strong', '', 'Choose reservation type'), node('span', '', 'Tap one type. The selected colour follows through this editor.'));
  typeStep.append(typeHead, typeTiles, flightScopeTiles);
  const destinationPreview = node('div', 'reservation-destination-preview-host');
  const fields = node('div', 'reservation-editor-fields');
  const conversionHint = node('p', 'reservation-conversion-hint');
  const error = node('p', 'reservation-form-error');
  body.append(intro, typeStep, fields, error);

  const value = name => body.querySelector(`[name="${name}"]`)?.value ?? '';

  function capture() {
    return {
      type:body.dataset.type,
      flightScope:body.dataset.type === 'flight' ? (body.dataset.flightScope || null) : null,
      title:value('title'),
      dateTime:value('date') ? `${value('date')}${value('time') ? `T${value('time')}` : ''}` : null,
      originalCurrency:value('originalCurrency').trim().toUpperCase() || defaultCurrency,
      originalAmount:value('originalAmount') === '' ? 0 : Number(value('originalAmount')),
      audAmount:value('audAmount') === '' ? null : Number(value('audAmount')),
      status:value('status'),
      notes:value('notes')
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
      button.addEventListener('click', () => preserveLocalFocus(() => { body.dataset.type = type; if (existing && !editorTone) setModalTone(modal, RESERVATION_TONES[type] || 'blue'); renderTypes(); renderFlightScope(); }));
      typeTiles.append(button);
    }
  }

  function renderFlightScope() {
    flightScopeTiles.replaceChildren();
    flightScopeTiles.hidden = body.dataset.type !== 'flight';
    if (flightScopeTiles.hidden) return;
    flightScopeTiles.append(node('span', 'reservation-flight-scope-label', 'Flight classification (optional)'));
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

  function routeForDate() {
    const date=value('date');
    if(!date) return { stay:null, error:'Choose a reservation date. Its Destination Budget will be matched automatically.' };
    let matches;
    try { matches=staysCoveringDate(state.itinerary || [], date); }
    catch { return { stay:null, error:'Choose a valid reservation date before saving.' }; }
    if(!matches.length) return { stay:null, error:`No itinerary stay covers ${formatAUDate(date)}. Add the stay and its Destination Budget before saving.` };
    if(matches.length>1) return { stay:null, error:`${matches.length} itinerary stays cover ${formatAUDate(date)}. Fix the overlap before saving.` };
    const stay=matches[0];
    if(!isDestinationBudgetUsable(stay)) return { stay, error:`${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)} needs a complete Destination Budget before this reservation can be saved.` };
    return { stay, error:null };
  }

  function updateRoutingPreview() {
    destinationPreview.replaceChildren();
    const route=routeForDate();
    if(route.stay) destinationPreview.append(reservationStayPreview(route.stay,state,{budgetUsable:!route.error}));
    if(route.error) {
      const warning=node('section','reservation-destination-preview is-empty is-warning');
      warning.append(node('span','reservation-destination-preview-label','DESTINATION BUDGET REQUIRED'),node('strong','',route.error));
      destinationPreview.append(warning);
    }
    const currencyInput = fields.querySelector('[name="originalCurrency"]');
    const stay = route.error ? null : route.stay;
    if (stay && body.dataset.currencyAuto === 'true' && currencyInput) currencyInput.value = String(stay.localCurrency || defaultCurrency).toUpperCase();
    const currency = value('originalCurrency').trim().toUpperCase();
    const amount = Number(value('originalAmount'));
    const audInput = fields.querySelector('[name="audAmount"]');
    const validAmount = Number.isFinite(amount) && amount >= 0;
    if (currency === 'AUD' && validAmount) {
      const converted = Math.round((amount + Number.EPSILON) * 100) / 100;
      if (audInput) { audInput.readOnly = true; audInput.value = String(converted); }
      body.dataset.audAuto = 'true';
      conversionHint.textContent = `${formatMoney(amount, 'AUD')} will use the same AUD amount.`;
    } else if (stay?.localCurrency === currency && stay?.fixedLocalPerAUD && validAmount) {
      const converted = Math.round((localToAUD(amount, stay.fixedLocalPerAUD) + Number.EPSILON) * 100) / 100;
      if (audInput) { audInput.readOnly = true; audInput.value = String(converted); }
      body.dataset.audAuto = 'true';
      conversionHint.textContent = `${formatMoney(amount, currency)} = ${formatMoney(converted, 'AUD')} at ${stay.name}'s fixed stay rate.`;
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
    body.dataset.currencyAuto = existing ? 'false' : 'true';
    body.dataset.type = saved.type;
    body.dataset.flightScope = saved.flightScope || '';
    setModalTone(modal, existing ? (editorTone || RESERVATION_TONES[saved.type] || 'blue') : 'sky');
    renderTypes();
    renderFlightScope();
    const essentialsStep = node('section', 'reservation-editor-step reservation-editor-step-essentials');
    const essentialsHead = node('div', 'reservation-editor-step-head');
    essentialsHead.append(node('b', 'reservation-editor-step-number', '2'), node('div', 'reservation-editor-step-copy'));
    essentialsHead.querySelector('.reservation-editor-step-copy').append(node('strong', '', 'Reservation details'), node('span', '', 'Name the booking and enter the calendar date. Time is optional.'));
    const essentialsGrid = node('div', 'reservation-editor-essentials-grid');
    essentialsGrid.append(
      inputField('Reservation name', 'title', 'text', saved.title),
      inputField('Date', 'date', 'date', saved.date),
      inputField('Time (optional)', 'time', 'time', saved.time)
    );
    essentialsStep.append(essentialsHead, essentialsGrid, destinationPreview);

    const costStep = node('section', 'reservation-editor-step reservation-editor-step-cost');
    const costHead = node('div', 'reservation-editor-step-head');
    costHead.append(node('b', 'reservation-editor-step-number', '3'), node('div', 'reservation-editor-step-copy'));
    costHead.querySelector('.reservation-editor-step-copy').append(node('strong', '', 'Cost & Destination Budget'), node('span', '', 'The dated stay controls the budget. Enter the booking currency and amount.'));
    const costGrid = node('div', 'reservation-editor-cost-grid');
    costGrid.append(
      inputField('Original Amount', 'originalAmount', 'number', saved.originalAmount),
      inputField('Original Currency', 'originalCurrency', 'text', saved.originalCurrency),
      inputField('AUD Equivalent', 'audAmount', 'number', saved.audAmount)
    );
    const autoRoute = node('div', 'reservation-editor-auto-route');
    autoRoute.append(createLineIcon('check'), node('span', '', 'AUTOMATIC DESTINATION BUDGET'), node('small', '', 'Matched automatically from the reservation date.'));
    costStep.append(costHead, costGrid, autoRoute, conversionHint);

    const trackingStep = node('section', 'reservation-editor-step reservation-editor-step-tracking');
    const trackingHead = node('div', 'reservation-editor-step-head');
    trackingHead.append(node('b', 'reservation-editor-step-number', '4'), node('div', 'reservation-editor-step-copy'));
    trackingHead.querySelector('.reservation-editor-step-copy').append(node('strong', '', 'Booking status & notes'), node('span', '', 'Track whether it is Paid, Unpaid, Booked or still To Book.'));
    const trackingGrid = node('div', 'reservation-editor-tracking-grid');
    trackingGrid.append(selectField('Status', 'status', STATUS_OPTIONS, saved.status), textAreaField('Notes', 'notes', saved.notes));
    trackingStep.append(trackingHead, trackingGrid);

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
      const existingType=RESERVATION_TABS.find(([value])=>value===existing.type)?.[1] || existing.type || 'Reservation';
      const existingStatus=STATUS_OPTIONS.find(([value])=>value===existing.status)?.[1] || existing.status || 'Booked';
      const existingAmount=formatMoney(existing.originalAmount,existing.originalCurrency || 'AUD');
      confirmDestructive({
        title:'Delete reservation',
        tone:editorTone || RESERVATION_TONES[body.dataset.type] || 'blue',
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
        // Core save resolves the exact dated stay, blocks missing/overlapping/incomplete
        // Destination Budgets and derives AUD from the stay's fixed rate when possible.
        stateService.commit(draft => {
          const saved = saveReservationDraft(draft, { reservationId:existing?.id || null, fields:formDraft }, { now:stateService.now });
          draft.ui.reservationType = saved.type;
          if (saved.status !== 'to-book' && String(saved.dateTime || '').slice(0, 10) < String(currentDate || '')) draft.ui.reservationCompletedOpen = true;
        });
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) { error.textContent = err.message; }
    }}
  );

  const reservationTone = RESERVATION_TONES[existing?.type || initialType] || 'blue';
  modal = createModal({ title:existing ? 'Edit Reservation' : 'Add Reservation', body, actions, className:`tcc-editor-modal tcc-reservation-editor-modal tone-${existing ? (editorTone || reservationTone) : 'sky'}` });
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
  if (record.originalCurrency !== 'AUD' || Number(record.originalAmount) !== Number(record.audAmount)) wrap.append(node('small', '', formatMoney(record.audAmount, 'AUD')));
  return wrap;
}

function reservationRow(record, openEditor) {
  const button = node('button', 'reservation-row');
  button.type = 'button';
  button.addEventListener('click', () => openEditor(record.id));
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

function healthPanel(model) {
  const panel = node('section', `reservation-panel reservation-health reservation-health-${model.health.status}`);
  const head = node('div', 'reservation-section-head');
  head.append(node('h2', '', 'Reservation Health Check'), node('strong', 'reservation-health-status', model.health.status === 'verified' ? 'Verified' : 'Needs Attention'));
  panel.append(head);
  if (!model.health.issues.length) panel.append(node('p', 'reservation-health-copy', 'No duplicate, overdue To Book, Destination Budget repair, or missing AUD-equivalent issues detected.'));
  else {
    const list = node('ul', 'reservation-health-issues');
    for (const issue of model.health.issues) list.append(node('li', '', issue));
    panel.append(list);
  }
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
  return RESERVATION_TABS.flatMap(([type])=>buildReservationsViewModel(state,currentDate,{activeType:type}).upcoming)
    .sort((a,b)=>String(a.dateTime||'9999').localeCompare(String(b.dateTime||'9999'))||a.title.localeCompare(b.title));
}

function nextUpcomingExpandedBody(state,currentDate,openEditor) {
  return reservationPanelExpandedBody('Next 20 Across All Categories',allUpcomingPresented(state,currentDate).slice(0,20),openEditor);
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
    const records=booked.filter(record=>record.type===type);
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

function reservationAllFuture(state,currentDate){ return (state.reservations||[]).filter(r=>r.dateTime&&String(r.dateTime).slice(0,10)>=String(currentDate)&&r.status!=='to-book').sort((a,b)=>String(a.dateTime).localeCompare(String(b.dateTime))).slice(0,5); }

function shortReservationDate(value){
  const date=String(value||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date not set';
  return new Date(`${date}T00:00:00Z`).toLocaleString('en-AU',{day:'2-digit',month:'short',timeZone:'UTC'});
}

function reservationTabMeta(state,currentDate,type){
  const today=String(currentDate).slice(0,10);
  const records=(state.reservations||[]).filter(record=>record.type===type);
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

function renderNextFive(state,currentDate,openEditor){
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
    const typeLabel=RESERVATION_TABS.find(([type])=>type===r.type)?.[1]||r.type;
    const time=String(r.dateTime||'').match(/T(\d{2}:\d{2})/)?.[1]||'';
    copy.append(node('strong','',r.title),node('small','',[typeLabel,itinerary?.name,time].filter(Boolean).join(' · ')));
    if(r.needsBudgetRepair) copy.append(node('small','reservation-rail-repair','BUDGET REPAIR REQUIRED'));
    const chevron=node('span','reservation-rail-chevron'); chevron.append(createLineIcon('chevronRight'));
    row.append(badge,copy,chevron);
    row.setAttribute('aria-label', ['Open reservation', r.title, formatAUDate(date), time, typeLabel, itinerary?.name, r.needsBudgetRepair ? 'Destination Budget repair required' : ''].filter(Boolean).join(' · '));
    row.addEventListener('click',()=>openEditor(r.id)); list.append(row);
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
  const addGroup=(title,records,empty)=>{
    const section=node('section','reservation-category-expanded-group');
    const head=node('div','reservation-section-head');head.append(node('h3','',title),node('span','reservation-count',String(records.length)));section.append(head);
    const list=node('div','reservation-list');
    if(!records.length)list.append(node('p','reservation-empty',empty));
    for(const record of records)list.append(reservationRow(record,openRecord));
    section.append(list);body.append(section);
  };
  addGroup('Upcoming',model.upcoming,'No upcoming bookings in this category.');
  addGroup('Future Bookings / To Book',model.toBook,'No To Book entries in this category.');
  addGroup('Completed',model.completed,'No completed bookings in this category.');
  dialog=createModal({
    title:`${label} · All Bookings`,
    body,
    className:`tcc-expanded-modal reservation-category-expanded-modal tone-${RESERVATION_TONES[type]||'blue'}`,
    actions:[{label:'Close',onClick:d=>d.close()}]
  });
  host.append(dialog);
  dialog.addEventListener('close',()=>{dialog.remove();onSelectType?.(type);},{once:true});
  dialog.showModal();
}

export function renderReservationsScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root reservations-screen');
  main.dataset.screen = 'reservations';
  let options = { activeType:stateService.snapshot().ui?.reservationType || 'flight', completedOpen:stateService.snapshot().ui?.reservationCompletedOpen === true };
  const openEditor = (reservationId, editorTone = null) => openReservationEditor({ stateService, host:main, currentDate, reservationId, initialType:options.activeType, editorTone });

  function renderContent() {
    const state = stateService.snapshot();
    const model = buildReservationsViewModel(state, currentDate, options);
    main.replaceChildren();

    const homeModel = buildHomeViewModel(state, currentDate, { alertLimit:0, eventLimit:0 });
    main.append(createStayBanner({ currentStay:homeModel.currentStay, nextDestination:homeModel.nextDestination, navigate, className:'reservation-stay-banner' }));

    const toolbar = node('header', 'reservation-toolbar');
    const title = node('div');
    title.append(node('p', 'eyebrow', 'RESERVATIONS'), node('h1', '', 'Booked Reservations'));
    toolbar.append(title);
    main.append(toolbar);

    const tabs = node('nav', 'reservation-tabs reservation-dashboard-tabs');
    tabs.setAttribute('aria-label', 'Reservation categories');
    for (const tab of model.tabs) {
      const button = node('button', `reservation-tab reservation-tab-${tab.type}`);
      button.type = 'button';
      const active = tab.type === model.activeType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      const meta=reservationTabMeta(state,currentDate,tab.type);
      const top=node('span','reservation-tab-top');
      const tabIcon=node('span','reservation-tab-icon'); tabIcon.append(createLineIcon(tab.type));
      top.append(tabIcon,node('span','reservation-tab-label',tab.label));
      const count=node('span','reservation-tab-count'); count.append(node('strong','',String(tab.count)),node('small','',tab.count===1?'booking':'bookings'));
      const support=node('span','reservation-tab-support');
      support.append(node('strong','reservation-support-primary',meta.primary),node('small','reservation-support-secondary',meta.secondary));
      button.append(top,count,support);
      button.setAttribute('aria-label',`${tab.label}: ${tab.count} bookings. ${meta.support}`);
      button.addEventListener('click', () => {
        openReservationCategorySummary({
          stateService,
          host:main,
          currentDate,
          type:tab.type,
          onSelectType:selectedType=>{
            if(stateService.snapshot().ui?.reservationType===selectedType)return;
            stateService.commit(draft=>{draft.ui.reservationType=selectedType;});
          }
        });
      });
      tabs.append(button);
    }
    const contentGrid=node('section','reservation-reference-grid');
    const left=node('div','reservation-reference-main');
    left.append(tabs);
    const addBar=node('button','reservation-add-bar'); addBar.type='button'; addBar.append(createLineIcon('plus'),document.createTextNode(' ADD RESERVATION')); addBar.addEventListener('click',()=>openReservationEditor({stateService,host:main,currentDate,initialType:options.activeType})); left.append(addBar);
    const toBookPanel=listPanel('Future Bookings / To Book', model.toBook, 'reservation-to-book', id=>openEditor(id,'gold'), 'No To Book entries yet');
    const upcomingPanel=listPanel('Upcoming', model.upcoming, 'reservation-upcoming', id=>openEditor(id,'blue'), 'No upcoming entries yet');
    left.append(toBookPanel,upcomingPanel);
    makeExpandableCard(toBookPanel,{host:main,title:'Future Bookings / To Book',tone:'gold',bodyBuilder:()=>reservationPanelExpandedBody('Future Bookings / To Book',model.toBook,id=>openEditor(id,'gold'))});
    makeExpandableCard(upcomingPanel,{host:main,title:'Upcoming Reservations',tone:'blue',bodyBuilder:()=>reservationPanelExpandedBody('Upcoming Reservations',model.upcoming,id=>openEditor(id,'blue'))});
    const completed = document.createElement('details'); completed.className='reservation-panel reservation-completed'; completed.open=options.completedOpen; completed.addEventListener('toggle',()=>{options.completedOpen=completed.open; if(stateService.snapshot().ui?.reservationCompletedOpen===completed.open)return; stateService.commit(draft=>{draft.ui.reservationCompletedOpen=completed.open;});}); const summary=node('summary'); summary.append(node('span','','Completed'),node('span','reservation-count',String(model.completed.length))); completed.append(summary); const completedList=node('div','reservation-list'); if(!model.completed.length) completedList.append(node('p','reservation-empty','No completed entries yet')); for(const record of model.completed) completedList.append(reservationRow(record,openEditor)); completed.append(completedList);
    const health=healthPanel(model); left.append(completed,health);
    const nextFive=renderNextFive(state,currentDate,id=>openEditor(id,'red')), bookedTotal=renderBookedTotal(state);
    const rail=node('aside','reservation-reference-rail'); rail.setAttribute('aria-label','Reservation summary'); rail.append(nextFive,bookedTotal);
    makeExpandableCard(nextFive,{host:main,title:'Next 20 Upcoming',tone:'red',bodyBuilder:()=>nextUpcomingExpandedBody(state,currentDate,id=>openEditor(id,'red'))});
    makeExpandableCard(bookedTotal,{host:main,title:'Total Booked by Category',tone:'violet',bodyBuilder:()=>bookedTotalExpandedBody(state)});
    contentGrid.append(left,rail); main.append(contentGrid);

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'reservations' && pending.id && state.reservations.some(record => record.id === pending.id)) {
      const target = state.reservations.find(record => record.id === pending.id);
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          if (target?.type) draft.ui.reservationType = target.type;
          if (target?.status !== 'to-book' && String(target?.dateTime || '').slice(0, 10) < String(currentDate || '')) draft.ui.reservationCompletedOpen = true;
        });
        const liveHost = document.querySelector('[data-screen="reservations"]');
        if (liveHost) openReservationEditor({ stateService, host:liveHost, currentDate, reservationId:pending.id, initialType:target?.type || options.activeType, editorTone:pending.editorTone || null });
      });
    }
  }

  renderContent();
  return main;
}
