import { BrowserStorageAdapter, BrowserVaultAssetStore } from './src_core_storage.js';
import { StateService } from './src_core_state.js';
import { localISODate } from './src_core_device-time.js';
import { readRuntimeConfig, fetchRuntimeFixture, runtimeNowISO } from './src_core_runtime-config.js';
import { restoreBackup } from './src_core_restore.js';
import { createVaultAccessSession, lockVault, canRevealHiddenEmails, revealHiddenEmails } from './src_core_vault-access.js';
import { renderSidebar } from './src_components_sidebar.js';
import { renderScreen, isValidScreen } from './src_screens_registry.js';

const root = document.querySelector('#app');
const runtimeConfig = readRuntimeConfig();
const storageAdapter = new BrowserStorageAdapter(null, runtimeConfig.storageKey);
const vaultAssetStore = new BrowserVaultAssetStore({ dbName:`${runtimeConfig.storageKey}:vault-assets` });
const stateService = new StateService(storageAdapter, { now:() => runtimeNowISO(runtimeConfig), vaultAssetStore });
const vaultAccessSession = createVaultAccessSession();
let lastRenderedDate = null;
stateService.hydrate();

async function requestPersistentOfflineStorage() {
  try {
    if (runtimeConfig.mode !== 'production' || !navigator.storage?.persist) return;
    const alreadyPersistent = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (!alreadyPersistent) await navigator.storage.persist();
  } catch {
    // Persistence is an extra eviction safeguard, never a prerequisite for
    // normal local Save/backup behaviour. Storage failures remain handled by
    // StateService's transactional verification and Protected Recovery path.
  }
}
if (!stateService.isRecoveryMode() && !stateService.hadStoredState && runtimeConfig.seedIfEmpty) {
  try {
    const fixture = await fetchRuntimeFixture(runtimeConfig);
    if (fixture) stateService.replaceValidated(fixture);
  } catch (error) { console.error('Simulation seed failed', error); }
}
if (!stateService.isRecoveryMode()) {
  try { await stateService.migrateEmbeddedVaultAssets(); }
  catch (error) {
    // Existing embedded V42 screenshots remain readable if IndexedDB is
    // temporarily unavailable. New screenshot Saves will fail explicitly
    // rather than risk filling the much smaller localStorage area.
    stateService.vaultAssetIssues = [error?.message || 'Offline Vault screenshot storage is unavailable.'];
    console.error('Vault screenshot storage migration deferred', error);
  }
}

function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}

const ROOT_FOCUSABLE = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]';
const SCREEN_ACCESSIBLE_LABELS = Object.freeze({
  home:'Home',
  budget:'Budget',
  reservations:'Flights & Transport',
  itinerary:'Itinerary',
  calendar:'Calendar',
  'journey-history':'Journey History',
  checklist:'Checklist',
  vault:'The Vault',
  settings:'Settings'
});

function rootFocusDescriptor() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active) || !active.matches(ROOT_FOCUSABLE)) return null;
  const screen = active.closest('[data-screen]')?.dataset?.screen || null;
  const className = typeof active.className === 'string' ? active.className.trim().replace(/\s+/g, ' ') : '';
  const sameTag = [...root.querySelectorAll(active.tagName.toLowerCase())];
  const peers = className
    ? sameTag.filter(item => typeof item.className === 'string' && item.className.trim().replace(/\s+/g, ' ') === className)
    : sameTag;
  return {
    screen,
    tag:active.tagName.toLowerCase(),
    id:active.id || '',
    name:active.getAttribute('name') || '',
    ariaLabel:active.getAttribute('aria-label') || '',
    className,
    text:['BUTTON','SUMMARY','A'].includes(active.tagName) ? active.textContent.trim().replace(/\s+/g, ' ') : '',
    ordinal:peers.indexOf(active)
  };
}

function focusProgrammatically(target) {
  if (!(target instanceof HTMLElement) || !target.isConnected || target.matches(':disabled,[aria-disabled="true"]')) return false;
  try { target.focus({ preventScroll:true }); }
  catch { target.focus(); }
  return document.activeElement === target;
}

function focusScreenContext() {
  const target = root.querySelector('.recovery-shell h1, [data-screen] h1, main h1, main[data-screen]');
  if (!(target instanceof HTMLElement)) return false;
  const hadTabIndex = target.hasAttribute('tabindex');
  if (!hadTabIndex) target.setAttribute('tabindex', '-1');
  const focused = focusProgrammatically(target);
  if (!hadTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once:true });
  return focused;
}

