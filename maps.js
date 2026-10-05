// Original layouts. Positions/dimensions are meters: [x,z,width,depth,height].
export const MAX_BOTS=16;
export const DEFAULT_BOTS=6;
export function normalizeBotCount(value){
  if(!['number','string'].includes(typeof value)||value==='')return DEFAULT_BOTS;
  const n=Number(value);return Number.isFinite(n)?Math.min(MAX_BOTS,Math.max(1,Math.round(n))):DEFAULT_BOTS;
}
// Closed imported buildings are solid footprints; sites and routes stay outside.
const prop=(asset,x,z,w,d,h,turn=0,solid=true)=>({asset,x,z,w,d,h,turn,solid});
const common=[prop('snipertower',-27,-26,4,4,8,0,false),prop('snipertower',27,25,4,4,8,2,false),...[-22,22].flatMap(x=>[-23,-7,11,25].map(z=>prop('lightpole',x,z,1,1,7,0,false)))];
function map(data){
  data.props.push(...common);data.baseY??=0;data.doors??=[];
  if(data.id!=='zero'){data.walkSurfaces=[{x:0,z:14,w:3,d:8,axis:'z',from:0,to:1.8},{x:0,z:20,w:3,d:4,y:1.8}];data.elevation={vantage:[0,20]};data.props.push({...prop('catwalk',0,20,3,4,.15,0,false),y:1.62});}
  for(const p of data.props)p.y??=data.baseY;
  // Every solid prop has one matching axis-aligned footprint after rotation.
  data.covers=data.props.filter(p=>p.solid).map(p=>[p.x,p.z,p.turn%2?p.d:p.w,p.turn%2?p.w:p.d,p.h]);
  return data;
}
export const MAPS=Object.freeze({
  helix:map({id:'helix',number:'01',tag:'HELIX',name:'Helix Compound',subtitle:'Restricted territory.',theme:'Desert communications facility',
    description:'Barracks lanes, a fortified radio station, and a brick service warehouse.',image:'helix-map.svg',preview:'environment/helix-scene.jpg',
    palette:{sky:0xb3afa4,ground:0x8e8875,floor:0x909386,wall:0xa0a394,trim:0x59615a,cover:0x6a7464},
    sites:[[-15,-18],[15,-18]],siteNames:['SIGNAL COURT','SERVICE YARD'],spawns:{attack:[0,26],defend:[-3,-26]},
    botAnchors:{attack:[[-15,-25],[15,-25],[0,-24]],defend:[[-15,25],[0,25],[15,25]]},
    patrol:[[-16,-12],[16,-12],[0,13],[-16,15],[16,15]],
    doors:[{x:-4,z:12,w:2.1,name:'SIGNAL ACCESS'}],walls:[[-6.025,12,1.95,.7,2.8],[-1.975,12,1.95,.7,2.8],[8,-15,.7,7,3.2],[-16,-8,8,.7,2.8]],crates:[[-21,18],[21,-25],[-20,-23]],
    props:[prop('solar-panel',-26,6,5,3,1.7,0,false),prop('pipe-unit',-21,0,1.2,3,2,0,false),prop('access-terminal',-8,-9,.6,.6,1.2,0,false),prop('industrial-tank',26,-12,4,4,5,0,false),prop('quarter',-15,3,12,7,4.3),prop('warehouse',16,4,11,15,5),prop('radiostation',0,-5,9,7,8.4),
      prop('container_01',-16,15,7,2.5,2.5),prop('container_01',7,15,7,2.5,2.5,1),prop('hesco',-18,-18,3,1.6,1.4),prop('hesco',17,-18,3,1.6,1.4),
      prop('gastank',0,-19,5,2.6,2.6),prop('gatekeeperstation',-15,32,5,5,3.6,0,false),prop('quarter',-34,7,16,9,5,0,false),prop('warehouse',35,-15,17,23,7,0,false)]}),
  bastion:map({id:'bastion',number:'02',tag:'BASTION',name:'Bastion Depot',subtitle:'Secure the stockpile.',theme:'Fortified military logistics depot',
    description:'Two brick warehouses, corrugated cargo stacks, and fortified loading yards.',image:'bastion-map.svg',preview:'environment/bastion-scene.jpg',
    palette:{sky:0xaaa99e,ground:0x838677,floor:0x858b83,wall:0x989e91,trim:0x535e54,cover:0x66725d},
    sites:[[-16,-19],[16,-19]],siteNames:['ORDNANCE YARD','FUEL DEPOT'],spawns:{attack:[0,26],defend:[-3,-26]},
    botAnchors:{attack:[[-16,-26],[16,-26],[0,-24]],defend:[[-16,25],[0,25],[16,25]]},
    patrol:[[-16,17],[16,17],[0,13],[-16,-14],[16,-14]],
    doors:[{x:0,z:10,w:2.1,name:'LOADING ACCESS'}],walls:[[-2.025,10,1.95,.7,2.8],[2.025,10,1.95,.7,2.8],[0,-16,6,.7,2.8]],crates:[[-20,-26],[20,-26],[-4,19],[4,19]],
    props:[prop('loading-lift',-25,10,5,4,6,0,false),prop('conveyor',25,15,5,2,1,0,false),prop('machinery',25,-15,4,3,3,0,false),prop('warehouse',-16,2,10,17,4.8),prop('warehouse',16,4,10,17,4.8),prop('container_01',-5,-5,7,2.5,2.5,1),prop('container_01',5,0,7,2.5,2.5,1),
      prop('container_01',-16,17,7,2.5,2.5),prop('container_01',16,19,7,2.5,2.5),prop('hesco',-18,-18,3,1.6,1.4),prop('hesco',18,-18,3,1.6,1.4),prop('gastank',15,-25,5,2.6,2.6),
      prop('quarter',0,36,18,10,5,0,false),prop('warehouse',-35,-13,17,28,7,0,false),prop('warehouse',36,0,19,28,8,0,false)]}),
  ironwood:map({id:'ironwood',number:'03',tag:'IRONWOOD',name:'Ironwood Garrison',subtitle:'Retake the forward base.',theme:'Overcast military motor pool',
    description:'A central maintenance warehouse, guardhouse flank, and radio relay yard.',image:'ironwood-map.svg',preview:'environment/ironwood-scene.jpg',
    palette:{sky:0x929b95,ground:0x667268,floor:0x7f8a80,wall:0x89988c,trim:0x45594b,cover:0x566b55},
    sites:[[-16,-19],[16,-19]],siteNames:['SIGNAL RELAY','MOTOR POOL'],spawns:{attack:[0,26],defend:[-3,-26]},
    botAnchors:{attack:[[-16,-26],[16,-26],[0,-24]],defend:[[-16,25],[0,25],[16,25]]},
    patrol:[[-16,17],[16,17],[-16,-13],[16,-13],[0,-19]],
    doors:[{x:-12,z:10,w:2.1,axis:'z',name:'MOTOR POOL ACCESS'}],walls:[[-12,8.225,.7,1.45,3.1],[-12,11.775,.7,1.45,3.1],[12,-11,.7,5,3.1]],crates:[[-20,22],[20,22],[-4,-23],[4,-23]],
    props:[prop('machinery',25,1,4,3,3,0,false),prop('chimney',-26,-12,3,3,7,0,false),prop('pipe-unit',-21,-2,1,3,2,0,false),prop('warehouse',0,1,13,17,5.5),prop('quarter',-17,-2,8,6,3.8),prop('quarter',17,-3,6,4.5,3.3),prop('radiostation',-16,-27,6,4.2,6),
      prop('container_01',16,12,7,2.5,2.5),prop('container_01',-16,17,7,2.5,2.5),prop('hesco',-18,-18,3,1.6,1.4),prop('hesco',18,-18,3,1.6,1.4),prop('gastank',17,-11,4,2.5,2.5),
      prop('warehouse',34,-13,17,25,7,0,false),prop('quarter',-34,1,18,10,5,0,false),prop('snipertower',27,-25,4,4,8,0,false),prop('gatekeeperstation',7,35,5,5,3.3,0,false)]}),
  zero:map({id:'zero',number:'04',tag:'ZERO',name:'BlackSite Zero',subtitle:'Below the surface.',theme:'Underground research installation',description:'An exterior checkpoint leads to a sunken operations complex. Three access ramps join service tunnels, control rooms and a loading wing.',image:'zero-map.svg',preview:'environment/zero-scene.jpg',baseY:-2,
    palette:{sky:0x939d9d,ground:0x555f59,floor:0x747e79,wall:0x858e86,trim:0x38483f,cover:0x52645a},sites:[[-15,-18],[15,-18]],siteNames:['CONTROL ROOM','RESEARCH STORAGE'],spawns:{attack:[0,26],defend:[-3,-26]},botAnchors:{attack:[[-15,-25],[15,-25],[0,-24]],defend:[[-15,25],[0,25],[15,25]]},patrol:[[-19,2],[19,2],[-9,-12],[9,-12],[0,8]],
    walkSurfaces:[{x:0,z:24,w:47,d:12,y:0},...[-19,0,19].map(x=>({x,z:14,w:4,d:8,axis:'z',from:-2,to:0})),{x:9,z:0,w:3,d:10,axis:'z',from:0,to:-2},{x:9,z:-7,w:3,d:4,y:0}],elevation:{vantage:[9,-7]},doors:[{x:0,z:8,w:2.4,name:'SECURITY CHECKPOINT'},{x:-10,z:-10,w:2.4,name:'CONTROL ACCESS'}],
    walls:[[-7.8,8,13.2,.6,3.2],[7.8,8,13.2,.6,3.2],[-10,-3,.6,13.4,3.2],[-10,-17,.6,11.4,3.2],[0,-4,9,.6,3.2],[0,-14,9,.6,3.2],[14,-9,6,.6,3.2],[21,-9,.6,12,3.2]],roofs:[{x:-17,z:-16,w:12,d:12,y:1.5},{x:16,z:-17,w:12,d:12,y:1.5},{x:0,z:-9,w:9,d:9,y:1.5}],crates:[[-19,-25],[20,-25],[-16,4],[16,4]],
    props:[prop('control-console',-19,-19,3,1,1.5),prop('access-terminal',-19,-13,.8,.7,1.5),prop('machinery',18,-18,2.5,2,2),prop('industrial-tank',17,-24,3,2,2),prop('container_01',-18,1,4,2,2),prop('container_01',17,0,4,2,2),prop('vent-unit',-4,-8,1.5,1,2),prop('fan-unit',3,-9,1.4,.6,2),prop('pipe-unit',22,-19,.8,4,2),{...prop('catwalk',9,-7,3,4,.15,0,false),y:-.18},{...prop('gatekeeperstation',-8,24,5,4,3),y:0},{...prop('hesco',18,24,3,1.5,1.4),y:0},prop('warehouse',32,-14,15,26,6,0,false)]})
});
export function mapKey(value){return Object.hasOwn(MAPS,value)?value:'helix';}
