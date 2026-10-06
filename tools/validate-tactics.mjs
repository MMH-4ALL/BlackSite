// Reuse the actual game fixture/GLBs and its entire legacy regression baseline.
import './validate.mjs';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {normalizeRules,matchComplete,switchBeforeRound} from '../match-rules.js';
import {roundReward,awardRound,prepareBotEquipment,buyRecommendation} from '../economy.js';
import {CombatFeedback,recapText,feedbackSound,decoyReport} from '../combat-feedback.js';
const g=window.__game,{state,player}=g,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
g.weaponAudio.unlock=async()=>{};g.environmentAudio.unlock=async()=>{};

for(const firstTo of [2,4,7,10])for(const overtime of [false,true]){
 const rules=normalizeRules({firstTo,overtime}),s={rules,wins:firstTo,losses:firstTo-1,roundResults:[],sidesSwitched:false};
 assert.equal(matchComplete(s),!overtime);s.losses=firstTo-2;assert.equal(matchComplete(s),true);
 s.wins=firstTo+3;s.losses=firstTo+2;assert.equal(matchComplete(s),true,'bounded overtime decider');
 s.roundResults=Array.from({length:firstTo-1},()=>({}));assert.ok(switchBeforeRound(s),'halftime follows configured limit');
 s.sidesSwitched=true;s.wins=firstTo-1;s.losses=firstTo-1;s.roundResults=Array.from({length:(firstTo-1)*2},()=>({}));assert.equal(switchBeforeRound(s),overtime);
}
assert.equal(normalizeRules({matchMode:'quick',firstTo:10,overtime:true}).firstTo,2);
assert.equal(normalizeRules({firstTo:NaN}).firstTo,4);
assert.deepEqual([0,1,2,3,4,99].map(n=>roundReward(false,n)),[1900,2400,2900,3400,3900,3900]);
const bank={money:0,lossStreak:0,roster:[{team:'ally',money:0},{team:'enemy',money:0}]};
awardRound(bank,false);awardRound(bank,false);assert.equal(bank.money,4300);assert.equal(bank.roster[0].money,4300);assert.equal(bank.roster[1].money,6000);awardRound(bank,true);assert.equal(bank.lossStreak,0);
assert.equal(prepareBotEquipment({owned:false,money:1900}).weapon,'pistol');const rebuy=prepareBotEquipment({owned:false,money:4500});assert.equal(rebuy.weapon,'ak47');assert.equal(rebuy.money,1900);
assert.equal(buyRecommendation({owned:true,money:700,smoke:1,flash:1},{armor:0}).item,'armor');
const feedback=new CombatFeedback();for(let i=0;i<40;i++)feedback.damage(5,{name:'WARDEN',weapon:'ak47',zone:i%2?'head':'body',distance:17,pos:V(1,0,0)},{pos:V()});assert.equal(feedback.events.length,24);assert.equal(feedback.arrows.length,4);const recap=feedback.killed(feedback.events.at(-1));assert.equal(recap.hits,24);assert.ok(recapText(recap,g.WEAPONS).includes('17m'));feedback.update(2);assert.equal(feedback.arrows.length,0);
console.log('PASS: every match length, capped win-by-two overtime, halftime/pair switching, quick mode, loss streaks, bot rebuy/fallback, advice and bounded factual death recap.');
const nodes=[],frequencies=[];let buffers=0;const node=()=>{const n={connect(){},disconnect(){this.disconnected=true;},start(){},stop(){},frequency:{setValueAtTime(f){frequencies.push(f);},exponentialRampToValueAtTime(){}},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},pan:{}};nodes.push(n);return n;};
const context={currentTime:0,destination:{},createOscillator:node,createGain:node,createBufferSource:node,createStereoPanner:node,createBuffer(c,n){buffers++;const data=new Float32Array(n);return {getChannelData:()=>data};}};
feedbackSound(context,'head',.5);feedbackSound(context,'kill',.5);assert.deepEqual(frequencies,[1280,1760,460,690]);decoyReport(context,.2);decoyReport(context,.2);assert.equal(buffers,1);for(const n of nodes)if(n.onended)n.onended();assert.ok(nodes.every(n=>n.disconnected));assert.doesNotThrow(()=>feedbackSound({createOscillator(){throw Error('audio unavailable');}},'head',.5));
console.log('PASS: distinct original cue pitches, cached synthesized decoy report, explicit audio-node disconnection and optional-audio failure.');

