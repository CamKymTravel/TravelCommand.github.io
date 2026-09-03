import { createModal } from './src_components_modal.js';

export function confirmDestructive({ title = 'Confirm deletion', message, confirmLabel = 'Delete', onConfirm }) {
  const modal = createModal({
    title,
    body: message,
    actions: [
      { label: 'Cancel', onClick: dialog => dialog.close() },
      { label: confirmLabel, kind: 'danger', onClick: async dialog => {
        const buttons=[...dialog.querySelectorAll('footer button')];
        for(const button of buttons)button.disabled=true;
        try {
          await Promise.resolve(onConfirm?.());
          if(dialog.isConnected&&dialog.open)dialog.close();
        } catch(error) {
          // Destructive callers normally surface their own field/window error.
          // If an unexpected async error escapes, keep the confirmation open
          // and re-enable it rather than allowing background interaction while
          // the requested operation is unresolved.
          console.error('Travel Command Centre confirmation action failed',error);
          for(const button of buttons)button.disabled=false;
        }
      } }
    ]
  });
  document.body.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once: true });
  modal.showModal();
}
