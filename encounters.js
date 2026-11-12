import {soundReserved} from './sound-horror.js?v=20261112-forest48-r2';
import {expeditionReserved} from './expedition.js?v=20261112-forest48-r2';
import {chapelReserved} from './weather-horror.js?v=20261112-forest48-r2';
import {explorationReserved,playerLevel} from './exploration.js?v=20261112-forest48-r2';
import {storyReserved} from './story.js?v=20261112-forest48-r2';
export const FALSE_CAMPS=[{id:0,x:18,z:14},{id:1,x:-38,z:13}];
export const TRAPS=[
 {id:0,type:'jaw',x:-1,z:9,r:.29},{id:1,type:'jaw',x:9,z:-24,r:.29},
 {id:2,type:'jaw',x:-12,z:24,r:.29},{id:3,type:'jaw',x:23,z:30,r:.29},
 {id:4,type:'jaw',x:-26,z:-25,r:.29},{id:5,type:'jaw',x:42,z:-6,r:.29},
 {id:6,type:'wire',x:-3,z:-28,ax:-5.1,az:-28,bx:-.7,bz:-28,r:.10},
 {id:7,type:'wire',x:14,z:3,ax:12.3,az:3,bx:15.7,bz:3,r:.10}
];
// Supply crates, the first stone pile and the two changing signs outside the
// trail keep a clear ring: no trunk, rock or thicket may grow on top of them.
export const CRATE_SITES=[[-3,1],[1.5,-14],[-14,-9],[19,-20],[-28,-20],[30,30],[-35,29],[8,44],[2,-53],[52,-4],[-55,-36],[48,-48],[-43,60],[59,47],[-18,-66],[24,67]];
const CLEAR_SITES=[[3,3,1.5],[-5.25,-2.8,1.2],[-5.4,2.4,1.2]];
export function encounterReserved(x,z){return soundReserved(x,z)||expeditionReserved(x,z)||chapelReserved(x,z)||explorationReserved(x,z)||storyReserved(x,z)||FALSE_CAMPS.some(c=>Math.hypot(x-c.x,z-c.z)<4.7)||TRAPS.some(t=>Math.hypot(x-t.x,z-t.z)<(t.type==='wire'?2.6:1))||CRATE_SITES.some(c=>Math.hypot(x-c[0],z-c[1])<1.9)||CLEAR_SITES.some(c=>Math.hypot(x-c[0],z-c[1])<c[2]);}
export const BASEMENT={floor:-2.75,top:.23,front:-12.45,back:-16.5,half:.86};
export function inBasementRoom(x,z){return Math.abs(x)<2.65&&z>-16.85&&z<-11.1;}
export function onStairs(x,z){return Math.abs(x)<BASEMENT.half&&z>=BASEMENT.back&&z<=BASEMENT.front;}
export function stairHeight(z){const u=Math.max(0,Math.min(1,(BASEMENT.front-z)/(BASEMENT.front-BASEMENT.back)));return BASEMENT.top+(BASEMENT.floor-BASEMENT.top)*u;}
export function cabinFloor(x,z,feetY,hatchOpen,terrain){
 if(Math.abs(x)>3.05||z<=-17.02||z>=-10.6)return terrain;
 if(onStairs(x,z)&&(hatchOpen||feetY<-.15))return stairHeight(z);
 if(feetY>=-.15)return BASEMENT.top;
 return inBasementRoom(x,z)?BASEMENT.floor:terrain;
}
export function cabinCeiling(x,z,feetY,hatchOpen){
 if(feetY<-.15&&inBasementRoom(x,z)&&(!onStairs(x,z)||!hatchOpen))return .15;
 return Infinity;
}
function pointDistance(x,z,t){
 if(t.ax===undefined)return Math.hypot(x-t.x,z-t.z);
 const dx=t.bx-t.ax,dz=t.bz-t.az,u=Math.max(0,Math.min(1,((x-t.ax)*dx+(z-t.az)*dz)/(dx*dx+dz*dz)));
 return Math.hypot(x-t.ax-dx*u,z-t.az-dz*u);
}
function sweptTrap(px,pz,x,z,t){
 const distance=Math.hypot(x-px,z-pz),steps=Math.max(1,Math.ceil(distance/.12));
 for(let n=0;n<=steps;n++)if(pointDistance(px+(x-px)*n/steps,pz+(z-pz)*n/steps,t)<t.r+.2)return true;
 return false;
}