g.returnMenu();g.settings.map='helix';g.settings.botCount=6;g.settings.allyCount=2;document.getElementById('side').value='attack';document.getElementById('difficulty').value='normal';g.startMatch();state.phase='live';state.graceRemaining=2;
assert.ok(g.spawnProtected(player));const health=player.health;g.hurt(25,{name:'TEST'});assert.equal(player.health,health);player.pos.x+=3.1;assert.equal(g.spawnProtected(player),false);player.pos.copy(player.spawn);state.cooldown=0;g.shoot();assert.equal(g.spawnProtected(player),false,'firing breaks protection');state.graceRemaining=0;
g.combatFeedback.reset();player.health=40;g.hurt(20,{source:state.bots[0],weapon:'ak47',zone:'body',distance:12,pos:state.bots[0].pos});g.hurt(25,{source:state.bots[0],weapon:'ak47',zone:'head',distance:12,pos:state.bots[0].pos});assert.ok(state.damageRecap);assert.equal(state.damageRecap.hits,2);assert.equal(state.damageRecap.locations.head,1);assert.equal(state.damageRecap.locations.body,1);
g.nextRound();state.money=5000;assert.ok(g.buyItem('decoy'));assert.ok(g.buyItem('incendiary'));assert.equal(state.decoy,1);assert.equal(state.incendiary,1);assert.equal(state.money,4400);state.phase='live';g.utility('decoy');g.utility('incendiary');assert.equal(g.tacticalUtilities.decoys.length,1);assert.equal(g.tacticalUtilities.fires.length,1);assert.equal(state.decoy,0);assert.equal(state.incendiary,0);g.tacticalUtilities.clear();

const u=g.tacticalUtilities;state.phase='live';player.health=100;const enemy=state.bots.find(b=>b.team==='enemy'),ally=state.bots.find(b=>b.team==='ally');enemy.pos.set(15,0,22);ally.pos.copy(enemy.pos);const fire=u.fire(enemy.pos,'ally','player');const actors=[{pos:enemy.pos,team:'enemy',alive:true,bot:enemy},{pos:ally.pos,team:'ally',alive:true,bot:ally}];u.update(.2,actors,[]);assert.equal(enemy.hp,94);assert.equal(ally.hp,100,'fire does not damage allies');assert.equal(u.affects(fire,V(15,2,22),'enemy'),false,'no damage through floors');assert.ok(u.hazard(enemy.pos,'enemy'));assert.equal(u.hazard(enemy.pos,'ally'),false);assert.equal(u.extinguish([{pos:fire.pos.clone(),radius:3.2,life:14}]),1);assert.equal(u.fires.length,0);
// The closed map door also blocks fire, not just bullets.
const door=g.doors[0],center=door.group.position.clone();const walled=u.fire(center.clone().add(V(0,0,-.6)),'ally','player');assert.equal(u.affects(walled,center.clone().add(V(0,0,.6)),'enemy'),false);u.clear();
u.fire(g.siteA,'ally','player');const route=g.pathTo(g.spawnPoint('defend'),g.siteA,'enemy');assert.ok(route.length>0);assert.ok(route.every(p=>!u.hazard(p,'enemy')),'actual grid route avoids enemy fire');u.clear();
for(const b of state.bots){b.visibleTarget=false;b.memory=0;}enemy.pos.set(14,0,23);const decoy=u.decoy(V(14,0,21));u.update(.04,[],[]);assert.ok(enemy.noiseTime>0);const before=enemy.noiseTime;u.update(11,[],[]);assert.equal(u.decoys.length,0);assert.ok(before<=5);
// Geometry/visual caps are enforced even when development hooks bypass inventory.
for(let i=0;i<9;i++){u.fire(V(i,0,23));u.decoy(V(i,0,23));}assert.equal(u.fires.length,3);assert.equal(u.decoys.length,3);u.clear();
console.log('PASS: spawn shield boundaries/breaking, actual damage recap, new shop/throw paths, ally-safe/height-safe/wall-safe fire, smoke extinguishing, decoy AI memory and bounded resource caps.');

