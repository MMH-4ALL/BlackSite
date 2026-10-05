import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { WEAPONS } from './weapons.js?v=0.7.0';
import { settings, refreshShop, showReport, showView } from './ui.js?v=0.7.0';
import { weaponAudio, SOUND_BANK } from './audio.js?v=0.7.0';
import { MAPS, mapKey, normalizeBotCount } from './maps.js?v=0.7.0';
import { loadEnvironment, textureBox, placeEnvironment } from './environment.js?v=0.7.0';
import { loadOperators, attachOperator, updateOperator, disposeOperator } from './characters.js?v=0.8.0';
import { createRoster, normalizeAllies, oppositeSide, teamAlive, botGoal } from './ai.js?v=0.8.0';

import {heightAt,reachableStep,nearestClearGoal} from './navigation.js?v=0.8.0';
import {createDoors,nearbyDoor,toggleDoor,updateDoors,openDoorForBot} from './doors.js?v=0.8.0';

import {career} from './progression.js?v=0.8.0';
import {captureStats,statDelta,weaponStats,matchSummary} from './stats.js?v=0.8.0';
import {applySkin,skinChoices,skinById,skinUnlocked} from './skins.js?v=0.8.0';
import {crosshairGap} from './crosshair.js?v=0.8.0';
import {EnvironmentAudio} from './environment-audio.js?v=0.8.0';
import {createDestructibles,resetDestructibles,damageDestructible,Debris,createAtmosphere} from './effects.js?v=0.8.0';
import {batchWorld} from './performance.js?v=0.8.0';

