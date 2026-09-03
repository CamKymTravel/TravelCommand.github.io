import { buildHomeViewModel } from './src_core_home-view-model.js';
import { formatMoney, audToLocal } from './src_core_currency.js';
import { formatAUDate } from './src_core_dates.js';
import { isDestinationBudgetUsable } from './src_core_budget.js';
import { applyStayHeaderImage } from './src_components_page-hero.js';
import { createModal } from './src_components_modal.js';
import { makeExpandableCard } from './src_components_modal.js';

const COLLECTION_TO_SCREEN = Object.freeze({ itinerary:'itinerary', reservations:'reservations', calendarEvents:'calendar', journeyHistory:'journey-history', checklists:'checklist', vault:'vault', expenses:'budget' });

function q(display,food,animal,plant,history){return{display,food:[food],animals:[animal],plants:[plant],history:[history]};}
const COUNTRY_QUICK_LOOK=Object.freeze({
  algeria:q('Algeria',['Couscous','A North African staple served with vegetables and meat.'],['Barbary macaque','Native primate found in parts of North Africa.'],['Aleppo pine','A characteristic Mediterranean tree across northern Algeria.'],['Casbah of Algiers','A historic hill-city of Ottoman-era lanes and architecture.']),
  australia:q('Australia',['Lamington','Sponge cake coated in chocolate and coconut is an Australian classic.'],['Koala','A distinctive native marsupial found in eucalyptus habitats.'],['Eucalyptus and native gardens','Royal Botanic Gardens and native-flora collections make Australian plants easy to explore.'],['First Nations cultures','Australia has the world’s oldest continuing living cultures, alongside rich colonial and modern history.']),
  belgium:q('Belgium',['Belgian waffles','Brussels and Liège styles are both famous.'],['Red deer','Found in forested areas including the Ardennes.'],['Bluebells','Hallerbos is renowned for its spring bluebell carpet.'],['Grand Place','Brussels’ ornate central square reflects centuries of civic history.']),
  croatia:q('Croatia',['Peka','Meat or seafood slow-cooked under a bell-shaped lid.'],['Bottlenose dolphin','Resident populations live in the Adriatic.'],['Lavender','A familiar aromatic plant on the Dalmatian islands.'],['Dubrovnik','Its fortified old town is a major Adriatic historic site.']),
  cyprus:q('Cyprus',['Halloumi','Cyprus’ best-known brined cheese.'],['Cyprus mouflon','A wild sheep unique to Cyprus.'],['Cyclamen','The Cyprus cyclamen is the national flower.'],['Paphos','Ancient mosaics and archaeological sites reflect deep Mediterranean history.']),
  czechia:q('Czechia',['Svíčková','Beef with a creamy vegetable sauce and dumplings.'],['Eurasian lynx','A rare forest predator in parts of the country.'],['Linden','The linden is the Czech national tree.'],['Prague Castle','A vast historic complex overlooking the Vltava.']),
  egypt:q('Egypt',['Koshari','Rice, lentils, pasta and chickpeas with tomato sauce and onions.'],['Egyptian mongoose','A long-established Nile-region mammal.'],['Lotus','The lotus has powerful symbolism in ancient Egyptian art.'],['Giza pyramids','Monuments from Egypt’s Old Kingdom remain among the world’s most famous ancient sites.']),
  france:q('France',['Baguette','A daily bread icon of French food culture.'],['Alpine ibex','Seen in high mountain areas of the French Alps.'],['Lavender','Provence is famous for summer lavender fields.'],['Paris museums','The Louvre and other collections span thousands of years of art and history.']),
  germany:q('Germany',['Currywurst','A classic urban snack of sausage with curry-spiced sauce.'],['Red deer','Common in many German forests.'],['Oak and beech','Native woodland defines much of Germany’s forest landscape.'],['Castles and old towns','Germany preserves a dense network of medieval towns and fortifications.']),
  greece:q('Greece',['Souvlaki','Grilled meat skewers served simply or in pita.'],['Loggerhead turtle','Nests on several Greek islands and beaches.'],['Olive tree','Central to Greek landscapes, food and culture for millennia.'],['Acropolis','Athens’ ancient citadel is a defining landmark of classical Greece.']),
  hungary:q('Hungary',['Goulash','Paprika-rich soup or stew with deep Hungarian roots.'],['Great bustard','One of Europe’s heaviest flying birds survives on the plains.'],['Hungarian iris','A native iris associated with parts of the Carpathian Basin.'],['Budapest baths','Historic thermal-bath culture reflects the city’s long use of hot springs.']),
  indonesia:q('Indonesia',['Nasi goreng','Fried rice commonly served with egg and savoury accompaniments.'],['Orangutan','Native to Sumatra and Borneo.'],['Rafflesia','Indonesia is home to spectacular giant parasitic flowers.'],['Borobudur','A monumental Buddhist temple complex in Central Java.']),
  italy:q('Italy',['Pasta','Regional pasta traditions vary enormously across Italy.'],['Apennine wolf','A native wolf population lives along the peninsula.'],['Italian cypress','A signature tree of many central Italian landscapes.'],['Rome','Ancient, medieval, Renaissance and modern history overlap across the city.']),
  japan:q('Japan',['Sushi','One of many Japanese cuisines built around careful seasonal preparation.'],['Japanese macaque','Famous for winter hot-spring behaviour in Nagano.'],['Cherry blossom','Sakura season is a major cultural and garden event.'],['Kyoto','Temples, gardens and historic districts preserve layers of Japanese history.']),
  jordan:q('Jordan',['Mansaf','Lamb, rice and fermented yoghurt sauce; Jordan’s national dish.'],['Arabian oryx','A desert antelope restored through conservation programs.'],['Black iris','Jordan’s national flower.'],['Petra','The Nabataean rock-cut city is Jordan’s best-known archaeological site.']),
  morocco:q('Morocco',['Tagine','Slow-cooked dishes named for the conical cooking vessel.'],['Barbary macaque','Lives in parts of Morocco’s Atlas and Rif regions.'],['Argan tree','Native to Morocco and central to traditional argan-oil production.'],['Medinas','Historic walled quarters preserve markets, craft traditions and architecture.']),
  netherlands:q('Netherlands',['Stroopwafel','Thin waffles joined with caramel-like syrup.'],['Eurasian spoonbill','A conspicuous wetland bird in Dutch nature reserves.'],['Tulip','Dutch gardens and spring bulb fields are internationally famous.'],['Canal cities','Amsterdam and other cities preserve distinctive mercantile-era canal landscapes.']),
  portugal:q('Portugal',['Pastel de nata','Custard tart with a blistered top and cinnamon.'],['Iberian wolf','Rare and elusive in Portugal’s north.'],['Cork oak','Portugal is closely associated with cork landscapes.'],['Azulejos','Decorative tiles are a major part of Portuguese visual culture.']),
  russia:q('Russia',['Pelmeni','Filled dumplings served across many regions.'],['Amur tiger','A rare big cat of Russia’s Far East.'],['Birch','Birch forests are strongly associated with Russian landscapes and culture.'],['Hermitage','St Petersburg’s museum occupies the historic Winter Palace complex.']),
  spain:q('Spain',['Tapas','Small dishes vary widely by region.'],['Iberian lynx','A major conservation success in Spain and Portugal.'],['Orange blossom','Fragrant citrus blossom is especially associated with southern Spain.'],['Alhambra','Granada’s palace-fortress is a landmark of Nasrid architecture.']),
  thailand:q('Thailand',['Pad thai','Stir-fried rice noodles with sweet, sour and savoury flavours.'],['Asian elephant','Deeply significant in Thai history and culture.'],['Lotus','Common in temple ponds and tropical gardens.'],['Ayutthaya','Ruined temples mark the former capital of the Siamese kingdom.']),
  turkey:q('Türkiye',['Simit','Sesame-crusted bread rings are a classic street snack.'],['Van cat','A distinctive cat breed associated with eastern Türkiye.'],['Tulip','Strong historic association with Ottoman gardens.'],['Hagia Sophia','A landmark shaped by Byzantine and Ottoman history.']),
  'united-kingdom':q('United Kingdom',['Fish and chips','A classic takeaway meal found across Britain.'],['Red squirrel','Native populations survive strongly in parts of Scotland and islands.'],['Bluebell','Ancient woodlands can produce spectacular spring displays.'],['Museums and castles','The UK has dense layers of Roman, medieval, industrial and modern history.']),
  'united-states':q('United States',['Barbecue','Regional barbecue traditions differ dramatically across the country.'],['Bald eagle','The national bird is widespread near large waterways.'],['Giant sequoia','Among the world’s largest trees, native to California’s Sierra Nevada.'],['Smithsonian museums','Washington’s national collections cover history, science, aviation and culture.']),
  vietnam:q('Vietnam',['Phở','Fragrant noodle soup with regional variations.'],['Red-shanked douc','A striking primate native to central Vietnam.'],['Lotus','Vietnam’s national flower and a familiar wetland plant.'],['Huế and Hội An','Historic imperial and trading-city architecture survives in central Vietnam.'])
});

