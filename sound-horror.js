import {damp} from './smooth-motion.js?v=20261113-forest49';
// All clocks below advance with the current life; nothing is persisted.
export const TRAIN={x:24,z:52,y:.65,floor:1.23,halfX:1.55,halfZ:8.5};
export const FALL_TREES=[{x:-8,z:16,dx:9,dz:-1},{x:11,z:-7,dx:6,dz:-7},{x:34,z:43,dx:-7,dz:5}];
export function inTrain(x,z){return Math.abs(x-TRAIN.x)<TRAIN.halfX&&Math.abs(z-TRAIN.z)<TRAIN.halfZ;}
export function trainTerrain(x,z,h){const q=Math.max(Math.abs(x-TRAIN.x)/5,Math.abs(z-TRAIN.z)/12),u=Math.max(0,Math.min(1,(q-.83)*3));return TRAIN.y*(1-u)+h*u;}
export function trainRoof(x,z){return Math.abs(x-TRAIN.x)<1.75&&Math.abs(z-TRAIN.z)<8.7?TRAIN.floor+2.55:-Infinity;}
export function trainFloor(x,z,h){if(inTrain(x,z))return TRAIN.floor;if(x>=25.55&&x<27.3&&Math.abs(z-52)<.8)return Math.max(TRAIN.y,TRAIN.floor-.145*Math.ceil((x-25.55)/.43));if(z<=43.5&&z>41.75&&Math.abs(x-23)<.65)return Math.max(TRAIN.y,TRAIN.floor-.145*Math.ceil((43.5-z)/.43));return h;}
export function segmentDistance(x,z,t){const dx=t.dx??t.bx-t.ax,dz=t.dz??t.bz-t.az,ax=t.ax??t.x,az=t.az??t.z,q=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-ax-dx*q,z-az-dz*q);}
export function soundReserved(x,z){return Math.abs(x-24)<5.3&&Math.abs(z-52)<12.5||FALL_TREES.some(t=>segmentDistance(x,z,t)<2.3);}
export function footNoise({moving=false,sprinting=false,crouched=false,charging=false,stamina=100,load=0,surface='pine'}={}){if(charging)return {radius:26,power:1.1};if(!moving)return stamina<25?{radius:5,power:.35}:null;return {radius:sprinting?30:crouched?3.3:surface==='wood'?17:12,power:sprinting?1.15:crouched?.18:.55+Math.max(0,load-10)*.035};}
export class BlindHunter{
 constructor(){this.reset();}
 reset(){this.active=false;this.x=0;this.z=0;this.y=0;this.state='listen';this.target=null;this.warning=0;this.cooldown=0;this.life=0;this.search=0;this.heardId=null;this.nextBreath=0;this.distance=0;this.motionSpeed=0;}
 spawn(x,z){if(this.active||!Number.isFinite(x)||!Number.isFinite(z))return false;this.reset();this.active=true;this.x=x;this.z=z;this.life=140;this.warning=3.5;this.state='warning';return true;}
 update(dt,{active=true,noises=[],canWalk=()=>true,canHear=()=>true,player=null,safe=false,canStrike=false}={}){
  if(!active||!this.active||!Number.isFinite(dt)||dt<=0)return [];const events=[],step=Math.min(dt,.1);this.life-=dt;this.warning=this.warning-dt<1e-6?0:this.warning-dt;this.cooldown=Math.max(0,this.cooldown-dt);this.search=Math.max(0,this.search-dt);this.nextBreath-=dt;
  let best=null,score=.012;for(const n of noises){const d=Math.hypot(n.x-this.x,n.z-this.z),s=n.power*Math.max(0,1-d/n.radius)**2*(canHear(n)?1:.32);if(s>score){score=s;best=n;}}
  if(best){this.target={x:best.x,z:best.z,id:best.id};this.search=10;if(this.heardId!==best.id){this.heardId=best.id;events.push({type:'hunter-heard',id:best.id,x:this.x,z:this.z});}if(this.warning===0)this.state=best.power>1?'rush':'investigate';}
  else if(this.search===0){this.target=null;this.state='listen';}
  if(this.warning>0)this.state='warning';else if(this.target&&this.state==='warning')this.state='investigate';
  const desiredSpeed=this.warning>0?0:safe?2.4:this.target?this.state==='rush'?3.1:1.4:0;
  const beforeSpeed=this.motionSpeed;this.motionSpeed=this.warning>0?0:damp(beforeSpeed,desiredSpeed,12,step);
  const speed=this.warning>0?0:desiredSpeed+(beforeSpeed-desiredSpeed)*(1-Math.exp(-12*step))/(12*step);
  if(this.target){const dx=this.target.x-this.x,dz=this.target.z-this.z,d=Math.hypot(dx,dz),s=(safe?-1:1)*Math.min(speed*step,d),vx=dx/(d||1)*s,vz=dz/(d||1)*s;let mx=0,mz=0;if(canWalk(this.x+vx,this.z+vz)){mx=vx;mz=vz;}else if(canWalk(this.x+vx,this.z)){mx=vx;}else if(canWalk(this.x,this.z+vz)){mz=vz;}else{const sign=Math.sin(this.life*.6)>0?1:-1,sx=-dz/(d||1)*speed*step*sign,sz=dx/(d||1)*speed*step*sign;if(canWalk(this.x+sx,this.z+sz)){mx=sx;mz=sz;}}this.x+=mx;this.z+=mz;this.distance+=Math.hypot(mx,mz);if(d<.6&&!best){this.target=null;this.state='listen';}}
  if(this.nextBreath<=0){this.nextBreath=this.state==='rush'?1.1:3.2;events.push({type:'hunter-breath',x:this.x,z:this.z});}
  // Contact is physical. Player coordinates are never used to select a target.
  if(player&&!safe&&this.warning===0&&this.target&&canStrike&&Math.hypot(player.x-this.x,player.z-this.z)<1.05&&this.cooldown===0){this.cooldown=3;events.push({type:'hunter-hit',damage:32});}
  if(this.life<=0){this.active=false;events.push({type:'hunter-gone'});}return events;
 }
}
export class NoiseDecoys{
 constructor(){this.reset();}
 reset(){this.time=0;this.serial=0;this.projectiles=[];this.sounds=[];this.nextTick=0;}
 sound(x,z,kind='stone'){const spec={stone:[24,.85,9],bottle:[38,1.65,14],toy:[35,1.8,28]}[kind];if(!spec||!Number.isFinite(x)||!Number.isFinite(z))return null;const n={id:'decoy-'+(++this.serial),x,z,kind,radius:spec[0],power:spec[1],until:this.time+spec[2],audibleUntil:this.time+(kind==='toy'?28:.75)};this.sounds.push(n);if(this.sounds.length>24)this.sounds.shift();return n;}
 throw(kind,run,origin,yaw,pitch){const key=kind==='bottle'?'bottles':kind==='stone'?'stones':null;if(!key||run.status!=='playing'||run[key]<1||![origin.x,origin.y,origin.z,yaw,pitch].every(Number.isFinite))return false;run[key]--;const c=Math.cos(pitch);this.projectiles.push({id:++this.serial,kind,x:origin.x,y:origin.y,z:origin.z,vx:-Math.sin(yaw)*11*c,vz:-Math.cos(yaw)*11*c,vy:Math.sin(pitch)*11+2.6,age:0});if(this.projectiles.length>12)this.projectiles.shift();return true;}
 toy(run,x,z,allowed=true){if(!allowed||run.status!=='playing'||run.toys<1||![x,z].every(Number.isFinite))return false;run.toys--;this.sound(x,z,'toy');return true;}
 update(dt,{active=true,floorAt=()=>0,clear=()=>true}={}){if(!active||!Number.isFinite(dt)||dt<=0)return [];this.time+=dt;const events=[],step=Math.min(dt,.1);for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i],old={x:p.x,y:p.y,z:p.z};p.age+=dt;p.vy-=12*step;const next={x:p.x+p.vx*step,y:p.y+p.vy*step,z:p.z+p.vz*step},wall=!clear(old,next);if(!wall)Object.assign(p,next);const floor=floorAt(p.x,p.z,p.y);if(wall||p.y<=floor+.07||p.age>5){p.y=Math.max(floor+.06,p.y);const sound=this.sound(p.x,p.z,p.kind);events.push({type:'impact',...sound});this.projectiles.splice(i,1);}}
  this.sounds=this.sounds.filter(n=>n.until>this.time);if(this.time>=this.nextTick&&this.sounds.some(n=>n.kind==='toy')){this.nextTick=this.time+1.25;for(const n of this.sounds.filter(n=>n.kind==='toy'))events.push({type:'toy-tick',...n});}return events;}
 get lure(){return [...this.sounds].reverse().find(s=>s.until>this.time)||null;}
}
export class SoundNight{
 constructor(){this.reset();}
 reset(mode='full'){this.mode=mode;this.time=0;this.hunter=new BlindHunter();this.decoys=new NoiseDecoys();this.nextHunter=mode==='demo'?48:150;this.doorOpen=true;this.endOpen=false;this.trainAlarm=0;this.trainVisited=false;this.crateOpened=false;this.notes=false;this.contents={water:2,food:1,kits:1,bottles:2,kindling:2,toys:1};this.taken=new Set();this.pickups={};this.pileReady={};this.rack=null;this.rackReady=false;this.shelterDwell=0;this.shelterReady=0;this.shelterIndex=0;this.shelterEvent=null;this.nextTree=mode==='demo'?35:100;this.trees=FALL_TREES.map(t=>({...t,state:'standing',age:0}));}
 loot(run){const picked=run.grant(this.contents);for(const [k,n]of Object.entries(picked))this.contents[k]-=n;if(Object.keys(picked).length&&!this.trainVisited){this.trainVisited=true;this.trainAlarm=6;}return picked;}
 dryWood(run){if(run.status!=='playing')return 'inactive';if(this.rackReady){const got=run.grant({wood:1,woodWet:0});if(!got.wood)return 'full';run.dryFuel++;run.dryFuelMoisture=0;this.rack=null;this.rackReady=false;return 'collected';}if(this.rack!==null)return 'waiting';if(!run.wood)return 'empty';run.useWood();this.rack=this.mode==='demo'?20:60;return 'drying';}
 update(dt,{active=true,x=0,z=0,shelter=false,quiet=true,storm=0,random=0,feetY=0,heightAt=()=>0}={}){if(!active||!Number.isFinite(dt)||dt<=0)return [];const events=[];this.time+=dt;if(this.rack!==null&&!this.rackReady){this.rack=Math.max(0,this.rack-dt);if(this.rack===0){this.rackReady=true;events.push({type:'wood-dry'});}}
  if(this.trainAlarm>0){this.trainAlarm=Math.max(0,this.trainAlarm-dt);if(this.trainAlarm===0){this.endOpen=true;events.push({type:'train-door'});}}
  this.shelterDwell=shelter&&quiet?this.shelterDwell+dt:0;if(this.shelterEvent&&this.time>=this.shelterEvent.until)this.shelterEvent=null;if(this.shelterDwell>=(this.mode==='demo'?25:75)&&this.time>=this.shelterReady&&quiet){const kind=['shadow','chimney','wardrobe'][this.shelterIndex++%3];this.shelterEvent={kind,at:this.time,until:this.time+9};this.shelterReady=this.time+(this.mode==='demo'?60:180);this.shelterDwell=0;events.push({type:'shelter',kind});}
  for(const t of this.trees){if(t.state==='warning'){t.age+=dt;if(t.age>=4){t.state='falling';t.age=0;events.push({type:'tree-fall',x:t.x,z:t.z});}}else if(t.state==='falling'){t.age+=Math.min(dt,.1);if(t.age>=1.25){t.state='fallen';events.push({type:'tree-land',tree:t});if(segmentDistance(x,z,t)<.7&&Math.hypot(x-t.x,z-t.z)>1&&Math.abs(feetY-heightAt(x,z))<.8)events.push({type:'tree-hit',damage:30});}}}
  if(storm>=.65&&!shelter&&quiet&&this.time>=this.nextTree&&!this.trees.some(t=>['warning','falling'].includes(t.state))){const t=this.trees.find(t=>t.state==='standing'&&Math.hypot(x-t.x,z-t.z)<22);if(t){t.state='warning';t.age=0;this.nextTree=this.time+(this.mode==='demo'?45:180);events.push({type:'tree-warning',x:t.x,z:t.z});}}return events;
 }
}