// Original gameplay; all distances are meters and all times are seconds.
const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const DIFFICULTY = {
  easy: { reaction: .95, interval: .55, spread: .14, speed: 2.4, memory: 1.5 },
  normal: { reaction: .55, interval: .30, spread: .072, speed: 3, memory: 3 },
  hard: { reaction: .28, interval: .19, spread: .04, speed: 3.5, memory: 5 }
};
const BOT_NAMES=['WARDEN','SENTRY','NOMAD','RANGER','VIPER','GHOST','FALCON','ATLAS','ECHO','RAIDER','SPECTRE','JACKAL','COBRA','REAPER','HAVOC','STRIKER'];
const state = { active:false, paused:true, phase:'menu', map:mapKey(settings.map),botCount:normalizeBotCount(settings.botCount),side:'attack', difficulty:'normal', round:0, wins:0, losses:0, kills:0, deaths:0, headshots:0, shotsFired:0, hits:0, money:3400, time:90, plant:null, interact:0, bots:[], weapon:'rifle', primary:'rifle', secondary:'pistol', owned:true, scoped:false, ammo:{}, smoke:1, flash:1, flashTime:0, shots:0, lastShot:-10, reload:0, cooldown:0, t:0, damages:0, hit:0, notice:0 };
const player = { pos:V(0,0,24), vel:V(), yaw:0, pitch:0, health:100, armor:0, height:1.68, vy:0, grounded:true, moving:0, crouch:false };
Object.assign(state,{allyCount:normalizeAllies(settings.allyCount),roster:[],roundResults:[],sidesSwitched:false,sideSwitchTime:0,plants:0,defuses:0,playtime:0});
Object.assign(state,{weaponUsage:{},sessionXP:0,roundDamage:0});let matchSequence=0;
const keys = new Set(); let firing=false, audio=null, models={};
// Presentation has its own state: animation never affects aim or damage.
const weaponMotion={kick:0,equip:0,swayX:0,swayY:0,bob:0,clock:0,stride:0,bank:0,crouch:0,air:0,landing:0,damage:0,throwTime:0,inspect:0,objective:0,magazine:null,magazineHome:null,hands:[]};
const ease=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};
const pulse=(t,a,b,c,d)=>ease(a,b,t)*(1-ease(c,d,t));
const damp=(a,b,rate,dt)=>THREE.MathUtils.damp(a,b,rate,dt);
const walls=[], hitWalls=[], botParts=[], effects=[], smokes=[];let coreMesh=null,doors=[];
const groundHeight=(x,z)=>heightAt(MAPS[state.map],x,z);
const actorPositions=()=>[...(player.health>0?[player.pos]:[]),...state.bots.filter(b=>b.alive).map(b=>b.pos)];
const scene = new THREE.Scene(); scene.background=new THREE.Color('#b3aca0'); scene.fog=new THREE.Fog('#b3aca0',43,110);
const mapRoot=new THREE.Group();mapRoot.name='Map';scene.add(mapRoot);
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'}); }
catch(e){throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(settings.fov,innerWidth/innerHeight,.04,180); camera.rotation.order='YXZ'; scene.add(camera);
// Smooth scope zoom is rendered separately from the authoritative aiming camera.
const renderCamera=camera.clone();
const viewScene=new THREE.Scene(), viewCamera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,10);
viewScene.add(new THREE.HemisphereLight(0xe2e3dd,0x333b3c,1.8));
const weaponLight=new THREE.DirectionalLight(0xf2eee4,2.7);weaponLight.position.set(-2,3,1);viewScene.add(weaponLight);
const weaponRim=new THREE.DirectionalLight(0xbac6ce,1.1);weaponRim.position.set(3,1,-2);viewScene.add(weaponRim);
const gunRoot=new THREE.Group();viewScene.add(gunRoot);
function applySettings(){renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'?1:1.5));renderer.shadowMap.enabled=settings.quality!=='low';const size=settings.quality==='high'?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);}debris.setQuality(settings.quality);if(atmosphere){atmosphere.dispose();atmosphere=createAtmosphere(scene,MAPS[state.map],settings.quality);}camera.fov=state.scoped?WEAPONS[state.weapon].scope:settings.fov;camera.updateProjectionMatrix();}
window.addEventListener('blacksite:settings',applySettings);
function setScoped(value){state.scoped=!!value&&!!WEAPONS[state.weapon].scope&&state.reload===0;camera.fov=state.scoped?WEAPONS[state.weapon].scope:settings.fov;camera.updateProjectionMatrix();$('scope').hidden=!state.scoped;$('crosshair').hidden=state.scoped;}
const sun=new THREE.DirectionalLight(0xffe9c1,3.3);sun.position.set(-24,37,15);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:100});sun.shadow.bias=-.0004;scene.add(sun);
scene.add(new THREE.HemisphereLight(0xd1d5cd,0x665e4b,1.6));
let environment=null,operators=null;const environmentAudio=new EnvironmentAudio(weaponAudio);const debris=new Debris(scene,settings.quality);let destructibles=[],atmosphere=null,worldBatch=null,stepClock=0,botStepClock=0;
const matCache=new Map();
function mat(color,roughness=.88){const k=color+':'+roughness;if(!matCache.has(k))matCache.set(k,new THREE.MeshStandardMaterial({color,roughness}));return matCache.get(k);}
function box(x,y,z,w,h,d,color,solid=false,parent=mapRoot){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(solid){walls.push({x,z,w,d,minY:y-h/2,maxY:y+h/2});hitWalls.push(mesh);}return mesh;}
function cylinder(x,y,z,r,h,color,parent=mapRoot){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function capsule(x,y,z,r,length,color,parent){const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,length,4,8),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sign(text,x,y,z,rot=0,width=3,height=1,color='#c7c1ac'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#333c3c';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='bold 68px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:tex,roughness:1}));m.userData.ownMaterial=true;m.userData.ownTexture=true;m.position.set(x,y,z);m.rotation.y=rot;mapRoot.add(m);return m;
}
const siteA=V(-15,0,-18),siteB=V(15,0,-18);
function surface(x,y,z,w,h,d,kind='concrete',solid=false){const mesh=box(x,y,z,w,h,d,0x949b8f,solid);return environment?textureBox(mesh,environment.surfaces[kind]):mesh;}
function buildEnvironment(m){
  // Keep staging lanes legible with curbs, loading pads, markings and drains.
  for(const x of [-16,16])surface(x,m.baseY-.015,-19,12,.05,13,'concrete');
  if(m.id!=='zero')for(const x of [-22,22]){surface(x,.08,0,.3,.16,58,'concrete');for(let z=-25;z<27;z+=3)box(x,.165,z,.31,.02,.8,0xaaa994);}
  for(let z=-25;z<28;z+=5)box(0,groundHeight(0,z)+.013,z,.12,.018,2,0xa2a693);
  for(const z of [-28,23]){surface(0,groundHeight(0,z)+.011,z,9,.025,.32,'metal');for(let x=-4.3;x<4.4;x+=.2)box(x,groundHeight(x,z)+.032,z,.045,.015,.28,0x3e4941);}
  for(const x of [-23.4,23.4])for(let z=-28;z<29;z+=4){surface(x,3.6,z,.10,1.2,.10,'metal');surface(x,3.75,z+2,.04,.04,4,'metal');surface(x,4.1,z+2,.04,.04,4,'metal');}
  if(environment)placeEnvironment(mapRoot,environment,m.props,hitWalls);
  for(const p of m.props.filter(p=>p.solid)){const cover=box(p.x,p.y+p.h/2,p.z,p.turn%2?p.d:p.w,p.h,p.turn%2?p.w:p.d,0x444b45);cover.visible=false;hitWalls.push(cover);walls.push({x:p.x,z:p.z,w:p.turn%2?p.d:p.w,d:p.turn%2?p.w:p.d,minY:p.y??m.baseY,maxY:(p.y??m.baseY)+p.h});}
  sign(m.tag+' / MILITARY OPERATIONS',0,2.4,-29.44,0,9,.8);
  sign('RESTRICTED AREA',0,2.4,29.44,Math.PI,7,.8);
  for(let i=0;i<18;i++){const angle=i*Math.PI*2/18,r=70+i%3*6,rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),mat(m.palette.ground));rock.position.set(Math.cos(angle)*r,1,Math.sin(angle)*r);rock.scale.set(7,3+i%3,9);mapRoot.add(rock);}
}
function addMapCrates(){if(!models.crate)return;for(const [x,z] of MAPS[state.map].crates){const m=models.crate.clone(true);m.position.set(x,groundHeight(x,z)+.9,z);mapRoot.add(m);walls.push({x,z,w:1.8,d:1.8,minY:groundHeight(x,z),maxY:groundHeight(x,z)+1.8});m.traverse(o=>{if(o.isMesh)hitWalls.push(o);});}}
function loadMap(key){
  clearRoundObjects();atmosphere?.dispose();atmosphere=null;environmentAudio.stopAll();
  mapRoot.traverse(o=>{if(o.isMesh&&!o.userData.asset){o.geometry.dispose();if(o.userData.ownMaterial){if(o.userData.ownTexture)o.material.map.dispose();o.material.dispose();}}});mapRoot.clear();walls.length=0;hitWalls.length=0;
  state.map=mapKey(key);const m=MAPS[state.map],p=m.palette;siteA.set(m.sites[0][0],groundHeight(...m.sites[0]),m.sites[0][1]);siteB.set(m.sites[1][0],groundHeight(...m.sites[1]),m.sites[1][1]);state.plant=null;state.interact=0;
  scene.background.set(p.sky);scene.fog.color.set(p.sky);scene.fog.near=m.id==='zero'?34:43;scene.fog.far=m.id==='ironwood'?100:110;sun.color.set(state.map==='ironwood'?0xd5dfd8:0xffe9c1);sun.intensity=state.map==='ironwood'?2.2:3.3;
  // Separate the ground tops so the overlapping slabs cannot z-fight.
  surface(0,m.baseY-.35,0,130,.6,140,'concrete');surface(0,m.baseY-.045,0,47,.09,59,'asphalt');
  if(m.id==='zero')surface(0,-.06,24,47,.12,12,'concrete');
  for(const s of m.walkSurfaces??[]){if(s.from!==undefined){const geometry=new THREE.BufferGeometry(),x=s.x-s.w/2,X=s.x+s.w/2,z=s.z-s.d/2,Z=s.z+s.d/2;geometry.setAttribute('position',new THREE.Float32BufferAttribute([x,s.from,z,X,s.from,z,X,s.to,Z,x,s.from,z,X,s.to,Z,x,s.to,Z],3));geometry.setIndex([0,2,1,3,5,4]);geometry.computeVertexNormals();const ramp=new THREE.Mesh(geometry,environment?.surfaces.metal??mat(p.trim));ramp.receiveShadow=true;mapRoot.add(ramp);}else if(s.y!==0||m.id!=='zero')surface(s.x,s.y-.075,s.z,s.w,.15,s.d,'metal');}
  for(const roof of m.roofs??[])surface(roof.x,roof.y,roof.z,roof.w,.2,roof.d,'concrete',true);
  for(const s of (m.walkSurfaces??[]).filter(s=>s.y!==undefined&&(m.id!=='zero'||s.w<5)))for(const side of [-1,1])surface(s.x+side*(s.w/2+.04),s.y+.5,s.z,.08,1,s.d,'metal',true);
  for(const x of [-24,24])surface(x,m.baseY+2.5,0,1,5,61,'concrete',true);
  for(const z of [-30,30])surface(0,m.baseY+2.5,z,49,5,1,'concrete',true);
  for(const [x,z,w,d,h] of m.walls){surface(x,m.baseY+h/2,z,w,h,d,'concrete',true);surface(x,m.baseY+h+.05,z,w+.12,.12,d+.12,'metal');}
  buildEnvironment(m);
  for(const [site,letter] of [[siteA,'A'],[siteB,'B']]){const ring=new THREE.Mesh(new THREE.RingGeometry(3.2,3.28,48),new THREE.MeshBasicMaterial({color:0xc3ae7a,side:THREE.DoubleSide}));ring.userData.ownMaterial=true;ring.rotation.x=-Math.PI/2;ring.position.copy(site).y+=.025;mapRoot.add(ring);sign(letter,site.x,2.45,-29.44,0,2.4,1.1);}
  addMapCrates();doors=createDoors(mapRoot,m.doors,environment,hitWalls,walls,groundHeight,(kind,pos)=>worldSound(kind,pos,.38));destructibles=createDestructibles(mapRoot,m,groundHeight,hitWalls);atmosphere=createAtmosphere(scene,m,settings.quality);worldBatch=batchWorld(mapRoot);rebuildNavigation();mapRoot.updateMatrixWorld(true);
  $('pauseMap').textContent=m.name.toUpperCase();$('scoreTitle').textContent=m.name.toUpperCase();$('radarMap').textContent=m.tag+' / '+m.number;
}
// Segment visibility is shared by bots, utilities, and the player.
const ray=new THREE.Raycaster();
function blocked(a,b,smoke=true){const delta=b.clone().sub(a),len=delta.length();ray.set(a,delta.normalize());ray.far=len;const hits=ray.intersectObjects(hitWalls,false);if(hits.length)return true;if(smoke)for(const s of smokes){const p=s.pos.clone().sub(a);const t=clamp(p.dot(delta),0,len);if(a.clone().addScaledVector(delta,t).distanceTo(s.pos)<s.radius)return true;}return false;}
function canStand(x,z,r=.34,y=groundHeight(x,z),navigationOnly=false){return Math.abs(x)<23.3&&Math.abs(z)<29.3&&!walls.some(w=>w.enabled!==false&&!(navigationOnly&&w.dynamic)&&y+.08<(w.maxY??100)&&y+1.75>(w.minY??0)&&x>w.x-w.w/2-r&&x<w.x+w.w/2+r&&z>w.z-w.d/2-r&&z<w.z+w.d/2+r);}
function move(pos,dx,dz,safeDrop=false){const allowed=(x,z)=>canStand(x,z,.34,Math.max(pos.y,groundHeight(x,z)))&&groundHeight(x,z)<=pos.y+.34&&(!safeDrop||groundHeight(x,z)>=pos.y-.34);if(allowed(pos.x+dx,pos.z))pos.x+=dx;if(allowed(pos.x,pos.z+dz))pos.z+=dz;}
const GRID=1.5,NX=31,NZ=39;
const navigation=new Uint8Array(NX*NZ),navEdges=new Uint8Array(NX*NZ);const NAV_DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const cell=(x,z)=>({x:clamp(Math.round((x+22.5)/GRID),0,NX-1),z:clamp(Math.round((z+28.5)/GRID),0,NZ-1)});
const point=(x,z)=>V(x*GRID-22.5,groundHeight(x*GRID-22.5,z*GRID-28.5),z*GRID-28.5);
function rebuildNavigation(){
 for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){const p=point(x,z);navigation[z*NX+x]=canStand(p.x,p.z,.43,p.y,true)?1:0;}
 navEdges.fill(0);
 for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){const k=z*NX+x;if(!navigation[k])continue;for(let i=0;i<4;i++){const [dx,dz]=NAV_DIRS[i],xx=x+dx,zz=z+dz;if(xx<0||xx>=NX||zz<0||zz>=NZ||!navigation[zz*NX+xx])continue;if(reachableStep(MAPS[state.map],point(x,z),point(xx,zz)))navEdges[k]|=1<<i;}}
}
function pathTo(start,end){
 let a=cell(start.x,start.z);const b=cell(end.x,end.z),key=(x,z)=>z*NX+x;
 if(!navigation[key(a.x,a.z)]){let nearest=null,best=Infinity;for(let z=Math.max(0,a.z-2);z<=Math.min(NZ-1,a.z+2);z++)for(let x=Math.max(0,a.x-2);x<=Math.min(NX-1,a.x+2);x++)if(navigation[key(x,z)]){const p=point(x,z),distance=p.distanceToSquared(start);if(distance<best){best=distance;nearest={x,z};}}if(!nearest)return [];a=nearest;}
 const prev=new Int32Array(NX*NZ).fill(-1),queue=[key(a.x,a.z)];prev[queue[0]]=queue[0];let goal=-1,best=Infinity;
 for(let i=0;i<queue.length;i++){const k=queue[i],x=k%NX,z=Math.floor(k/NX),d=(x-b.x)**2+(z-b.z)**2;if(d<best){best=d;goal=k;}if(d===0)break;for(let j=0;j<4;j++){if(!(navEdges[k]&(1<<j)))continue;const [dx,dz]=NAV_DIRS[j],n=key(x+dx,z+dz);if(prev[n]!==-1)continue;prev[n]=k;queue.push(n);}}
 const path=[];if(goal<0)return path;for(let k=goal;k!==queue[0];k=prev[k]){if(k<0)break;path.push(point(k%NX,Math.floor(k/NX)));}return path.reverse();
}
function spawnPoint(side){const [x,z]=MAPS[state.map].spawns[side];return V(x,groundHeight(x,z),z);}
function botSpawnPositions(count,side=oppositeSide(state.side)){
  const chosen=[],m=MAPS[state.map],candidates=[...m.botAnchors[oppositeSide(side)]],north=side==='defend';
  for(const z of north?[-27,-25,-23,-21,-19,-17]:[27,25,23,21,19,17])for(const x of [-20,-16,-12,-4,0,4,12,16,20])candidates.push([x,z]);
  for(const [x,z] of candidates){if(!canStand(x,z,.43)||chosen.some(p=>Math.hypot(p.x-x,p.z-z)<1.25)||side===state.side&&Math.hypot(player.pos.x-x,player.pos.z-z)<1.3)continue;chosen.push(V(x,groundHeight(x,z),z));if(chosen.length===count)return chosen;}
  throw new Error('Not enough clear bot spawns for '+m.name);
}
function moveBot(bot,dx,dz,dt){
  let sx=0,sz=0;
  for(const other of state.bots){if(other===bot||!other.alive)continue;const x=bot.pos.x-other.pos.x,z=bot.pos.z-other.pos.z,d=Math.hypot(x,z);if(d>0&&d<.9){const strength=(.9-d)/.9;sx+=x/d*strength;sz+=z/d*strength;}}
  openDoorForBot(doors,bot,bot.path[0]);move(bot.pos,dx+clamp(sx,-1,1)*dt*1.7,dz+clamp(sz,-1,1)*dt*1.7,true);bot.pos.y=groundHeight(bot.pos.x,bot.pos.z);
}
function makeBot(i,pos,descriptor={id:i,name:BOT_NAMES[i],team:'enemy',personality:'OBJECTIVE'}){
  const group=new THREE.Group();scene.add(group);group.position.copy(pos);
  const b={id:i,name:BOT_NAMES[i],group,pos:group.position,hp:100,alive:true,seen:0,nextFire:0,nav:i*.045,path:[],lastKnown:null,memory:0,blind:0,planting:0,phase:i*2,head:null};
  Object.assign(b,descriptor,{side:descriptor.team==='ally'?state.side:oppositeSide(state.side),sense:i*.012,target:null,visibleTarget:false,goal:null,decision:0,reload:0,mag:30,crouched:false});
  // Keep the original gameplay hit volumes independent from the visible rig.
  const torso=box(0,1.1,0,.56,.64,.33,0x3b4441,false,group);torso.userData={bot:b,zone:'body'};torso.visible=false;botParts.push(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.20,10,8),mat(0x8a8874));head.position.y=1.64;head.scale.y=1.15;head.castShadow=true;head.userData={bot:b,zone:'head'};group.add(head);botParts.push(head);b.head=head;
  head.visible=false;
  b.rig=new THREE.Group();group.add(b.rig);
  b.chest=new THREE.Group();b.chest.position.y=1.12;b.rig.add(b.chest);
  capsule(0,.01,0,.24,.22,0x474d44,b.chest).scale.z=.68;
  box(0,0,-.12,.46,.52,.13,0x313b3a,false,b.chest);
  for(const x of [-.15,0,.15])box(x,-.11,-.20,.12,.18,.075,0x515950,false,b.chest);
  box(0,.81,0,.46,.065,.32,0x262e2d,false,b.rig);
  b.headRig=new THREE.Group();b.headRig.position.set(0,.4,0);b.chest.add(b.headRig);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.20,16,12),mat(0x62695b));helmet.position.set(0,.14,0);helmet.scale.set(1,1.05,1.03);helmet.castShadow=true;b.headRig.add(helmet);
  capsule(0,0,-.035,.135,.08,0x363e39,b.headRig);
  box(0,.15,-.181,.31,.09,.055,0x171e20,false,b.headRig);
  b.legs=[];
  for(const x of [-.15,.15]){
    const hit=box(x,.44,0,.22,.78,.26,0x50584b,false,group);hit.userData={bot:b,zone:'body'};hit.visible=false;botParts.push(hit);
    const hip=new THREE.Group();hip.position.set(x,.80,0);b.rig.add(hip);b.legs.push(hip);
    capsule(0,-.17,0,.105,.19,0x50584b,hip);
    const knee=new THREE.Group();knee.position.y=-.40;hip.add(knee);hip.userData.knee=knee;
    capsule(0,-.11,0,.09,.14,0x50584b,knee);
    box(0,.02,-.073,.15,.17,.06,0x333d3a,false,knee);
    const ankle=new THREE.Group();ankle.position.y=-.32;knee.add(ankle);hip.userData.ankle=ankle;
    box(0,0,-.055,.20,.13,.32,0x282f2c,false,ankle);
  }
  for(const x of [-.38,.38]){const hit=box(x,1.08,-.1,.18,.58,.2,0x68705e,false,group);hit.userData={bot:b,zone:'body'};hit.visible=false;botParts.push(hit);}
  b.arms=[];
  for(const x of [-.31,.31]){
    const shoulder=new THREE.Group();shoulder.position.set(x,.22,-.01);b.chest.add(shoulder);shoulder.rotation.x=-.5;shoulder.rotation.z=x<0?-.2:.2;b.arms.push(shoulder);
    capsule(0,-.14,0,.092,.16,0x596152,shoulder);
    const forearm=new THREE.Group();forearm.position.y=-.26;forearm.rotation.x=-1.2;shoulder.add(forearm);shoulder.userData.forearm=forearm;
    capsule(0,-.13,0,.075,.15,0x596152,forearm);capsule(0,-.27,0,.07,.04,0x2c3534,forearm);
  }
  b.gun=new THREE.Group();b.gun.position.set(.16,.05,-.21);b.chest.add(b.gun);
  if(models.ak47||models.rifle){const gun=(models.ak47||models.rifle).clone(true);gun.scale.multiplyScalar(.72);b.gun.add(gun);}
  b.muzzle=new THREE.Mesh(new THREE.ConeGeometry(.035,.11,6),new THREE.MeshBasicMaterial({color:0xc7b58c,transparent:true,opacity:.8}));b.muzzle.userData.ownMaterial=true;b.muzzle.rotation.x=-Math.PI/2;b.muzzle.position.z=-.40;b.gun.add(b.muzzle);b.muzzle.visible=false;b.flashTime=0;
  b.workDevice=box(0,-.19,-.36,.20,.07,.15,0x303c3b,false,b.chest);b.workDevice.visible=false;
  b.walk=0;b.fall=0;b.viewYaw=group.rotation.y;b.previous=pos.clone();b.visualSpeed=0;b.fireKick=0;b.clock=i*1.8;b.defusing=false;
  if(operators)attachOperator(operators,b);
  return b;
}
function clearBots(){state.bots.forEach(b=>{disposeOperator(b.operator);scene.remove(b.group);b.group.traverse(o=>{if(o.isMesh&&!o.userData.asset){o.geometry.dispose();if(o.userData.ownMaterial)o.material.dispose();}});});state.bots=[];botParts.length=0;}
function disposeViewParts(){gunRoot.traverse(o=>{if(o.isMesh&&o.userData.viewPart){o.geometry.dispose();if(o.userData.ownMaterial)o.material.dispose();}});gunRoot.clear();}
function addGrip(type){
  const primary=WEAPONS[type].slot==='primary';weaponMotion.hands=[];
  for(let i=0;i<2;i++){
    const sign=i? -1:1,home=i?(primary?V(-.035,-.035,-.08):V(-.027,-.09,.10)):(primary?V(.015,-.065,.22):V(.015,-.085,.13));
    const palm=new THREE.Group();palm.position.copy(home);gunRoot.add(palm);
    box(0,0,0,.061,.083,.043,0x303938,false,palm);
    box(sign*.025,.004,-.014,.028,.047,.036,0x3d4540,false,palm);
    const fingers=[];
    for(let f=0;f<4;f++){const finger=box(-.021+f*.014,.032,-.018,.012,.036,.023,0x414a43,false,palm);fingers.push(finger);}
    box(0,-.06,0,.066,.032,.05,0x282f2c,false,palm);
    const segments=[.041,.035].map(radius=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*1.12,1,8),mat(0x4a5148));gunRoot.add(mesh);return mesh;});
    palm.traverse(o=>{if(o.isMesh)o.userData.viewPart=true;});segments.forEach(o=>o.userData.viewPart=true);
    weaponMotion.hands.push({palm,home,fingers,segments,shoulder:V(sign*.31,-.40,.46),elbow:V(sign*.16,-.23,.32)});
  }
  // Original handheld utility and objective props; no additional internet assets.
  const grenade=new THREE.Group();weaponMotion.hands[0].palm.add(grenade);
  capsule(0,.052,-.01,.034,.055,0x596151,grenade);box(0,.11,-.01,.044,.027,.038,0x29342f,false,grenade);
  grenade.traverse(o=>{if(o.isMesh)o.userData.viewPart=true;});grenade.visible=false;weaponMotion.grenade=grenade;
  const device=new THREE.Group();device.position.set(-.08,-.06,-.07);gunRoot.add(device);
  box(0,0,0,.20,.052,.14,0x303c3b,false,device);box(0,.028,-.014,.10,.012,.067,0x899476,false,device);
  for(let i=0;i<3;i++)box(.068,.030,-.035+i*.025,.013,.014,.012,0x272f2d,false,device);
  device.traverse(o=>{if(o.isMesh)o.userData.viewPart=true;});device.visible=false;weaponMotion.device=device;
  const muzzle=new THREE.Mesh(new THREE.ConeGeometry(.036,.13,6),new THREE.MeshBasicMaterial({color:0xc7b58c,transparent:true,opacity:.82}));
  muzzle.userData.viewPart=true;muzzle.userData.ownMaterial=true;muzzle.rotation.x=-Math.PI/2;
  gunRoot.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(weaponMotion.model),front=bounds.getCenter(V());front.z=bounds.min.z;
  muzzle.position.copy(gunRoot.worldToLocal(front));muzzle.position.z-=.035;gunRoot.add(muzzle);muzzle.visible=false;weaponMotion.muzzle=muzzle;
  weaponMotion.shells=Array.from({length:4},()=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.025,6),mat(0x9c895e));mesh.userData.viewPart=true;mesh.visible=false;gunRoot.add(mesh);return {mesh,life:0,velocity:V()};});
}
function loadGun(type){
  disposeViewParts();if(!models[type])return;
  const g=models[type].clone(true),skin=skinById(skinChoices[type]);applySkin(g,skinUnlocked(skin,career.data)?skin.id:'default');g.rotation.y=WEAPONS[type].viewRotationY||0;g.scale.multiplyScalar(WEAPONS[type].viewScale||1);gunRoot.add(g);weaponMotion.model=g;
  weaponMotion.magazine=g.getObjectByName('Magazine')??null;weaponMotion.magazineHome=weaponMotion.magazine?.position.clone()??null;weaponMotion.cycling=g.getObjectByName('Slide')||g.getObjectByName('Bolt');weaponMotion.cyclingHome=weaponMotion.cycling?.position.clone()??null;
  gunRoot.position.fromArray(WEAPONS[type].pose);gunRoot.rotation.set(0,0,0);
  gunRoot.updateMatrixWorld(true);weaponMotion.magazineCenter=null;weaponMotion.magazineRotation=null;weaponMotion.magazineScale=1;
  if(weaponMotion.magazine){weaponMotion.magazineRotation=weaponMotion.magazine.quaternion.clone();weaponMotion.magazineCenter=gunRoot.worldToLocal(new THREE.Box3().setFromObject(weaponMotion.magazine).getCenter(V()));weaponMotion.magazineScale=weaponMotion.magazine.getWorldScale(V()).y;}
  Object.assign(weaponMotion,{kick:0,equip:1,swayX:0,swayY:0,bob:0,clock:0,stride:0,bank:0,crouch:0,air:0,landing:0,damage:0,throwTime:0,inspect:0,objective:0,flashTime:0,presentedShots:state.shotsFired,lastGrounded:player.grounded,lastVy:0,lastPosition:player.pos.clone()});
  addGrip(type);poseHands(0,0,0,0);
}
function prepareModel(g,targetLength,muted=false){
  const bounds=new THREE.Box3().setFromObject(g),s=bounds.getSize(V()),center=bounds.getCenter(V());g.position.sub(center);const wrapper=new THREE.Group();wrapper.add(g);wrapper.scale.setScalar(targetLength/Math.max(s.x,s.y,s.z));wrapper.updateMatrixWorld(true);
  const materials=new Map();
  g.traverse(o=>{if(o.isMesh){o.userData.asset=true;o.castShadow=true;o.receiveShadow=true;
    const prepare=source=>{if(materials.has(source))return materials.get(source);const material=source.clone();if(muted){material.color.set(0xaab2ac);material.roughness=.72;material.metalness=.18;material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.94, 1.0, 0.96);');};material.customProgramCacheKey=()=> 'muted-palette-v1';}materials.set(source,material);return material;};
    o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
  }});return wrapper;
}
async function loadAssets(){
 const loader=new GLTFLoader();THREE.Cache.enabled=true;
 const stage=(text,percent)=>{$('loadingStage').textContent=text;$('loadingProgress').style.width=percent+'%';$('start').textContent=text+'…';};
 try{
  stage('LOADING WEAPONS',10);const entries=Object.entries(WEAPONS);
  const loaded=await Promise.all([...entries.map(([,w])=>w.model),'crate-medium'].map(n=>loader.loadAsync('./assets/'+n+'.glb?v=0.7.0')));
  entries.forEach(([key,w],i)=>models[key]=prepareModel(loaded[i].scene,w.length,key==='pistol'));models.crate=prepareModel(loaded.at(-1).scene,1.8,true);
  stage('LOADING OPERATORS',40);try{operators=await loadOperators(loader);}catch(e){console.warn('Operator asset unavailable; using the built-in rig',e);}
  stage('LOADING WORLD',65);environment=await loadEnvironment(loader);environmentAudio.preload();
  stage('PREPARING NAVIGATION',90);loadMap(settings.map);loadGun('rifle');
  stage('READY',100);$('start').disabled=false;$('start').innerHTML='DEPLOY OPERATION <span>↗</span>';
 }catch(e){console.error(e);$('loadingStage').textContent='LOAD FAILED';$('start').textContent='ASSET LOAD FAILED';$('compatibility').hidden=false;$('compatibility').textContent='The game could not load. Reload the page, or check that the complete game folder is hosted.';}
}
applySettings();loadMap(settings.map);loadAssets();
window.addEventListener('blacksite:map',()=>{if(!state.active)loadMap(settings.map);});

function poseHands(progress,out,throwing,interacting){
  const m=weaponMotion,primary=WEAPONS[state.weapon].slot==='primary',times=SOUND_BANK[state.weapon].reloadAt,reloadReach=pulse(progress,0,times[0],times[1]+.04,times[1]+.16),charge=pulse(progress,times[2]-.04,times[2],times[2]+.05,Math.min(1,times[2]+.12));
  for(let i=0;i<m.hands.length;i++){
    const hand=m.hands[i],p=hand.home.clone(),left=i===1;
    if(left&&state.reload>0){
      const grab=m.magazineCenter?.clone()??V(-.01,-.11,.10);grab.x-=.035;grab.y-=out*.18;
      p.lerp(grab,reloadReach);
      p.lerp(V(-.035,.025,primary?.06:.12),charge);
    }
    if(!left&&state.weapon==='sv98'&&state.cooldown>0&&state.lastShotWeapon==='sv98'&&!state.reload){const bolt=pulse(WEAPONS.sv98.interval-state.cooldown,.10,.22,.90,1.22);p.lerp(V(.075,.025,.24),bolt);p.z+=bolt*.07;}
    if(throwing>0){p.lerp(left?V(-.02,-.22,.20):V(.035,.015,.12),throwing);if(!left)p.z-=pulse(1-m.throwTime/.65,.28,.43,.55,.75)*.32;}
    if(interacting>0){p.lerp(left?V(-.16,-.085,-.07):V(.002,-.018,-.08),interacting);if(!left)p.y+=Math.sin(m.clock*12)*.007*interacting;}
    if(m.inspect>0&&left)p.lerp(V(-.10,-.11,.13),m.inspect);
    hand.palm.position.copy(p);hand.palm.rotation.set(left?-.22:-.08,0,(left?.18:-.12)+reloadReach*(left?-.4:0)+interacting*(left?.1:-.7));
    const elbow=hand.elbow.clone().lerp(p,.22),wrist=p.clone().add(V(0,-.048,.01)),points=[hand.shoulder,elbow,wrist];
    for(let j=0;j<2;j++){const mesh=hand.segments[j],delta=points[j+1].clone().sub(points[j]);mesh.position.copy(points[j]).add(points[j+1]).multiplyScalar(.5);mesh.scale.y=Math.max(.001,delta.length());mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());}
    hand.fingers.forEach((finger,f)=>finger.rotation.x=interacting&&!left?-.25+Math.sin(m.clock*12+f*.8)*.14:-.22-reloadReach*.22);
  }
}
function updateWeaponPresentation(dt){
  if(dt<=0||!weaponMotion.model)return;
  const m=weaponMotion,w=WEAPONS[state.weapon],smooth=1-Math.exp(-18*dt);
  m.clock+=dt;m.kick*=Math.exp(-17*dt);m.equip*=Math.exp(-9*dt);m.swayX*=Math.exp(-10*dt);m.swayY*=Math.exp(-10*dt);
  const distance=Math.min(.25,Math.hypot(player.pos.x-m.lastPosition.x,player.pos.z-m.lastPosition.z));m.lastPosition.copy(player.pos);
  m.stride=damp(m.stride,player.grounded?clamp(distance/dt/4.8,0,1):0,10,dt);m.bob+=distance*2.4;
  const strafe=(Math.cos(player.yaw)*player.vel.x-Math.sin(player.yaw)*player.vel.z)/4.8;
  m.bank=damp(m.bank,clamp(strafe,-1,1),10,dt);m.crouch=damp(m.crouch,player.crouch?1:0,10,dt);
  if(player.grounded&&!m.lastGrounded)m.landing=clamp(Math.abs(m.lastVy)/7,.25,1);
  m.lastGrounded=player.grounded;m.lastVy=player.vy;m.landing*=Math.exp(-12*dt);m.air=damp(m.air,player.grounded?0:clamp(player.vy/5,-1,1),9,dt);m.damage*=Math.exp(-13*dt);
  m.throwTime=Math.max(0,m.throwTime-dt);const throwProgress=1-m.throwTime/.65,throwing=m.throwTime>0?pulse(throwProgress,0,.13,.74,1):0;
  m.inspect=damp(m.inspect,keys.has('KeyV')&&!state.reload&&!state.scoped&&state.cooldown===0&&state.interact===0?1:0,8,dt);
  m.objective=damp(m.objective,state.interact>0?1:0,14,dt);
  const progress=state.reload>0?clamp(1-state.reload/w.reload,0,1):0,dip=state.reload>0?pulse(progress,0,.17,.82,1):0;
  const times=SOUND_BANK[state.weapon].reloadAt,out=state.reload>0?pulse(progress,times[0],times[0]+.13,times[1]-.13,times[1]):0,breath=Math.sin(m.clock*1.8)*.0022,pose=w.pose;
  const target=V(pose[0]+Math.sin(m.bob)*m.stride*.016+m.swayX*.09+m.inspect*.055,
    pose[1]+breath+(Math.cos(m.bob*2)-1)*m.stride*.010+dip*.11-m.equip*.25-m.landing*.055+m.air*.025+m.crouch*.016-throwing*.12-m.objective*.025,
    pose[2]+m.kick*.045-dip*.08+m.equip*.08+m.inspect*.14);
  gunRoot.position.lerp(target,smooth);
  const rotations=[m.kick*.10+m.swayY+dip*.16+m.air*.06+m.landing*.10+m.equip*.32+throwing*.25+m.damage*.06,
    .035+m.swayX+m.bank*.045+m.inspect*.52,
    -dip*.48-m.swayX*.7-m.bank*.065+Math.sin(m.bob)*m.stride*.018+m.inspect*.24];
  for(let i=0;i<3;i++){const axis=['x','y','z'][i];gunRoot.rotation[axis]=damp(gunRoot.rotation[axis],rotations[i],18,dt);}
  if(m.cycling){const elapsed=w.interval-state.cooldown,cycle=state.lastShotWeapon===state.weapon&&state.cooldown>0?(state.weapon==='sv98'?pulse(elapsed,.14,.32,.75,1.10):pulse(elapsed,0,.025,.035,.095)):0;m.cycling.position.copy(m.cyclingHome).z+=cycle*.03/Math.max(.01,m.cycling.getWorldScale(V()).z);}
  if(m.magazine){m.magazine.position.copy(m.magazineHome).y-=out*.18/Math.max(.01,m.magazineScale);m.magazine.quaternion.copy(m.magazineRotation);m.magazine.rotateZ(out*.10);}
  m.model.visible=throwing<.08&&m.objective<.08;m.grenade.visible=throwing>.08&&throwProgress<.48;m.device.visible=m.objective>.08;
  if(m.presentedShots!==state.shotsFired){if(state.lastShotWeapon===state.weapon){m.flashTime=.05;const shell=m.shells[state.shotsFired%m.shells.length];shell.life=.42;shell.mesh.position.set(.06,.035,.06);shell.mesh.rotation.set(0,0,Math.PI/2);shell.velocity.set(.8,.65,.1);}m.presentedShots=state.shotsFired;}
  m.flashTime=Math.max(0,m.flashTime-dt);m.muzzle.visible=m.flashTime>0&&m.model.visible;m.muzzle.scale.setScalar(.8+(state.shotsFired%3)*.18);
  for(const shell of m.shells){shell.life=Math.max(0,shell.life-dt);shell.mesh.visible=shell.life>0;if(shell.life>0){shell.velocity.y-=3.5*dt;shell.mesh.position.addScaledVector(shell.velocity,dt);shell.mesh.rotation.x+=dt*13;shell.mesh.rotation.z+=dt*8;}}
  poseHands(progress,out,throwing,m.objective);
}
function updateBotPresentation(dt){
  if(dt<=0)return;
  for(const b of state.bots){
    if(b.operator){updateOperator(b,dt,camera.position,settings.quality);continue;}
    b.clock+=dt;b.fireKick*=Math.exp(-15*dt);b.flashTime=Math.max(0,b.flashTime-dt);b.muzzle.visible=b.flashTime>0&&b.alive;
    if(!b.alive){b.fall=damp(b.fall,1,7,dt);b.rig.rotation.x=-b.fall*Math.PI/2;b.rig.rotation.z=Math.sin(b.fall*Math.PI)*((b.id%2)?-.18:.18);b.rig.position.y=b.fall*.22;b.rig.position.z=b.fall*.38;b.chest.rotation.x=-.12*b.fall;for(const arm of b.arms){arm.rotation.x=damp(arm.rotation.x,.5,8,dt);arm.userData.forearm.rotation.x=damp(arm.userData.forearm.rotation.x,.25,8,dt);}b.workDevice.visible=false;continue;}
    const distance=b.pos.distanceTo(b.previous),speed=Math.min(1,distance/Math.max(.001,dt)/DIFFICULTY[state.difficulty].speed);
    const delta=b.pos.clone().sub(b.previous);b.previous.copy(b.pos);b.walk+=Math.min(distance,.2)*4.2;b.visualSpeed=damp(b.visualSpeed,speed,12,dt);
    const angle=Math.atan2(Math.sin(b.group.rotation.y-b.viewYaw),Math.cos(b.group.rotation.y-b.viewYaw));b.viewYaw+=angle*(1-Math.exp(-13*dt));b.rig.rotation.y=b.viewYaw-b.group.rotation.y;
    const side=(Math.cos(b.group.rotation.y)*delta.x-Math.sin(b.group.rotation.y)*delta.z)/Math.max(.001,dt),forward=(-Math.sin(b.group.rotation.y)*delta.x-Math.cos(b.group.rotation.y)*delta.z)/Math.max(.001,dt),direction=forward<-.1?-1:1;
    const work=b.planting>0||b.defusing,blind=b.blind>0,stance=work?.03:blind?.01:0,s=b.visualSpeed;
    b.rig.position.y=damp(b.rig.position.y,-stance+(Math.cos(b.walk*2)-1)*s*.018,14,dt);
    b.rig.rotation.x=damp(b.rig.rotation.x,-s*.025-b.fireKick*.012+(work?.025:0),12,dt);b.rig.rotation.z=damp(b.rig.rotation.z,clamp(-side*.012,-.04,.04)+Math.sin(b.walk)*s*.009,12,dt);
    b.chest.rotation.x=Math.sin(b.clock*1.8)*.010+b.fireKick*.045;b.chest.rotation.y=Math.sin(b.walk)*s*.025;
    b.headRig.rotation.x=damp(b.headRig.rotation.x,work?.38:blind?.22:-b.fireKick*.06,12,dt);b.headRig.rotation.y=Math.sin(b.clock*.75)*.025*(1-s);
    for(let i=0;i<2;i++){const leg=b.legs[i],phase=b.walk+(i?Math.PI:0),stride=Math.sin(phase)*s*.48*direction;
      leg.rotation.x=damp(leg.rotation.x,stride+(work?-.08:0),18,dt);leg.rotation.z=damp(leg.rotation.z,clamp(-side*.045,-.14,.14),14,dt);
      leg.userData.knee.rotation.x=damp(leg.userData.knee.rotation.x,Math.max(0,-Math.sin(phase))*s*.68+(work?.15:0),20,dt);
      leg.userData.ankle.rotation.x=-leg.rotation.x-leg.userData.knee.rotation.x*.55;
    }
    for(let i=0;i<2;i++){const arm=b.arms[i],left=i===0;
      arm.rotation.x=damp(arm.rotation.x,blind?2.3:work?.70+Math.sin(b.clock*7+i)*.07:(left?.45:-.40)+Math.sin(b.walk+(i?Math.PI:0))*s*.05-b.fireKick*.12,16,dt);
      arm.rotation.z=damp(arm.rotation.z,(left?.40:-.45)+(blind?(left?-.15:.15):0),16,dt);
      arm.userData.forearm.rotation.x=damp(arm.userData.forearm.rotation.x,blind?1.5:work?.55:left?1.25:2.1,16,dt);
    }
    b.gun.visible=!blind&&!work;b.workDevice.visible=work&&!blind;b.gun.position.z=-.21+b.fireKick*.045;b.gun.rotation.x=-b.fireKick*.10+Math.sin(b.clock*1.8)*.006;
  }
}