const TOILET_LANGUAGE=Object.freeze({
  algeria:{language:'Arabic',phrase:'أين الحمام؟',say:'AYN al-ham-MAAM?',slow:'AYN | al · ham · MAAM'},
  australia:{language:'English',phrase:'Where’s the toilet?',say:'wairs the TOY-let?',slow:'wairs | the | TOY · let'},
  belgium:{language:'French',phrase:'Où sont les toilettes ?',say:'oo sohn lay twah-LET?',slow:'oo | sohn | lay | twah · LET'},
  croatia:{language:'Croatian',phrase:'Gdje je WC?',say:'gdye yeh veh-TSEH?',slow:'gdye | yeh | veh · TSEH'},
  cyprus:{language:'Greek',phrase:'Πού είναι η τουαλέτα;',say:'poo EE-neh ee too-ah-LEH-tah?',slow:'poo | EE · neh | ee | too · ah · LEH · tah'},
  czechia:{language:'Czech',phrase:'Kde je toaleta?',say:'gdeh yeh toh-ah-LEH-tah?',slow:'gdeh | yeh | toh · ah · LEH · tah'},
  egypt:{language:'Arabic',phrase:'أين الحمام؟',say:'AYN al-ham-MAAM?',slow:'AYN | al · ham · MAAM'},
  france:{language:'French',phrase:'Où sont les toilettes ?',say:'oo sohn lay twah-LET?',slow:'oo | sohn | lay | twah · LET'},
  germany:{language:'German',phrase:'Wo ist die Toilette?',say:'voh ist dee toy-LET-uh?',slow:'voh | ist | dee | toy · LET · uh'},
  greece:{language:'Greek',phrase:'Πού είναι η τουαλέτα;',say:'poo EE-neh ee too-ah-LEH-tah?',slow:'poo | EE · neh | ee | too · ah · LEH · tah'},
  hungary:{language:'Hungarian',phrase:'Hol van a mosdó?',say:'hol vahn ah MOSH-doh?',slow:'hol | vahn | ah | MOSH · doh'},
  indonesia:{language:'Indonesian',phrase:'Di mana toilet?',say:'dee MAH-nah TOY-let?',slow:'dee | MAH · nah | TOY · let'},
  italy:{language:'Italian',phrase:'Dov’è il bagno?',say:'doh-VEH eel BAHN-yo?',slow:'doh · VEH | eel | BAHN · yo'},
  japan:{language:'Japanese',phrase:'トイレはどこですか？',say:'TOY-reh wah DOH-koh dess kah?',slow:'TOY · reh | wah | DOH · koh | dess | kah'},
  jordan:{language:'Arabic',phrase:'أين الحمام؟',say:'AYN al-ham-MAAM?',slow:'AYN | al · ham · MAAM'},
  morocco:{language:'Moroccan Arabic',phrase:'فين الحمام؟',say:'FEEN el-ham-MAAM?',slow:'FEEN | el · ham · MAAM'},
  netherlands:{language:'Dutch',phrase:'Waar is het toilet?',say:'vahr iss hut twah-LET?',slow:'vahr | iss | hut | twah · LET'},
  portugal:{language:'Portuguese',phrase:'Onde fica a casa de banho?',say:'ON-duh FEE-kah ah KAH-zah duh BAHN-yoo?',slow:'ON · duh | FEE · kah | ah | KAH · zah | duh | BAHN · yoo'},
  russia:{language:'Russian',phrase:'Где туалет?',say:'gdyeh too-ah-LET?',slow:'gdyeh | too · ah · LET'},
  spain:{language:'Spanish',phrase:'¿Dónde está el baño?',say:'DON-deh es-TAH el BAHN-yo?',slow:'DON · deh | es · TAH | el | BAHN · yo'},
  thailand:{language:'Thai',phrase:'ห้องน้ำอยู่ที่ไหน?',say:'hong-NAHM yoo tee NAI?',slow:'hong · NAHM | yoo | tee | NAI'},
  turkey:{language:'Turkish',phrase:'Tuvalet nerede?',say:'too-vah-LET neh-reh-DEH',slow:'too · vah · LET | neh · reh · DEH'},
  'united-states':{language:'English',phrase:'Where is the restroom?',say:'where iz the REST-room?',slow:'where | iz | the | REST · room'},
  'united-kingdom':{language:'English',phrase:'Where’s the toilet?',say:'wairs the TOY-let?',slow:'wairs | the | TOY · let'},
  vietnam:{language:'Vietnamese',phrase:'Nhà vệ sinh ở đâu?',say:'nyah veh sing uh DOH?',slow:'nyah | veh | sing | uh | DOH'}
});

