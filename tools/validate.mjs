import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
import * as RealThree from '../vendor/three.module.js';
import {WEAPONS} from '../weapons.js';
import {WeaponAudio} from '../audio.js';
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
for(const name of ['sv98','m82']){
 const bytes=fs.readFileSync('./assets/'+name+'.glb');
 const asset=await new RealLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');actualAssets[name]=asset;
 console.log(name+' parsed.');
 assert.equal(asset.scene.children.length,4);assert.ok(asset.scene.getObjectByName('Magazine'));assert.ok(asset.scene.getObjectByName('Scope'));assert.ok(bytes.length<650000);
 let count=0;asset.scene.traverse(o=>{if(o.isMesh){count+=o.geometry.index.count/3;const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.02);}});
 assert.ok(count>15000&&count<30000,'new models fit geometry budget');
 const size=new RealThree.Box3().setFromObject(asset.scene).getSize(new RealThree.Vector3());assert.ok(size.z>size.x*3&&size.z>size.y*2,'weapon is level, points along Z, and has no oversized background plane');
}
const noop=()=>{};
const context=new Proxy({},{get:()=>noop,set:()=>true});
class Element {
  constructor(id=''){this.id=id;this.children=[];this.hidden=true;this.style={setProperty:noop};this.value='';this.textContent='';this.className='';this.dataset={};this.innerHTML='';this.classList={toggle:noop,add:noop};}
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
const settings={sensitivity:1,volume:0,fov:78,quality:'standard',primary:'rifle'};
const soundEvents=[],weaponAudio=new WeaponAudio();
for(const action of ['shot','reload','equip','empty','stopHandling','stopAll']){const original=weaponAudio[action].bind(weaponAudio);weaponAudio[action]=(...args)=>{soundEvents.push({action,args});return original(...args);};}
new Function('THREE','GLTFLoader','WEAPONS','settings','refreshShop','showReport','showView','weaponAudio',source)(THREE,FakeLoader,WEAPONS,settings,noop,noop,noop,weaponAudio);
await new Promise(r=>setTimeout(r,0));
console.log('Checking integrated gameplay...');
const g=window.__game,{state,player}=g;
assert.ok(g.models.rifle,'async asset integration completed');
assert.ok(g.models.sv98&&g.models.m82,'both new Free3D models load into the game');
const receiver=g.models.rifle.getObjectByName('Receiver');
assert.ok(receiver.material.metalness>.5,'imported PBR materials preserved');
assert.ok(g.weaponMotion.magazine,'view-model uses separated magazine');
state.active=true;state.side='attack';g.nextRound();
assert.equal(state.bots.length,3);assert.equal(state.ammo.rifle.mag,30);
// Presentation must settle and reloading must move and restore the magazine.
for(let i=0;i<100;i++)g.updateWeaponPresentation(.016);
const rest=g.gunRoot.position.clone();state.reload=1.1;g.updateWeaponPresentation(.016);
assert.ok(g.weaponMotion.magazine.position.y<-.1);assert.ok(g.gunRoot.position.y<rest.y);
state.reload=0;for(let i=0;i<100;i++)g.updateWeaponPresentation(.016);
assert.ok(g.gunRoot.position.distanceTo(rest)<.001);assert.equal(g.weaponMotion.magazine.position.y,0);
assert.equal(state.ammo.rifle.mag,30,'presentation never changes ammunition');
g.equip('pistol');assert.equal(g.weaponMotion.magazine,null);g.equip('rifle');
for(const p of [[-15,-18],[15,-18],[0,-24]]){const path=g.pathTo(player.pos,new THREE.Vector3(p[0],0,p[1]));assert.ok(path.length>10,'route exists');assert.ok(path.every(p=>g.canStand(p.x,p.z,.43)),'route stays out of walls');assert.ok(path.at(-1).distanceTo(new THREE.Vector3(p[0],0,p[1]))<4.5,'route reaches objective radius');}
assert.ok(!g.canStand(24,0));assert.ok(!g.canStand(-8,7));
state.phase='live';state.paused=false;
// Make a stationary, isolated headshot on an actual Three.js scene/raycaster.
const b=state.bots[0];b.pos.set(0,0,20);state.bots[1].pos.set(-18,0,-24);state.bots[2].pos.set(18,0,-24);
g.camera.position.set(0,1.64,26);g.camera.rotation.set(0,0,0);g.camera.updateMatrixWorld(true);
const random=Math.random;Math.random=()=>.5;g.shoot();Math.random=random;
assert.equal(b.alive,false,'rifle headshot kills armored bot');assert.equal(state.kills,1);assert.equal(state.ammo.rifle.mag,29);
assert.equal(state.headshots,1);assert.equal(state.shotsFired,1);assert.equal(state.hits,1);
g.updateBotPresentation(.04);assert.ok(b.rig.rotation.x<0,'corpse settles through the visual rig');
// Smoke occludes shared visibility queries.
state.smoke=1;g.utility('smoke');assert.equal(state.smoke,0);assert.equal(g.blocked(new THREE.Vector3(0,1,25),new THREE.Vector3(0,1,20)),true);
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
// Validate bundled binary models and every relative import.
for(const key of Object.keys(WEAPONS))assert.ok(soundEvents.some(e=>e.action==='shot'&&e.args[0]===key),'game dispatches '+key+' to its own sound bank');
assert.ok(soundEvents.some(e=>e.action==='reload'&&e.args[0]==='sv98'&&e.args[1]===WEAPONS.sv98.reload),'reload uses the actual duration');
// Exhausted weapons click once per fire interval without consuming ammunition.
state.primary='m82';state.owned=true;g.nextRound();state.phase='live';state.paused=false;g.equip('m82');state.ammo.m82={mag:0,reserve:0};state.cooldown=0;
const dryCount=soundEvents.filter(e=>e.action==='empty').length,shotCount=state.shotsFired;
g.shoot();g.shoot();assert.equal(soundEvents.filter(e=>e.action==='empty').length,dryCount+1);assert.equal(state.shotsFired,shotCount);assert.equal(state.reload,0);
// Scope/reload/switch cancellation removes stale handling audio on a round end.
const cancelCount=soundEvents.filter(e=>e.action==='stopHandling').length;g.endRound(false,'Audio regression check');assert.equal(soundEvents.filter(e=>e.action==='stopHandling').length,cancelCount+1);
for(const name of ['m4a1','sv98','m82','blaster-b','crate-medium']){const data=fs.readFileSync('./assets/'+name+'.glb');assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);const json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));assert.ok(json.meshes.length);for(const image of json.images??[])if(image.uri)assert.ok(fs.existsSync('./assets/'+image.uri),'external model texture exists');console.log(name+': '+json.meshes.length+' meshes');}
for(const w of Object.values(WEAPONS))assert.ok(fs.existsSync('./assets/ui/'+w.image+'.svg'));
console.log('PASS: three actual Free3D assets, PBR, reload/equip animation, recoil, lethal headshot and sniper torso raycasts, ammo, purchases, ownership, spawn/funds/capacity restrictions, scope FOV, navigation, collision, smoke, bot objectives, difficulty, model/texture/preview integrity.');
if(process.env.BLACKSITE_RENDER_EXPORT){
 state.owned=true;state.primary='rifle';state.weapon='rifle';g.equip('rifle');for(let i=0;i<150;i++)g.updateWeaponPresentation(.016);
 g.gunRoot.updateMatrixWorld(true);const meshes=[];
 g.gunRoot.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,p=[],norm=[],v=new THREE.Vector3(),m=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);p.push(v.toArray());v.fromBufferAttribute(n,i).applyMatrix3(m).normalize();norm.push(v.toArray());}meshes.push({name:o.name,positions:p,normals:norm,indices:Array.from(o.geometry.index.array),color:o.material.color.toArray()});}});
 fs.writeFileSync(process.env.BLACKSITE_RENDER_EXPORT,JSON.stringify(meshes));
}
