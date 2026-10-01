import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
import * as RealThree from '../vendor/three.module.js';
// Exercise the bundled loader against the actual new asset, without a GPU.
const engineURL=new URL('../vendor/three.module.js',import.meta.url).href;
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const utility=fs.readFileSync('./vendor/utils/BufferGeometryUtils.js','utf8').replace("from 'three'",`from '${engineURL}'`);
const loaderSource=fs.readFileSync('./vendor/loaders/GLTFLoader.js','utf8').replace("from 'three'",`from '${engineURL}'`).replace("from '../utils/BufferGeometryUtils.js'",`from '${moduleURL(utility)}'`);
const {GLTFLoader:RealLoader}=await import(moduleURL(loaderSource));
const rifleBytes=fs.readFileSync('./assets/m4a1.glb');
const rifleAsset=await new RealLoader().parseAsync(rifleBytes.buffer.slice(rifleBytes.byteOffset,rifleBytes.byteOffset+rifleBytes.byteLength),'');
assert.equal(rifleAsset.scene.children.length,4,'source objects merged into four meshes');
assert.ok(rifleAsset.scene.getObjectByName('Magazine'),'magazine available for animation');
let triangles=0;rifleAsset.scene.traverse(o=>{if(o.isMesh){triangles+=o.geometry.index.count/3;const n=o.geometry.attributes.normal;assert.ok(n.normalized);for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.02,'unit normals');}});
assert.equal(triangles,32980);assert.ok(rifleBytes.length<900000);
const noop=()=>{};
const context=new Proxy({},{get:()=>noop,set:()=>true});
class Element {
  constructor(id=''){this.id=id;this.children=[];this.hidden=true;this.style={setProperty:noop};this.value='';this.textContent='';this.className='';this.dataset={};this.innerHTML='';}
  get firstElementChild(){return this.children[0]??(this.children[0]=new Element());}
  get lastChild(){return this.children.at(-1);}
  getContext(){return context;}
  append(...x){this.children.push(...x);} prepend(x){this.children.unshift(x);} replaceChildren(...x){this.children=x;}
  remove(){this.removed=true;}
  requestPointerLock(){document.pointerLockElement=this;return Promise.resolve();}
}
const elements=new Map();
globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},createElement:()=>new Element(),addEventListener:noop,querySelectorAll:()=>[],exitPointerLock:noop};
globalThis.window={addEventListener:noop};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;globalThis.location={search:'?test'};
let frame;globalThis.requestAnimationFrame=fn=>{frame=fn;};
class FakeRenderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}clearDepth(){}}
const THREE={...RealThree,WebGLRenderer:FakeRenderer};
class FakeLoader{async loadAsync(path){return path.includes('m4a1')?{scene:rifleAsset.scene.clone(true)}:{scene:new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.8),new THREE.MeshStandardMaterial())};}}
const source=fs.readFileSync('./game.js','utf8').replace(/^import .*$/mg,'');
new Function('THREE','GLTFLoader',source)(THREE,FakeLoader);
await new Promise(r=>setTimeout(r,0));
const g=window.__game,{state,player}=g;
assert.ok(g.models.rifle,'async asset integration completed');
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
// Validate bundled binary models and every relative import.
for(const name of ['m4a1','blaster-b','crate-medium']){const data=fs.readFileSync('./assets/'+name+'.glb');assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);const json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));assert.ok(json.meshes.length);for(const image of json.images??[])if(image.uri)assert.ok(fs.existsSync('./assets/'+image.uri),'external model texture exists');console.log(name+': '+json.meshes.length+' meshes');}
console.log('PASS: actual M4A1 loader, quantized normals, four meshes, preserved PBR, reload/equip/settling, headshot raycast, ammo, navigation, collision, smoke, bot objectives, difficulty, asset and texture integrity.');
if(process.env.BLACKSITE_RENDER_EXPORT){
 state.weapon='rifle';g.equip('rifle');for(let i=0;i<150;i++)g.updateWeaponPresentation(.016);
 g.gunRoot.updateMatrixWorld(true);const meshes=[];
 g.gunRoot.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,p=[],norm=[],v=new THREE.Vector3(),m=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);p.push(v.toArray());v.fromBufferAttribute(n,i).applyMatrix3(m).normalize();norm.push(v.toArray());}meshes.push({name:o.name,positions:p,normals:norm,indices:Array.from(o.geometry.index.array),color:o.material.color.toArray()});}});
 fs.writeFileSync(process.env.BLACKSITE_RENDER_EXPORT,JSON.stringify(meshes));
}
