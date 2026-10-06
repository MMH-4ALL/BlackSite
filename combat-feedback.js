// Bounded presentation state; it never changes health, damage, spread or recoil.
export class CombatFeedback {
  constructor(){this.reset();}
  reset(){this.events=[];this.arrows=[];this.confirmation=0;this.head=false;this.recap=null;}
  damage(amount,context={},player){
    const event={amount:Math.max(0,amount),source:context.source?.name||context.name||'ENVIRONMENT',weapon:context.weapon||'rifle',zone:context.zone||'body',distance:Math.max(0,context.distance||0)};
    if(this.events.length>=24)this.events.shift();this.events.push(event);
    if(context.pos&&player){const dx=context.pos.x-player.pos.x,dz=context.pos.z-player.pos.z;
      this.arrows.push({bearing:Math.atan2(dx,-dz),life:.9});if(this.arrows.length>4)this.arrows.shift();}
    return event;
  }
  killed(event){this.recap={...event,hits:this.events.filter(e=>e.source===event.source).length,totalDamage:this.events.filter(e=>e.source===event.source).reduce((n,e)=>n+e.amount,0),locations:{}};
    for(const hit of this.events.filter(e=>e.source===event.source))this.recap.locations[hit.zone]=(this.recap.locations[hit.zone]||0)+1;
    return this.recap;
  }
  kill(head){this.confirmation=.9;this.head=head;}
  update(dt){this.confirmation=Math.max(0,this.confirmation-dt);for(const arrow of this.arrows)arrow.life-=dt;this.arrows=this.arrows.filter(a=>a.life>0);}
}
export function feedbackSound(context,kind,volume){
  if(!context||volume<=0)return;
  const notes=kind==='head'?[1280,1760]:kind==='kill'?[460,690]:[620];
  try{notes.forEach((frequency,i)=>{const start=context.currentTime+i*.045,o=context.createOscillator(),gain=context.createGain();o.type='sine';o.frequency.setValueAtTime(frequency,start);o.frequency.exponentialRampToValueAtTime(frequency*.65,start+.055);gain.gain.setValueAtTime(.055*volume,start);gain.gain.exponentialRampToValueAtTime(.001,start+.075);o.connect(gain);gain.connect(context.destination);o.onended=()=>{o.disconnect();gain.disconnect();};o.start(start);o.stop(start+.08);});}catch{/* Optional cues cannot interrupt gameplay. */}
}
const reportBuffers=new WeakMap();
export function decoyReport(context,volume,pan=0){
  if(!context||volume<=0)return;
  try{let buffer=reportBuffers.get(context);if(!buffer){const rate=22050,count=Math.ceil(rate*.11);buffer=context.createBuffer(1,count,rate);const samples=buffer.getChannelData(0);let seed=11939;for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const t=i/rate,envelope=Math.min(1,t/.002)*Math.exp(-t*47);samples[i]=((seed/4294967296*2-1)*.65+Math.sin(t*420)*.35)*envelope;}reportBuffers.set(context,buffer);}const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);let panner;if(context.createStereoPanner){panner=context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner);panner.connect(context.destination);}else gain.connect(context.destination);source.onended=()=>{source.disconnect();gain.disconnect();panner?.disconnect();};source.start();}catch{/* Optional original sound cue. */}
}
export function recapText(recap,weapons){
  if(!recap)return '';
  const locations=Object.entries(recap.locations).map(([zone,n])=>n+' '+zone.toUpperCase()).join(' / ');
  return recap.source+' · '+(weapons[recap.weapon]?.name||recap.weapon.toUpperCase())+' · '+Math.round(recap.distance)+'m · '+recap.hits+' HITS / '+Math.round(recap.totalDamage)+' DAMAGE · '+locations;
}
