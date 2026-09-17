import { captureLocalFocus, createModal, makeExpandableCard, restoreLocalFocus } from './src_components_modal.js';
import { createPageHero } from './src_components_page-hero.js';
import { FormSession } from './src_components_form-session.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { buildAppHealth } from './src_core_app-health.js';
import { createBackupPayload } from './src_core_backup.js';
import { restoreBackup } from './src_core_restore.js';
import { saveGeneralSettingsDraft, enablePinDraft, disablePinDraft } from './src_core_settings-mutations.js';
import { hashPin, verifyPin } from './src_core_pin.js';
import { lockVault } from './src_core_vault-access.js';
import { formatAUDate, toISODate } from './src_core_dates.js';
import { annualBudgetForYear } from './src_core_budget.js';
import { createLineIcon } from './src_components_icons.js';

function node(tag, className, text) {
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!=null)element.textContent=text;
  return element;
}
function inputField(label,name,type='text',value='') {
  const wrap=node('label','settings-field');wrap.append(node('span','',label));
  const input=document.createElement('input');input.name=name;input.type=type;input.value=value??'';
  if(type==='date'){input.lang='en-AU';const updateAccessibleDate=()=>{let display='DD/MM/YYYY';if(input.value){try{display=formatAUDate(input.value);}catch{display='DD/MM/YYYY';}}input.setAttribute('aria-label',`${label} · ${display}`);};updateAccessibleDate();input.addEventListener('input',updateAccessibleDate);input.addEventListener('change',updateAccessibleDate);}
  wrap.append(input);return wrap;
}
function modalHost(host,modal){host.append(modal);modal.addEventListener('close',()=>modal.remove(),{once:true});modal.showModal();}

