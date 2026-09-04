export const SIMULATION_DATE = '2029-03-03';
export const SIMULATION_STORAGE_KEY = 'tcc:v1:simulation:athens-greece-v54-full-r1';
export const SIMULATION_INSTALL_MARKER = 'tcc:v1:simulation:athens-greece-v54-full-r1:installed';

export function installSimulationRuntime(overrides = {}) {
  globalThis.__TCC_RUNTIME_CONFIG__ = {
    mode:'simulation',
    currentDate:SIMULATION_DATE,
    storageKey:SIMULATION_STORAGE_KEY,
    fixtureUrl:'./simulation-data.json',
    seedIfEmpty:true,
    serviceWorkerUrl:null,
    testingFlags:{ fixture:'athens-greece-v54-full-r1', sameMasterUI:true, masterBaseline:'V54' },
    ...overrides
  };
  return globalThis.__TCC_RUNTIME_CONFIG__;
}
