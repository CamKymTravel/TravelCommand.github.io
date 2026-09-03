const MODAL_TONES = Object.freeze(['sky','blue','indigo','teal','green','magenta','violet','red','orange','gold']);
let modalSequence = 0;

const LOCAL_FOCUSABLE = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]';

function normalizedFocusText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function captureLocalFocus() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.matches(LOCAL_FOCUSABLE)) return null;
  const scope = active.closest('dialog, [data-screen]') || document;
  const className = typeof active.className === 'string' ? normalizedFocusText(active.className) : '';
  const candidates = [...scope.querySelectorAll(active.tagName.toLowerCase())];
  const peers = className
    ? candidates.filter(item => typeof item.className === 'string' && normalizedFocusText(item.className) === className)
    : candidates;
  return {
    scope,
    tag:active.tagName.toLowerCase(),
    id:active.id || '',
    name:active.getAttribute('name') || '',
    ariaLabel:active.getAttribute('aria-label') || '',
    className,
    text:['BUTTON','SUMMARY','A'].includes(active.tagName) ? normalizedFocusText(active.textContent) : '',
    ordinal:peers.indexOf(active)
  };
}

export function restoreLocalFocus(descriptor, { fallbackSelector = null } = {}) {
  if (!descriptor) return;
  queueMicrotask(() => {
    const scope = descriptor.scope?.isConnected ? descriptor.scope : document;
    const candidates = [...scope.querySelectorAll(descriptor.tag)];
    let target = null;
    if (descriptor.id) target = candidates.find(item => item.id === descriptor.id) || null;
    if (!target && descriptor.name) target = candidates.find(item => item.getAttribute('name') === descriptor.name) || null;
    if (!target && descriptor.ariaLabel) target = candidates.find(item => item.getAttribute('aria-label') === descriptor.ariaLabel) || null;
    if (!target && descriptor.text) {
      const matches = candidates.filter(item => {
        const sameClass = !descriptor.className || (typeof item.className === 'string' && normalizedFocusText(item.className) === descriptor.className);
        return sameClass && normalizedFocusText(item.textContent) === descriptor.text;
      });
      if (matches.length === 1) target = matches[0];
    }
    if (!target && descriptor.ordinal >= 0) {
      const peers = descriptor.className
        ? candidates.filter(item => typeof item.className === 'string' && normalizedFocusText(item.className) === descriptor.className)
        : candidates;
      target = peers[descriptor.ordinal] || null;
    }
    const usingFallback = (!target || target.matches(':disabled,[aria-disabled="true"]')) && Boolean(fallbackSelector);
    if (usingFallback) target = scope.querySelector(fallbackSelector);
    if (!(target instanceof HTMLElement) || !target.isConnected || target.matches(':disabled,[aria-disabled="true"]')) return;
    const needsTemporaryTabIndex = usingFallback && !target.matches(LOCAL_FOCUSABLE);
    if (needsTemporaryTabIndex) target.setAttribute('tabindex', '-1');
    try { target.focus({ preventScroll:true }); }
    catch { target.focus(); }
    if (needsTemporaryTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once:true });
  });
}

export function preserveLocalFocus(callback, options = {}) {
  const descriptor = captureLocalFocus();
  const result = callback();
  restoreLocalFocus(descriptor, options);
  return result;
}

export function setModalTone(dialog, tone = 'sky') {
  if (!dialog) return;
  for (const value of MODAL_TONES) dialog.classList.remove(`tone-${value}`);
  dialog.classList.add(`tone-${MODAL_TONES.includes(tone) ? tone : 'sky'}`);
}

