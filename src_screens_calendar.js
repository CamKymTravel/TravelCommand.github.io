import { buildCalendarViewModel, shiftCalendarMonth } from './src_core_calendar-view-model.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { saveCalendarEventDraft, deleteCalendarEventDraft, PERSONAL_CALENDAR_TYPES } from './src_core_calendar-event-mutations.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';
import { formatAUDate, toISODate } from './src_core_dates.js';
import { createLineIcon } from './src_components_icons.js';


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
      .map(item => ({ value:item.id, label:`${item.name} · ${formatAUDate(item.startDate)} → ${formatAUDate(item.endDate)}` }))
  ];
}

function splitCalendarDateTime(value, fallbackDate='') {
  const text=String(value||'').trim();
  return { date:text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || fallbackDate, time:text.match(/T(\d{2}:\d{2})/)?.[1] || '' };
}

function openPersonalEventEditor({ stateService, host, currentDate, eventId = null, initialType = 'reminder', editorTone = null }) {
  const state = stateService.snapshot();
  const existing = eventId ? state.calendarEvents.find(item => item.id === eventId && !item.reservationId) : null;
  if (eventId && !existing) return;
  const type = PERSONAL_CALENDAR_TYPES.includes(existing?.type) ? existing.type : initialType;
  const existingDateTime=splitCalendarDateTime(existing?.dateTime || existing?.date, currentDate);
  const savedValue = {
    type,
    title:existing?.title || '',
    date:existingDateTime.date,
    time:existingDateTime.time,
    itineraryId:existing?.itineraryId || '',
    notes:existing?.notes || existing?.note || ''
  };
  const formSession = new FormSession(savedValue);

  const body = node('div', 'calendar-editor');
  const typeTiles = node('div', 'calendar-type-tiles');
  typeTiles.setAttribute('role', 'group');
  typeTiles.setAttribute('aria-label', 'Reminder or note type');
  const fields = node('div', 'calendar-form-grid');
  const error = node('p', 'calendar-form-error');
  body.append(typeTiles, fields, error);

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }
  function capture() {
    return {
      type:body.dataset.type,
      title:value('title'),
      date:value('date'),
      time:value('time'),
      itineraryId:value('itineraryId') || null,
      notes:value('notes')
    };
  }
  function renderTypes() {
    typeTiles.replaceChildren();
    for (const eventType of PERSONAL_CALENDAR_TYPES) {
      const button = node('button', `calendar-type-tile calendar-type-${eventType}`, TYPE_LABELS[eventType]);
      button.type = 'button';
      button.dataset.eventType = eventType;
      const active = body.dataset.type === eventType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => preserveLocalFocus(() => { body.dataset.type = eventType; if (existing && !editorTone) setModalTone(modal, eventType === 'reminder' ? 'violet' : 'sky'); renderTypes(); }));
      typeTiles.append(button);
    }
  }
  function populate(saved) {
    body.dataset.type = PERSONAL_CALENDAR_TYPES.includes(saved.type) ? saved.type : 'reminder';
    error.textContent = '';
    renderTypes();
    fields.replaceChildren(
      inputField('Title', 'title', 'text', saved.title),
      inputField('Date', 'date', 'date', saved.date),
      inputField('Time (optional)', 'time', 'time', saved.time),
      selectField('Destination / Trip', 'itineraryId', itineraryOptions(state), saved.itineraryId || ''),
      textAreaField('Notes', 'notes', saved.notes)
    );
  }
  let modal = null;
  populate(savedValue);

  const existingDeleteParts = existing ? splitCalendarDateTime(existing.dateTime || existing.date) : { date:'', time:'' };
  const existingDeleteStay = existing?.itineraryId ? state.itinerary.find(item => item.id === existing.itineraryId) : null;
  const existingDeleteContext = existing ? [
    TYPE_LABELS[existing.type] || 'Calendar item',
    existingDeleteParts.date ? formatAUDate(existingDeleteParts.date) : null,
    existingDeleteParts.time || null,
    existingDeleteStay ? `${existingDeleteStay.name} · ${formatAUDate(existingDeleteStay.startDate)} – ${formatAUDate(existingDeleteStay.endDate)}` : null
  ].filter(Boolean).join(' · ') : '';

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete calendar event',
        message:`Delete ${existing.title}${existingDeleteContext ? ` · ${existingDeleteContext}` : ''}? This cannot be undone.`,
        onConfirm:() => {
          stateService.commit(draft => deleteCalendarEventDraft(draft, existing.id));
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
        stateService.commit(draft => {
          const saved = saveCalendarEventDraft(draft, { eventId:existing?.id || null, fields:formDraft }, { now:stateService.now });
          const savedDate = String(saved.dateTime || saved.date || '').slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(savedDate)) draft.ui.calendarMonth = savedDate.slice(0, 7);
        });
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) { error.textContent = err.message; }
    }}
  );

  modal = createModal({ title:existing ? 'Edit Calendar Event' : 'Add Reminder / Note', body, actions, className:`tcc-editor-modal tone-${existing ? (editorTone || (body.dataset.type === 'reminder' ? 'violet' : 'sky')) : 'sky'}` });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function setEventColour(element, event) {
  element.style.setProperty('--calendar-color', event.color);
  element.style.setProperty('--calendar-rgb', event.rgb);
}

