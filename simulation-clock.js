export const SIMULATION_DATE = '2029-03-03';
export const SIMULATION_STORAGE_KEY = 'tcc:v1:simulation:athens-greece-v52-full';

export function installSimulationRuntime(overrides = {}) {
  globalThis.__TCC_RUNTIME_CONFIG__ = {
    mode:'simulation',
    currentDate:SIMULATION_DATE,
    storageKey:SIMULATION_STORAGE_KEY,
    fixtureUrl:'./simulation-data.json',
    seedIfEmpty:true,
    serviceWorkerUrl:null,
    testingFlags:{ fixture:'athens-greece-v52-full', sameMasterUI:true },
    ...overrides
  };
  return globalThis.__TCC_RUNTIME_CONFIG__;
}
