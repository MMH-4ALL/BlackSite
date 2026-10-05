import * as THREE from 'three';
export const SKINS=Object.freeze([
 {id:'default',name:'DEFAULT',level:1,color:[.22,.25,.24],accent:[.12,.14,.13],pattern:0,metal:.35},
 {id:'black',name:'TACTICAL BLACK',level:1,color:[.06,.075,.08],accent:[.13,.15,.15],pattern:0,metal:.3},
 {id:'desert',name:'DESERT',level:1,color:[.45,.37,.23],accent:[.20,.18,.12],pattern:1,metal:.15},
 {id:'urban',name:'URBAN',level:1,color:[.26,.30,.30],accent:[.10,.13,.14],pattern:2,metal:.18},
 {id:'woodland',name:'WOODLAND',level:2,color:[.18,.25,.12],accent:[.07,.10,.06],pattern:1,metal:.15},
 {id:'carbon',name:'CARBON',level:3,color:[.08,.10,.11],accent:[.18,.20,.21],pattern:3,metal:.55},
 {id:'steel',name:'WORN STEEL',level:4,color:[.32,.35,.34],accent:[.14,.17,.16],pattern:4,metal:.8},
 {id:'elite',name:'BLACKSITE ELITE',level:6,color:[.07,.11,.10],accent:[.48,.42,.26],pattern:2,metal:.55},
 {id:'prestige',name:'FIELD HONORS',level:1,badge:'blacksite',color:[.10,.12,.11],accent:[.50,.38,.16],pattern:4,metal:.65}
]);
export const skinById=id=>SKINS.find(s=>s.id===id)??SKINS[0];
export function skinUnlocked(skin,p){return skin.badge?p.badges.includes(skin.badge):1+Math.floor(Math.sqrt(p.xp/300))>=skin.level;}
const keys=['ak47','mp5','rifle','sv98','m82','pistol','c9','h45'];export const skinChoices=Object.fromEntries(keys.map(k=>[k,'default']));try{const saved=JSON.parse(localStorage.getItem('blacksite.skins.v1')||'{}');for(const k of keys)if(SKINS.some(s=>s.id===saved[k]))skinChoices[k]=saved[k];}catch{}
export function chooseSkin(weapon,id,p){if(!keys.includes(weapon)||!SKINS.some(s=>s.id===id)||!skinUnlocked(skinById(id),p))return false;skinChoices[weapon]=id;try{localStorage.setItem('blacksite.skins.v1',JSON.stringify(skinChoices));}catch{}return true;}
const cache=new WeakMap();
export function applySkin(root,id){const skin=skinById(id);root.traverse(o=>{if(!o.isMesh||o.userData.viewPart)return;const original=o.userData.skinOriginal??o.material;o.userData.skinOriginal=original;const prepare=source=>{if(skin.id==='default'||source.transparent&&source.opacity<.8)return source;let variants=cache.get(source);if(!variants){variants=new Map();cache.set(source,variants);}if(variants.has(skin.id))return variants.get(skin.id);const m=source.clone(),old=source.onBeforeCompile;m.roughness=skin.id==='steel'?.6:.78;m.metalness=skin.metal;m.onBeforeCompile=shader=>{old?.(shader);shader.uniforms.bsColor={value:new THREE.Color(...skin.color)};shader.uniforms.bsAccent={value:new THREE.Color(...skin.accent)};shader.uniforms.bsPattern={value:skin.pattern};shader.vertexShader='varying vec3 bsPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbsPosition=position;');shader.fragmentShader='varying vec3 bsPosition;uniform vec3 bsColor;uniform vec3 bsAccent;uniform float bsPattern;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 p=bsPosition*38.0;float mask=0.0;
 if(bsPattern==1.0)mask=step(.25,sin(p.x*.7+sin(p.z*.5)*2.0)*cos(p.y*.7-p.z*.4));
 if(bsPattern==2.0)mask=step(.4,sin(floor(p.x*.7)*7.0+floor(p.z*.7)*11.0+floor(p.y*.7)*3.0));
 if(bsPattern==3.0)mask=mod(floor(p.x*2.0)+floor(p.z*2.0),2.0)*.55;
 if(bsPattern==4.0)mask=smoothstep(.75,1.0,abs(sin(p.z*3.0+p.x*.3)))*.55;
 float detail=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*.5+.7,.65,1.0);diffuseColor.rgb=mix(bsColor,bsAccent,mask)*detail;`);};m.customProgramCacheKey=()=> 'blacksite-skin-'+skin.id;variants.set(skin.id,m);return m;};o.material=Array.isArray(original)?original.map(prepare):prepare(original);});}
