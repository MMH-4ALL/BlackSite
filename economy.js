import {WEAPONS} from './weapons.js?v=0.9.0';
export const CREDIT_CAP=16000;
export const UTILITY_COSTS=Object.freeze({armor:650,smoke:300,flash:200,decoy:100,incendiary:500});
export const credit=(money,amount)=>Math.min(CREDIT_CAP,Math.max(0,(Number(money)||0)+amount));
export function roundReward(win,lossStreak=0) {return win?3000:1900+Math.min(4,Math.max(0,lossStreak))*500;}
export function awardRound(state,win) {
  const reward=roundReward(win,state.lossStreak||0);state.lossStreak=win?0:Math.min(4,(state.lossStreak||0)+1);
  state.money=credit(state.money,reward);state.roundReward=reward;
  const roster=state.roster||[];
  for(const bot of roster){const won=bot.team==='ally'?win:!win;bot.money=credit(bot.money,roundReward(won,bot.lossStreak||0));bot.lossStreak=won?0:Math.min(4,(bot.lossStreak||0)+1);}
  return reward;
}
export function prepareBotEquipment(roster) {
  roster.money??=3400;roster.owned??=true;
  if(!roster.owned&&roster.money>=WEAPONS.ak47.price){roster.money-=WEAPONS.ak47.price;roster.owned=true;}
  roster.weapon=roster.owned?'ak47':'pistol';roster.armor=0;
  return roster;
}
export function buyRecommendation(state,player) {
  if(!state.owned){const gun=state.money>=WEAPONS.rifle.price+650?'rifle':state.money>=WEAPONS.mp5.price+650?'mp5':null;
    if(gun)return {item:gun,label:'REBUILD / '+WEAPONS[gun].name,reason:'Affordable primary with room for armor.'};}
  if(player.armor<100&&state.money>=650)return {item:'armor',label:'BODY ARMOR',reason:'Protect this loadout before buying more utility.'};
  if(state.smoke<1&&state.money>=300)return {item:'smoke',label:'SMOKE',reason:'Cover a crossing or extinguish an incendiary.'};
  if(state.flash<1&&state.money>=200)return {item:'flash',label:'FLASH',reason:'Clear an occupied angle before entering.'};
  if(state.money<2000)return {item:null,label:'SAVE CREDITS',reason:'Keep the issued sidearm and rebuild next round.'};
  return {item:null,label:'LOADOUT READY',reason:'Save for the next round, or choose a situational grenade.'};
}
