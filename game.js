import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { WEAPONS } from './weapons.js?v=0.4.0';
import { settings, refreshShop, showReport, showView } from './ui.js?v=0.4.0';
import { weaponAudio } from './audio.js?v=0.4.0';

// Original gameplay; all distances are meters and all times are seconds.
const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const DIFFICULTY = {
  easy: { reaction: .95, interval: .55, spread: .14, speed: 2.4, memory: 1.5 },
  normal: { reaction: .55, interval: .30, spread: .072, speed: 3, memory: 3 },
  hard: { reaction: .28, interval: .19, spread: .04, speed: 3.5, memory: 5 }
};
const state = { active:false, paused:true, phase:'menu', side:'attack', difficulty:'normal', round:0, wins:0, losses:0, kills:0, deaths:0, headshots:0, shotsFired:0, hits:0, money:3400, time:90, plant:null, interact:0, bots:[], weapon:'rifle', primary:'rifle', secondary:'pistol', owned:true, scoped:false, ammo:{}, smoke:1, flash:1, flashTime:0, shots:0, lastShot:-10, reload:0, cooldown:0, t:0, damages:0, hit:0, notice:0 };
const player = { pos:V(0,0,24), vel:V(), yaw:0, pitch:0, health:100, armor:0, height:1.68, vy:0, grounded:true, moving:0, crouch:false };
const keys = new Set(); let firing=false, audio=null, models={};
// Presentation has its own state: animation never affects aim or damage.
const weaponMotion={kick:0,equip:0,swayX:0,swayY:0,bob:0,magazine:null,magazineHome:null};
const walls=[], hitWalls=[], botParts=[], effects=[], smokes=[];
const scene = new THREE.Scene(); scene.background=new THREE.Color('#b3aca0'); scene.fog=new THREE.Fog('#b3aca0',43,110);
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'}); }
catch(e){throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(settings.fov,innerWidth/innerHeight,.04,180); camera.rotation.order='YXZ'; scene.add(camera);
const viewScene=new THREE.Scene(), viewCamera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,10);
viewScene.add(new THREE.HemisphereLight(0xe2e3dd,0x333b3c,1.8));
const weaponLight=new THREE.DirectionalLight(0xf2eee4,2.7);weaponLight.position.set(-2,3,1);viewScene.add(weaponLight);
const weaponRim=new THREE.DirectionalLight(0xbac6ce,1.1);weaponRim.position.set(3,1,-2);viewScene.add(weaponRim);
const gunRoot=new THREE.Group();viewScene.add(gunRoot);
function applySettings(){renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'?1:1.5));renderer.shadowMap.enabled=settings.quality!=='low';camera.fov=state.scoped?WEAPONS[state.weapon].scope:settings.fov;camera.updateProjectionMatrix();}
window.addEventListener('blacksite:settings',applySettings);applySettings();
function setScoped(value){state.scoped=!!value&&!!WEAPONS[state.weapon].scope&&state.reload===0;camera.fov=state.scoped?WEAPONS[state.weapon].scope:settings.fov;camera.updateProjectionMatrix();$('scope').hidden=!state.scoped;$('crosshair').hidden=state.scoped;}
const sun=new THREE.DirectionalLight(0xffe9c1,3.3);sun.position.set(-24,37,15);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:100});sun.shadow.bias=-.0004;scene.add(sun);
scene.add(new THREE.HemisphereLight(0xd1d5cd,0x665e4b,1.6));
const matCache=new Map();
function mat(color,roughness=.88){const k=color+':'+roughness;if(!matCache.has(k))matCache.set(k,new THREE.MeshStandardMaterial({color,roughness}));return matCache.get(k);}
function box(x,y,z,w,h,d,color,solid=false,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(solid){walls.push({x,z,w,d,minY:y-h/2,maxY:y+h/2});hitWalls.push(mesh);}return mesh;}
function cylinder(x,y,z,r,h,color,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function capsule(x,y,z,r,length,color,parent){const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,length,4,8),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sign(text,x,y,z,rot=0,width=3,height=1,color='#c7c1ac'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#333c3c';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='bold 68px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:tex,roughness:1}));m.position.set(x,y,z);m.rotation.y=rot;scene.add(m);return m;
}
function concreteTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#ededeb';ctx.fillRect(0,0,256,256);
  let seed=721;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5500;i++){const shade=205+Math.floor(random()*44);ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,6);texture.anisotropy=4;return texture;
}
const concrete=concreteTexture(),floorTexture=concrete.clone();floorTexture.repeat.set(32,40);
function weathered(mesh,floor=false){mesh.material=mesh.material.clone();mesh.material.map=floor?floorTexture:concrete;mesh.material.roughness=.96;return mesh;}
const siteA=V(-15,0,-18),siteB=V(15,0,-18);
function buildMap(){
  box(0,-.3,0,130,.6,140,0x948771);
  weathered(box(0,-.045,0,47,.09,59,0x8f8c80),true);
  // Perimeter and independent routes; intentionally not a recreation of an existing map.
  weathered(box(-24,3,0,1,6,61,0x9e9889,true));weathered(box(24,3,0,1,6,61,0x9e9889,true));
  weathered(box(0,3,-30,49,6,1,0x969689,true));weathered(box(0,3,30,49,6,1,0x969689,true));
  const sections=[[-8,7,1,20],[8,7,1,20],[-8,-15,1,12],[8,-15,1,12],[-16,16,9,1],[16,16,9,1],[0,-9,9,1],[-16,-8,9,1],[16,-8,9,1],[0,18,7,1]];
  sections.forEach(([x,z,w,d],i)=>{weathered(box(x,2.2,z,w,4.4,d,i%2?0xaca89b:0x92988e,true));box(x,4.45,z,w+.15,.15,d+.15,0x656b67);});
  // Reactor hall beams, upper clerestory, rooftop service units.
  box(16,5.2,-18,14,.35,20,0x737b77);
  [-23,-12].forEach(z=>[-22,10,22].forEach(x=>box(x,2.6,z,.28,5.2,.28,0x535e5b)));
  box(16,6.1,-20,7,1.5,4,0x5d6664);box(16,7,-20,6,.3,3,0x384345);
  for(let z=-27;z<25;z+=4){box(-23.4,1.1,z,.06,.09,2,0x655b47);box(23.4,1.1,z,.06,.09,2,0x655b47);}
  // Solar canopy and panel divisions.
  for(let x=-21;x<-10;x+=3.8){box(x,3.8,-26,3.5,.16,5,0x343f45);for(let z=-28;z<-23;z+=.6)box(x,3.89,z,3.5,.02,.03,0x718084);box(x,1.8,-27,.15,3.6,.15,0x505b59);}
  const covers=[[-16,-19,3,2.3,3],[15,-19,3,2.3,3],[-18,4,3,1.5,3],[18,3,3,1.5,3],[-3,1,2,2.2,3],[3,-4,2,1.4,2],[-18,-2,2,2,2],[13,9,2,2,2],[0,-22,4,2.1,2]];
  covers.forEach(([x,z,w,h,d])=>{box(x,h/2,z,w,h,d,0x676d60,true);for(let dy=.15;dy<h;dy+=.5)box(x,dy,z+d/2+.01,w-.12,.035,.035,0x444d49);box(x,h+.07,z,w+.12,.14,d+.12,0x414d49);});
  for(const [site,letter] of [[siteA,'A'],[siteB,'B']]){
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.2,3.28,48),new THREE.MeshBasicMaterial({color:0xc3ae7a,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(site).y=.01;scene.add(ring);
    sign(letter,site.x,3.1,-29.44,0,2.4,1.7);sign(letter,site.x,2.9,-7.43,0,1.2,.8);
  }
  sign('HELIX / RESEARCH',0,3.4,-29.44,0,7,1.1);sign('01  /  SOLAR',-23.44,3,-13,Math.PI/2,5,.8);sign('02  /  REACTOR',23.44,3,-13,-Math.PI/2,5,.8);
  sign('AUTHORIZED PERSONNEL',0,2.6,18.56,0,3,.48);
  [-21,21].forEach(x=>{cylinder(x,1,-25,.65,2,0x7d7a69);cylinder(x,1,-23,.65,2,0x7d7a69);});
  for(let z=-26;z<26;z+=8){box(-23.4,4.5,z,.15,.25,1.4,0xb6ad84);box(23.4,4.5,z,.15,.25,1.4,0xb6ad84);}
  // Desert backdrop: low geometry, stable across runs.
  for(let i=0;i<25;i++){const a=i*.68,r=55+(i%4)*8;const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),mat(i%2?0x9b8a70:0x877d67));rock.position.set(Math.cos(a)*r,2,Math.sin(a)*r);rock.scale.set(6+i%5,5+i%8,7+i%3);rock.rotation.set(.2*i,i,.3);scene.add(rock);}
  for(let i=0;i<12;i++)box(-22+i*4,.014,26,1.8,.02,.12,0xb9ad85);
}
buildMap();
// Segment visibility is shared by bots, utilities, and the player.
const ray=new THREE.Raycaster();
function blocked(a,b,smoke=true){const delta=b.clone().sub(a),len=delta.length();ray.set(a,delta.normalize());ray.far=len;const hits=ray.intersectObjects(hitWalls,false);if(hits.length)return true;if(smoke)for(const s of smokes){const p=s.pos.clone().sub(a);const t=clamp(p.dot(delta),0,len);if(a.clone().addScaledVector(delta,t).distanceTo(s.pos)<s.radius)return true;}return false;}
function canStand(x,z,r=.34){return Math.abs(x)<23.3&&Math.abs(z)<29.3&&!walls.some(w=>x>w.x-w.w/2-r&&x<w.x+w.w/2+r&&z>w.z-w.d/2-r&&z<w.z+w.d/2+r);}
function move(pos,dx,dz){if(canStand(pos.x+dx,pos.z))pos.x+=dx;if(canStand(pos.x,pos.z+dz))pos.z+=dz;}
const GRID=1.5,NX=31,NZ=39;
const cell=(x,z)=>({x:clamp(Math.round((x+22.5)/GRID),0,NX-1),z:clamp(Math.round((z+28.5)/GRID),0,NZ-1)});
const point=(x,z)=>V(x*GRID-22.5,0,z*GRID-28.5);
function pathTo(start,end){
  const a=cell(start.x,start.z),b=cell(end.x,end.z),key=(x,z)=>z*NX+x,prev=new Int32Array(NX*NZ).fill(-1),queue=[key(a.x,a.z)];prev[queue[0]]=queue[0];let goal=-1,best=Infinity;
  for(let i=0;i<queue.length;i++){const k=queue[i],x=k%NX,z=Math.floor(k/NX),d=(x-b.x)**2+(z-b.z)**2;if(d<best){best=d;goal=k;}if(d===0)break;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,n=key(xx,zz);if(xx<0||xx>=NX||zz<0||zz>=NZ||prev[n]!==-1)continue;const p=point(xx,zz);if(!canStand(p.x,p.z,.43))continue;prev[n]=k;queue.push(n);}}
  const path=[];if(goal<0)return path;for(let k=goal;k!==queue[0];k=prev[k]){if(k<0)break;path.push(point(k%NX,Math.floor(k/NX)));}return path.reverse();
}
function makeBot(i,pos){
  const group=new THREE.Group();scene.add(group);group.position.copy(pos);
  const b={id:i,name:['WARDEN','SENTRY','NOMAD'][i],group,pos:group.position,hp:100,alive:true,seen:0,nextFire:0,nav:0,path:[],lastKnown:null,memory:0,blind:0,planting:0,phase:i*2,head:null};
  // Keep the original gameplay hit volumes independent from the visible rig.
  const torso=box(0,1.1,0,.56,.64,.33,0x3b4441,false,group);torso.userData={bot:b,zone:'body'};torso.visible=false;botParts.push(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.20,10,8),mat(0x8a8874));head.position.y=1.64;head.scale.y=1.15;head.castShadow=true;head.userData={bot:b,zone:'head'};group.add(head);botParts.push(head);b.head=head;
  head.visible=false;
  b.rig=new THREE.Group();group.add(b.rig);
  capsule(0,1.13,0,.24,.22,0x474d44,b.rig).scale.z=.68;
  const vest=box(0,1.12,-.12,.46,.52,.13,0x313b3a,false,b.rig);
  for(const x of [-.15,0,.15])box(x,1.01,-.20,.12,.18,.075,0x515950,false,b.rig);
  box(0,.81,0,.46,.065,.32,0x262e2d,false,b.rig);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.20,16,12),mat(0x62695b));helmet.position.set(0,1.66,0);helmet.scale.set(1,1.05,1.03);helmet.castShadow=true;b.rig.add(helmet);
  capsule(0,1.52,-.035,.135,.08,0x363e39,b.rig);
  box(0,1.67,-.181,.31,.09,.055,0x171e20,false,b.rig);
  b.legs=[];
  for(const x of [-.15,.15]){
    const hit=box(x,.44,0,.22,.78,.26,0x50584b,false,group);hit.userData={bot:b,zone:'body'};hit.visible=false;botParts.push(hit);
    const hip=new THREE.Group();hip.position.set(x,.80,0);b.rig.add(hip);b.legs.push(hip);
    capsule(0,-.17,0,.105,.19,0x50584b,hip);
    const knee=new THREE.Group();knee.position.y=-.40;hip.add(knee);hip.userData.knee=knee;
    capsule(0,-.11,0,.09,.14,0x50584b,knee);
    box(0,.02,-.073,.15,.17,.06,0x333d3a,false,knee);
    box(0,-.32,-.055,.20,.13,.32,0x282f2c,false,knee);
  }
  for(const x of [-.38,.38]){const hit=box(x,1.08,-.1,.18,.58,.2,0x68705e,false,group);hit.userData={bot:b,zone:'body'};hit.visible=false;botParts.push(hit);}
  for(const x of [-.31,.31]){
    const shoulder=new THREE.Group();shoulder.position.set(x,1.34,-.01);b.rig.add(shoulder);shoulder.rotation.x=-.5;shoulder.rotation.z=x<0?-.2:.2;
    capsule(0,-.14,0,.092,.16,0x596152,shoulder);
    const forearm=new THREE.Group();forearm.position.y=-.26;forearm.rotation.x=-1.2;shoulder.add(forearm);
    capsule(0,-.13,0,.075,.15,0x596152,forearm);capsule(0,-.27,0,.07,.04,0x2c3534,forearm);
  }
  if(models.rifle){const gun=models.rifle.clone(true);gun.scale.multiplyScalar(.72);gun.position.set(.16,1.17,-.21);b.rig.add(gun);}
  b.walk=0;b.fall=0;b.viewYaw=0;b.previous=pos.clone();
  return b;
}
function clearBots(){state.bots.forEach(b=>{scene.remove(b.group);b.group.traverse(o=>{if(o.isMesh&&!o.userData.asset)o.geometry.dispose();});});state.bots=[];botParts.length=0;}
function disposeViewParts(){gunRoot.traverse(o=>{if(o.isMesh&&o.userData.viewPart)o.geometry.dispose();});gunRoot.clear();}
function addGrip(type){
  const glove=0x303938,sleeve=0x4a5148;
  function arm(a,b){const delta=b.clone().sub(a),mesh=capsule(0,0,0,.033,Math.max(.01,delta.length()-.066),sleeve,gunRoot);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());mesh.userData.viewPart=true;}
  function hand(x,y,z,angle){const mesh=capsule(x,y,z,.027,.065,glove,gunRoot);mesh.rotation.x=angle;mesh.userData.viewPart=true;}
  if(WEAPONS[type].slot==='primary'){arm(V(.23,-.23,.38),V(.015,-.07,.22));hand(.015,-.055,.22,.18);arm(V(-.13,-.25,.36),V(-.018,-.04,-.06));hand(-.018,-.03,-.06,-.2);}
  else{arm(V(.16,-.24,.25),V(.015,-.095,.10));hand(.015,-.085,.10,.3);}
}
function loadGun(type){
  disposeViewParts();if(!models[type])return;
  const g=models[type].clone(true);g.rotation.y=WEAPONS[type].viewRotationY||0;g.scale.multiplyScalar(WEAPONS[type].viewScale||1);gunRoot.add(g);addGrip(type);
  weaponMotion.magazine=g.getObjectByName('Magazine')??null;weaponMotion.magazineHome=weaponMotion.magazine?.position.clone()??null;weaponMotion.cycling=g.getObjectByName('Slide')||g.getObjectByName('Bolt');weaponMotion.cyclingHome=weaponMotion.cycling?.position.clone()??null;
  Object.assign(weaponMotion,{kick:0,equip:1,swayX:0,swayY:0,bob:0});
  gunRoot.position.fromArray(WEAPONS[type].pose);gunRoot.rotation.set(0,0,0);
}
function prepareModel(g,targetLength,muted=false){
  const bounds=new THREE.Box3().setFromObject(g),s=bounds.getSize(V()),center=bounds.getCenter(V());g.position.sub(center);const wrapper=new THREE.Group();wrapper.add(g);wrapper.scale.setScalar(targetLength/Math.max(s.x,s.y,s.z));wrapper.updateMatrixWorld(true);
  const materials=new Map();
  g.traverse(o=>{if(o.isMesh){o.userData.asset=true;o.castShadow=true;o.receiveShadow=true;
    const prepare=source=>{if(materials.has(source))return materials.get(source);const material=source.clone();if(muted){material.color.set(0xaab2ac);material.roughness=.72;material.metalness=.18;material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.94, 1.0, 0.96);');};material.customProgramCacheKey=()=> 'muted-palette-v1';}materials.set(source,material);return material;};
    o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
  }});return wrapper;
}
async function loadAssets(){const loader=new GLTFLoader();try{const entries=Object.entries(WEAPONS);const loaded=await Promise.all([...entries.map(([,w])=>w.model),'crate-medium'].map(n=>loader.loadAsync('./assets/'+n+'.glb?v=0.4.0')));entries.forEach(([key,w],i)=>models[key]=prepareModel(loaded[i].scene,w.length,key==='pistol'));const crate=prepareModel(loaded.at(-1).scene,1.8,true);for(const [x,z] of [[-21,12],[21,12],[-11,-26],[11,-26]]){const m=crate.clone(true);m.position.set(x,.9,z);scene.add(m);walls.push({x,z,w:1.8,d:1.8});m.traverse(o=>{if(o.isMesh)hitWalls.push(o);});}loadGun('rifle');$('start').disabled=false;$('start').innerHTML='DEPLOY TO COMPOUND <span>↗</span>';}catch(e){console.error(e);$('start').textContent='ASSET LOAD FAILED';$('compatibility').hidden=false;$('compatibility').textContent='The compound could not load. Reload the page, or check that the complete game folder is hosted.';}}
loadAssets();

function updateWeaponPresentation(dt){
  const smooth=1-Math.exp(-16*dt),speed=player.moving;
  weaponMotion.kick*=Math.exp(-18*dt);weaponMotion.equip*=Math.exp(-11*dt);
  weaponMotion.swayX*=Math.exp(-10*dt);weaponMotion.swayY*=Math.exp(-10*dt);
  weaponMotion.bob+=dt*speed*2.7;
  const progress=state.reload>0?clamp(1-state.reload/WEAPONS[state.weapon].reload,0,1):0;
  const dip=state.reload>0?Math.sin(progress*Math.PI):0;
  const pose=WEAPONS[state.weapon].pose,kick=weaponMotion.kick,bob=weaponMotion.bob;
  const target=V(pose[0]+Math.sin(bob)*speed*.0018+weaponMotion.swayX*.04,
    pose[1]-Math.abs(Math.cos(bob))*speed*.0012-dip*.14-weaponMotion.equip*.18,
    pose[2]+kick*.036+dip*.035);
  gunRoot.position.lerp(target,smooth);
  gunRoot.rotation.set(kick*.08+weaponMotion.swayY-dip*.18,.035+weaponMotion.swayX,-dip*.45-weaponMotion.swayX*.5+Math.sin(bob)*speed*.0015);
  if(weaponMotion.cycling){const cycle=state.lastShotWeapon===state.weapon?Math.sin(Math.PI*clamp(state.cooldown/WEAPONS[state.weapon].interval,0,1)):0;weaponMotion.cycling.position.copy(weaponMotion.cyclingHome).z+=cycle*.025;}
  if(weaponMotion.magazine){const out=state.reload>0?Math.sin(clamp((progress-.12)/.72,0,1)*Math.PI):0;weaponMotion.magazine.position.copy(weaponMotion.magazineHome).y-=out*.18;weaponMotion.magazine.rotation.z=out*.18;}
}
function updateBotPresentation(dt){
  for(const b of state.bots){
    if(!b.alive){b.fall=THREE.MathUtils.damp(b.fall,1,12,dt);b.rig.rotation.x=-b.fall*Math.PI/2;b.rig.position.y=b.fall*.16;continue;}
    const distance=b.pos.distanceTo(b.previous),speed=Math.min(1,distance/Math.max(.001,dt)/DIFFICULTY[state.difficulty].speed);
    b.previous.copy(b.pos);b.walk+=distance*5.4;
    const angle=Math.atan2(Math.sin(b.group.rotation.y-b.viewYaw),Math.cos(b.group.rotation.y-b.viewYaw));b.viewYaw+=angle*(1-Math.exp(-15*dt));b.rig.rotation.y=b.viewYaw-b.group.rotation.y;
    b.rig.position.y=Math.sin(b.walk*2)*speed*.009;
    for(let i=0;i<2;i++){const leg=b.legs[i],stride=Math.sin(b.walk+(i?Math.PI:0))*speed*.40;leg.rotation.x=THREE.MathUtils.damp(leg.rotation.x,stride,14,dt);leg.userData.knee.rotation.x=Math.max(0,-stride)*.8;}
  }
}

function tone(freq,duration=.08,type='triangle',gain=.08){if(!audio||settings.volume===0)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(freq*.35,30),audio.currentTime+duration);g.gain.setValueAtTime(gain*settings.volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function shotSound(enemy=false,position){const offset=position?.clone().sub(camera.position),distance=offset?.length()||0;const pan=offset?Math.cos(player.yaw)*offset.x/distance-Math.sin(player.yaw)*offset.z/distance:0;weaponAudio.shot(enemy?'rifle':state.weapon,{enemy,distance,pan:Number.isFinite(pan)?pan:0});}
function toast(text){$('toast').textContent=text;state.notice=2.6;}
function feed(text){const node=document.createElement('div');node.textContent=text;$('feed').prepend(node);while($('feed').children.length>4)$('feed').lastChild.remove();}
function lock(){if(!state.active)return;try{const p=$('world').requestPointerLock();if(p?.catch)p.catch(()=>{state.paused=true;$('pause').hidden=false;toast('Click Resume to capture your mouse.');});}catch(e){state.paused=true;$('pause').hidden=false;toast('Mouse capture requires a desktop browser.');}}
function startMatch(){try{weaponAudio.setVolume(settings.volume);weaponAudio.unlock().catch(e=>console.warn('Audio unavailable',e));audio=weaponAudio.context;}catch(e){console.warn('Audio unavailable',e);}Object.assign(state,{active:true,paused:false,side:$('side').value,difficulty:$('difficulty').value,round:0,wins:0,losses:0,kills:0,deaths:0,headshots:0,hits:0,shotsFired:0,money:3400,primary:settings.primary,secondary:settings.secondary||'pistol',owned:true});$('menu').hidden=true;$('hud').hidden=false;$('result').hidden=true;nextRound();lock();}
function nextRound(){
  weaponAudio.stopAll();
  clearBots();for(const s of smokes)scene.remove(s.mesh);smokes.length=0;for(const e of effects){scene.remove(e.mesh);e.mesh.geometry?.dispose();}effects.length=0;
  if(coreMesh){scene.remove(coreMesh);coreMesh=null;}
  Object.assign(state,{round:state.round+1,phase:'buy',time:12,plant:null,interact:0,paused:false,reload:0,cooldown:0,shots:0,lastShot:-10,lastShotWeapon:null,smoke:1,flash:1,flashTime:0,damages:0,hit:0,weapon:state.owned?state.primary:state.secondary,roundBaseline:{kills:state.kills,headshots:state.headshots,shotsFired:state.shotsFired,hits:state.hits}});setScoped(false);
  for(const [k,w] of Object.entries(WEAPONS))state.ammo[k]={mag:w.capacity,reserve:w.reserve};
  Object.assign(player,{health:100,armor:0,yaw:state.side==='attack'?0:Math.PI,pitch:0,vy:0,grounded:true,height:1.68});player.vel.set(0,0,0);player.pos.set(state.side==='attack'?0:-3,0,state.side==='attack'?26:-26);
  const spawns=state.side==='attack'?[[-14,-24],[14,-24],[0,-16]]:[[-15,25],[0,25],[15,25]];
  state.bots=spawns.map(([x,z],i)=>makeBot(i,V(x,0,z)));for(const id of ['result','buy','pause','scoreboard'])$(id).hidden=true;$('feed').innerHTML='';loadGun(state.weapon);toast('Buy phase · B opens equipment · first to four wins');refreshShop(state,player,'Survive to keep both weapons. Elimination issues a free P-9.');updateHUD();
}
function returnMenu(){weaponAudio.stopAll();state.active=false;state.phase='menu';state.paused=true;setScoped(false);document.exitPointerLock();for(const id of ['hud','pause','buy','result','scoreboard'])$(id).hidden=true;$('menu').hidden=false;showView('deploy');keys.clear();firing=false;}
function endRound(win,reason){if(state.phase==='ended')return;weaponAudio.stopHandling();state.phase='ended';state.paused=true;firing=false;state.reload=0;state.interact=0;win?state.wins++:state.losses++;state.money=Math.min(16000,state.money+(win?3000:1900));if(player.health<=0){state.owned=false;state.secondary='pistol';}
  setScoped(false);showReport(state,win,reason);$('result').hidden=false;$('buy').hidden=true;$('pause').hidden=true;$('scoreboard').hidden=true;document.exitPointerLock();tone(win?550:160,.3,'triangle',.18);updateHUD();}
function reload(){const a=state.ammo[state.weapon],w=WEAPONS[state.weapon];if(state.reload||a.mag===w.capacity||a.reserve===0||state.phase==='ended')return;setScoped(false);state.reload=w.reload;firing=false;weaponAudio.reload(state.weapon,w.reload);toast('Reloading…');}
function equip(k){if(!WEAPONS[k]||(WEAPONS[k].slot==='primary'?(!state.owned||state.primary!==k):state.secondary!==k))return;state.weapon=k;state.lastShotWeapon=null;state.reload=0;state.shots=0;firing=false;setScoped(false);loadGun(k);weaponAudio.equip(k);}
function buyItem(item){
  const spawn=state.side==='attack'?V(0,0,26):V(-3,0,-26),w=WEAPONS[item],cost=w?.price??{armor:650,smoke:300,flash:200}[item];
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
  if(state.phase!=='live'||state.reload||state.cooldown>0)return;
  const w=WEAPONS[state.weapon],a=state.ammo[state.weapon];if(a.mag===0){if(a.reserve>0)reload();else{weaponAudio.empty(state.weapon);state.cooldown=.24;}return;}
  a.mag--;state.shotsFired++;state.cooldown=w.interval;if(!w.automatic)firing=false;if(state.t-state.lastShot>.28)state.shots=0;state.shots++;state.lastShot=state.t;state.lastShotWeapon=state.weapon;weaponMotion.kick=Math.min(1.8,weaponMotion.kick+1);
  const spread=(state.scoped?.00045:w.spread)+player.moving*w.movement+(player.grounded?0:.09)+Math.min(state.shots-1,12)*w.bloom;
  const dir=V(0,0,-1).applyQuaternion(camera.quaternion);dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();
  ray.set(camera.position,dir);ray.far=85;scene.updateMatrixWorld(true);const hit=ray.intersectObjects([...hitWalls,...botParts.filter(p=>p.userData.bot.alive)],false)[0];const end=hit?hit.point:camera.position.clone().addScaledVector(dir,80);
  tracer(camera.position.clone().add(V(0,-.10,0)),end);shotSound();
  if(hit?.object.userData.bot){state.hits++;const b=hit.object.userData.bot,head=hit.object.userData.zone==='head';b.hp-=head?w.head:w.damage*.78;state.hit=.14;$('hitmarker').style.color=head?'#c9ad78':'#f1f0dd';tone(head?950:650,.045,'triangle',.10);if(b.hp<=0){b.alive=false;state.kills++;if(head)state.headshots++;state.money=Math.min(16000,state.money+300);feed('YOU  /  '+w.name+'  /  '+(head?'HEADSHOT  /  ':'')+b.name);if(!state.bots.some(b=>b.alive)&&!(state.side==='defend'&&state.plant))endRound(true,'All hostiles eliminated.');}}
  else if(hit){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,4,4),mat(0x313831));m.position.copy(end);scene.add(m);effects.push({mesh:m,life:8,max:8});}
  // Original recoil curve: vertical climb, then alternating horizontal pull.
  player.pitch=clamp(player.pitch+w.recoil+Math.min(state.shots,9)*w.climb,-1.45,1.45);
  player.yaw+=Math.sin(state.shots*.85)*Math.min(state.shots,12)*w.horizontal;
}
function hurt(amount){const reduction=player.armor>0?.65:1;player.health=Math.max(0,player.health-amount*reduction);player.armor=Math.max(0,player.armor-amount*.35);state.damages=.65;if(player.health===0){state.deaths++;feed('HELIX  /  YOU');endRound(false,'You were eliminated.');}}
let coreMesh=null;
function plant(pos,owner){state.plant={pos:pos.clone(),time:40,owner,defuse:0};state.interact=0;coreMesh=new THREE.Group();box(0,.12,0,.45,.24,.6,0x303c3b,false,coreMesh);box(0,.25,0,.2,.02,.25,0xc1a96e,false,coreMesh);coreMesh.position.copy(pos);scene.add(coreMesh);toast('SIGNAL CORE ARMED · 40 SECONDS');feed(owner==='player'?'YOU / CORE ARMED':'HELIX / CORE ARMED');tone(750,.3,'square',.10);}
function inSite(pos){return pos.distanceTo(siteA)<4.5||pos.distanceTo(siteB)<4.5;}
function utility(kind){
  if(state.phase!=='live'||state[kind]<1)return;state[kind]--;const dir=V(0,0,-1).applyQuaternion(camera.quaternion);const dest=camera.position.clone().addScaledVector(dir,10);ray.set(camera.position,dir);ray.far=10;const h=ray.intersectObjects(hitWalls,false)[0];if(h)dest.copy(h.point).addScaledVector(dir,-.6);dest.y=1;
  if(kind==='smoke'){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0x858982,transparent:true,opacity:.92,roughness:1,depthWrite:false,side:THREE.DoubleSide}));mesh.position.copy(dest);scene.add(mesh);smokes.push({pos:dest,mesh,radius:3.2,life:14});tone(120,.3,'sawtooth',.04);toast('Smoke deployed');}
  else{for(const b of state.bots){const eye=b.pos.clone().add(V(0,1.5,0));if(b.alive&&eye.distanceTo(dest)<16&&!blocked(dest,eye,false))b.blind=4;}const to=dest.clone().sub(camera.position).normalize(),look=V(0,0,-1).applyQuaternion(camera.quaternion);if(camera.position.distanceTo(dest)<14&&!blocked(camera.position,dest,false)&&look.dot(to)>.15)state.flashTime=2.3;tone(1800,.2,'sine',.08);toast('Flash deployed · looking away reduces exposure');}
}
function updatePlayer(dt){
  player.crouch=keys.has('ControlLeft')||keys.has('KeyC');const targetHeight=player.crouch?1.08:1.68;player.height+=(targetHeight-player.height)*Math.min(1,dt*12);
  const walk=keys.has('ShiftLeft'),speed=(player.crouch?1.65:walk?2.2:4.8)*WEAPONS[state.weapon].speed*(state.scoped?.75:1);
  let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),r=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const length=Math.hypot(f,r)||1;f/=length;r/=length;
  const tx=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*r)*speed,tz=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*r)*speed;
  const accel=(f||r)?13:19;player.vel.x+=(tx-player.vel.x)*Math.min(1,dt*accel);player.vel.z+=(tz-player.vel.z)*Math.min(1,dt*accel);player.moving=Math.hypot(player.vel.x,player.vel.z);
  move(player.pos,player.vel.x*dt,player.vel.z*dt);if(keys.has('Space')&&player.grounded&&!player.crouch){player.vy=5;player.grounded=false;}player.vy-=15*dt;player.pos.y=Math.max(0,player.pos.y+player.vy*dt);if(player.pos.y===0){player.grounded=true;player.vy=0;}
  camera.position.copy(player.pos).y+=player.height;camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
  if(firing)shoot();
  if(state.phase==='live'&&keys.has('KeyE')&&player.grounded&&player.moving<.5){
    if(state.side==='attack'&&!state.plant&&inSite(player.pos)){state.interact+=dt;if(state.interact>=3)plant(player.pos,'player');}
    else if(state.side==='defend'&&state.plant&&player.pos.distanceTo(state.plant.pos)<2.7){state.interact+=dt;if(state.interact>=5)endRound(true,'Signal core defused.');}
    else state.interact=0;
  }else state.interact=0;
}
function updateBots(dt){
  const cfg=DIFFICULTY[state.difficulty];
  let defusing=false;
  for(const b of state.bots){
    if(!b.alive)continue;b.blind=Math.max(0,b.blind-dt);b.nextFire-=dt;b.nav-=dt;
    const eye=b.pos.clone().add(V(0,1.55,0)),distance=eye.distanceTo(camera.position),canSee=distance<37&&b.blind===0&&!blocked(eye,camera.position);
    let goal=null;
    if(canSee){b.seen+=dt;b.lastKnown=player.pos.clone();b.memory=cfg.memory;b.group.rotation.y=Math.atan2(b.pos.x-player.pos.x,b.pos.z-player.pos.z);
      if(b.seen>=cfg.reaction&&b.nextFire<=0){b.nextFire=cfg.interval;const dir=camera.position.clone().sub(eye).normalize();const spread=cfg.spread*(distance<6?.65:1);dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();ray.set(eye,dir);ray.far=distance+1;const block=ray.intersectObjects(hitWalls,false)[0];const along=camera.position.clone().sub(eye).dot(dir),near=eye.clone().addScaledVector(dir,along),hit=near.distanceTo(camera.position)<.32&&(!block||block.distance>along);tracer(eye,block?block.point:eye.clone().addScaledVector(dir,distance),0xaa9872);shotSound(true,eye);if(hit)hurt(18+Math.random()*7);if(state.phase==='ended')return;}
      // Hard bots make small strafes between bursts; easy bots hold still to shoot.
      if(state.difficulty!=='easy'&&distance<20){const side=Math.sin(state.t*1.7+b.phase);move(b.pos,Math.cos(b.group.rotation.y)*side*dt*.8,-Math.sin(b.group.rotation.y)*side*dt*.8);}
    }else{
      b.seen=0;b.memory-=dt;
      if(state.plant){goal=state.plant.pos;if(state.side==='attack'&&b.pos.distanceTo(goal)<2.3){if(!defusing){state.plant.defuse+=dt;defusing=true;}if(state.plant.defuse>=7){endRound(false,'The defenders defused your core.');return;}continue;}}
      else if(b.lastKnown&&b.memory>0)goal=b.lastKnown;
      else if(state.side==='defend')goal=b.id===1?siteB:siteA;
      else {const patrol=[V(-16,0,-12),V(16,0,-12),V(0,0,-4),V(-16,0,9),V(16,0,9)];goal=patrol[(b.id+Math.floor(state.t/11))%patrol.length];}
      if(state.side==='defend'&&!state.plant&&inSite(b.pos)){b.planting+=dt;if(b.planting>=3){plant(b.pos,'bot');}continue;}b.planting=0;
      if(goal&&b.blind===0){if(b.nav<=0){b.path=pathTo(b.pos,goal);b.nav=.8;}if(b.path.length){const d=b.path[0].clone().sub(b.pos);d.y=0;if(d.length()<.25)b.path.shift();else{d.normalize();move(b.pos,d.x*cfg.speed*dt,d.z*cfg.speed*dt);b.group.rotation.y=Math.atan2(-d.x,-d.z);}}}
    }
  }
  if(state.plant&&state.side==='attack'&&!defusing)state.plant.defuse=0;
}
let lastSlots='',lastPips='';
function updateHUD(){
  $('scoreYou').textContent=state.wins;$('scoreBot').textContent=state.losses;$('phase').textContent=state.phase==='buy'?'BUY / ROUND '+state.round:state.plant?'CORE ARMED':'ROUND '+state.round;
  const t=Math.max(0,Math.ceil(state.plant?state.plant.time:state.time));$('timer').textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');$('health').textContent=Math.ceil(player.health);$('armor').textContent=Math.ceil(player.armor)+' ARMOR';$('cash').textContent='$'+state.money.toLocaleString();$('weaponName').textContent=state.reload?'RELOADING…':WEAPONS[state.weapon].name;
  const a=state.ammo[state.weapon];if(a)$('ammo').innerHTML=a.mag+' <em>/ '+a.reserve+'</em>';$('utility').textContent='G SMOKE ×'+state.smoke+'  ·  F FLASH ×'+state.flash;
  $('healthBar').style.width=player.health+'%';$('hostileCount').textContent=state.bots.filter(b=>b.alive).length;$('timer').classList.toggle('urgent',t<=10&&state.phase==='live');$('pauseRound').textContent='ROUND '+state.round+' / '+state.difficulty.toUpperCase();
  const slots=`<span class="${WEAPONS[state.weapon].slot==='primary'?'active':''}"><kbd>1</kbd> ${state.owned?WEAPONS[state.primary].name:'NO PRIMARY'}</span><span class="${WEAPONS[state.weapon].slot==='secondary'?'active':''}"><kbd>2</kbd> ${WEAPONS[state.secondary].name}</span>`;
  if(slots!==lastSlots){$('weaponSlots').innerHTML=slots;lastSlots=slots;}
  const pips=Array.from({length:4},(_,i)=>`<i class="${i<state.wins?'won':''}"></i>`).join('');if(pips!==lastPips){$('roundPips').innerHTML=pips;lastPips=pips;}
  $('reloadTrack').hidden=state.reload<=0;$('reloadTrack').firstElementChild.style.width=(100*(1-state.reload/WEAPONS[state.weapon].reload))+'%';
  $('crosshair').style.setProperty('--gap',(4+player.moving*3+(!player.grounded?12:0)+Math.min(state.shots,10))+'px');
  const nearby=state.plant?player.pos.distanceTo(state.plant.pos)<2.7:inSite(player.pos);
  $('objective').textContent=state.phase==='buy'?'B · BUY EQUIPMENT / '+state.difficulty.toUpperCase()+' BOTS':state.plant?(state.side==='attack'?'DEFEND THE CORE':nearby?'HOLD E · DEFUSE (5s)':'RETAKE THE SITE · DEFUSE THE CORE'):(state.side==='attack'?(nearby?'HOLD E · PLANT (3s)':'PLANT AT A OR B'):'DEFEND A AND B');
  $('progress').style.display=state.interact>0?'block':'none';$('progress').firstElementChild.style.width=(state.interact/(state.side==='attack'?3:5)*100)+'%';
  $('location').textContent=player.pos.z>18?'APPROACH':player.pos.z<-11?(player.pos.x<0?'A / SOLAR COURT':'B / REACTOR HALL'):Math.abs(player.pos.x)<8?'MID / SERVICE ROUTE':player.pos.x<0?'WEST ACCESS':'EAST ACCESS';
  $('damage').style.opacity=state.damages;$('flash').style.opacity=Math.min(1,state.flashTime);$('hitmarker').style.opacity=state.hit>0?1:0;$('toast').style.opacity=state.notice>0?1:0;
}
function radar(){const ctx=$('radar').getContext('2d');ctx.clearRect(0,0,180,180);const sx=x=>90+x*2.6,sz=z=>90+z*2.6;ctx.fillStyle='#65706b';walls.forEach(w=>ctx.fillRect(sx(w.x-w.w/2),sz(w.z-w.d/2),w.w*2.6,w.d*2.6));ctx.fillStyle='#c8b686';ctx.font='bold 12px Arial';ctx.fillText('A',sx(-15)-4,sz(-18)+4);ctx.fillText('B',sx(15)-4,sz(-18)+4);if(state.plant){ctx.strokeStyle='#dcaf70';ctx.beginPath();ctx.arc(sx(state.plant.pos.x),sz(state.plant.pos.z),5,0,Math.PI*2);ctx.stroke();}ctx.save();ctx.translate(sx(player.pos.x),sz(player.pos.z));ctx.rotate(-player.yaw);ctx.fillStyle='#eee7cf';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-3,4);ctx.lineTo(3,4);ctx.fill();ctx.restore();}
function scoreboard(){ $('reportScore').textContent=state.wins+' — '+state.losses;$('scoreRows').replaceChildren();for(const [name,info,dead] of [['YOU / '+state.side.toUpperCase(),state.kills+' K / '+state.deaths+' D / '+Math.ceil(player.health)+' HP',player.health<=0],...state.bots.map(b=>[b.name,b.alive?'ACTIVE / '+Math.max(0,Math.ceil(b.hp))+' HP':'ELIMINATED',!b.alive])]){const row=document.createElement('div');if(dead)row.className='dead';const n=document.createElement('span'),i=document.createElement('span');n.textContent=name;i.textContent=info;row.append(n,i);$('scoreRows').append(row);} }

