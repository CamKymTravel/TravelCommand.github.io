import { BrowserStorageAdapter, BrowserVaultAssetStore } from './src_core_storage.js';
import { StateService } from './src_core_state.js';
import { localISODate } from './src_core_device-time.js';
import { readRuntimeConfig, fetchRuntimeFixture, runtimeNowISO, shouldInstallRuntimeFixture, stampRuntimeFixtureRevision } from './src_core_runtime-config.js';
import { restoreBackup } from './src_core_restore.js';
import { createVaultAccessSession, lockVault, canRevealHiddenEmails, revealHiddenEmails } from './src_core_vault-access.js';
import { renderSidebar } from './src_components_sidebar.js';
import { renderScreen, isValidScreen } from './src_screens_registry.js';
import { confirmDestructive } from './src_components_confirmation.js';
import { buildHomeViewModel } from './src_core_home-view-model.js';
import { countryFlagEmoji } from './src_components_country.js';

const root = document.querySelector('#app');

// S49 physical-iPad add-editor closure retains S48 gesture authority. CSS `touch-action: manipulation` removes
// tap/double-tap page zoom in current iPad Safari while preserving deliberate
// pinch/spread. Keep only a harmless dblclick fallback: preventing touchend on
// rapid taps breaks intentional multi-tap app controls such as Vault unlock.
const TCC_ZOOM_GESTURE_EXEMPT = '.offline-map-interactive, .itinerary-route-picker-map';
function isZoomGestureExempt(target) {
  return target instanceof Element && Boolean(target.closest(TCC_ZOOM_GESTURE_EXEMPT));
}
function installNoTapZoomGuard() {
  document.addEventListener('dblclick', event => {
    if (!isZoomGestureExempt(event.target)) event.preventDefault();
  }, { passive:false, capture:true });
}
installNoTapZoomGuard();

// Australian date presentation is an app rule, not a browser-locale hint.
// Safari/Chromium can otherwise render the native date editor using the
// device/browser pattern (for example MM/DD/YYYY). Keep the native picker and
// canonical ISO value, but place a non-interactive DD/MM/YYYY presentation
// over its editable text so every screen remains visually consistent.
function auDateDisplay(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'DD/MM/YYYY';
}

function decorateAUDateInput(input) {
  if (!(input instanceof HTMLInputElement) || input.type !== 'date' || input.dataset.auDateDecorated === 'true') return;
  input.dataset.auDateDecorated = 'true';
  input.lang = 'en-AU';
  const parent = input.parentNode;
  if (!parent) return;
  const shell = document.createElement('span');
  shell.className = 'tcc-au-date-shell';
  const display = document.createElement('span');
  display.className = 'tcc-au-date-display';
  display.setAttribute('aria-hidden', 'true');
  parent.insertBefore(shell, input);
  shell.append(input, display);
  const refresh = () => {
    display.textContent = auDateDisplay(input.value);
    display.classList.toggle('is-placeholder', !input.value);
  };
  refresh();
  input.addEventListener('input', refresh);
  input.addEventListener('change', refresh);
}

function decorateAUDateInputs(scope = root) {
  if (!scope) return;
  if (scope instanceof HTMLInputElement && scope.type === 'date') decorateAUDateInput(scope);
  scope.querySelectorAll?.('input[type="date"]').forEach(decorateAUDateInput);
}

const auDateObserver = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const added of mutation.addedNodes) {
      if (added.nodeType === Node.ELEMENT_NODE) decorateAUDateInputs(added);
    }
  }
});
auDateObserver.observe(root, { childList:true, subtree:true });
const runtimeConfig = readRuntimeConfig();
const storageAdapter = new BrowserStorageAdapter(null, runtimeConfig.storageKey);
const vaultAssetStore = new BrowserVaultAssetStore({ dbName:`${runtimeConfig.storageKey}:vault-assets` });
const stateService = new StateService(storageAdapter, { now:() => runtimeNowISO(runtimeConfig), vaultAssetStore });
const vaultAccessSession = createVaultAccessSession();
let lastRenderedDate = null;
stateService.hydrate();

