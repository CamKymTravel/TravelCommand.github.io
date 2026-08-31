export function parseBackupPayload(serialized) {
  const payload = JSON.parse(serialized);
  if (payload?.format !== 'TravelCommandCentreBackup') throw new Error('Invalid backup format');
  if (!payload.state) throw new Error('Backup contains no state');
  return payload.state;
}

export function restoreBackup(stateService, serialized) {
  const nextState = parseBackupPayload(serialized);
  return stateService.replaceValidated(nextState);
}
