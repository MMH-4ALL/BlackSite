import * as THREE from 'three';

// Small, locally rendered zones. Damage/AI are discrete gameplay ticks, not particles.
export class TacticalUtilities {
  constructor({scene,floor,blocked,quality,onSound,onNoise,onDamage}){Object.assign(this,{scene,floor,blocked,quality,onSound,onNoise,onDamage});this.fires=[];this.decoys=[];}
  disposeItem(item,list){this.scene.remove(item.mesh);const geometries=new Set(),materials=new Set();item.mesh.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());const i=list.indexOf(item);if(i>=0)list.splice(i,1);}
  clear(){for(const f of [...this.fires])this.disposeItem(f,this.fires);for(const d of [...this.decoys])this.disposeItem(d,this.decoys);}
  fire(pos,team='ally',owner='player'){
    if(this.fires.length>=3)this.disposeItem(this.fires[0],this.fires);
    const mesh=new THREE.Group(),floor=this.floor(pos.x,pos.z);mesh.position.set(pos.x,floor+.035,pos.z);
    const base=new THREE.Mesh(new THREE.CircleGeometry(2.5,24),new THREE.MeshBasicMaterial({color:0x9c6035,transparent:true,opacity:.46,depthWrite:false}));base.rotation.x=-Math.PI/2;mesh.add(base);
    const count=this.quality()==='low'?3:8,geometry=new THREE.ConeGeometry(.17,.42,4),material=new THREE.MeshBasicMaterial({color:0xc49b65,transparent:true,opacity:.6,depthWrite:false});
    for(let i=0;i<count;i++){const flame=new THREE.Mesh(geometry,material),a=i*2.4,r=.5+(i%3)*.65;flame.position.set(Math.cos(a)*r,.20,Math.sin(a)*r);mesh.add(flame);}
    this.scene.add(mesh);const item={mesh,pos:mesh.position.clone(),radius:2.5,life:8,tick:0,team,owner};this.fires.push(item);this.onSound?.('fire',item.pos);return item;
  }
  decoy(pos,team='ally'){
    if(this.decoys.length>=3)this.disposeItem(this.decoys[0],this.decoys);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.18,6),new THREE.MeshStandardMaterial({color:0x606b57,roughness:1}));mesh.position.set(pos.x,this.floor(pos.x,pos.z)+.10,pos.z);this.scene.add(mesh);
    const item={mesh,pos:mesh.position.clone(),team,life:10,beat:0};this.decoys.push(item);return item;
  }
  affects(fire,pos,team){return fire.team!==team&&fire.life>0&&Math.abs(pos.y-fire.pos.y)<.7&&Math.hypot(pos.x-fire.pos.x,pos.z-fire.pos.z)<fire.radius&&!this.blocked(fire.pos.clone().add(new THREE.Vector3(0,.3,0)),pos.clone().add(new THREE.Vector3(0,.6,0)),false);}
  hazard(pos,team,radius=.4){return this.fires.some(f=>f.team!==team&&f.life>0&&Math.abs(pos.y-f.pos.y)<.7&&Math.hypot(pos.x-f.pos.x,pos.z-f.pos.z)<f.radius+radius&&!this.blocked(f.pos.clone().add(new THREE.Vector3(0,.3,0)),pos.clone().add(new THREE.Vector3(0,.6,0)),false));}
  extinguish(smokes){let count=0;for(const f of [...this.fires])if(smokes.some(s=>s.life>0&&s.pos.distanceTo(f.pos)<s.radius+1)){this.disposeItem(f,this.fires);count++;}return count;}
  update(dt,actors,smokes){
    if(dt<=0)return;this.extinguish(smokes);
    for(const f of [...this.fires]){f.life-=dt;f.tick-=dt;f.mesh.children[0].material.opacity=.46*Math.min(1,Math.max(0,f.life));for(let i=1;i<f.mesh.children.length;i++)f.mesh.children[i].scale.y=.7+Math.sin((8-f.life)*9+i)*.2;
      if(f.life<=0){this.disposeItem(f,this.fires);continue;}if(f.tick<=0){f.tick=.2;for(const actor of actors)if(actor.alive&&this.affects(f,actor.pos,actor.team))this.onDamage(actor,6,f);}}
    for(const d of [...this.decoys]){d.life-=dt;d.beat-=dt;if(d.life<=0){this.disposeItem(d,this.decoys);continue;}if(d.beat<=0){d.beat=.65;this.onSound?.('decoy',d.pos);this.onNoise?.(d.pos,d.team,3);}}
  }
}
