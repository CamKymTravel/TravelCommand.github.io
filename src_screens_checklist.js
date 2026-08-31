import { buildChecklistViewModel } from './src_core_checklist-view-model.js';
import { saveChecklistItemDraft, toggleChecklistItemDraft, deleteChecklistItemDraft, CHECKLIST_LIST_TYPES } from './src_core_checklist-mutations.js';
import { createModal } from './src_components_modal.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';

const LIST_LABELS = Object.freeze({ permanent:'Permanent', destination:'Destination' });

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function inputField(label, name, type = 'text', value = '') {
  const wrap = node('label', 'checklist-field');
  wrap.append(node('span', '', label));
  const input = document.createElement('input');
  input.name = name;
  input.type = type;
  input.value = value ?? '';
  wrap.append(input);
  return wrap;
}

function textAreaField(label, name, value = '') {
  const wrap = node('label', 'checklist-field checklist-field-wide');
  wrap.append(node('span', '', label));
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.rows = 4;
  textarea.value = value ?? '';
  wrap.append(textarea);
  return wrap;
}

function openChecklistEditor({ stateService, host, currentDate, itemId = null, initialListType = 'permanent' }) {
  const state = stateService.snapshot();
  const model = buildChecklistViewModel(state, currentDate);
  const existing = itemId ? state.checklists.find(item => item.id === itemId) : null;
  if (itemId && !existing) return;
  const initialType = CHECKLIST_LIST_TYPES.includes(existing?.listType) ? existing.listType : initialListType;
  const savedValue = {
    listType:initialType,
    itineraryId:existing?.listType === 'destination' ? existing.itineraryId : (initialType === 'destination' ? model.nextDestination?.id || null : null),
    title:existing?.title || '',
    dueDate:existing?.dueDate || '',
    notes:existing?.notes || ''
  };
  const formSession = new FormSession(savedValue);

  const body = node('div', 'checklist-editor');
  const typeTiles = node('div', 'checklist-type-tiles');
  const destinationHint = node('p', 'checklist-destination-hint');
  const fields = node('div', 'checklist-form-grid');
  const error = node('p', 'checklist-form-error');
  body.append(typeTiles, destinationHint, fields, error);

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }
  function capture() {
    const listType = body.dataset.listType;
    return {
      listType,
      itineraryId:listType === 'destination' ? (existing?.listType === 'destination' ? existing.itineraryId : model.nextDestination?.id || null) : null,
      title:value('title'),
      dueDate:value('dueDate') || null,
      notes:value('notes')
    };
  }
  function renderTypes() {
    typeTiles.replaceChildren();
    for (const listType of CHECKLIST_LIST_TYPES) {
      const button = node('button', 'checklist-type-tile', LIST_LABELS[listType]);
      button.type = 'button';
      const unavailableDestination = listType === 'destination' && !model.nextDestination && existing?.listType !== 'destination';
      button.disabled = unavailableDestination;
      if (unavailableDestination) button.title = 'No next destination is planned';
      const active = body.dataset.listType === listType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => { body.dataset.listType = listType; renderTypes(); updateDestinationHint(); });
      typeTiles.append(button);
    }
  }
  function updateDestinationHint() {
    if (body.dataset.listType !== 'destination') {
      destinationHint.textContent = 'Permanent items stay on the Permanent checklist until you edit or delete them.';
      return;
    }
    const target = existing?.listType === 'destination'
      ? state.itinerary.find(item => item.id === existing.itineraryId)
      : model.nextDestination;
    destinationHint.textContent = target ? `Destination checklist · ${target.name}` : 'No next destination is planned.';
  }
  function populate(saved) {
    body.dataset.listType = CHECKLIST_LIST_TYPES.includes(saved.listType) ? saved.listType : 'permanent';
    error.textContent = '';
    renderTypes();
    updateDestinationHint();
    fields.replaceChildren(
      inputField('Item', 'title', 'text', saved.title),
      inputField('Due Date', 'dueDate', 'date', saved.dueDate),
      textAreaField('Notes', 'notes', saved.notes)
    );
  }
  populate(savedValue);

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete checklist item',
        message:`Delete ${existing.title}? This cannot be undone.`,
        onConfirm:() => {
          try {
            stateService.commit(draft => deleteChecklistItemDraft(draft, existing.id));
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
        stateService.commit(draft => saveChecklistItemDraft(draft, { itemId:existing?.id || null, fields:formDraft }, { now:stateService.now }));
        formSession.markSaved(formDraft);
        if (dialog.isConnected && dialog.open) dialog.close();
      } catch (err) { error.textContent = err.message; }
    }}
  );

  const modal = createModal({ title:existing ? 'Edit Checklist Item' : 'Add Checklist Item', body, actions });
  host.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once:true });
  modal.showModal();
}

