import { WEAPONS, PRIMARY_KEYS } from './weapons.js';
const $=id=>document.getElementById(id), defaults={sensitivity:1,volume:.45,fov:78,crosshair:6,quality:'standard',primary:'rifle'};
export const settings={...defaults};
try {
  const saved=JSON.parse(localStorage.getItem('blacksite.settings.v1')||'{}');
  for(const [key,min,max] of [['sensitivity',.4,2.4],['volume',0,1],['fov',68,100],['crosshair',3,12]])if(Number.isFinite(saved[key]))settings[key]=Math.min(max,Math.max(min,saved[key]));
  if(['standard','low'].includes(saved.quality))settings.quality=saved.quality;
  if(PRIMARY_KEYS.includes(saved.primary))settings.primary=saved.primary;
}catch{/* Browsing and play also work when storage is unavailable. */}
let inspected=settings.primary;
const money=value=>'$'+value.toLocaleString('en-US');
function saveSettings(){try{localStorage.setItem('blacksite.settings.v1',JSON.stringify(settings));$('settingsSaved').textContent='Preferences saved on this browser.';}catch{$('settingsSaved').textContent='Preferences apply for this session.';}}
function syncSettings(){
  document.querySelectorAll('[data-setting]').forEach(input=>input.value=settings[input.dataset.setting]);
  document.querySelectorAll('[data-output]').forEach(output=>{const k=output.dataset.output;output.textContent=k==='volume'?Math.round(settings[k]*100)+'%':k==='sensitivity'?settings[k].toFixed(1):settings[k]+(k==='fov'?'°':' px');});
  document.documentElement.style.setProperty('--crosshair',settings.crosshair+'px');
  const w=WEAPONS[settings.primary];$('startingName').innerHTML=w.name+' <em>+ P-9</em>';$('startingImage').src='assets/ui/'+w.image+'.svg';
}
export function showView(view){
  if(!['deploy','armory','manual','settings'].includes(view))view='deploy';
  document.querySelectorAll('.menu-view').forEach(section=>section.hidden=section.id!=='view-'+view);
  document.querySelectorAll('.nav-link').forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.querySelector('.menu-body').scrollTop=0;
}
function inspectWeapon(key){
  inspected=key;const w=WEAPONS[key];
  document.querySelectorAll('.armory-item').forEach(button=>{button.classList.toggle('selected',button.dataset.weapon===key);button.setAttribute('aria-pressed',String(button.dataset.weapon===key));});
  $('inspectCategory').textContent=w.category;$('inspectLabel').textContent=w.label;$('inspectName').textContent=w.name;$('inspectDescription').textContent=w.description;$('inspectStrength').textContent=w.strength;
  $('inspectImage').src='assets/ui/'+w.image+'.svg';$('inspectImage').alt=w.name+' modified model preview';
  $('inspectStats').innerHTML=[['MAGAZINE',w.capacity+' RDS'],['RELOAD',w.reload.toFixed(1)+' SEC'],['FIRE RATE',Math.round(60/w.interval)+' RPM'],['REBUY',w.price?money(w.price):'ISSUED']].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  $('inspectBars').innerHTML=['POWER','FIRE RATE','PRECISION'].map((label,i)=>`<div><small>${label}</small><b><i style="width:${w.bars[i]}%"></i></b></div>`).join('');
  const equipped=key===settings.primary;$('useWeapon').disabled=w.slot==='secondary'||equipped;$('useWeapon').innerHTML=w.slot==='secondary'?'ALWAYS EQUIPPED':equipped?'STARTING PRIMARY SELECTED <span>✓</span>':'USE AS STARTING PRIMARY <span>↗</span>';
}
$('armoryList').innerHTML=Object.entries(WEAPONS).map(([k,w])=>`<button class="armory-item" data-weapon="${k}" aria-pressed="false"><strong>${w.name}</strong><small>${w.category}</small><img src="assets/ui/${w.image}.svg" alt=""><em>${w.slot==='secondary'?'ALWAYS CARRIED':'PRIMARY / '+w.capacity+' ROUNDS'}</em></button>`).join('');
$('shopWeapons').innerHTML=PRIMARY_KEYS.map(k=>{const w=WEAPONS[k];return `<button class="shop-weapon" data-buy="${k}"><small>${w.category} / ${w.capacity} ROUNDS</small><img src="assets/ui/${w.image}.svg" alt=""><strong>${w.name}</strong><b>${money(w.price)}</b><em data-status="${k}">AVAILABLE</em></button>`;}).join('');
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>showView(button.dataset.view));
document.querySelector('.brand').onclick=e=>{e.preventDefault();showView('deploy');};
document.querySelectorAll('[data-weapon]').forEach(button=>button.onclick=()=>inspectWeapon(button.dataset.weapon));
$('useWeapon').onclick=()=>{if(WEAPONS[inspected].slot!=='primary')return;settings.primary=inspected;saveSettings();syncSettings();inspectWeapon(inspected);};
document.querySelectorAll('[data-setting]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.setting;settings[key]=key==='quality'?input.value:Number(input.value);syncSettings();saveSettings();window.dispatchEvent(new CustomEvent('blacksite:settings'));}));
$('resetSettings').onclick=()=>{Object.assign(settings,defaults);syncSettings();saveSettings();inspectWeapon(settings.primary);window.dispatchEvent(new CustomEvent('blacksite:settings'));};
$('difficulty').onchange=()=>{$('difficultyInfo').textContent={easy:'Slower reactions and wider shots. Learn the angles.',normal:'Balanced reactions and controlled bursts. Stay sharp.',hard:'Fast reactions, tight shots, and longer pursuit. No easy fights.'}[$('difficulty').value];};
syncSettings();inspectWeapon(inspected);

export function refreshShop(state,player,message){
  $('shopCash').textContent=money(state.money);
  document.querySelectorAll('[data-buy]').forEach(button=>{
    const k=button.dataset.buy,w=WEAPONS[k],cost=w?.price??{armor:650,smoke:300,flash:200}[k];
    const full=w?state.owned&&state.primary===k:k==='armor'?player.armor>=100:state[k]>=2;
    button.disabled=full||state.money<cost||state.phase!=='buy';button.classList.toggle('equipped',!!full);
    const status=button.querySelector('[data-status]');if(status)status.textContent=full?(w?'EQUIPPED':k==='armor'?'EQUIPPED':'AT CAPACITY'):state.money<cost?'INSUFFICIENT CREDITS':w?'AVAILABLE':(k==='armor'?Math.ceil(player.armor)+' / 100':state[k]+' / 2');
  });
  if(message)$('shopMessage').textContent=message;
}
export function showReport(state,win,reason){
  const complete=state.wins===4||state.losses===4,base=state.roundBaseline||{kills:0,headshots:0,shotsFired:0,hits:0};
  $('result').classList.toggle('defeat',!win);$('resultLabel').textContent=complete?'OPERATION COMPLETE':'ROUND '+String(state.round).padStart(2,'0')+' / COMPLETE';
  $('resultTitle').innerHTML=(complete?(win?'OPERATION WON':'OPERATION LOST'):(win?'SECTOR SECURED':'SECTOR LOST'))+'<span>.</span>';
  $('resultDetail').textContent=reason;$('resultYou').textContent=state.wins;$('resultBot').textContent=state.losses;
  const shots=state.shotsFired-base.shotsFired,accuracy=shots?Math.round((state.hits-base.hits)/shots*100)+'%':'—';
  $('resultStats').innerHTML=[['ELIMINATIONS',state.kills-base.kills],['HEADSHOTS',state.headshots-base.headshots],['ACCURACY',accuracy],['ROUND REWARD',money(win?3000:1900)]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('');
  $('next').innerHTML=(complete?'DEPLOY AGAIN':'NEXT ROUND')+' <span>↗</span>';
}
export function showCompatibility(message){$('compatibility').hidden=false;$('compatibility').textContent=message;$('start').disabled=true;$('start').textContent='WEBGL UNAVAILABLE';$('unsupported').hidden=true;}

export function previewInterface(view){
  document.body.classList.add('ui-preview');$('start').textContent='INTERFACE PREVIEW';
  if(['deploy','armory','manual','settings'].includes(view)){showView(view);return;}
  if(!['buy','pause','result','scoreboard','hud'].includes(view)){showView('deploy');return;}
  document.body.classList.add('preview-scene');$('menu').hidden=true;$('hud').hidden=false;
  $('scoreYou').textContent='2';$('scoreBot').textContent='1';$('phase').textContent='ROUND 4';$('timer').textContent='1:09';$('objective').textContent='PLANT AT A OR B';$('health').textContent='87';$('healthBar').style.width='87%';$('armor').textContent='65 ARMOR';$('cash').textContent='$5,800';$('roundPips').innerHTML='<i class="won"></i><i class="lost"></i><i class="won"></i><i></i>';
  if(view!=='hud')$(view).hidden=false;
  if(view==='buy'){refreshShop({money:5800,primary:'rifle',owned:true,phase:'buy',smoke:1,flash:1},{armor:65},'INTERFACE PREVIEW / purchases are disabled.');document.querySelectorAll('[data-buy]').forEach(b=>b.disabled=true);$('closeBuy').onclick=()=>{$('buy').hidden=true;};}
  if(view==='pause'){$('resume').onclick=()=>{$('pause').hidden=true;};$('quit').onclick=()=>{location.href=location.pathname+'?preview=deploy';};}
  if(view==='result'){showReport({round:4,wins:3,losses:1,kills:3,headshots:2,shotsFired:12,hits:4},true,'All hostiles eliminated.');$('next').onclick=()=>{$('result').hidden=true;};$('resultQuit').onclick=()=>{location.href=location.pathname+'?preview=deploy';};}
  if(view==='scoreboard'){$('reportScore').textContent='2 — 1';$('scoreRows').innerHTML='<div><span>YOU / OPERATOR</span><span>5 K / 1 D</span></div><div><span>WARDEN</span><span>ACTIVE / 100 HP</span></div><div class="dead"><span>SENTRY</span><span>ELIMINATED</span></div><div><span>NOMAD</span><span>ACTIVE / 100 HP</span></div>';}
}