function node(tag, className, text) { const element=document.createElement(tag); if(className) element.className=className; if(text!=null) element.textContent=text; return element; }
function slug(value='') { const raw=String(value).normalize('NFC').trim().toLocaleLowerCase('en-AU'); if(raw==='türkiye'||raw==='turkiye') return 'turkey'; if(raw==='usa'||raw==='us'||raw==='u.s.a.'||raw==='u.s.'||raw==='united states of america') return 'united-states'; if(raw==='uk'||raw==='u.k.') return 'united-kingdom'; if(raw==='uae'||raw==='u.a.e.') return 'united-arab-emirates'; if(raw==='czech republic') return 'czechia'; return raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function departureCountry(stay={}){if(stay.travelType!=='cruise'&&stay.travelType!=='motorhome')return stay.country||'';if(stay.startCountry)return stay.startCountry;const city=String(stay.startCity||'').trim().toLowerCase();const cityCountry={london:'United Kingdom',munich:'Germany',rome:'Italy',miami:'United States',nashville:'United States',dallas:'United States','los angeles':'United States','new york':'United States',amsterdam:'Netherlands'};if(cityCountry[city])return cityCountry[city];const first=String(stay.country||'').split(/\s*(?:\/|→|->|,)\s*/)[0].trim();const regions=new Set(['caribbean','europe','asia','africa','north america','south america','central america','middle east','mediterranean','baltic','scandinavia','world']);return regions.has(first.toLowerCase())?'':first;}
function localMoney(aud,currency,rate){ if(currency&&currency!=='AUD'&&Number(rate)>0){ const local=audToLocal(Math.abs(Number(aud)||0),rate)*Math.sign(Number(aud)||0); return [formatMoney(local,currency),formatMoney(aud,'AUD')]; } return [formatMoney(aud,'AUD'),null]; }

function showQuickLook(host, stay) {
  const country=departureCountry(stay); const key=slug(country); const facts=COUNTRY_QUICK_LOOK[key] || q(country||'Current destination',['Food','Offline Quick Look is not available for this destination.'],['Wildlife','Offline Quick Look is not available for this destination.'],['Plants & gardens','Offline Quick Look is not available for this destination.'],['History','Offline Quick Look is not available for this destination.']);
  const body=node('div','home-quick-look');
  const intro=node('div','home-quick-intro'); intro.append(node('p','eyebrow','COUNTRY QUICK LOOK · OFFLINE'),node('h3','',facts.display),node('p','','Food, animals, plants and history at a glance.')); body.append(intro);
  for(const [section,title] of [['food','Food & Drink'],['animals','Animals'],['plants','Plants & Gardens'],['history','History & Culture']]){ const card=node('section',`home-quick-section home-quick-${section}`); card.append(node('h4','',title)); const grid=node('div','home-quick-grid'); for(const [name,copy] of facts[section]){ const item=node('article','home-quick-item'); item.append(node('strong','',name),node('span','',copy)); grid.append(item); } card.append(grid); body.append(card); }
  const dialog=createModal({title:facts.display,body,actions:[{label:'Close',onClick:d=>d.close()}]}); host.append(dialog); dialog.showModal(); dialog.addEventListener('close',()=>dialog.remove(),{once:true});
}

function showToilet(host, stay){ const country=departureCountry(stay); const key=slug(country); const item=TOILET_LANGUAGE[key]; if(!item)return; const body=node('div','home-toilet'); body.append(node('p','home-toilet-label',"WHERE'S THE TOILET?"),node('strong','home-toilet-phrase',item.phrase)); const say=node('div','home-toilet-line'); say.append(node('span','','SAY IT'),node('strong','',item.say)); const slow=node('div','home-toilet-line'); slow.append(node('span','','SLOW'),node('strong','',item.slow)); body.append(say,slow,node('p','home-toilet-language',`${country} · ${item.language}`)); const dialog=createModal({title:'Quick language aid',body,actions:[{label:'Close',onClick:d=>d.close()}]}); host.append(dialog); dialog.showModal(); dialog.addEventListener('close',()=>dialog.remove(),{once:true}); }

function flagEmoji(country='') {
  const codes={
    albania:'AL',algeria:'DZ',argentina:'AR',australia:'AU',austria:'AT',bahamas:'BS',belgium:'BE',
    'bosnia-and-herzegovina':'BA',brazil:'BR',bulgaria:'BG',cambodia:'KH',canada:'CA',chile:'CL',china:'CN',
    colombia:'CO','costa-rica':'CR',croatia:'HR',cyprus:'CY',czechia:'CZ',denmark:'DK','dominican-republic':'DO',
    egypt:'EG',estonia:'EE',finland:'FI',france:'FR',germany:'DE',greece:'GR',hungary:'HU',iceland:'IS',india:'IN',
    indonesia:'ID',ireland:'IE',italy:'IT',jamaica:'JM',japan:'JP',jordan:'JO',laos:'LA',latvia:'LV',liechtenstein:'LI',
    lithuania:'LT',luxembourg:'LU',malaysia:'MY',malta:'MT',mexico:'MX',monaco:'MC',montenegro:'ME',morocco:'MA',
    netherlands:'NL','new-zealand':'NZ','north-macedonia':'MK',norway:'NO',oman:'OM',panama:'PA',peru:'PE',
    philippines:'PH',poland:'PL',portugal:'PT',qatar:'QA',romania:'RO',russia:'RU',serbia:'RS',singapore:'SG',
    slovakia:'SK',slovenia:'SI','south-africa':'ZA','south-korea':'KR',spain:'ES','sri-lanka':'LK',sweden:'SE',
    switzerland:'CH',taiwan:'TW',thailand:'TH',tunisia:'TN',turkey:'TR','united-arab-emirates':'AE',
    'united-kingdom':'GB','united-states':'US',vietnam:'VN'
  };
  const code=codes[slug(country)];
  return code ? [...code].map(ch=>String.fromCodePoint(127397+ch.charCodeAt(0))).join('') : '🌍';
}

function pct(value){ return `${Math.max(0,Math.round(Number(value)||0))}%`; }
function pctFill(value){ return `${Math.max(0,Math.min(100,Math.round(Number(value)||0)))}%`; }
function progressLine(label,value,tone=''){ const wrap=node('div',`home-budget-progress ${tone}`.trim()); const display=pct(value); const top=node('div','home-budget-progress-head'); top.append(node('span','',label),node('strong','',display)); const track=node('span','home-budget-progress-track'); track.setAttribute('role','progressbar'); track.setAttribute('aria-label',label); track.setAttribute('aria-valuemin','0'); track.setAttribute('aria-valuemax','100'); track.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,Math.round(Number(value)||0))))); track.setAttribute('aria-valuetext',display); const fill=node('span','home-budget-progress-fill'); fill.style.width=pctFill(value); track.append(fill); wrap.append(top,track); return wrap; }
function compactMoney(value){ const v=Number(value)||0; const abs=Math.abs(v); if(abs>=1000000) return `$${(abs/1000000).toFixed(abs>=10000000?1:2)}m`; if(abs>=1000) return `$${Math.round(abs).toLocaleString('en-AU')}`; return `$${Math.round(abs)}`; }
function monthLabel(index){ return ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][index]||''; }
function eventDateParts(displayDate=''){ const m=String(displayDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return {day:'—',month:''}; return {day:String(m[1]).padStart(2,'0'),month:monthLabel(Number(m[2])-1)}; }
function upcomingEventTypeLabel(event){ if(event?.kind==='reservation') return ({flight:'Flight',train:'Train',cruise:'Cruise',rv:'RV',accommodation:'Accommodation',ticket:'Tickets & Attractions'})[event.type]||'Reservation'; return event?.type==='reminder'?'Reminder':event?.type==='note'?'Note':'Personal'; }

function renderHero(model, state, host){
  const hero=node('section','home-reference-hero'); applyStayHeaderImage(hero,model.currentStay,{position:'center center'});
  const currentWrap=node('div','home-destination-hero-wrap');
  const current=node('div','home-stay-card home-destination-hero-card');
  if(model.currentStay){
    current.tabIndex=0; current.setAttribute('role','button'); current.setAttribute('aria-label',['Open destination quick look',model.currentStay.title,model.currentStay.country,model.currentStay.dates].filter(Boolean).join(' · '));
    const top=node('div','home-destination-hero-top'); top.append(node('span','home-destination-flag',flagEmoji(departureCountry(model.currentStay))),node('p','home-ref-kicker','CURRENT DESTINATION')); if(model.currentStay.travelType==='cruise'||model.currentStay.travelType==='motorhome'||model.currentStay.travelType==='rv') top.append(node('span','home-route-mode',model.currentStay.travelType==='cruise'?'⚓ Cruise':'▣ Motorhome'));
    const title=node('div','home-destination-title'); title.append(node('strong','home-stay-name',model.currentStay.title),node('span','home-destination-country',model.currentStay.country));
    const meta=node('div','home-destination-meta'); meta.append(node('span','',model.currentStay.dates),node('span','',`${model.currentStay.remainingDays} days remaining`));
    current.append(top,title,meta);
    current.addEventListener('click',()=>showQuickLook(host,model.currentStay));
    current.addEventListener('keydown',event=>{if(event.target!==current)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();showQuickLook(host,model.currentStay);}});
  } else current.append(node('p','home-ref-kicker','CURRENT DESTINATION'),node('strong','home-stay-name','No current stay'));
  currentWrap.append(current);
  if(model.currentStay&&TOILET_LANGUAGE[slug(departureCountry(model.currentStay))]){const compass=node('button','home-compass','✦'); compass.type='button'; compass.setAttribute('aria-label',"Where's the toilet language aid"); compass.title="Where's the toilet?"; compass.addEventListener('click',event=>{event.stopPropagation();showToilet(host,model.currentStay);}); currentWrap.append(compass);}
  hero.append(currentWrap);
  return hero;
}