const CALENDAR_MATERIAL_RGB = Object.freeze({
  sky:[88,188,255], blue:[93,141,255], indigo:[128,109,255], teal:[70,217,202], green:[74,210,139],
  magenta:[241,101,189], violet:[184,109,255], red:[244,101,101], orange:[255,154,90], gold:[255,209,91]
});

function calendarMaterialTone(event) {
  const values = String(event?.rgb || '').split(',').map(Number);
  if (values.length !== 3 || values.some(value => !Number.isFinite(value))) return 'blue';
  let winner = 'blue'; let best = Infinity;
  for (const [tone, rgb] of Object.entries(CALENDAR_MATERIAL_RGB)) {
    const distance = rgb.reduce((sum, value, index) => sum + ((value - values[index]) ** 2), 0);
    if (distance < best) { best = distance; winner = tone; }
  }
  return winner;
}

function openCalendarItem(event, { navigate, openPersonal, editorTone = null }) {
  const tone = editorTone || calendarMaterialTone(event);
  if (event.sourceCollection === 'calendarEvents') return openPersonal(event.sourceId, tone);
  if (event.sourceCollection === 'reservations') return navigate?.('reservations', { collection:'reservations', id:event.sourceId, editorTone:tone });
  if (event.sourceCollection === 'itinerary') return navigate?.('itinerary', { collection:'itinerary', id:event.sourceId, editorTone:tone });
}

function monthEventButton(event, handlers) {
  const isPeriod = event.kind === 'destination-period' || event.kind === 'travel-period';
  const button = node('button', isPeriod ? 'calendar-period-strip' : 'calendar-event-chip');
  button.type = 'button';
  button.dataset.kind = event.kind;
  button.dataset.segment = event.segment;
  const accessibleDate = isPeriod
    ? `${formatAUDate(event.startDate)} – ${formatAUDate(event.endDate)}`
    : formatAUDate(event.cellDate || event.startDate);
  const cellContext = isPeriod && event.cellDate ? `Calendar day ${formatAUDate(event.cellDate)}` : '';
  const accessibleTime = event.dateTime ? splitCalendarDateTime(event.dateTime).time : '';
  button.title = [event.title, event.subtitle, accessibleDate, cellContext, accessibleTime].filter(Boolean).join(' · ');
  button.setAttribute('aria-label', ['Open calendar item', event.title, event.subtitle, accessibleDate, cellContext, accessibleTime].filter(Boolean).join(' · '));
  setEventColour(button, event);
  let visibleTitle=event.title;
  if(isPeriod){
    // Long destination/travel periods remain visible as coloured strips, but
    // the place name is printed only at the start, on the first of a month,
    // and on Mondays. This keeps the month view readable without repeating
    // “Athens” or “Budapest” in every single day cell.
    const date=String(event.cellDate||event.startDate||'');
    const weekday=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(`${date}T00:00:00Z`).getUTCDay():null;
    const showLabel=event.segment==='start'||date.endsWith('-01')||weekday===1;
    visibleTitle=showLabel?event.title:'';
    if(!showLabel)button.classList.add('calendar-period-continuation');
  }
  const text=node('span','',visibleTitle);
  if(!visibleTitle)text.setAttribute('aria-hidden','true');
  button.append(text);
  button.addEventListener('click', () => openCalendarItem(event, handlers));
  return button;
}