function restoreRootFocus(descriptor) {
  if (!descriptor) return;
  queueMicrotask(() => {
    // Exact-record navigation may open a modal in an earlier queued microtask.
    // Never let a stale screen-focus restoration steal focus back out of a
    // newly opened editor/confirmation dialog.
    if (document.querySelector('dialog[open]')) return;
    const currentScreen = root.querySelector('[data-screen]')?.dataset?.screen || null;
    const scope = descriptor.screen && descriptor.screen === currentScreen ? root.querySelector(`[data-screen="${descriptor.screen}"]`) || root : root;
    const candidates = [...scope.querySelectorAll(descriptor.tag)];
    let target = null;
    if (descriptor.id) target = candidates.find(item => item.id === descriptor.id) || null;
    if (!target && descriptor.name) target = candidates.find(item => item.getAttribute('name') === descriptor.name) || null;
    if (!target && descriptor.ariaLabel) target = candidates.find(item => item.getAttribute('aria-label') === descriptor.ariaLabel) || null;
    if (!target && descriptor.text) {
      const textMatches = candidates.filter(item => {
        const sameClass = !descriptor.className || (typeof item.className === 'string' && item.className.trim().replace(/\s+/g, ' ') === descriptor.className);
        return sameClass && item.textContent.trim().replace(/\s+/g, ' ') === descriptor.text;
      });
      if (textMatches.length === 1) target = textMatches[0];
    }
    if (!target && descriptor.ordinal >= 0) {
      const peers = descriptor.className
        ? candidates.filter(item => typeof item.className === 'string' && item.className.trim().replace(/\s+/g, ' ') === descriptor.className)
        : candidates;
      target = peers[descriptor.ordinal] || null;
    }
    if (!focusProgrammatically(target)) focusScreenContext();
  });
}

function exportRawRecoveryData() {
  const raw=stateService.rawRecoveryData();
  if (raw == null) return;
  const blob=new Blob([raw],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=`Travel_Command_Centre_RAW_RECOVERY_${runtimeConfig.currentDate || localISODate()}.json`;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30_000);
}

function chooseRecoveryBackup(errorNode) {
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.append(input);
  input.addEventListener('cancel',()=>input.remove(),{once:true});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file){input.remove();return;}
    const recoveryButtons=[...(errorNode.closest('.recovery-card')?.querySelectorAll('button')||[])];
    for(const button of recoveryButtons)button.disabled=true;
    try {
      await Promise.resolve(restoreBackup(stateService,await file.text()));
      lockVault(vaultAccessSession);
      errorNode.textContent='';
      render();
    } catch(error) {
      errorNode.textContent=`Restore failed: ${error.message}`;
      for(const button of recoveryButtons)if(button.isConnected)button.disabled=false;
    } finally { input.remove(); }
  },{once:true});
  input.click();
}

function renderRecoveryMode() {
  const main=node('main','recovery-shell');
  const card=node('section','recovery-card');
  const storageUnavailable=stateService.recovery?.storageUnavailable === true;
  card.append(node('p','eyebrow','PROTECTED RECOVERY MODE'),node('h1','',storageUnavailable?'iPad storage is unavailable':'Travel data needs recovery'),node('p','recovery-copy',storageUnavailable?'Travel Command Centre cannot safely read its local iPad storage. Normal Save actions are locked to prevent an empty state from overwriting existing travel data.':'The stored app data could not be validated. Normal Save actions are locked so the recoverable data cannot be overwritten.'));
  const reason=node('p','recovery-reason',stateService.recovery?.reason || 'Stored data failed validation.');
  const error=node('p','recovery-error',''); error.setAttribute('role','alert'); error.setAttribute('aria-live','assertive'); error.setAttribute('aria-atomic','true');
  const actions=node('div','recovery-actions');
  const restore=node('button','button recovery-primary','Restore Valid Backup');restore.type='button';restore.addEventListener('click',()=>chooseRecoveryBackup(error));
  const exportButton=node('button','button','Export Raw Recovery Data');exportButton.type='button';exportButton.addEventListener('click',exportRawRecoveryData);
  const retry=node('button','button','Retry iPad Storage');retry.type='button';retry.addEventListener('click',()=>{
    if(stateService.retryStorage()){error.textContent='';render();}
    else error.textContent='iPad storage is still unavailable for safe read/write access. No travel data was changed.';
  });
  actions.append(restore);
  if(storageUnavailable)actions.append(retry);
  if(stateService.rawRecoveryData()!=null)actions.append(exportButton);
  card.append(reason,actions,error);main.append(card);return main;
}

