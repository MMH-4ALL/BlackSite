import * as THREE from 'three';
export const ENVIRONMENT_ASSETS=['warehouse','quarter','radiostation','snipertower','gatekeeperstation','gastank','lightpole','container_01','sandssack','hesco'];
const ROOT='./assets/environment/';
// All runtime textures and models are bundled. No third-party requests in play.
export async function loadEnvironment(loader){
  const textureLoader=new THREE.TextureLoader(),textures={};
  await Promise.all(['concrete034','asphalt010','metal032'].flatMap(name=>['color','normal','roughness'].map(async kind=>{
    const t=await textureLoader.loadAsync(ROOT+name+'-'+kind+'.jpg?v=0.7.0');
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(kind==='color')t.colorSpace=THREE.SRGBColorSpace;textures[name+'-'+kind]=t;
  })));
  const surfaces={};
  for(const [name,key,color] of [['concrete','concrete034',0xb8b9b0],['asphalt','asphalt010',0xa7ada6],['metal','metal032',0x777f76]]){
    surfaces[name]=new THREE.MeshStandardMaterial({color,map:textures[key+'-color'],normalMap:textures[key+'-normal'],roughnessMap:textures[key+'-roughness'],roughness:1,metalness:name==='metal'?.45:0,normalScale:new THREE.Vector2(.5,.5)});
  }
  const models={};
  await Promise.all(ENVIRONMENT_ASSETS.map(async name=>{
    const g=(await loader.loadAsync(ROOT+name+'.glb?v=0.7.0')).scene;
    g.traverse(o=>{if(!o.isMesh)return;o.userData.asset=true;o.castShadow=true;o.receiveShadow=true;
      if(name==='warehouse'||name==='hesco')return;
      const source=o.material,label=source.name.toLowerCase(),window=/window|glass/.test(label),dark=/black|door/.test(label),concrete=/wall|lightyellow|sand/.test(label);
      const material=window?new THREE.MeshStandardMaterial({color:0x2c3a3b,roughness:.3,metalness:.35}):surfaces[concrete?'concrete':'metal'].clone();
      material.name=source.name;if(!window)material.color.set(dark?0x39403a:/yellow|green|color/.test(label)?0x7b806a:0xa1a69d);o.material=material;
      const uv=o.geometry.attributes.uv;if(uv){for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*8,uv.getY(i)*8);uv.needsUpdate=true;}
    });models[name]=g;
  }));
  return {models,surfaces};
}
export function textureBox(mesh,material,tile=2){
  mesh.material=material;
  const {width:w,height:h,depth:d}=mesh.geometry.parameters,uv=mesh.geometry.attributes.uv;
  for(let f=0;f<6;f++){const [a,b]=f<2?[d,h]:f<4?[w,d]:[w,h];for(let i=f*4;i<f*4+4;i++)uv.setXY(i,uv.getX(i)*a/tile,uv.getY(i)*b/tile);}
  uv.needsUpdate=true;return mesh;
}
export function placeEnvironment(root,environment,props,hitWalls){
  for(const p of props){const source=environment.models[p.asset];if(!source)continue;const m=source.clone(true),bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3());
    // Explicit dimensions match the authored footprint and collision metadata.
    m.scale.set(p.w/size.x,(p.h??p.w*size.y/size.x)/size.y,(p.d??p.w*size.z/size.x)/size.z);m.rotation.y=(p.turn??0)*Math.PI/2;m.position.set(p.x,p.y??0,p.z);m.name=p.asset;root.add(m);m.updateMatrixWorld(true);
    m.traverse(o=>{if(o.isMesh)hitWalls.push(o);});
  }
}