function openCalendarDayItems(cell, handlers) {
  const body = node('div', 'calendar-day-overflow-list');
  const dialog = createModal({
    title:`${formatAUDate(cell.date)} · Calendar items`,
    body,
    actions:[{ label:'Close', onClick:d=>d.close() }],
    className:'tone-blue calendar-day-overflow-modal'
  });
  const closeThen = action => (...args) => {
    if (dialog.isConnected && dialog.open) dialog.close();
    queueMicrotask(() => action?.(...args));
  };
  const modalHandlers = {
    navigate:closeThen(handlers.navigate),
    openPersonal:closeThen(handlers.openPersonal),
    editorTone:'blue'
  };
  for (const event of cell.events) body.append(monthEventButton(event, modalHandlers));
  handlers.host?.append(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once:true });
  dialog.showModal();
}

function renderMonth(model, handlers) {
  const section = node('section', 'calendar-month-view');
  const weekdays = node('div', 'calendar-weekdays');
  for (const weekday of model.weekdays) weekdays.append(node('div', '', weekday));
  section.append(weekdays);

  const grid = node('div', 'calendar-grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', `${model.monthLabel} month calendar`);
  for (const cell of model.cells) {
    const day = node('section', 'calendar-day');
    day.dataset.inMonth = String(cell.inMonth);
    day.dataset.today = String(cell.isToday);
    // A named <section> has an implicit region role, which would put all 42
    // month cells into VoiceOver's landmark rotor. Preserve the exact date as
    // the accessible name but use a non-landmark group for each calendar day.
    day.setAttribute('role', 'group');
    day.setAttribute('aria-label', formatAUDate(cell.date));
    const dateHead = node('div', 'calendar-day-head');
    dateHead.append(node('span', 'calendar-day-number', String(cell.displayDay)));
    if (cell.isToday) dateHead.append(node('small', '', 'Today'));
    day.append(dateHead);
    const events = node('div', 'calendar-day-events');
    if (!cell.events.length && cell.inMonth) events.append(node('span', 'calendar-day-empty', ''));

    // Avoid a nested vertical scroller inside every busy month cell. On iPad
    // that competes with the page scroll and makes small entries difficult to
    // reach. Keep the approved compact reference treatment: two exact items,
    // then one explicit “+ more on this day” control that exposes the complete
    // dated list in a modal.
    const visible = cell.events.length > 3 ? cell.events.slice(0, 2) : cell.events;
    for (const event of visible) events.append(monthEventButton(event, handlers));
    if (visible.length < cell.events.length) {
      const hiddenCount = cell.events.length - visible.length;
      const more = node('button', 'calendar-more-button', `+${hiddenCount} more on this day`);
      more.type = 'button';
      more.setAttribute('aria-label', `Show ${hiddenCount} more calendar ${hiddenCount === 1 ? 'item' : 'items'} on ${formatAUDate(cell.date)}`);
      more.addEventListener('click', () => openCalendarDayItems(cell, handlers));
      events.append(more);
    }
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
  button.setAttribute('aria-label', ['Open calendar item', event.title, event.subtitle, event.displayDate, event.displayTime].filter(Boolean).join(' · '));
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

function calendarLegendExpandedBody(model, kind, handlers) {
  const body=node('div',`calendar-legend-expanded calendar-legend-expanded-${kind}`);
  const records=model.agenda.filter(event=>{
    if(kind==='periods')return event.kind==='destination-period'||event.kind==='travel-period';
    if(kind==='reservations')return event.kind==='reservation';
    return event.kind==='personal';
  });
  const heading={periods:'Destination & Travel Periods',reservations:'Reservations',personal:'Reminders & Notes'}[kind]||'Calendar items';
  body.append(node('p','calendar-legend-expanded-copy',`${heading} in ${model.monthLabel}. Tap any row below to open its source record.`));
  const list=node('div','calendar-legend-expanded-list');
  if(!records.length)list.append(node('p','calendar-empty','No entries yet'));
  for(const event of records){
    const row=node('button','calendar-legend-expanded-row');
    row.type='button';
    row.append(node('strong','',event.title),node('span','',[event.subtitle,event.displayDate,event.displayTime].filter(Boolean).join(' · ')));
    if(event.notes)row.append(node('small','',event.notes));
    setEventColour(row,event);
    row.setAttribute('aria-label',['Open calendar item',event.title,event.subtitle,event.displayDate,event.displayTime].filter(Boolean).join(' · '));
    row.addEventListener('click',()=>openCalendarItem(event,handlers));
    list.append(row);
  }
  body.append(list);
  return body;
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

    const homeModel = buildHomeViewModel(state, currentDate, { alertLimit:0, eventLimit:0 });
    main.append(createStayBanner({ currentStay:homeModel.currentStay, nextDestination:homeModel.nextDestination, navigate, className:'calendar-stay-banner' }));

    const controls = node('section', 'calendar-controls');
    const monthNav = node('div', 'calendar-month-nav');
    const previous = node('button', 'button calendar-nav-button'); previous.append(createLineIcon('chevronLeft'));
    previous.type = 'button';
    previous.setAttribute('aria-label', `Previous month from ${model.monthLabel}`);
    previous.addEventListener('click', () => setUI({ calendarMonth:shiftCalendarMonth(model.selectedMonth, -1) }));
    const label = node('strong', 'calendar-month-label', model.monthLabel);
    const next = node('button', 'button calendar-nav-button'); next.append(createLineIcon('chevronRight'));
    next.type = 'button';
    next.setAttribute('aria-label', `Next month from ${model.monthLabel}`);
    next.addEventListener('click', () => setUI({ calendarMonth:shiftCalendarMonth(model.selectedMonth, 1) }));
    const today = node('button', 'button calendar-today', 'Today');
    today.type = 'button';
    today.setAttribute('aria-label', `Today · current view ${model.monthLabel}`);
    today.addEventListener('click', () => setUI({ calendarMonth:currentDate.slice(0, 7) }));
    monthNav.append(today, previous, label, next);

    const inlineActions = node('div', 'calendar-inline-actions');
    const local = node('span', 'calendar-local-status', 'Sync Check · Local Only');
    const add = node('button', 'button calendar-add');
    add.append(createLineIcon('plus'), document.createTextNode(' NOTE'));
    add.type = 'button';
    add.setAttribute('aria-label', 'Add reminder or note');
    add.addEventListener('click', () => openPersonalEventEditor({ stateService, host:main, currentDate }));
    inlineActions.append(local, add);

    const viewSwitch = node('div', 'calendar-view-switch');
    viewSwitch.setAttribute('role', 'group');
    viewSwitch.setAttribute('aria-label', 'Calendar view');
    for (const [view, viewLabel] of [['month','Month'],['agenda','Agenda']]) {
      const button = node('button', 'calendar-view-button', viewLabel);
      button.type = 'button';
      const active = model.view === view;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => setUI({ calendarView:view }));
      viewSwitch.append(button);
    }
    controls.append(monthNav, inlineActions, viewSwitch);
    main.append(controls);

    const handlers = {
      host:main,
      navigate,
      openPersonal:(eventId, editorTone=null) => openPersonalEventEditor({ stateService, host:main, currentDate, eventId, editorTone })
    };

    const legend=node('section','calendar-reference-legend');
    const legendItems=[
      ['periods','Destination / Travel Periods',model.counts.itinerary,'itinerary'],
      ['reservations','Reservations',model.counts.reservations,'flight'],
      ['personal','Reminders & Notes',model.counts.personal,'calendar']
    ];
    const legendTones={periods:'teal',reservations:'blue',personal:'violet'};
    for(const [kind,labelText,value,iconName] of legendItems){
      const item=node('div',`calendar-legend-item calendar-legend-${kind}`);
      const swatch=node('span','calendar-legend-swatch');swatch.append(createLineIcon(iconName));
      item.append(swatch,node('strong','',labelText),node('small','',String(value)));legend.append(item);
      makeExpandableCard(item,{host:main,title:labelText,tone:legendTones[kind]||'blue',bodyBuilder:()=>calendarLegendExpandedBody(model,kind,handlers)});
    }
    main.append(legend);

    main.append(model.view === 'agenda' ? renderAgenda(model, handlers) : renderMonth(model, handlers));

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'calendarEvents' && pending.id && state.calendarEvents.some(item => item.id === pending.id && !item.reservationId)) {
      const target = state.calendarEvents.find(item => item.id === pending.id && !item.reservationId);
      const targetMonth = target ? toISODate(target.dateTime || target.date).slice(0, 7) : null;
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          if (targetMonth) draft.ui.calendarMonth = targetMonth;
        });
        const liveHost = document.querySelector('[data-screen="calendar"]');
        if (liveHost) openPersonalEventEditor({ stateService, host:liveHost, currentDate, eventId:pending.id, editorTone:pending.editorTone || null });
      });
    }
  }

  renderContent();
  return main;
}
