// A real field recording is crossfaded in PCM once, then looped by Web Audio.
// The final frame leads into its neighbouring recorded frame at the start;
// there is no JavaScript timer that can stall between repetitions.
export function seamlessRainBuffer(context,recording,seconds=1.5){
 const overlap=Math.min(Math.round(recording.sampleRate*seconds),Math.floor(recording.length/4));
 if(overlap<2)return recording;
 const length=recording.length-overlap,buffer=context.createBuffer(recording.numberOfChannels,length,recording.sampleRate);
 for(let channel=0;channel<recording.numberOfChannels;channel++){
  const source=recording.getChannelData(channel),out=buffer.getChannelData(channel);out.set(source.subarray(overlap));
  for(let i=0;i<overlap;i++){
   const angle=i/(overlap-1)*Math.PI*.5;
   out[length-overlap+i]=source[recording.length-overlap+i]*Math.cos(angle)+source[i]*Math.sin(angle);
  }
 }return buffer;
}

export function rainAmbienceMix({shelter=false,rain=.35,storm=0,warning=false}={}){
 const strength=Number.isFinite(rain)?Math.max(0,Math.min(1,rain)):0;
 const weather=Number.isFinite(storm)?Math.max(0,Math.min(1,storm)):0;
 const outdoors=strength>0?.32+.64*Math.sqrt(strength)+weather*.04:0;
 return {level:(warning?Math.min(outdoors,.22):outdoors)*(shelter?.24:1),cutoff:shelter?1700+weather*400:10000};
}