function openGeneralEditor({stateService,host,currentDate}) {
  const state=stateService.snapshot();
  const currentYear=Number(toISODate(currentDate || new Date().toISOString()).slice(0,4));
  const journeyYear=state.settings.journeyStartDate?Number(String(state.settings.journeyStartDate).slice(0,4)):currentYear;
  const budgetYear=Math.max(currentYear,Number.isFinite(journeyYear)?journeyYear:currentYear);
  const saved={journeyStartDate:state.settings.journeyStartDate||'',defaultCurrency:state.settings.defaultCurrency||'AUD',annualBudgetAUD:annualBudgetForYear(state.settings,budgetYear),annualBudgetYear:budgetYear};
  const session=new FormSession(saved);const body=node('div','settings-editor');const fields=node('div','settings-form-grid');const error=node('p','settings-form-error');body.append(fields,error);
  const value=name=>body.querySelector(`[name="${name}"]`)?.value??'';
  const capture=()=>({journeyStartDate:value('journeyStartDate')||null,defaultCurrency:value('defaultCurrency'),annualBudgetAUD:value('annualBudgetAUD'),annualBudgetYear:saved.annualBudgetYear});
  const populate=v=>{error.textContent='';fields.replaceChildren(inputField('Journey Start','journeyStartDate','date',v.journeyStartDate),inputField('Default Currency','defaultCurrency','text',v.defaultCurrency),inputField(`Annual Budget ${saved.annualBudgetYear} (AUD)`,'annualBudgetAUD','number',v.annualBudgetAUD));const currency=fields.querySelector('[name="defaultCurrency"]');currency.maxLength=3;currency.autocapitalize='characters';const budget=fields.querySelector('[name="annualBudgetAUD"]');budget.min='0';budget.step='0.01';};populate(saved);
  const modal=createModal({title:'Travel & Budget Defaults',body,className:'tcc-editor-modal tcc-settings-editor-modal tone-sky',actions:[
    {label:'Undo Changes',onClick:()=>populate(session.undo())},
    {label:'Cancel',onClick:dialog=>{session.cancel();dialog.close();}},
    {label:'Save',onClick:dialog=>{try{const draftValue=session.update(draft=>Object.assign(draft,capture()));stateService.commit(draft=>saveGeneralSettingsDraft(draft,draftValue));session.markSaved(draftValue);if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}}
  ]});modalHost(host,modal);
}

function pinInput(label,name){const field=inputField(label,name,'password','');const input=field.querySelector('input');input.inputMode='numeric';input.autocomplete='new-password';input.pattern='[0-9]*';input.maxLength=8;input.classList.add('tcc-pin-input');input.setAttribute('aria-label',label);return field;}

function openPinEditor({stateService,host}) {
  const state=stateService.snapshot();const enabled=state.settings.pinEnabled;
  const body=node('div','settings-editor');const fields=node('div','settings-form-grid settings-pin-grid');const error=node('p','settings-form-error');body.append(fields,error);
  if(enabled)fields.append(pinInput('Current PIN','currentPin'));
  fields.append(pinInput('New PIN','newPin'),pinInput('Confirm New PIN','confirmPin'));
  const modal=createModal({title:enabled?'Change PIN':'Set PIN',body,className:'tcc-editor-modal tcc-settings-editor-modal tone-gold',actions:[
    {label:'Cancel',onClick:dialog=>dialog.close()},
    {label:'Save PIN',onClick:async dialog=>{try{const current=body.querySelector('[name="currentPin"]')?.value||'';const next=body.querySelector('[name="newPin"]').value;const confirm=body.querySelector('[name="confirmPin"]').value;if(enabled&&!(await verifyPin(current,state.settings.pinHash)))throw new Error('Current PIN is incorrect');if(next!==confirm)throw new Error('New PIN entries do not match');const hashed=await hashPin(next);stateService.commit(draft=>enablePinDraft(draft,hashed));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}}
  ]});modalHost(host,modal);
}

function openDisablePin({stateService,host}) {
  const state=stateService.snapshot();const body=node('div','settings-editor');const field=pinInput('Current PIN','currentPin');const error=node('p','settings-form-error');body.append(field,error);
  const modal=createModal({title:'Disable PIN',body,className:'tcc-editor-modal tcc-settings-editor-modal tone-gold',actions:[
    {label:'Cancel',onClick:dialog=>dialog.close()},
    {label:'Disable PIN',kind:'danger',onClick:async dialog=>{try{const current=body.querySelector('[name="currentPin"]').value;if(!(await verifyPin(current,state.settings.pinHash)))throw new Error('Current PIN is incorrect');stateService.commit(draft=>disablePinDraft(draft));if(dialog.isConnected&&dialog.open)dialog.close();}catch(err){error.textContent=err.message;}}}
  ]});modalHost(host,modal);
}

async function downloadBackup(stateService,currentDate){
  try {
    const snapshot=stateService.vaultAssetStore?await stateService.snapshotWithVaultAssets():stateService.snapshot();
    const payload=createBackupPayload(snapshot,{exportedAt:stateService.now()});const blob=new Blob([payload],{type:'application/octet-stream'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`Travel_Command_Centre_Backup_${currentDate}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
  } catch(err) { window.alert(`Backup failed: ${err.message}`); }
}

function chooseRestoreFile({stateService,host,vaultAccessSession,onBusyChange=null}) {
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;host.append(input);
  input.addEventListener('cancel',()=>input.remove(),{once:true});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file){input.remove();return;}
    onBusyChange?.(true);
    try{
      const serialized=await file.text();
      const confirmation=confirmDestructive({title:'Restore Travel Command Centre backup',tone:'copper',message:'Restore will replace all current app data with the selected backup. This cannot be undone unless you have another backup.',confirmLabel:'Restore',onConfirm:async()=>{if(vaultAccessSession)lockVault(vaultAccessSession);await Promise.resolve(restoreBackup(stateService,serialized));}});
      confirmation?.addEventListener('close',()=>onBusyChange?.(false),{once:true});
    }catch(err){
      onBusyChange?.(false);
      window.alert(`Could not read backup: ${err.message}`);
    }
    input.remove();
  },{once:true});input.click();
}

function statusLabel(status){if(status==='verified')return'Verified';if(status==='needs-setup'||status==='not-configured')return'Needs Setup';return'Needs Attention';}

const HEALTH_ICONS=Object.freeze({
  'Data Integrity':'check',
  'Budget':'budget',
  'Reservations':'flight',
  'Calendar':'calendar',
  'Journey History':'history',
  'Checklist':'checklist',
  'The Vault':'vault',
  'Backup & Restore':'repeat',
  'Cross-Screen Routing':'itinerary'
});

function renderHealth(stateService,currentDate,host){
  const model=buildAppHealth(stateService.snapshot(),currentDate,{vaultAssetIssues:stateService.vaultAssetIssues||[]});
  const dirty=Boolean(stateService.isAppHealthDirty?.());
  // The primary App Health control is deliberately binary. Until a whole-app
  // verification has cleared the current build/data state it is RED. A clean
  // verification makes it GREEN. Setup-only findings stay amber in their own
  // detail cards and must never turn the primary control amber.
  const needsPrimaryCheck=dirty || model.status==='needs-attention';
  const recheckOnly=dirty && model.status!=='needs-attention';
  const displayStatus=needsPrimaryCheck ? 'needs-attention' : 'verified';
  const panel=node('section',`settings-health settings-health-${displayStatus}${recheckOnly?' settings-health-dirty':''}`);const hero=node('div','settings-health-hero');const copy=node('div','settings-health-copy');
  const healthState=needsPrimaryCheck?'Check Required':'Verified';
  const healthSummary=needsPrimaryCheck?(model.status==='needs-attention'?`${model.issueCount} integrity issue${model.issueCount===1?'':'s'} need attention.`:'Saved travel data has changed since the last whole-app verification. Run the check before relying on the verified state.'):(model.status==='needs-setup'?'Core integrity is clear; setup items remain listed below.':'All central integrity checks are clear.');
  const healthEyebrow=node('p','eyebrow settings-health-eyebrow','FULL APP CHECK');
  copy.append(healthEyebrow,node('h2','','APP HEALTH'),node('p','',healthSummary));
  const healthBrand=node('div','settings-health-brand');const ambulance=node('span','settings-health-ambulance');ambulance.append(createLineIcon('ambulance'));healthBrand.append(ambulance,copy);
  const score=node('div',`settings-health-score settings-health-score-${displayStatus}`);const scoreLabel=needsPrimaryCheck?(recheckOnly?'RE-CHECK REQUIRED':'ATTENTION NEEDED'):'VERIFIED';const scoreTitle=needsPrimaryCheck?'CHECK REQUIRED':'ALL GOOD';
  const scoreIcon=node('span','settings-health-score-icon');scoreIcon.append(createLineIcon(!needsPrimaryCheck?'check':'plus'));
  const scoreCopy=node('span','settings-health-score-copy');scoreCopy.append(node('strong','',scoreTitle),node('small','',`${model.verifiedCount}/${model.checks.length} · ${scoreLabel}`));
  const pulse=document.createElementNS('http://www.w3.org/2000/svg','svg');pulse.setAttribute('class','settings-health-pulse-line');pulse.setAttribute('viewBox','0 0 90 32');pulse.setAttribute('aria-hidden','true');const pulsePath=document.createElementNS('http://www.w3.org/2000/svg','path');pulsePath.setAttribute('d','M2 18h18l5-9 7 18 8-25 10 28 8-12h30');pulse.append(pulsePath);
  score.append(scoreIcon,scoreCopy,pulse);hero.append(healthBrand,score);panel.append(hero);
  const run=node('button',`settings-health-run settings-health-run-${displayStatus}`); run.type='button';
  const runLabel=node('span','settings-health-run-label','CHECK THE WHOLE APP');
  const runPulse=document.createElementNS('http://www.w3.org/2000/svg','svg');runPulse.setAttribute('class','settings-health-run-pulse');runPulse.setAttribute('viewBox','0 0 170 30');runPulse.setAttribute('aria-hidden','true');
  const runPulsePath=document.createElementNS('http://www.w3.org/2000/svg','path');runPulsePath.setAttribute('d','M2 17h32l7-10 9 20 9-26 13 29 10-13h22l7-8 8 16 8-22 11 25 9-11h22');runPulse.append(runPulsePath);
  run.append(createLineIcon(!needsPrimaryCheck?'check':'plus'),runLabel,runPulse);
  run.addEventListener('click',async()=>{const focusBeforeCheck=captureLocalFocus();run.classList.add('is-running');runLabel.textContent='CHECKING…';run.disabled=true;try{await stateService.cleanupOrphanVaultAssets?.();await stateService.auditVaultAssets?.();const checked=buildAppHealth(stateService.snapshot(),currentDate,{vaultAssetIssues:stateService.vaultAssetIssues||[]});if(checked.status!=='needs-attention')stateService.markAppHealthChecked?.();}catch{}setTimeout(()=>{if(!panel.isConnected)return;const replacement=renderHealth(stateService,currentDate,host);panel.replaceWith(replacement);restoreLocalFocus(focusBeforeCheck,{fallbackSelector:'.settings-health-run'});},120);}); panel.append(run);
  const HEALTH_CARD_TONES=Object.freeze({
    'Data Integrity':'silver',
    'Budget':'gold',
    'Reservations':'copper',
    'Calendar':'teal',
    'Journey History':'lime',
    'Checklist':'blue',
    'The Vault':'violet',
    'Backup & Restore':'magenta',
    'Cross-Screen Routing':'maroon'
  });
  const grid=node('div','settings-health-grid');for(const [index,item] of model.checks.entries()){
    // Card colour is a visual identity; the dot/label below remains semantic.
    // This prevents nine green health widgets from reading as duplicates while
    // keeping verified / needs-setup / needs-attention meaning unchanged.
    const healthTone=HEALTH_CARD_TONES[item.label]||'silver';
    const card=node('article',`settings-health-card settings-health-card-${item.status} settings-health-card-tone-${healthTone}`);
    const icon=node('span','settings-health-icon'); icon.append(createLineIcon(HEALTH_ICONS[item.label]||'check'));
    const cardCopy=node('div','settings-health-card-copy');cardCopy.append(node('strong','',item.label),node('p','',item.summary));
    const status=node('div','settings-health-card-status');status.append(node('span','settings-health-dot',''),node('small','',statusLabel(item.status)));
    card.append(icon,cardCopy,status);
    if(item.issues.length>1){const details=document.createElement('details');const summary=node('summary','',`${item.issues.length} details`);details.append(summary);const list=document.createElement('ul');for(const issue of item.issues){const li=document.createElement('li');li.textContent=issue;list.append(li);}details.append(list);card.append(details);}
    grid.append(card);
    makeExpandableCard(card,{host,title:item.label,tone:healthTone});
  }panel.append(grid);return panel;
}


function settingsExpandedFact(label,value,detail='') {
  const item=node('article','settings-expanded-fact');
  item.append(node('small','',label),node('strong','',value==null||value===''?'—':String(value)));
  if(detail)item.append(node('span','',detail));
  return item;
}

function settingsExpandedBody(kind,state,currentDate) {
  const body=node('section',`settings-panel settings-expanded-readonly settings-expanded-${kind}`);
  const grid=node('div','settings-expanded-grid');
  if(kind==='defaults') {
    grid.append(
      settingsExpandedFact('JOURNEY START',state.settings.journeyStartDate?formatAUDate(state.settings.journeyStartDate):'Not set','One source of truth for journey timing.'),
      settingsExpandedFact('DEFAULT CURRENCY',state.settings.defaultCurrency||'AUD','Used as the starting currency for new entries.'),
      settingsExpandedFact(`ANNUAL BUDGET ${Number(toISODate(currentDate).slice(0,4))}`,`AUD ${annualBudgetForYear(state.settings,Number(toISODate(currentDate).slice(0,4))).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}`,'Calendar-year monitoring limit.'),
      settingsExpandedFact('DATE FORMAT','DD/MM/YYYY','Australian date format across the app.'),
      settingsExpandedFact('TRAVELLERS',String(state.settings.defaultTravellers||2),'Default travel party size.')
    );
  } else if(kind==='security') {
    grid.append(
      settingsExpandedFact('VAULT PIN',state.settings.pinEnabled?'Enabled':'Off',state.settings.pinEnabled?'PIN protection is active when The Vault is opened.':'PIN protection remains optional.'),
      settingsExpandedFact('VAULT LOCK','Manual','The Vault can always be returned to its protected locked state.'),
      settingsExpandedFact('STORAGE','This iPad only','Security-sensitive records remain in local app storage.')
    );
    if(state.settings.pinRecoveryNotice) body.append(node('p','settings-expanded-note settings-expanded-warning',state.settings.pinRecoveryNotice));
  } else if(kind==='backup') {
    grid.append(
      settingsExpandedFact('BACKUP FORMAT','One complete JSON file','Includes the full Travel Command Centre data set.'),
      settingsExpandedFact('RESTORE','Replace current data','A restore validates first, then replaces current data only after confirmation.'),
      settingsExpandedFact('STORAGE','Manual / local','No cloud database or subscription is required.'),
      settingsExpandedFact('VAULT ASSETS','Included','Stored Vault screenshots are carried with a full backup when available.')
    );
  } else {
    grid.append(
      settingsExpandedFact('PLATFORM','iPad','Landscape primary · portrait/upright supported for entry forms.'),
      settingsExpandedFact('MODE','Offline PWA','Designed to keep working without external services.'),
      settingsExpandedFact('TRAVELLERS','2','Cameron & Kym.'),
      settingsExpandedFact('STORAGE','Local device only','No online database.'),
      settingsExpandedFact('EXTERNAL SYNC','None','Calendar, weather, flights and currency remain manual/offline.'),
      settingsExpandedFact('DATE & TIME','iPad device clock','No online time service is required.'),
      settingsExpandedFact('OFFLINE LAUNCH','Immediate cached shell','Launch does not wait for a network probe.'),
      settingsExpandedFact('SAVE BEHAVIOUR','Save button commits','Edits remain drafts until Save is pressed.'),
      settingsExpandedFact('DATE FORMAT','DD/MM/YYYY','Australian date format throughout the app.')
    );
  }
  body.prepend(node('p','settings-expanded-intro','Large read-only overview. Close this view to use the Edit, Backup or Restore controls on Settings.'));
  body.append(grid);
  return body;
}

export function renderSettingsScreen({stateService,currentDate,vaultAccessSession}) {
  const main=node('main','screen-root settings-screen');main.dataset.screen='settings';const state=stateService.snapshot();
  main.append(createPageHero({ key:'header-settings', eyebrow:'TRAVEL COMMAND CENTRE', title:'Settings', subtitle:'Configure your app preferences and system settings.', className:'settings-reference-hero', position:'center center' }));
    const health=renderHealth(stateService,currentDate,main);main.append(health);

  const defaults=node('section','settings-panel settings-defaults');const dHead=node('div','settings-section-head');dHead.append(node('h2','','Travel & Budget Defaults'));const edit=node('button','button settings-edit','Edit');edit.type='button';edit.setAttribute('aria-label','Edit Travel & Budget Defaults');edit.addEventListener('click',()=>openGeneralEditor({stateService,host:main,currentDate}));dHead.append(edit);defaults.append(dHead);const facts=node('div','settings-facts');facts.append(node('div','settings-fact',`Journey Start\n${state.settings.journeyStartDate?formatAUDate(state.settings.journeyStartDate):'Not set'}`),node('div','settings-fact',`Default Currency\n${state.settings.defaultCurrency}`),node('div','settings-fact',`Annual Budget ${Number(toISODate(currentDate).slice(0,4))}\nAUD ${annualBudgetForYear(state.settings,Number(toISODate(currentDate).slice(0,4))).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}`),node('div','settings-fact',`Date Format\nDD/MM/YYYY`));defaults.append(facts);main.append(defaults);

  const security=node('section','settings-panel settings-security');const sHead=node('div','settings-section-head');sHead.append(node('h2','','Security'),node('span',`settings-pin-status settings-pin-${state.settings.pinEnabled?'enabled':'disabled'}`,state.settings.pinEnabled?'PIN Enabled':'PIN Off'));security.append(sHead);const sCopy=node('p','settings-panel-copy',state.settings.pinEnabled?'The optional PIN protects The Vault when it is opened.':'PIN protection is optional and off by default. The Vault can still be manually locked.');security.append(sCopy);if(state.settings.pinRecoveryNotice){const recovery=node('div','settings-pin-recovery');recovery.setAttribute('role','alert');recovery.append(node('strong','','Vault PIN Recovery'),node('p','',state.settings.pinRecoveryNotice));security.append(recovery);}const sActions=node('div','settings-actions');const pin=node('button','button settings-edit',state.settings.pinEnabled?'Change PIN':'Set PIN');pin.type='button';pin.addEventListener('click',()=>openPinEditor({stateService,host:main}));sActions.append(pin);if(state.settings.pinEnabled){const disable=node('button','button button-danger','Disable PIN');disable.type='button';disable.addEventListener('click',()=>openDisablePin({stateService,host:main}));sActions.append(disable);}security.append(sActions);main.append(security);

  const backup=node('section','settings-panel settings-backup');const bHead=node('div','settings-section-head');bHead.append(node('h2','','Backup & Restore'),node('span','settings-local-chip','Full JSON · Local'));backup.append(bHead,node('p','settings-panel-copy','Export one complete Travel Command Centre backup file. Restore validates the entire backup before replacing current data.'));const bActions=node('div','settings-actions');const exportButton=node('button','button settings-backup-button','Export Backup');exportButton.type='button';const restoreButton=node('button','button settings-restore-button','Restore Backup');restoreButton.type='button';let backupBusy=false;const setBackupBusy=busy=>{backupBusy=Boolean(busy);for(const control of [exportButton,restoreButton])control.disabled=backupBusy;if(backupBusy){backup.setAttribute('aria-busy','true');document.documentElement.setAttribute('data-tcc-backup-busy','true');}else{backup.removeAttribute('aria-busy');document.documentElement.removeAttribute('data-tcc-backup-busy');}};exportButton.addEventListener('click',async()=>{if(backupBusy)return;const original=exportButton.textContent;setBackupBusy(true);exportButton.textContent='EXPORTING…';try{await new Promise(resolve=>requestAnimationFrame(()=>resolve()));await downloadBackup(stateService,currentDate);}finally{if(exportButton.isConnected)exportButton.textContent=original;setBackupBusy(false);}});restoreButton.addEventListener('click',()=>{if(backupBusy)return;chooseRestoreFile({stateService,host:main,vaultAccessSession,onBusyChange:setBackupBusy});});bActions.append(exportButton,restoreButton);backup.append(bActions);main.append(backup);

  const info=node('section','settings-panel settings-info');info.append(node('h2','','App Status'));const rows=node('div','settings-info-rows');rows.append(
    node('div','','Platform\niPad · Landscape / Portrait forms · Offline PWA'),
    node('div','',`Travellers\n${state.settings.defaultTravellers||2}`),
    node('div','','Storage\nLocal device only'),
    node('div','','External Sync\nNone'),
    node('div','','Date & Time\niPad device clock'),
    node('div','','Offline Launch\nImmediate cached shell'),
    node('div','','Save Behaviour\nSave button commits'),
    node('div','','Date Format\nDD/MM/YYYY')
  );info.append(rows);main.append(info);

  // R36 accessibility rule: enlargement itself is useful for Kym. Settings
  // information groups stay local to Settings and enlarge read-only; explicit
  // Edit/Backup actions retain their existing semantics inside the snapshot.
  const settingsExpanders=[
    [defaults,'Travel & Budget Defaults','sky','defaults'],
    [security,'Security','gold','security'],
    [backup,'Backup & Restore','copper','backup'],
    [info,'App Status','silver','application']
  ];
  for(const [panel,title,tone,kind] of settingsExpanders) makeExpandableCard(panel,{host:main,title,tone,bodyBuilder:()=>settingsExpandedBody(kind,state,currentDate)});
  return main;
}
