import * as THREE from 'three';
export const MAP_FEATURES=Object.freeze({
  helix:{name:'RADIO RELAY',hint:'TRANSMIT FALSE CONTACT',x:-6,z:14,duration:8,description:'The relay emits false contact bursts that draw idle enemies toward the access lane.'},
  bastion:{name:'LOADING OVERRIDE',hint:'CYCLE LOADING ACCESS',x:2.8,z:12,duration:12,description:'A timed loading-door override opens the center route and sounds a warning.'},
  ironwood:{name:'FLOODLIGHT BREAKER',hint:'CUT MOTOR POOL LIGHTS',x:-10,z:13,duration:20,description:'Cut the perimeter equipment lights. Navigation and visibility rules stay fair.'},
  zero:{name:'SECURITY BYPASS',hint:'RELEASE SECURITY DOORS',x:3,z:9,duration:10,description:'Open both security doors temporarily; the alarm advertises the breach.'}
});
export class MapFeatures {
  constructor({root,map,floor,doors,lights,onSound,onNoise}){
    Object.assign(this,{doors,lights,onSound,onNoise});this.spec=MAP_FEATURES[map];this.remaining=0;this.cooldown=0;this.beat=0;this.closePending=false;
    const s=this.spec;this.group=new THREE.Group();this.group.userData.interactive=true;this.group.position.set(s.x,floor(s.x,s.z),s.z);root.add(this.group);
    const shell=new THREE.Mesh(new THREE.BoxGeometry(.42,1.15,.32),new THREE.MeshStandardMaterial({color:0x4b5750,roughness:.9}));shell.position.y=.575;shell.userData.ownMaterial=true;this.group.add(shell);
    this.indicator=new THREE.Mesh(new THREE.BoxGeometry(.24,.12,.025),new THREE.MeshStandardMaterial({color:0x8a936e,emissive:0x596746,emissiveIntensity:.35,roughness:.7}));this.indicator.position.set(0,.92,.174);this.indicator.userData.ownMaterial=true;this.group.add(this.indicator);
  }
  nearby(pos){return Math.abs(pos.y-this.group.position.y)<1.3&&pos.distanceTo(this.group.position)<2.4;}
  activate(pos,toggleDoor,actors){
    if(!this.nearby(pos)||this.cooldown>0)return false;this.remaining=this.spec.duration;this.cooldown=this.spec.duration+8;this.closePending=false;this.beat=0;
    if(this.spec.name.includes('OVERRIDE')||this.spec.name.includes('BYPASS'))for(const door of this.doors)if(!door.open)toggleDoor(door,actors);
    this.onSound?.('switch',this.group.position);return true;
  }
  update(dt,toggleDoor,actors){
    this.cooldown=Math.max(0,this.cooldown-dt);const before=this.remaining;this.remaining=Math.max(0,this.remaining-dt);this.beat-=dt;
    if(this.remaining>0){this.indicator.material.emissiveIntensity=.45+Math.sin(this.remaining*4)*.2;
      if(this.spec.name==='FLOODLIGHT BREAKER'){for(const item of this.lights)if(item.lamp)item.mesh.material.emissiveIntensity=0;}
      else if(this.beat<=0){this.beat=this.spec.name==='RADIO RELAY'?.8:1.4;this.onSound?.(this.spec.name==='RADIO RELAY'?'decoy':'alarm',this.group.position);this.onNoise?.(this.group.position,'ally',2);}}
    if(before>0&&this.remaining===0){this.indicator.material.emissiveIntensity=.35;if(this.spec.name==='FLOODLIGHT BREAKER'){for(const item of this.lights)if(item.lamp&&!item.broken)item.mesh.material.emissiveIntensity=.35;}if(this.spec.name.includes('OVERRIDE')||this.spec.name.includes('BYPASS'))this.closePending=true;}
    if(this.closePending){let pending=false;for(const door of this.doors)if(door.open&&!toggleDoor(door,actors))pending=true;this.closePending=pending;}
  }
  reset(){this.remaining=0;this.cooldown=0;this.closePending=false;this.indicator.material.emissiveIntensity=.35;for(const item of this.lights)if(item.lamp&&!item.broken)item.mesh.material.emissiveIntensity=.35;}
}
