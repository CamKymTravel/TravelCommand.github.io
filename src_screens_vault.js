import { createModal, setModalTone } from './src_components_modal.js';
import { createPageHero } from './src_components_page-hero.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { buildVaultViewModel, VAULT_CATEGORY_LABELS } from './src_core_vault-view-model.js';
import {
  VAULT_CATEGORIES, VAULT_OWNERS, IMAGE_MIME_TYPES, MAX_VAULT_SCREENSHOT_BYTES, MAX_VAULT_SCREENSHOTS_PER_RECORD,
  createVaultAssetKey, validateVaultScreenshotPayload, saveVaultRecordDraft, deleteVaultRecordDraft, saveVaultAttachmentDraft, deleteVaultAttachmentDraft,
  saveStreamingDraft, deleteStreamingDraft, saveProtectedEmailDraft, deleteProtectedEmailDraft
} from './src_core_vault-mutations.js';
import { unlockVault, lockVault, markStreamingOpened, hideHiddenEmails, leaveStreaming } from './src_core_vault-access.js';
import { formatAUDate } from './src_core_dates.js';
import { verifyPin, upgradedPinHashAfterSuccessfulVerify } from './src_core_pin.js';
import { makeExpandableCard } from './src_components_modal.js';
import { createId } from './src_core_ids.js';

const OWNER_OPTIONS = VAULT_OWNERS.map(owner => [owner, owner]);
const CATEGORY_OPTIONS = VAULT_CATEGORIES.map(category => [category, VAULT_CATEGORY_LABELS[category]]);
const VAULT_TONES = Object.freeze({ passport:'blue', visa:'violet', insurance:'teal', accommodation:'orange', emergency:'red' });

function vaultRecordContext(record, { includeCategory = false } = {}) {
  return [
    record?.title,
    includeCategory ? (VAULT_CATEGORY_LABELS[record?.category] || record?.category) : '',
    record?.owner || 'Shared',
    record?.reference ? `Reference ${record.reference}` : '',
    record?.expiryDate ? `Expiry / End ${formatAUDate(record.expiryDate)}` : record?.issueDate ? `Issue / Start ${formatAUDate(record.issueDate)}` : ''
  ].filter(Boolean).join(' · ');
}
function streamingRecordContext(record) {
  return [record?.service, record?.owner || 'Shared', record?.username].filter(Boolean).join(' · ');
}

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
  const modal = createModal({ title:'Unlock The Vault', body, className:'tone-blue', actions:[
    { label:'Cancel', onClick:dialog => dialog.close() },
    { label:'Unlock', onClick:async dialog => {
      try {
        const ok = await verifyPin(input.value, state.settings.pinHash);
        if (!ok) return void (error.textContent = 'Incorrect PIN');
        const upgradedHash = await upgradedPinHashAfterSuccessfulVerify(input.value, state.settings.pinHash);
        if (upgradedHash && upgradedHash !== String(state.settings.pinHash || '').trim().toLowerCase()) {
          stateService.commit(draft => { draft.settings.pinHash = upgradedHash; draft.settings.pinRecoveryNotice = ''; });
        }
        unlockVault(access); if(dialog.isConnected&&dialog.open)dialog.close(); requestRender();
      } catch (err) { error.textContent = err.message; }
    }}
  ]});
  modalHost(host, modal);
}

