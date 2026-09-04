import { createLineIcon } from './src_components_icons.js';
export const NAV_ITEMS = Object.freeze([
  ['home', 'Home', 'home'],
  ['budget', 'Budget', 'budget'],
  ['reservations', 'Reservations', 'reservations'],
  ['itinerary', 'Itinerary', 'itinerary'],
  ['calendar', 'Calendar', 'calendar'],
  ['journey-history', 'Journey History', 'history'],
  ['checklist', 'Checklist', 'checklist'],
  ['vault', 'The Vault', 'vault'],
  ['settings', 'Settings', 'settings']
]);

export function renderSidebar(activeScreen, onNavigate, onBrandActivate = null, runtimeMode = 'production') {
  const aside=document.createElement('aside'); aside.className='sidebar'; aside.setAttribute('aria-label','Travel Command Centre sidebar');
  const brand=document.createElement('div'); brand.className='sidebar-brand';
  const mark=document.createElement(onBrandActivate?'button':'span'); mark.className=onBrandActivate?'brand-mark brand-mark-button':'brand-mark'; mark.innerHTML='<span class="brand-compass-ring"><svg class="brand-compass-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="m14.8 9.2-1.8 4.1-4.1 1.8 1.8-4.1 4.1-1.8Z"></path><path d="M12 2.5v2M21.5 12h-2M12 21.5v-2M2.5 12h2"></path></svg></span>'; if(onBrandActivate){mark.type='button';mark.setAttribute('aria-label',activeScreen==='home'?"Where's the toilet?":'Travel Command Centre compass');mark.addEventListener('click',onBrandActivate);} else mark.setAttribute('aria-hidden','true');
  const name=document.createElement('span'); name.className='sidebar-brand-name'; name.innerHTML='<strong>TRAVEL</strong><small>COMMAND CENTRE</small>'; brand.append(mark,name); aside.append(brand);
  const nav=document.createElement('nav'); nav.setAttribute('aria-label','Primary navigation'); NAV_ITEMS.forEach(([id,label,icon])=>{ const button=document.createElement('button'); button.type='button'; button.className='nav-button'; button.dataset.active=String(id===activeScreen); if(id===activeScreen) button.setAttribute('aria-current','page'); button.setAttribute('aria-label',label); const iconNode=document.createElement('span');iconNode.className='nav-icon';iconNode.append(createLineIcon(icon)); const labelNode=document.createElement('span');labelNode.textContent=label;button.append(iconNode,labelNode);button.addEventListener('click',()=>onNavigate(id));nav.append(button); }); aside.append(nav);
  const status=document.createElement('section'); status.className='sidebar-status';
  const modeLabel=runtimeMode==='simulation'?'Offline ready · simulation':'Offline ready · local';
  const statusTitle=document.createElement('strong'); statusTitle.textContent='DATA STATUS'; status.append(statusTitle);
  for(const text of [modeLabel,'Stored locally','Save button commits changes']){
    const row=document.createElement('span'); row.className='sidebar-status-row';
    const dot=document.createElement('i'); dot.className='sidebar-status-dot'; dot.setAttribute('aria-hidden','true');
    row.append(dot,document.createTextNode(text)); status.append(row);
  }
  aside.append(status);
  return aside;
}
