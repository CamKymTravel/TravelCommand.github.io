import { createModal } from './src_components_modal.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { buildVaultViewModel, VAULT_CATEGORY_LABELS } from './src_core_vault-view-model.js';
import {
  VAULT_CATEGORIES, VAULT_OWNERS, IMAGE_MIME_TYPES,
  saveVaultRecordDraft, deleteVaultRecordDraft, saveVaultAttachmentDraft, deleteVaultAttachmentDraft,
  saveStreamingDraft, deleteStreamingDraft, saveProtectedEmailDraft, deleteProtectedEmailDraft
} from './src_core_vault-mutations.js';
import { unlockVault, lockVault, markStreamingOpened, hideHiddenEmails } from './src_core_vault-access.js';
import { verifyPin } from './src_core_pin.js';

const OWNER_OPTIONS = VAULT_OWNERS.map(owner => [owner, owner]);
const CATEGORY_OPTIONS = VAULT_CATEGORIES.map(category => [category, VAULT_CATEGORY_LABELS[category]]);

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}
function inputField(label, name, type = 'text', value = '') {
  const wrap = node('label', 'vault-field');
  wrap.append(node('span', '', label));
  const input = document.createElement('input');
  input.name = name; input.type = type; input.value = value ?? '';
  wrap.append(input); return wrap;
}
function selectField(label, name, options, value = '') {
  const wrap = node('label', 'vault-field');
  wrap.append(node('span', '', label));
  const select = document.createElement('select'); select.name = name;
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement('option'); option.value = optionValue; option.textContent = optionLabel; option.selected = optionValue === value; select.append(option);
  }
  wrap.append(select); return wrap;
}
function textAreaField(label, name, value = '') {
  const wrap = node('label', 'vault-field vault-field-wide'); wrap.append(node('span', '', label));
  const textarea = document.createElement('textarea'); textarea.name = name; textarea.rows = 4; textarea.value = value ?? ''; wrap.append(textarea); return wrap;
}
function modalHost(host, modal) { host.append(modal); modal.addEventListener('close', () => modal.remove(), { once:true }); modal.showModal(); }

function openUnlockDialog({ stateService, host, access, requestRender }) {
  const state = stateService.snapshot();
  if (!state.settings.pinEnabled) { unlockVault(access); requestRender(); return; }
  const body = node('div', 'vault-unlock-form');
  const field = inputField('Vault PIN', 'pin', 'password', '');
  const input = field.querySelector('input'); input.inputMode = 'numeric'; input.autocomplete = 'off'; input.maxLength = 8;
  const error = node('p', 'vault-form-error'); body.append(field, error);
  const modal = createModal({ title:'Unlock The Vault', body, actions:[
    { label:'Cancel', onClick:dialog => dialog.close() },
    { label:'Unlock', onClick:async dialog => {
      try {
        const ok = await verifyPin(input.value, state.settings.pinHash);
        if (!ok) return void (error.textContent = 'Incorrect PIN');
        unlockVault(access); dialog.close(); requestRender();
      } catch (err) { error.textContent = err.message; }
    }}
  ]});
  modalHost(host, modal);
}

