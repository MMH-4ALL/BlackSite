// Development only. npm install @gltf-transform/{core,functions} meshoptimizer.
// Source arguments: base-character.gltf, UAL1_Standard.glb, output.glb.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(process.env.BLACKSITE_BUILD_MODULES+'/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')));
const {prune,dedup,weld,simplify,resample}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')));
const {MeshoptSimplifier}=await import(pathToFileURL(require.resolve('meshoptimizer')));
import {Quaternion} from '../vendor/three.module.js';
const [characterPath,animationPath,outputPath]=process.argv.slice(2),io=new NodeIO();
const json=JSON.parse(fs.readFileSync(characterPath,'utf8'));
// Strip appearance references before reading: some free source exports refer to
// unavailable texture names. Clothing uses compact vertex colors in this build.
for(const material of json.materials){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;}
delete json.images;delete json.textures;
const resources=Object.fromEntries(json.buffers.map(b=>[b.uri,new Uint8Array(fs.readFileSync(path.resolve(path.dirname(characterPath),b.uri)))]));
const character=await io.readJSON({json,resources}),library=await io.read(animationPath),root=character.getRoot();
// The free humanoid has the same bone names but different proportions. Preserve
// its bind pose and bone lengths while retargeting relative local rotations.
const targets=new Map(root.listNodes().map(n=>[n.getName(),n]));
const clips=new Set(['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Crouch_Idle_Loop','Crouch_Fwd_Loop','Pistol_Aim_Neutral','Pistol_Shoot','Pistol_Reload','Fixing_Kneeling','Interact','Hit_Head','Death01']);
const buffer=root.listBuffers()[0];
for(const source of library.getRoot().listAnimations()){
 if(!clips.has(source.getName()))continue;
 const animation=character.createAnimation(source.getName());
 for(const channel of source.listChannels()){
  const node=channel.getTargetNode(),name=node.getName(),target=targets.get(name),path=channel.getTargetPath();
  if(!target||/leaf|index_|middle_|pinky_|ring_|thumb_/.test(name)||path==='scale'||path==='translation'&&name!=='pelvis')continue;
  const sampler=channel.getSampler(),times=sampler.getInput().getArray(),values=sampler.getOutput().getArray(),dim=path==='rotation'?4:3,keep=[0];
  for(let i=1;i<times.length-1;i++)if(times[i]-times[keep.at(-1)]>=1/24-.0001)keep.push(i);
  if(times.length>1)keep.push(times.length-1);
  const input=new Float32Array(keep.map(i=>times[i])),output=new Float32Array(keep.length*dim);
  const rest=new Quaternion().fromArray(target.getRotation()),inverse=new Quaternion().fromArray(node.getRotation()).invert();
  for(const [k,i] of keep.entries()){
   if(path==='rotation')rest.clone().multiply(inverse).multiply(new Quaternion().fromArray(values,i*4)).normalize().toArray(output,k*4);
   else{const a=target.getTranslation(),b=node.getTranslation();for(let d=0;d<3;d++)output[k*3+d]=a[d]+values[i*3+d]-b[d];}
  }
  const track=character.createAnimationSampler().setInput(character.createAccessor().setType('SCALAR').setArray(input).setBuffer(buffer)).setOutput(character.createAccessor().setType(dim===4?'VEC4':'VEC3').setArray(output).setBuffer(buffer)).setInterpolation('LINEAR');
  animation.addSampler(track).addChannel(character.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(track));
 }
}
// Remove large appearance maps, face micro-details, and unused morphs. Team
// clothing colors are driven by the existing skeleton's vertex influences.
for(const material of root.listMaterials())material.dispose();
const cloth=character.createMaterial('Operator clothing').setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.95).setMetallicFactor(0);
for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){
 primitive.setMaterial(cloth);
 for(const key of primitive.listSemantics())if(key.startsWith('TEXCOORD')||key==='TANGENT')primitive.setAttribute(key,null);
 for(const target of primitive.listTargets())primitive.removeTarget(target);
 const skin=root.listSkins()[0],joints=skin.listJoints(),indices=primitive.getAttribute('JOINTS_0')?.getArray(),weights=primitive.getAttribute('WEIGHTS_0')?.getArray(),count=primitive.getAttribute('POSITION').getCount();
 const color=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  let bone='',best=-1;for(let k=0;k<4;k++)if(weights&&weights[i*4+k]>best){best=weights[i*4+k];bone=joints[indices[i*4+k]].getName();}
  const rgb=/Head|neck/.test(bone)?[.56,.46,.36]:/hand|finger|thumb|foot|ball/.test(bone)?[.055,.064,.065]:/thigh|calf/.test(bone)?[.095,.112,.12]:[.125,.145,.16];
  color.set(rgb,i*3);
 }
 primitive.setAttribute('COLOR_0',character.createAccessor().setType('VEC3').setArray(color).setBuffer(buffer));
}
await MeshoptSimplifier.ready;
await character.transform(prune(),dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.42,error:.002}),resample(),prune());
await io.write(outputPath,character);
console.log(JSON.stringify({file:outputPath,bytes:fs.statSync(outputPath).size,clips:root.listAnimations().map(a=>a.getName()),triangles:root.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0)}));
