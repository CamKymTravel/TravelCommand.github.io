import { createModal } from './src_components_modal.js';

export function confirmDestructive({ title = 'Confirm deletion', message, confirmLabel = 'Delete', onConfirm }) {
  const modal = createModal({
    title,
    body: message,
    actions: [
      { label: 'Cancel', onClick: dialog => dialog.close() },
      { label: confirmLabel, kind: 'danger', onClick: dialog => { onConfirm(); dialog.close(); } }
    ]
  });
  document.body.append(modal);
  modal.addEventListener('close', () => modal.remove(), { once: true });
  modal.showModal();
}