function readyLabel(status) {
  if (status === 'ready') return 'Ready';
  if (status === 'needs-setup') return 'Needs Setup';
  if (status === 'no-next-destination') return 'No Next Destination';
  return 'Not Ready';
}

function renderStatus(model) {
  const grid = node('section', 'checklist-status-grid');
  const ready = node('article', `checklist-status-card checklist-ready checklist-ready-${model.ready.status}`);
  ready.append(node('span', 'checklist-status-label', 'Ready to Move'), node('strong', '', readyLabel(model.ready.status)));
  if (model.ready.total) ready.append(node('small', '', `${model.ready.completed}/${model.ready.total} complete${model.ready.overdue ? ` · ${model.ready.overdue} overdue` : ''}`));

  const next = node('article', 'checklist-status-card checklist-next');
  next.append(node('span', 'checklist-status-label', 'Next Destination'));
  if (model.nextDestination) next.append(node('strong', '', model.nextDestination.name), node('small', '', [model.nextDestination.country, model.nextDestination.displayStartDate].filter(Boolean).join(' · ')));
  else next.append(node('strong', '', 'Not Planned'), node('small', '', 'No future destination in Itinerary'));

  const progress = node('article', 'checklist-status-card checklist-progress-card');
  progress.append(node('span', 'checklist-status-label', `${LIST_LABELS[model.listType]} Progress`), node('strong', '', `${model.activeProgress.percent}%`));
  const bar = document.createElement('progress');
  bar.max = 100;
  bar.value = model.activeProgress.percent;
  bar.setAttribute('aria-label', `${LIST_LABELS[model.listType]} checklist progress`);
  progress.append(bar, node('small', '', `${model.activeProgress.completed}/${model.activeProgress.total} complete`));
  grid.append(ready, next, progress);
  return grid;
}

function renderChecklistRow(item, stateService, openEditor) {
  const row = node('div', 'checklist-row');
  row.dataset.completed = String(item.completed);
  row.dataset.overdue = String(item.overdue);
  const toggle = node('button', 'checklist-toggle', item.completed ? '✓' : '');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', `${item.completed ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`);
  toggle.setAttribute('aria-pressed', String(item.completed));
  toggle.addEventListener('click', () => stateService.commit(draft => toggleChecklistItemDraft(draft, item.id, !item.completed, { now:stateService.now })));
  const edit = node('button', 'checklist-row-copy');
  edit.type = 'button';
  edit.addEventListener('click', () => openEditor(item.id));
  edit.append(node('strong', '', item.title));
  const meta = [item.displayDueDate ? `Due ${item.displayDueDate}` : '', item.overdue ? 'Overdue' : ''].filter(Boolean).join(' · ');
  if (meta) edit.append(node('small', item.overdue ? 'checklist-overdue' : '', meta));
  if (item.notes) edit.append(node('small', 'checklist-note', item.notes));
  row.append(toggle, edit);
  return row;
}

