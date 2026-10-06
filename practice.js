import * as THREE from 'three';

// A separate game mode, not a replacement map. No economy, enemies or career XP.
export class PracticeRange {
  constructor({root,box,sign,surface}){
    this.parts=[];this.targets=[];this.time=0;this.moving=true;this.stats={shots:0,hits:0,headshots:0,eliminations:0};
    surface(0,-.045,0,40,.09,58,'concrete');
    for(const x of [-20,20])surface(x,2,0,.6,4,59,'concrete',true);
    for(const z of [-29,29])surface(0,2,z,40,4,.6,'concrete',true);
    surface(-12,2,5,6,4,.25,'concrete',true);sign('RECOIL BOARD',-12,3.2,5.14,0,5,.5);
    for(const x of [-14,-12,-10])for(let y=.4;y<3;y+=.4)box(x,y,5.135,.015,.015,.005,0xb7b89e);
    for(const z of [8,-5,-18]){box(4,.012,z,22,.015,.10,0x7a856e);sign(Math.round(22-z)+' METERS',17,1,z+.4,-Math.PI/2,2.3,.35);}
    sign('BLACKSITE / LIVE FIRE TRAINING',0,3.1,-28.68,0,13,.6);sign('B / RANGE CONTROLS',0,2.6,28.65,Math.PI,9,.5);
    [[-3,8,false],[5,8,false],[12,-5,false],[-3,-5,true],[4,-18,true]].forEach(([x,z,moving],id)=>{
      const group=new THREE.Group();root.add(group);group.position.set(x,0,z);group.userData.interactive=true;
      const target={id,group,x,z,moving,health:100,resetTime:0,active:true};this.targets.push(target);
      const material=new THREE.MeshStandardMaterial({color:0x969d7e,roughness:1}),body=new THREE.Mesh(new THREE.BoxGeometry(.55,.8,.06),material);body.position.y=1.03;body.userData.ownMaterial=true;group.add(body);
      const head=new THREE.Mesh(new THREE.CircleGeometry(.19,12),new THREE.MeshStandardMaterial({color:0xc5ba96,roughness:1,side:THREE.DoubleSide}));head.position.set(0,1.64,.005);head.userData.ownMaterial=true;group.add(head);
      for(const [part,zone] of [[body,'body'],[head,'head']]){part.userData.practice={target,zone};this.parts.push(part);}
      box(x,.32,z,.05,.64,.08,0x4a564c);
    });
  }
  hit(part,damage){const {target,zone}=part.userData.practice;if(!target.active)return false;this.stats.hits++;if(zone==='head')this.stats.headshots++;target.health-=damage;if(target.health<=0){target.active=false;target.resetTime=.8;target.group.visible=false;this.stats.eliminations++;return true;}return false;}
  update(dt){this.time+=dt;for(const target of this.targets){if(!target.active){target.resetTime-=dt;if(target.resetTime<=0){target.health=100;target.active=true;target.group.visible=true;}}target.group.position.x=target.x+(target.moving&&this.moving?Math.sin(this.time*(target.id===3?1.3:.9)+target.id)*2.2:0);}}
  reset(){this.stats={shots:0,hits:0,headshots:0,eliminations:0};this.time=0;for(const target of this.targets){target.health=100;target.active=true;target.resetTime=0;target.group.visible=true;target.group.position.x=target.x;}}
}
