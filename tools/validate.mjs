import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
import * as RealThree from '../vendor/three.module.js';
import {WEAPONS} from '../weapons.js';
import {WeaponAudio,SOUND_BANK} from '../audio.js';
import {MAPS,mapKey,normalizeBotCount,MAX_BOTS,DEFAULT_BOTS} from '../maps.js';
// Exercise the bundled loader against the actual new asset, without a GPU.
const engineURL=new URL('../vendor/three.module.js',import.meta.url).href;
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const utility=fs.readFileSync('./vendor/utils/BufferGeometryUtils.js','utf8').replace("from 'three'",`from '${engineURL}'`);
const loaderSource=fs.readFileSync('./vendor/loaders/GLTFLoader.js','utf8').replace("from 'three'",`from '${engineURL}'`).replace("from '../utils/BufferGeometryUtils.js'",`from '${moduleURL(utility)}'`);
const {GLTFLoader:RealLoader}=await import(moduleURL(loaderSource));
console.log('Checking real GLB loaders...');
const rifleBytes=fs.readFileSync('./assets/m4a1.glb');
const rifleAsset=await new RealLoader().parseAsync(rifleBytes.buffer.slice(rifleBytes.byteOffset,rifleBytes.byteOffset+rifleBytes.byteLength),'');
console.log('M4A1 parsed.');
assert.equal(rifleAsset.scene.children.length,4,'source objects merged into four meshes');
assert.ok(rifleAsset.scene.getObjectByName('Magazine'),'magazine available for animation');
let triangles=0;rifleAsset.scene.traverse(o=>{if(o.isMesh){triangles+=o.geometry.index.count/3;const n=o.geometry.attributes.normal;assert.ok(n.normalized);for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.02,'unit normals');}});
assert.equal(triangles,32980);assert.ok(rifleBytes.length<900000);
const actualAssets={m4a1:rifleAsset};
const environmentSource=fs.readFileSync('./environment.js','utf8').replace("from 'three'",`from '${engineURL}'`);
const {loadEnvironment,textureBox,placeEnvironment,ENVIRONMENT_ASSETS}=await import(moduleURL(environmentSource));
// Decode checks use Pillow in the conversion step; the Node loader checks real
// geometry/UVs/materials with texture decoding replaced (there is no DOM/GPU).
RealThree.TextureLoader.prototype.loadAsync=async function(path){
 assert.ok(fs.existsSync(path.split('?')[0]),'bundled surface texture exists');const t=new RealThree.Texture();t.userData.file=path.split('?')[0];return t;
};
for(const name of ENVIRONMENT_ASSETS){
 const bytes=fs.readFileSync('./assets/environment/'+name+'.glb');
 const loader=new RealLoader().register(parser=>({name:'local-test-textures',loadTexture(index){
  const uri=parser.json.images[parser.json.textures[index].source].uri;
  assert.ok(fs.existsSync('./assets/environment/'+uri));const t=new RealThree.Texture();t.flipY=false;t.userData.file='./assets/environment/'+uri;return Promise.resolve(t);
 }}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');actualAssets[name]=asset;
 const bounds=new RealThree.Box3().setFromObject(asset.scene);assert.ok(Math.abs(bounds.min.y)<1e-5,'environment stands at Y=0');assert.ok(Math.abs(bounds.max.x-bounds.min.x-1)<1e-5,'unit width');
 asset.scene.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.uv,'textured environment UVs');assert.ok(o.geometry.attributes.normal);}});
}
for(const name of ['sv98','m82']){
 const bytes=fs.readFileSync('./assets/'+name+'.glb');
 const asset=await new RealLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');actualAssets[name]=asset;
 console.log(name+' parsed.');
 assert.equal(asset.scene.children.length,4);assert.ok(asset.scene.getObjectByName('Magazine'));assert.ok(asset.scene.getObjectByName('Scope'));assert.ok(bytes.length<650000);
 let count=0;asset.scene.traverse(o=>{if(o.isMesh){count+=o.geometry.index.count/3;const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.02);}});
 assert.ok(count>15000&&count<30000,'new models fit geometry budget');
 const size=new RealThree.Box3().setFromObject(asset.scene).getSize(new RealThree.Vector3());assert.ok(size.z>size.x*3&&size.z>size.y*2,'weapon is level, points along Z, and has no oversized background plane');
}
for(const name of ['ak47','mp5','c9','h45']){
 const bytes=fs.readFileSync('./assets/'+name+'.glb');
 const asset=await new RealLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');actualAssets[name]=asset;
 assert.ok(asset.scene.getObjectByName('Magazine'),'separate '+name+' magazine');
 assert.ok(asset.scene.getObjectByName(name==='c9'||name==='h45'?'Slide':'Bolt'));
 let count=0;asset.scene.traverse(o=>{if(o.isMesh){count+=o.geometry.attributes.position.count/3;const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.02);}});
 assert.ok(count>1000&&count<4000);assert.ok(bytes.length<260000);
 const size=new RealThree.Box3().setFromObject(asset.scene).getSize(new RealThree.Vector3());assert.ok(size.z>size.x*3&&size.z>size.y,'weapon orientation is level');
}
const noop=()=>{};
const context=new Proxy({},{get:()=>noop,set:()=>true});
class Element {
  constructor(id=''){this.id=id;this.children=[];this.hidden=true;this.scrollTop=0;this.style={setProperty:noop};this.value='';this.textContent='';this.className='';this.dataset={};this.innerHTML='';this.classList={toggle:noop,add:noop,remove:noop};}
  get firstElementChild(){return this.children[0]??(this.children[0]=new Element());}
  get lastChild(){return this.children.at(-1);}
  getContext(){return context;}
  append(...x){x.forEach(n=>n.parent=this);this.children.push(...x);} prepend(x){x.parent=this;this.children.unshift(x);} replaceChildren(...x){this.children=x;x.forEach(n=>n.parent=this);}
  remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  focus(){}
  requestPointerLock(){document.pointerLockElement=this;return Promise.resolve();}
}
const elements=new Map();
const inputHandlers=new Map();
globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},createElement:()=>new Element(),addEventListener:(type,fn)=>inputHandlers.set(type,fn),querySelectorAll:()=>[],exitPointerLock:noop};
globalThis.window={addEventListener:noop};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;globalThis.location={search:'?test'};
let frame;globalThis.requestAnimationFrame=fn=>{frame=fn;};
class FakeRenderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}clearDepth(){}}
const THREE={...RealThree,WebGLRenderer:FakeRenderer};
class FakeLoader{async loadAsync(path){const name=path.split('?')[0].split('/').at(-1).replace('.glb','');return actualAssets[name]?{scene:actualAssets[name].scene.clone(true)}:{scene:new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.8),new THREE.MeshStandardMaterial())};}}
const source=fs.readFileSync('./game.js','utf8').replace(/^import .*$/mg,'');
const settings={sensitivity:1,volume:0,fov:78,quality:'standard',primary:'rifle',secondary:'pistol',map:'helix',botCount:3};
const soundEvents=[],weaponAudio=new WeaponAudio();
for(const action of ['shot','reload','equip','empty','stopHandling','stopAll']){const original=weaponAudio[action].bind(weaponAudio);weaponAudio[action]=(...args)=>{soundEvents.push({action,args});return original(...args);};}
new Function('THREE','GLTFLoader','WEAPONS','settings','refreshShop','showReport','showView','weaponAudio','SOUND_BANK','MAPS','mapKey','normalizeBotCount','loadEnvironment','textureBox','placeEnvironment',source)(THREE,FakeLoader,WEAPONS,settings,noop,noop,noop,weaponAudio,SOUND_BANK,MAPS,mapKey,normalizeBotCount,loadEnvironment,textureBox,placeEnvironment);
await new Promise(r=>setTimeout(r,0));
console.log('Checking integrated gameplay...');
const g=window.__game,{state,player}=g;
assert.ok(g.models.rifle,'async asset integration completed');
assert.equal(Object.keys(g.environment.models).length,10,'all imported environment templates loaded');
assert.ok(g.environment.surfaces.asphalt.map&&g.environment.surfaces.asphalt.normalMap&&g.environment.surfaces.asphalt.roughnessMap,'real PBR ground textures');
assert.ok(g.models.sv98&&g.models.m82,'both new Free3D models load into the game');
const receiver=g.models.rifle.getObjectByName('Receiver');
assert.ok(receiver.material.metalness>.5,'imported PBR materials preserved');
assert.ok(g.weaponMotion.magazine,'view-model uses separated magazine');
state.active=true;state.side='attack';g.nextRound();
assert.equal(state.bots.length,3);assert.equal(state.ammo.rifle.mag,30);
// Buy time freezes every movement input and clears leftover momentum on every map/side.
for(const map of Object.keys(MAPS))for(const side of ['attack','defend']){
 g.loadMap(map);state.side=side;g.nextRound();
 const origin=player.pos.clone(),height=player.height;
 for(const pressed of [['KeyW'],['KeyS'],['KeyA'],['KeyD'],['Space'],['ControlLeft'],['KeyC'],['KeyW','KeyD','ShiftLeft','Space','ControlLeft']]){
  g.keys.clear();pressed.forEach(code=>g.keys.add(code));player.vel.set(3,.5,-4);player.vy=5;
  for(let i=0;i<10;i++)g.updatePlayer(.04);
  assert.ok(player.pos.equals(origin),map+'/'+side+' buy phase freezes position');
  assert.equal(player.height,height,'buy phase freezes crouch height');assert.equal(player.crouch,false);
  assert.equal(player.vel.length(),0,'buy phase clears all momentum');assert.equal(player.vy,0);assert.equal(player.moving,0);
 }
}
g.keys.clear();g.loadMap('helix');state.side='attack';g.nextRound();
const buyOrigin=player.pos.clone();
assert.ok(g.buyItem('armor'),'shopping still works while movement is locked');
g.keys.add('KeyW');g.keys.add('Space');
let buyClock=performance.now()+40;
const buyTime=state.time,botPositions=state.bots.map(b=>b.pos.clone());frame(buyClock);
assert.ok(state.time<buyTime,'buy countdown keeps ticking');
assert.ok(state.bots.every((b,i)=>b.pos.equals(botPositions[i])),'bots stay frozen during buy time');
inputHandlers.get('keydown')({code:'KeyB',repeat:false,preventDefault:noop});
assert.equal(elements.get('buy').hidden,false,'buy panel can open');assert.equal(state.paused,true);
const pausedBuyTime=state.time,pausedSimulationTime=state.t;
state.paused=false;frame(buyClock+=40);assert.equal(state.time,pausedBuyTime,'open shop independently freezes countdown');
inputHandlers.get('pointerlockchange')();
assert.equal(state.paused,true,'late mouse capture cannot unpause shopping');assert.equal(elements.get('buy').hidden,false,'late mouse capture cannot close equipment');
document.pointerLockElement=null;inputHandlers.get('pointerlockchange')();
for(let i=0;i<750;i++)frame(buyClock+=40);
assert.equal(state.time,pausedBuyTime,'thirty seconds of shopping costs no buy time');assert.equal(state.t,pausedSimulationTime,'shopping freezes simulation time');
assert.equal(state.phase,'buy');assert.ok(player.pos.equals(buyOrigin));assert.ok(state.bots.every((b,i)=>b.pos.equals(botPositions[i])));
assert.ok(g.buyItem('smoke'),'purchases still work while countdown is frozen');assert.equal(state.time,pausedBuyTime,'buying costs credits without costing time');
elements.get('closeBuy').onclick();inputHandlers.get('pointerlockchange')();
assert.equal(elements.get('buy').hidden,true);assert.equal(state.paused,false);
frame(buyClock+=40);assert.ok(state.time<pausedBuyTime&&state.time>=pausedBuyTime-.041,'closing resumes without deducting shopping time');
for(let visit=0;visit<3;visit++){
 inputHandlers.get('keydown')({code:'KeyB',repeat:false,preventDefault:noop});const remaining=state.time;
 for(let i=0;i<100;i++)frame(buyClock+=40);
 assert.equal(state.time,remaining,'each shop visit preserves the remaining buy time');
 if(visit===2)inputHandlers.get('keydown')({code:'Escape',repeat:false,preventDefault:noop});else elements.get('closeBuy').onclick();
 inputHandlers.get('pointerlockchange')();assert.equal(state.paused,false);assert.equal(elements.get('buy').hidden,true);
}
g.keys.add('KeyW');g.keys.add('Space');
for(let i=0;i<400&&state.phase==='buy';i++){frame(buyClock+=40);assert.ok(player.pos.equals(buyOrigin),'player stays frozen until buy time expires');}
assert.equal(state.phase,'live','buy countdown starts the live round');
frame(buyClock+=40);assert.ok(player.pos.distanceTo(buyOrigin)>0,'held movement resumes when round goes live');
assert.ok(player.pos.y>0&&!player.grounded,'jumping resumes when round goes live');
g.keys.clear();state.money=3400;g.nextRound();
console.log('Buy-phase movement lock and live-round release passed.');
// Presentation must settle and reloading must move and restore the magazine.
for(let i=0;i<100;i++)g.updateWeaponPresentation(.016);
const rest=g.gunRoot.position.clone();state.reload=1.1;g.updateWeaponPresentation(.016);
assert.ok(g.weaponMotion.magazine.position.y<-.1);assert.ok(g.gunRoot.position.y>rest.y);
state.reload=0;for(let i=0;i<100;i++)g.updateWeaponPresentation(.016);
assert.ok(g.gunRoot.position.distanceTo(rest)<.006);assert.equal(g.weaponMotion.magazine.position.y,0);
assert.equal(state.ammo.rifle.mag,30,'presentation never changes ammunition');
g.equip('pistol');assert.equal(g.weaponMotion.magazine,null);g.equip('rifle');
for(const p of [[-15,-18],[15,-18],[0,-24]]){const path=g.pathTo(player.pos,new THREE.Vector3(p[0],0,p[1]));assert.ok(path.length>10,'route exists');assert.ok(path.every(p=>g.canStand(p.x,p.z,.43)),'route stays out of walls');assert.ok(path.at(-1).distanceTo(new THREE.Vector3(p[0],0,p[1]))<4.5,'route reaches objective radius');}
assert.ok(!g.canStand(24,0));assert.ok(!g.canStand(-15,3),'imported barracks blocks movement');
state.phase='live';state.paused=false;
// Make a stationary, isolated headshot on an actual Three.js scene/raycaster.
const b=state.bots[0];b.pos.set(0,0,20);state.bots[1].pos.set(-18,0,-24);state.bots[2].pos.set(18,0,-24);
g.camera.position.set(0,1.64,26);g.camera.rotation.set(0,0,0);g.camera.updateMatrixWorld(true);
const random=Math.random;Math.random=()=>.5;g.shoot();Math.random=random;
assert.equal(b.alive,false,'rifle headshot kills armored bot');assert.equal(state.kills,1);assert.equal(state.ammo.rifle.mag,29);
assert.equal(state.headshots,1);assert.equal(state.shotsFired,1);assert.equal(state.hits,1);
g.updateBotPresentation(.04);assert.ok(b.rig.rotation.x<0,'corpse settles through the visual rig');
// Smoke occludes shared visibility queries.
state.smoke=1;g.utility('smoke');assert.equal(state.smoke,0);assert.equal(g.blocked(new THREE.Vector3(0,1,19),new THREE.Vector3(0,1,14),false),false);assert.equal(g.blocked(new THREE.Vector3(0,1,19),new THREE.Vector3(0,1,14)),true);
// Attackers can navigate from spawn to a plant with player perception disabled.
state.side='defend';g.nextRound();state.phase='live';g.camera.position.set(0,80,0);g.scene.updateMatrixWorld(true);
for(let i=0;i<1800&&!state.plant;i++){state.t+=.04;g.updateBots(.04);g.scene.updateMatrixWorld(true);}
assert.ok(state.plant,'bots reach and plant an objective');assert.equal(state.plant.owner,'bot');
// A player defuse is a timed action that produces a round victory.
player.pos.copy(state.plant.pos);player.vel.set(0,0,0);
// Defuse time cannot stack across three nearby defenders.
state.side='attack';g.nextRound();state.phase='live';g.camera.position.set(0,80,0);g.plant(new THREE.Vector3(-14,0,-16),'player');
state.bots.forEach((b,i)=>b.pos.set(-14+i*.2,0,-16));g.scene.updateMatrixWorld(true);
g.updateBots(1);assert.equal(state.plant.defuse,1,'only one bot advances defuse');
for(let i=0;i<6;i++)g.updateBots(1);assert.equal(state.phase,'ended');assert.equal(state.losses,1);
assert.ok(g.DIFFICULTY.hard.reaction<g.DIFFICULTY.normal.reaction&&g.DIFFICULTY.normal.reaction<g.DIFFICULTY.easy.reaction);
assert.ok(g.DIFFICULTY.hard.spread<g.DIFFICULTY.easy.spread);
// Ownership, purchase prices, spawn restrictions, scopes, and torso damage.
state.side='attack';state.owned=true;state.primary='rifle';g.nextRound();state.money=7000;
assert.ok(g.buyItem('sv98'));assert.equal(state.money,3200);assert.equal(state.primary,'sv98');assert.equal(state.weapon,'sv98');assert.equal(state.ammo.sv98.mag,10);
assert.equal(g.buyItem('sv98'),false,'cannot refill by buying the owned weapon');
assert.equal(g.buyItem('m82'),false,'insufficient funds rejected');
g.equip('rifle');assert.equal(state.weapon,'sv98','cannot switch to a replaced primary');
g.equip('pistol');assert.equal(state.weapon,'pistol');g.equip(state.primary);assert.equal(state.weapon,'sv98');
g.setScoped(true);assert.equal(state.scoped,true);assert.equal(g.camera.fov,WEAPONS.sv98.scope);
state.ammo.sv98.mag=5;g.reload();assert.equal(state.scoped,false);assert.equal(state.reload,WEAPONS.sv98.reload);state.reload=0;
state.money=8000;player.pos.set(0,0,0);assert.equal(g.buyItem('m82'),false,'buy cannot occur away from spawn');player.pos.set(0,0,26);
assert.ok(g.buyItem('m82'));assert.equal(state.money,3300);assert.equal(state.ammo.m82.mag,10);
assert.ok(g.buyItem('armor'));assert.equal(player.armor,100);assert.equal(g.buyItem('armor'),false);
assert.ok(g.buyItem('smoke'));assert.equal(state.smoke,2);assert.equal(g.buyItem('smoke'),false);
state.phase='live';assert.equal(g.buyItem('flash'),false,'buy phase enforced');
for(const key of ['sv98','m82']){
 state.primary=key;state.owned=true;g.equip(key);state.cooldown=0;state.reload=0;state.phase='live';state.paused=false;player.moving=0;player.grounded=true;state.shots=0;
 const target=state.bots[0];target.hp=100;target.alive=true;target.pos.set(0,0,20);state.bots[1].pos.set(-18,0,-24);state.bots[2].pos.set(18,0,-24);
 g.camera.position.set(0,1.1,26);g.camera.rotation.set(0,0,0);g.camera.updateMatrixWorld(true);g.setScoped(true);
 const before=state.ammo[key].mag;Math.random=()=>.5;g.shoot();Math.random=random;
 assert.equal(target.alive,false,key+' scoped torso shot is lethal');assert.equal(state.ammo[key].mag,before-1);
 g.shoot();assert.equal(state.ammo[key].mag,before-1,'bolt / fire interval enforced');
}
g.equip('pistol');g.setScoped(true);assert.equal(state.scoped,false,'sidearm cannot scope');assert.equal(g.camera.fov,settings.fov);
state.primary='m82';state.owned=true;g.nextRound();assert.equal(state.weapon,'m82','surviving primary persists');
player.health=0;g.endRound(false,'Eliminated');g.nextRound();assert.equal(state.weapon,'pistol','death removes primary');g.equip('m82');assert.equal(state.weapon,'pistol','lost primary cannot be equipped');
// A held click never repeats a semi-automatic shot; a fresh click fires again.
for(const key of ['pistol','sv98','m82']){
 state.primary=key==='pistol'?'rifle':key;state.owned=true;g.nextRound();g.equip(key);state.phase='live';state.paused=false;state.active=true;
 const before=state.ammo[key].mag;inputHandlers.get('mousedown')({button:0});assert.equal(state.ammo[key].mag,before-1);
 for(let i=0;i<20;i++){state.cooldown=0;g.updatePlayer(.02);}
 assert.equal(state.ammo[key].mag,before-1,key+' hold does not repeat');
 inputHandlers.get('mousedown')({button:0});assert.equal(state.ammo[key].mag,before-2,key+' fresh click fires');inputHandlers.get('mouseup')();
}
// New weapons must preserve separate ownership, replacement, costs and sounds.
state.side='attack';state.primary='rifle';state.secondary='pistol';state.owned=true;g.nextRound();state.money=16000;
assert.ok(g.buyItem('c9'));assert.equal(state.money,15600);assert.equal(state.secondary,'c9');assert.equal(state.primary,'rifle');assert.equal(state.weapon,'c9');
assert.equal(g.buyItem('c9'),false);g.equip('h45');assert.equal(state.weapon,'c9','unowned sidearm cannot be equipped');g.equip('pistol');assert.equal(state.weapon,'c9','replaced sidearm cannot be equipped');
assert.ok(g.buyItem('h45'));assert.equal(state.money,14900);assert.equal(state.secondary,'h45');g.equip('c9');assert.equal(state.weapon,'h45');
g.nextRound();assert.equal(state.secondary,'h45','surviving sidearm persists');player.health=0;g.endRound(false,'Sidearm check');g.nextRound();assert.equal(state.secondary,'pistol');assert.equal(state.weapon,'pistol');g.equip('h45');assert.equal(state.weapon,'pistol');
for(const key of ['ak47','mp5','c9','h45']){
 state.phase='buy';state.money=16000;assert.ok(g.buyItem(key));assert.equal(state.money,16000-WEAPONS[key].price);
 state.phase='live';state.paused=false;state.cooldown=0;state.reload=0;state.shots=0;
 const before=state.ammo[key].mag;g.camera.position.set(0,30,26);g.shoot();assert.equal(state.ammo[key].mag,before-1);
 g.shoot();assert.equal(state.ammo[key].mag,before-1,'fire interval enforced');
 g.reload();assert.equal(state.reload,WEAPONS[key].reload);g.equip(key);assert.equal(state.reload,0);
 assert.ok(g.weaponMotion.magazine&&g.weaponMotion.cycling);
 if(!WEAPONS[key].automatic){state.cooldown=0;const rounds=state.ammo[key].mag;inputHandlers.get('mousedown')({button:0});for(let i=0;i<10;i++){state.cooldown=0;g.updatePlayer(.02);}assert.equal(state.ammo[key].mag,rounds-1,'sidearm requires a new click');inputHandlers.get('mouseup')();}
}
// H-45 and new primaries have lethal headshots, using the real raycaster.
for(const key of ['ak47','mp5','h45']){
 if(WEAPONS[key].slot==='primary'){state.primary=key;state.owned=true;}else state.secondary=key;
 g.equip(key);state.phase='live';state.cooldown=0;state.reload=0;state.shots=0;player.moving=0;player.grounded=true;
 const target=state.bots[0];target.hp=100;target.alive=true;target.pos.set(0,0,20);state.bots[1].pos.set(-18,0,-24);state.bots[2].pos.set(18,0,-24);
 g.camera.position.set(0,1.64,26);g.camera.rotation.set(0,0,0);g.camera.updateMatrixWorld(true);Math.random=()=>.5;g.shoot();Math.random=random;assert.equal(target.alive,false,key+' headshot is lethal');
}
state.secondary='pistol';
// Validate bundled binary models and every relative import.
for(const key of Object.keys(WEAPONS))assert.ok(soundEvents.some(e=>e.action==='shot'&&e.args[0]===key),'game dispatches '+key+' to its own sound bank');
assert.ok(soundEvents.some(e=>e.action==='reload'&&e.args[0]==='sv98'&&e.args[1]===WEAPONS.sv98.reload),'reload uses the actual duration');
// Exhausted weapons click once per fire interval without consuming ammunition.
state.primary='m82';state.owned=true;g.nextRound();state.phase='live';state.paused=false;g.equip('m82');state.ammo.m82={mag:0,reserve:0};state.cooldown=0;
const dryCount=soundEvents.filter(e=>e.action==='empty').length,shotCount=state.shotsFired;
g.shoot();g.shoot();assert.equal(soundEvents.filter(e=>e.action==='empty').length,dryCount+1);assert.equal(state.shotsFired,shotCount);assert.equal(state.reload,0);
// Scope/reload/switch cancellation removes stale handling audio on a round end.
const cancelCount=soundEvents.filter(e=>e.action==='stopHandling').length;g.endRound(false,'Audio regression check');assert.equal(soundEvents.filter(e=>e.action==='stopHandling').length,cancelCount+1);
// Motion exercises actual loaded meshes; presentation must not change combat state.
state.side='attack';state.owned=true;state.primary='rifle';state.secondary='pistol';g.nextRound();state.phase='live';state.paused=false;
const cameraPose=g.camera.matrixWorld.clone(),ammoBefore=JSON.stringify(state.ammo),healthBefore=player.health;
for(const key of Object.keys(WEAPONS)){
 if(WEAPONS[key].slot==='primary')state.primary=key;else state.secondary=key;
 g.equip(key);assert.equal(g.weaponMotion.hands.length,2,key+' has both hands');
 for(let i=0;i<120;i++)g.updateWeaponPresentation(1/60);
 const left=g.weaponMotion.hands[1],home=left.home.clone(),m=g.weaponMotion;
 state.reload=WEAPONS[key].reload*(1-(SOUND_BANK[key].reloadAt[0]+SOUND_BANK[key].reloadAt[1])/2);for(let i=0;i<10;i++)g.updateWeaponPresentation(1/60);
 assert.ok(left.palm.position.distanceTo(home)>.045,key+' reload moves support hand');
 if(m.magazine){const displacement=(m.magazineHome.y-m.magazine.position.y)*m.magazineScale;assert.ok(displacement>.17&&displacement<.19,key+' magazine travel is in normalized world units');}
 state.reload=0;for(let i=0;i<120;i++)g.updateWeaponPresentation(1/60);
 assert.ok(left.palm.position.distanceTo(home)<1e-6,key+' hand returns to grip');
 if(m.magazine){assert.ok(m.magazine.position.equals(m.magazineHome));assert.ok(m.magazine.quaternion.angleTo(m.magazineRotation)<1e-6);}
 assert.ok(g.gunRoot.position.distanceTo(new THREE.Vector3(...WEAPONS[key].pose))<.008);
 assert.ok(m.model.visible&&!m.device.visible&&!m.grenade.visible);
 const snapshot=()=>JSON.stringify([m.clock,m.bob,m.landing,g.gunRoot.position,g.gunRoot.rotation,...m.hands.map(h=>[h.palm.position,h.palm.rotation])]);
 const pausedPose=snapshot();g.updateWeaponPresentation(0);assert.equal(snapshot(),pausedPose,key+' pause freezes presentation');
 g.gunRoot.traverse(o=>assert.ok([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite),key+' finite transforms'));
}
assert.equal(JSON.stringify(state.ammo),ammoBefore);assert.equal(player.health,healthBefore);assert.ok(g.camera.matrixWorld.equals(cameraPose),'visual motion leaves aiming camera unchanged');
state.primary='mp5';g.equip('mp5');player.grounded=true;player.vel.set(4.8,0,0);player.yaw=0;
for(let i=0;i<60;i++){player.pos.x+=.08;g.updateWeaponPresentation(1/60);}
assert.ok(g.weaponMotion.stride>.9&&g.weaponMotion.bank>.9,'walking and lateral bank follow real movement');
const stridePhase=g.weaponMotion.bob;player.vel.set(0,0,0);for(let i=0;i<90;i++)g.updateWeaponPresentation(1/60);
assert.equal(g.weaponMotion.bob,stridePhase,'feet do not advance while stationary');assert.ok(g.weaponMotion.stride<.001);
g.weaponMotion.lastGrounded=false;g.weaponMotion.lastVy=-6;g.updateWeaponPresentation(1/60);assert.ok(g.weaponMotion.landing>.6);
for(let i=0;i<60;i++)g.updateWeaponPresentation(1/60);assert.ok(g.weaponMotion.landing<.001,'landing recovers');
g.keys.add('KeyV');for(let i=0;i<60;i++)g.updateWeaponPresentation(1/60);assert.ok(g.weaponMotion.inspect>.99);g.keys.clear();
state.interact=1;for(let i=0;i<30;i++)g.updateWeaponPresentation(1/60);assert.ok(g.weaponMotion.device.visible&&!g.weaponMotion.model.visible);
state.interact=0;for(let i=0;i<60;i++)g.updateWeaponPresentation(1/60);assert.ok(g.weaponMotion.model.visible&&!g.weaponMotion.device.visible);
state.smoke=1;g.utility('smoke');g.updateWeaponPresentation(.10);assert.ok(g.weaponMotion.grenade.visible&&!g.weaponMotion.model.visible);
for(let i=0;i<60;i++)g.updateWeaponPresentation(1/60);assert.ok(g.weaponMotion.model.visible&&!g.weaponMotion.grenade.visible);
state.cooldown=0;g.camera.position.set(0,30,26);g.shoot();g.updateWeaponPresentation(.016);
assert.ok(g.weaponMotion.muzzle.visible&&g.weaponMotion.shells.some(s=>s.mesh.visible),'shot shows flash and casing');
state.secondary='c9';g.equip('c9');assert.equal(g.weaponMotion.throwTime,0);assert.equal(g.weaponMotion.objective,0);assert.ok(g.weaponMotion.shells.every(s=>s.life===0));
const movingBot=state.bots[0];movingBot.pos.set(0,0,0);movingBot.previous.copy(movingBot.pos);movingBot.group.rotation.y=0;movingBot.viewYaw=0;
const headHome=movingBot.head.position.clone();let legTravel=0,ankleTravel=0;
for(let i=0;i<60;i++){movingBot.pos.z-=.05;g.updateBotPresentation(1/60);legTravel=Math.max(legTravel,Math.abs(movingBot.legs[0].rotation.x));ankleTravel=Math.max(ankleTravel,Math.abs(movingBot.legs[0].userData.ankle.rotation.x));}
assert.ok(legTravel>.3&&ankleTravel>.1,'bot hips, knees, and feet move');
const botPhase=movingBot.walk;for(let i=0;i<120;i++)g.updateBotPresentation(1/60);assert.equal(movingBot.walk,botPhase);assert.ok(movingBot.visualSpeed<.001);
movingBot.fireKick=1;movingBot.flashTime=.05;g.updateBotPresentation(.016);assert.ok(movingBot.gun.rotation.x<0&&movingBot.muzzle.visible);
movingBot.blind=3;for(let i=0;i<30;i++)g.updateBotPresentation(1/60);assert.ok(!movingBot.gun.visible&&movingBot.arms[0].rotation.x>2);
movingBot.blind=0;movingBot.planting=1;for(let i=0;i<30;i++)g.updateBotPresentation(1/60);assert.ok(movingBot.workDevice.visible&&!movingBot.gun.visible);
movingBot.planting=0;movingBot.defusing=true;g.updateBotPresentation(.016);assert.ok(movingBot.workDevice.visible);
assert.ok(movingBot.head.position.equals(headHome),'animated rig does not move gameplay hit volumes');
const botPause=JSON.stringify([movingBot.clock,movingBot.walk,movingBot.rig.position,movingBot.rig.rotation,movingBot.arms.map(a=>a.rotation)]);g.updateBotPresentation(0);assert.equal(JSON.stringify([movingBot.clock,movingBot.walk,movingBot.rig.position,movingBot.rig.rotation,movingBot.arms.map(a=>a.rotation)]),botPause);
movingBot.alive=false;for(let i=0;i<120;i++)g.updateBotPresentation(1/60);assert.ok(movingBot.fall>.99&&movingBot.rig.position.y>0,'corpse settles above the floor');
g.nextRound();assert.equal(g.weaponMotion.landing,0);assert.equal(player.moving,0);assert.ok(state.bots.every(b=>b.fall===0&&b.alive),'new round clears motion state');
console.log('PASS: all eight hand/reload rigs, normalized magazine travel, pause/round/switch resets, actual-distance gait, landing recovery, inspect/throw/objective states, flash/casings, bot joints/reactions/death, finite transforms, and independent combat state.');
// Real map switching/collision/navigation and variable hostiles, on both sides.
assert.equal(Object.keys(MAPS).length,3);assert.equal(DEFAULT_BOTS,6);assert.equal(MAX_BOTS,16);
for(const value of [undefined,null,NaN,Infinity,'bad'])assert.equal(normalizeBotCount(value),6);
assert.equal(normalizeBotCount(-3),1);assert.equal(normalizeBotCount(99),16);assert.equal(normalizeBotCount('8'),8);assert.equal(mapKey('constructor'),'helix');
const mapWallSignatures=new Set();
for(const [key,m] of Object.entries(MAPS)){
 g.loadMap(key);assert.equal(state.map,key);assert.equal(state.bots.length,0);assert.ok(g.siteA.equals(new THREE.Vector3(m.sites[0][0],0,m.sites[0][1])));
 assert.equal(g.walls.length,4+m.walls.length+m.covers.length+m.crates.length,'map collider arrays are replaced, not accumulated');
 for(const prop of m.props.filter(p=>p.solid)){assert.equal(g.canStand(prop.x,prop.z),false,key+' imported footprint blocks movement');const imported=g.mapRoot.children.find(o=>o.name===prop.asset&&Math.abs(o.position.x-prop.x)<.01&&Math.abs(o.position.z-prop.z)<.01);assert.ok(imported);const bounds=new THREE.Box3().setFromObject(imported),size=bounds.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-(prop.turn%2?prop.d:prop.w))<.001&&Math.abs(size.z-(prop.turn%2?prop.w:prop.d))<.001,'mesh bounds match collision footprint');assert.equal(g.blocked(new THREE.Vector3(prop.x-size.x/2-1,1,prop.z),new THREE.Vector3(prop.x+size.x/2+1,1,prop.z),false),true,key+'/'+prop.asset+' imported cover blocks bullets/vision');}
 mapWallSignatures.add(JSON.stringify(g.walls));const geometryCount=g.mapRoot.children.length;g.loadMap(key);assert.equal(g.mapRoot.children.length,geometryCount,'repeated loading does not stack map objects');
 for(const side of ['attack','defend'])for(const count of [1,3,6,16]){
  state.side=side;state.botCount=count;g.nextRound();assert.equal(state.bots.length,count);assert.ok(g.canStand(player.pos.x,player.pos.z,.43),key+' '+side+' clear player spawn');
  assert.equal(new Set(state.bots.map(b=>b.name)).size,count,'every hostile has a unique name');assert.ok(state.bots.every(b=>typeof b.name==='string'));
  for(const [i,b] of state.bots.entries()){
   assert.ok(g.canStand(b.pos.x,b.pos.z,.43),key+' clear bot spawn');assert.ok(b.pos.distanceTo(player.pos)>20,'opponents spawn across the map');
   for(const other of state.bots.slice(i+1))assert.ok(b.pos.distanceTo(other.pos)>=1.25,'separated spawns');
   for(const site of [g.siteA,g.siteB]){const path=g.pathTo(b.pos,site);assert.ok(path.length,key+' bot route exists');assert.ok(path.every(p=>g.canStand(p.x,p.z,.43)),key+' bot route stays clear');assert.ok(path.at(-1).distanceTo(site)<4.5,key+' bot route reaches each objective');}
  }
  for(const site of [g.siteA,g.siteB]){const path=g.pathTo(player.pos,site);assert.ok(path.length&&path.at(-1).distanceTo(site)<4.5,key+' player entry connects to both objectives');}
  g.scoreboard();assert.equal(elements.get('scoreRows').children.length,count+1,'report includes every bot');assert.equal(elements.get('scoreTitle').textContent,m.name.toUpperCase());
  if(count===16){inputHandlers.get('keydown')({code:'Tab',preventDefault:noop});inputHandlers.get('wheel')({deltaY:120,preventDefault:noop});assert.ok(elements.get('scoreboard').scrollTop>=120,'full report can scroll while the mouse is captured');inputHandlers.get('keyup')({code:'Tab'});}
  g.updateHUD();assert.equal(elements.get('hostileCount').textContent,count);
 }
 // Maximum-size attacker group must reach and arm a real core, despite separation.
 state.side='defend';state.botCount=16;g.nextRound();state.phase='live';g.camera.position.set(0,80,0);g.scene.updateMatrixWorld(true);
 for(let i=0;i<1800&&!state.plant;i++){state.t+=.04;g.updateBots(.04);g.scene.updateMatrixWorld(true);}
 assert.ok(state.plant&&state.plant.owner==='bot',key+' sixteen attackers navigate and plant');
 // Defenders traverse the selected map and finish a single seven-second defuse.
 state.side='attack';g.nextRound();state.phase='live';g.camera.position.set(0,80,0);
 const plantPoint=g.pathTo(player.pos,g.siteA).at(-1);g.plant(plantPoint,'player');g.scene.updateMatrixWorld(true);
 for(let i=0;i<1800&&state.phase!=='ended';i++){state.t+=.04;g.updateBots(.04);g.scene.updateMatrixWorld(true);}
 assert.equal(state.phase,'ended',key+' sixteen defenders reach and defuse');assert.ok(state.plant.defuse>=7&&state.plant.defuse<7.05,'bot count does not accelerate defusing');
 assert.ok(fs.existsSync('./assets/'+m.image),'selected map plan is bundled');
}
assert.equal(mapWallSignatures.size,3,'three distinct collision layouts');
// Normal Deploy consumes saved choices; changes stay locked until a new match.
const unlock=weaponAudio.unlock;weaponAudio.unlock=async()=>false;
settings.map='ironwood';settings.botCount=12;document.getElementById('side').value='defend';document.getElementById('difficulty').value='hard';elements.get('start').onclick();
assert.equal(state.map,'ironwood');assert.equal(state.botCount,12);assert.equal(state.bots.length,12);assert.equal(state.difficulty,'hard');
settings.map='bastion';settings.botCount=4;g.nextRound();assert.equal(state.map,'ironwood');assert.equal(state.bots.length,12,'next round keeps match configuration');
elements.get('quit').onclick();elements.get('start').onclick();assert.equal(state.map,'bastion');assert.equal(state.bots.length,4,'a new match uses the new choices');weaponAudio.unlock=unlock;
// A higher bot count only wins after the final hostile is eliminated.
g.loadMap('helix');state.side='attack';state.botCount=6;state.primary='rifle';state.owned=true;g.nextRound();state.phase='live';state.cooldown=0;player.moving=0;
state.bots.forEach((b,i)=>{b.alive=i===0||i===5;b.pos.set(i===0?0:i===5?3:18,0,i===0||i===5?20:-24);});
g.camera.position.set(0,1.64,26);g.camera.rotation.set(0,0,0);g.camera.updateMatrixWorld(true);Math.random=()=>.5;g.shoot();assert.equal(state.phase,'live','one remaining enemy prevents a win');
state.cooldown=0;g.camera.position.x=3;g.camera.updateMatrixWorld(true);g.shoot();Math.random=random;assert.equal(state.phase,'ended');
state.botCount=3;g.nextRound();
console.log('PASS: three distinct maps, all 1/3/6/16-bot spawn/route combinations on both sides, unique names, full reports, sixteen-bot plant/defuse simulation, match selection/reset, and last-enemy victory.');
for(const name of ['m4a1','sv98','m82','ak47','mp5','c9','h45','blaster-b','crate-medium']){const data=fs.readFileSync('./assets/'+name+'.glb');assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);const json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));assert.ok(json.meshes.length);for(const image of json.images??[])if(image.uri)assert.ok(fs.existsSync('./assets/'+image.uri),'external model texture exists');console.log(name+': '+json.meshes.length+' meshes');}
for(const w of Object.values(WEAPONS))assert.ok(fs.existsSync('./assets/ui/'+w.image+'.svg'));
console.log('PASS: seven actual imported weapon assets, PBR, reload/equip animation, recoil, lethal headshot and sniper torso raycasts, ammo, purchases, ownership, spawn/funds/capacity restrictions, scope FOV, navigation, collision, smoke, bot objectives, difficulty, model/texture/preview integrity.');
if(process.env.BLACKSITE_RENDER_EXPORT){
 state.owned=true;state.primary='rifle';state.weapon='rifle';g.equip('rifle');for(let i=0;i<150;i++)g.updateWeaponPresentation(.016);
 g.gunRoot.updateMatrixWorld(true);const meshes=[];
 g.gunRoot.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,p=[],norm=[],v=new THREE.Vector3(),m=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);p.push(v.toArray());v.fromBufferAttribute(n,i).applyMatrix3(m).normalize();norm.push(v.toArray());}meshes.push({name:o.name,positions:p,normals:norm,indices:o.geometry.index?Array.from(o.geometry.index.array):Array.from({length:a.count},(_,i)=>i),color:o.material.color.toArray()});}});
 fs.writeFileSync(process.env.BLACKSITE_RENDER_EXPORT,JSON.stringify(meshes));
}
// Optional, compact real-geometry export for CPU visual review without WebGL.
if(process.env.BLACKSITE_ANIMATION_EXPORT){
 const geometries=[],cache=new Map(),frames=[];
 const capture=root=>{root.updateWorldMatrix(true,true);const meshes=[];root.traverseVisible(o=>{if(!o.isMesh)return;
  if(!cache.has(o.geometry)){const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,v=new THREE.Vector3();cache.set(o.geometry,geometries.length);geometries.push({positions:Array.from({length:a.count},(_,i)=>v.fromBufferAttribute(a,i).toArray()),normals:Array.from({length:n.count},(_,i)=>v.fromBufferAttribute(n,i).toArray()),indices:o.geometry.index?Array.from(o.geometry.index.array):Array.from({length:a.count},(_,i)=>i)});}
  const material=Array.isArray(o.material)?o.material[0]:o.material;meshes.push({geometry:cache.get(o.geometry),matrix:o.matrixWorld.toArray(),color:material.color.toArray()});
 });return meshes;};
 state.primary='mp5';state.owned=true;g.equip('mp5');g.viewCamera.aspect=16/9;g.viewCamera.updateProjectionMatrix();state.phase='live';state.interact=0;player.vel.set(0,0,0);player.grounded=true;
 const bot=state.bots[0];bot.pos.set(0,0,0);bot.previous.copy(bot.pos);bot.group.rotation.y=0;bot.viewYaw=0;
 for(let i=0;i<90;i++)g.updateWeaponPresentation(1/60);
 for(let f=0;f<15;f++){
  const progress=f/14;state.reload=f===14?0:WEAPONS.mp5.reload*(1-progress);
  for(let i=0;i<9;i++){bot.pos.z-=3/60;g.updateBotPresentation(1/60);g.updateWeaponPresentation(1/60);}
  const camera=new THREE.PerspectiveCamera(42,16/9,.01,20);camera.position.copy(bot.pos).add(new THREE.Vector3(2.6,1.9,-4));camera.lookAt(bot.pos.clone().add(new THREE.Vector3(0,.95,0)));camera.updateMatrixWorld(true);
  frames.push({weapon:capture(g.gunRoot),bot:capture(bot.rig),weaponCamera:{view:g.viewCamera.matrixWorldInverse.toArray(),projection:g.viewCamera.projectionMatrix.toArray()},botCamera:{view:camera.matrixWorldInverse.toArray(),projection:camera.projectionMatrix.toArray()}});
 }
 fs.writeFileSync(process.env.BLACKSITE_ANIMATION_EXPORT,JSON.stringify({geometries,frames}));
}

