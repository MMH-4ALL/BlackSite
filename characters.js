import * as THREE from 'three';
import {clone as cloneSkeleton} from './vendor/utils/SkeletonUtils.js';
const UPPER=/^(Head|neck_|spine_|clavicle_|upperarm_|lowerarm_|hand_)/;
const v=new THREE.Vector3();
export async function loadOperators(loader){
 const asset=await loader.loadAsync('./assets/operators/operator.glb?v=0.8.0');
 const bounds=new THREE.Box3().setFromObject(asset.scene),height=bounds.max.y-bounds.min.y;
 const styles={};
 for(const side of ['attack','defend']){
  const model=cloneSkeleton(asset.scene);model.scale.setScalar(1.8/height);model.position.y=-bounds.min.y*model.scale.y;
  model.traverse(o=>{if(!o.isMesh)return;o.userData.asset=true;o.castShadow=true;o.receiveShadow=true;
   o.material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95});
   if(side==='defend'){
    o.geometry=o.geometry.clone();const colors=o.geometry.getAttribute('color');
    for(let i=0;i<colors.count;i++)if(colors.getX(i)<.3&&colors.getX(i)>.075)colors.setXYZ(i,.27,.31,.19);
   }
   o.frustumCulled=false; // Fixed humanoid bounds avoid animated limbs disappearing.
  });styles[side]=model;
 }
 const clips={};
 for(const clip of asset.animations){
  // Root translation is deliberately absent: pathing owns the character origin.
  const tracks=clip.tracks.filter(t=>!/^root\./.test(t.name));
  clips[clip.name]={lower:new THREE.AnimationClip(clip.name+' lower',clip.duration,tracks.filter(t=>!UPPER.test(t.name))),upper:new THREE.AnimationClip(clip.name+' upper',clip.duration,tracks.filter(t=>UPPER.test(t.name)))};
 }
 return {styles,clips,triangles:6386};
}
export function attachOperator(assets,bot){
 const old=bot.rig,rig=new THREE.Group(),model=cloneSkeleton(assets.styles[bot.side]);
 rig.add(model);bot.group.add(rig);
 const aim=new THREE.Group();aim.position.y=1.22;rig.add(aim);aim.add(bot.gun,bot.workDevice);
 bot.gun.position.set(.14,.04,-.22);bot.workDevice.position.set(0,-.2,-.36);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.20,10,6),new THREE.MeshStandardMaterial({color:bot.side==='attack'?0x303a3e:0x76815e,roughness:1}));
 helmet.scale.set(1,.64,1.03);helmet.position.set(0,1.74,0);helmet.userData.ownMaterial=true;rig.add(helmet);
 const marker=new THREE.Mesh(new THREE.RingGeometry(.25,.29,12),new THREE.MeshBasicMaterial({color:0x9fc5ab,side:THREE.DoubleSide,depthTest:true}));
 marker.rotation.x=-Math.PI/2;marker.position.y=.035;marker.visible=bot.team==='ally';marker.userData.ownMaterial=true;rig.add(marker);
 bot.group.remove(old);old.traverse(o=>{if(o.isMesh&&!o.userData.asset){o.geometry.dispose();if(o.userData.ownMaterial)o.material.dispose();}});
 const mixer=new THREE.AnimationMixer(model),actions={};
 for(const [name,layers] of Object.entries(assets.clips))for(const layer of ['lower','upper'])if(layers[layer].tracks.length)actions[name+':'+layer]=mixer.clipAction(layers[layer]);
 bot.rig=rig;bot.operator={rig,model,aim,helmet,marker,mixer,actions,headBone:model.getObjectByName('Head'),current:{},previous:bot.pos.clone(),elapsed:0,updates:0,disposed:false};
 return bot.operator;
}
function play(operator,name,layer,once=false){
 const key=name+':'+layer;if(operator.current[layer]===key)return;
 const next=operator.actions[key]||operator.actions['Idle_Loop:'+layer],old=operator.actions[operator.current[layer]];
 if(!next)return;next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);next.clampWhenFinished=once;next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.play();
 if(old)next.crossFadeFrom(old,.16,false);operator.current[layer]=key;
}
export function updateOperator(bot,dt,cameraPosition,quality){
 const op=bot.operator;if(!op||dt<=0||op.disposed)return;
 // Presentation LOD only; damage, visibility and navigation still run normally.
 const distance=bot.pos.distanceTo(cameraPosition),period=quality==='low'?(distance<18?.05:distance<35?.1:.2):(distance<22?1/30:distance<40?1/15:1/8);
 op.elapsed+=dt;bot.flashTime=Math.max(0,bot.flashTime-dt);bot.fireKick*=Math.exp(-15*dt);bot.muzzle.visible=bot.alive&&bot.flashTime>0;
 const work=bot.planting>0||bot.defusing,blind=bot.blind>0;
 bot.gun.visible=!work&&!blind&&bot.alive;bot.workDevice.visible=work&&bot.alive;
 const target=bot.target?.pos;
 const pitch=target?Math.atan2(target.y+1.25-(bot.pos.y+1.22),Math.max(.1,Math.hypot(target.x-bot.pos.x,target.z-bot.pos.z))):0;
 op.aim.rotation.x=THREE.MathUtils.damp(op.aim.rotation.x,pitch-bot.fireKick*.10,15,dt);
 bot.gun.position.z=-.22+bot.fireKick*.035;
 if(op.elapsed<period||!bot.alive&&op.deathFinished)return;
 const elapsed=op.elapsed;op.elapsed=0;op.updates++;
 const moved=bot.pos.distanceTo(op.previous);const displacement=bot.pos.clone().sub(op.previous);op.previous.copy(bot.pos);bot.visualSpeed=moved/Math.max(.001,elapsed);
 if(!bot.alive){op.deathTime=(op.deathTime||0)+elapsed;play(op,'Death01','lower',true);play(op,'Death01','upper',true);op.helmet.visible=false;op.marker.visible=false;bot.workDevice.visible=false;}
 else{
  const moving=bot.visualSpeed>.15,crouch=bot.crouched||work;
  const local=v.copy(displacement);bot.previous.copy(bot.pos);
  const lower=crouch?(moving?'Crouch_Fwd_Loop':'Crouch_Idle_Loop'):moving?(bot.visualSpeed>3.2?'Sprint_Loop':bot.visualSpeed>2.6?'Jog_Fwd_Loop':'Walk_Loop'):'Idle_Loop';
  const upper=blind?'Hit_Head':work?'Fixing_Kneeling':bot.reload>0?'Pistol_Reload':bot.flashTime>0?'Pistol_Shoot':'Pistol_Aim_Neutral';
  play(op,lower,'lower');play(op,upper,'upper');
  // Directional strafe/turn blend uses actual displacement, with no root motion.
  op.rig.rotation.z=THREE.MathUtils.damp(op.rig.rotation.z,THREE.MathUtils.clamp(local.x*-.1,-.04,.04),10,elapsed);
  op.helmet.position.y=crouch?1.13:1.74;
 }
 op.mixer.update(elapsed);if(!bot.alive&&op.deathTime>3)op.deathFinished=true;
 if(bot.alive&&op.headBone){op.headBone.getWorldPosition(v);op.rig.worldToLocal(v);op.helmet.position.copy(v).y+=.10;}
}
export function disposeOperator(operator){if(!operator||operator.disposed)return;operator.mixer.stopAllAction();operator.mixer.uncacheRoot(operator.model);operator.disposed=true;}
