import {expeditionRoof,inMill,inSwamp,onBoardwalk} from './expedition.js?v=20261113-forest48-r3';
import {inTrain,trainRoof} from './sound-horror.js?v=20261113-forest48-r3';
// Active-time rules shared by the scene and the survival loop. No persistence.
export const CHAPEL={x:-24,z:-44,y:.8821256017802659,halfX:3,halfZ:4};
export const CHAPEL_KEY={x:-2.2,z:-13.3,feetY:.23};
export const CHAPEL_DOOR={x:-24,z:-40};
export const CHAPEL_BELL={x:-21.9,z:-39.9};
export const CHAPEL_NOTES={x:-25.45,z:-46};
export function chapelReserved(x,z){return Math.abs(x-CHAPEL.x)<5.7&&z>-50.5&&z<-37;}
export function inChapel(x,z){return Math.abs(x-CHAPEL.x)<2.8&&Math.abs(z-CHAPEL.z)<3.8;}
export function roofAt(x,z){
 if(inTrain(x,z)||Number.isFinite(trainRoof(x,z)))return trainRoof(x,z);
 if(Math.abs(x)<3.7&&z>-17.8&&z<-10.1)return 4.7-Math.abs(x)*.42;
 if(Math.abs(x)<1.85&&z>=-10.1&&z<-9.15)return 2.9;
 if(Math.abs(x-CHAPEL.x)<3.35&&z>-48.4&&z<-39.6)return CHAPEL.y+4.75-Math.abs(x-CHAPEL.x)*.48;
 return expeditionRoof(x,z);
}
export function surfaceAt(x,z,feetY){
 if(inTrain(x,z)||inMill(x,z)||onBoardwalk(x,z))return 'wood';if(inSwamp(x,z))return 'mud';
 if(inChapel(x,z)&&feetY>=CHAPEL.y-.2)return 'wood';
 if(Math.abs(x)<3.2&&z>-17.4&&z<-9.6)return 'wood';
 const trail=Math.sin(z*.045)*2-2;
 return Math.abs(x-trail)<2.4||Math.abs(x+48)<1.6&&z<-11&&z>-39?'mud':'pine';
}
export class HandAction{
 constructor(){this.reset();}
 reset(){this.current=null;}
 start(name,duration,cueAt=duration,origin=null){if(this.current||duration<=0)return false;this.current={name,duration,cueAt,age:0,cued:false,origin};return true;}
 update(dt,active=true){
  if(!active||!Number.isFinite(dt)||dt<=0||!this.current)return [];
  const a=this.current,events=[];a.age=Math.min(a.duration,a.age+dt);
  if(!a.cued&&a.age>=a.cueAt){a.cued=true;events.push({type:'cue',name:a.name});}
  if(a.age>=a.duration){events.push({type:'done',name:a.name});this.current=null;}return events;
 }
 get view(){const a=this.current;return a?{name:a.name,age:a.age,progress:a.age/a.duration}:null;}
}
export class FearPacing{
 constructor(){this.reset();}
 reset(mode='full'){this.mode=mode;this.time=0;this.quietUntil=0;this.eventUntil=0;this.naturalAt=mode==='demo'?15:45;}
 update(dt,active=true){if(active&&Number.isFinite(dt)&&dt>0)this.time+=dt;}
 recover(){this.quietUntil=Math.max(this.quietUntil,this.time+(this.mode==='demo'?24:65));}
 get calm(){return this.time<this.quietUntil;}
 allow(explicit=false){return explicit||!this.calm;}
 event(explicit=false){if(explicit)return true;if(this.calm||this.time<this.eventUntil)return false;this.eventUntil=this.time+9;return true;}
 natural(random=.5){if(this.time<this.naturalAt)return false;this.naturalAt=this.time+(this.mode==='demo'?22:65)+random*25;return true;}
}
export class StormClock{
 constructor(){this.reset();}
 reset(mode='full'){this.mode=mode;this.time=0;this.next=mode==='demo'?12:70;this.strike=null;this.phase='dark';this.intensity=0;}
 update(dt,{active=true,storm=0,random=.5}={}){
  if(!active||!Number.isFinite(dt)||dt<=0)return [];this.time+=dt;const events=[];
  if(!this.strike&&storm>=.35&&this.time>=this.next){this.strike={at:this.time,thunder:false};this.next=this.time+(this.mode==='demo'?25:60)+random*25;events.push({type:'lightning'});}
  this.intensity=0;this.phase='dark';
  if(this.strike){const age=this.time-this.strike.at;
   if(age<.55){this.phase='first';this.intensity=.85+Math.sin(age*34)*.15;}
   else if(age>=.95&&age<1.27){this.phase='second';this.intensity=.65*(1-(age-.95)/.32);}
   if(age>=2.3&&!this.strike.thunder){this.strike.thunder=true;events.push({type:'thunder'});}
   if(age>=4)this.strike=null;
  }return events;
 }
}
export class ShelterNight{
 constructor(){this.reset();}
 reset(mode='full'){this.mode=mode;this.time=0;this.barricade=null;this.key=false;this.doorOpen=false;this.notes=false;this.bellReady=0;this.lureUntil=0;}
 takeKey(){if(this.key)return false;this.key=true;return true;}
 toggleDoor(){if(!this.key)return false;this.doorOpen=!this.doorOpen;return true;}
 ring(){if(this.time<this.bellReady)return false;this.bellReady=this.time+(this.mode==='demo'?60:180);this.lureUntil=this.time+25;return true;}
 get lure(){return this.time<this.lureUntil?{...CHAPEL_BELL}:null;}
 build(run){if(run?.status!=='playing'||run.wood<2||this.barricade)return false;
  // Through the pack's own bookkeeping: a bare subtraction left the dry-bundle count behind,
  // and soaked wood picked up later burned as dry fuel.
  for(let i=0;i<2;i++)if(typeof run.takeWood==='function')run.takeWood();else run.wood--;
  this.barricade={left:this.mode==='demo'?70:180,boards:3,nextKnock:this.time+7,warned:false};return true;}
 remove(){if(!this.barricade)return false;this.barricade=null;return true;}
 update(dt,{active=true,pressed=false}={}){
  if(!active||!Number.isFinite(dt)||dt<=0)return [];this.time+=dt;const b=this.barricade,events=[];if(!b)return events;b.left=Math.max(0,b.left-dt);
  if(pressed&&this.time>=b.nextKnock&&b.left>4){b.nextKnock=this.time+12;b.boards--;events.push({type:'knock',boards:b.boards});if(b.boards<=0)b.left=Math.min(b.left,4);}
  if(b.left<=4&&!b.warned){b.warned=true;events.push({type:'barrier-warning'});}
  // A large frame can never skip the warning and break the door at once.
  if(b.left<=0){if(events.some(e=>e.type==='barrier-warning'))b.left=4;else{this.barricade=null;events.push({type:'barrier-broken'});}}return events;
 }
}
