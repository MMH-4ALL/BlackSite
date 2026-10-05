// Personalities change choices, never health, aim spread or reaction difficulty.
export const PERSONALITIES=Object.freeze(['AGGRESSIVE','CAUTIOUS','FLANKER','OBJECTIVE','MARKSMAN','SUPPORT']);
export const MAX_ALLIES=7;
export const MAX_TOTAL_BOTS=23;
export function normalizeAllies(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(MAX_ALLIES,Math.round(n))):0;}
const NAMES=['WARDEN','SENTRY','NOMAD','RANGER','VIPER','GHOST','FALCON','ATLAS','ECHO','RAIDER','SPECTRE','JACKAL','COBRA','REAPER','HAVOC','STRIKER'];
export function createRoster(enemies,allies=0){
 const result=Array.from({length:Math.max(1,Math.min(16,Math.round(enemies)||6))},(_,id)=>({id,name:NAMES[id],team:'enemy',personality:PERSONALITIES[id%PERSONALITIES.length]}));
 for(let i=0;i<normalizeAllies(allies);i++)result.push({id:result.length,name:['LIMA','DELTA','BRAVO','KILO','OSCAR','SIERRA','TANGO'][i],team:'ally',personality:PERSONALITIES[(i+3)%PERSONALITIES.length]});
 return result;
}
export const oppositeSide=side=>side==='attack'?'defend':'attack';
export function teamAlive(state,player,team){return state.bots.filter(b=>b.alive&&b.team===team).length+(team==='ally'&&player.health>0?1:0);}
export function botGoal(bot,{state,player,map,sites,vector,canStand}){
 const side=bot.side,profile=bot.personality,urgent=side==='defend'&&state.plant||side==='attack'&&!state.plant&&state.time<22;
 let goal=state.plant?state.plant.pos.clone():sites[bot.id%2].clone();
 const clear=(x,z)=>canStand(x,z,.43);
 const offset=(base,x,z)=>clear(base.x+x,base.z+z)?vector(base.x+x,base.y,base.z+z):base.clone();
 if(state.plant&&side==='attack')goal=offset(goal,(bot.id%2?1:-1)*(4+bot.id%3),bot.id%3-1);
 if(urgent)return goal;
 if(profile==='FLANKER'&&side==='attack'&&!state.plant&&!bot.flankDone){
  const route=vector(bot.id%2?21:-21,0,-12);
  if(bot.pos.distanceTo(route)<2.4)bot.flankDone=true;
  else if(clear(route.x,route.z))return route;
 }
 if(profile==='CAUTIOUS'&&bot.hp<45){
  const points=map.patrol.map(([x,z])=>vector(x,0,z)).filter(p=>clear(p.x,p.z));
  if(points.length)return points.sort((a,b)=>a.distanceTo(bot.pos)-b.distanceTo(bot.pos))[0];
 }
 if(profile==='MARKSMAN'&&bot.target&&bot.target.pos.distanceTo(bot.pos)<10){
  const away=bot.pos.clone().sub(bot.target.pos);away.y=0;if(away.lengthSq()>0)away.normalize().multiplyScalar(5);
  return offset(bot.pos,away.x,away.z);
 }
 if(profile==='MARKSMAN'&&side==='defend'&&!state.plant){
  const elevated=map.elevation?.vantage;
  if(elevated&&clear(elevated[0],elevated[1]))return vector(elevated[0],0,elevated[1]);
  return offset(goal,bot.id%2?-5:5,5);
 }
 if(profile==='SUPPORT'){
  const friends=state.bots.filter(b=>b!==bot&&b.alive&&b.team===bot.team&&b.personality!=='SUPPORT');
  const leader=bot.team==='ally'&&player.health>0?player:friends.sort((a,b)=>a.pos.distanceTo(goal)-b.pos.distanceTo(goal))[0];
  if(leader&&leader.pos.distanceTo(goal)>8)return offset(leader.pos,bot.id%2?2:-2,2);
 }
 if(side==='defend'&&!state.plant)goal=offset(goal,bot.id%2?2:-2,3+bot.id%3);
 return goal;
}