function homeCard(kind,kicker){ const card=node('section',`home-ref-card home-ref-${kind}`); const head=node('div','home-budget-card-head'); head.append(node('span','home-budget-diamond','◆'),node('p','home-ref-kicker',kicker)); card.append(head); return card; }

function renderDailyBudget(model){
  const card=homeCard('daily','DAILY BUDGET');
  if(!model.currentStay){ card.append(node('strong','home-ref-value','—')); return card; }
  if(!isDestinationBudgetUsable(model.currentStay)){ card.append(node('span','home-card-label','DESTINATION BUDGET NEEDS SETUP'),node('strong','home-ref-value home-ref-value-xl','—'),node('small','home-budget-note','Set amount, currency and fixed rate in Budget.')); return card; }
  const planned=model.currentStay.destinationBudgetAUD/Math.max(1,model.currentStay.totalDays);
  const actual=model.currentStay.destinationSpentAUD/Math.max(1,model.currentStay.currentDay);
  const delta=planned-actual;
  const [primary,secondary]=localMoney(planned,model.currentStay.localCurrency,model.currentStay.fixedLocalPerAUD);
  card.append(node('span','home-card-label','PLANNED DAILY ALLOWANCE'),node('strong','home-ref-value home-ref-value-xl',primary));
  if(secondary) card.append(node('span','home-ref-secondary',secondary));
  const lower=node('div','home-budget-lower');
  const row=node('div','home-budget-value-row'); row.append(node('span','','AVERAGE SPEND / DAY'),node('strong',delta>=0?'is-good':'is-bad',formatMoney(actual,'AUD')));
  const track=node('span','home-budget-simple-track'); const fill=node('span','home-budget-simple-fill'); fill.style.width=pctFill(planned?actual/planned*100:0); track.append(fill);
  lower.append(row,track,node('small','',`${formatMoney(Math.abs(delta),'AUD')} ${delta>=0?'under':'over'} daily allowance`)); card.append(lower);
  return card;
}