export function createModal({ title, body, actions = [], className = '' }) {
  // Native <dialog> contains focus while open, but Safari/VoiceOver does not
  // reliably return focus to the invoking control after dialog.close(). Keep a
  // weak, DOM-only reference to the opener and restore it after ordinary
  // Cancel/Close flows. If a successful Save/navigation has re-rendered the
  // screen, the old opener is disconnected and is intentionally ignored.
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = document.createElement('dialog');
  dialog.className = ['tcc-modal', className].filter(Boolean).join(' ');
  const titleId = `tcc-modal-title-${++modalSequence}`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `<form method="dialog"><header><h2 id="${titleId}"></h2></header><section class="modal-body"></section><footer></footer></form>`;
  const form = dialog.querySelector('form');
  // Editors commit only through their explicit Save actions. In Safari/iPad,
  // pressing Return in a text field can otherwise implicitly submit a
  // method=dialog form and close the editor without Save, making typed edits
  // appear to vanish. Suppress implicit form submission globally; every modal
  // action is already wired as an explicit type=button control below.
  form.addEventListener('submit', event => event.preventDefault());
  dialog.querySelector('h2').textContent = title;
  const bodyNode = dialog.querySelector('.modal-body');
  if (typeof body === 'string') bodyNode.textContent = body; else if (body) bodyNode.append(body);
  // Editor validation failures are blocking information, not decorative copy.
  // Expose every existing *-form-error region as an assertive alert so
  // VoiceOver announces the reason immediately after a rejected Save.
  for (const errorRegion of bodyNode.querySelectorAll('[class*="form-error"]')) {
    if (!errorRegion.hasAttribute('role')) errorRegion.setAttribute('role', 'alert');
    if (!errorRegion.hasAttribute('aria-live')) errorRegion.setAttribute('aria-live', 'assertive');
    errorRegion.setAttribute('aria-atomic', 'true');
  }
  const footer = dialog.querySelector('footer');
  actions.forEach(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.className = action.kind === 'danger' ? 'button button-danger' : 'button';
    button.addEventListener('click', () => action.onClick?.(dialog));
    footer.append(button);
  });
  dialog.addEventListener('close', () => {
    queueMicrotask(() => {
      if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') {
        try { returnFocus.focus({ preventScroll:true }); }
        catch { returnFocus.focus(); }
        return;
      }
      // A successful Save/Delete can synchronously replace the whole screen
      // before this confirmation/modal closes, so the original opener no longer
      // exists. Do not leave Safari/VoiceOver focus stranded on <body>; announce
      // the newly rendered screen/recovery context instead.
      const fallback = document.querySelector('.recovery-shell h1, [data-screen] h1, main h1, main[data-screen]');
      if (!(fallback instanceof HTMLElement) || !fallback.isConnected) return;
      const hadTabIndex = fallback.hasAttribute('tabindex');
      const previousTabIndex = fallback.getAttribute('tabindex');
      if (!hadTabIndex) fallback.setAttribute('tabindex', '-1');
      try { fallback.focus({ preventScroll:true }); }
      catch { fallback.focus(); }
      if (!hadTabIndex) {
        fallback.addEventListener('blur', () => fallback.removeAttribute('tabindex'), { once:true });
      } else if (previousTabIndex != null) {
        fallback.setAttribute('tabindex', previousTabIndex);
      }
    });
  });
  return dialog;
}

const EXPAND_INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [contenteditable="true"]';
const ACTION_INTERACTIVE = 'button, a, [role="button"]';

function snapshotExpandedCard(source) {
  const clone = source.cloneNode(true);
  clone.removeAttribute('id');
  clone.removeAttribute('data-expandable');
  clone.removeAttribute('data-expandable-mode');
  clone.removeAttribute('tabindex');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-label');
  clone.querySelectorAll('.tcc-expand-trigger').forEach(trigger => trigger.remove());
  clone.classList.add('tcc-expanded-card-snapshot');
  return clone;
}

