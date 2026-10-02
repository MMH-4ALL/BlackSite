// Original layouts. Positions/dimensions are meters: [x,z,width,depth,height].
export const MAX_BOTS=16;
export const DEFAULT_BOTS=6;
export function normalizeBotCount(value){
  if(!['number','string'].includes(typeof value)||value==='')return DEFAULT_BOTS;
  const n=Number(value);return Number.isFinite(n)?Math.min(MAX_BOTS,Math.max(1,Math.round(n))):DEFAULT_BOTS;
}
export const MAPS=Object.freeze({
  helix:{id:'helix',number:'01',tag:'HELIX',name:'Helix Compound',subtitle:'Restricted territory.',theme:'Desert research facility',
    description:'Solar court, reactor hall, and three connecting routes.',image:'helix-map.svg',
    palette:{sky:0xb3aca0,ground:0x948771,floor:0x8f8c80,wall:0x9e9889,trim:0x656b67,cover:0x676d60},
    sites:[[-15,-18],[15,-18]],siteNames:['SOLAR COURT','REACTOR HALL'],spawns:{attack:[0,26],defend:[-3,-26]},
    botAnchors:{attack:[[-14,-24],[14,-24],[0,-16]],defend:[[-15,25],[0,25],[15,25]]},
    patrol:[[-16,-12],[16,-12],[0,-4],[-16,9],[16,9]],
    walls:[[-8,7,1,20,4.4],[8,7,1,20,4.4],[-8,-15,1,12,4.4],[8,-15,1,12,4.4],[-16,16,9,1,4.4],[16,16,9,1,4.4],[0,-9,9,1,4.4],[-16,-8,9,1,4.4],[16,-8,9,1,4.4],[0,18,7,1,4.4]],
    covers:[[-16,-19,3,3,2.3],[15,-19,3,3,2.3],[-18,4,3,3,1.5],[18,3,3,3,1.5],[-3,1,2,3,2.2],[3,-4,2,2,1.4],[-18,-2,2,2,2],[13,9,2,2,2],[0,-22,4,2,2.1]],
    crates:[[-21,12],[21,12],[-11,-26],[11,-26]]},
  bastion:{id:'bastion',number:'02',tag:'BASTION',name:'Bastion Depot',subtitle:'Secure the stockpile.',theme:'Fortified military supply base',
    description:'Blast walls, barracks, ammunition bunkers, and an exposed supply yard.',image:'bastion-map.svg',
    palette:{sky:0xa9a38f,ground:0x8e836d,floor:0x898779,wall:0x858776,trim:0x484f47,cover:0x58604f},
    sites:[[-16,-18],[15,-18]],siteNames:['AMMUNITION BUNKER','COMMAND YARD'],spawns:{attack:[0,26],defend:[-3,-26]},
    botAnchors:{attack:[[-16,-25],[16,-25],[0,-20]],defend:[[-16,25],[0,25],[16,25]]},
    patrol:[[-16,7],[15,2],[0,15],[-15,-12],[16,-16]],
    walls:[[-9,3,1,22,3.8],[9,11,1,14,3.8],[-20,14,4,1,3.4],[-12,14,4,1,3.4],[-21,7,1,13,3.4],[-16,1,10,1,3.4],[0,-1,10,1,3.1],[5,-12,1,16,3.8],[-9,-19,1,12,3.8],[17,-9,11,1,3.4]],
    covers:[[-3,12,4,.8,.9],[15,2,4,8,2.5],[-17,-17,3,2,1.3],[15,-20,4,2,1.5],[1,-14,3,3,2.2],[-15,20,2,3,1.5],[16,18,3,4,1.7],[11,-16,3,.9,.9]],
    crates:[[-18,5],[-14,9],[18,-14],[-3,-22]]},
  ironwood:{id:'ironwood',number:'03',tag:'IRONWOOD',name:'Ironwood Garrison',subtitle:'Retake the forward base.',theme:'Overcast military air station',
    description:'Cargo lanes, a maintenance hangar, motor pool, and helicopter apron.',image:'ironwood-map.svg',
    palette:{sky:0x88928b,ground:0x647061,floor:0x737d73,wall:0x626f64,trim:0x35443e,cover:0x45584a},
    sites:[[-16,-19],[16,-19]],siteNames:['SIGNAL RELAY','MAINTENANCE HANGAR'],spawns:{attack:[0,26],defend:[-3,-26]},
    botAnchors:{attack:[[-16,-26],[16,-26],[0,-22]],defend:[[-16,25],[0,25],[16,25]]},
    patrol:[[-15,19],[5,12],[17,1],[-15,-14],[16,-16]],
    walls:[[-5,14,1,18,4],[13,3,1,20,4],[-18,5,6,1,3.8],[-10,5,4,1,3.8],[-20,-2,1,13,3.8],[0,-6,14,1,4],[-9,-15,1,12,4],[10,-23,1,12,4],[17,-10,12,1,4]],
    covers:[[-15,-1,4,9,2.6],[4,6,3.6,8,2.6],[-17,-18,3,3,1.7],[17,-20,4,3,1.8],[17,17,3,5,1.7],[2,-18,3,3,2],[-11,11,2,3,1.3],[18,-3,2,.8,.9]],
    crates:[[-18,9],[8,13],[17,-15],[-3,-24]]}
});
export function mapKey(value){return Object.hasOwn(MAPS,value)?value:'helix';}