export class NightEncounters {
 constructor(){this.reset();}
 reset(seed=1,mode='full'){
  this.time=0;this.seed=seed>>>0;this.mode=mode;this.traps=TRAPS.map(t=>({...t,armed:true}));this.snared=null;this.snareTime=0;
  this.falseSeen=new Set();this.hatchOpen=false;this.doorClosed=false;this.basementEntered=false;this.lootTaken=false;this.basementContents=null;this.basementOpened=false;this.doorDelay=0;
  this.visits=0;this.wasGrave=false;this.away=0;this.newGraves=0;this.graveTime=0;
  this.walked=0;this.wasMoving=false;this.nextEcho=mode==='demo'?12:30;
  this.nextDouble=mode==='demo'?18:50;this.double=null;this.radioCount=0;this.nextRadio=0;this.previous=null;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 disarm(id){const t=this.traps.find(t=>t.id===id);if(!t?.armed)return false;t.armed=false;return true;}
 release(){if(this.snared===null)return false;this.snared=null;this.snareTime=0;return true;}
 openDoor(){if(!this.doorClosed)return false;this.doorClosed=false;return true;}
 takeLoot(){if(this.lootTaken)return false;this.lootTaken=true;return true;}
 toggleHatch(){this.hatchOpen=!this.hatchOpen;return this.hatchOpen;}
 radio(){
  if(this.time<this.nextRadio)return null;this.nextRadio=this.time+12;
  const n=this.radioCount++,falseCall=n%3===1;
  if(falseCall)return {type:'radio-call',falseCall:true,text:'Ближайший огонь на востоке, за деревьями. Иди на тихий свет. Там тебя ждут.'};
  return {type:'radio-call',falseCall:false,text:n%3===0?'На восточной стоянке есть припасы. У настоящего костра три белые зарубки. Слушай треск дров.':'Дрова на западной стоянке. Ищи три белые зарубки у ящика. Чужому тихому огню не верь.'};
 }
 update(dt,{active=true,x=0,z=0,feetY=0,ground=0,yaw=0,pitch=0,moving=false,sprinting=false,flash=true,grave=false,canSpawn=()=>true,canWalk=()=>true,allowScares=true}={}){
  if(!active||!Number.isFinite(dt)||dt<=0)return [];
  const events=[],motion=Math.min(dt,.1);this.time+=dt;
  this.snareTime=Math.max(0,this.snareTime-dt);if(!this.snareTime)this.snared=null;
  const prev=this.previous||{x,z},above=playerLevel(x,z,feetY)==='ground';
  if(above)for(const t of this.traps){if(t.armed&&feetY-ground<(t.type==='wire'?.55:.36)&&sweptTrap(prev.x,prev.z,x,z,t)){
   t.armed=false;if(t.type==='jaw'){this.snared=t.id;this.snareTime=4;}events.push({type:'trap',id:t.id,damage:t.type==='jaw'?18:8,x:t.x,z:t.z});
  }}
  this.previous={x,z};
  for(const c of FALSE_CAMPS)if(above&&!this.falseSeen.has(c.id)&&Math.hypot(x-c.x,z-c.z)<3.7){this.falseSeen.add(c.id);events.push({type:'false-camp',id:c.id,x:c.x,z:c.z});}
  if(feetY<-1.3&&inBasementRoom(x,z)&&!this.basementEntered){this.basementEntered=true;this.doorDelay=2.5;events.push({type:'basement-enter'});}
  else if(this.doorDelay>0){this.doorDelay=Math.max(0,this.doorDelay-dt);if(this.doorDelay===0){this.doorClosed=true;events.push({type:'door-close'});}}
  if(grave&&!this.wasGrave){this.visits++;if(this.visits>1&&this.away>10&&this.newGraves<3){this.newGraves++;this.graveTime=this.time;events.push({type:'new-grave',count:this.newGraves,time:this.time});}this.away=0;}
  if(!grave&&this.visits)this.away+=dt;this.wasGrave=grave;
  if(moving&&above)this.walked+=dt;
  if(!moving&&this.wasMoving){if(allowScares&&this.walked>4&&this.time>=this.nextEcho&&above){events.push({type:'echo',x:x+Math.sin(yaw)*3.5,z:z+Math.cos(yaw)*3.5});this.nextEcho=this.time+(this.mode==='demo'?30:65);}this.walked=0;}
  this.wasMoving=moving;
  if(allowScares&&above&&!this.double&&this.time>=this.nextDouble){
   for(let n=0;n<12;n++){const angle=yaw+(n<4?(n%2?1:-1)*(.32+n*.12):(this.random()-.5)*2.6),r=18+this.random()*8,dx=x-Math.sin(angle)*r,dz=z-Math.cos(angle)*r;
    if(canSpawn(dx,dz)){this.double={x:dx,z:dz,yaw,pitch,flash,phase:'mirror',age:0,walk:0,still:0};events.push({type:'double-appear',x:dx,z:dz});break;}
   }
   this.nextDouble=this.time+(this.double?(this.mode==='demo'?65:160)+this.random()*40:8);
  }
  const d=this.double;
  if(d){d.age+=dt;d.walk+=moving?dt:0;d.still=moving?0:d.still+dt;
   if(d.phase==='mirror'&&d.walk>1&&d.still>.65){d.phase='free';events.push({type:'double-free',x:d.x,z:d.z});}
   if(d.phase==='mirror'){const nx=d.x+(x-prev.x),nz=d.z+(z-prev.z);if(canWalk(nx,nz)){d.x=nx;d.z=nz;}d.yaw=yaw;d.pitch=pitch;d.flash=flash;}
   else {const dist=Math.hypot(x-d.x,z-d.z),speed=dist>6?.65:0,nx=d.x+(x-d.x)/Math.max(dist,.01)*speed*motion,nz=d.z+(z-d.z)/Math.max(dist,.01)*speed*motion;if(canWalk(nx,nz)){d.x=nx;d.z=nz;}else if(speed){const sign=Math.sin(d.age*.6)>0?1:-1,sx=-(z-d.z)/Math.max(dist,.01)*speed*motion*sign,sz=(x-d.x)/Math.max(dist,.01)*speed*motion*sign;if(canWalk(d.x+sx,d.z+sz)){d.x+=sx;d.z+=sz;}}d.yaw=Math.atan2(x-d.x,z-d.z);d.flash=true;}
   if(!above||d.age>32){this.double=null;events.push({type:'double-gone'});}
  }
  return events;
 }
 get speedScale(){return this.snared===null?1:.28;}
}
