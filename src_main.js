import { BrowserStorageAdapter } from './src_core_storage.js';
import { StateService } from './src_core_state.js';
import { localISODate } from './src_core_device-time.js';
import { readRuntimeConfig, fetchRuntimeFixture } from './src_core_runtime-config.js';
import { createVaultAccessSession, lockVault, revealHiddenEmails } from './src_core_vault-access.js';
import { renderSidebar } from './src_components_sidebar.js';
import { renderScreen, isValidScreen } from './src_screens_registry.js';

const root = document.querySelector('#app');
const runtimeConfig = readRuntimeConfig();
const storageAdapter = new BrowserStorageAdapter(globalThis.localStorage, runtimeConfig.storageKey);
const stateService = new StateService(storageAdapter);
const vaultAccessSession = createVaultAccessSession();
const hadStoredState = Boolean(storageAdapter.read());
try {
  stateService.hydrate();
  if (!hadStoredState && runtimeConfig.seedIfEmpty) {
    const fixture = await fetchRuntimeFixture(runtimeConfig);
    if (fixture) stateService.replaceValidated(fixture);
  }
} catch (error) { console.error('State hydration failed', error); }

function handleBrandActivate() {
  if (stateService.state.ui.activeScreen !== 'vault') return;
  if (revealHiddenEmails(vaultAccessSession)) render();
}

function render() {
  const active = stateService.state.ui.activeScreen;
  root.replaceChildren(
    renderSidebar(active, navigate, active === 'vault' ? handleBrandActivate : null),
    renderScreen(active, { stateService, currentDate: runtimeConfig.currentDate || localISODate(), navigate, vaultAccessSession, requestRender:render })
  );
}

function navigate(screenId, pendingOpen = null) {
  if (!isValidScreen(screenId)) return;
  if (screenId === stateService.state.ui.activeScreen && pendingOpen == null) return;
  if (stateService.state.ui.activeScreen === 'vault' && screenId !== 'vault') lockVault(vaultAccessSession);
  stateService.commit(draft => {
    draft.ui.activeScreen = screenId;
    draft.ui.pendingOpen = pendingOpen;
  });
}

stateService.subscribe(render);
render();

if ('serviceWorker' in navigator && runtimeConfig.serviceWorkerUrl) {
  window.addEventListener('load', () => navigator.serviceWorker.register(runtimeConfig.serviceWorkerUrl).catch(console.error));
}

export { stateService, runtimeConfig };