function tone(freq,duration=.08,type='triangle',gain=.08){if(!audio||settings.volume===0)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(freq*.35,30),audio.currentTime+duration);g.gain.setValueAtTime(gain*settings.volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function shotSound(enemy=false,position){const offset=position?.clone().sub(camera.position),distance=offset?.length()||0;const pan=offset?Math.cos(player.yaw)*offset.x/distance-Math.sin(player.yaw)*offset.z/distance:0;weaponAudio.shot(enemy?'rifle':state.weapon,{enemy,distance,pan:Number.isFinite(pan)?pan:0});}
function worldSound(kind,position,gain=.25){const offset=position.clone().sub(camera.position),distance=offset.length();const pan=distance>0?(Math.cos(player.yaw)*offset.x-Math.sin(player.yaw)*offset.z)/distance:0;environmentAudio.play(kind,{gain,pan,distance});}
function impactKind(mesh){return mesh.userData.destructible?'equipment-impact':/crate|wood/i.test(mesh.name)?'crate-impact':'metal-impact';}
function footSurface(pos){if(groundHeight(pos.x,pos.z)>MAPS[state.map].baseY+.4)return 'metal';if(state.map==='helix'&&Math.abs(pos.x)>20)return 'dirt';if(state.map==='ironwood'&&Math.abs(pos.x)>18)return 'gravel';return 'concrete';}
function updateEnvironmentPresentation(dt){
 atmosphere?.update(dt);debris.update(dt,groundHeight);stepClock-=dt;botStepClock-=dt;
 if(state.phase==='live'&&player.health>0&&player.grounded&&player.moving>1.1&&!player.crouch&&stepClock<=0){environmentAudio.footstep(footSurface(player.pos),{gain:.22});stepClock=player.moving>3?.32:.48;}
 if(botStepClock<=0){const nearest=state.bots.filter(b=>b.alive&&(b.visualSpeed||0)>1&&!b.crouched&&b.pos.distanceTo(camera.position)<12).sort((a,b)=>a.pos.distanceToSquared(camera.position)-b.pos.distanceToSquared(camera.position))[0];if(nearest){const offset=nearest.pos.clone().sub(camera.position),distance=offset.length();environmentAudio.footstep(footSurface(nearest.pos),{gain:.14,distance,pan:distance?offset.x/distance:0});}botStepClock=.4;}
}
function toast(text){$('toast').textContent=text;state.notice=2.6;$('toast').classList.remove('toast-enter');void $('toast').offsetWidth;$('toast').classList.add('toast-enter');}
function feed(text){const node=document.createElement('div');node.textContent=text;$('feed').prepend(node);while($('feed').children.length>4)$('feed').lastChild.remove();}
function lock(){if(!state.active)return;try{const p=$('world').requestPointerLock();if(p?.catch)p.catch(()=>{state.paused=true;$('pause').hidden=false;toast('Click Resume to capture your mouse.');});}catch(e){state.paused=true;$('pause').hidden=false;toast('Mouse capture requires a desktop browser.');}}
function startMatch(){loadMap(settings.map);try{weaponAudio.setVolume(settings.volume);weaponAudio.unlock().catch(e=>console.warn('Audio unavailable',e));audio=weaponAudio.context;environmentAudio.unlock().catch(()=>{});}catch(e){console.warn('Audio unavailable',e);}Object.assign(state,{active:true,paused:false,side:$('side').value,difficulty:$('difficulty').value,botCount:normalizeBotCount(settings.botCount),allyCount:normalizeAllies(settings.allyCount),round:0,wins:0,losses:0,kills:0,deaths:0,headshots:0,hits:0,shotsFired:0,plants:0,defuses:0,playtime:0,money:3400,primary:settings.primary,secondary:settings.secondary||'pistol',owned:true,roundResults:[],sidesSwitched:false,sideSwitchTime:0});state.matchId='operation-'+Date.now()+'-'+(++matchSequence);state.weaponUsage={};state.sessionXP=0;state.careerStart=career.data.xp;state.persisted=captureStats(state);state.startSide=state.side;state.roster=createRoster(state.botCount,state.allyCount);$('menu').hidden=true;$('hud').hidden=false;$('result').hidden=true;nextRound();lock();}
function clearRoundObjects(){
  clearBots();debris.clear();for(const s of smokes){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}smokes.length=0;for(const e of effects){scene.remove(e.mesh);e.mesh.traverse(o=>{if(o.isMesh||o.isLine){o.geometry.dispose();if(o.isLine)o.material.dispose();}});}effects.length=0;
  if(coreMesh){scene.remove(coreMesh);coreMesh.traverse(o=>{if(o.isMesh)o.geometry.dispose();});coreMesh=null;}
}
function nextRound(){
  weaponAudio.stopAll();
  clearRoundObjects();state.roundDamage=0;resetDestructibles(destructibles,hitWalls);stepClock=0;botStepClock=0;
  for(const d of doors){d.open=false;d.progress=0;d.cooldown=0;d.collider.enabled=false;}updateDoors(doors,.001,hitWalls);
  if(state.roundResults.length===3&&!state.sidesSwitched){state.side=oppositeSide(state.side);state.sidesSwitched=true;state.sideSwitchTime=4;$('sideSwitch').hidden=false;$('sideSwitchRole').textContent='You are now '+(state.side==='attack'?'attacking.':'defending.');}
  Object.assign(state,{round:state.round+1,phase:'buy',time:12,plant:null,interact:0,paused:false,reload:0,cooldown:0,shots:0,lastShot:-10,lastShotWeapon:null,smoke:1,flash:1,flashTime:0,damages:0,hit:0,weapon:state.owned?state.primary:state.secondary,roundBaseline:{kills:state.kills,deaths:state.deaths,headshots:state.headshots,shotsFired:state.shotsFired,hits:state.hits,plants:state.plants,defuses:state.defuses}});setScoped(false);
  for(const [k,w] of Object.entries(WEAPONS))state.ammo[k]={mag:w.capacity,reserve:w.reserve};
  Object.assign(player,{health:100,armor:0,yaw:state.side==='attack'?0:Math.PI,pitch:0,vy:0,grounded:true,height:1.68,moving:0,crouch:false});player.vel.set(0,0,0);player.pos.copy(spawnPoint(state.side));camera.position.copy(player.pos).y+=player.height;camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
  state.botCount=normalizeBotCount(state.botCount);state.allyCount=normalizeAllies(state.allyCount);
  if(state.roster.filter(b=>b.team==='enemy').length!==state.botCount||state.roster.filter(b=>b.team==='ally').length!==state.allyCount)state.roster=createRoster(state.botCount,state.allyCount);
  const enemySpawns=botSpawnPositions(state.botCount),allySpawns=state.allyCount?botSpawnPositions(state.allyCount,state.side):[];let enemies=0,allies=0;
  state.bots=state.roster.map(b=>makeBot(b.id,b.team==='ally'?allySpawns[allies++]:enemySpawns[enemies++],b));
  for(const id of ['result','buy','pause','scoreboard'])$(id).hidden=true;$('feed').innerHTML='';loadGun(state.weapon);toast(state.sideSwitchTime?'SIDE SWITCH · You are now '+(state.side==='attack'?'attacking':'defending'):'Buy phase · B opens equipment · first to four wins');refreshShop(state,player,'Survive to keep both weapons. Elimination issues a free P-9.');updateHUD();
}
function returnMenu(){if(state.active&&state.matchId){career.recordPartial({map:state.map,...statDelta(state,state.persisted)});state.persisted=captureStats(state);}clearRoundObjects();$('sideSwitch').hidden=true;weaponAudio.stopAll();environmentAudio.stopAll();state.active=false;state.phase='menu';state.paused=true;setScoped(false);document.exitPointerLock();for(const id of ['hud','pause','buy','result','scoreboard'])$(id).hidden=true;$('menu').hidden=false;showView('deploy');keys.clear();firing=false;}
function endRound(win,reason){if(state.phase==='ended')return;weaponAudio.stopHandling();environmentAudio.stopAll();state.phase='ended';state.paused=true;firing=false;state.reload=0;state.interact=0;state.roundResults.push({round:state.round,side:state.side,win,reason});win?state.wins++:state.losses++;state.money=Math.min(16000,state.money+(win?3000:1900));if(player.health<=0){state.owned=false;state.secondary='pistol';}
  const complete=state.wins===4||state.losses===4;state.roundAward=career.recordRound({id:(state.matchId||'practice')+'-round-'+state.round,map:state.map,difficulty:state.difficulty,win,...statDelta(state,state.persisted),complete,alive:player.health>0,damage:state.roundDamage,report:matchSummary(state)});state.sessionXP+=state.roundAward.xp;state.persisted=captureStats(state);
  setScoped(false);showReport(state,win,reason);$('result').hidden=false;$('buy').hidden=true;$('pause').hidden=true;$('scoreboard').hidden=true;document.exitPointerLock();tone(win?550:160,.3,'triangle',.18);updateHUD();}
function reload(){const a=state.ammo[state.weapon],w=WEAPONS[state.weapon];if(state.reload||a.mag===w.capacity||a.reserve===0||state.phase==='ended')return;setScoped(false);state.reload=w.reload;firing=false;weaponAudio.reload(state.weapon,w.reload);toast('Reloading…');}
function equip(k){if(!WEAPONS[k]||(WEAPONS[k].slot==='primary'?(!state.owned||state.primary!==k):state.secondary!==k))return;state.weapon=k;state.lastShotWeapon=null;state.reload=0;state.shots=0;firing=false;setScoped(false);loadGun(k);weaponAudio.equip(k);}
function buyItem(item){
  const spawn=spawnPoint(state.side),w=WEAPONS[item],cost=w?.price??{armor:650,smoke:300,flash:200}[item];
  if(state.phase!=='buy'||!Number.isFinite(cost)||player.pos.distanceTo(spawn)>=8)return false;
  const full=w?(w.slot==='primary'?state.owned&&state.primary===item:state.secondary===item):item==='armor'?player.armor===100:state[item]>=2;
  if(full||state.money<cost){refreshShop(state,player,full?'Already equipped or at capacity.':'Insufficient credits.');return false;}
  state.money-=cost;
  if(w){if(w.slot==='primary'){state.primary=item;state.owned=true;}else state.secondary=item;state.ammo[item]={mag:w.capacity,reserve:w.reserve};equip(item);}
  else if(item==='armor')player.armor=100;else state[item]++;
  updateHUD();refreshShop(state,player,(w?w.name:item.toUpperCase())+' acquired.');return true;
}
function tracer(a,b,color=0xc8be96){const geo=new THREE.BufferGeometry().setFromPoints([a,b]);const m=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.65}));scene.add(m);effects.push({mesh:m,life:.07,max:.07});}
function shoot(){
  if(player.health<=0||state.phase!=='live'||state.reload||state.cooldown>0)return;
  const w=WEAPONS[state.weapon],a=state.ammo[state.weapon];if(a.mag===0){if(a.reserve>0)reload();else{weaponAudio.empty(state.weapon);state.cooldown=.24;}return;}
  a.mag--;state.shotsFired++;weaponStats(state).shots++;state.cooldown=w.interval;if(!w.automatic)firing=false;if(state.t-state.lastShot>.28)state.shots=0;state.shots++;state.lastShot=state.t;state.lastShotWeapon=state.weapon;weaponMotion.kick=Math.min(1.8,weaponMotion.kick+1);weaponMotion.throwTime=0;
  const spread=(state.scoped?.00045:w.spread)+player.moving*w.movement+(player.grounded?0:.09)+Math.min(state.shots-1,12)*w.bloom;
  const dir=V(0,0,-1).applyQuaternion(camera.quaternion);dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();
  ray.set(camera.position,dir);ray.far=85;scene.updateMatrixWorld(true);const hit=ray.intersectObjects([...hitWalls,...botParts.filter(p=>p.userData.bot.alive)],false)[0];const end=hit?hit.point:camera.position.clone().addScaledVector(dir,80);
  tracer(camera.position.clone().add(V(0,-.10,0)),end);shotSound();
  if(hit?.object.userData.bot){const b=hit.object.userData.bot,head=hit.object.userData.zone==='head';if(b.team==='enemy'){state.hits++;weaponStats(state).hits++;b.hp-=head?w.head:w.damage*.78;state.hit=.14;$('hitmarker').style.color=head?'#c9ad78':'#f1f0dd';tone(head?950:650,.045,'triangle',.10);if(b.hp<=0)killBot(b,'player',head,state.weapon);}}
  else if(hit){worldSound(impactKind(hit.object),end,.18);damageDestructible(hit.object.userData.destructible,hitWalls,debris,end);const cap=settings.quality==='low'?12:32;const marks=effects.filter(e=>e.impact);if(marks.length>=cap){const old=marks[0];scene.remove(old.mesh);old.mesh.geometry.dispose();effects.splice(effects.indexOf(old),1);}const m=new THREE.Mesh(new THREE.SphereGeometry(.035,4,4),mat(0x313831));m.position.copy(end);scene.add(m);effects.push({mesh:m,life:5,max:5,impact:true});}
  // Original recoil curve: vertical climb, then alternating horizontal pull.
  player.pitch=clamp(player.pitch+w.recoil+Math.min(state.shots,9)*w.climb,-1.45,1.45);
  player.yaw+=Math.sin(state.shots*.85)*Math.min(state.shots,12)*w.horizontal;
}
function checkElimination(){if(state.phase!=='live')return;if(teamAlive(state,player,'enemy')===0&&!(state.side==='defend'&&state.plant))endRound(true,'Enemy team eliminated.');else if(teamAlive(state,player,'ally')===0&&!(state.side==='attack'&&state.plant))endRound(false,'Your team was eliminated.');}
function killBot(bot,source,head=false,weapon='rifle'){if(!bot.alive)return;bot.alive=false;bot.hp=0;bot.target=null;const roster=state.roster.find(b=>b.id===bot.id);if(roster)roster.deaths=(roster.deaths||0)+1;if(source==='player'){state.kills++;weaponStats(state,weapon).kills++;if(head)state.headshots++;state.money=Math.min(16000,state.money+300);}else if(source){const r=state.roster.find(b=>b.id===source.id);if(r)r.kills=(r.kills||0)+1;}feed((source==='player'?'YOU':source?.name||'OPERATOR')+' / '+WEAPONS[weapon].name+' / '+(head?'HEADSHOT / ':'')+bot.name);checkElimination();}
function hurt(amount){if(player.health<=0)return;state.roundDamage+=amount;const reduction=player.armor>0?.65:1;player.health=Math.max(0,player.health-amount*reduction);player.armor=Math.max(0,player.armor-amount*.35);state.damages=.65;weaponMotion.damage=1;if(player.health===0){state.deaths++;firing=false;state.reload=0;state.interact=0;feed(MAPS[state.map].tag+' / YOU');checkElimination();if(state.phase==='live')toast('You were eliminated · Your team is still fighting');}}
function plant(pos,owner){if(state.plant)return;if(owner==='player')state.plants++;state.plant={pos:pos.clone(),time:40,owner,defuse:0};state.interact=0;coreMesh=new THREE.Group();box(0,.12,0,.45,.24,.6,0x303c3b,false,coreMesh);box(0,.25,0,.2,.02,.25,0xc1a96e,false,coreMesh);coreMesh.position.copy(pos);scene.add(coreMesh);toast('SIGNAL CORE ARMED · 40 SECONDS');feed(owner==='player'?'YOU / CORE ARMED':MAPS[state.map].tag+' / CORE ARMED');tone(750,.3,'square',.10);}
function inSite(pos){return pos.distanceTo(siteA)<4.5||pos.distanceTo(siteB)<4.5;}
function utility(kind){
  if(state.phase!=='live'||!['smoke','flash'].includes(kind)||state[kind]<1)return;state[kind]--;weaponMotion.throwTime=.65;const dir=V(0,0,-1).applyQuaternion(camera.quaternion);const dest=camera.position.clone().addScaledVector(dir,10);ray.set(camera.position,dir);ray.far=10;const h=ray.intersectObjects(hitWalls,false)[0];if(h)dest.copy(h.point).addScaledVector(dir,-.6);dest.y=groundHeight(dest.x,dest.z)+1;
  const projectile=new THREE.Group();cylinder(0,0,0,.055,.15,0x58604f,projectile);projectile.position.copy(camera.position);scene.add(projectile);effects.push({mesh:projectile,life:.42,max:.42,from:camera.position.clone(),to:dest.clone()});
  if(kind==='smoke'){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0x858982,transparent:true,opacity:.92,roughness:1,depthWrite:false,side:THREE.DoubleSide}));mesh.position.copy(dest);scene.add(mesh);smokes.push({pos:dest,mesh,radius:3.2,life:14});tone(120,.3,'sawtooth',.04);toast('Smoke deployed');}
  else{for(const b of state.bots){const eye=b.pos.clone().add(V(0,1.5,0));if(b.alive&&eye.distanceTo(dest)<16&&!blocked(dest,eye,false))b.blind=4;}const to=dest.clone().sub(camera.position).normalize(),look=V(0,0,-1).applyQuaternion(camera.quaternion);if(camera.position.distanceTo(dest)<14&&!blocked(camera.position,dest,false)&&look.dot(to)>.15)state.flashTime=2.3;tone(1800,.2,'sine',.08);toast('Flash deployed · looking away reduces exposure');}
}
function updatePlayer(dt){
  if(player.health<=0){player.vel.set(0,0,0);player.moving=0;state.interact=0;const ally=state.bots.find(b=>b.team==='ally'&&b.alive);if(ally){camera.position.copy(ally.pos).y+=1.7;camera.rotation.set(0,ally.group.rotation.y,0,'YXZ');}return;}
  if(state.phase==='buy'){
    player.vel.set(0,0,0);player.vy=0;player.moving=0;player.crouch=false;player.grounded=true;
  }else{
    player.crouch=keys.has('ControlLeft')||keys.has('KeyC');const targetHeight=player.crouch?1.08:1.68;player.height+=(targetHeight-player.height)*Math.min(1,dt*12);
    const walk=keys.has('ShiftLeft'),speed=(player.crouch?1.65:walk?2.2:4.8)*WEAPONS[state.weapon].speed*(state.scoped?.75:1);
    let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),r=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const length=Math.hypot(f,r)||1;f/=length;r/=length;
    const tx=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*r)*speed,tz=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*r)*speed;
    const accel=(f||r)?13:19;player.vel.x+=(tx-player.vel.x)*Math.min(1,dt*accel);player.vel.z+=(tz-player.vel.z)*Math.min(1,dt*accel);player.moving=Math.hypot(player.vel.x,player.vel.z);
    move(player.pos,player.vel.x*dt,player.vel.z*dt);if(keys.has('Space')&&player.grounded&&!player.crouch){player.vy=5;player.grounded=false;}player.vy-=15*dt;const floor=groundHeight(player.pos.x,player.pos.z);if(player.grounded&&Math.abs(player.pos.y-floor)<.35)player.pos.y=floor;player.pos.y=Math.max(floor,player.pos.y+player.vy*dt);if(player.pos.y===floor){player.grounded=true;player.vy=0;}else player.grounded=false;
  }
  camera.position.copy(player.pos).y+=player.height;camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
  if(firing)shoot();
  if(state.phase==='live'&&keys.has('KeyE')&&player.grounded&&player.moving<.5){
    if(state.side==='attack'&&!state.plant&&inSite(player.pos)){state.interact+=dt;if(state.interact>=3)plant(player.pos,'player');}
    else if(state.side==='defend'&&state.plant&&player.pos.distanceTo(state.plant.pos)<2.7){state.interact+=dt;if(state.interact>=5){state.defuses++;endRound(true,'Signal core defused.');}}
    else state.interact=0;
  }else state.interact=0;
}
function updateBotHitboxes(b){
 const lower=b.crouched?.55:0;
 for(const part of botParts.filter(p=>p.userData.bot===b)){if(part.userData.restY===undefined)part.userData.restY=part.position.y;part.position.y=part.userData.restY-(part.userData.restY>.85?lower:lower*.35);if(part.userData.restScaleY===undefined)part.userData.restScaleY=part.scale.y;part.scale.y=part.userData.restScaleY*(part.userData.restY<.85&&b.crouched?.65:1);}
}
function botFire(b,target,cfg,eye){
 if(b.reload>0)return;if(b.mag<=0){b.reload=2.2;return;}
 b.nextFire=cfg.interval;b.mag--;b.fireKick=1;b.flashTime=.05;
 const targetPoint=target.pos.clone().add(V(0,target===player?player.height:target.crouched?1:1.55,0)),distance=eye.distanceTo(targetPoint),dir=targetPoint.clone().sub(eye).normalize(),spread=cfg.spread*(distance<6?.65:1);
 dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();
 ray.set(eye,dir);ray.far=distance+1;scene.updateMatrixWorld(true);
 const hit=ray.intersectObjects([...hitWalls,...botParts.filter(p=>p.userData.bot.alive&&p.userData.bot!==b)],false)[0];
 const along=camera.position.clone().sub(eye).dot(dir),near=eye.clone().addScaledVector(dir,along);
 // The player capsule competes with every actual wall and bot hit volume.
 const playerHit=b.team==='enemy'&&player.health>0&&along>0&&near.distanceTo(camera.position)<.32&&(!hit||hit.distance>along);
 tracer(eye,playerHit?near:hit?hit.point:eye.clone().addScaledVector(dir,distance),0xaa9872);shotSound(true,eye);
 if(playerHit)hurt(18+Math.random()*7);
 else if(hit?.object.userData.bot){const victim=hit.object.userData.bot;if(victim.team!==b.team){victim.hp-=18+Math.random()*7;if(victim.hp<=0)killBot(victim,b);}}else if(hit){damageDestructible(hit.object.userData.destructible,hitWalls,debris,hit.point);}
}
function updateBots(dt){
 if(state.phase!=='live')return;
 const cfg=DIFFICULTY[state.difficulty];let defusing=false,pathBudget=3,senseBudget=6;
 for(const b of state.bots){
  if(!b.alive)continue;b.defusing=false;if(state.plant)b.planting=0;b.blind=Math.max(0,b.blind-dt);b.nextFire-=dt;b.nav-=dt;b.sense-=dt;b.decision-=dt;
  if(b.reload>0){b.reload=Math.max(0,b.reload-dt);if(b.reload===0)b.mag=30;}
  b.crouched=b.planting>0;updateBotHitboxes(b);
  const eye=b.pos.clone().add(V(0,b.crouched?1:1.55,0));
  if(b.target&&(b.target===player?player.health<=0:!b.target.alive)){b.target=null;b.visibleTarget=false;b.sense=0;b.seen=0;}
  if(b.sense<=0&&senseBudget>0){
   const candidates=state.bots.filter(o=>o!==b&&o.alive&&o.team!==b.team);
   if(b.team==='enemy'&&player.health>0)candidates.push(player);
   candidates.sort((a,c)=>a.pos.distanceToSquared(b.pos)-c.pos.distanceToSquared(b.pos));
   const old=b.target;b.target=null;b.visibleTarget=false;
   for(const target of candidates.slice(0,3)){
    const targetPoint=target===player?camera.position:target.pos.clone().add(V(0,target.crouched?1:1.55,0));
    if(eye.distanceTo(targetPoint)>=37||b.blind>0)continue;if(senseBudget<=0)break;senseBudget--;
    if(!blocked(eye,targetPoint)){b.target=target;b.visibleTarget=true;break;}
   }
   if(old!==b.target)b.seen=0;b.sense=.16+(b.id%4)*.012;
  }
  const canSee=b.visibleTarget&&b.target&&b.blind===0,distance=canSee?b.pos.distanceTo(b.target.pos):Infinity;
  if(canSee){b.lastKnown=b.target.pos.clone();b.memory=cfg.memory;b.seen+=dt;}else{b.seen=0;b.memory-=dt;}
  const urgent=b.side==='defend'&&state.plant||b.side==='attack'&&!state.plant&&state.time<22;
  // A single defender owns the progress clock, regardless of team size.
  if(b.side==='defend'&&state.plant&&b.pos.distanceTo(state.plant.pos)<2.3&&b.blind===0){
   if(!defusing&&!(state.side==='defend'&&state.interact>0)){state.plant.defuse+=dt;defusing=true;b.defusing=true;b.crouched=true;updateBotHitboxes(b);}
   if(state.plant.defuse>=7){endRound(b.team==='ally',b.team==='ally'?'Your teammate defused the core.':'The defenders defused your core.');return;}continue;
  }
  const wantsFight=canSee&&(!urgent||distance<9)&&!(b.personality==='OBJECTIVE'&&b.side==='attack'&&!state.plant&&inSite(b.pos));
  if(wantsFight){
   b.planting=0;b.group.rotation.y=Math.atan2(b.pos.x-b.target.pos.x,b.pos.z-b.target.pos.z);
   if(b.seen>=cfg.reaction&&b.nextFire<=0)botFire(b,b.target,cfg,eye);if(state.phase==='ended')return;
   if(b.personality!=='MARKSMAN'&&state.difficulty!=='easy'&&distance<20){const side=Math.sin(state.t*1.7+b.phase);moveBot(b,Math.cos(b.group.rotation.y)*side*dt*.8,-Math.sin(b.group.rotation.y)*side*dt*.8,dt);}
   if(b.personality!=='MARKSMAN'||distance>10)continue;
  }
  if(b.side==='attack'&&!state.plant&&inSite(b.pos)&&b.blind===0){b.planting+=dt;b.crouched=true;updateBotHitboxes(b);if(b.planting>=3)plant(b.pos,b.team==='ally'?'ally':'bot');continue;}
  b.planting=0;
  if(b.decision<=0){b.goal=!urgent&&b.lastKnown&&b.memory>0&&b.personality==='AGGRESSIVE'?b.lastKnown:botGoal(b,{state,player,map:MAPS[state.map],sites:[siteA,siteB],vector:V,canStand});b.goal=nearestClearGoal(b.goal,(x,z,r)=>canStand(x,z,r,groundHeight(x,z),true),V);b.goal.y=groundHeight(b.goal.x,b.goal.z);b.decision=.35+(b.id%5)*.025;}
  if(b.goal&&b.blind===0){
   if(!urgent&&b.personality==='CAUTIOUS'&&b.hp>=45&&state.t-(b.lastCoverPause??-10)>6&&b.pos.z<14){b.holdUntil=state.t+.4;b.lastCoverPause=state.t;}if((b.holdUntil||0)>state.t&&!urgent)continue;
   if(b.nav<=0&&pathBudget>0){b.path=pathTo(b.pos,b.goal);b.nav=.75+(b.id%3)*.07;pathBudget--;}
   if(b.path.length){const d=b.path[0].clone().sub(b.pos);d.y=0;if(d.length()<.25)b.path.shift();else{d.normalize();const cautious=b.personality==='CAUTIOUS'&&b.hp<45?.8:1;moveBot(b,d.x*cfg.speed*dt*cautious,d.z*cfg.speed*dt*cautious,dt);b.group.rotation.y=Math.atan2(-d.x,-d.z);}}
  }
 }
 if(state.plant&&!defusing&&!(state.side==='defend'&&state.interact>0))state.plant.defuse=0;
 checkElimination();
}
let lastSlots='',lastPips='';
function updateHUD(){
  $('scoreYou').textContent=state.wins;$('scoreBot').textContent=state.losses;$('phase').textContent=state.phase==='buy'?'BUY / ROUND '+state.round:state.plant?'CORE ARMED':'ROUND '+state.round;
  const t=Math.max(0,Math.ceil(state.plant?state.plant.time:state.time));$('timer').textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');$('health').textContent=Math.ceil(player.health);$('armor').textContent=Math.ceil(player.armor)+' ARMOR';$('cash').textContent='$'+state.money.toLocaleString();$('weaponName').textContent=state.reload?'RELOADING…':WEAPONS[state.weapon].name;
  const a=state.ammo[state.weapon];if(a)$('ammo').innerHTML=a.mag+' <em>/ '+a.reserve+'</em>';$('utility').textContent='G SMOKE ×'+state.smoke+'  ·  F FLASH ×'+state.flash;
  $('healthBar').style.width=player.health+'%';$('hostileCount').textContent=state.bots.filter(b=>b.alive&&b.team==='enemy').length;$('alliesCount').textContent=state.bots.filter(b=>b.alive&&b.team==='ally').length;$('timer').classList.toggle('urgent',t<=10&&state.phase==='live');$('pauseRound').textContent='ROUND '+state.round+' / '+state.difficulty.toUpperCase()+' / '+state.allyCount+' ALLIES / '+state.botCount+' ENEMIES';
  const slots=`<span class="${WEAPONS[state.weapon].slot==='primary'?'active':''}"><kbd>1</kbd> ${state.owned?WEAPONS[state.primary].name:'NO PRIMARY'}</span><span class="${WEAPONS[state.weapon].slot==='secondary'?'active':''}"><kbd>2</kbd> ${WEAPONS[state.secondary].name}</span>`;
  if(slots!==lastSlots){$('weaponSlots').innerHTML=slots;lastSlots=slots;}
  const pips=Array.from({length:4},(_,i)=>`<i class="${i<state.wins?'won':''}"></i>`).join('');if(pips!==lastPips){$('roundPips').innerHTML=pips;lastPips=pips;}
  $('reloadTrack').hidden=state.reload<=0;$('reloadTrack').firstElementChild.style.width=(100*(1-state.reload/WEAPONS[state.weapon].reload))+'%';
  $('crosshair').style.setProperty('--gap',crosshairGap(settings,player.moving,!player.grounded,state.shots)+'px');
  const nearby=state.plant?player.pos.distanceTo(state.plant.pos)<2.7:inSite(player.pos);
  $('objective').textContent=state.phase==='buy'?'MOVEMENT LOCKED · B TO BUY / '+state.difficulty.toUpperCase()+' BOTS':state.plant?(state.side==='attack'?'DEFEND THE CORE':nearby?'HOLD E · DEFUSE (5s)':'RETAKE THE SITE · DEFUSE THE CORE'):(state.side==='attack'?(nearby?'HOLD E · PLANT (3s)':'PLANT AT A OR B'):'DEFEND A AND B');
  if(state.phase==='live'&&!nearby){const door=nearbyDoor(doors,player.pos);if(door)$('objective').textContent='E · '+(door.open?'CLOSE':'OPEN')+' '+door.name;}
  $('progress').style.display=state.interact>0?'block':'none';$('progress').firstElementChild.style.width=(state.interact/(state.side==='attack'?3:5)*100)+'%';
  $('location').textContent=player.pos.z>18?'APPROACH':player.pos.z<-11?(player.pos.x<0?'A / '+MAPS[state.map].siteNames[0]:'B / '+MAPS[state.map].siteNames[1]):Math.abs(player.pos.x)<8?'MID / SERVICE ROUTE':player.pos.x<0?'WEST ACCESS':'EAST ACCESS';
  $('damage').style.opacity=state.damages;$('flash').style.opacity=Math.min(1,state.flashTime);$('hitmarker').style.opacity=state.hit>0?1:0;$('toast').style.opacity=state.notice>0?1:0;
}
function radar(){const ctx=$('radar').getContext('2d');ctx.clearRect(0,0,180,180);const sx=x=>90+x*2.6,sz=z=>90+z*2.6;ctx.fillStyle='#65706b';walls.forEach(w=>ctx.fillRect(sx(w.x-w.w/2),sz(w.z-w.d/2),w.w*2.6,w.d*2.6));ctx.fillStyle='#c8b686';ctx.font='bold 12px Arial';ctx.fillText('A',sx(siteA.x)-4,sz(siteA.z)+4);ctx.fillText('B',sx(siteB.x)-4,sz(siteB.z)+4);if(state.plant){ctx.strokeStyle='#dcaf70';ctx.beginPath();ctx.arc(sx(state.plant.pos.x),sz(state.plant.pos.z),5,0,Math.PI*2);ctx.stroke();}ctx.save();ctx.translate(sx(player.pos.x),sz(player.pos.z));ctx.rotate(-player.yaw);ctx.fillStyle='#eee7cf';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-3,4);ctx.lineTo(3,4);ctx.fill();ctx.restore();}
function scoreboard(){ $('reportScore').textContent=state.wins+' — '+state.losses;$('scoreRows').replaceChildren();for(const [name,info,dead] of [['YOU / '+state.side.toUpperCase(),state.kills+' K / '+state.deaths+' D / '+Math.ceil(player.health)+' HP',player.health<=0],...state.bots.map(b=>[(b.team==='ally'?'ALLY / ':'ENEMY / ')+b.name+' / '+b.personality,(b.alive?'ACTIVE / '+Math.max(0,Math.ceil(b.hp))+' HP':'ELIMINATED')+' / '+(state.roster.find(r=>r.id===b.id)?.kills||0)+' K / '+(state.roster.find(r=>r.id===b.id)?.deaths||0)+' D',!b.alive])]){const row=document.createElement('div');if(dead)row.className='dead';const n=document.createElement('span'),i=document.createElement('span');n.textContent=name;i.textContent=info;row.append(n,i);$('scoreRows').append(row);} }

