export const EXPLORE_POINTS=[
 {id:'well',x:-20,z:4,label:'Крутить ворот колодца'},
 {id:'camera',x:-1.55,z:-15.75,level:'upper',label:'Взять плёночный фотоаппарат'},
 {id:'curse',x:13,z:-26,label:'Взять чужой фонарь'},
 {id:'ladder',x:-1.5,z:-12,level:'upper',label:'Подняться на чердак'},
 {id:'map',x:.8,z:-15.5,level:'attic',label:'Изучить карту лесника'}
];
export const RARE_SITES=[{id:'car',x:34,z:9},{id:'tent',x:-29,z:36},{id:'phone',x:10,z:-43}];
export const PHOTO_SECRETS=[{id:'loop',x:-43,z:-23,y:1.5,text:'На снимке: ВЫЙТИ К ВОДЕ. Ручей западнее повторяющейся тропы.'},{id:'well',x:-20,z:4,y:1.4,text:'На снимке колодца: ОТПУСТИ, КОГДА ПОТЯНЕТ СНИЗУ.'},{id:'antenna',x:29,z:-23,y:1.8,text:'На снимке антенны — фигура за спиной. На её жетоне 0419.'}];
export function explorationReserved(x,z){return EXPLORE_POINTS.some(o=>!o.level&&Math.hypot(x-o.x,z-o.z)<3.8)||RARE_SITES.some(o=>Math.hypot(x-o.x,z-o.z)<4.3)||(x>-50.5&&x<-39&&z>-36&&z<-11);}
export const CROUCH_HEIGHT=1.03,ATTIC_FLOOR=3.03;
export function inAttic(x,z){return Math.abs(x)<1.62&&z>-16.7&&z<-11.45;}
export function playerLevel(x,z,feetY){if(feetY>2.8&&inAttic(x,z))return 'attic';if(feetY<-.3&&Math.abs(x)<3.15&&z>-17.2&&z<-10.7)return 'lower';return 'ground';}
export function lookedAt(eye,target,yaw,pitch,clear=true){const dx=target.x-eye.x,dy=target.y-eye.y,dz=target.z-eye.z,d=Math.hypot(dx,dy,dz);return clear&&d<46&&d>.01&&(-Math.sin(yaw)*Math.cos(pitch)*dx+Math.sin(pitch)*dy-Math.cos(yaw)*Math.cos(pitch)*dz)/d>Math.cos(Math.PI/6);}
// The original quarry creature searches its last visible location, never a
// hidden player's current coordinates. Movement and sound invalidate cover.
export class PursuitSight{
 reset(){this.last=null;this.hiddenFor=0;}
 constructor(){this.reset();}
 update(dt,{x,z,hidden=false,active=true}){if(!active)return;if(!hidden||!this.last){this.last={x,z};this.hiddenFor=0;}else this.hiddenFor+=dt;}
 get searching(){return this.hiddenFor>=2.5;}
}
export class ExplorationNight{
 constructor(){this.reset();}
 reset(seed=1,mode='full'){
  this.seed=seed>>>0;this.mode=mode;this.time=0;this.well=null;this.bucket=true;this.wellReady=0;this.camera=false;this.film=8;this.photoReady=0;this.secrets=new Set();this.curse=false;this.cursedLight=false;this.curseNoise=0;this.curseWarned=false;this.map=false;this.atticVisited=false;this.atticScare=false;this.statue=null;this.nextStatue=mode==='demo'?38:180;this.loopReady=0;this.loopCount=0;this.previous=null;
  this.sites=RARE_SITES.map(p=>({...p,visible:this.random()<.65,variant:this.random()<.5?'supplies':'alarm',opened:false,contents:null}));
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 startWell(active=true){if(!active||!this.bucket||this.well||this.time<this.wellReady)return false;this.well={age:0,pull:this.random()<.45,warning:false,grace:3};return true;}
 releaseWell(active=true){if(!active||!this.well)return null;const lost=this.well.warning;this.well=null;if(lost)this.bucket=false;return {type:'well-release',lost};}
 takeCamera(active=true){if(!active||this.camera)return false;this.camera=true;return true;}
 takeCurse(active=true){if(!active||this.curse)return false;this.curse=true;return true;}
 toggleCurse(active=true){if(!active||!this.curse)return false;this.cursedLight=!this.cursedLight;return true;}
 photograph(visibleIds=[],active=true){if(!active||!this.camera||!this.film||this.time<this.photoReady)return null;this.film--;this.photoReady=this.time+2;const found=PHOTO_SECRETS.filter(o=>visibleIds.includes(o.id)&&!this.secrets.has(o.id));found.forEach(o=>this.secrets.add(o.id));return {found,film:this.film};}
 takeMap(active=true){if(!active||this.map)return false;this.map=true;return true;}
 visitSite(id,active=true){const site=this.sites.find(s=>s.id===id&&s.visible);if(!active||!site||site.opened)return null;site.opened=true;site.contents=site.variant==='supplies'?{food:2,water:1,wood:1}:{kits:1,flares:1};return {type:site.variant==='alarm'?'site-alarm':'site-find',id,contents:site.contents};}
 update(dt,{active=true,x=0,z=0,feetY=0,flash=false,moving=false,protectedHere=false,canSpawn=()=>true,observed=false,canWalk=()=>true,allowThreats=true,lure=null,canStrike=()=>true}={}){
  if(!active||!Number.isFinite(dt)||dt<=0)return [];this.time+=dt;const events=[],motion=Math.min(dt,.1),above=playerLevel(x,z,feetY)==='ground';
  if(this.well){const w=this.well;if(Math.hypot(x+20,z-4)>2.7||!above){events.push(this.releaseWell());}else if(w.warning){w.grace-=dt;if(w.grace<=0){this.well=null;this.bucket=false;events.push({type:'well-hurt',damage:22});}}else{w.age+=dt;if(w.pull&&w.age>=4){w.warning=true;events.push({type:'well-pull'});}else if(w.age>=8){this.well=null;this.wellReady=this.time+(this.mode==='demo'?30:90);events.push({type:'well-water',water:2});}}}
  if(this.cursedLight&&flash&&above){this.curseNoise+=dt;if(!this.curseWarned){this.curseWarned=true;events.push({type:'curse-warning'});}if(this.curseNoise>=(this.mode==='demo'?10:28)){this.curseNoise=0;events.push({type:'curse-call'});}}else this.curseNoise=Math.max(0,this.curseNoise-dt*.5);
  const prev=this.previous;
  if(above&&prev&&x>-46&&x<-40&&z<-29&&prev.z>=-29&&this.time>=this.loopReady){this.loopCount++;this.loopReady=this.time+5;events.push({type:'loop',x:-43,z:-18});}
  this.previous={x,z};
  if(allowThreats&&above&&!protectedHere&&!this.statue&&this.time>=this.nextStatue){this.nextStatue=this.time+8;events.push({type:'statue-spawn'});}
  const s=this.statue;if(s){s.age+=dt;s.cooldown=Math.max(0,s.cooldown-dt);const distance=Math.hypot(x-s.x,z-s.z);if(!above||s.age>65||protectedHere&&distance<9){this.statue=null;this.nextStatue=this.time+(this.mode==='demo'?50:240);events.push({type:'statue-gone'});}else if(!observed){const target=lure||{x,z},tx=target.x-s.x,tz=target.z-s.z,travel=Math.max(.01,Math.hypot(tx,tz));s.yaw=Math.atan2(tx,tz);let continueStatue=false;if(distance<4&&!s.warned){s.warned=true;s.warning=2;events.push({type:'statue-warning'});continueStatue=true;}if(continueStatue){}else if(s.warning>0)s.warning=Math.max(0,s.warning-dt);else{const speed=this.cursedLight&&flash?1.2:.8,nx=s.x+tx/travel*speed*motion,nz=s.z+tz/travel*speed*motion;if(canWalk(nx,nz)){s.x=nx;s.z=nz;}else{const side=Math.sin(s.age)>0?1:-1,tx=s.x-(target.z-s.z)/travel*speed*motion*side,tz=s.z+(target.x-s.x)/travel*speed*motion*side;if(canWalk(tx,tz)){s.x=tx;s.z=tz;}}if(distance<1.3&&s.cooldown===0&&canStrike(s)){s.cooldown=3;events.push({type:'statue-hurt',damage:20});}}}}
  return events.filter(Boolean);
 }
 spawnStatue(point){if(this.statue)return false;this.statue={yaw:0,...point,age:0,cooldown:0,warned:false,warning:0};return true;}
 get wellLabel(){return this.well?this.well.warning?'ОТПУСТИТЬ ВЕРЁВКУ · E':'Остановить ворот · E':!this.bucket?'Ведро потеряно':this.time<this.wellReady?'Колодец набирает воду':'Крутить ворот · вода';}
}

function segmentPoint(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/Math.max(.00001,dx*dx+dz*dz)));return {distance:Math.hypot(px-ax-t*dx,pz-az-t*dz),t};}
export function lineBlocked(a,b,colliders=[],walls=[]){
 const minX=Math.min(a.x,b.x)-2,maxX=Math.max(a.x,b.x)+2,minZ=Math.min(a.z,b.z)-2,maxZ=Math.max(a.z,b.z)+2;
 for(const c of colliders){if(c.active===false)continue;const ax=c.ax??c.x,az=c.az??c.z,bx=c.bx??c.x,bz=c.bz??c.z;
  if(Math.max(ax,bx)<minX||Math.min(ax,bx)>maxX||Math.max(az,bz)<minZ||Math.min(az,bz)>maxZ)continue;
  let best=segmentPoint(ax,az,a.x,a.z,b.x,b.z),q=segmentPoint(bx,bz,a.x,a.z,b.x,b.z);if(q.distance<best.distance)best=q;
  const dx=b.x-a.x,dz=b.z-a.z,ex=bx-ax,ez=bz-az,den=dx*ez-dz*ex;
  if(Math.abs(den)>.00001){const t=((ax-a.x)*ez-(az-a.z)*ex)/den,u=((ax-a.x)*dz-(az-a.z)*dx)/den;if(t>=0&&t<=1&&u>=0&&u<=1)best={distance:0,t};}
  const y=a.y+(b.y-a.y)*best.t;if(best.distance<c.r&&best.t>.015&&best.t<.985&&(!Number.isFinite(c.top)||y<c.top)&&(!Number.isFinite(c.bottom)||y>c.bottom))return true;
 }
 for(const w of walls){if(w.active===false)continue;let lo=0,hi=1;for(const [axis,size]of [['x',w.w],['z',w.d]]){const d=b[axis]-a[axis],min=w[axis]-size/2,max=w[axis]+size/2;if(Math.abs(d)<.00001){if(a[axis]<min||a[axis]>max){hi=-1;break;}}else{const t1=(min-a[axis])/d,t2=(max-a[axis])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}}const y=a.y+(b.y-a.y)*lo;if(hi>=lo&&lo>.015&&lo<.985&&(!Number.isFinite(w.top)||y<w.top)&&(!Number.isFinite(w.bottom)||y>w.bottom))return true;}
 return false;
}