export class ForestAudio {
 constructor(){this.ctx=null;this.volume=.55;this.active=false;this.nextStep=0;this.nextHeart=0;const mix=rainAmbienceMix();this.rainLevel=mix.level;this.rainCutoff=mix.cutoff;this.rainSource=null;this.rainLoading=null;}
 start(){if(this.ctx){this.ctx.resume().catch(()=>{});this.loadRain();return;}const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;try{this.ctx=new Audio();const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.active?this.volume*.7:0;this.master.connect(c.destination);this.rainGain=c.createGain();this.rainGain.gain.value=0;this.rainGain.connect(this.master);this.rainFilter=c.createBiquadFilter();this.rainFilter.type='lowpass';this.rainFilter.frequency.value=this.rainCutoff;this.rainFilter.Q.value=.45;this.rainFilter.connect(this.rainGain);this.drone=c.createOscillator();this.drone.frequency.value=46;this.droneGain=c.createGain();this.droneGain.gain.value=.045;this.drone.connect(this.droneGain);this.droneGain.connect(this.master);this.drone.start();this.loadRain();}catch{this.ctx=null;}}
 loadRain(){
  if(!this.ctx||this.rainSource)return Promise.resolve();
  if(this.rainLoading)return this.rainLoading;
  const c=this.ctx;
  this.rainLoading=(async()=>{
   const response=await fetch(new URL('./assets/audio/rain-night-v35.mp3',import.meta.url));
   if(!response.ok)throw new Error('Rain recording HTTP '+response.status);
   const decoded=await c.decodeAudioData(await response.arrayBuffer());
   if(this.ctx!==c||c.state==='closed')return;
   const source=c.createBufferSource();source.buffer=seamlessRainBuffer(c,decoded);source.loop=true;source.connect(this.rainFilter);this.rainSource=source;
   this.rainGain.gain.setTargetAtTime(this.active?this.rainLevel:0,c.currentTime,.8);source.start();
   this.rainError=null;
  })().catch(error=>{this.rainError=error;console.warn('Rain field recording could not be loaded:',error);}).finally(()=>{this.rainLoading=null;});
  return this.rainLoading;
 }
 setVolume(n){this.volume=n;if(this.master)this.master.gain.setTargetAtTime(this.active?n*.7:0,this.ctx.currentTime,.1);}
 setActive(value){this.active=value;if(!value&&this.speaking){window.speechSynthesis?.cancel();this.speaking=false;}if(this.master)this.master.gain.setTargetAtTime(value?this.volume*.7:0,this.ctx.currentTime,.2);if(this.rainGain)this.rainGain.gain.setTargetAtTime(value?this.rainLevel:0,this.ctx.currentTime,.5);if(value)this.ctx?.resume().catch(()=>{});}
 noise(duration,volume,frequency=600,pan=0,delay=0,position=null){if(!this.ctx||!this.active)return;const c=this.ctx,n=Math.floor(c.sampleRate*duration),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const src=c.createBufferSource();src.buffer=b;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=frequency;const gain=c.createGain();gain.gain.value=volume;const p=position?c.createPanner():c.createStereoPanner();if(position){p.panningModel='HRTF';p.refDistance=3;p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;}else p.pan.value=pan;src.connect(f);f.connect(gain);gain.connect(p);p.connect(this.master);src.start(c.currentTime+delay);src.onended=()=>{src.disconnect();f.disconnect();gain.disconnect();p.disconnect();};}
 tone(freq,duration,volume=.1,end=freq,pan=0,delay=0){if(!this.ctx||!this.active)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(freq,c.currentTime+delay);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),c.currentTime+delay+duration);g.gain.setValueAtTime(volume,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+delay+duration);const p=c.createStereoPanner();p.pan.value=pan;o.connect(g);g.connect(p);p.connect(this.master);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}
 twig(pan=0){this.noise(.24,.5,1450,pan);this.tone(92,.65,.12,28);}
 creak(pan=0){this.noise(.8,.14,800,pan);this.tone(186,.85,.065,71,pan);this.tone(347,.6,.018,263,pan);}
 whisper(pan=0){this.noise(1.6,.22,1100,pan);this.noise(.55,.07,2700,-pan);this.tone(73,1.5,.035,45,pan);}
 bell(pan=0){for(const [freq,gain]of [[147,.12],[311,.055],[487,.024],[703,.012]])this.tone(freq,3.8,gain,freq*.985,pan);}
 radio(pan=0){this.noise(1.8,.2,1900,pan);for(const [i,d]of [.05,.42,.72,1.18].entries())this.tone(580+i*73,.075,.04,590+i*65,pan,d);this.tone(96,.8,.045,58,pan,.3);}
 scrape(pan=0){this.noise(1.05,.15,2400,pan);this.tone(431,1.25,.038,180,pan);this.tone(823,.85,.013,420,pan,.14);}
 chain(pan=0){for(const [i,d]of [0,.18,.43].entries()){this.tone(690+i*109,.3,.04,660+i*101,pan,d);this.tone(131,.17,.075,71,pan,d);}}
 echoSteps(pan=0){for(const d of [.14,.57]){this.noise(.22,.2,390,pan,d);this.tone(54,.16,.035,30,pan,d);}}
 overhead(){this.creak(-.4);for(const d of [.15,.6,1.1])this.noise(.25,.2,540,-.4,d);}
 doorSlam(){this.noise(.45,.38,620,0);this.tone(61,.65,.14,29);this.chain(.3);}
 radioMessage(text,pan=0,language='ru'){this.radio(pan);if(!this.active||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  // The voice follows the interface language; a line that is still partly Russian stays silent in English.
  const code=language==='en'?'en':'ru';if(code==='en'&&/[А-Яа-яЁё]/.test(text))return;
  const voice=window.speechSynthesis.getVoices().find(v=>v.localService&&v.lang.toLowerCase().startsWith(code));if(!voice)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang=voice.lang||(code==='en'?'en-US':'ru-RU');u.rate=.83;u.pitch=.65;u.volume=this.volume*.7;this.speaking=true;u.onend=u.onerror=()=>{this.speaking=false;};window.speechSynthesis.speak(u);}
 camera(){this.noise(.08,.4,3600);this.tone(900,.12,.05,330);this.noise(.27,.12,950,0,.16);}
 pickup(){this.noise(.14,.2,2600);this.tone(480,.13,.05,630);}
 creature(kind,position,gain=1){
  if(kind==='watcher'){this.noise(.28,.27*gain,240,0,0,position);this.noise(.12,.055*gain,1300,0,.13,position);this.noise(.75,.065*gain,410,0,.18,position);}
  if(kind==='listener'){this.noise(.11,.16*gain,1300,0,0,position);this.noise(.09,.09*gain,2200,0,.085,position);}
  if(kind==='double'){this.noise(.20,.14*gain,560,0,0,position);this.noise(.08,.06*gain,1700,0,.12,position);}
  if(kind==='stone'){this.noise(.58,.20*gain,2100,0,0,position);this.noise(.16,.07*gain,180,0,.18,position);}
 }
 hurt(){this.noise(.5,.65,600);this.tone(64,.6,.22,26);}
 thunder(pan=0){this.noise(3.8,.38,160,pan);this.noise(1.3,.12,450,-pan,.25);this.tone(43,3.5,.12,23,pan);}
 knock(pan=0){for(const delay of [0,.23,.62]){this.noise(.13,.25,680,pan,delay);this.tone(85,.17,.08,42,pan,delay);}this.chain(pan);}
 bubble(){this.noise(.48,.15,430,-.45);this.tone(94,.32,.07,47,.35);this.noise(.16,.10,1250,.3,.18);}
 crows(pan=0){for(const d of [0,.2,.51]){this.noise(.22,.16,1900,pan,d);this.tone(590,.32,.075,230,pan,d);}this.noise(.8,.10,2400,-pan);}
 sawmill(gain=1){if(gain<.015)return;this.noise(1.4,.18*gain,970,-.35);this.tone(83,1.2,.045*gain,78,-.35);this.noise(.19,.12*gain,2200,.15,.4);}
 listener(position,yaw,pitch){if(!this.ctx)return;const l=this.ctx.listener,c=this.ctx.currentTime,dx=-Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch);if(l.positionX){for(const [key,v]of Object.entries({positionX:position.x,positionY:position.y,positionZ:position.z,forwardX:dx,forwardY:dy,forwardZ:dz,upX:0,upY:1,upZ:0}))l[key].setValueAtTime(v,c);}else{l.setPosition(position.x,position.y,position.z);l.setOrientation(dx,dy,dz,0,1,0);}}
 step(surface,volume,pan){if(surface==='mud'){this.noise(.30,volume*.8,900,pan);this.noise(.10,volume*.7,190,pan,.08);}else if(surface==='wood'){this.noise(.16,volume,270,pan);this.tone(172,.24,volume*.16,91,pan);}else{this.noise(.13,volume*.85,1700,pan);this.noise(.11,volume*.5,2900,pan,.045);}}
 update(t,{step=null,stepSide=0,moving=false,running=false,danger=0,fire=0,charging=false,warning=false,crouched=false,creek=0,cursed=false,stage=0,surface='pine',stamina=100,shelter=false,rain=.35,storm=0}={}){if(!this.ctx||!this.active)return;const mix=rainAmbienceMix({shelter,rain,storm,warning});this.rainLevel=mix.level;this.rainCutoff=mix.cutoff;this.rainGain.gain.setTargetAtTime(this.rainLevel,this.ctx.currentTime,.8);this.rainFilter.frequency.setTargetAtTime(this.rainCutoff,this.ctx.currentTime,.45);if(stage===0&&danger===0&&t>(this.nextBird||0)){this.tone(1200,.12,.017,1900,-.6);this.tone(1600,.16,.013,1100,-.6,.22);this.nextBird=t+18+Math.random()*22;}this.droneGain.gain.setTargetAtTime(.035+danger*.13+(cursed?.035:0),this.ctx.currentTime,.5);if(moving&&(step===null?t>this.nextStep:step)){this.step(surface,running?.26:crouched?.035:.12,step===null?Math.sin(t)*.25:stepSide);this.nextStep=t+(running?.31:crouched?.8:.57);}if(running)this.breathUntil=t+5;if((running||t<(this.breathUntil||0)||stamina<25)&&t>(this.nextBreath||0)){this.noise(.48,.055+(100-stamina)*.0007,750,0);this.noise(.27,.022,1350,0,.48);this.nextBreath=t+(running?1.15:1.65);}if(danger>.25&&t>this.nextHeart){this.tone(57,.2,.12+danger*.12,35);this.nextHeart=t+1.1-danger*.5;}if(creek>0&&Math.random()<.12)this.noise(.5,.08*creek,1600,-.6);if(fire>0&&Math.random()<.07)this.noise(.1,fire*.12,2100);if(charging&&Math.random()<.18)this.noise(.09,.17,1800);}
}
