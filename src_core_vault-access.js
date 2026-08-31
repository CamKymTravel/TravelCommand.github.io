export function createVaultAccessSession() {
  return {
    vaultUnlocked:false,
    streamingOpenedSinceUnlock:false,
    hiddenEmailsRevealed:false,
    activeSection:'overview',
    selectedRecordId:null
  };
}

export function lockVault(ui) {
  ui.vaultUnlocked = false;
  ui.streamingOpenedSinceUnlock = false;
  ui.hiddenEmailsRevealed = false;
  ui.activeSection = 'overview';
  ui.selectedRecordId = null;
}

export function unlockVault(ui) {
  ui.vaultUnlocked = true;
  ui.streamingOpenedSinceUnlock = false;
  ui.hiddenEmailsRevealed = false;
  ui.activeSection = 'overview';
  ui.selectedRecordId = null;
}

export function markStreamingOpened(ui) {
  if (!ui.vaultUnlocked) return false;
  ui.streamingOpenedSinceUnlock = true;
  ui.activeSection = 'streaming';
  return true;
}

export function canRevealHiddenEmails(ui) {
  return ui.vaultUnlocked === true && ui.streamingOpenedSinceUnlock === true;
}

export function revealHiddenEmails(ui) {
  if (!canRevealHiddenEmails(ui)) return false;
  ui.hiddenEmailsRevealed = true;
  return true;
}

export function hideHiddenEmails(ui) {
  ui.hiddenEmailsRevealed = false;
}