function renderDestinationBudget(model){
  const card=homeCard('destination','DESTINATION BUDGET');
  if(!model.currentStay){ card.append(node('strong','home-ref-value','—')); return card; }
  if(!isDestinationBudgetUsable(model.currentStay)){ card.append(node('span','home-card-label','DESTINATION BUDGET NEEDS SETUP'),node('strong','home-ref-value home-ref-value-xl','—'),node('small','home-budget-note','Open Budget to lock in this stay.')); return card; }
  const [primary,secondary]=localMoney(model.currentStay.destinationRemainingAUD,model.currentStay.localCurrency,model.currentStay.fixedLocalPerAUD);
  const used=model.currentStay.destinationBudgetAUD?model.currentStay.destinationSpentAUD/model.currentStay.destinationBudgetAUD*100:0;
  const expected=model.currentStay.destinationBudgetAUD*(model.currentStay.progress/100);
  const paceDelta=expected-model.currentStay.destinationSpentAUD;
  card.append(node('span','home-card-label','AFTER COMMITMENTS'),node('strong','home-ref-value home-ref-value-xl',primary)); if(secondary) card.append(node('span','home-ref-secondary',secondary));
  const lower=node('div','home-budget-lower'); lower.append(progressLine('BUDGET USED',used,'budget-used'),progressLine('STAY ELAPSED',model.currentStay.progress,'stay-elapsed'));
  const note=node('small',paceDelta>=0?'home-budget-note is-good':'home-budget-note is-bad',`${formatMoney(Math.abs(paceDelta),'AUD')} ${paceDelta>=0?'under':'over'} planned pace`); lower.append(note); card.append(lower); return card;
}