function handleBrandActivate() {
  if (stateService.state.ui.activeScreen !== 'vault') return;
  if (revealHiddenEmails(vaultAccessSession)) render();
}

function render() {
  const focusBeforeRender = rootFocusDescriptor();
  const currentDate = runtimeConfig.currentDate || localISODate();
  lastRenderedDate = currentDate;
  root.classList.toggle('is-recovery', stateService.isRecoveryMode());
  if (stateService.isRecoveryMode()) {
    // Protected Recovery is a security boundary as well as a storage boundary.
    // Never carry an in-memory Vault unlock/Streaming/email-reveal session
    // through a failed Save, failed Restore, retry, or recovery backup.
    lockVault(vaultAccessSession);
    root.replaceChildren(renderRecoveryMode());
    restoreRootFocus(focusBeforeRender);
    return;
  }
  const active = stateService.state.ui.activeScreen;
  // The compass is a concealed Vault action, not a decorative button. Expose
  // it as an actual control only while the exact unlock → Streaming sequence
  // is armed, and remove its button semantics again once the hidden manager is
  // already visible. Locked/overview/category states keep the same brand mark
  // visually but cannot leave a focusable control that intentionally does nothing.
  const brandActivate = active === 'vault' && canRevealHiddenEmails(vaultAccessSession) && !vaultAccessSession.hiddenEmailsRevealed
    ? handleBrandActivate
    : null;
  const screen = renderScreen(active, { stateService, currentDate, navigate, vaultAccessSession, requestRender:render });
  if (screen instanceof HTMLElement && screen.matches('main[data-screen]') && !screen.hasAttribute('aria-label')) {
    screen.setAttribute('aria-label', SCREEN_ACCESSIBLE_LABELS[active] || 'Travel Command Centre');
  }
  root.replaceChildren(
    renderSidebar(active, navigate, brandActivate, runtimeConfig.mode),
    screen
  );
  restoreRootFocus(focusBeforeRender);
}

function navigate(screenId, pendingOpen = null) {
  if (!isValidScreen(screenId)) return;
  if (screenId === stateService.state.ui.activeScreen && pendingOpen == null) return;
  const previousScreen = stateService.state.ui.activeScreen;
  if (previousScreen === 'vault' && screenId !== 'vault') lockVault(vaultAccessSession);
  stateService.commit(draft => {
    if (previousScreen === 'checklist' && screenId !== 'checklist') draft.ui.checklistStage = null;
    if (previousScreen === 'journey-history' && screenId !== 'journey-history') draft.ui.journeyHistoryPage = 1;
    draft.ui.activeScreen = screenId;
    draft.ui.pendingOpen = pendingOpen;
  });
}

stateService.subscribe(render);
render();

function refreshForDeviceDate() {
  const currentDate = runtimeConfig.currentDate || localISODate();
  if (currentDate === lastRenderedDate) return;

  // Never let an automatic midnight/timezone refresh tear down an open editor
  // or confirmation dialog and discard unsaved typing. Defer the date-driven
  // screen refresh until the top open dialog closes; Save/navigation commits
  // already re-render with the new date immediately when appropriate.
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) {
    if (openDialog.dataset.dateRefreshPending !== 'true') {
      openDialog.dataset.dateRefreshPending = 'true';
      openDialog.addEventListener('close', refreshForDeviceDate, { once:true });
    }
    return;
  }
  render();
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshForDeviceDate(); });
window.addEventListener('focus', refreshForDeviceDate);
window.addEventListener('pageshow', refreshForDeviceDate);
// An iPad can remain foregrounded across local midnight (or a timezone/date
// change while travelling) without firing focus/visibility events. Re-check the
// device calendar periodically so current stay, budgets, alerts and lifecycle
// views cannot remain pinned to yesterday. The simulation fixture has a fixed
// date and must remain deterministic, so it does not use this live timer.
if (!runtimeConfig.currentDate) setInterval(refreshForDeviceDate, 60_000);

if ('serviceWorker' in navigator && runtimeConfig.serviceWorkerUrl) {
  window.addEventListener('load', () => navigator.serviceWorker.register(runtimeConfig.serviceWorkerUrl).catch(console.error));
}
window.addEventListener('load', () => { void requestPersistentOfflineStorage(); }, { once:true });

export { stateService, runtimeConfig };
