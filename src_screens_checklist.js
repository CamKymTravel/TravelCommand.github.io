import { buildChecklistViewModel } from './src_core_checklist-view-model.js';
import { createPageHero, applyStayHeaderImage } from './src_components_page-hero.js';
import {
  saveChecklistItemDraft,
  toggleChecklistItemDraft,
  deleteChecklistItemDraft,
  checklistTypeChangeDropsCompletion,
  CHECKLIST_LIST_TYPES,
  CHECKLIST_STAGES,
  CHECKLIST_OWNERS
} from './src_core_checklist-mutations.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { FormSession } from './src_components_form-session.js';
import { formatAUDate } from './src_core_dates.js';
import { createModal, makeExpandableCard, preserveLocalFocus, setModalTone } from './src_components_modal.js';
import { createLineIcon } from './src_components_icons.js';

const LIST_LABELS = Object.freeze({ permanent:'Permanent', destination:'Destination' });
const STAGE_META = Object.freeze({
  'current-stay':{ label:'Current Stay', icon:'current' },
  'before-leave':{ label:'Before You Leave', icon:'beforeLeave' },
  'travel-day':{ label:'Travel Day', icon:'travelDay' },
  arrival:{ label:'Arrival & Settle In', icon:'arrival' }
});
const OWNER_LABELS = Object.freeze({ both:'Both', cameron:'Cameron', kym:'Kym' });

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
  const wrap = node('label', 'checklist-field');
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

