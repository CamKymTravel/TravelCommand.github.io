import { buildCalendarViewModel, shiftCalendarMonth } from './src_core_calendar-view-model.js';
import { saveCalendarEventDraft, deleteCalendarEventDraft, PERSONAL_CALENDAR_TYPES } from './src_core_calendar-event-mutations.js';
import { createModal } from './src_components_modal.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';

const TYPE_LABELS = Object.freeze({ reminder:'Reminder', note:'Note' });

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function inputField(label, name, type = 'text', value = '') {
  const wrap = node('label', 'calendar-field');
  wrap.append(node('span', '', label));
  const input = document.createElement('input');
  input.name = name;
  input.type = type;
  input.value = value ?? '';
  wrap.append(input);
  return wrap;
}

function selectField(label, name, options, value = '') {
  const wrap = node('label', 'calendar-field');
  wrap.append(node('span', '', label));
  const select = document.createElement('select');
  select.name = name;
  for (const option of options) {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    element.selected = option.value === value;
    select.append(element);
  }
  wrap.append(select);
  return wrap;
}

function textAreaField(label, name, value = '') {
  const wrap = node('label', 'calendar-field calendar-field-wide');
  wrap.append(node('span', '', label));
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.rows = 4;
  textarea.value = value ?? '';
  wrap.append(textarea);
  return wrap;
}

function itineraryOptions(state) {
  return [
    { value:'', label:'No linked destination / trip' },
    ...[...state.itinerary]
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
      .map(item => ({ value:item.id, label:`${item.name} · ${item.startDate}` }))
  ];
}

function openPersonalEventEditor({ stateService, host, currentDate, eventId = null, initialType = 'reminder' }) {
  const state = stateService.snapshot();
  const existing = eventId ? state.calendarEvents.find(item => item.id === eventId && !item.reservationId) : null;
  if (eventId && !existing) return;
  const type = PERSONAL_CALENDAR_TYPES.includes(existing?.type) ? existing.type : initialType;
  const savedValue = {
    type,
    title:existing?.title || '',
    dateTime:existing?.dateTime || existing?.date || `${currentDate}T09:00`,
    itineraryId:existing?.itineraryId || '',
    notes:existing?.notes || existing?.note || ''
  };
  const formSession = new FormSession(savedValue);

  const body = node('div', 'calendar-editor');
  const typeTiles = node('div', 'calendar-type-tiles');
  const fields = node('div', 'calendar-form-grid');
  const error = node('p', 'calendar-form-error');
  body.append(typeTiles, fields, error);

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }
  function capture() {
    return {
      type:body.dataset.type,
      title:value('title'),
      dateTime:value('dateTime'),
      itineraryId:value('itineraryId') || null,
      notes:value('notes')
    };
  }
  function renderTypes() {
    typeTiles.replaceChildren();
    for (const eventType of PERSONAL_CALENDAR_TYPES) {
      const button = node('button', 'calendar-type-tile', TYPE_LABELS[eventType]);
      button.type = 'button';
      const active = body.dataset.type === eventType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => { body.dataset.type = eventType; renderTypes(); });
      typeTiles.append(button);
    }
  }
  function populate(saved) {
    body.dataset.type = PERSONAL_CALENDAR_TYPES.includes(saved.type) ? saved.type : 'reminder';
    error.textContent = '';
    renderTypes();
    fields.replaceChildren(
      inputField('Title', 'title', 'text', saved.title),
      inputField('Date & Time', 'dateTime', 'datetime-local', saved.dateTime),
      selectField('Destination / Trip', 'itineraryId', itineraryOptions(state), saved.itineraryId || ''),
      textAreaField('Notes', 'notes', saved.notes)
    );
  }
  populate(savedValue);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete calendar event',
        message:`Delete ${existing.title}? This cannot be undone.`,
        onConfirm:() => {
          try {
            stateService.commit(draft => deleteCalendarEventDraft(draft, existing.id));
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
        stateService.commit(draft => saveCalendarEventDraft(draft, { eventId:existing?.id || null, fields:formDraft }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) { error.textContent = err.message; }
    }}
  );

  const modal = createModal({ title:existing ? 'Edit Calendar Event' : 'Add Reminder / Note', body, actions });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function setEventColour(element, event) {
  element.style.setProperty('--calendar-color', event.color);
  element.style.setProperty('--calendar-rgb', event.rgb);
}

function openCalendarItem(event, { navigate, openPersonal }) {
  if (event.sourceCollection === 'calendarEvents') return openPersonal(event.sourceId);
  if (event.sourceCollection === 'reservations') return navigate?.('reservations', { collection:'reservations', id:event.sourceId });
  if (event.sourceCollection === 'itinerary') return navigate?.('itinerary', { collection:'itinerary', id:event.sourceId });
}

function monthEventButton(event, handlers) {
  const isPeriod = event.kind === 'destination-period' || event.kind === 'travel-period';
  const button = node('button', isPeriod ? 'calendar-period-strip' : 'calendar-event-chip');
  button.type = 'button';
  button.dataset.kind = event.kind;
  button.dataset.segment = event.segment;
  button.title = [event.title, event.subtitle].filter(Boolean).join(' · ');
  setEventColour(button, event);
  button.append(node('span', '', event.title));
  button.addEventListener('click', () => openCalendarItem(event, handlers));
  return button;
}