for(const map of Object.keys(g.MAPS)){
 g.returnMenu();g.settings.map=map;g.startMatch();state.phase='live';const f=g.mapFeatures;assert.ok(f);assert.ok(g.canStand(f.group.position.x,f.group.position.z,.43,f.group.position.y));player.pos.copy(f.group.position);assert.ok(f.activate(player.pos,g.toggleDoor,[]));assert.equal(f.activate(player.pos,g.toggleDoor,[]),false,'switch cooldown');f.update(.04,g.toggleDoor,[]);
 if(map==='bastion'||map==='zero')assert.ok(g.doors.every(d=>d.open));if(map==='ironwood')assert.ok(g.destructibles.filter(d=>d.lamp).every(d=>d.mesh.material.emissiveIntensity===0));g.updateDoors(g.doors,1,g.hitWalls,[]);f.update(30,g.toggleDoor,[]);assert.equal(f.remaining,0);if(map==='bastion'||map==='zero')assert.ok(g.doors.every(d=>!d.open));f.reset();assert.equal(f.cooldown,0);
}
console.log('PASS: all four original map switches, reachable controls, cooldowns, alarm/relay stimuli, timed doors, floodlight reset and unchanged map navigation.');

g.returnMenu();const careerBefore=JSON.stringify(g.career.data);g.startPractice();assert.equal(state.mode,'range');assert.equal(state.bots.length,0);assert.equal(g.practiceRange.targets.length,5);assert.equal(g.groundHeight(0,14),0,'range does not inherit the map ramp');assert.equal(g.canStand(0,22),true);const r=g.practiceRange,target=r.targets[0];
g.equip('rifle');player.pos.set(target.x,0,22);player.yaw=0;player.pitch=0;g.updatePlayer(0);state.cooldown=0;g.shoot();assert.equal(r.stats.shots,1);assert.equal(r.stats.headshots,1);assert.equal(r.stats.eliminations,1);r.update(1);assert.ok(target.active);
const moving=r.targets.find(t=>t.moving),x=moving.group.position.x;r.update(.4);assert.notEqual(moving.group.position.x,x);r.moving=false;r.update(.4);assert.equal(moving.group.position.x,moving.x);
for(const weapon of Object.keys(g.WEAPONS)){g.equip(weapon);assert.equal(state.weapon,weapon);const a=state.ammo[weapon];a.mag=0;a.reserve=0;g.reload();assert.ok(state.reload>0);assert.equal(a.reserve,g.WEAPONS[weapon].reserve);g.updateWeaponPresentation(.04);}
g.resetPractice();assert.deepEqual(r.stats,{shots:0,hits:0,headshots:0,eliminations:0});assert.ok(g.effects.length===0);g.returnMenu();assert.equal(JSON.stringify(g.career.data),careerBefore,'practice cannot change career');assert.equal(state.mode,'match');assert.equal(g.practiceRange,null);assert.ok(g.mapFeatures);g.startMatch();assert.equal(state.bots.length,8,'competitive play survives range transitions');
console.log('PASS: real practice headshot raycast, five targets/two movers, stationary option, all eight weapons/reloads, infinite reserve, reset/disposal, no progression farming and return to competitive play.');

// CPU simulation benchmark is not a Chromebook hardware FPS claim.
for(const map of Object.keys(g.MAPS)){
 g.returnMenu();g.settings.map=map;g.settings.botCount=16;g.settings.allyCount=0;g.startMatch();state.phase='live';state.time=90;player.health=10000;
 const start=performance.now();for(let i=0;i<500&&state.phase==='live';i++){state.t+=.02;g.updateBots(.02);g.updateBotPresentation(.02);}const elapsed=performance.now()-start;
 g.scene.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));assert.ok(o.quaternion.toArray().every(Number.isFinite));});console.log('SIMULATION_16_BOTS '+map+' / '+elapsed.toFixed(1)+'ms for up to 500 steps');
}
g.returnMenu();console.log('PASS: 16-bot CPU/animation simulation on all four maps, finite transforms and complete legacy regression baseline.');