function checkboxField(label, name, checked = true) {
  const wrap = node('label', 'checklist-field checklist-checkbox-field');
  const input = document.createElement('input');
  input.name = name;
  input.type = 'checkbox';
  input.checked = Boolean(checked);
  wrap.append(input, node('span', '', label));
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

function openChecklistEditor({ stateService, host, currentDate, itemId = null, initialListType = 'permanent', initialStage = null, initialOwner = 'both', initialRequired = true, editorTone = null }) {
  const state = stateService.snapshot();
  const model = buildChecklistViewModel(state, currentDate);
  const existing = itemId ? state.checklists.find(item => item.id === itemId) : null;
  if (itemId && !existing) return;
  const initialType = CHECKLIST_LIST_TYPES.includes(existing?.listType) ? existing.listType : initialListType;
  const savedValue = {
    listType:initialType,
    itineraryId:existing?.listType === 'destination' ? existing.itineraryId : (initialType === 'destination' ? model.checklistDestination?.id || null : null),
    title:existing?.title || '',
    stage:CHECKLIST_STAGES.includes(existing?.stage) ? existing.stage : (CHECKLIST_STAGES.includes(initialStage) ? initialStage : model.activeStage),
    owner:CHECKLIST_OWNERS.includes(String(existing?.owner || '').toLowerCase()) ? String(existing.owner).toLowerCase() : initialOwner,
    required:existing?.required == null ? Boolean(initialRequired) : Boolean(existing.required),
    dueDate:existing?.dueDate || '',
    notes:existing?.notes || ''
  };
  const formSession = new FormSession(savedValue);

  let modal = null;
  const body = node('div', 'checklist-editor');
  const typeTiles = node('div', 'checklist-type-tiles');
  typeTiles.setAttribute('role', 'group');
  typeTiles.setAttribute('aria-label', 'Checklist list type');
  const destinationHint = node('p', 'checklist-destination-hint');
  const fields = node('div', 'checklist-form-grid');
  const error = node('p', 'checklist-form-error');
  body.append(typeTiles, destinationHint, fields, error);

  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }
  function checked(name) { return Boolean(body.querySelector(`[name="${name}"]`)?.checked); }
  function currentEditorTone() {
    if (editorTone) return editorTone;
    const owner = value('owner') || savedValue.owner;
    if (owner === 'kym') return 'magenta';
    if (owner === 'cameron') return 'blue';
    return body.dataset.listType === 'destination' ? 'sky' : 'green';
  }
  function capture() {
    const listType = body.dataset.listType;
    return {
      listType,
      itineraryId:listType === 'destination' ? (existing?.listType === 'destination' ? existing.itineraryId : model.checklistDestination?.id || null) : null,
      title:value('title'),
      stage:value('stage'),
      owner:value('owner'),
      required:checked('required'),
      dueDate:value('dueDate') || null,
      notes:value('notes')
    };
  }
  function renderTypes() {
    typeTiles.replaceChildren();
    for (const listType of CHECKLIST_LIST_TYPES) {
      const button = node('button', 'checklist-type-tile', LIST_LABELS[listType]);
      button.type = 'button';
      const unavailableDestination = listType === 'destination' && !model.checklistDestination && existing?.listType !== 'destination';
      button.disabled = unavailableDestination;
      if (unavailableDestination) button.title = 'No next destination is planned';
      const active = body.dataset.listType === listType;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => preserveLocalFocus(() => { body.dataset.listType = listType; renderTypes(); updateDestinationHint(); setModalTone(modal, currentEditorTone()); }));
      typeTiles.append(button);
    }
  }
  function updateDestinationHint() {
    if (body.dataset.listType !== 'destination') {
      destinationHint.textContent = 'Permanent items remain available across every destination.';
      return;
    }
    const target = existing?.listType === 'destination'
      ? state.itinerary.find(item => item.id === existing.itineraryId)
      : model.checklistDestination;
    destinationHint.textContent = target ? `Destination checklist · ${target.name} · ${formatAUDate(target.startDate)} – ${formatAUDate(target.endDate)}` : 'No next destination is planned.';
  }
  function populate(saved) {
    body.dataset.listType = CHECKLIST_LIST_TYPES.includes(saved.listType) ? saved.listType : 'permanent';
    error.textContent = '';
    renderTypes();
    updateDestinationHint();
    fields.replaceChildren(
      inputField('Item', 'title', 'text', saved.title),
      selectField('Stage', 'stage', CHECKLIST_STAGES.map(stage => [stage, STAGE_META[stage].label]), saved.stage),
      selectField('Owner', 'owner', CHECKLIST_OWNERS.map(owner => [owner, OWNER_LABELS[owner]]), saved.owner),
      inputField('Due Date', 'dueDate', 'date', saved.dueDate),
      checkboxField('Required for Ready to Move', 'required', saved.required),
      textAreaField('Notes', 'notes', saved.notes)
    );
    fields.querySelector('[name="owner"]')?.addEventListener('change', () => setModalTone(modal, currentEditorTone()));
    setModalTone(modal, currentEditorTone());
  }
  populate(savedValue);

  const existingDestination = existing?.listType === 'destination' ? state.itinerary.find(item => item.id === existing.itineraryId) : null;
  const existingDeleteContext = existing ? [
    LIST_LABELS[existing.listType] || 'Checklist',
    STAGE_META[existing.stage]?.label || existing.stage,
    OWNER_LABELS[existing.owner] || existing.owner,
    existingDestination ? `${existingDestination.name} · ${formatAUDate(existingDestination.startDate)} – ${formatAUDate(existingDestination.endDate)}` : null,
    existing.dueDate ? `Due ${formatAUDate(existing.dueDate)}` : null
  ].filter(Boolean).join(' · ') : '';

  const actions = [];
  if (existing) {
    actions.push({ label:'Delete', kind:'danger', onClick:dialog => {
      confirmDestructive({
        title:'Delete checklist item',
        tone:currentEditorTone(),
        message:`Delete ${existing.title}${existingDeleteContext ? ` · ${existingDeleteContext}` : ''}? This cannot be undone.`,
        onConfirm:() => {
          stateService.commit(draft => deleteChecklistItemDraft(draft, existing.id));
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
        const commitSave = (allowCompletionHistoryReset = false) => {
          try {
            stateService.commit(draft => {
              const saved = saveChecklistItemDraft(
                draft,
                { itemId:existing?.id || null, fields:formDraft },
                { now:stateService.now, allowCompletionHistoryReset }
              );
              draft.ui.checklistListType = saved.listType;
              draft.ui.checklistStage = saved.stage;
            });
            formSession.markSaved(formDraft);
            if (dialog.isConnected && dialog.open) dialog.close();
          } catch (err) {
            error.textContent = err.message;
            throw err;
          }
        };
        if (existing && checklistTypeChangeDropsCompletion(existing, formDraft.listType)) {
          const completionCount = existing.listType === 'permanent' ? new Set(existing.completedForItineraryIds || []).size : 1;
          const historyText = existing.listType === 'permanent'
            ? `${completionCount} saved move completion${completionCount === 1 ? '' : 's'}`
            : 'the saved completion for this destination';
          confirmDestructive({
            title:'Change checklist type?',
            tone:currentEditorTone(),
            message:`Changing ${existing.title} from ${LIST_LABELS[existing.listType]} to ${LIST_LABELS[formDraft.listType]} will permanently remove ${historyText}. Continue and Save?`,
            confirmLabel:'Save Changes',
            onConfirm:() => commitSave(true)
          });
          return;
        }
        commitSave(false);
      } catch (err) { error.textContent = err.message; }
    }}
  );

  const resolvedEditorTone = editorTone || (savedValue.owner === 'kym' ? 'magenta' : savedValue.owner === 'cameron' ? 'blue' : (savedValue.listType === 'destination' ? 'sky' : 'green'));
  modal = createModal({ title:existing ? 'Edit Checklist Item' : 'Add Checklist Item', body, actions, className:`tcc-editor-modal tcc-checklist-editor-modal tone-${resolvedEditorTone}` });
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

function renderChecklistRow(item, stateService, openEditor, compact = false, scopeItineraryId = null) {
  const row = node('div', `checklist-row${compact ? ' checklist-row-compact' : ''}`);
  row.dataset.completed = String(item.completed);
  row.dataset.overdue = String(item.overdue);
  const stageLabel = STAGE_META[item.stage]?.label || item.stage || '';
  const ownerLabel = OWNER_LABELS[item.owner] || item.owner || '';
  const listLabel = LIST_LABELS[item.listType] || item.listType || '';
  const exactContext = [listLabel, stageLabel, ownerLabel, item.displayDueDate ? `Due ${item.displayDueDate}` : ''].filter(Boolean).join(' · ');
  const toggle = node('button', 'checklist-toggle');
  toggle.type = 'button';
  if (item.completed) toggle.append(createLineIcon('check'));
  toggle.setAttribute('aria-label', [`${item.completed ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`, exactContext].filter(Boolean).join(' · '));
  toggle.setAttribute('aria-pressed', String(item.completed));
  toggle.addEventListener('click', () => stateService.commit(draft => toggleChecklistItemDraft(draft, item.id, !item.completed, { now:stateService.now, scopeItineraryId })));
  const edit = node('button', 'checklist-row-copy');
  edit.type = 'button';
  edit.addEventListener('click', () => openEditor(item.id));
  edit.append(node('strong', '', item.title));
  const meta = [item.displayDueDate ? `Due ${item.displayDueDate}` : '', item.overdue ? 'Overdue' : '', !item.required ? 'Optional' : ''].filter(Boolean).join(' · ');
  if (meta) edit.append(node('small', item.overdue ? 'checklist-overdue' : '', meta));
  if (!compact && item.notes) edit.append(node('small', 'checklist-note', item.notes));
  edit.setAttribute('aria-label', ['Edit checklist item', item.title, exactContext, item.overdue ? 'Overdue' : '', !item.required ? 'Optional' : ''].filter(Boolean).join(' · '));
  row.append(toggle, edit);
  if (!compact && item.completed) row.append(node('span','checklist-row-status','DONE'));
  return row;
}

function paceMini(label,value,tone){
  const m=node('div',`checklist-overview-metric ${tone}`);
  m.append(node('span','',label),node('strong','',String(value)));
  return m;
}

function renderReadyBanner(model, onStageChange, navigate) {
  const panel=node('section',`checklist-ready-banner checklist-ready-${model.ready.status}`);
  const icon=node('span','checklist-ready-icon'); icon.append(createLineIcon(model.ready.status==='ready'?'check':'warning'));
  const copy=node('div','checklist-ready-copy');
  const destination=model.nextDestination?.name || 'the next move';
  const noNext=model.ready.status==='no-next-destination';
  const message=noNext
    ? model.checklistDestination
      ? 'No future destination is planned. Current-stay checklist items remain available.'
      : 'No future destination is planned. Add a destination in Itinerary to begin move readiness.'
    : model.ready.total
      ? `${model.ready.remaining} required checklist task${model.ready.remaining===1?'':'s'} remaining before ${destination}.`
      : 'Add required checklist items to begin readiness tracking.';
  copy.append(node('p','eyebrow','READY TO MOVE'),node('strong','',readyLabel(model.ready.status)),node('span','',message));
  const stageIndex=CHECKLIST_STAGES.indexOf(model.activeStage);
  const actionLabel=noNext?'PLAN DESTINATION':stageIndex < CHECKLIST_STAGES.length-1 ? 'NEXT STAGE' : 'VIEW DESTINATION';
  const action=node('button','checklist-ready-action');
  action.type='button';
  action.append(node('span','',actionLabel),createLineIcon('arrowRight','checklist-ready-action-icon'));
  action.addEventListener('click',()=>{
    if(noNext) navigate?.('itinerary');
    else if(stageIndex < CHECKLIST_STAGES.length-1) onStageChange?.(CHECKLIST_STAGES[stageIndex+1]);
    else if(model.nextDestination?.id) navigate?.('itinerary',{collection:'itinerary',id:model.nextDestination.id,editorTone:model.ready.status==='ready'?'green':'gold'}); else navigate?.('itinerary');
  });
  panel.append(icon,copy,action);
  return panel;
}

function renderOverview(model){
  const panel=node('section','checklist-overview-card');
  panel.append(node('p','eyebrow','CHECKLIST OVERVIEW'));
  const ring=node('div','checklist-overview-ring');
  ring.style.setProperty('--checklist-progress',`${Math.max(0,Math.min(100,model.overview.percent))}%`);
  ring.setAttribute('role','progressbar'); ring.setAttribute('aria-label','Travel readiness'); ring.setAttribute('aria-valuemin','0'); ring.setAttribute('aria-valuemax','100'); ring.setAttribute('aria-valuenow',String(model.overview.percent)); ring.setAttribute('aria-valuetext',`${model.overview.percent}% · ${model.overview.completed} of ${model.overview.total} complete`);
  ring.append(node('span','','TRAVEL READINESS'),node('strong','',`${model.overview.percent}%`),node('small','',`${model.overview.completed} of ${model.overview.total} complete`));
  panel.append(ring);
  const metrics=node('div','checklist-overview-metrics');
  metrics.append(paceMini('Completed',model.overview.completed,'complete'),paceMini('Pending',model.overview.remaining,'pending'),paceMini('Overdue',model.overview.overdue,'overdue'));
  panel.append(metrics);
  return panel;
}

function renderStageNavigation(model, onStageChange) {
  const wrap=node('section','checklist-stage-panel');
  const tabs=node('nav','checklist-stage-tabs'); tabs.setAttribute('aria-label','Checklist stages');
  for(const stage of CHECKLIST_STAGES){
    const meta=STAGE_META[stage];
    const stageModel=model.stages.find(item=>item.stage===stage);
    const button=node('button','checklist-stage-tab'); button.type='button';
    const active=stage===model.activeStage; button.dataset.active=String(active); button.setAttribute('aria-pressed',String(active));
    const icon=node('span','checklist-stage-icon'); icon.append(createLineIcon(meta.icon));
    const copy=node('span','checklist-stage-copy'); copy.append(node('strong','',meta.label),node('small','',stageModel?.requiredRemaining ? `${stageModel.requiredRemaining} required` : 'Clear'));
    button.append(icon,copy);
    button.addEventListener('click',()=>onStageChange?.(stage));
    tabs.append(button);
  }
  const info=node('p','checklist-stage-info');
  info.append(createLineIcon('info'), document.createTextNode(' Complete all required checklist tasks before travel. Optional His/Hers items do not block Ready to Move.'));
  wrap.append(tabs,info);
  return wrap;
}

function renderOwnerCard(title, subtitle, items, tone, stateService, openEditor, scopeItineraryId) {
  const panel=node('section',`checklist-owner-card checklist-owner-${tone}`);
  const head=node('div','checklist-owner-head');
  const copy=node('div'); copy.append(node('h2','',title),node('p','',subtitle));
  const completed=items.filter(item=>item.completed).length;
  const stats=node('div','checklist-owner-stats'); stats.append(node('strong','',String(items.length)),node('span','',items.length===1?'item':'items'),node('small','',`${completed} completed · ${items.length-completed} pending`));
  head.append(copy,stats); panel.append(head);
  const list=node('div','checklist-owner-list');
  if(!items.length) list.append(node('p','checklist-empty','No optional items for this stage'));
  const ownerEditorTone=tone==='hers'?'magenta':'blue';
  const openOwnerItem=id=>openEditor(id,ownerEditorTone);
  for(const item of items) list.append(renderChecklistRow(item,stateService,openOwnerItem,true,scopeItineraryId));
  panel.append(list);
  return panel;
}

function renderOwnerPanels(model,stateService,openEditor){
  const wrap=node('section','checklist-owner-grid');
  wrap.append(renderOwnerCard('HIS','NEEDS & WANTS',model.his,'his',stateService,openEditor,model.activeDestinationId),renderOwnerCard('HERS','NEEDS & WANTS',model.hers,'hers',stateService,openEditor,model.activeDestinationId));
  if(model.sharedOptional.length){
    const shared=node('div','checklist-shared-extras');
    shared.append(node('strong','','SHARED EXTRAS'),node('span','',`${model.sharedOptional.filter(item=>item.completed).length}/${model.sharedOptional.length} complete`));
    const list=node('div'); for(const item of model.sharedOptional) list.append(renderChecklistRow(item,stateService,openEditor,true,model.activeDestinationId)); shared.append(list); wrap.append(shared);
  }
  return wrap;
}

function renderListPanel(title,subtitle,stageItems,stageProgress,overallProgress,listType,stateService,openEditor,addItem,scopeItineraryId,{ disabled=false, disabledReason='' }={}){
  const panel=node('section',`checklist-column checklist-column-${listType}`);
  const head=node('div','checklist-column-head');
  const heading=node('div','checklist-column-title'); const columnIcon=node('span','checklist-column-icon'); columnIcon.append(createLineIcon(listType==='permanent'?'permanent':'destination')); heading.append(columnIcon);
  const copy=node('div'); copy.append(node('h2','',title),node('p','',subtitle)); heading.append(copy);
  const add=node('button','checklist-column-add'); add.type='button'; add.append(createLineIcon('plus')); add.setAttribute('aria-label',`Add ${title} item`); add.disabled=Boolean(disabled); add.title=add.disabled?disabledReason:''; if(!add.disabled) add.addEventListener('click',addItem); head.append(heading,add); panel.append(head);

  const progressCopy=node('div','checklist-progress-copy');
  progressCopy.append(node('strong','',`${stageProgress.completed} of ${stageProgress.total} this stage`),node('span','',`${overallProgress.completed} of ${overallProgress.total} overall · ${overallProgress.percent}%`));
  const progress=document.createElement('progress'); progress.max=100; progress.value=overallProgress.percent; progress.setAttribute('aria-label',`${title} overall progress`); progress.setAttribute('aria-valuetext',`${overallProgress.completed} of ${overallProgress.total} complete · ${overallProgress.percent}%`);
  panel.append(progressCopy,progress);

  const nextTask=stageItems.find(item=>!item.completed);
  const preview=node('button',`checklist-next-task ${nextTask?.overdue?'is-overdue':''}`); preview.type='button'; preview.disabled=!nextTask;
  preview.append(node('span','','NEXT KEY TASK'),node('strong','',nextTask?.title||'Stage complete'));
  if(nextTask) preview.append(node('small','',nextTask.displayDueDate?`${nextTask.overdue?'OVERDUE · ':''}Due ${nextTask.displayDueDate}`:'No due date'));
  else preview.append(node('small','','Nothing outstanding in this stage'));
  if(nextTask) preview.addEventListener('click',()=>openEditor(nextTask.id));
  panel.append(preview);

  const list=node('div','checklist-column-list');
  if(!stageItems.length) list.append(node('p','checklist-empty','No required tasks in this stage'));
  for(const item of stageItems) list.append(renderChecklistRow(item,stateService,openEditor,false,scopeItineraryId));
  panel.append(list);
  return panel;
}

function renderNextDestinationCard(model,navigate){
  const panel=node('section','checklist-next-card');
  const head=node('div','checklist-next-head'); const nextIcon=node('span','checklist-next-icon'); nextIcon.append(createLineIcon('destination')); head.append(nextIcon,node('p','eyebrow','NEXT DESTINATION')); panel.append(head);
  if(!model.nextDestination){
    panel.append(node('strong','','Not planned'),node('span','','Add the next destination in Itinerary.'));
    const plan=node('button','checklist-next-action'); plan.type='button'; plan.append(document.createTextNode('PLAN DESTINATION '),createLineIcon('arrowRight')); plan.addEventListener('click',()=>navigate?.('itinerary')); panel.append(plan); return panel;
  }
  panel.append(node('strong','',model.nextDestination.name),node('span','',[model.nextDestination.country,`${model.nextDestination.displayStartDate} – ${model.nextDestination.displayEndDate}`].filter(Boolean).join(' · ')));
  const visual=node('div','checklist-next-visual');
  applyStayHeaderImage(visual,model.nextDestination,{position:'center center'});
  const visualCopy=node('div','checklist-next-visual-copy');
  visualCopy.append(node('small','','UP NEXT'),node('strong','',model.nextDestination.name),node('span','',`${model.nextDestination.durationDays} day stay`));
  visual.append(visualCopy); panel.append(visual);
  const facts=node('div','checklist-next-facts');
  const dateFact=node('span'); dateFact.append(node('small','','TRAVEL DAY'),node('strong','',model.nextDestination.displayStartDate||'—'));
  const durationFact=node('span'); durationFact.append(node('small','','STAY DURATION'),node('strong','',`${model.nextDestination.durationDays} days`));
  facts.append(dateFact,durationFact); panel.append(facts,node('p','checklist-next-note','Destination task state is saved per destination and switches automatically when the next destination changes.'));
  const action=node('button','checklist-next-action'); action.type='button'; action.append(document.createTextNode('VIEW DESTINATION '),createLineIcon('arrowRight')); action.addEventListener('click',()=>navigate?.('itinerary',{collection:'itinerary',id:model.nextDestination.id,editorTone:'indigo'})); panel.append(action); return panel;
}

function renderHistory(model, openEditor) {
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
      const row = node('button', 'checklist-history-item');
      row.type = 'button';
      row.dataset.itemId = item.id;
      const historyTick=node('span','checklist-history-tick'); if(item.completed) historyTick.append(createLineIcon('check')); else historyTick.textContent='—'; row.append(historyTick, node('strong', '', item.title));
      if (item.displayDueDate) row.append(node('small', '', `Due ${item.displayDueDate}`));
      row.setAttribute('aria-label', ['Edit historical checklist item', item.title, group.name, group.displayDates, item.displayDueDate ? `Due ${item.displayDueDate}` : ''].filter(Boolean).join(' · '));
      row.addEventListener('click', () => openEditor?.(item.id));
      items.append(row);
    }
    details.append(items);
    groups.append(details);
  }
  panel.append(groups);
  return panel;
}

export function renderChecklistScreen({ stateService, currentDate, navigate }) {
  const main=node('main','screen-root checklist-screen'); main.dataset.screen='checklist';
  let stageOverride=stateService.snapshot().ui?.checklistStage || null;
  function renderContent(){
    const state=stateService.snapshot();
    const model=buildChecklistViewModel(state,currentDate,{stage:stageOverride});
    main.replaceChildren();
    main.append(createPageHero({key:'header-checklist',eyebrow:'TRAVEL PREP · STAY ORGANISED',title:'Checklist',subtitle:'Stay organised and prepared with your personalised travel checklist.',className:'checklist-reference-hero',position:'center center'}));

    const openAny=(id,editorTone=null)=>openChecklistEditor({stateService,host:main,currentDate,itemId:id,initialStage:model.activeStage,editorTone});
    const openPermanent=id=>openChecklistEditor({stateService,host:main,currentDate,itemId:id,initialListType:'permanent',initialStage:model.activeStage,editorTone:'green'});
    const openDestination=id=>openChecklistEditor({stateService,host:main,currentDate,itemId:id,initialListType:'destination',initialStage:model.activeStage,editorTone:'sky'});

    const changeStage=stage=>stateService.commit(draft=>{draft.ui.checklistStage=stage;});
    const ready=renderReadyBanner(model,changeStage,navigate), stages=renderStageNavigation(model,changeStage), owners=renderOwnerPanels(model,stateService,openAny);
    const primary=node('div','checklist-reference-primary');
    primary.append(ready,stages,owners);
    makeExpandableCard(ready,{host:main,title:'Ready to Move',tone:model.ready.status==='ready'?'green':'gold'});
    for(const ownerCard of owners.querySelectorAll('.checklist-owner-card')) {
      const hers=ownerCard.classList.contains('checklist-owner-hers');
      makeExpandableCard(ownerCard,{host:main,title:hers?'Hers · Needs & Wants':'His · Needs & Wants',tone:hers?'magenta':'blue'});
    }
    const permanentPanel=renderListPanel('Permanent Checklist','Tasks that apply to every destination.',model.stagePermanent,model.stagePermanentProgress,model.permanentProgress,'permanent',stateService,openPermanent,()=>openChecklistEditor({stateService,host:main,currentDate,initialListType:'permanent',initialStage:model.activeStage,editorTone:'green'}),model.activeDestinationId);
    const destinationScopeLabel=model.nextDestination?'Tasks specific to the next destination.':model.checklistDestination?'Tasks specific to the current destination.':'Tasks for a planned destination.';
    const destinationPanel=renderListPanel('Destination Checklist',destinationScopeLabel,model.stageDestination,model.stageDestinationProgress,model.destinationProgress,'destination',stateService,openDestination,()=>openChecklistEditor({stateService,host:main,currentDate,initialListType:'destination',initialStage:model.activeStage,editorTone:'sky'}),model.activeDestinationId,{disabled:!model.checklistDestination,disabledReason:'Plan the next destination in Itinerary first'});
    const requiredGrid=node('section','checklist-required-grid'); requiredGrid.append(permanentPanel,destinationPanel);
    makeExpandableCard(permanentPanel,{host:main,title:'Permanent Checklist',tone:'green'});
    makeExpandableCard(destinationPanel,{host:main,title:'Destination Checklist',tone:'sky'});
    primary.append(requiredGrid);
    const overview=renderOverview(model), nextDestination=renderNextDestinationCard(model,navigate);
    const rail=node('aside','checklist-reference-rail'); rail.setAttribute('aria-label','Checklist summary'); rail.append(overview,nextDestination);
    makeExpandableCard(overview,{host:main,title:'Checklist Overview',tone:'teal'});
    makeExpandableCard(nextDestination,{host:main,title:'Next Destination',tone:'indigo'});
    const layout=node('section','checklist-layout-grid'); layout.append(primary,rail);
    main.append(layout,renderHistory(model,openAny));

    const pending=state.ui?.pendingOpen;
    if(pending?.collection==='checklists'&&pending.id&&state.checklists.some(item=>item.id===pending.id)){
      const target=state.checklists.find(item=>item.id===pending.id);
      queueMicrotask(()=>{
        if(!main.isConnected)return;
        stateService.commit(draft=>{
          draft.ui.pendingOpen=null;
          if(target.stage) draft.ui.checklistStage=target.stage;
        });
        const liveHost=document.querySelector('[data-screen="checklist"]');
        if(liveHost) openChecklistEditor({stateService,host:liveHost,currentDate,itemId:pending.id,initialListType:target.listType,initialStage:model.activeStage,editorTone:pending.editorTone || null});
      });
    } else if(pending?.collection==='itinerary'&&pending.id&&state.itinerary.some(item=>item.id===pending.id)){
      const isChecklistDestination=pending.id===model.nextDestination?.id||pending.id===model.activeDestinationId;
      queueMicrotask(()=>{
        if(!main.isConnected)return;
        if(!isChecklistDestination){
          navigate?.('itinerary',pending);
          return;
        }
        stateService.commit(draft=>{draft.ui.pendingOpen=null;});
        queueMicrotask(()=>document.querySelector('[data-screen="checklist"] .checklist-next-card')?.scrollIntoView({block:'center'}));
      });
    }
  }
  renderContent(); return main;
}