function renderMonth(model, handlers) {
  const section = node('section', 'calendar-month-view');
  const weekdays = node('div', 'calendar-weekdays');
  for (const weekday of model.weekdays) weekdays.append(node('div', '', weekday));
  section.append(weekdays);

  const grid = node('div', 'calendar-grid');
  for (const cell of model.cells) {
    const day = node('section', 'calendar-day');
    day.dataset.inMonth = String(cell.inMonth);
    day.dataset.today = String(cell.isToday);
    day.setAttribute('aria-label', cell.date);
    const dateHead = node('div', 'calendar-day-head');
    dateHead.append(node('span', 'calendar-day-number', String(cell.displayDay)));
    if (cell.isToday) dateHead.append(node('small', '', 'Today'));
    day.append(dateHead);
    const events = node('div', 'calendar-day-events');
    if (!cell.events.length && cell.inMonth) events.append(node('span', 'calendar-day-empty', ''));
    for (const event of cell.events) events.append(monthEventButton(event, handlers));
    day.append(events);
    grid.append(day);
  }
  section.append(grid);
  return section;
}

function agendaRow(event, handlers) {
  const button = node('button', 'calendar-agenda-row');
  button.type = 'button';
  button.dataset.kind = event.kind;
  setEventColour(button, event);
  const marker = node('span', 'calendar-agenda-marker');
  const copy = node('span', 'calendar-agenda-copy');
  copy.append(node('strong', '', event.title));
  if (event.subtitle) copy.append(node('small', '', event.subtitle));
  if (event.notes) copy.append(node('small', 'calendar-agenda-note', event.notes));
  const date = node('span', 'calendar-agenda-date');
  date.append(node('strong', '', event.displayDate));
  if (event.displayTime) date.append(node('small', '', event.displayTime));
  button.append(marker, copy, date);
  button.addEventListener('click', () => openCalendarItem(event, handlers));
  return button;
}

function renderAgenda(model, handlers) {
  const section = node('section', 'calendar-agenda-view');
  const head = node('div', 'calendar-section-head');
  head.append(node('h2', '', `${model.monthLabel} Agenda`), node('span', 'calendar-count', String(model.agenda.length)));
  section.append(head);
  const list = node('div', 'calendar-agenda-list');
  if (!model.agenda.length) list.append(node('p', 'calendar-empty', 'No entries yet'));
  for (const event of model.agenda) list.append(agendaRow(event, handlers));
  section.append(list);
  return section;
}

export function renderCalendarScreen({ stateService, currentDate, navigate }) {
  const main = node('main', 'screen-root calendar-screen');
  main.dataset.screen = 'calendar';

  function setUI(fields) {
    stateService.commit(draft => Object.assign(draft.ui, fields));
  }

  function renderContent() {
    const state = stateService.snapshot();
    const model = buildCalendarViewModel(state, currentDate);
    main.replaceChildren();

    const toolbar = node('header', 'calendar-toolbar');
    const heading = node('div');
    heading.append(node('p', 'eyebrow', 'CALENDAR'), node('h1', '', 'Calendar'));
    const actions = node('div', 'calendar-toolbar-actions');
    const local = node('span', 'calendar-local-status', 'Local Only · No external sync');
    const add = node('button', 'button calendar-add', 'Add Reminder / Note');
    add.type = 'button';
    add.addEventListener('click', () => openPersonalEventEditor({ stateService, host:main, currentDate }));
    actions.append(local, add);
    toolbar.append(heading, actions);
    main.append(toolbar);

    const controls = node('section', 'calendar-controls');
    const monthNav = node('div', 'calendar-month-nav');
    const previous = node('button', 'button calendar-nav-button', '‹');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous month');
    previous.addEventListener('click', () => setUI({ calendarMonth:shiftCalendarMonth(model.selectedMonth, -1) }));
    const label = node('strong', 'calendar-month-label', model.monthLabel);
    const next = node('button', 'button calendar-nav-button', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next month');
    next.addEventListener('click', () => setUI({ calendarMonth:shiftCalendarMonth(model.selectedMonth, 1) }));
    const today = node('button', 'button calendar-today', 'Today');
    today.type = 'button';
    today.addEventListener('click', () => setUI({ calendarMonth:currentDate.slice(0, 7) }));
    monthNav.append(previous, label, next, today);

    const viewSwitch = node('div', 'calendar-view-switch');
    for (const [view, viewLabel] of [['month','Month'],['agenda','Agenda']]) {
      const button = node('button', 'calendar-view-button', viewLabel);
      button.type = 'button';
      const active = model.view === view;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => setUI({ calendarView:view }));
      viewSwitch.append(button);
    }
    controls.append(monthNav, viewSwitch);
    main.append(controls);

    const summary = node('section', 'calendar-summary');
    for (const [labelText, value, kind] of [
      ['Destination / Travel Periods', model.counts.itinerary, 'periods'],
      ['Reservations', model.counts.reservations, 'reservations'],
      ['Reminders & Notes', model.counts.personal, 'personal']
    ]) {
      const card = node('div', `calendar-summary-card calendar-summary-${kind}`);
      card.append(node('strong', '', String(value)), node('span', '', labelText));
      summary.append(card);
    }
    main.append(summary);

    const handlers = {
      navigate,
      openPersonal:eventId => openPersonalEventEditor({ stateService, host:main, currentDate, eventId })
    };
    main.append(model.view === 'agenda' ? renderAgenda(model, handlers) : renderMonth(model, handlers));

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'calendarEvents' && pending.id && state.calendarEvents.some(item => item.id === pending.id && !item.reservationId)) {
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => { draft.ui.pendingOpen = null; });
        const liveHost = document.querySelector('[data-screen="calendar"]');
        if (liveHost) openPersonalEventEditor({ stateService, host:liveHost, currentDate, eventId:pending.id });
      });
    }
  }

  renderContent();
  return main;
}
