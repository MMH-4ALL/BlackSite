// All weapon recordings are CC0. No clip or source excerpt belongs to two actions.
// See assets/audio/manifest.json and assets/audio/LICENSE.md for provenance.
const set=(prefix,reloadAt,extra={})=>({
  shots:[prefix+'-shot-01.wav',prefix+'-shot-02.wav'],
  reload:[prefix+'-mag-out.wav',prefix+'-mag-in.wav',prefix+'-charge.wav'],
  equip:prefix+'-equip.wav',empty:prefix+'-empty.wav',reloadAt,...extra
});
export const SOUND_BANK=Object.freeze({
  rifle:set('m4a1',[.10,.57,.85],{distant:['m4a1-distant-01.wav','m4a1-distant-02.wav']}),
  sv98:set('sv98',[.12,.62,.82],{bolt:['sv98-bolt-open.wav','sv98-bolt-close.wav']}),
  m82:set('m82',[.11,.61,.79]),
  pistol:set('p9',[.07,.48,.74])
});
const files=Object.values(SOUND_BANK).flatMap(bank=>[
  ...bank.shots,...bank.reload,bank.equip,bank.empty,...(bank.distant||[]),...(bank.bolt||[])
]);
const assetRoot=new URL('./assets/audio/',import.meta.url);

export class WeaponAudio {
  constructor({contextFactory,fetchFile}={}){
    this.contextFactory=contextFactory||(()=>new (window.AudioContext||window.webkitAudioContext)());
    this.fetchFile=fetchFile||((url)=>fetch(url));
    this.buffers=new Map();this.voices=new Set();this.cursor=new Map();
    this.volume=.45;this.failed=[];this.context=null;this.master=null;
  }
  // Downloads are cached once. A missing file cannot borrow another gun's sound.
  preload(){
    this.downloads??=Promise.allSettled(files.map(async file=>{
      const url=new URL(file,assetRoot);url.searchParams.set('v','0.3.1');
      const response=await this.fetchFile(url.href);
      if(!response.ok)throw new Error(file+': HTTP '+response.status);
      return [file,await response.arrayBuffer()];
    })).then(results=>{
      this.failed=results.filter(r=>r.status==='rejected').map(r=>String(r.reason));
      return results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    });
    return this.downloads;
  }
  // Create/resume synchronously inside a real click, then decode the local files.
  unlock(){
    if(!this.context){
      this.context=this.contextFactory();
      this.master=this.context.createGain();this.master.gain.value=this.volume;
      const limiter=this.context.createDynamicsCompressor();
      limiter.threshold.value=-9;limiter.knee.value=8;limiter.ratio.value=5;
      limiter.attack.value=.003;limiter.release.value=.12;
      this.master.connect(limiter);limiter.connect(this.context.destination);
    }
    const resumed=this.context.resume();
    this.ready??=this.preload().then(async recordings=>{
      const decoded=await Promise.allSettled(recordings.map(async([file,data])=>{
        const buffer=await this.context.decodeAudioData(data.slice(0));
        this.buffers.set(file,buffer);
      }));
      this.failed.push(...decoded.filter(r=>r.status==='rejected').map(r=>String(r.reason)));
      if(this.failed.length)console.warn('Some weapon recordings could not load.',this.failed);
    });
    return Promise.all([resumed,this.ready]).then(()=>this.buffers.size);
  }
  setVolume(value){
    this.volume=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
    if(this.master){
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.015);
    }
  }
  play(file,{delay=0,gain=1,pan=0,kind='shot'}={}){
    const buffer=this.buffers.get(file),ctx=this.context;
    if(!buffer||!ctx||ctx.state!=='running'||this.volume===0)return null;
    // Bound overlapping automatic fire / bot tails without leaking audio nodes.
    if(this.voices.size>=40){const oldest=[...this.voices].find(v=>v.kind!=='handling')||this.voices.values().next().value;this.stopVoice(oldest);}
    const source=ctx.createBufferSource(),level=ctx.createGain(),panner=ctx.createStereoPanner();
    source.buffer=buffer;level.gain.value=gain;panner.pan.value=Math.max(-1,Math.min(1,pan));
    source.connect(level);level.connect(panner);panner.connect(this.master);
    const voice={source,level,panner,kind,file};this.voices.add(voice);
    source.onended=()=>{this.voices.delete(voice);source.disconnect();level.disconnect();panner.disconnect();};
    source.start(ctx.currentTime+Math.max(0,delay));
    return voice;
  }
  stopVoice(voice){
    if(!voice||!this.voices.has(voice))return;
    this.voices.delete(voice);
    try{voice.source.stop();}catch{}
    voice.source.disconnect();voice.level.disconnect();voice.panner.disconnect();
  }
  stopHandling(){for(const voice of [...this.voices])if(voice.kind==='handling'||voice.kind==='preview')this.stopVoice(voice);}
  stopAll(){for(const voice of [...this.voices])this.stopVoice(voice);}
  next(weapon,event,variants){
    const key=weapon+':'+event,index=this.cursor.get(key)||0;
    this.cursor.set(key,index+1);return variants[index%variants.length];
  }
  shot(weapon,{enemy=false,distance=0,pan=0,preview=false}={}){
    const bank=SOUND_BANK[weapon];if(!bank)return null;
    const variants=enemy?(bank.distant||bank.shots):bank.shots;
    const voice=this.play(this.next(weapon,enemy?'distant':'shot',variants),{
      gain:enemy?.55/(1+Math.max(0,distance)*.07):1,pan,kind:preview?'preview':enemy?'world':'shot'
    });
    if(voice&&!enemy&&bank.bolt)this.bolt(weapon,0,preview);
    return voice;
  }
  bolt(weapon,elapsed=0,preview=false){
    const clips=SOUND_BANK[weapon]?.bolt;if(!clips)return;
    for(const [i,at] of [.32,.83].entries())if(at>=elapsed)this.play(clips[i],{delay:at-elapsed,gain:.56,kind:preview?'preview':'handling'});
  }
  reload(weapon,duration,elapsed=0,preview=false){
    this.stopHandling();const bank=SOUND_BANK[weapon];if(!bank)return 0;
    let count=0;
    bank.reload.forEach((file,i)=>{
      const at=bank.reloadAt[i]*duration;
      if(at>=elapsed&&this.play(file,{delay:at-elapsed,gain:.66,kind:preview?'preview':'handling'}))count++;
    });
    return count;
  }
  equip(weapon){this.stopHandling();return this.play(SOUND_BANK[weapon]?.equip,{gain:.60,kind:'handling'});}
  empty(weapon){return this.play(SOUND_BANK[weapon]?.empty,{gain:.67,kind:'handling'});}
}
export const weaponAudio=new WeaponAudio();