function renderActiveList(model, stateService, openEditor, addItem) {
  const panel = node('section', 'checklist-panel checklist-active-list');
  const head = node('div', 'checklist-section-head');
  const title = model.listType === 'destination' && model.nextDestination ? `${model.nextDestination.name} Checklist` : `${LIST_LABELS[model.listType]} Checklist`;
  head.append(node('h2', '', title));
  const add = node('button', 'button checklist-add', 'Add Item');
  add.type = 'button';
  add.disabled = model.listType === 'destination' && !model.nextDestination;
  add.title = add.disabled ? 'Plan the next destination in Itinerary first' : '';
  add.addEventListener('click', addItem);
  head.append(add);
  panel.append(head);
  const list = node('div', 'checklist-list');
  if (!model.activeItems.length) list.append(node('p', 'checklist-empty', 'No entries yet'));
  for (const item of model.activeItems) list.append(renderChecklistRow(item, stateService, openEditor));
  panel.append(list);
  return panel;
}

function renderHistory(model) {
  const panel = node('section', 'checklist-panel checklist-history');
  const head = node('div', 'checklist-section-head');
  head.append(node('h2', '', 'Checklist History'), node('span', 'checklist-count', String(model.history.length)));
  panel.append(head);
  if (!model.history.length) {
    panel.append(node('p', 'checklist-empty', 'No historical destination checklists yet'));
    return panel;
  }
  const groups = node('div', 'checklist-history-groups');
  for (const group of model.history) {
    const details = document.createElement('details');
    details.className = 'checklist-history-group';
    const summary = node('summary');
    const copy = node('span', 'checklist-history-copy');
    copy.append(node('strong', '', group.name), node('small', '', [group.country, group.displayDates].filter(Boolean).join(' · ')));
    summary.append(copy, node('span', 'checklist-history-progress', `${group.progress.completed}/${group.progress.total}`));
    details.append(summary);
    const items = node('div', 'checklist-history-items');
    for (const item of group.items) {
      const row = node('div', 'checklist-history-item');
      row.append(node('span', 'checklist-history-tick', item.completed ? '✓' : '—'), node('strong', '', item.title));
      if (item.displayDueDate) row.append(node('small', '', `Due ${item.displayDueDate}`));
      items.append(row);
    }
    details.append(items);
    groups.append(details);
  }
  panel.append(groups);
  return panel;
}

export function renderChecklistScreen({ stateService, currentDate }) {
  const main = node('main', 'screen-root checklist-screen');
  main.dataset.screen = 'checklist';

  function setListType(listType) { stateService.commit(draft => { draft.ui.checklistListType = listType; }); }

  function renderContent() {
    const state = stateService.snapshot();
    const model = buildChecklistViewModel(state, currentDate);
    main.replaceChildren();

    const toolbar = node('header', 'checklist-toolbar');
    const heading = node('div');
    heading.append(node('p', 'eyebrow', 'MOVE READINESS'), node('h1', '', 'Checklist'));
    const switcher = node('div', 'checklist-switcher');
    for (const listType of CHECKLIST_LIST_TYPES) {
      const button = node('button', 'checklist-switch-button', LIST_LABELS[listType]);
      button.type = 'button';
      const active = model.listType === listType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => setListType(listType));
      switcher.append(button);
    }
    toolbar.append(heading, switcher);
    main.append(toolbar, renderStatus(model));

    const openEditor = itemId => openChecklistEditor({ stateService, host:main, currentDate, itemId, initialListType:model.listType });
    main.append(renderActiveList(model, stateService, openEditor, () => openChecklistEditor({ stateService, host:main, currentDate, initialListType:model.listType })));
    main.append(renderHistory(model));

    const pending = state.ui?.pendingOpen;
    if (pending?.collection === 'checklists' && pending.id && state.checklists.some(item => item.id === pending.id)) {
      const target = state.checklists.find(item => item.id === pending.id);
      queueMicrotask(() => {
        if (!main.isConnected) return;
        stateService.commit(draft => {
          draft.ui.pendingOpen = null;
          draft.ui.checklistListType = target.listType === 'destination' ? 'destination' : 'permanent';
        });
        const liveHost = document.querySelector('[data-screen="checklist"]');
        if (liveHost) openChecklistEditor({ stateService, host:liveHost, currentDate, itemId:pending.id, initialListType:target.listType });
      });
    }
  }

  renderContent();
  return main;
}
