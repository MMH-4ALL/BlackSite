// Permanent offline achievements: cosmetic rewards, no daily chores or streaks.
export const CHALLENGES=Object.freeze([
 {id:'deployment',name:'FIRST DEPLOYMENT',description:'Complete one operation.',target:1,value:p=>p.stats.matches},
 {id:'headhunter',name:'HEADHUNTER',description:'Earn 25 headshot eliminations.',target:25,value:p=>p.stats.headshots},
 {id:'demolition',name:'DEMOLITION',description:'Plant five signal cores.',target:5,value:p=>p.stats.plants},
 {id:'eod',name:'EOD',description:'Defuse five signal cores.',target:5,value:p=>p.stats.defuses},
 {id:'veteran',name:'VETERAN',description:'Win three operations on Hard.',target:3,value:p=>p.difficultyWins.hard||0},
 {id:'operator',name:'OPERATOR',description:'Win on every map.',target:4,value:p=>Object.values(p.mapStats).filter(m=>m.wins>0).length},
 {id:'arsenal',name:'ARSENAL',description:'Eliminate opponents with three weapon classes.',target:3,value:p=>p.classes.length},
 {id:'survivor',name:'SURVIVOR',description:'Win a round alive without taking damage.',target:1,value:p=>p.stats.cleanRounds},
 {id:'precision',name:'PRECISION',description:'Win a round with 40% accuracy over at least ten shots.',target:1,value:p=>p.stats.precisionRounds},
 {id:'blacksite',name:'BLACKSITE',description:'Win all maps, win three Hard operations, earn 25 headshots, plant three times and defuse three times.',target:5,value:p=>[Object.values(p.mapStats).filter(m=>m.wins>0).length>=4,(p.difficultyWins.hard||0)>=3,p.stats.headshots>=25,p.stats.plants>=3,p.stats.defuses>=3].filter(Boolean).length}
]);
export function challengeProgress(profile){return CHALLENGES.map(c=>({...c,current:Math.min(c.target,c.value(profile)),complete:c.value(profile)>=c.target}));}
