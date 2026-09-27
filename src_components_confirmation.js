import { createModal, materialToneFromContext } from './src_components_modal.js';

export function confirmDestructive({ title = 'Confirm deletion', message, confirmLabel = 'Delete', tone = null, onConfirm }) {
  const resolvedTone = tone || materialToneFromContext(document.activeElement, 'sky');
  const modal = createModal({
    title,
    body: message,
    className:`tone-${resolvedTone}`,
    actions: [
      { label: 'Cancel', onClick: dialog => dialog.close() },
      { label: confirmLabel, kind: 'danger', onClick: async dialog => {
        const buttons=[...dialog.querySelectorAll('footer button')];
        for(const button of buttons)button.disabled=true;
        try {
          await Promise.resolve(onConfirm?.());
          if(dialog.isConnected&&dialog.open)dialog.close();
        } catch(error) {
          // A failed canonical write moves the app into Protected Recovery
          // synchronously. This confirmation lives on <body>, outside the
          // re-rendered app root, so leaving it open would hide the recovery
          // screen behind a stale Delete/Restore prompt. Close that obsolete
          // dialog immediately; its normal close-focus fallback will announce
          // the recovery heading.
          if (document.querySelector('.recovery-shell')) {
            if (dialog.isConnected && dialog.open) dialog.close();
            return;
          }

          // Other unexpected destructive failures must never be console-only.
          // Keep the confirmation open, restore its controls, and expose the
          // failure as an assertive alert so VoiceOver and sighted users both
          // know why the action did not complete.
          console.error('Travel Command Centre confirmation action failed',error);
          let errorRegion=dialog.querySelector('.confirmation-action-error');
          if(!errorRegion){
            errorRegion=document.createElement('p');
            errorRegion.className='confirmation-action-error';
            errorRegion.setAttribute('role','alert');
            errorRegion.setAttribute('aria-live','assertive');
            errorRegion.setAttribute('aria-atomic','true');
            dialog.querySelector('.modal-body')?.append(errorRegion);
          }
          errorRegion.textContent=`Action failed: ${error?.message || 'The requested change could not be completed.'}`;
          for(const button of buttons)button.disabled=false;
        }
      } }
    ]
  });
  document.body.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once: true });
  modal.showModal();
  return modal;
}