function openVaultRecordEditor({ stateService, host, recordId = null, initialCategory = 'passport' }) {
  const state = stateService.snapshot();
  const existing = recordId ? state.vault.find(record => record.id === recordId) : null;
  if (recordId && !existing) return;
  const saved = {
    category:existing?.category || initialCategory, title:existing?.title || '', owner:existing?.owner || 'Both',
    reference:existing?.reference || '', issueDate:existing?.issueDate || '', expiryDate:existing?.expiryDate || '', details:existing?.details || '', notes:existing?.notes || ''
  };
  const session = new FormSession(saved);
  const body = node('div', 'vault-editor'); const fields = node('div', 'vault-form-grid'); const error = node('p', 'vault-form-error'); body.append(fields, error);
  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }
  function capture() { return { category:value('category'), title:value('title'), owner:value('owner'), reference:value('reference'), issueDate:value('issueDate') || null, expiryDate:value('expiryDate') || null, details:value('details'), notes:value('notes') }; }
  function populate(v) { error.textContent=''; fields.replaceChildren(selectField('Category','category',CATEGORY_OPTIONS,v.category), inputField('Title','title','text',v.title), selectField('Owner','owner',OWNER_OPTIONS,v.owner), inputField('Reference / Number','reference','text',v.reference), inputField('Issue / Start Date','issueDate','date',v.issueDate), inputField('Expiry / End Date','expiryDate','date',v.expiryDate), textAreaField('Details','details',v.details), textAreaField('Notes','notes',v.notes)); }
  populate(saved);
  const actions=[];
  if (existing) actions.push({ label:'Delete', kind:'danger', onClick:dialog => confirmDestructive({ title:'Delete Vault record', message:`Delete ${existing.title} and its screenshot attachments? This cannot be undone.`, onConfirm:() => { try { stateService.commit(draft => deleteVaultRecordDraft(draft, existing.id)); if (dialog.isConnected && dialog.open) dialog.close(); } catch(err) { error.textContent=err.message; } } }) });
  actions.push(
    { label:'Undo Changes', onClick:() => populate(session.undo()) },
    { label:'Cancel', onClick:dialog => { session.cancel(); dialog.close(); } },
    { label:'Save', onClick:dialog => { try { const draftValue=session.update(draft => Object.assign(draft,capture())); stateService.commit(draft => saveVaultRecordDraft(draft,{recordId:existing?.id || null,fields:draftValue},{now:stateService.now})); session.markSaved(draftValue); if(dialog.isConnected&&dialog.open) dialog.close(); } catch(err){ error.textContent=err.message; } } }
  );
  modalHost(host, createModal({ title:existing?'Edit Vault Record':'Add Vault Record', body, actions }));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read screenshot')); reader.readAsDataURL(file);
  });
}

function openAttachmentPicker({ stateService, host, record }) {
  const input=document.createElement('input'); input.type='file'; input.accept=IMAGE_MIME_TYPES.join(','); input.multiple=true; input.hidden=true; host.append(input);
  input.addEventListener('change', async () => {
    try {
      const files=[...input.files];
      const prepared=[];
      for (const file of files) {
        if (!IMAGE_MIME_TYPES.includes(file.type)) throw new Error('Only PNG, JPEG or WebP screenshots can be attached');
        prepared.push({ name:file.name, mimeType:file.type, dataUrl:await fileToDataUrl(file) });
      }
      stateService.commit(draft => { for (const item of prepared) saveVaultAttachmentDraft(draft,{vaultRecordId:record.id,...item},{now:stateService.now}); });
    } catch (err) { window.alert(err.message); }
    input.remove();
  }, { once:true });
  input.click();
}

