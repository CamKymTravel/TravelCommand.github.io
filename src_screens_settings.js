import { createModal } from './src_components_modal.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { buildAppHealth } from './src_core_app-health.js';
import { createBackupPayload } from './src_core_backup.js';
import { restoreBackup } from './src_core_restore.js';
import { saveGeneralSettingsDraft, enablePinDraft, disablePinDraft } from './src_core_settings-mutations.js';
import { hashPin, verifyPin } from './src_core_pin.js';
import { lockVault } from './src_core_vault-access.js';
import { formatAUDate } from './src_core_dates.js';

function node(tag, className, text) {
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!=null)element.textContent=text;
  return element;
}
function inputField(label,name,type='text',value='') {
  const wrap=node('label','settings-field');wrap.append(node('span','',label));
  const input=document.createElement('input');input.name=name;input.type=type;input.value=value??'';wrap.append(input);return wrap;
}
function modalHost(host,modal){host.append(modal);modal.addEventListener('close',()=>modal.remove(),{once:true});modal.showModal();}

function openGeneralEditor({stateService,host}) {
  const state=stateService.snapshot();
  const saved={journeyStartDate:state.settings.journeyStartDate||'',defaultCurrency:state.settings.defaultCurrency||'AUD',annualBudgetAUD:state.settings.annualBudgetAUD??0};
  const session=new FormSession(saved);const body=node('div','settings-editor');const fields=node('div','settings-form-grid');const error=node('p','settings-form-error');body.append(fields,error);
  const value=name=>body.querySelector(`[name="${name}"]`)?.value??'';
  const capture=()=>({journeyStartDate:value('journeyStartDate')||null,defaultCurrency:value('defaultCurrency'),annualBudgetAUD:value('annualBudgetAUD')});
  const populate=v=>{error.textContent='';fields.replaceChildren(inputField('Journey Start','journeyStartDate','date',v.journeyStartDate),inputField('Default Currency','defaultCurrency','text',v.defaultCurrency),inputField('Annual Budget (AUD)','annualBudgetAUD','number',v.annualBudgetAUD));const currency=fields.querySelector('[name="defaultCurrency"]');currency.maxLength=3;currency.autocapitalize='characters';const budget=fields.querySelector('[name="annualBudgetAUD"]');budget.min='0';budget.step='0.01';};populate(saved);
  const modal=createModal({title:'Travel & Budget Defaults',body,actions:[
    {label:'Undo Changes',onClick:()=>populate(session.undo())},
    {label:'Cancel',onClick:dialog=>{session.cancel();dialog.close();}},
    {label:'Save',onClick:dialog=>{try{const draftValue=session.update(draft=>Object.assign(draft,capture()));stateService.commit(draft=>saveGeneralSettingsDraft(draft,draftValue));session.markSaved(draftValue);if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}}
  ]});modalHost(host,modal);
}

function pinInput(label,name){const field=inputField(label,name,'password','');const input=field.querySelector('input');input.inputMode='numeric';input.autocomplete='off';input.maxLength=8;return field;}

function openPinEditor({stateService,host}) {
  const state=stateService.snapshot();const enabled=state.settings.pinEnabled;
  const body=node('div','settings-editor');const fields=node('div','settings-form-grid settings-pin-grid');const error=node('p','settings-form-error');body.append(fields,error);
  if(enabled)fields.append(pinInput('Current PIN','currentPin'));
  fields.append(pinInput('New PIN','newPin'),pinInput('Confirm New PIN','confirmPin'));
  const modal=createModal({title:enabled?'Change PIN':'Set PIN',body,actions:[
    {label:'Cancel',onClick:dialog=>dialog.close()},
    {label:'Save PIN',onClick:async dialog=>{try{const current=body.querySelector('[name="currentPin"]')?.value||'';const next=body.querySelector('[name="newPin"]').value;const confirm=body.querySelector('[name="confirmPin"]').value;if(enabled&&!(await verifyPin(current,state.settings.pinHash)))throw new Error('Current PIN is incorrect');if(next!==confirm)throw new Error('New PIN entries do not match');const hashed=await hashPin(next);stateService.commit(draft=>enablePinDraft(draft,hashed));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}}
  ]});modalHost(host,modal);
}

function openDisablePin({stateService,host}) {
  const state=stateService.snapshot();const body=node('div','settings-editor');const field=pinInput('Current PIN','currentPin');const error=node('p','settings-form-error');body.append(field,error);
  const modal=createModal({title:'Disable PIN',body,actions:[
    {label:'Cancel',onClick:dialog=>dialog.close()},
    {label:'Disable PIN',kind:'danger',onClick:async dialog=>{try{const current=body.querySelector('[name="currentPin"]').value;if(!(await verifyPin(current,state.settings.pinHash)))throw new Error('Current PIN is incorrect');stateService.commit(draft=>disablePinDraft(draft));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}}
  ]});modalHost(host,modal);
}

function downloadBackup(state,currentDate){
  const payload=createBackupPayload(state);const blob=new Blob([payload],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`Travel_Command_Centre_Backup_${currentDate}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}

function chooseRestoreFile({stateService,host,vaultAccessSession}) {
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;host.append(input);
  input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file){input.remove();return;}try{const serialized=await file.text();confirmDestructive({title:'Restore Travel Command Centre backup',message:'Restore will replace all current app data with the selected backup. This cannot be undone unless you have another backup.',confirmLabel:'Restore',onConfirm:()=>{try{restoreBackup(stateService,serialized);if(vaultAccessSession)lockVault(vaultAccessSession);}catch(err){window.alert(`Restore failed: ${err.message}`);}}});}catch(err){window.alert(`Could not read backup: ${err.message}`);}input.remove();},{once:true});input.click();
}

function statusLabel(status){if(status==='verified')return'Verified';if(status==='needs-setup')return'Needs Setup';return'Needs Attention';}

function renderHealth(state,currentDate){
  const model=buildAppHealth(state,currentDate);const panel=node('section',`settings-health settings-health-${model.status}`);const hero=node('div','settings-health-hero');const copy=node('div');copy.append(node('p','eyebrow','APP HEALTH'),node('h2','',statusLabel(model.status)),node('p','',model.status==='verified'?'All central integrity checks are clear.':model.status==='needs-setup'?'Core integrity is clear; one or more setup items remain.':`${model.issueCount} integrity issue${model.issueCount===1?'':'s'} need attention.`));const score=node('div','settings-health-score');score.append(node('strong','',`${model.verifiedCount}/${model.checks.length}`),node('small','','verified'));hero.append(copy,score);panel.append(hero);
  const grid=node('div','settings-health-grid');for(const item of model.checks){const card=node('article',`settings-health-card settings-health-card-${item.status}`);card.append(node('span','settings-health-dot',''),node('strong','',item.label),node('small','',statusLabel(item.status)),node('p','',item.summary));if(item.issues.length>1){const details=document.createElement('details');const summary=node('summary','',`${item.issues.length} details`);details.append(summary);const list=document.createElement('ul');for(const issue of item.issues){const li=document.createElement('li');li.textContent=issue;list.append(li);}details.append(list);card.append(details);}grid.append(card);}panel.append(grid);return panel;
}

export function renderSettingsScreen({stateService,currentDate,vaultAccessSession}) {
  const main=node('main','screen-root settings-screen');main.dataset.screen='settings';const state=stateService.snapshot();
  const toolbar=node('header','settings-toolbar');const heading=node('div');heading.append(node('p','eyebrow','TRAVEL COMMAND CENTRE'),node('h1','','Settings'));toolbar.append(heading);main.append(toolbar,renderHealth(state,currentDate));

  const defaults=node('section','settings-panel');const dHead=node('div','settings-section-head');dHead.append(node('h2','','Travel & Budget Defaults'));const edit=node('button','button settings-edit','Edit');edit.type='button';edit.addEventListener('click',()=>openGeneralEditor({stateService,host:main}));dHead.append(edit);defaults.append(dHead);const facts=node('div','settings-facts');facts.append(node('div','settings-fact',`Journey Start\n${state.settings.journeyStartDate?formatAUDate(state.settings.journeyStartDate):'Not set'}`),node('div','settings-fact',`Default Currency\n${state.settings.defaultCurrency}`),node('div','settings-fact',`Annual Budget\nAUD ${Number(state.settings.annualBudgetAUD||0).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}`),node('div','settings-fact',`Date Format\nDD/MM/YYYY`));defaults.append(facts);main.append(defaults);

  const security=node('section','settings-panel settings-security');const sHead=node('div','settings-section-head');sHead.append(node('h2','','Security'),node('span',`settings-pin-status settings-pin-${state.settings.pinEnabled?'enabled':'disabled'}`,state.settings.pinEnabled?'PIN Enabled':'PIN Off'));security.append(sHead);const sCopy=node('p','settings-panel-copy',state.settings.pinEnabled?'The optional PIN protects The Vault when it is opened.':'PIN protection is optional and off by default. The Vault can still be manually locked.');security.append(sCopy);const sActions=node('div','settings-actions');const pin=node('button','button settings-edit',state.settings.pinEnabled?'Change PIN':'Set PIN');pin.type='button';pin.addEventListener('click',()=>openPinEditor({stateService,host:main}));sActions.append(pin);if(state.settings.pinEnabled){const disable=node('button','button button-danger','Disable PIN');disable.type='button';disable.addEventListener('click',()=>openDisablePin({stateService,host:main}));sActions.append(disable);}security.append(sActions);main.append(security);

  const backup=node('section','settings-panel settings-backup');const bHead=node('div','settings-section-head');bHead.append(node('h2','','Backup & Restore'),node('span','settings-local-chip','Full JSON · Local'));backup.append(bHead,node('p','settings-panel-copy','Export one complete Travel Command Centre backup file. Restore validates the entire backup before replacing current data.'));const bActions=node('div','settings-actions');const exportButton=node('button','button settings-backup-button','Export Backup');exportButton.type='button';exportButton.addEventListener('click',()=>downloadBackup(stateService.snapshot(),currentDate));const restoreButton=node('button','button settings-restore-button','Restore Backup');restoreButton.type='button';restoreButton.addEventListener('click',()=>chooseRestoreFile({stateService,host:main,vaultAccessSession}));bActions.append(exportButton,restoreButton);backup.append(bActions);main.append(backup);

  const info=node('section','settings-panel settings-info');info.append(node('h2','','Application'));const rows=node('div','settings-info-rows');rows.append(node('div','','Platform\niPad Landscape · Offline PWA'),node('div','','Travellers\n2'),node('div','','Storage\nLocal device only'),node('div','','External Sync\nNone'));info.append(rows);main.append(info);return main;
}