$('start').onclick=startMatch;$('resume').onclick=()=>{ $('pause').hidden=true;lock();};$('quit').onclick=returnMenu;$('resultQuit').onclick=returnMenu;
$('next').onclick=()=>{if(state.wins===4||state.losses===4)startMatch();else{nextRound();lock();}};
$('closeBuy').onclick=()=>{$('buy').hidden=true;lock();};
document.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>buyItem(button.dataset.buy));
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===$('world'),shopping=!$('buy').hidden;state.paused=!locked||shopping;keys.clear();firing=false;if(locked&&!shopping){try{weaponAudio.unlock().catch(e=>console.warn('Audio unavailable',e));}catch{}if(state.reload>0)weaponAudio.reload(state.weapon,WEAPONS[state.weapon].reload,WEAPONS[state.weapon].reload-state.reload);else if(state.weapon==='sv98'&&state.lastShotWeapon==='sv98'&&state.t-state.lastShot<1.35)weaponAudio.bolt('sv98',state.t-state.lastShot);$('pause').hidden=true;}else{weaponAudio.stopHandling();setScoped(false);$('scoreboard').hidden=true;if(locked&&shopping)document.exitPointerLock();if(state.active&&state.phase!=='ended'&&!shopping){$('pause').hidden=false;$('resume').focus();}}});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==$('world')||state.paused)return;const sensitivity=settings.sensitivity*(state.scoped?WEAPONS[state.weapon].scope/settings.fov:1);player.yaw-=e.movementX*.002*sensitivity;player.pitch=clamp(player.pitch-e.movementY*.002*sensitivity,-1.45,1.45);weaponMotion.swayX=clamp(weaponMotion.swayX+e.movementX*.00045*sensitivity,-.045,.045);weaponMotion.swayY=clamp(weaponMotion.swayY+e.movementY*.00045*sensitivity,-.035,.035);});
document.addEventListener('mousedown',e=>{if(state.paused||!state.active)return;if(e.button===0){if(WEAPONS[state.weapon].automatic)firing=true;else shoot();}if(e.button===2)setScoped(!state.scoped);});document.addEventListener('mouseup',()=>firing=false);
document.addEventListener('contextmenu',e=>{if(state.active)e.preventDefault();});
document.addEventListener('wheel',e=>{if(state.active&&!state.paused&&!$('scoreboard').hidden){$('scoreboard').scrollTop+=e.deltaY;e.preventDefault();}},{passive:false});
$('world').onclick=()=>{if(state.active&&state.paused&&$('pause').hidden&&$('result').hidden&&$('buy').hidden)lock();};
document.addEventListener('keydown',e=>{
  if(!state.active)return;if(!state.paused&&['Space','Tab','ControlLeft'].includes(e.code))e.preventDefault();if(e.repeat)return;
  if(e.code==='Escape'&&state.paused&&state.phase!=='ended'){for(const id of ['buy','pause'])$(id).hidden=true;lock();return;}
  if(e.code==='Tab'&&!state.paused){scoreboard();$('scoreboard').hidden=false;return;}
  if(e.code==='KeyB'&&!state.paused){const spawn=spawnPoint(state.side);if(state.phase==='buy'&&player.pos.distanceTo(spawn)<8){state.paused=true;keys.clear();firing=false;weaponAudio.stopHandling();setScoped(false);$('scoreboard').hidden=true;refreshShop(state,player,'BUY TIMER PAUSED · Close equipment to resume.');$('buy').hidden=false;document.exitPointerLock();$('closeBuy').focus();}else toast('Buy only near spawn during the buy phase');return;}
  if(state.paused)return;if(e.code==='KeyE'&&state.phase==='live'&&player.health>0&&!((state.side==='attack'&&!state.plant&&inSite(player.pos))||(state.side==='defend'&&state.plant&&player.pos.distanceTo(state.plant.pos)<2.7))){toggleDoor(nearbyDoor(doors,player.pos),actorPositions());}keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='Digit1')equip(state.primary);if(e.code==='Digit2')equip(state.secondary);if(e.code==='KeyG')utility('smoke');if(e.code==='KeyF')utility('flash');
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab')$('scoreboard').hidden=true;});
window.addEventListener('blur',()=>{keys.clear();firing=false;if(document.pointerLockElement)document.exitPointerLock();});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();});
let last=performance.now(),menuT=0,beep=0,hudClock=0,radarClock=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04),paused=state.paused||!$('buy').hidden;last=now;
  if(!state.active){menuT+=dt;camera.position.set(19+Math.sin(menuT*.07)*2,10,24);camera.lookAt(-2,1,-10);}
  else if(!paused&&state.phase!=='ended'){
    state.playtime+=dt;weaponStats(state).time+=dt;state.sideSwitchTime=Math.max(0,state.sideSwitchTime-dt);$('sideSwitch').hidden=state.sideSwitchTime<=0;state.t+=dt;state.cooldown=Math.max(0,state.cooldown-dt);state.notice=Math.max(0,state.notice-dt);state.damages=Math.max(0,state.damages-dt);state.hit=Math.max(0,state.hit-dt);state.flashTime=Math.max(0,state.flashTime-dt);if(state.t-state.lastShot>.25)state.shots=Math.max(0,state.shots-dt*24);
    if(state.reload>0){state.reload-=dt;if(state.reload<=0){state.reload=0;const a=state.ammo[state.weapon],take=Math.min(WEAPONS[state.weapon].capacity-a.mag,a.reserve);a.mag+=take;a.reserve-=take;}}
    updateDoors(doors,dt,hitWalls,actorPositions());updatePlayer(dt);updateEnvironmentPresentation(dt);state.time-=dt;
    if(state.phase==='buy'&&state.time<=0){state.phase='live';state.time=90;toast('Operation live. Watch your angles.');}
    if(state.phase==='live'){
      updateBots(dt);
      if(state.phase==='live'&&state.plant){state.plant.time-=dt;beep-=dt;if(beep<=0){tone(800,.08,'sine',.07);beep=state.plant.time<10?.3:1;}if(state.plant.time<=0)endRound(state.side==='attack','The signal core completed its transmission.');}
      else if(state.phase==='live'&&state.time<=0)endRound(state.side==='defend','Time expired before a core was planted.');
    }
    for(let i=smokes.length-1;i>=0;i--){const s=smokes[i];s.life-=dt;s.mesh.scale.setScalar(s.radius*(.15+.85*ease(0,.38,14-s.life)));s.mesh.material.opacity=Math.min(.94,s.life/2);if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();smokes.splice(i,1);}}
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.from){const travel=clamp(1-e.life/e.max,0,1);e.mesh.position.lerpVectors(e.from,e.to,travel).y+=Math.sin(travel*Math.PI)*1.1;e.mesh.rotation.x+=dt*12;e.mesh.rotation.z+=dt*7;}if(e.life<=0){scene.remove(e.mesh);e.mesh.traverse(o=>{if(o.isMesh||o.isLine){o.geometry.dispose();if(o.isLine)o.material.dispose();}});effects.splice(i,1);}}
  }
  if(state.active){hudClock-=dt;radarClock-=dt;if(hudClock<=0){updateHUD();hudClock=.05;}if(radarClock<=0){radar();radarClock=.1;}const visualDt=paused&&state.phase!=='ended'?0:dt;updateWeaponPresentation(visualDt);updateBotPresentation(visualDt);}
  environmentAudio.sync(state.map,state.active&&!paused&&state.phase!=='ended');if(!state.active)atmosphere?.update(dt);
  renderCamera.position.copy(camera.position);renderCamera.quaternion.copy(camera.quaternion);renderCamera.aspect=camera.aspect;renderCamera.fov=state.active?damp(renderCamera.fov,camera.fov,20,paused&&state.phase!=='ended'?0:dt):camera.fov;renderCamera.updateProjectionMatrix();
  renderer.autoClear=true;renderer.render(scene,renderCamera);if(state.active&&player.health>0&&!state.scoped){renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);}
}
requestAnimationFrame(frame);
// Local development hook is opt-in and not enabled on a normal published URL.
if(new URLSearchParams(location.search).has('test'))window.__game={settings,state,player,DIFFICULTY,WEAPONS,pathTo,canStand,blocked,shoot,plant,endRound,nextRound,equip,reload,buyItem,setScoped,utility,updateBots,updatePlayer,updateWeaponPresentation,updateBotPresentation,scene,camera,viewCamera,models,gunRoot,weaponMotion,keys,MAPS,loadMap,botSpawnPositions,spawnPoint,siteA,siteB,mapRoot,walls,hitWalls,get environment(){return environment;},get operators(){return operators;},checkElimination,killBot,botFire,startMatch,returnMenu,updateHUD,scoreboard,moveBot,groundHeight,get doors(){return doors;},get destructibles(){return destructibles;},get atmosphere(){return atmosphere;},get worldBatch(){return worldBatch;},environmentAudio,debris,applySettings,renderer,renderCamera,viewScene,updateEnvironmentPresentation,updateDoors,toggleDoor,openDoorForBot,career};
