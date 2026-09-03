export const NAV_ITEMS = Object.freeze([
  ['home', 'Home', '⌂'],
  ['budget', 'Budget', '◉'],
  ['reservations', 'Reservations', '✈'],
  ['itinerary', 'Itinerary', '⌖'],
  ['calendar', 'Calendar', '▦'],
  ['journey-history', 'Journey History', '⌁'],
  ['checklist', 'Checklist', '☷'],
  ['vault', 'The Vault', '◈'],
  ['settings', 'Settings', '⚙']
]);

export function renderSidebar(activeScreen, onNavigate, onBrandActivate = null, runtimeMode = 'production') {
  const aside=document.createElement('aside'); aside.className='sidebar'; aside.setAttribute('aria-label','Travel Command Centre sidebar');
  const brand=document.createElement('div'); brand.className='sidebar-brand';
  const mark=document.createElement(onBrandActivate?'button':'span'); mark.className=onBrandActivate?'brand-mark brand-mark-button':'brand-mark'; mark.innerHTML='<span class="brand-compass-ring"><span class="brand-compass-needle">◆</span></span>'; if(onBrandActivate){mark.type='button';mark.setAttribute('aria-label',activeScreen==='home'?"Where's the toilet?":'Travel Command Centre compass');mark.addEventListener('click',onBrandActivate);} else mark.setAttribute('aria-hidden','true');
  const name=document.createElement('span'); name.className='sidebar-brand-name'; name.innerHTML='<strong>TRAVEL</strong><small>COMMAND CENTRE</small>'; brand.append(mark,name); aside.append(brand);
  const nav=document.createElement('nav'); nav.setAttribute('aria-label','Primary navigation'); NAV_ITEMS.forEach(([id,label,icon])=>{ const button=document.createElement('button'); button.type='button'; button.className='nav-button'; button.dataset.active=String(id===activeScreen); if(id===activeScreen) button.setAttribute('aria-current','page'); button.setAttribute('aria-label',label); const iconNode=document.createElement('span');iconNode.className='nav-icon';iconNode.textContent=icon; const labelNode=document.createElement('span');labelNode.textContent=label;button.append(iconNode,labelNode);button.addEventListener('click',()=>onNavigate(id));nav.append(button); }); aside.append(nav);
  const status=document.createElement('section'); status.className='sidebar-status';
  const modeLabel=runtimeMode==='simulation'?'Offline ready · simulation':'Offline ready · local';
  status.innerHTML=`<strong>DATA STATUS</strong><span>● ${modeLabel}</span><span>● Stored locally</span><span>● All changes saved</span>`; aside.append(status);
  return aside;
}
