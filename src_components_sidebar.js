import { createLineIcon } from './src_components_icons.js';
export const NAV_ITEMS = Object.freeze([
  ['home', 'Home', 'home'],
  ['itinerary', 'Itinerary', 'itinerary'],
  ['budget', 'Budget', 'budget'],
  ['reservations', 'Reservations', 'reservations'],
  ['calendar', 'Calendar', 'calendar'],
  ['journey-history', 'Journey History', 'history'],
  ['checklist', 'Checklist', 'checklist'],
  ['vault', 'The Vault', 'vault'],
  ['settings', 'Settings', 'settings']
]);

export function renderSidebar(activeScreen, onNavigate, onBrandActivate = null, runtimeMode = 'production') {
  const aside=document.createElement('aside'); aside.className='sidebar'; aside.setAttribute('aria-label','Travel Command Centre sidebar');
  const brand=document.createElement('div'); brand.className='sidebar-brand';
  const mark=document.createElement(onBrandActivate?'button':'span'); mark.className=onBrandActivate?'brand-mark brand-mark-button':'brand-mark'; mark.innerHTML='<img class="brand-app-icon" src="./app-icon.png" alt="" aria-hidden="true">'; if(onBrandActivate){mark.type='button';mark.setAttribute('aria-label',activeScreen==='home'?"Where's the toilet?":'Travel Command Centre compass');mark.addEventListener('click',onBrandActivate);} else mark.setAttribute('aria-hidden','true');
  const name=document.createElement('span'); name.className='sidebar-brand-name'; name.innerHTML='<strong>TRAVEL</strong><small>COMMAND CENTRE</small>'; brand.append(mark,name); aside.append(brand);
  const nav=document.createElement('nav'); nav.setAttribute('aria-label','Primary navigation'); NAV_ITEMS.forEach(([id,label,icon])=>{ const button=document.createElement('button'); button.type='button'; button.className='nav-button'; button.dataset.active=String(id===activeScreen); if(id===activeScreen) button.setAttribute('aria-current','page'); button.setAttribute('aria-label',label); const iconNode=document.createElement('span');iconNode.className='nav-icon';iconNode.append(createLineIcon(icon)); const labelNode=document.createElement('span');labelNode.textContent=label;button.append(iconNode,labelNode);button.addEventListener('click',()=>{
    const previous=document.querySelector('.tcc-nav-flash'); if(previous) previous.remove();
    const rect=button.getBoundingClientRect(); const cue=document.createElement('div'); cue.className='tcc-nav-flash'; cue.textContent=label; cue.style.top=`${Math.round(rect.top+rect.height/2)}px`; document.body.append(cue);
    requestAnimationFrame(()=>cue.classList.add('is-visible'));
    setTimeout(()=>{cue.classList.remove('is-visible');setTimeout(()=>cue.remove(),140);},900);
    onNavigate(id);
  });nav.append(button); }); aside.append(nav);
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
