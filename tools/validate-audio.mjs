import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SOUND_BANK,WeaponAudio} from '../audio.js';
import {WEAPONS} from '../weapons.js';

const root=fileURLToPath(new URL('../assets/audio/',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function readWav(bytes){
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length);
  let fmt,data;
  for(let i=12;i+8<=bytes.length;){const name=bytes.toString('ascii',i,i+4),size=bytes.readUInt32LE(i+4);assert.ok(i+8+size<=bytes.length);if(name==='fmt ')fmt=bytes.subarray(i+8,i+8+size);if(name==='data')data=bytes.subarray(i+8,i+8+size);i+=8+size+(size%2);}
  assert.ok(fmt&&data);assert.equal(fmt.readUInt16LE(0),1);assert.equal(fmt.readUInt16LE(2),1);assert.equal(fmt.readUInt32LE(4),44100);assert.equal(fmt.readUInt16LE(14),16);
  let peak=0,energy=0;for(let i=0;i<data.length;i+=2){const value=data.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(value));energy+=value*value;}
  assert.ok(peak>.1&&peak<.95,'audible transient with headroom');assert.ok(Math.sqrt(energy/(data.length/2))>.005,'not silent');
  const onset=Array.from({length:Math.min(data.length/2,441)},(_,i)=>Math.abs(data.readInt16LE(i*2))/32768);
  assert.ok(Math.max(...onset)>peak*.045,'attack begins within ten milliseconds');
  return {duration:data.length/(44100*2),peak};
}
const clips=new Map(),sourceRanges=new Map();
for(const record of manifest.clips){
  const bytes=fs.readFileSync(path.join(root,record.file));
  assert.equal(bytes.length,record.bytes);assert.equal(digest(bytes),record.sha256);
  const wav=readWav(bytes);assert.ok(Math.abs(wav.duration-record.duration)<.000001);assert.ok(wav.duration>.05&&wav.duration<2);
  assert.ok(manifest.sources[record.source]);assert.equal(manifest.sources[record.source].license,'CC0-1.0');
  const [start,end]=record.sourceRangeSeconds;assert.ok(end>start);
  for(const [a,b] of sourceRanges.get(record.source)||[])assert.ok(end<=a||start>=b,'source excerpt is never reused');
  sourceRanges.set(record.source,[...(sourceRanges.get(record.source)||[]),[start,end]]);clips.set(record.file,{...record,...wav});
}
assert.equal(clips.size,60);assert.equal(new Set(manifest.clips.map(c=>c.sha256)).size,60,'every output is different');
assert.ok(manifest.clips.reduce((n,c)=>n+c.bytes,0)<3200000,'download budget');
const assigned=Object.values(SOUND_BANK).flatMap(bank=>[...bank.shots,...bank.reload,bank.equip,bank.empty,...(bank.bolt||[]),...(bank.distant||[])]);
assert.equal(new Set(assigned).size,assigned.length,'no two actions share a file');assert.deepEqual([...assigned].sort(),[...clips.keys()].sort());
for(const [key,bank] of Object.entries(SOUND_BANK)){
  assert.equal(bank.shots.length,2);assert.equal(bank.reload.length,3);
  bank.reload.forEach((file,i)=>assert.ok(bank.reloadAt[i]*WEAPONS[key].reload+clips.get(file).duration<=WEAPONS[key].reload+.01,'reload stage fits actual gameplay time'));
}

