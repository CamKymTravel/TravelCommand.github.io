export const NAV_ITEMS = Object.freeze([
  ['home', 'Home'],
  ['budget', 'Budget'],
  ['reservations', 'Reservations'],
  ['itinerary', 'Itinerary'],
  ['calendar', 'Calendar'],
  ['journey-history', 'Journey History'],
  ['checklist', 'Checklist'],
  ['vault', 'The Vault'],
  ['settings', 'Settings']
]);

export function renderSidebar(activeScreen, onNavigate, onBrandActivate = null) {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.setAttribute('aria-label', 'Main navigation');
  const brand = document.createElement('div');
  brand.className = 'sidebar-brand';
  const mark = document.createElement(onBrandActivate ? 'button' : 'span');
  mark.className = onBrandActivate ? 'brand-mark brand-mark-button' : 'brand-mark';
  mark.textContent = '✦';
  mark.setAttribute('aria-hidden', onBrandActivate ? 'false' : 'true');
  if (onBrandActivate) {
    mark.type = 'button';
    mark.setAttribute('aria-label', 'Travel Command Centre compass');
    mark.addEventListener('click', onBrandActivate);
  }
  const name = document.createElement('span');
  name.textContent = 'Travel Command Centre';
  brand.append(mark, name);
  aside.append(brand);
  const nav = document.createElement('nav');
  NAV_ITEMS.forEach(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-button';
    button.dataset.active = String(id === activeScreen);
    button.textContent = label;
    button.addEventListener('click', () => onNavigate(id));
    nav.append(button);
  });
  aside.append(nav);
  return aside;
}