if(process.env.BLACKSITE_MAP_EXPORT){
 const geometryIds=new Map(),geometries=[],maps=[];
 for(const [key,m] of Object.entries(MAPS)){
  g.loadMap(key);g.mapRoot.updateMatrixWorld(true);const meshes=[];
  g.mapRoot.traverse(o=>{if(!o.isMesh||!o.visible)return;const material=o.material;if(Array.isArray(material))throw new Error('preview requires per-primitive meshes');
   if(!geometryIds.has(o.geometry)){const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;const read=(a,dim)=>Array.from({length:a.count},(_,i)=>Array.from({length:dim},(_,k)=>[a.getX,a.getY,a.getZ][k].call(a,i)));geometryIds.set(o.geometry,geometries.length);geometries.push({positions:read(p,3),normals:n?read(n,3):null,uv:uv?read(uv,2):null,indices:o.geometry.index?Array.from(o.geometry.index.array):Array.from({length:p.count},(_,i)=>i)});}
   if(material.map?.isCanvasTexture)return;
   meshes.push({geometry:geometryIds.get(o.geometry),matrix:o.matrixWorld.toArray(),color:material.color.toArray(),texture:material.map?.userData.file,flipY:material.map?.flipY??true,repeat:material.map?.repeat.toArray()??[1,1]});
  });
  const overview=new THREE.OrthographicCamera(-42,42,30,-30,.1,240);overview.position.set(52,68,70);overview.lookAt(0,0,-1);overview.updateMatrixWorld(true);
  const street=new THREE.PerspectiveCamera(72,16/9,.1,180);street.position.set(key==='ironwood'?12:7,1.8,22);street.lookAt(key==='ironwood'?16:10,2,-7);street.updateMatrixWorld(true);
  maps.push({key,name:m.name,sky:new THREE.Color(m.palette.sky).toArray(),meshes,overview:{view:overview.matrixWorldInverse.toArray(),projection:overview.projectionMatrix.toArray()},street:{view:street.matrixWorldInverse.toArray(),projection:street.projectionMatrix.toArray()}});
 }
 fs.writeFileSync(process.env.BLACKSITE_MAP_EXPORT,JSON.stringify({geometries,maps}));
}