// Exercise the real audio class with local bytes and observable Web Audio nodes.
// This tests scheduling/cleanup, not a browser's decoder, output driver or speaker.
class Param {constructor(value=0){this.value=value;}cancelScheduledValues(){}setTargetAtTime(v){this.value=v;}}
class Node {constructor(){this.connections=[];}connect(n){this.connections.push(n);}disconnect(){this.connections=[];}}
class Source extends Node {constructor(ctx){super();this.ctx=ctx;this.stopped=false;}start(at){this.at=at;this.ctx.started.push(this);}stop(){this.stopped=true;this.onended?.();}}
class Context {
  constructor(){this.currentTime=10;this.state='suspended';this.destination={};this.started=[];this.decoded=0;}
  resume(){this.state='running';return Promise.resolve();}
  createGain(){return Object.assign(new Node(),{gain:new Param(1)});}
  createDynamicsCompressor(){return Object.assign(new Node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,new Param()])));}
  createStereoPanner(){return Object.assign(new Node(),{pan:new Param()});}
  createBufferSource(){return new Source(this);}
  async decodeAudioData(data){this.decoded++;const bytes=Buffer.from(data),record=manifest.clips.find(c=>c.sha256===digest(bytes));assert.ok(record);return {...readWav(bytes),file:record.file};}
}
const ctx=new Context();let fetches=0;
const sound=new WeaponAudio({contextFactory:()=>ctx,fetchFile:async url=>{
  fetches++;const bytes=fs.readFileSync(path.join(root,path.basename(new URL(url).pathname)));
  return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
}});
await Promise.all([sound.unlock(),sound.unlock()]);assert.equal(fetches,60);assert.equal(ctx.decoded,60);assert.equal(sound.buffers.size,60);assert.deepEqual(sound.failed,[]);
for(const key of Object.keys(WEAPONS)){
  sound.stopAll();const first=sound.shot(key),second=sound.shot(key);
  assert.ok(first&&second);assert.notEqual(first.file,second.file,'two actual recorded shots alternate');
  assert.equal(first.file,SOUND_BANK[key].shots[0]);assert.equal(second.file,SOUND_BANK[key].shots[1]);
  assert.equal(first.source.at,ctx.currentTime);
  if(key==='sv98')assert.equal([...sound.voices].filter(v=>v.kind==='handling').length,4,'both shots schedule a bolt cycle');
  else assert.equal([...sound.voices].filter(v=>v.kind==='handling').length,0);
  sound.reload(key,WEAPONS[key].reload);
  const stages=[...sound.voices].filter(v=>v.kind==='handling');assert.equal(stages.length,3);
  stages.forEach((v,i)=>{assert.equal(v.file,SOUND_BANK[key].reload[i]);assert.equal(v.source.at,ctx.currentTime+SOUND_BANK[key].reloadAt[i]*WEAPONS[key].reload);});
  sound.stopHandling();assert.ok(stages.every(v=>v.source.stopped),'pause / cancellation stops future sources');
  assert.equal(sound.reload(key,WEAPONS[key].reload,WEAPONS[key].reload*.70),1,'resume schedules only the remaining final stage');
  const pending=[...sound.voices].filter(v=>v.kind==='handling');sound.equip(key);assert.ok(pending.every(v=>v.source.stopped),'switching cancels pending reload');
  assert.equal([...sound.voices].filter(v=>v.kind==='handling')[0].file,SOUND_BANK[key].equip);
  assert.equal(sound.empty(key).file,SOUND_BANK[key].empty);
}
sound.stopAll();const enemy=sound.shot('rifle',{enemy:true,distance:30,pan:2});
assert.equal(enemy.file,SOUND_BANK.rifle.distant[0]);assert.equal(enemy.panner.pan.value,1);assert.ok(enemy.level.gain.value<.2,'distant enemy quieter');
assert.notEqual(enemy.file,SOUND_BANK.rifle.shots[0]);
sound.setVolume(0);assert.equal(sound.master.gain.value,0);const starts=ctx.started.length;assert.equal(sound.shot('m82'),null);assert.equal(ctx.started.length,starts,'mute creates no new voice');
sound.setVolume(.8);assert.equal(sound.master.gain.value,.8);
const voices=[];for(let i=0;i<80;i++)voices.push(sound.shot('rifle'));assert.ok(sound.voices.size<=40);assert.ok(voices[0].source.stopped,'old tails are cleaned up under sustained fire');
const ending=[...sound.voices][0];ending.source.onended();assert.ok(!sound.voices.has(ending));assert.equal(ending.source.connections.length,0);
sound.stopAll();assert.equal(sound.voices.size,0);
ctx.state='suspended';assert.equal(sound.shot('pistol'),null);await sound.unlock();assert.equal(fetches,60,'resume never redownloads');
const before=sound.buffers.get(SOUND_BANK.m82.shots[0]);sound.buffers.delete(SOUND_BANK.m82.shots[0]);sound.cursor.set('m82:shot',0);assert.equal(sound.shot('m82'),null,'missing sound never borrows another gun');sound.buffers.set(SOUND_BANK.m82.shots[0],before);
console.log('PASS: 60 distinct PCM WAVs and source ranges, CC0 provenance, all action mappings, reload timing/cancellation/resume, shot variants, bot distance/pan, volume/mute, missing assets, caching, rapid fire and node cleanup.');
