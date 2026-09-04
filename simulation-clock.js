export const SIMULATION_DATE = '2029-02-24';
export const SIMULATION_STORAGE_KEY = 'tcc:v1:simulation:athens-greece-v55';

export function installSimulationRuntime(overrides = {}) {
  globalThis.__TCC_RUNTIME_CONFIG__ = {
    mode:'simulation',
    currentDate:SIMULATION_DATE,
    storageKey:SIMULATION_STORAGE_KEY,
    fixtureUrl:'./simulation-data.json',
    seedIfEmpty:true,
    serviceWorkerUrl:null,
    testingFlags:{ fixture:'athens-greece', fixtureRevision:'v55-athens-greece-2029-02-24-r1', sameMasterUI:true },
    ...overrides
  };
  return globalThis.__TCC_RUNTIME_CONFIG__;
}