function wireSnapshotActions(clone, source, dialog) {
  // <summary> remains native inside the cloned expanded card: opening a local
  // details disclosure must not close the enlarged widget and toggle the
  // smaller source card behind it. Only actions that need live handlers are
  // bridged back to the source.
  const clones = [...clone.querySelectorAll(ACTION_INTERACTIVE)].filter(control => !control.classList.contains('tcc-expand-trigger'));
  const originals = [...source.querySelectorAll(ACTION_INTERACTIVE)].filter(control => !control.classList.contains('tcc-expand-trigger'));
  clones.forEach((control, index) => {
    const original = originals[index];
    if (!original) {
      control.setAttribute('aria-hidden', 'true');
      control.tabIndex = -1;
      if ('disabled' in control) control.disabled = true;
      return;
    }
    control.removeAttribute('aria-hidden');
    control.removeAttribute('tabindex');
    if ('disabled' in control) control.disabled = Boolean(original.disabled);
    control.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (original.disabled) return;
      if (dialog.open) dialog.close();
      queueMicrotask(() => {
        if (original.isConnected) original.click();
      });
    });
  });

  // Form controls inside a snapshot are view-only unless they represent a live
  // action. Do not present an editable clone whose changes cannot be committed.
  for (const control of clone.querySelectorAll('input, select, textarea, [contenteditable="true"]')) {
    control.setAttribute('aria-hidden', 'true');
    control.tabIndex = -1;
    if ('disabled' in control) control.disabled = true;
  }
}

export function openExpandedCard({ host, source, title, tone = 'sky', body = null }) {
  if (!host || !source) return;
  const content = document.createElement('div');
  content.className = `tcc-expanded-card-body tone-${tone}`;
  const snapshot = body || snapshotExpandedCard(source);
  content.append(snapshot);
  const dialog = createModal({
    title,
    body: content,
    className: `tcc-expanded-modal tone-${tone}`,
    actions: [{ label:'Close', onClick:d=>d.close() }]
  });
  if (!body) wireSnapshotActions(snapshot, source, dialog);
  host.append(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once:true });
  dialog.showModal();
}

export function makeExpandableCard(element, { host, title, tone = 'sky', bodyBuilder = null } = {}) {
  if (!element || !host) return element;
  // A root control already has an action. Giving it a second expand action
  // creates conflicting behaviour, so leave inherently interactive roots alone.
  if (element.matches(EXPAND_INTERACTIVE)) return element;
  element.dataset.expandable = 'true';
  const accessibleTitle = title || 'Widget';
  const hasNestedControls = Boolean(element.querySelector(EXPAND_INTERACTIVE));

  const open = event => {
    if (event?.type === 'click' && event.target !== element) {
      const interactive = event.target.closest(EXPAND_INTERACTIVE);
      if (interactive && interactive !== element) return;
    }
    event?.preventDefault?.();
    openExpandedCard({ host, source:element, title:title || 'Expanded view', tone, body:bodyBuilder?.() || null });
  };

  if (hasNestedControls) {
    // Do not expose an outer role=button around real child buttons/links. That
    // creates nested interactive semantics in VoiceOver. Keep tap-anywhere-on-
    // blank-space enlargement, but provide one explicit 44px keyboard/screen-
    // reader control for enlargement.
    element.dataset.expandableMode = 'trigger';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tcc-expand-trigger';
    trigger.setAttribute('aria-label', `Enlarge ${accessibleTitle}`);
    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openExpandedCard({ host, source:element, title:title || 'Expanded view', tone, body:bodyBuilder?.() || null });
    });
    element.append(trigger);
  } else {
    element.dataset.expandableMode = 'card';
    element.tabIndex = 0;
    element.setAttribute('role', 'button');
    // Preserve the card's real visible totals/status as its accessible name.
    // A short aria-label here would replace descendant text in VoiceOver.
    element.setAttribute('aria-description', `Tap to enlarge ${accessibleTitle}.`);
    element.addEventListener('keydown', event => {
      if (event.target !== element) return;
      if (event.key === 'Enter' || event.key === ' ') open(event);
    });
  }

  element.addEventListener('click', open);
  return element;
}