function annualPeriodSpent(state,startISO,endISO){
  const dateOf=r=>String(r.date || r.dateTime || '').slice(0,10);
  const expenses=(state.expenses||[]).filter(r=>!r.needsBudgetRepair).filter(r=>{const d=dateOf(r); return d>=startISO&&d<=endISO;}).reduce((sum,r)=>sum+Number(r.audAmount||0),0);
  const reservations=(state.reservations||[]).filter(r=>r.status!=='to-book'&&!r.needsBudgetRepair).filter(r=>{const d=dateOf(r); return d>=startISO&&d<=endISO;}).reduce((sum,r)=>sum+Number(r.audAmount||0),0);
  return expenses+reservations;
}
function iso(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function daysInMonth(y,m){ return new Date(Date.UTC(y,m,0)).getUTCDate(); }
function annualDeltaRow(label,delta){ const row=node('div','home-annual-delta-row'); row.append(node('span','',label),node('strong',delta>=0?'is-good':'is-bad',`${compactMoney(delta)} ${delta>=0?'UNDER':'OVER'}`)); return row; }
function renderAnnual(model,currentDate,state){
  const card=homeCard('annual','ANNUAL POSITION'); const spent=model.annual.spentAUD, budget=model.annual.budgetAUD;
  if(!(Number(budget)>0)){ card.append(node('span','home-card-label','ANNUAL BUDGET NEEDS SETUP'),node('strong','home-ref-value home-ref-value-lg','—'),node('small','home-budget-note','Set the Annual Budget in Settings.')); return card; }
  const date=new Date(`${currentDate}T00:00:00Z`); const y=date.getUTCFullYear(), month=date.getUTCMonth()+1, day=date.getUTCDate();
  const start=new Date(Date.UTC(y,0,1)); const elapsed=Math.max(1,Math.floor((date-start)/86400000)+1); const days=(Date.UTC(y+1,0,1)-Date.UTC(y,0,1))/86400000;
  const pace=budget*(elapsed/days), under=pace-spent, projected=spent/elapsed*days, projectedDelta=budget-projected;
  const monthlyBudget=budget/12;
  const mtd=annualPeriodSpent(state,iso(y,month,1),iso(y,month,day));
  const prev=month===1?{y:y-1,m:12}:{y,m:month-1}; const prevSpend=annualPeriodSpent(state,iso(prev.y,prev.m,1),iso(prev.y,prev.m,daysInMonth(prev.y,prev.m)));
  card.append(node('span','home-card-label',under>=0?'UNDER YEAR-TO-DATE PACE':'OVER YEAR-TO-DATE PACE'),node('strong','home-ref-value home-ref-value-lg',formatMoney(Math.abs(under),'AUD')));
  const deltas=node('div','home-annual-deltas'); deltas.append(annualDeltaRow('THIS MONTH · MTD',monthlyBudget-mtd),annualDeltaRow('LAST MONTH',monthlyBudget-prevSpend),annualDeltaRow('PROJECTED YEAR-END',projectedDelta)); card.append(deltas);
  const lower=node('div','home-annual-progress'); lower.append(progressLine('YEAR ELAPSED',elapsed/days*100,'year-elapsed'),progressLine('SPEND VS PACE',pace?spent/pace*100:0,'spend-pace')); card.append(lower); return card;
}

function compactAlerts(model,navigate){
  const panel=node('section','home-mini-panel home-mini-alerts'); const head=node('div','home-mini-head'); const title=node('h2','','Alerts'); if(model.alerts.length) title.append(node('span','home-alert-count',String(model.alerts.length))); head.append(node('span','home-mini-diamond','◆'),title); panel.append(head);
  const list=node('div','home-mini-list'); if(!model.alerts.length) list.append(node('p','home-mini-empty','No alerts'));
  model.alerts.forEach((alert,index)=>{ const item=node(alert.target?.screen?'button':'article',`home-mini-row home-alert-row home-alert-priority-${alert.priority}${index>=3?' home-mini-extra':''}`); if(item.tagName==='BUTTON'){item.type='button';item.setAttribute('aria-label',['Open alert',alert.title,alert.message,alert.displayDueDate].filter(Boolean).join(' · '));item.addEventListener('click',()=>navigate(alert.target.screen,alert.target.collection&&alert.target.id?{collection:alert.target.collection,id:alert.target.id}:null));} item.append(node('span','home-alert-dot',''),node('strong','',alert.message||alert.title)); list.append(item); });
  if(model.alerts.length>3) list.append(node('div','home-mini-more',`+${model.alerts.length-3} more · tap Alerts to view all`)); panel.append(list); return panel;
}
function compactUpcoming(model,navigate){
  const panel=node('section','home-mini-panel home-mini-upcoming'); const head=node('div','home-mini-head'); head.append(node('span','home-mini-diamond','◆'),node('h2','','Upcoming Events')); panel.append(head); const list=node('div','home-mini-list');
  if(!model.upcomingEvents.length) list.append(node('p','home-mini-empty','No upcoming events'));
  model.upcomingEvents.forEach((event,index)=>{ const d=eventDateParts(event.displayDate); const item=node('button',`home-mini-row home-event-row${index>=3?' home-mini-extra':''}`); item.type='button'; const badge=node('span','home-date-badge'); badge.append(node('strong','',d.day),node('small','',d.month)); const copy=node('span','home-event-copy'); const typeLabel=upcomingEventTypeLabel(event); copy.append(node('strong','',event.title),node('small','',[event.displayDate,event.displayTime,typeLabel].filter(Boolean).join(' · '))); item.append(badge,copy); item.setAttribute('aria-label',['Open upcoming event',event.title,event.displayDate,event.displayTime,typeLabel].filter(Boolean).join(' · ')); item.addEventListener('click',()=>navigate(event.kind==='reservation'?'reservations':'calendar',{collection:event.kind==='reservation'?'reservations':'calendarEvents',id:event.sourceId})); list.append(item); });
  if(model.upcomingEvents.length>3) list.append(node('div','home-mini-more',`+${model.upcomingEvents.length-3} more · tap Upcoming Events to view all`)); panel.append(list); return panel;
}
function compactSchengen(model){
  const panel=node('section','home-mini-panel home-mini-schengen'); const head=node('div','home-mini-head'); head.append(node('span','home-mini-diamond','◆'),node('h2','','Schengen Status')); panel.append(head);
  const content=node('div','home-schengen-content');
  const used=Number(model.schengen.daysUsed)||0, remaining=Number(model.schengen.daysRemaining)||0, total=Math.max(90,used+remaining||90);
  const body=node('div','home-schengen-body');
  const ring=node('div','home-schengen-ring'); ring.style.setProperty('--schengen-used',pct(used/total*100));
  const hasSchengenCounts=model.schengen.daysUsed!=null&&model.schengen.daysRemaining!=null;
  if(hasSchengenCounts){ring.setAttribute('role','progressbar');ring.setAttribute('aria-label','Schengen allowance used');ring.setAttribute('aria-valuemin','0');ring.setAttribute('aria-valuemax',String(total));ring.setAttribute('aria-valuenow',String(Math.max(0,Math.min(total,used))));ring.setAttribute('aria-valuetext',`${used} days used · ${remaining} days remaining of ${total}`);}else{ring.setAttribute('role','img');ring.setAttribute('aria-label','Schengen allowance · Not checked');}
  ring.append(node('strong','',model.schengen.daysRemaining!=null?String(model.schengen.daysRemaining):'—'),node('span','','DAYS LEFT'),node('small','',`OF ${total}`));
  const meta=node('div','home-schengen-metrics');
  const u=node('div');u.append(node('strong','',String(model.schengen.daysUsed??'—')),node('span','','USED'));
  const l=node('div');l.append(node('strong','',String(model.schengen.daysRemaining??'—')),node('span','','LEFT'));
  const must=node('div','home-schengen-must-leave'); must.append(node('span','','MUST LEAVE BY'),node('strong','',model.schengen.mustLeaveByDate?formatAUDate(model.schengen.mustLeaveByDate):'—'));
  meta.append(u,l,must); body.append(ring,meta); content.append(body);
  const dates=node('div','home-schengen-dates');
  const entry=node('div'); entry.append(node('span','','ENTRY'),node('strong','',model.schengen.entryDate?formatAUDate(model.schengen.entryDate):'—'));
  const exit=node('div'); exit.append(node('span','','EXIT'),node('strong','',model.schengen.plannedExitDate?formatAUDate(model.schengen.plannedExitDate):'—'));
  dates.append(entry,exit); content.append(dates);
  const status=node('div',`home-schengen-status schengen-${model.schengen.status}`,(model.schengen.status==='allowed'?'SAFE':model.schengen.status==='not-allowed'?'NOT ALLOWED':'NOT CHECKED')); content.append(status);
  panel.append(content); return panel;
}
function compactTimeline(state,currentDate,navigate){
  const panel=node('section','home-mini-panel home-mini-timeline'); const head=node('div','home-mini-head'); head.append(node('span','home-mini-diamond','◆'),node('h2','','Trip Timeline')); panel.append(head);
  const entries=[...(state.itinerary||[])].filter(e=>String(e.endDate)>=String(currentDate)).sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate))).slice(0,3); const list=node('div','home-mini-list');
  if(!entries.length) list.append(node('p','home-mini-empty','No entries yet'));
  for(const e of entries){ const row=node('button','home-mini-row home-timeline-row'); row.type='button'; const icon=node('span','home-timeline-icon',e.travelType==='cruise'?'🚢':e.travelType==='motorhome'?'🚐':'⌁'); const copy=node('span','home-timeline-copy'); copy.append(node('strong','',e.name),node('small','',`${formatAUDate(e.startDate)} – ${formatAUDate(e.endDate)}`)); const status=String(e.startDate)<=String(currentDate)&&String(e.endDate)>=String(currentDate)?'In progress':'Upcoming'; row.append(icon,copy,node('span',`home-timeline-status ${status==='In progress'?'is-current':''}`,status)); row.setAttribute('aria-label',`Open itinerary · ${e.name} · ${formatAUDate(e.startDate)} – ${formatAUDate(e.endDate)} · ${status}`); row.addEventListener('click',()=>navigate('itinerary',{collection:'itinerary',id:e.id})); list.append(row); }
  panel.append(list); return panel;
}

