import { buildReservationsViewModel, RESERVATION_TABS } from './src_core_reservations-view-model.js';
import { saveReservationDraft, deleteReservationDraft } from './src_core_reservation-mutations.js';
import { localToAUD, formatMoney } from './src_core_currency.js';
import { formatAUDate } from './src_core_dates.js';
import { createModal } from './src_components_modal.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';

const STATUS_OPTIONS = Object.freeze([
  ['paid','Paid'],
  ['unpaid','Unpaid'],
  ['booked','Booked'],
  ['to-book','To Book'],
  ['completed','Completed']
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

function itineraryOptions(state) {
  const items = [...(state.itinerary || [])].sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  return [['','No destination / annual only'], ...items.map(item => [item.id, `${item.name} · ${formatAUDate(item.startDate)}–${formatAUDate(item.endDate)}`])];
}

function linkedStay(state, itineraryId) {
  return itineraryId ? state.itinerary.find(item => item.id === itineraryId) || null : null;
}

function openReservationEditor({ stateService, host, reservationId = null, initialType = 'flight' }) {
  const state = stateService.snapshot();
  const existing = reservationId ? state.reservations.find(record => record.id === reservationId) : null;
  if (reservationId && !existing) return;

  const savedValue = {
    type:existing?.type || initialType,
    title:existing?.title || '',
    dateTime:existing?.dateTime || '',
    originalCurrency:existing?.originalCurrency || 'AUD',
    originalAmount:existing?.originalAmount ?? '',
    audAmount:existing?.audAmount ?? '',
    status:existing?.status || 'booked',
    allocation:existing?.allocation || 'annual',
    itineraryId:existing?.itineraryId || '',
    notes:existing?.notes || ''
  };
  const formSession = new FormSession(savedValue);
  const body = node('div', 'reservation-editor');
  const typeTiles = node('div', 'reservation-type-tiles');
  const allocationTiles = node('div', 'reservation-allocation-tiles');
  const fields = node('div', 'reservation-form-grid');
  const conversionHint = node('p', 'reservation-conversion-hint');
  const error = node('p', 'reservation-form-error');
  body.append(typeTiles, allocationTiles, fields, conversionHint, error);

  const value = name => body.querySelector(`[name="${name}"]`)?.value ?? '';

  function capture() {
    const allocation = body.dataset.allocation;
    return {
      type:body.dataset.type,
      title:value('title'),
      dateTime:value('dateTime') || null,
      originalCurrency:value('originalCurrency').trim().toUpperCase() || 'AUD',
      originalAmount:value('originalAmount') === '' ? 0 : Number(value('originalAmount')),
      audAmount:value('audAmount') === '' ? null : Number(value('audAmount')),
      status:value('status'),
      allocation,
      itineraryId:allocation === 'destination' ? (value('itineraryId') || null) : null,
      notes:value('notes')
    };
  }

  function renderTypes() {
    typeTiles.replaceChildren();
    for (const [type, label] of RESERVATION_TABS) {
      const button = node('button', `reservation-type-tile reservation-type-${type}`, label);
      button.type = 'button';
      const active = body.dataset.type === type;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => { body.dataset.type = type; renderTypes(); });
      typeTiles.append(button);
    }
  }

  function renderAllocations() {
    allocationTiles.replaceChildren();
    allocationTiles.append(node('span', 'reservation-allocation-label', 'Allocate cost to'));
    const grid = node('div', 'reservation-allocation-grid');
    for (const [allocation, label] of [['annual','Annual Budget'],['destination','Destination Budget']]) {
      const button = node('button', 'reservation-allocation-tile', label);
      button.type = 'button';
      const active = body.dataset.allocation === allocation;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => { body.dataset.allocation = allocation; renderAllocations(); updateHint(); });
      grid.append(button);
    }
    allocationTiles.append(grid);
  }

  function updateHint() {
    const currency = value('originalCurrency').trim().toUpperCase();
    const amount = Number(value('originalAmount'));
    const stay = linkedStay(state, value('itineraryId'));
    if (currency === 'AUD' && Number.isFinite(amount) && amount >= 0) {
      conversionHint.textContent = `${formatMoney(amount, 'AUD')} will use the same AUD amount unless you enter a different AUD equivalent.`;
    } else if (stay?.localCurrency === currency && stay?.fixedLocalPerAUD && Number.isFinite(amount) && amount >= 0) {
      conversionHint.textContent = `${formatMoney(amount, currency)} = ${formatMoney(localToAUD(amount, stay.fixedLocalPerAUD), 'AUD')} at ${stay.name}'s fixed stay rate.`;
    } else {
      conversionHint.textContent = 'Enter the AUD equivalent manually when no matching fixed stay rate applies.';
    }
  }

  function populate(saved) {
    error.textContent = '';
    body.dataset.type = saved.type;
    body.dataset.allocation = saved.allocation || 'annual';
    renderTypes();
    renderAllocations();
    fields.replaceChildren(
      inputField('Title', 'title', 'text', saved.title),
      inputField('Date & Time', 'dateTime', 'datetime-local', saved.dateTime),
      selectField('Status', 'status', STATUS_OPTIONS, saved.status),
      selectField('Destination / Trip', 'itineraryId', itineraryOptions(state), saved.itineraryId || ''),
      inputField('Original Currency', 'originalCurrency', 'text', saved.originalCurrency),
      inputField('Original Amount', 'originalAmount', 'number', saved.originalAmount),
      inputField('AUD Equivalent', 'audAmount', 'number', saved.audAmount),
      textAreaField('Notes', 'notes', saved.notes)
    );
    for (const name of ['originalCurrency','originalAmount','itineraryId']) fields.querySelector(`[name="${name}"]`)?.addEventListener('input', updateHint);
    fields.querySelector('[name="itineraryId"]')?.addEventListener('change', updateHint);
    updateHint();
  }

  populate(savedValue);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete reservation',
        message:`Delete ${existing.title}? This cannot be undone.`,
        onConfirm:() => {
          try {
            stateService.commit(draft => deleteReservationDraft(draft, existing.id));
            if (dialog.isConnected && dialog.open) dialog.close();
          } catch (err) { error.textContent = err.message; }
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
        const stay = linkedStay(state, formDraft.itineraryId);
        if (formDraft.allocation === 'destination' && !formDraft.itineraryId) throw new Error('Select a Destination / Trip for Destination Budget allocation.');
        if (formDraft.audAmount == null) {
          if (formDraft.originalCurrency === 'AUD') formDraft.audAmount = formDraft.originalAmount;
          else if (stay?.localCurrency === formDraft.originalCurrency && stay?.fixedLocalPerAUD) formDraft.audAmount = localToAUD(formDraft.originalAmount, stay.fixedLocalPerAUD);
          else throw new Error('Enter the AUD equivalent for this reservation.');
        }
        stateService.commit(draft => saveReservationDraft(draft, { reservationId:existing?.id || null, fields:formDraft }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) { error.textContent = err.message; }
    }}
  );

  const modal = createModal({ title:existing ? 'Edit Reservation' : 'Add Reservation', body, actions });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function amountBlock(record) {
  const wrap = node('span', 'reservation-amounts');
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
  const detail = [record.displayDateTime, record.itineraryName, record.allocation === 'destination' ? 'Destination Budget' : 'Annual Budget'].filter(Boolean).join(' · ');
  copy.append(node('small', '', detail));
  if (record.notes) copy.append(node('small', 'reservation-row-note', record.notes));
  const meta = node('span', 'reservation-row-meta');
  meta.append(node('span', `reservation-status reservation-status-${record.status}`, record.statusLabel), amountBlock(record));
  button.append(copy, meta);
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
  if (!model.health.issues.length) panel.append(node('p', 'reservation-health-copy', 'No duplicate, overdue To Book, or missing AUD-equivalent issues detected.'));
  else {
    const list = node('ul', 'reservation-health-issues');
    for (const issue of model.health.issues) list.append(node('li', '', issue));
    panel.append(list);
  }
  return panel;
}

