export const SIMULATION_DATE = '2030-09-15';
export const SIMULATION_STORAGE_KEY = 'tcc:v1:simulation:turkiye-year4';

export function installSimulationRuntime(overrides = {}) {
  globalThis.__TCC_RUNTIME_CONFIG__ = {
    mode:'simulation',
    currentDate:SIMULATION_DATE,
    storageKey:SIMULATION_STORAGE_KEY,
    fixtureUrl:'./simulation-data.json',
    seedIfEmpty:true,
    serviceWorkerUrl:null,
    testingFlags:{ fixture:'turkiye-year4', sameMasterUI:true },
    ...overrides
  };
  return globalThis.__TCC_RUNTIME_CONFIG__;
}
