const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = Object.freeze({
  home:[['path',{d:'M3.5 10.5 12 3.8l8.5 6.7'}],['path',{d:'M5.7 9.3v10.1h12.6V9.3'}],['path',{d:'M9.7 19.4v-6.2h4.6v6.2'}]],
  budget:[['circle',{cx:'12',cy:'12',r:'8.2'}],['path',{d:'M14.9 8.5c-.7-.6-1.6-.9-2.8-.9-1.8 0-3.1.9-3.1 2.2 0 1.5 1.3 2 3.2 2.4 1.8.4 2.8.9 2.8 2.3 0 1.4-1.3 2.4-3.3 2.4-1.3 0-2.5-.4-3.4-1.2M12 5.5v13'}]],
  reservations:[['path',{d:'M3.1 12.7 21 5.8l-4.3 12.4-4.2-4.4-4.3 2.4 1-4.7-6.1 1.2Z'}],['path',{d:'m12.5 13.8 4.8-5.4'}]],
  itinerary:[['path',{d:'M12 21s6-5.6 6-11A6 6 0 0 0 6 10c0 5.4 6 11 6 11Z'}],['circle',{cx:'12',cy:'10',r:'2.1'}]],
  calendar:[['rect',{x:'4',y:'5.5',width:'16',height:'14',rx:'2'}],['path',{d:'M8 3.5v4M16 3.5v4M4 9.5h16M8 13h2M12 13h2M16 13h1M8 16.5h2M12 16.5h2'}]],
  history:[['path',{d:'M5 17.5c2.3-5.7 5.1-8.6 8.3-8.6 2.3 0 3.2 1.5 5.7 1.5'}],['circle',{cx:'5',cy:'17.5',r:'1.8'}],['circle',{cx:'13.3',cy:'8.9',r:'1.8'}],['circle',{cx:'19',cy:'10.4',r:'1.8'}]],
  checklist:[['rect',{x:'5',y:'4',width:'14',height:'16',rx:'2'}],['path',{d:'m8 9 1.4 1.4L12 7.8M8 14l1.4 1.4L12 12.8M13.8 9h2.5M13.8 14h2.5'}]],
  vault:[['rect',{x:'4',y:'4',width:'16',height:'16',rx:'3'}],['circle',{cx:'12',cy:'12',r:'3'}],['path',{d:'M12 9v6M9 12h6M17.5 6.5h.01'}]],
  settings:[['circle',{cx:'12',cy:'12',r:'3.1'}],['path',{d:'M12 3.8v2M12 18.2v2M20.2 12h-2M5.8 12h-2M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4M17.8 17.8l-1.4-1.4M7.6 7.6 6.2 6.2'}],['circle',{cx:'12',cy:'12',r:'7.2'}]],
  flight:[['path',{d:'M3 13.4 21 6.2l-4.2 12-4.2-4.2-4.4 2.2 1-4.5L3 13.4Z'}],['path',{d:'m12.6 14 4.5-5'}]],
  train:[['rect',{x:'6',y:'3.8',width:'12',height:'14',rx:'3'}],['path',{d:'M8.5 8h7M8.5 12h7M8 17.8l-2 2M16 17.8l2 2'}],['circle',{cx:'9',cy:'15',r:'1'}],['circle',{cx:'15',cy:'15',r:'1'}]],
  cruise:[['path',{d:'M4 12.5h16l-2.2 4.2c-.7 1.3-2 2-3.5 2H9.7c-1.5 0-2.8-.7-3.5-2L4 12.5Z'}],['path',{d:'M8 12.5V8h8v4.5M10 8V5.3h4V8M4.5 20c1.2.6 2.4.6 3.6 0 1.2.6 2.4.6 3.6 0 1.2.6 2.4.6 3.6 0 1.2.6 2.4.6 3.6 0'}]],
  rv:[['path',{d:'M4 7h11.5l3.5 4v6H4V7Z'}],['path',{d:'M15.5 7v4H19M7 10h4'}],['circle',{cx:'8',cy:'17',r:'2'}],['circle',{cx:'16',cy:'17',r:'2'}]],
  accommodation:[['path',{d:'M3.5 11.3 12 4l8.5 7.3'}],['path',{d:'M5.5 10v10h13V10M9 20v-6h6v6'}]],
  ticket:[['path',{d:'M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z'}],['path',{d:'M12 8.5v2M12 13.5v2'}]],
  globe:[['circle',{cx:'12',cy:'12',r:'8.2'}],['path',{d:'M3.8 12h16.4M12 3.8c2.1 2.2 3.2 5 3.2 8.2S14.1 18 12 20.2C9.9 18 8.8 15.2 8.8 12S9.9 6 12 3.8Z'}]],
  pin:[['path',{d:'M12 21s6-5.6 6-11A6 6 0 0 0 6 10c0 5.4 6 11 6 11Z'}],['circle',{cx:'12',cy:'10',r:'2'}]],
  days:[['rect',{x:'4.5',y:'5',width:'15',height:'15',rx:'2'}],['path',{d:'M8 3.5v3M16 3.5v3M4.5 9h15M8 12h2M12 12h2M8 15.5h2M12 15.5h2'}]],
  years:[['path',{d:'M7 4h10M7 20h10M8 4c0 4 2 5 4 8-2 3-4 4-4 8M16 4c0 4-2 5-4 8 2 3 4 4 4 8'}]],
  spend:[['circle',{cx:'12',cy:'12',r:'8'}],['path',{d:'M15 8.5c-.8-.6-1.7-.9-2.9-.9-1.8 0-3.1.9-3.1 2.2 0 1.4 1.3 2 3.2 2.4 1.8.4 2.8.9 2.8 2.3 0 1.4-1.3 2.4-3.3 2.4-1.3 0-2.5-.4-3.5-1.2M12 5.5v13'}]],
  permanent:[['rect',{x:'5',y:'4',width:'14',height:'16',rx:'2'}],['path',{d:'M8 8h8M8 12h8M8 16h5'}]],
  destination:[['path',{d:'M12 21s6-5.6 6-11A6 6 0 0 0 6 10c0 5.4 6 11 6 11Z'}],['circle',{cx:'12',cy:'10',r:'2'}]],
  current:[['path',{d:'M4 18V8l8-4 8 4v10'}],['path',{d:'M8 18v-6h8v6'}]],
  beforeLeave:[['rect',{x:'5',y:'4',width:'14',height:'16',rx:'2'}],['path',{d:'m8 10 1.5 1.5L12 9M13.5 10H16M8 15h8'}]],
  travelDay:[['path',{d:'M3 13.4 21 6.2l-4.2 12-4.2-4.2-4.4 2.2 1-4.5L3 13.4Z'}]],
  arrival:[['path',{d:'M5 19V8.5L12 4l7 4.5V19'}],['path',{d:'M8 13h8M12 9v8'}]],
  leaf:[['path',{d:'M19.5 4.5C12 4.8 7.2 8 6 14.3c3.5.5 6.4-.3 8.6-2.4 2.1-2.1 3.8-4.7 4.9-7.4Z'}],['path',{d:'M5 19c2.2-4.5 5.3-7.7 9.4-9.8'}]],
  wildlife:[['circle',{cx:'8',cy:'8',r:'1.5'}],['circle',{cx:'16',cy:'8',r:'1.5'}],['circle',{cx:'5.5',cy:'12',r:'1.3'}],['circle',{cx:'18.5',cy:'12',r:'1.3'}],['path',{d:'M8.2 16.4c0-2.3 1.7-4.2 3.8-4.2s3.8 1.9 3.8 4.2c0 1.8-1.4 3-3.8 3s-3.8-1.2-3.8-3Z'}]],
  food:[['path',{d:'M5 13h14M7 13a5 5 0 0 1 10 0M8 17h8'}],['path',{d:'M10 5c0 1 .8 1.5.8 2.5M14 5c0 1 .8 1.5.8 2.5'}]],
  groceries:[['path',{d:'M5 9h14l-1.3 9H6.3L5 9Z'}],['path',{d:'M8 9c0-2.7 1.4-4.3 4-4.3S16 6.3 16 9'}],['path',{d:'M9 12v3M12 12v3M15 12v3'}]],
  restaurant:[['path',{d:'M7 4v7M4.5 4v4.5C4.5 10 5.6 11 7 11s2.5-1 2.5-2.5V4M7 11v9'}],['path',{d:'M15 4v16M15 4c3 1.2 4.5 3.4 4.5 6.5H15'}]],
  transport:[['path',{d:'M5 16.5 6.4 10c.3-1.4 1.4-2.3 2.8-2.3h5.6c1.4 0 2.5.9 2.8 2.3l1.4 6.5'}],['path',{d:'M4 14h16v4H4z'}],['circle',{cx:'7.5',cy:'18',r:'1.5'}],['circle',{cx:'16.5',cy:'18',r:'1.5'}],['path',{d:'M7 11h10'}]],
  entertainment:[['path',{d:'M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z'}],['path',{d:'m12 8.2.9 1.8 2 .3-1.5 1.4.4 2-1.8-.9-1.8.9.4-2-1.5-1.4 2-.3.9-1.8Z'}]],
  shopping:[['path',{d:'M5 8h14l-1 12H6L5 8Z'}],['path',{d:'M9 9V7a3 3 0 0 1 6 0v2'}]],
  misc:[['circle',{cx:'7',cy:'12',r:'1'}],['circle',{cx:'12',cy:'12',r:'1'}],['circle',{cx:'17',cy:'12',r:'1'}]],
  culture:[['path',{d:'m12 4 2.1 4.4 4.9.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.9-.7L12 4Z'}]],
  streaming:[['rect',{x:'4',y:'5',width:'16',height:'14',rx:'2'}],['path',{d:'m10 9 5 3-5 3V9Z'}]],
  search:[['circle',{cx:'10.5',cy:'10.5',r:'5.5'}],['path',{d:'m15 15 4.5 4.5'}]],
  expand:[['path',{d:'M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4'}]],
  plus:[['path',{d:'M12 5v14M5 12h14'}]],
  close:[['path',{d:'M6 6l12 12M18 6 6 18'}]],
  chevronLeft:[['path',{d:'m15 6-6 6 6 6'}]],
  chevronRight:[['path',{d:'m9 6 6 6-6 6'}]],
  arrowRight:[['path',{d:'M5 12h14M14 7l5 5-5 5'}]],
  diamond:[['path',{d:'M12 4.5 19.5 12 12 19.5 4.5 12 12 4.5Z'}]],
  check:[['path',{d:'m5 12 4 4 10-10'}]],
  warning:[['path',{d:'M12 4 21 20H3L12 4Z'}],['path',{d:'M12 9v5M12 17h.01'}]],
  info:[['circle',{cx:'12',cy:'12',r:'8'}],['path',{d:'M12 10.5v5M12 7.5h.01'}]],
  play:[['path',{d:'m9 7 8 5-8 5V7Z'}]],
  slow:[['circle',{cx:'12',cy:'12',r:'8'}],['path',{d:'M12 7v5l3 2'}]],
  repeat:[['path',{d:'M17 7h2.5v-2.5M19.5 7A7.5 7.5 0 0 0 6.7 5.2M7 17H4.5v2.5M4.5 17a7.5 7.5 0 0 0 12.8 1.8'}]],
  volume:[['path',{d:'M5 10h3l4-3v10l-4-3H5v-4Z'}],['path',{d:'M15 9c1 .8 1.5 1.8 1.5 3S16 14.2 15 15M17.5 7c1.7 1.4 2.5 3 2.5 5s-.8 3.6-2.5 5'}]]
});

function appendShape(svg, [tag, attrs]) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, String(value));
  svg.append(el);
}

export function createLineIcon(name, className = '') {
  const wrap = document.createElement('span');
  wrap.className = ['tcc-line-icon', className].filter(Boolean).join(' ');
  wrap.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('focusable', 'false');
  for (const shape of ICONS[name] || ICONS.pin) appendShape(svg, shape);
  wrap.append(svg);
  return wrap;
}