function openStreamingEditor({ stateService, host, recordId = null }) {
  const state=stateService.snapshot(); const existing=recordId?state.streaming.find(record=>record.id===recordId):null; if(recordId&&!existing)return;
  const saved={service:existing?.service||'',owner:existing?.owner||'Both',username:existing?.username||'',password:existing?.password||'',notes:existing?.notes||''}; const session=new FormSession(saved);
  const body=node('div','vault-editor'); const fields=node('div','vault-form-grid'); const error=node('p','vault-form-error'); body.append(fields,error);
  const value=name=>body.querySelector(`[name="${name}"]`)?.value??'';
  const capture=()=>({service:value('service'),owner:value('owner'),username:value('username'),password:value('password'),notes:value('notes')});
  const populate=v=>{error.textContent='';fields.replaceChildren(inputField('Service','service','text',v.service),selectField('Owner','owner',OWNER_OPTIONS,v.owner),inputField('Username / Login','username','text',v.username),inputField('Password','password','password',v.password),textAreaField('Notes','notes',v.notes));}; populate(saved);
  const actions=[];
  if(existing) actions.push({label:'Delete',kind:'danger',onClick:dialog=>confirmDestructive({title:'Delete Streaming record',message:`Delete ${existing.service}? This cannot be undone.`,onConfirm:()=>{try{stateService.commit(draft=>deleteStreamingDraft(draft,existing.id));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}})});
  actions.push({label:'Undo Changes',onClick:()=>populate(session.undo())},{label:'Cancel',onClick:dialog=>{session.cancel();dialog.close();}},{label:'Save',onClick:dialog=>{try{const draftValue=session.update(draft=>Object.assign(draft,capture()));stateService.commit(draft=>saveStreamingDraft(draft,{recordId:existing?.id||null,fields:draftValue},{now:stateService.now}));session.markSaved(draftValue);if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}});
  modalHost(host,createModal({title:existing?'Edit Streaming':'Add Streaming',body,actions}));
}

function openEmailEditor({ stateService, host, recordId = null }) {
  const state=stateService.snapshot(); const existing=recordId?state.protectedEmails.find(record=>record.id===recordId):null; if(recordId&&!existing)return;
  const saved={owner:existing?.owner||'Cameron',email:existing?.email||'',notes:existing?.notes||''}; const session=new FormSession(saved);
  const body=node('div','vault-editor'); const fields=node('div','vault-form-grid'); const error=node('p','vault-form-error'); body.append(fields,error);
  const value=name=>body.querySelector(`[name="${name}"]`)?.value??'';
  const capture=()=>({owner:value('owner'),email:value('email'),notes:value('notes')});
  const populate=v=>{error.textContent='';fields.replaceChildren(selectField('Owner','owner',OWNER_OPTIONS,v.owner),inputField('Email Address','email','email',v.email),textAreaField('Notes','notes',v.notes));}; populate(saved);
  const actions=[];
  if(existing) actions.push({label:'Delete',kind:'danger',onClick:dialog=>confirmDestructive({title:'Delete protected email',message:`Delete ${existing.email}? This cannot be undone.`,onConfirm:()=>{try{stateService.commit(draft=>deleteProtectedEmailDraft(draft,existing.id));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}})});
  actions.push({label:'Undo Changes',onClick:()=>populate(session.undo())},{label:'Cancel',onClick:dialog=>{session.cancel();dialog.close();}},{label:'Save',onClick:dialog=>{try{const draftValue=session.update(draft=>Object.assign(draft,capture()));stateService.commit(draft=>saveProtectedEmailDraft(draft,{recordId:existing?.id||null,fields:draftValue},{now:stateService.now}));session.markSaved(draftValue);if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}});
  modalHost(host,createModal({title:existing?'Edit Protected Email':'Add Protected Email',body,actions}));
}

function renderLocked(main, stateService, access, requestRender) {
  const state=stateService.snapshot(); const model=buildVaultViewModel(state,{unlocked:false});
  const hero=node('section','vault-lock-hero'); hero.append(node('p','eyebrow','PROTECTED LOCAL STORAGE'),node('h1','','The Vault'),node('p','vault-lock-copy','Passports, visas, insurance, accommodation details and emergency information remain concealed until The Vault is unlocked on this device.'));
  const unlock=node('button','button vault-unlock','Unlock The Vault'); unlock.type='button'; unlock.addEventListener('click',()=>openUnlockDialog({stateService,host:main,access,requestRender})); hero.append(unlock); main.append(hero);
  const grid=node('section','vault-category-grid vault-category-grid-locked');
  for(const card of model.categoryCards){const item=node('article',`vault-category-card vault-category-${card.id}`);item.append(node('span','vault-category-icon',card.icon),node('strong','',card.label),node('small','','Protected'));grid.append(item);} main.append(grid);
}

function renderOverview(main, stateService, access, requestRender) {
  const model=buildVaultViewModel(stateService.snapshot(),{unlocked:true,activeSection:'overview'});
  const grid=node('section','vault-category-grid');
  for(const card of model.categoryCards){const button=node('button',`vault-category-card vault-category-${card.id}`);button.type='button';button.append(node('span','vault-category-icon',card.icon),node('strong','',card.label),node('small','',`${card.count} ${card.count===1?'record':'records'}`));button.addEventListener('click',()=>{access.activeSection=card.id;requestRender();});grid.append(button);} main.append(grid);
  const lower=node('div','vault-overview-lower');
  const streaming=node('button','vault-streaming-card');streaming.type='button';streaming.append(node('span','vault-category-icon','▶'),node('strong','','Streaming'),node('small','',`${model.streaming.length} stored services`));streaming.addEventListener('click',()=>{markStreamingOpened(access);requestRender();});lower.append(streaming);
  const activity=node('section','vault-activity');const head=node('div','vault-section-head');head.append(node('h2','','Recent Activity'),node('span','vault-count',String(model.recentActivity.length)));activity.append(head);
  const list=node('div','vault-activity-list');if(!model.recentActivity.length)list.append(node('p','vault-empty','No entries yet'));for(const item of model.recentActivity){const row=node('div','vault-activity-row');row.append(node('strong','',item.title),node('small','',item.subtitle));list.append(row);}activity.append(list);lower.append(activity);main.append(lower);
}

function renderCategory(main,stateService,access,requestRender){
  const state=stateService.snapshot();const model=buildVaultViewModel(state,{unlocked:true,activeSection:access.activeSection});const category=access.activeSection;
  const head=node('section',`vault-section-hero vault-section-${category}`);const copy=node('div');copy.append(node('p','eyebrow','THE VAULT'),node('h1','',VAULT_CATEGORY_LABELS[category]),node('p','',`${model.records.length} stored ${model.records.length===1?'record':'records'} · local only`));const actions=node('div','vault-section-actions');const back=node('button','button','Back');back.type='button';back.addEventListener('click',()=>{access.activeSection='overview';access.selectedRecordId=null;requestRender();});const add=node('button','button vault-add','Add Record');add.type='button';add.addEventListener('click',()=>openVaultRecordEditor({stateService,host:main,initialCategory:category}));actions.append(back,add);head.append(copy,actions);main.append(head);
  const list=node('section','vault-record-list');if(!model.records.length)list.append(node('p','vault-empty','No entries yet'));
  for(const record of model.records){const card=node('article',`vault-record-card vault-record-${category}`);const cardHead=node('div','vault-record-head');const title=node('div');title.append(node('strong','vault-record-title',record.title),node('span','vault-owner',record.owner));const edit=node('button','button vault-edit','Edit');edit.type='button';edit.addEventListener('click',()=>openVaultRecordEditor({stateService,host:main,recordId:record.id,initialCategory:category}));cardHead.append(title,edit);card.append(cardHead);
    const facts=node('div','vault-record-facts');if(record.reference)facts.append(node('span','',`Reference: ${record.reference}`));if(record.displayIssueDate)facts.append(node('span','',`Issue / Start: ${record.displayIssueDate}`));if(record.displayExpiryDate)facts.append(node('span','',`Expiry / End: ${record.displayExpiryDate}`));if(facts.childElementCount)card.append(facts);if(record.details)card.append(node('p','vault-record-details',record.details));if(record.notes)card.append(node('p','vault-record-notes',record.notes));
    const attachments=node('div','vault-attachments');const attachmentHead=node('div','vault-attachment-head');attachmentHead.append(node('strong','',`Screenshots · ${record.attachments.length}`));const attach=node('button','button vault-attach','Add Screenshot');attach.type='button';attach.addEventListener('click',()=>openAttachmentPicker({stateService,host:main,record}));attachmentHead.append(attach);attachments.append(attachmentHead);const thumbs=node('div','vault-attachment-grid');for(const item of record.attachments){const figure=node('figure','vault-attachment');const img=document.createElement('img');img.src=item.dataUrl;img.alt=item.name;const caption=node('figcaption');caption.append(node('span','',item.name));const del=node('button','vault-attachment-delete','Delete');del.type='button';del.addEventListener('click',()=>confirmDestructive({title:'Delete screenshot',message:`Delete ${item.name}?`,onConfirm:()=>stateService.commit(draft=>deleteVaultAttachmentDraft(draft,item.id))}));caption.append(del);figure.append(img,caption);thumbs.append(figure);}if(!record.attachments.length)thumbs.append(node('p','vault-empty','No screenshots attached'));attachments.append(thumbs);card.append(attachments);list.append(card);}main.append(list);
}

function renderStreaming(main,stateService,access,requestRender){
  const model=buildVaultViewModel(stateService.snapshot(),{unlocked:true,activeSection:'streaming'});const head=node('section','vault-section-hero vault-section-streaming');const copy=node('div');copy.append(node('p','eyebrow','THE VAULT'),node('h1','','Streaming'),node('p','','Protected local streaming logins'));const actions=node('div','vault-section-actions');const back=node('button','button','Back');back.type='button';back.addEventListener('click',()=>{access.activeSection='overview';requestRender();});const add=node('button','button vault-add','Add Streaming');add.type='button';add.addEventListener('click',()=>openStreamingEditor({stateService,host:main}));actions.append(back,add);head.append(copy,actions);main.append(head);
  const hint=node('p','vault-sequence-hint','Hidden email manager armed. Tap the Travel Command Centre compass/logo while Streaming has been opened.');main.append(hint);
  const list=node('section','vault-streaming-list');if(!model.streaming.length)list.append(node('p','vault-empty','No entries yet'));for(const record of model.streaming){const row=node('article','vault-streaming-row');const copyRow=node('div','vault-streaming-copy');copyRow.append(node('strong','',record.service),node('small','',record.owner));if(record.username)copyRow.append(node('span','',record.username));const password=node('code','vault-password','••••••••');const toggle=node('button','vault-password-toggle','Show');toggle.type='button';let shown=false;toggle.addEventListener('click',()=>{shown=!shown;password.textContent=shown?(record.password||'No password stored'):'••••••••';toggle.textContent=shown?'Hide':'Show';});const edit=node('button','button vault-edit','Edit');edit.type='button';edit.addEventListener('click',()=>openStreamingEditor({stateService,host:main,recordId:record.id}));row.append(copyRow,password,toggle,edit);list.append(row);}main.append(list);
}

function renderHiddenEmails(main,stateService,access,requestRender){
  if(!access.hiddenEmailsRevealed)return;const state=stateService.snapshot();const panel=node('section','vault-hidden-email-panel');const head=node('div','vault-section-head');const title=node('div');title.append(node('p','eyebrow','CONCEALED MANAGER'),node('h2','','Protected Email Addresses'));const actions=node('div','vault-section-actions');const add=node('button','button vault-add','Add Email');add.type='button';add.addEventListener('click',()=>openEmailEditor({stateService,host:main}));const hide=node('button','button','Hide');hide.type='button';hide.addEventListener('click',()=>{hideHiddenEmails(access);requestRender();});actions.append(add,hide);head.append(title,actions);panel.append(head);const list=node('div','vault-email-list');if(!state.protectedEmails.length)list.append(node('p','vault-empty','No protected email addresses stored'));for(const record of state.protectedEmails){const row=node('button','vault-email-row');row.type='button';row.append(node('strong','',record.owner),node('span','',record.email));if(record.notes)row.append(node('small','',record.notes));row.addEventListener('click',()=>openEmailEditor({stateService,host:main,recordId:record.id}));list.append(row);}panel.append(list);main.append(panel);
}

export function renderVaultScreen({ stateService, vaultAccessSession:access, requestRender }) {
  const main=node('main','screen-root vault-screen');main.dataset.screen='vault';
  if(!access?.vaultUnlocked){renderLocked(main,stateService,access,requestRender);return main;}
  const toolbar=node('header','vault-toolbar');const heading=node('div');heading.append(node('p','eyebrow','LOCAL · PROTECTED'),node('h1','','The Vault'));const lock=node('button','button vault-lock','Lock Vault');lock.type='button';lock.addEventListener('click',()=>{lockVault(access);requestRender();});toolbar.append(heading,lock);main.append(toolbar);
  const pending=stateService.snapshot().ui?.pendingOpen;if(pending?.collection==='vault'&&pending.id){const target=stateService.snapshot().vault.find(record=>record.id===pending.id);if(target){access.activeSection=target.category;access.selectedRecordId=target.id;queueMicrotask(()=>stateService.commit(draft=>{draft.ui.pendingOpen=null;}));}}
  if(access.activeSection==='overview')renderOverview(main,stateService,access,requestRender);else if(access.activeSection==='streaming')renderStreaming(main,stateService,access,requestRender);else if(VAULT_CATEGORIES.includes(access.activeSection))renderCategory(main,stateService,access,requestRender);else{access.activeSection='overview';renderOverview(main,stateService,access,requestRender);}
  renderHiddenEmails(main,stateService,access,requestRender);return main;
}