function openVaultRecordEditor({ stateService, host, recordId = null, initialCategory = 'passport', access = null }) {
  const state = stateService.snapshot();
  const existing = recordId ? state.vault.find(record => record.id === recordId) : null;
  if (recordId && !existing) return;
  const saved = {
    category:existing?.category || initialCategory, title:existing?.title || '', owner:existing?.owner || 'Both',
    reference:existing?.reference || '', issueDate:existing?.issueDate || '', expiryDate:existing?.expiryDate || '', details:existing?.details || '', notes:existing?.notes || ''
  };
  const session = new FormSession(saved);
  const body = node('div', 'vault-editor'); const fields = node('div', 'vault-form-grid'); const error = node('p', 'vault-form-error'); body.append(fields, error);
  let modal = null;
  function value(name) { return body.querySelector(`[name="${name}"]`)?.value ?? ''; }
  function capture() { return { category:value('category'), title:value('title'), owner:value('owner'), reference:value('reference'), issueDate:value('issueDate') || null, expiryDate:value('expiryDate') || null, details:value('details'), notes:value('notes') }; }
  function populate(v) {
    error.textContent='';
    fields.replaceChildren(selectField('Category','category',CATEGORY_OPTIONS,v.category), inputField('Title','title','text',v.title), selectField('Owner','owner',OWNER_OPTIONS,v.owner), inputField('Reference / Number','reference','text',v.reference), inputField('Issue / Start Date','issueDate','date',v.issueDate), inputField('Expiry / End Date','expiryDate','date',v.expiryDate), textAreaField('Details','details',v.details), textAreaField('Notes','notes',v.notes));
    const categorySelect=fields.querySelector('[name="category"]');
    categorySelect?.addEventListener('change',()=>setModalTone(modal,VAULT_TONES[categorySelect.value]||'blue'));
    setModalTone(modal,VAULT_TONES[v.category]||'blue');
  }
  populate(saved);
  const actions=[];
  if (existing) actions.push({ label:'Delete', kind:'danger', onClick:dialog => confirmDestructive({ title:'Delete Vault record', message:`Delete ${vaultRecordContext(existing,{includeCategory:true})} and its screenshot attachments? This cannot be undone.`, onConfirm:() => { try { const assetKeys=stateService.snapshot().attachments.filter(item=>item.vaultRecordId===existing.id).map(item=>item.assetKey).filter(Boolean); stateService.commit(draft => deleteVaultRecordDraft(draft, existing.id)); void stateService.vaultAssetStore?.deleteMany(assetKeys); if (dialog.isConnected && dialog.open) dialog.close(); } catch(err) { error.textContent=err.message; } } }) });
  actions.push(
    { label:'Undo Changes', onClick:() => populate(session.undo()) },
    { label:'Cancel', onClick:dialog => { session.cancel(); dialog.close(); } },
    { label:'Save', onClick:dialog => {
      const previousSection = access?.activeSection;
      try {
        const draftValue=session.update(draft => Object.assign(draft,capture()));
        if(access){ access.activeSection=draftValue.category; access.selectedRecordId=null; }
        stateService.commit(draft => saveVaultRecordDraft(draft,{recordId:existing?.id || null,fields:draftValue},{now:stateService.now}));
        session.markSaved(draftValue);
        if(dialog.isConnected&&dialog.open) dialog.close();
      } catch(err){
        // Validation failures keep the unlocked editor in its prior category,
        // but a persistence failure synchronously enters Protected Recovery and
        // lockVault() resets the entire in-memory Vault session. Never partially
        // undo that security reset from this detached editor's catch handler.
        if(access?.vaultUnlocked && previousSection) access.activeSection=previousSection;
        error.textContent=err.message;
      }
    } }

  );
  modal = createModal({ title:existing?'Edit Vault Record':'Add Vault Record', body, actions, className:`tone-${VAULT_TONES[saved.category] || 'blue'}` });
  modalHost(host, modal);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read screenshot')); reader.readAsDataURL(file);
  });
}

