import {career,levelProgress,accuracy,favorite} from './progression.js?v=0.8.0';
import {challengeProgress,CHALLENGES} from './challenges.js?v=0.8.0';
import {WEAPONS} from './weapons.js?v=0.8.0';
import {MAPS} from './maps.js?v=0.8.0';
import {SKINS,skinChoices,skinUnlocked} from './skins.js?v=0.8.0';
const $=id=>document.getElementById(id),money=value=>'$'+value.toLocaleString('en-US');
const duration=seconds=>Math.floor(seconds/3600)+'H '+Math.floor(seconds%3600/60)+'M';
export function refreshSkins(weapon){
 const selected=skinChoices[weapon]||'default';
 $('skinSelect').innerHTML=SKINS.map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''} ${skinUnlocked(s,career.data)?'':'disabled'}>${s.name}${skinUnlocked(s,career.data)?'':s.badge?' / BLACKSITE BADGE':' / LEVEL '+s.level}</option>`).join('');
 $('skinStatus').textContent='Cosmetic finish appears on your equipped weapon. Handling and damage stay identical.';
 $('skinSwatches').innerHTML=SKINS.map(s=>`<span title="${s.name}" style="--swatch:rgb(${s.color.map(v=>Math.round(Math.pow(v,1/2.2)*255)).join(',')})"></span>`).join('');
}
export function refreshCareer(){
 const p=career.data,level=levelProgress(p.xp),weapon=favorite(p,'weapon'),map=favorite(p,'map'),badge=CHALLENGES.find(c=>c.id===p.emblem&&p.badges.includes(c.id));
 $('careerLevel').textContent=level.level;$('careerXP').textContent=p.xp.toLocaleString()+' XP';$('careerNext').textContent=(level.end-p.xp).toLocaleString()+' XP TO LEVEL '+(level.level+1);$('careerXPBar').style.width=level.percent+'%';$('careerProgress').setAttribute('aria-valuenow',Math.round(level.percent));$('careerBadge').textContent=badge?.name||'RECRUIT';
 $('careerStorage').textContent=career.sessionOnly?'Progress is available for this session because browser storage is unavailable.':'Progress stays on this browser. Every weapon is available from level one.';
 $('careerMessage').textContent=p.stats.matches?'Cosmetic unlocks reward your service. No gameplay upgrades.':'Deploy to record your first operation.';
 const stats=[['MATCHES',p.stats.matches],['WINS / LOSSES',p.stats.wins+' / '+p.stats.losses],['WIN RATE',accuracy(p.stats.wins,p.stats.matches)+'%'],['ROUNDS WON',p.stats.roundWins],['ELIMINATIONS',p.stats.kills],['DEATHS',p.stats.deaths],['HEADSHOTS',p.stats.headshots],['ACCURACY',accuracy(p.stats.hits,p.stats.shots)+'%'],['PLANTS',p.stats.plants],['DEFUSES',p.stats.defuses],['FAVORITE WEAPON',weapon?WEAPONS[weapon].name:'NONE YET'],['MOST PLAYED MAP',map?MAPS[map].name:'NONE YET'],['HARD WINS',p.difficultyWins.hard],['TOTAL PLAYTIME',duration(p.stats.time)],['SHOTS / HITS',p.stats.shots+' / '+p.stats.hits]];
 $('careerStats').innerHTML=stats.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
 $('emblemSelect').innerHTML=p.badges.length?p.badges.map(id=>`<option value="${id}" ${id===p.emblem?'selected':''}>${CHALLENGES.find(c=>c.id===id).name}</option>`).join(''):'<option value="">NO BADGE EARNED</option>';$('emblemSelect').disabled=!p.badges.length;
 $('badgeList').innerHTML=p.badges.length?p.badges.map(id=>`<span class="service-badge"><b>✓</b>${CHALLENGES.find(c=>c.id===id).name}</span>`).join(''):'<p>Your first earned badge will appear here.</p>';
 $('challengeList').innerHTML=challengeProgress(p).map(c=>`<article class="challenge ${c.complete?'completed':''}"><div><span class="challenge-status">${c.complete?'✓ COMPLETE':'IN PROGRESS'}</span><strong>${c.name}</strong><p>${c.description}</p></div><span class="challenge-count">${c.current} / ${c.target}</span><progress value="${c.current}" max="${c.target}" aria-label="${c.name} progress"></progress><small>BADGE + 100 XP</small></article>`).join('');
}
export function renderReport(state,win,reason){
 const complete=state.wins===4||state.losses===4,base=complete?{}:state.roundBaseline||{},delta=k=>(state[k]||0)-(base[k]||0),award=state.roundAward;
 $('result').classList.toggle('defeat',!win);$('resultLabel').textContent=complete?'OPERATION COMPLETE':'ROUND '+String(state.round).padStart(2,'0')+' / COMPLETE';$('resultTitle').innerHTML=(complete?(win?'OPERATION WON':'OPERATION LOST'):(win?'SECTOR SECURED':'SECTOR LOST'))+'<span>.</span>';$('resultDetail').textContent=reason;$('resultYou').textContent=state.wins;$('resultBot').textContent=state.losses;
 $('resultContext').textContent=[MAPS[state.map||'helix'].name.toUpperCase(),(state.side||'attack').toUpperCase(),(state.difficulty||'normal').toUpperCase(),(state.allyCount||0)+' ALLIES / '+(state.botCount||6)+' ENEMIES'].join(' · ');
 const shots=delta('shotsFired'),hits=delta('hits'),stats=[['ELIMINATIONS',delta('kills')],['DEATHS',delta('deaths')],['HEADSHOTS',delta('headshots')],['ACCURACY',shots?accuracy(hits,shots)+'%':'NO SHOTS'],['SHOTS / HITS',shots+' / '+hits],['PLANTS / DEFUSES',delta('plants')+' / '+delta('defuses')],['XP EARNED',complete?state.sessionXP||0:award?.xp||0],['ROUND REWARD',money(win?3000:1900)]];
 $('resultStats').innerHTML=stats.map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('');
 $('resultProgress').innerHTML=award?`<div class="report-level"><strong>LEVEL ${award.level.level}</strong><span>${award.level.current.toLocaleString()} / ${award.level.required.toLocaleString()} XP</span></div><div class="xp-track"><span style="width:${award.level.percent}%"></span></div>${award.unlocks.length?`<p class="unlock-line">BADGE UNLOCKED / ${award.unlocks.join(' · ')}</p>`:''}${award.level.level>award.previousLevel?`<p class="unlock-line">LEVEL UP / ${award.level.level}</p><p class="unlock-line">${SKINS.filter(s=>!s.badge&&s.level>award.previousLevel&&s.level<=award.level.level).map(s=>'FINISH UNLOCKED / '+s.name).join(' · ')}</p>`:''}${award.challengeProgress?.length?`<p>${award.challengeProgress.map(c=>c.name+' '+c.current+'/'+c.target).join(' · ')}</p>`:''}${award.bests?.length?`<p>PERSONAL BEST / ${award.bests.join(' · ')}</p>`:''}`:'';
 $('resultHistory').innerHTML=(state.roundResults||[]).map(r=>`<span class="${r.win?'won':'lost'}" title="${r.reason}"><small>R${r.round} / ${r.side.toUpperCase()}</small><strong>${r.win?'WIN':'LOSS'}</strong></span>`).join('');$('next').innerHTML=(complete?'DEPLOY AGAIN':'NEXT ROUND')+' <span>↗</span>';
}