export function renderReservationsScreen({ stateService, currentDate }) {
  const main = node('main', 'screen-root reservations-screen');
  main.dataset.screen = 'reservations';
  let options = { activeType:'flight', completedOpen:false };
  const openEditor = reservationId => openReservationEditor({ stateService, host:main, reservationId, initialType:options.activeType });

  function renderContent() {
    const state = stateService.snapshot();
    const model = buildReservationsViewModel(state, currentDate, options);
    main.replaceChildren();

    const toolbar = node('header', 'reservation-toolbar');
    const title = node('div');
    title.append(node('p', 'eyebrow', 'RESERVATIONS'), node('h1', '', 'Flights & Transport'));
    const add = node('button', 'button reservation-add', 'Add Reservation');
    add.type = 'button';
    add.addEventListener('click', () => openReservationEditor({ stateService, host:main, initialType:options.activeType }));
    toolbar.append(title, add);
    main.append(toolbar);

    const tabs = node('nav', 'reservation-tabs');
    tabs.setAttribute('aria-label', 'Reservation categories');
    for (const tab of model.tabs) {
      const button = node('button', 'reservation-tab');
      button.type = 'button';
      const active = tab.type === model.activeType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.append(node('span', '', tab.label), node('small', '', String(tab.count)));
      button.addEventListener('click', () => { options = { ...options, activeType:tab.type }; renderContent(); });
      tabs.append(button);
    }
    main.append(tabs);

    main.append(listPanel('Future Bookings / To Book', model.toBook, 'reservation-to-book', openEditor, 'No To Book entries yet'));
    main.append(listPanel('Upcoming', model.upcoming, 'reservation-upcoming', openEditor, 'No upcoming entries yet'));

    const completed = document.createElement('details');
    completed.className = 'reservation-panel reservation-completed';
    completed.open = options.completedOpen;
    completed.addEventListener('toggle', () => { options.completedOpen = completed.open; });
    const summary = node('summary');
    summary.append(node('span', '', 'Completed'), node('span', 'reservation-count', String(model.completed.length)));
    completed.append(summary);
    const completedList = node('div', 'reservation-list');
    if (!model.completed.length) completedList.append(node('p', 'reservation-empty', 'No completed entries yet'));
    for (const record of model.completed) completedList.append(reservationRow(record, openEditor));
    completed.append(completedList);
    main.append(completed, healthPanel(model));

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'reservations' && pending.id && state.reservations.some(record => record.id === pending.id)) {
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => { draft.ui.pendingOpen = null; });
        const liveHost = document.querySelector('[data-screen="reservations"]');
        if (liveHost) openReservationEditor({ stateService, host:liveHost, reservationId:pending.id, initialType:options.activeType });
      });
    }
  }

  renderContent();
  return main;
}