function openAttachmentPicker({ stateService, host, record }) {
  const input=document.createElement('input'); input.type='file'; input.accept=IMAGE_MIME_TYPES.join(','); input.multiple=true; input.hidden=true; host.append(input);
  input.addEventListener('cancel',()=>input.remove(),{once:true});
  input.addEventListener('change', async () => {
    try {
      const files=[...input.files];
      if(!files.length) return;
      const currentCount=(stateService.snapshot().attachments||[]).filter(item=>item.vaultRecordId===record.id).length;
      if(currentCount+files.length>MAX_VAULT_SCREENSHOTS_PER_RECORD) throw new Error(`A Vault record can store up to ${MAX_VAULT_SCREENSHOTS_PER_RECORD} screenshots`);
      const prepared=[];
      for (const file of files) {
        if (!IMAGE_MIME_TYPES.includes(file.type)) throw new Error('Only PNG, JPEG or WebP screenshots can be attached');
        if (file.size > MAX_VAULT_SCREENSHOT_BYTES) throw new Error('Screenshot is too large for reliable offline storage. Use a screenshot under 1.5 MB.');
        prepared.push({ name:file.name, mimeType:file.type, dataUrl:await fileToDataUrl(file) });
      }
      const body=node('div','vault-attachment-stage');
      body.append(node('p','vault-attachment-stage-copy',`${prepared.length} screenshot${prepared.length===1?'':'s'} selected. Nothing is stored until Save Screenshots is tapped.`));
      const list=node('div','vault-attachment-stage-list');
      for(const item of prepared){const row=node('div','vault-attachment-stage-row');const img=document.createElement('img');img.src=item.dataUrl;img.alt='';row.append(img,node('span','',item.name));list.append(row);} body.append(list);
      const error=node('p','vault-form-error'); body.append(error);
      const modal=createModal({title:'Add Screenshots',body,className:`tone-${VAULT_TONES[record.category] || 'blue'}`,actions:[
        {label:'Cancel',onClick:d=>d.close()},
        {label:'Save Screenshots',onClick:async d=>{
          const staged=[];
          const saveButton=[...d.querySelectorAll('footer button')].find(button=>button.textContent==='Save Screenshots');
          if(saveButton)saveButton.disabled=true;
          try{
            if(!stateService.vaultAssetStore) throw new Error('Large offline screenshot storage is unavailable on this device');
            for(const item of prepared){
              const bytes=validateVaultScreenshotPayload(item.mimeType,item.dataUrl);
              const attachmentId=createId('vault-attachment');
              const assetKey=createVaultAssetKey(attachmentId);
              await stateService.vaultAssetStore.put(assetKey,item.dataUrl);
              staged.push({attachmentId,assetKey,byteLength:bytes,item});
            }
            stateService.commit(draft=>{for(const entry of staged)saveVaultAttachmentDraft(draft,{vaultRecordId:record.id,name:entry.item.name,mimeType:entry.item.mimeType,assetKey:entry.assetKey,byteLength:entry.byteLength,attachmentId:entry.attachmentId},{now:stateService.now});});
            if(d.isConnected&&d.open)d.close();
          }catch(err){
            try{await stateService.vaultAssetStore?.deleteMany(staged.map(entry=>entry.assetKey));}catch{}
            error.textContent=err.message;
            if(saveButton&&d.isConnected&&d.open)saveButton.disabled=false;
          }
        }}
      ]});
      modalHost(host,modal);
    } catch (err) { window.alert(err.message); }
    finally { input.remove(); }
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
  if(existing) actions.push({label:'Delete',kind:'danger',onClick:dialog=>confirmDestructive({title:'Delete Streaming record',message:`Delete ${existing.service} · ${existing.owner || 'Shared'}${existing.username ? ` · ${existing.username}` : ''}? This cannot be undone.`,onConfirm:()=>{try{stateService.commit(draft=>deleteStreamingDraft(draft,existing.id));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}})});
  actions.push({label:'Undo Changes',onClick:()=>populate(session.undo())},{label:'Cancel',onClick:dialog=>{session.cancel();dialog.close();}},{label:'Save',onClick:dialog=>{try{const draftValue=session.update(draft=>Object.assign(draft,capture()));stateService.commit(draft=>saveStreamingDraft(draft,{recordId:existing?.id||null,fields:draftValue},{now:stateService.now}));session.markSaved(draftValue);if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}});
  modalHost(host,createModal({title:existing?'Edit Streaming':'Add Streaming',body,actions,className:'tone-violet'}));
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
  modalHost(host,createModal({title:existing?'Edit Protected Email':'Add Protected Email',body,actions,className:'tone-magenta'}));
}

function renderLocked(main, stateService, access, requestRender) {
  const state=stateService.snapshot(); const model=buildVaultViewModel(state,{unlocked:false});
  main.append(createPageHero({ key:'header-vault', eyebrow:'PROTECTED LOCAL STORAGE', title:'The Vault', subtitle:'Secure your important travel documents and essential information.', className:'vault-reference-hero', position:'center center' }));
  const hero=node('section','vault-lock-hero'); hero.append(node('p','vault-lock-copy','Passports, visas, insurance, accommodation details and emergency information remain concealed until The Vault is unlocked on this device.'));
  const unlock=node('button','button vault-unlock','Unlock The Vault'); unlock.type='button'; unlock.addEventListener('click',()=>openUnlockDialog({stateService,host:main,access,requestRender})); hero.append(unlock); main.append(hero);
  const grid=node('section','vault-category-grid vault-category-grid-locked');
  for(const card of model.categoryCards){const item=node('article',`vault-category-card vault-category-${card.id}`);item.append(node('span','vault-category-icon',card.icon),node('strong','',card.label),node('small','','Protected'));grid.append(item);} main.append(grid);
}

function renderOverview(main, stateService, access, requestRender, currentDate) {
  const state=stateService.snapshot(); const model=buildVaultViewModel(state,{unlocked:true,activeSection:'overview'});
  const grid=node('section','vault-category-grid');
  for(const card of model.categoryCards){const button=node('button',`vault-category-card vault-category-${card.id}`);button.type='button';button.append(node('span','vault-category-icon',card.icon),node('strong','',card.label),node('b','vault-category-count',String(card.count)),node('small','',card.count===1?'record':'records'));button.addEventListener('click',()=>{access.activeSection=card.id;requestRender();});grid.append(button);} main.append(grid);
  const all=node('button','vault-all-records');all.type='button';all.append(node('span','vault-category-icon','🛂'),node('span','vault-all-copy',''),node('strong','','OPEN')); all.querySelector('.vault-all-copy').append(node('b','','ALL VAULT RECORDS'),node('small','',`${state.vault.length} records · ${state.attachments.length} screenshot attachments`)); all.addEventListener('click',()=>openAllVaultRecords({stateService,host:main,access,requestRender}));main.append(all);
  const now=String(currentDate||'').slice(0,10); const today=now?new Date(`${now}T00:00:00Z`):new Date(); const daysUntil=value=>Math.ceil((new Date(`${value}T00:00:00Z`)-today)/86400000); const expiring=state.vault.filter(r=>r.expiryDate&&daysUntil(r.expiryDate)>=0&&daysUntil(r.expiryDate)<=180).sort((a,b)=>String(a.expiryDate).localeCompare(String(b.expiryDate))); const expired=state.vault.filter(r=>r.expiryDate&&daysUntil(r.expiryDate)<0); const active=state.vault.length-expired.length;
  const summaryRow=node('section','vault-summary-row'); const summary=node('article','vault-summary-card');summary.append(node('h2','','Document Summary'));const stats=node('div','vault-summary-stats'); for(const [label,value,tone] of [['Total records',state.vault.length,'total'],['Valid / active',active,'active'],['Expiry watch · 180d',expiring.length,'watch'],['Expired',expired.length,'expired']]){const m=node('div',`vault-summary-stat vault-summary-${tone}`);m.append(node('strong','',String(value)),node('span','',label));stats.append(m);}summary.append(stats);
  const expiry=node('article','vault-expiry-card');expiry.append(node('h2','','Expiry Reminders')); if(!expiring.length)expiry.append(node('p','vault-empty','No records expire within 180 days.')); else{const list=node('div','vault-expiry-list');for(const r of expiring.slice(0,4)){const days=daysUntil(r.expiryDate);const countdown=days===0?'Today':`${days} day${days===1?'':'s'}`;const row=node('button','vault-expiry-row');row.type='button';row.append(node('strong','',r.title),node('span','',[r.owner||'Shared',`Expires ${formatAUDate(r.expiryDate)}`].join(' · ')),node('b','',countdown));row.setAttribute('aria-label',`Open ${vaultRecordContext(r,{includeCategory:true})} · Expires ${formatAUDate(r.expiryDate)} · ${countdown}`);row.addEventListener('click',()=>{access.activeSection=r.category;access.selectedRecordId=r.id;requestRender();});list.append(row);}expiry.append(list);} summaryRow.append(summary,expiry);main.append(summaryRow);
  const lower=node('div','vault-overview-lower');
  const emergency=node('section','vault-emergency-card'); emergency.append(node('h2','','Emergency Travel Card')); const emergencyRecords=state.vault.filter(r=>r.category==='emergency').slice(0,3); if(!emergencyRecords.length)emergency.append(node('p','vault-empty','No emergency contacts stored')); for(const r of emergencyRecords){const row=node('button','vault-emergency-row');row.type='button';row.append(node('strong','',r.title),node('span','',[r.owner||'Shared',r.reference||r.details||'Saved emergency contact'].filter(Boolean).join(' · ')));row.setAttribute('aria-label',`Open ${vaultRecordContext(r,{includeCategory:true})}`);row.addEventListener('click',()=>{access.activeSection='emergency';access.selectedRecordId=r.id;requestRender();});emergency.append(row);} lower.append(emergency);
  const activity=node('section','vault-activity');const head=node('div','vault-section-head');head.append(node('h2','','Recent Activity'),node('span','vault-count',String(model.recentActivity.length)));activity.append(head);const list=node('div','vault-activity-list');if(!model.recentActivity.length)list.append(node('p','vault-empty','No entries yet'));for(const item of model.recentActivity){const row=node('button','vault-activity-row');row.type='button';row.append(node('strong','',item.title),node('small','',item.subtitle));if(item.kind==='streaming'){const target=state.streaming.find(record=>record.id===item.id);row.setAttribute('aria-label',`Edit streaming login · ${streamingRecordContext(target || {service:item.title})}`);row.addEventListener('click',()=>openStreamingEditor({stateService,host:main,recordId:item.id}));}else{const target=state.vault.find(record=>record.id===item.vaultRecordId);if(target){row.setAttribute('aria-label',item.kind==='attachment'?`Open ${vaultRecordContext(target,{includeCategory:true})} for screenshot ${item.title}`:`Edit ${vaultRecordContext(target,{includeCategory:true})}`);row.addEventListener('click',()=>{access.activeSection=target.category;access.selectedRecordId=target.id;requestRender();});}else{row.disabled=true;row.setAttribute('aria-disabled','true');}}list.append(row);}activity.append(list);lower.append(activity);main.append(lower);
  const streaming=node('button','vault-streaming-card');streaming.type='button';streaming.append(node('span','vault-category-icon','▶'),node('strong','','Streaming'),node('small','',`${model.streaming.length} stored services`));streaming.addEventListener('click',()=>{markStreamingOpened(access);requestRender();});main.append(streaming);
  makeExpandableCard(summary,{host:main,title:'Document Summary',tone:'blue'});
  makeExpandableCard(expiry,{host:main,title:'Expiry Reminders',tone:'gold'});
  makeExpandableCard(emergency,{host:main,title:'Emergency Travel Card',tone:'red'});
  makeExpandableCard(activity,{host:main,title:'Recent Activity',tone:'teal'});
}
function openAllVaultRecords({stateService,host,access,requestRender}){const state=stateService.snapshot();const body=node('div','vault-all-list');for(const r of [...state.vault].sort((a,b)=>String(a.category).localeCompare(String(b.category))||String(a.title).localeCompare(String(b.title)))){const row=node('button','vault-all-row');row.type='button';row.append(node('strong','',r.title),node('span','',`${VAULT_CATEGORY_LABELS[r.category]} · ${r.owner||'Shared'}`));row.setAttribute('aria-label',`Open ${vaultRecordContext(r,{includeCategory:true})}`);row.addEventListener('click',()=>{dialog.close();access.activeSection=r.category;access.selectedRecordId=r.id;requestRender();});body.append(row);}const dialog=createModal({title:'All Vault Records',body,actions:[{label:'Close',onClick:d=>d.close()}],className:'tone-blue'});host.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});}

function renderCategory(main,stateService,access,requestRender){
  const state=stateService.snapshot();const model=buildVaultViewModel(state,{unlocked:true,activeSection:access.activeSection});const category=access.activeSection;
  const head=node('section',`vault-section-hero vault-section-${category}`);const copy=node('div');copy.append(node('p','eyebrow','THE VAULT'),node('h1','',VAULT_CATEGORY_LABELS[category]),node('p','',`${model.records.length} stored ${model.records.length===1?'record':'records'} · local only`));const actions=node('div','vault-section-actions');const back=node('button','button','Back');back.type='button';back.addEventListener('click',()=>{access.activeSection='overview';access.selectedRecordId=null;requestRender();});const add=node('button','button vault-add','Add Record');add.type='button';add.addEventListener('click',()=>openVaultRecordEditor({stateService,host:main,initialCategory:category,access}));actions.append(back,add);head.append(copy,actions);main.append(head);
  const list=node('section','vault-record-list');if(!model.records.length)list.append(node('p','vault-empty','No entries yet'));
  for(const record of model.records){const card=node('article',`vault-record-card vault-record-${category}`);const cardHead=node('div','vault-record-head');const title=node('div');title.append(node('strong','vault-record-title',record.title),node('span','vault-owner',record.owner));const edit=node('button','button vault-edit','Edit');edit.type='button';edit.setAttribute('aria-label',`Edit ${vaultRecordContext(record)}`);edit.addEventListener('click',()=>openVaultRecordEditor({stateService,host:main,recordId:record.id,initialCategory:category,access}));cardHead.append(title,edit);card.append(cardHead);
    const facts=node('div','vault-record-facts');if(record.reference)facts.append(node('span','',`Reference: ${record.reference}`));if(record.displayIssueDate)facts.append(node('span','',`Issue / Start: ${record.displayIssueDate}`));if(record.displayExpiryDate)facts.append(node('span','',`Expiry / End: ${record.displayExpiryDate}`));if(facts.childElementCount)card.append(facts);if(record.details)card.append(node('p','vault-record-details',record.details));if(record.notes)card.append(node('p','vault-record-notes',record.notes));
    const attachments=node('div','vault-attachments');const attachmentHead=node('div','vault-attachment-head');attachmentHead.append(node('strong','',`Screenshots · ${record.attachments.length}`));const attach=node('button','button vault-attach','Add Screenshot');attach.type='button';attach.setAttribute('aria-label',`Add screenshot to ${vaultRecordContext(record)}`);attach.addEventListener('click',()=>openAttachmentPicker({stateService,host:main,record}));attachmentHead.append(attach);attachments.append(attachmentHead);const thumbs=node('div','vault-attachment-grid');for(const [attachmentIndex,item] of record.attachments.entries()){const figure=node('figure','vault-attachment');const img=document.createElement('img');if(item.dataUrl)img.src=item.dataUrl;else void stateService.attachmentDataUrl(item).then(payload=>{if(payload&&img.isConnected)img.src=payload;}).catch(()=>{if(img.isConnected)img.alt=`${item.name} · screenshot unavailable`;});img.alt=item.name;const caption=node('figcaption');caption.append(node('span','',item.name));const del=node('button','vault-attachment-delete','Delete');del.type='button';const screenshotContext=`${item.name} · Screenshot ${attachmentIndex+1} of ${record.attachments.length}`;del.setAttribute('aria-label',`Delete ${screenshotContext} from ${vaultRecordContext(record,{includeCategory:true})}`);del.addEventListener('click',()=>confirmDestructive({title:'Delete screenshot',message:`Delete ${screenshotContext} from ${vaultRecordContext(record,{includeCategory:true})}?`,onConfirm:()=>{try{const assetKey=item.assetKey;stateService.commit(draft=>deleteVaultAttachmentDraft(draft,item.id));if(assetKey)void stateService.vaultAssetStore?.delete(assetKey);}catch(err){window.alert(`Delete failed: ${err.message}`);}}}));caption.append(del);figure.append(img,caption);thumbs.append(figure);}if(!record.attachments.length)thumbs.append(node('p','vault-empty','No screenshots attached'));attachments.append(thumbs);card.append(attachments);list.append(card);makeExpandableCard(card,{host:main,title:record.title,tone:VAULT_TONES[category]||'blue'});}main.append(list);
  const selected=access.selectedRecordId;
  if(selected && state.vault.some(record=>record.id===selected&&record.category===category)){ access.selectedRecordId=null; queueMicrotask(()=>{if(main.isConnected)openVaultRecordEditor({stateService,host:main,recordId:selected,initialCategory:category,access});}); }
}

function renderStreaming(main,stateService,access,requestRender){
  const model=buildVaultViewModel(stateService.snapshot(),{unlocked:true,activeSection:'streaming'});const head=node('section','vault-section-hero vault-section-streaming');const copy=node('div');copy.append(node('p','eyebrow','THE VAULT'),node('h1','','Streaming'),node('p','','Protected local streaming logins'));const actions=node('div','vault-section-actions');const back=node('button','button','Back');back.type='button';back.addEventListener('click',()=>{leaveStreaming(access);requestRender();});const add=node('button','button vault-add','Add Streaming');add.type='button';add.addEventListener('click',()=>openStreamingEditor({stateService,host:main}));actions.append(back,add);head.append(copy,actions);main.append(head);
  const list=node('section','vault-streaming-list');if(!model.streaming.length)list.append(node('p','vault-empty','No entries yet'));for(const record of model.streaming){const row=node('article','vault-streaming-row');const copyRow=node('div','vault-streaming-copy');copyRow.append(node('strong','',record.service),node('small','',record.owner));if(record.username)copyRow.append(node('span','',record.username));const password=node('code','vault-password','••••••••');const toggle=node('button','vault-password-toggle','Show');toggle.type='button';toggle.setAttribute('aria-label',`Show password for ${streamingRecordContext(record)}`);toggle.setAttribute('aria-pressed','false');let shown=false;toggle.addEventListener('click',()=>{shown=!shown;password.textContent=shown?(record.password||'No password stored'):'••••••••';toggle.textContent=shown?'Hide':'Show';toggle.setAttribute('aria-label',`${shown?'Hide':'Show'} password for ${streamingRecordContext(record)}`);toggle.setAttribute('aria-pressed',String(shown));});const edit=node('button','button vault-edit','Edit');edit.type='button';edit.setAttribute('aria-label',`Edit streaming login for ${streamingRecordContext(record)}`);edit.addEventListener('click',()=>openStreamingEditor({stateService,host:main,recordId:record.id}));row.append(copyRow,password,toggle,edit);list.append(row);makeExpandableCard(row,{host:main,title:record.service,tone:'violet'});}main.append(list);
}

function renderHiddenEmails(main,stateService,access,requestRender){
  if(!access.hiddenEmailsRevealed)return;const state=stateService.snapshot();const panel=node('section','vault-hidden-email-panel');const head=node('div','vault-section-head');const title=node('div');title.append(node('p','eyebrow','CONCEALED MANAGER'),node('h2','','Protected Email Addresses'));const actions=node('div','vault-section-actions');const add=node('button','button vault-add','Add Email');add.type='button';add.addEventListener('click',()=>openEmailEditor({stateService,host:main}));const hide=node('button','button','Hide');hide.type='button';hide.addEventListener('click',()=>{hideHiddenEmails(access);requestRender();});actions.append(add,hide);head.append(title,actions);panel.append(head);const list=node('div','vault-email-list');if(!state.protectedEmails.length)list.append(node('p','vault-empty','No protected email addresses stored'));for(const record of state.protectedEmails){const row=node('button','vault-email-row');row.type='button';row.append(node('strong','',record.owner),node('span','',record.email));if(record.notes)row.append(node('small','',record.notes));row.setAttribute('aria-label',`Edit protected email · ${record.owner || 'Shared'} · ${record.email}`);row.addEventListener('click',()=>openEmailEditor({stateService,host:main,recordId:record.id}));list.append(row);}panel.append(list);main.append(panel);
}

export function renderVaultScreen({ stateService, vaultAccessSession:access, requestRender, currentDate }) {
  const main=node('main','screen-root vault-screen');main.dataset.screen='vault';
  if(!access?.vaultUnlocked){renderLocked(main,stateService,access,requestRender);return main;}
  const unlockedState=stateService.snapshot();
  const heroActions=node('div','vault-hero-actions');
  const streaming=node('button','vault-hero-streaming','▣  STREAMING');streaming.type='button';streaming.addEventListener('click',()=>{markStreamingOpened(access);requestRender();});
  const status=node('div','vault-hero-status');status.append(node('small','','VAULT STATUS'),node('strong','',String(unlockedState.vault.length)),node('span','',`RECORD${unlockedState.vault.length===1?'':'S'} SECURED`),node('em','','LOCAL ONLY · STORED ON THIS IPAD'));
  const lock=node('button','vault-hero-lock','Lock Vault');lock.type='button';lock.addEventListener('click',()=>{lockVault(access);requestRender();});
  heroActions.append(streaming,status,lock);
  main.append(createPageHero({ key:'header-vault', eyebrow:'THE VAULT', title:'The Vault', subtitle:'Secure your important travel documents and essential information.', className:'vault-reference-hero', actions:heroActions, position:'center center' }));
  const pending=stateService.snapshot().ui?.pendingOpen;if(pending?.collection==='vault'&&pending.id){const target=stateService.snapshot().vault.find(record=>record.id===pending.id);if(target){access.activeSection=target.category;access.selectedRecordId=null;queueMicrotask(()=>{if(!main.isConnected)return;stateService.commit(draft=>{draft.ui.pendingOpen=null;});const liveHost=document.querySelector('[data-screen="vault"]');if(liveHost)openVaultRecordEditor({stateService,host:liveHost,recordId:target.id,initialCategory:target.category,access});});}}
  if(access.activeSection!=='streaming'){access.streamingOpenedSinceUnlock=false;hideHiddenEmails(access);}
  if(access.activeSection==='overview')renderOverview(main,stateService,access,requestRender,currentDate);else if(access.activeSection==='streaming')renderStreaming(main,stateService,access,requestRender);else if(VAULT_CATEGORIES.includes(access.activeSection))renderCategory(main,stateService,access,requestRender);else{access.activeSection='overview';access.streamingOpenedSinceUnlock=false;hideHiddenEmails(access);renderOverview(main,stateService,access,requestRender,currentDate);}
  renderHiddenEmails(main,stateService,access,requestRender);return main;
}