function renderSearchResults(model,navigate){ const wrap=node('div','home-search-results'); if(!model.searchResults.length){wrap.append(node('p','home-search-empty','No matching results'));return wrap;} for(const result of model.searchResults){ const button=node('button','home-search-result'); button.type='button'; const copy=node('span','home-search-result-copy'); copy.append(node('strong','',result.title),node('small','',[result.screenLabel,result.dateContext].filter(Boolean).join(' · '))); button.append(copy); button.setAttribute('aria-label',['Open search result',result.title,result.screenLabel,result.dateContext].filter(Boolean).join(' · ')); button.addEventListener('click',()=>navigate(COLLECTION_TO_SCREEN[result.collection]||'home',{collection:result.collection,id:result.id})); wrap.append(button); } return wrap; }

export function renderHomeScreen({stateService,currentDate,navigate}){
  const main=node('main','screen-root home-screen'); main.dataset.screen='home'; let query='';
  function render(){ const state=stateService.snapshot(); const model=buildHomeViewModel(state,currentDate,{searchQuery:query}); main.replaceChildren();
    main.append(renderHero(model,state,main));
    const daily=renderDailyBudget(model), destination=renderDestinationBudget(model), annual=renderAnnual(model,currentDate,state);
    const stats=node('section','home-ref-stats'); stats.append(daily,destination,annual); main.append(stats);
    makeExpandableCard(daily,{host:main,title:'Daily Budget',tone:'blue'});
    makeExpandableCard(destination,{host:main,title:'Destination Budget',tone:'teal'});
    makeExpandableCard(annual,{host:main,title:'Annual Position',tone:'magenta'});
    const upcoming=compactUpcoming(model,navigate), alerts=compactAlerts(model,navigate), schengen=compactSchengen(model), timeline=compactTimeline(state,currentDate,navigate);
    const minis=node('section','home-ref-minis'); minis.append(upcoming,alerts,schengen,timeline); main.append(minis);
    makeExpandableCard(upcoming,{host:main,title:'Upcoming Events',tone:'blue'});
    makeExpandableCard(alerts,{host:main,title:'Alerts',tone:'orange'});
    makeExpandableCard(schengen,{host:main,title:'Schengen Status',tone:'teal'});
    makeExpandableCard(timeline,{host:main,title:'Trip Timeline',tone:'violet'});
    const search=document.createElement('input'); search.type='search'; search.className='home-ref-search'; search.placeholder='Search destinations, reservations, notes and more'; search.value=query; search.setAttribute('aria-label','Global search'); main.append(search);
    if(query.trim()){ const results=node('section','home-search-overlay'); results.append(renderSearchResults(model,navigate)); main.append(results); }
    search.addEventListener('input',e=>{const caret=e.target.selectionStart??e.target.value.length;const selectionEnd=e.target.selectionEnd??caret;query=e.target.value;render();const next=main.querySelector('.home-ref-search');next?.focus();next?.setSelectionRange(Math.min(caret,next.value.length),Math.min(selectionEnd,next.value.length));});
  }
  render(); return main;
}
