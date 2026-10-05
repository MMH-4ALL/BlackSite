import { WEAPONS, PRIMARY_KEYS, SECONDARY_KEYS } from './weapons.js?v=0.7.0';
import { weaponAudio } from './audio.js?v=0.7.0';
import { MAPS, mapKey, normalizeBotCount, MAX_BOTS, DEFAULT_BOTS } from './maps.js?v=0.7.0';
import {normalizeAllies,MAX_ALLIES} from './ai.js?v=0.8.0';
import {career} from './progression.js?v=0.8.0';
import {chooseSkin} from './skins.js?v=0.8.0';
import {refreshCareer,refreshSkins,renderReport} from './career-ui.js?v=0.8.0';
import {CROSSHAIR_DEFAULTS,CROSSHAIR_PRESETS,normalizeCrosshair,applyCrosshair} from './crosshair.js?v=0.8.0';
const $=id=>document.getElementById(id), defaults={...CROSSHAIR_DEFAULTS,sensitivity:1,volume:.45,fov:78,crosshair:6,quality:'standard',primary:'rifle',secondary:'pistol',map:'helix',botCount:DEFAULT_BOTS};
export const settings={...defaults};
defaults.allyCount=0;settings.allyCount=0;
try {
  const saved=JSON.parse(localStorage.getItem('blacksite.settings.v1')||'{}');
  for(const [key,min,max] of [['sensitivity',.4,2.4],['volume',0,1],['fov',68,100],['crosshair',3,12]])if(Number.isFinite(saved[key]))settings[key]=Math.min(max,Math.max(min,saved[key]));
  Object.assign(settings,normalizeCrosshair(saved));
  if(['standard','low','high'].includes(saved.quality))settings.quality=saved.quality;
  if(PRIMARY_KEYS.includes(saved.primary))settings.primary=saved.primary;
  if(SECONDARY_KEYS.includes(saved.secondary))settings.secondary=saved.secondary;
  settings.map=mapKey(saved.map);settings.botCount=normalizeBotCount(saved.botCount);settings.allyCount=normalizeAllies(saved.allyCount);
}catch{/* Browsing and play also work when storage is unavailable. */}
let inspected=settings.primary, soundRequest=0;
$('mapSelect').innerHTML=Object.values(MAPS).map(m=>`<option value="${m.id}">${m.name.toUpperCase()}</option>`).join('');
$('botCount').innerHTML=Array.from({length:MAX_BOTS},(_,i)=>`<option value="${i+1}">${i+1} ${i?'HOSTILES':'HOSTILE'}</option>`).join('');
$('allyCount').innerHTML=Array.from({length:MAX_ALLIES+1},(_,i)=>`<option value="${i}">${i} ${i===1?'ALLY':'ALLIES'}</option>`).join('');
weaponAudio.preload();
const money=value=>'$'+value.toLocaleString('en-US');
function saveSettings(){try{localStorage.setItem('blacksite.settings.v1',JSON.stringify(settings));$('settingsSaved').textContent='Preferences saved on this browser.';}catch{$('settingsSaved').textContent='Preferences apply for this session.';}}
function syncSettings(){
  weaponAudio.setVolume(settings.volume);
  document.querySelectorAll('[data-setting]').forEach(input=>{if(input.type==='checkbox')input.checked=!!settings[input.dataset.setting];else input.value=settings[input.dataset.setting];});
  document.querySelectorAll('[data-output]').forEach(output=>{const k=output.dataset.output;output.textContent=['volume','crossOpacity'].includes(k)?Math.round(settings[k]*100)+'%':k==='sensitivity'?settings[k].toFixed(1):settings[k]+(k==='fov'?'°':' px');});
  applyCrosshair(settings);
  const w=WEAPONS[settings.primary];$('startingName').innerHTML=w.name+' <em>+ '+WEAPONS[settings.secondary].name+'</em>';$('startingImage').src='assets/ui/'+w.image+'.svg?v=0.7.0';
  const m=MAPS[settings.map];$('mapTag').textContent=m.tag;$('mapName').textContent=m.name.toUpperCase();$('mapTitle').textContent=m.subtitle;$('mapTheme').textContent=m.theme.toUpperCase();$('mapDescription').textContent=m.description;$('mapNumber').textContent=m.number;$('mapPlan').textContent='SECTOR OVERVIEW / '+m.number;
  $('mapImage').src='assets/'+m.preview+'?v=0.7.0';$('mapImage').alt=m.name+' textured military environment';$('botSummary').textContent=(1+settings.allyCount)+' VS '+settings.botCount+(settings.botCount===1?' BOT':' BOTS');$('introBots').textContent=settings.allyCount+' allies. '+settings.botCount+' '+(settings.botCount===1?'hostile.':'hostiles.');
  $('manualMap').textContent='OPERATOR HANDBOOK / '+m.tag;$('pauseMap').textContent=m.name.toUpperCase();$('scoreTitle').textContent=m.name.toUpperCase();$('radarMap').textContent=m.tag+' / '+m.number;
  document.documentElement.style.setProperty('--map-preview',`url("assets/${m.preview}")`);
}
export function showView(view){
  soundRequest++;weaponAudio.stopAll();
  if(!['deploy','armory','career','challenges','manual','settings'].includes(view))view='deploy';
  document.querySelectorAll('.menu-view').forEach(section=>section.hidden=section.id!=='view-'+view);
  document.querySelectorAll('.nav-link').forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  if(view==='career'||view==='challenges')refreshCareer();document.querySelector('.menu-body').scrollTop=0;
}
function inspectWeapon(key){
  soundRequest++;weaponAudio.stopAll();$('soundStatus').textContent='Listen to this weapon’s shots and reload.';
  inspected=key;refreshSkins(key);const w=WEAPONS[key];
  document.querySelectorAll('.armory-item').forEach(button=>{button.classList.toggle('selected',button.dataset.weapon===key);button.setAttribute('aria-pressed',String(button.dataset.weapon===key));});
  $('inspectCategory').textContent=w.category;$('inspectLabel').textContent=w.label;$('inspectName').textContent=w.name;$('inspectDescription').textContent=w.description;$('inspectStrength').textContent=w.strength;
  $('inspectImage').src='assets/ui/'+w.image+'.svg?v=0.7.0';$('inspectImage').alt=w.name+' modified model preview';
  $('inspectStats').innerHTML=[['MAGAZINE',w.capacity+' RDS'],['RELOAD',w.reload.toFixed(1)+' SEC'],['FIRE RATE',Math.round(60/w.interval)+' RPM'],['REBUY',w.price?money(w.price):'ISSUED']].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  $('inspectBars').innerHTML=['POWER','FIRE RATE','PRECISION'].map((label,i)=>`<div><small>${label}</small><b><i style="width:${w.bars[i]}%"></i></b></div>`).join('');
  const slot=w.slot==='primary'?'primary':'secondary',label=slot==='primary'?'PRIMARY':'SIDEARM',equipped=key===settings[slot];$('useWeapon').disabled=equipped;$('useWeapon').innerHTML=equipped?'STARTING '+label+' SELECTED <span>✓</span>':'USE AS STARTING '+label+' <span>↗</span>';
}
$('armoryList').innerHTML=Object.entries(WEAPONS).map(([k,w])=>`<button class="armory-item" data-weapon="${k}" aria-pressed="false"><strong>${w.name}</strong><small>${w.category}</small><img src="assets/ui/${w.image}.svg?v=0.7.0" alt=""><em>${(w.slot==='secondary'?'SIDEARM':'PRIMARY')+' / '+w.capacity+' ROUNDS'}</em></button>`).join('');
for(const [id,keys] of [['shopWeapons',PRIMARY_KEYS],['shopSidearms',SECONDARY_KEYS]])$(id).innerHTML=keys.map(k=>{const w=WEAPONS[k];return `<button class="shop-weapon" data-buy="${k}"><small>${w.category} / ${w.capacity} ROUNDS</small><img src="assets/ui/${w.image}.svg?v=0.7.0" alt=""><strong>${w.name}</strong><b>${w.price?money(w.price):'FREE'}</b><em data-status="${k}">AVAILABLE</em></button>`;}).join('');
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>showView(button.dataset.view));
document.querySelector('.brand').onclick=e=>{e.preventDefault();showView('deploy');};
document.querySelectorAll('[data-weapon]').forEach(button=>button.onclick=()=>inspectWeapon(button.dataset.weapon));
$('useWeapon').onclick=()=>{settings[WEAPONS[inspected].slot==='primary'?'primary':'secondary']=inspected;saveSettings();document.querySelectorAll('[data-squad]').forEach(b=>b.onclick=()=>{const [allies,enemies]=b.dataset.squad.split(',').map(Number);settings.allyCount=normalizeAllies(allies);settings.botCount=normalizeBotCount(enemies);syncSettings();saveSettings();});
document.querySelectorAll('[data-cross-preset]').forEach(b=>b.onclick=()=>{Object.assign(settings,CROSSHAIR_PRESETS[b.dataset.crossPreset]);syncSettings();saveSettings();window.dispatchEvent(new CustomEvent('blacksite:settings'));});
$('skinSelect').onchange=()=>{chooseSkin(inspected,$('skinSelect').value,career.data);refreshSkins(inspected);};$('emblemSelect').onchange=()=>{career.selectEmblem($('emblemSelect').value);refreshCareer();};window.addEventListener('blacksite:career',()=>{refreshCareer();refreshSkins(inspected);});
syncSettings();inspectWeapon(inspected);refreshCareer();};
async function previewSound(kind){
  const request=++soundRequest,key=inspected;weaponAudio.stopAll();
  if(settings.volume===0){$('soundStatus').textContent='Sound is muted. Raise Master volume in Settings.';return;}
  $('soundStatus').textContent='Loading weapon sound…';
  try{
    await weaponAudio.unlock();if(request!==soundRequest)return;
    const played=kind==='shot'?weaponAudio.shot(key,{preview:true}):weaponAudio.reload(key,WEAPONS[key].reload,0,true);
    $('soundStatus').textContent=played?WEAPONS[key].name+' / '+(kind==='shot'?'SHOT':'RELOAD')+' PREVIEW':'This sound could not load. Refresh and try again.';
  }catch{if(request===soundRequest)$('soundStatus').textContent='Audio could not start. Try another desktop browser.';}
}
$('previewShot').onclick=()=>previewSound('shot');$('previewReload').onclick=()=>previewSound('reload');
document.querySelectorAll('[data-setting]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.setting;settings[key]=input.type==='checkbox'?input.checked:key==='map'?mapKey(input.value):key==='botCount'?normalizeBotCount(input.value):key==='allyCount'?normalizeAllies(input.value):['quality','crossShape','crossColor'].includes(key)?input.value:Number(input.value);syncSettings();saveSettings();window.dispatchEvent(new CustomEvent(key==='map'?'blacksite:map':'blacksite:settings'));}));
$('resetSettings').onclick=()=>{Object.assign(settings,defaults);syncSettings();saveSettings();inspectWeapon(settings.primary);window.dispatchEvent(new CustomEvent('blacksite:settings'));window.dispatchEvent(new CustomEvent('blacksite:map'));};
$('difficulty').onchange=()=>{$('difficultyInfo').textContent={easy:'Slower reactions and wider shots. Learn the angles.',normal:'Balanced reactions and controlled bursts. Stay sharp.',hard:'Fast reactions, tight shots, and longer pursuit. No easy fights.'}[$('difficulty').value];};
document.querySelectorAll('[data-squad]').forEach(b=>b.onclick=()=>{const [allies,enemies]=b.dataset.squad.split(',').map(Number);settings.allyCount=normalizeAllies(allies);settings.botCount=normalizeBotCount(enemies);syncSettings();saveSettings();});
document.querySelectorAll('[data-cross-preset]').forEach(b=>b.onclick=()=>{Object.assign(settings,CROSSHAIR_PRESETS[b.dataset.crossPreset]);syncSettings();saveSettings();window.dispatchEvent(new CustomEvent('blacksite:settings'));});
$('skinSelect').onchange=()=>{chooseSkin(inspected,$('skinSelect').value,career.data);refreshSkins(inspected);};$('emblemSelect').onchange=()=>{career.selectEmblem($('emblemSelect').value);refreshCareer();};window.addEventListener('blacksite:career',()=>{refreshCareer();refreshSkins(inspected);});
syncSettings();inspectWeapon(inspected);refreshCareer();

export function refreshShop(state,player,message){
  $('shopCash').textContent=money(state.money);
  document.querySelectorAll('[data-buy]').forEach(button=>{
    const k=button.dataset.buy,w=WEAPONS[k],cost=w?.price??{armor:650,smoke:300,flash:200}[k];
    const full=w?(w.slot==='primary'?state.owned&&state.primary===k:state.secondary===k):k==='armor'?player.armor>=100:state[k]>=2;
    button.disabled=full||state.money<cost||state.phase!=='buy';button.classList.toggle('equipped',!!full);
    const status=button.querySelector('[data-status]');if(status)status.textContent=full?(w?'EQUIPPED':k==='armor'?'EQUIPPED':'AT CAPACITY'):state.money<cost?'INSUFFICIENT CREDITS':w?'AVAILABLE':(k==='armor'?Math.ceil(player.armor)+' / 100':state[k]+' / 2');
  });
  if(message)$('shopMessage').textContent=message;
}
export const showReport=renderReport;
export function showCompatibility(message){$('compatibility').hidden=false;$('compatibility').textContent=message;$('start').disabled=true;$('start').textContent='WEBGL UNAVAILABLE';$('unsupported').hidden=true;}

export function previewInterface(view){
  document.body.classList.add('ui-preview');$('start').textContent='INTERFACE PREVIEW';
  if(['deploy','armory','career','challenges','manual','settings'].includes(view)){showView(view);return;}
  if(!['buy','pause','result','scoreboard','hud'].includes(view)){showView('deploy');return;}
  document.body.classList.add('preview-scene');$('menu').hidden=true;$('hud').hidden=false;
  $('hostileCount').textContent=settings.botCount;
  $('scoreYou').textContent='2';$('scoreBot').textContent='1';$('phase').textContent='ROUND 4';$('timer').textContent='1:09';$('objective').textContent='PLANT AT A OR B';$('health').textContent='87';$('healthBar').style.width='87%';$('armor').textContent='65 ARMOR';$('cash').textContent='$5,800';$('roundPips').innerHTML='<i class="won"></i><i class="lost"></i><i class="won"></i><i></i>';
  if(view!=='hud')$(view).hidden=false;
  if(view==='buy'){refreshShop({money:5800,primary:'rifle',secondary:'pistol',owned:true,phase:'buy',smoke:1,flash:1},{armor:65},'INTERFACE PREVIEW / purchases are disabled.');document.querySelectorAll('[data-buy]').forEach(b=>b.disabled=true);$('closeBuy').onclick=()=>{$('buy').hidden=true;};}
  if(view==='pause'){$('pauseRound').textContent='ROUND 4 / NORMAL';$('resume').onclick=()=>{$('pause').hidden=true;};$('quit').onclick=()=>{location.href=location.pathname+'?preview=deploy';};}
  if(view==='result'){$('scoreYou').textContent='3';$('hostileCount').textContent='0';showReport({round:4,wins:3,losses:1,kills:3,headshots:2,shotsFired:12,hits:4},true,'All hostiles eliminated.');$('next').onclick=()=>{$('result').hidden=true;};$('resultQuit').onclick=()=>{location.href=location.pathname+'?preview=deploy';};}
  if(view==='scoreboard'){$('reportScore').textContent='2 — 1';$('scoreRows').innerHTML='<div><span>YOU / OPERATOR</span><span>5 K / 1 D</span></div><div><span>WARDEN</span><span>ACTIVE / 100 HP</span></div><div class="dead"><span>SENTRY</span><span>ELIMINATED</span></div><div><span>NOMAD</span><span>ACTIVE / 100 HP</span></div>';}
}
