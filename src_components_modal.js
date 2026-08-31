export function createModal({ title, body, actions = [] }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'tcc-modal';
  dialog.innerHTML = `<form method="dialog"><header><h2></h2></header><section class="modal-body"></section><footer></footer></form>`;
  dialog.querySelector('h2').textContent = title;
  const bodyNode = dialog.querySelector('.modal-body');
  if (typeof body === 'string') bodyNode.textContent = body; else if (body) bodyNode.append(body);
  const footer = dialog.querySelector('footer');
  actions.forEach(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.className = action.kind === 'danger' ? 'button button-danger' : 'button';
    button.addEventListener('click', () => action.onClick?.(dialog));
    footer.append(button);
  });
  return dialog;
}