$('start').onclick=startMatch;$('resume').onclick=()=>{ $('pause').hidden=true;lock();};$('quit').onclick=returnMenu;$('resultQuit').onclick=returnMenu;
$('next').onclick=()=>{if(state.wins===4||state.losses===4)startMatch();else{nextRound();lock();}};
$('closeBuy').onclick=()=>{$('buy').hidden=true;lock();};
document.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>buyItem(button.dataset.buy));
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===$('world');state.paused=!locked;keys.clear();firing=false;if(locked){try{weaponAudio.unlock().catch(e=>console.warn('Audio unavailable',e));}catch{}if(state.reload>0)weaponAudio.reload(state.weapon,WEAPONS[state.weapon].reload,WEAPONS[state.weapon].reload-state.reload);else if(state.weapon==='sv98'&&state.lastShotWeapon==='sv98'&&state.t-state.lastShot<1.35)weaponAudio.bolt('sv98',state.t-state.lastShot);$('pause').hidden=true;$('buy').hidden=true;}else{weaponAudio.stopHandling();setScoped(false);$('scoreboard').hidden=true;if(state.active&&state.phase!=='ended'&&$('buy').hidden){$('pause').hidden=false;$('resume').focus();}}});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==$('world')||state.paused)return;const sensitivity=settings.sensitivity*(state.scoped?WEAPONS[state.weapon].scope/settings.fov:1);player.yaw-=e.movementX*.002*sensitivity;player.pitch=clamp(player.pitch-e.movementY*.002*sensitivity,-1.45,1.45);weaponMotion.swayX=clamp(weaponMotion.swayX+e.movementX*.00045*sensitivity,-.045,.045);weaponMotion.swayY=clamp(weaponMotion.swayY+e.movementY*.00045*sensitivity,-.035,.035);});
document.addEventListener('mousedown',e=>{if(state.paused||!state.active)return;if(e.button===0){if(WEAPONS[state.weapon].automatic)firing=true;else shoot();}if(e.button===2)setScoped(!state.scoped);});document.addEventListener('mouseup',()=>firing=false);
document.addEventListener('contextmenu',e=>{if(state.active)e.preventDefault();});
$('world').onclick=()=>{if(state.active&&state.paused&&$('pause').hidden&&$('result').hidden&&$('buy').hidden)lock();};
document.addEventListener('keydown',e=>{
  if(!state.active)return;if(!state.paused&&['Space','Tab','ControlLeft'].includes(e.code))e.preventDefault();if(e.repeat)return;
  if(e.code==='Escape'&&state.paused&&state.phase!=='ended'){for(const id of ['buy','pause'])$(id).hidden=true;lock();return;}
  if(e.code==='Tab'&&!state.paused){scoreboard();$('scoreboard').hidden=false;return;}
  if(e.code==='KeyB'&&!state.paused){const spawn=state.side==='attack'?V(0,0,26):V(-3,0,-26);if(state.phase==='buy'&&player.pos.distanceTo(spawn)<8){refreshShop(state,player);$('buy').hidden=false;document.exitPointerLock();state.paused=true;$('closeBuy').focus();}else toast('Buy only near spawn during the buy phase');return;}
  if(state.paused)return;keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='Digit1')equip(state.primary);if(e.code==='Digit2')equip(state.secondary);if(e.code==='KeyG')utility('smoke');if(e.code==='KeyF')utility('flash');
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab')$('scoreboard').hidden=true;});
window.addEventListener('blur',()=>{keys.clear();firing=false;if(document.pointerLockElement)document.exitPointerLock();});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();});
let last=performance.now(),menuT=0,beep=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;
  if(!state.active){menuT+=dt;camera.position.set(19+Math.sin(menuT*.07)*2,10,24);camera.lookAt(-2,1,-10);}
  else if(!state.paused&&state.phase!=='ended'){
    state.t+=dt;state.cooldown=Math.max(0,state.cooldown-dt);state.notice=Math.max(0,state.notice-dt);state.damages=Math.max(0,state.damages-dt);state.hit=Math.max(0,state.hit-dt);state.flashTime=Math.max(0,state.flashTime-dt);if(state.t-state.lastShot>.25)state.shots=Math.max(0,state.shots-dt*24);
    if(state.reload>0){state.reload-=dt;if(state.reload<=0){state.reload=0;const a=state.ammo[state.weapon],take=Math.min(WEAPONS[state.weapon].capacity-a.mag,a.reserve);a.mag+=take;a.reserve-=take;}}
    updatePlayer(dt);state.time-=dt;
    if(state.phase==='buy'&&state.time<=0){state.phase='live';state.time=90;toast('Operation live. Watch your angles.');}
    if(state.phase==='live'){
      updateBots(dt);
      if(state.phase==='live'&&state.plant){state.plant.time-=dt;beep-=dt;if(beep<=0){tone(800,.08,'sine',.07);beep=state.plant.time<10?.3:1;}if(state.plant.time<=0)endRound(state.side==='attack','The signal core completed its transmission.');}
      else if(state.phase==='live'&&state.time<=0)endRound(state.side==='defend','Time expired before a core was planted.');
    }
    for(let i=smokes.length-1;i>=0;i--){const s=smokes[i];s.life-=dt;s.mesh.scale.setScalar(s.radius);s.mesh.material.opacity=Math.min(.94,s.life/2);if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();smokes.splice(i,1);}}
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.life<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();if(e.mesh.isLine)e.mesh.material.dispose();effects.splice(i,1);}}
  }
  if(state.active){updateHUD();radar();const visualDt=state.paused&&state.phase!=='ended'?0:dt;updateWeaponPresentation(visualDt);updateBotPresentation(visualDt);}
  renderer.autoClear=true;renderer.render(scene,camera);if(state.active&&player.health>0&&!state.scoped){renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);}
}
requestAnimationFrame(frame);
// Local development hook is opt-in and not enabled on a normal published URL.
if(new URLSearchParams(location.search).has('test'))window.__game={state,player,DIFFICULTY,WEAPONS,pathTo,canStand,blocked,shoot,plant,endRound,nextRound,equip,reload,buyItem,setScoped,utility,updateBots,updatePlayer,updateWeaponPresentation,updateBotPresentation,scene,camera,models,gunRoot,weaponMotion};