async function requestPersistentOfflineStorage() {
  try {
    // The Athens screenshot derivative uses a separate storage key but must
    // exercise the same Home Screen persistence safeguard as production.
    // Otherwise its Vault/IndexedDB lifecycle test is less durable than the
    // real app it is intended to validate.
    if (!navigator.storage?.persist) return;
    const alreadyPersistent = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (!alreadyPersistent) await navigator.storage.persist();
  } catch {
    // Persistence is an extra eviction safeguard, never a prerequisite for
    // normal local Save/backup behaviour. Storage failures remain handled by
    // StateService's transactional verification and Protected Recovery path.
  }
}
if (!stateService.isRecoveryMode() && runtimeConfig.seedIfEmpty) {
  try {
    const fixtureRevision = String(runtimeConfig.testingFlags?.fixtureRevision || runtimeConfig.testingFlags?.fixture || runtimeConfig.fixtureUrl || 'simulation');
    const markerKey = `${runtimeConfig.storageKey}:fixture-revision`;
    let installedRevision = null;
    try { installedRevision = globalThis.localStorage?.getItem(markerKey) || null; } catch {}
    const shouldInstallFixture = shouldInstallRuntimeFixture({
      hadStoredState:stateService.hadStoredState,
      state:stateService.state,
      externalRevision:installedRevision,
      fixtureRevision
    });
    if (shouldInstallFixture) {
      const fixture = await fetchRuntimeFixture(runtimeConfig);
      if (fixture) {
        // Persist the revision inside the same canonical state write as the
        // fixture itself. The sidecar localStorage marker remains a backward-
        // compatibility hint for older simulation installs, but it is no
        // longer the sole guard against destructive reseeding.
        stateService.replaceValidated(stampRuntimeFixtureRevision(fixture, fixtureRevision));
        stateService.markAppHealthChecked();
        try { globalThis.localStorage?.setItem(markerKey, fixtureRevision); } catch {}
      }
    }
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

// R40 build-health gate: every newly installed/updated build must visibly
// require one whole-app verification. The marker is local to this build and
// does not keep re-dirtying the app after Kym successfully verifies R40.
const APP_HEALTH_BUILD_MARKER='v60-r7.15-s54-morocco-simulation-16-2026-09-26';
if (!stateService.isRecoveryMode()) {
  const markerKey=`${runtimeConfig.storageKey}:app-health-build-marker`;
  let installedMarker=null;
  try { installedMarker=globalThis.localStorage?.getItem(markerKey)||null; } catch {}
  if (installedMarker!==APP_HEALTH_BUILD_MARKER) {
    stateService.invalidateAppHealthCheck();
    try { globalThis.localStorage?.setItem(markerKey,APP_HEALTH_BUILD_MARKER); } catch {}
  }
}

function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}


// S20 cold-launch authority. A fresh app document always begins on Home. This
// is deliberately an in-memory UI reset, not a user-data Save, so it cannot
// dirty App Health or rewrite travel records merely because the PWA was opened.
function forceLaunchHomeScreen() {
  if (stateService.isRecoveryMode()) return;
  if (!stateService.state.ui) return;
  stateService.state.ui.activeScreen = 'home';
  stateService.state.ui.pendingOpen = null;
  stateService.state.ui.checklistStage = null;
  stateService.state.ui.journeyHistoryPage = 1;
}

function runLaunchTransition() {
  const launch = document.querySelector('#tcc-launch');
  if (!(launch instanceof HTMLElement)) return;
  if (stateService.isRecoveryMode()) {
    launch.remove();
    document.documentElement.removeAttribute('data-tcc-launch-phase');
    document.documentElement.removeAttribute('data-tcc-launch-identity');
    return;
  }
  const currentDate = runtimeConfig.currentDate || localISODate();
  let identity = null;
  try {
    const home = buildHomeViewModel(stateService.state, currentDate);
    identity = home.currentStay || home.nextDestination || null;
  } catch {}
  const country = String(identity?.country || identity?.startCountry || '').trim();
  const routeType = ['motorhome','rv','cruise'].includes(String(identity?.travelType || '').toLowerCase());
  const city = String(routeType ? (identity?.startCity || identity?.title || '') : (identity?.title || identity?.startCity || '')).trim();
  const flag = launch.querySelector('.tcc-launch-flag');
  const countryNode = launch.querySelector('.tcc-launch-country');
  const cityNode = launch.querySelector('.tcc-launch-city');
  const hasDestinationIdentity = Boolean(country || city);
  if (hasDestinationIdentity) {
    if (flag) flag.textContent = country ? countryFlagEmoji(country) : '';
    if (countryNode) countryNode.textContent = country;
    if (cityNode) cityNode.textContent = city;
    document.documentElement.dataset.tccLaunchIdentity = 'ready';
  }

  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const destinationDelay = reduced ? 110 : 520;
  const revealDelay = reduced ? 520 : 1360;
  const removeDelay = reduced ? 760 : 1760;
  requestAnimationFrame(() => {
    if (hasDestinationIdentity) {
      setTimeout(() => { document.documentElement.dataset.tccLaunchPhase = 'destination'; }, destinationDelay);
    }
    setTimeout(() => { document.documentElement.dataset.tccLaunchPhase = 'done'; }, revealDelay);
    setTimeout(() => {
      launch.remove();
      document.documentElement.removeAttribute('data-tcc-launch-phase');
      document.documentElement.removeAttribute('data-tcc-launch-identity');
      if (globalThis.__TCC_LAUNCH_FAILSAFE__) {
        clearTimeout(globalThis.__TCC_LAUNCH_FAILSAFE__);
        globalThis.__TCC_LAUNCH_FAILSAFE__ = null;
      }
    }, removeDelay);
  });
}

const ROOT_FOCUSABLE = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]';
const SCREEN_ACCESSIBLE_LABELS = Object.freeze({
  home:'Home',
  budget:'Budget',
  reservations:'Reservations',
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
      const serialized=await file.text();
      const confirmation=confirmDestructive({
        title:'Restore Travel Command Centre backup',
        tone:'teal',
        message:'Restore will validate the selected backup, then replace the protected recovery state only if validation and storage verification both succeed. Export Raw Recovery Data first if you want to retain the damaged source file.',
        confirmLabel:'Restore',
        onConfirm:async()=>{
          try {
            lockVault(vaultAccessSession);
            await Promise.resolve(restoreBackup(stateService,serialized));
            if(errorNode.isConnected)errorNode.textContent='';
            render();
          } catch(error) {
            if(errorNode.isConnected)errorNode.textContent=`Restore failed: ${error.message}`;
            throw error;
          }
        }
      });
      confirmation?.addEventListener('close',()=>{
        if(!stateService.isRecoveryMode())return;
        for(const button of recoveryButtons)if(button.isConnected)button.disabled=false;
      },{once:true});
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
  const retry=node('button','button','Retry iPad Storage');retry.type='button';retry.addEventListener('click',async()=>{
    const recoveryButtons=[...card.querySelectorAll('button')];
    for(const button of recoveryButtons)button.disabled=true;
    retry.textContent='RETRYING…';
    const recovered=await stateService.retryStorage();
    if(recovered){
      // retryStorage publishes the recovered canonical state, so the normal
      // subscriber render has already replaced this recovery card.
      return;
    }
    if(error.isConnected)error.textContent=stateService.recovery?.retryError || 'iPad storage is still unavailable for safe read/write access. No travel data was changed.';
    if(retry.isConnected)retry.textContent='Retry iPad Storage';
    for(const button of recoveryButtons)if(button.isConnected)button.disabled=false;
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

let deferredPickerRenderTimer = null;
function render() {
  // Ordinary background notifications (for example a late Vault asset-health
  // audit) must never replace an editor/confirmation that is holding unsaved
  // user input. Canonical Saves also notify before their modal has closed, so
  // defer that render until the topmost open dialog closes; if another dialog
  // remains underneath, the next render pass will wait for that one as well.
  // Protected Recovery is the exception: a safety-state transition must replace
  // the stale editor immediately.
  if (!stateService.isRecoveryMode()) {
    const openDialogs = [...document.querySelectorAll('dialog[open]')];
    const topDialog = openDialogs.at(-1);
    if (topDialog) {
      if (topDialog.dataset.stateRenderPending !== 'true') {
        topDialog.dataset.stateRenderPending = 'true';
        topDialog.addEventListener('close', () => queueMicrotask(render), { once:true });
      }
      return;
    }
  }

  // Temporary native file/photo inputs live inside the current screen while
  // iPad Files/Photos is open and while the selected bytes are being read. A
  // late non-canonical notification must not replace that screen and strand the
  // picker on a detached DOM tree.
  if (!stateService.isRecoveryMode() && root.querySelector('input[type="file"]')) {
    if (deferredPickerRenderTimer == null) {
      deferredPickerRenderTimer = setTimeout(() => {
        deferredPickerRenderTimer = null;
        render();
      }, 250);
    }
    return;
  }
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
  // The Travel Command Centre compass has two deliberately separate contexts:
  // on Home the discreet brand compass opens the Phrase Helper; the Current
  // Destination banner independently opens Country Quick Look. In The Vault the
  // brand compass only becomes an action after the exact unlock → Streaming
  // sequence is armed. Other screens keep the same brand mark without a dead control.
  const brandActivate = active === 'home'
    ? (() => root.querySelector('[data-screen="home"] .home-compass')?.click())
    : (active === 'vault' && canRevealHiddenEmails(vaultAccessSession) && !vaultAccessSession.hiddenEmailsRevealed
      ? handleBrandActivate
      : null);
  const screen = renderScreen(active, { stateService, currentDate, navigate, vaultAccessSession, requestRender:render });
  if (screen instanceof HTMLElement && screen.matches('main[data-screen]') && !screen.hasAttribute('aria-label')) {
    screen.setAttribute('aria-label', SCREEN_ACCESSIBLE_LABELS[active] || 'Travel Command Centre');
  }
  root.replaceChildren(
    renderSidebar(active, navigate, brandActivate, runtimeConfig.mode),
    screen
  );
  decorateAUDateInputs(root);
  restoreRootFocus(focusBeforeRender);
}

function resetPrimaryViewportScroll() {
  const scroller = document.scrollingElement;
  if (scroller) { scroller.scrollTop = 0; scroller.scrollLeft = 0; }
  try { globalThis.scrollTo?.(0, 0); } catch {}
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
  // Screen navigation is a fresh page context. Never inherit body scroll from a
  // lower control/modal on the previous screen; fixed sidebar scroll is separate.
  queueMicrotask(resetPrimaryViewportScroll);
}

forceLaunchHomeScreen();
stateService.subscribe(render);
render();
// The complete cached Home screen is already rendered underneath the launch
// layer. The short icon → flag/country/city transition is presentation only:
// it performs no network/service-worker work and never delays app construction.
runLaunchTransition();

let dateRefreshTimer = null;
function refreshForDeviceDate() {
  const currentDate = runtimeConfig.currentDate || localISODate();
  if (currentDate === lastRenderedDate) return;

  // Never let an automatic midnight/timezone refresh tear down an open editor,
  // confirmation dialog, or native iPad file/photo picker. A hidden file input
  // stays in the DOM while Restore/screenshot selection and its async file read
  // are in flight; replacing its host screen can strand the returned selection
  // on a detached node. Defer until that temporary input is actually removed.
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) {
    if (openDialog.dataset.dateRefreshPending !== 'true') {
      openDialog.dataset.dateRefreshPending = 'true';
      openDialog.addEventListener('close', refreshForDeviceDate, { once:true });
    }
    return;
  }
  const openFilePicker = document.querySelector('input[type="file"]');
  if (openFilePicker) {
    if (dateRefreshTimer == null) {
      dateRefreshTimer = setTimeout(() => {
        dateRefreshTimer = null;
        refreshForDeviceDate();
      }, 250);
    }
    return;
  }
  render();
}

let vaultBackgroundRelockPending = false;
let vaultBackgroundPickerShield = false;

function protectVaultForBackground() {
  if (stateService.state.ui.activeScreen !== 'vault' || vaultAccessSession.vaultUnlocked !== true) return false;
  // iPad can snapshot the last foreground frame into the app switcher. Cover an
  // unlocked Vault immediately whenever the PWA leaves the foreground. A
  // Photos/Files picker is a special case: keep the live unlock session while
  // its hidden file input is in flight so the returned selection is not
  // stranded, but still place the privacy curtain over the underlying app.
  document.documentElement.setAttribute('data-tcc-vault-privacy-lock', 'true');
  if (document.querySelector('input[type="file"]')) {
    vaultBackgroundPickerShield = true;
    return true;
  }
  lockVault(vaultAccessSession);
  vaultBackgroundRelockPending = true;
  return true;
}

function finishVaultBackgroundProtection() {
  if (vaultBackgroundRelockPending) {
    // An unlocked Vault editor may still be open in the preserved DOM. Close
    // those transient dialogs before rendering so the ordinary unsaved-editor
    // render deferral cannot expose protected content after foregrounding.
    for (const dialog of [...root.querySelectorAll('dialog[open]')]) {
      try { dialog.close(); } catch {}
      if (dialog.isConnected) dialog.remove();
    }
    render();
    vaultBackgroundRelockPending = false;
  }
  if (vaultBackgroundPickerShield) vaultBackgroundPickerShield = false;
  document.documentElement.removeAttribute('data-tcc-vault-privacy-lock');
}

function handleForegroundWake() {
  if (document.visibilityState === 'hidden') return;
  const hadVaultProtection = vaultBackgroundRelockPending || vaultBackgroundPickerShield || document.documentElement.hasAttribute('data-tcc-vault-privacy-lock');
  if (hadVaultProtection) finishVaultBackgroundProtection();
  refreshForDeviceDate();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { protectVaultForBackground(); return; }
  if (document.visibilityState === 'visible') handleForegroundWake();
});
window.addEventListener('pagehide', protectVaultForBackground);
window.addEventListener('focus', handleForegroundWake);
window.addEventListener('pageshow', handleForegroundWake);
// An iPad can remain foregrounded across local midnight (or a timezone/date
// change while travelling) without firing focus/visibility events. Re-check the
// device calendar periodically so current stay, budgets, alerts and lifecycle
// views cannot remain pinned to yesterday. The simulation fixture has a fixed
// date and must remain deterministic, so it does not use this live timer.
if (!runtimeConfig.currentDate) setInterval(refreshForDeviceDate, 60_000);

if ('serviceWorker' in navigator && runtimeConfig.serviceWorkerUrl) {
  let reloadingForServiceWorker = false;
  let serviceWorkerReloadPending = false;
  let serviceWorkerReloadTimer = null;
  let hasSeenServiceWorkerController = Boolean(navigator.serviceWorker.controller);

  const reloadForServiceWorkerWhenSafe = () => {
    if (!serviceWorkerReloadPending || reloadingForServiceWorker) return;
    const openDialog = document.querySelector('dialog[open]');
    if (openDialog) {
      if (openDialog.dataset.serviceWorkerReloadPending !== 'true') {
        openDialog.dataset.serviceWorkerReloadPending = 'true';
        openDialog.addEventListener('close', () => queueMicrotask(reloadForServiceWorkerWhenSafe), { once:true });
      }
      return;
    }
    const openFilePicker = document.querySelector('input[type="file"]');
    const backupBusy = document.documentElement.hasAttribute('data-tcc-backup-busy');
    if (openFilePicker || backupBusy) {
      // Native iPad pickers dispatch `change` before async file.text()/image
      // staging has necessarily finished. Poll lightly until the temporary
      // input is actually removed so an update cannot reload midway through
      // Restore or screenshot processing after the picker returns.
      if (serviceWorkerReloadTimer == null) {
        serviceWorkerReloadTimer = setTimeout(() => {
          serviceWorkerReloadTimer = null;
          reloadForServiceWorkerWhenSafe();
        }, 250);
      }
      return;
    }
    reloadingForServiceWorker = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('message', event => {
    if (event?.data?.type !== 'TCC_SW_UPDATE_QUERY') return;
    const ready = !document.querySelector('dialog[open], input[type="file"]') && !document.documentElement.hasAttribute('data-tcc-backup-busy');
    try { event.ports?.[0]?.postMessage({ type:'TCC_SW_UPDATE_READY', ready }); } catch {}
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const replacingExistingController = hasSeenServiceWorkerController;
    hasSeenServiceWorkerController = true;
    // First install/claim is not an app-version transition and must not bounce
    // the just-opened PWA. A later controller replacement is a real update.
    if (!replacingExistingController) return;
    serviceWorkerReloadPending = true;
    reloadForServiceWorkerWhenSafe();
  });
  window.addEventListener('load', () => {
    // Offline launch is already complete before any worker/update work starts.
    // Never await registration or update work on the launch path.
    const checkForWorkerUpdate = () => {
      navigator.serviceWorker.register(runtimeConfig.serviceWorkerUrl, { updateViaCache:'none' })
        .then(registration => registration.update())
        .catch(error => console.error(error));
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(checkForWorkerUpdate, { timeout:1500 });
    else setTimeout(checkForWorkerUpdate, 0);
  }, { once:true });

  // A successful Save can synchronously re-render the screen and detach its
  // dialog before that dialog dispatches a close event. Re-check a deferred
  // update after every render as well as on ordinary Cancel/Close.
  stateService.subscribe(() => queueMicrotask(reloadForServiceWorkerWhenSafe));
}
window.addEventListener('load', () => { void requestPersistentOfflineStorage(); }, { once:true });

export { stateService, runtimeConfig };
