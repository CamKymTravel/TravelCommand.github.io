import { buildCalendarViewModel, shiftCalendarMonth } from './src_core_calendar-view-model.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { createStayBanner } from './src_components_page-hero.js';
import { saveCalendarEventDraft, deleteCalendarEventDraft, PERSONAL_CALENDAR_TYPES } from './src_core_calendar-event-mutations.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';
import { formatAUDate, toISODate } from './src_core_dates.js';
import { createLineIcon } from './src_components_icons.js';
import { countryFlagEmoji } from './src_components_country.js';
import { paletteRgbText, TCC_CANONICAL_PALETTE_RGB } from './src_core_visual-palette.js';


const TYPE_LABELS = Object.freeze({ reminder:'Reminder', note:'Note' });
const PERSONAL_CALENDAR_TONES = Object.freeze({ reminder:'violet', note:'violet' });

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
  const resolvedTone = editorTone || PERSONAL_CALENDAR_TONES[type] || 'violet';

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
      button.addEventListener('click', () => preserveLocalFocus(() => { body.dataset.type = eventType; if(modal)setModalTone(modal,PERSONAL_CALENDAR_TONES[eventType]||'violet'); renderTypes(); }));
      typeTiles.append(button);
    }
  }
  function populate(saved) {
    body.dataset.type = PERSONAL_CALENDAR_TYPES.includes(saved.type) ? saved.type : 'reminder';
    error.textContent = '';
    renderTypes();
    if (modal) setModalTone(modal, PERSONAL_CALENDAR_TONES[body.dataset.type] || editorTone || 'violet');
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
        tone:resolvedTone,
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

  modal = createModal({ title:existing ? 'Edit Calendar Event' : 'Add Reminder / Note', body, actions, className:`tcc-editor-modal tcc-calendar-editor-modal tone-${resolvedTone}` });
  setModalTone(modal,resolvedTone);
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

const CALENDAR_RESERVATION_TONES = Object.freeze({ flight:'blue', train:'teal', cruise:'violet', rv:'copper', hotel:'gold', airbnb:'pink', accommodation:'gold', ticket:'rose' });
function calendarSourceRgb(event) {
  if (event?.kind === 'reservation') return paletteRgbText(CALENDAR_RESERVATION_TONES[event.reservationType] || 'blue');
  if (event?.kind === 'personal') return paletteRgbText(PERSONAL_CALENDAR_TONES[event.personalType] || 'violet');
  return event?.rgb || paletteRgbText('teal');
}

function setEventColour(element, event) {
  element.style.setProperty('--calendar-color', event.color);
  element.style.setProperty('--calendar-rgb', event.rgb);
  element.style.setProperty('--calendar-source-rgb', calendarSourceRgb(event));
  if (event?.reservationType) element.dataset.sourceType = event.reservationType;
  if (event?.personalType) element.dataset.sourceType = event.personalType;
}

const CALENDAR_MATERIAL_RGB = TCC_CANONICAL_PALETTE_RGB;

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

function openCalendarItem(event, { host, openPersonal, navigate = null, editorTone = null }) {
  const tone = editorTone || calendarMaterialTone(event);
  const body=node('section','calendar-source-detail');
  const hero=node('div','calendar-source-detail-hero');
  if(event.country){const flag=node('span','calendar-source-detail-flag',countryFlagEmoji(event.flagCountry||event.country));flag.setAttribute('aria-hidden','true');hero.append(flag);}
  const heroCopy=node('div','calendar-source-detail-hero-copy');
  heroCopy.append(node('p','eyebrow','CALENDAR ITEM'),node('h2','',event.title||'Calendar item'));
  if(event.country)heroCopy.append(node('strong','',event.country));
  hero.append(heroCopy);
  const facts=node('div','calendar-source-detail-facts');
  const fact=(label,value)=>{const item=node('div','calendar-source-detail-fact');item.append(node('small','',label),node('strong','',value||'—'));return item;};
  facts.append(
    fact('Type',event.subtitle||event.kind||'Calendar item'),
    fact('Dates',event.kind==='destination-period'||event.kind==='travel-period'?`${formatAUDate(event.startDate)} – ${formatAUDate(event.endDate)}`:formatAUDate(event.cellDate||event.startDate)),
    fact('Time',event.dateTime?splitCalendarDateTime(event.dateTime).time:'—')
  );
  body.append(hero,facts);
  if(event.notes)body.append(node('p','calendar-source-detail-note',event.notes));
  const isPersonal=event.sourceCollection==='calendarEvents';
  const sourceScreen=event.sourceCollection==='reservations'?'reservations':event.sourceCollection==='itinerary'?'itinerary':null;
  const sourceLabel=event.sourceCollection==='reservations'?'OPEN RESERVATION':event.sourceCollection==='itinerary'?'OPEN ITINERARY STAY':null;
  body.append(node('p','calendar-source-detail-menu-note',isPersonal?'This opens read-only first. Use Edit below only when you deliberately want to change this reminder or note.':sourceScreen?'Use Open below to go straight to the saved source record.':'This is a read-only calendar summary.'));
  const actions=[];
  if(isPersonal)actions.push({label:'Edit',onClick:d=>{d.close();queueMicrotask(()=>openPersonal(event.sourceId,tone));}});
  else if(sourceScreen&&sourceLabel&&typeof navigate==='function')actions.push({label:sourceLabel,onClick:d=>{d.close();queueMicrotask(()=>navigate(sourceScreen,{collection:event.sourceCollection,id:event.sourceId}));}});
  actions.push({label:'Close',onClick:d=>d.close()});
  const dialog=createModal({title:event.title||'Calendar Details',body,className:`tcc-expanded-modal tcc-expanded-inherits-source calendar-source-detail-modal tone-${tone}`,actions});
  if(event?.rgb) dialog?.style.setProperty('--tcc-expanded-rgb',event.rgb);
  if(event) dialog?.style.setProperty('--calendar-source-rgb',calendarSourceRgb(event));
  host?.append(dialog);dialog?.addEventListener('close',()=>dialog.remove(),{once:true});dialog?.showModal();
}

function openCalendarDay(cell, handlers) {
  const dayEvents=[...(cell?.events||[])];
  const body=node('div','calendar-day-detail');
  const summary=node('div','calendar-day-detail-summary');
  const dayName=new Date(`${cell.date}T12:00:00`).toLocaleDateString('en-AU',{weekday:'long'});
  summary.append(node('p','eyebrow','Day View'),node('h2','',dayName),node('span','',`${dayEvents.length} item${dayEvents.length===1?'':'s'} on this day`));
  body.append(summary);
  const list=node('div','calendar-day-detail-list');
  if(!dayEvents.length) list.append(node('p','calendar-empty','No entries yet'));
  for(const event of dayEvents){
    const row=node('button','calendar-day-detail-row'); row.type='button'; row.dataset.kind=event.kind; setEventColour(row,event);
    const marker=node('span','calendar-day-detail-marker');
    const copy=node('span','calendar-day-detail-copy');
    copy.append(node('strong','',event.title||'Calendar item'));
    const meta=[event.subtitle,event.kind==='destination-period'||event.kind==='travel-period'?`${formatAUDate(event.startDate)} – ${formatAUDate(event.endDate)}`:formatAUDate(event.cellDate||event.startDate),event.dateTime?splitCalendarDateTime(event.dateTime).time:''].filter(Boolean).join(' · ');
    copy.append(node('small','',meta)); if(event.notes)copy.append(node('small','calendar-day-detail-note',event.notes));
    row.append(marker,copy,node('b','calendar-day-detail-open','OPEN'));
    row.setAttribute('aria-label',`Open ${event.title||'calendar item'} from ${formatAUDate(cell.date)}`);
    row.addEventListener('click',()=>{row.closest('dialog')?.close();queueMicrotask(()=>openCalendarItem(event,handlers));});
    list.append(row);
  }
  body.append(list);
  const dialog=createModal({title:formatAUDate(cell.date),body,className:'tcc-expanded-modal tcc-expanded-inherits-source calendar-day-detail-modal tone-neutral',actions:[{label:'Close',onClick:d=>d.close()}]});
  handlers.host?.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
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
  button.setAttribute('aria-label', ['Calendar item', event.title, event.subtitle, accessibleDate, cellContext, accessibleTime].filter(Boolean).join(' · '));
  setEventColour(button, event);
  let visibleTitle=event.title;
  if(isPeriod){
    // Long destination/travel periods remain visible as coloured strips, but
    // the place name is printed only at the start or on the first of a month.
    // This keeps the month view readable without repeating
    // “Athens” or “Budapest” in every single day cell.
    const date=String(event.cellDate||event.startDate||'');
    const showLabel=event.segment==='start'||date.endsWith('-01');
    visibleTitle=showLabel?event.title:'';
    if(!showLabel)button.classList.add('calendar-period-continuation');
  }
  const text=node('span','calendar-event-title',visibleTitle);
  if(!visibleTitle)text.setAttribute('aria-hidden','true');
  if(!isPeriod && accessibleTime) button.append(node('small','calendar-event-time',accessibleTime));
  button.append(text);
  button.addEventListener('click', clickEvent => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    openCalendarItem(event, handlers);
  });
  return button;
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
    // Do not expose the whole day cell as a button because it contains real
    // event buttons. Nested interactive roles are confusing in VoiceOver. The
    // date header is the explicit keyboard/VoiceOver day-view control, while a
    // direct tap on unused cell space still opens the same complete day view.
    day.setAttribute('role', 'group');
    day.setAttribute('aria-label', `${formatAUDate(cell.date)} · ${cell.events.length} item${cell.events.length===1?'':'s'}`);
    day.addEventListener('click', () => openCalendarDay(cell, handlers));
    const dateHead = node('button', 'calendar-day-head calendar-day-open');
    dateHead.type='button';
    dateHead.setAttribute('aria-label', `Open ${formatAUDate(cell.date)} day view · ${cell.events.length} item${cell.events.length===1?'':'s'}`);
    dateHead.append(node('span', 'calendar-day-number', String(cell.displayDay)));
    if (cell.isToday) dateHead.append(node('small', '', 'Today'));
    dateHead.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openCalendarDay(cell, handlers); });
    const periodEvents = cell.events.filter(event => event.kind === 'destination-period' || event.kind === 'travel-period');
    const datedEvents = cell.events.filter(event => event.kind !== 'destination-period' && event.kind !== 'travel-period');
    if (periodEvents.length) {
      const visiblePeriods = periodEvents.slice(0, 2);
      const rail = node('div', 'calendar-period-rail');
      rail.dataset.count = String(visiblePeriods.length);
      rail.setAttribute('aria-label', `${formatAUDate(cell.date)} travel and destination periods`);
      for (const periodEvent of visiblePeriods) {
        // The visible Calendar period rail is the exact record control. Keep the
        // coloured strip visually thin, but never make it a decorative span:
        // Kym can tap the strip itself to open that destination/travel record.
        const line=node('button','calendar-period-line');
        line.type='button';
        line.dataset.kind=periodEvent.kind; line.dataset.segment=periodEvent.segment || '';
        const range=`${formatAUDate(periodEvent.startDate)} – ${formatAUDate(periodEvent.endDate)}`;
        line.title=[periodEvent.title,periodEvent.subtitle,range].filter(Boolean).join(' · ');
        line.setAttribute('aria-label', ['Open',periodEvent.title,periodEvent.subtitle,range].filter(Boolean).join(' · '));
        setEventColour(line,periodEvent);
        line.addEventListener('click', clickEvent => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          openCalendarItem(periodEvent, handlers);
        });
        rail.append(line);
      }
      day.append(rail);
    }
    day.append(dateHead);
    const events = node('div', 'calendar-day-events');
    if (!datedEvents.length && !periodEvents.length && cell.inMonth) events.append(node('span', 'calendar-day-empty', ''));

    // Real-iPad closure: Kym needs to see the day's useful content without
    // opening a detail view for ordinary busy days. Show up to five dated
    // items and let the week row grow vertically; only overflow beyond five
    // collapses behind the explicit +more control. Destination/travel periods
    // remain thin colour rails at the top of the cell.
    const visibleEvents = datedEvents.slice(0, 5);
    for (const event of visibleEvents) events.append(monthEventButton(event, handlers));
    const hiddenCount = Math.max(0, datedEvents.length - visibleEvents.length);
    if (hiddenCount) {
      const more = node('button', 'calendar-more-button', `+${hiddenCount} more`);
      more.type = 'button';
      more.setAttribute('aria-label', `Open ${formatAUDate(cell.date)} day view · ${datedEvents.length} dated items`);
      more.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openCalendarDay(cell, handlers); });
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
  const flag = event.country ? node('span','calendar-agenda-flag',countryFlagEmoji(event.flagCountry||event.country)) : null;
  if(flag)flag.setAttribute('aria-hidden','true');
  const copy = node('span', 'calendar-agenda-copy');
  copy.append(node('strong', '', event.title));
  if (event.subtitle) copy.append(node('small', '', event.subtitle));
  if (event.notes) copy.append(node('small', 'calendar-agenda-note', event.notes));
  const date = node('span', 'calendar-agenda-date');
  date.append(node('strong', '', event.displayDate));
  if (event.displayTime) date.append(node('small', '', event.displayTime));
  button.append(marker); if(flag)button.append(flag); button.append(copy, date);
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
  body.append(node('p','calendar-legend-expanded-copy',`${heading} in ${model.monthLabel}. Tap any row below to open its calendar details here.`));
  const list=node('div','calendar-legend-expanded-list');
  if(!records.length)list.append(node('p','calendar-empty','No entries yet'));
  for(const event of records){
    const row=node('button','calendar-legend-expanded-row');
    row.type='button';
    row.append(node('strong','',event.title),node('span','',[event.subtitle,event.displayDate,event.displayTime].filter(Boolean).join(' · ')));
    if(event.notes)row.append(node('small','',event.notes));
    setEventColour(row,event);
    row.setAttribute('aria-label',['Open calendar item',event.title,event.subtitle,event.displayDate,event.displayTime].filter(Boolean).join(' · '));
    row.addEventListener('click',()=>{row.closest('dialog')?.close();queueMicrotask(()=>openCalendarItem(event,handlers));});
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

    // Locked shared active-stay header: Calendar uses the same country/travel-
    // mode artwork, focal position and current/next destination orientation as
    // Itinerary, Budget and Reservations. Keeping this here (rather than a
    // Calendar-only image) prevents country-photo crop drift between screens.
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
    const add = node('button', 'button calendar-add');
    add.append(createLineIcon('plus'), document.createTextNode(' NOTE'));
    add.type = 'button';
    add.setAttribute('aria-label', 'Add reminder or note');
    add.addEventListener('click', () => openPersonalEventEditor({ stateService, host:main, currentDate }));
    inlineActions.append(add);

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
      makeExpandableCard(item,{host:main,title:labelText,tone:legendTones[kind]||'neutral',bodyBuilder:()=>calendarLegendExpandedBody(model,kind,handlers)});
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
