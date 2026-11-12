// Rules use active game time only. All state belongs to the current life.
export const SWAMP={x:44,z:-28,y:.95,rx:8,rz:6};
export const MILL={x:-48,z:27,y:1.4};
export const PIT={x:-45,z:25,floor:-1.4};
export const ROOTS=[{x:47.4,z:-29},{x:40.7,z:-25.5},{x:47,z:-24.8},{x:41,z:-31.5}];
export const PERCHES=[{x:-48,z:32,y:4.6},{x:40,z:-26,y:2.7},{x:-5,z:-8,y:3.6}];
export function swampRadius(x,z){return Math.hypot((x-SWAMP.x)/SWAMP.rx,(z-SWAMP.z)/SWAMP.rz);}
export function onBoardwalk(x,z){return Math.abs(x-SWAMP.x)<.72&&Math.abs(z-SWAMP.z)<7.3;}
export function inSwamp(x,z){return swampRadius(x,z)<.94&&!onBoardwalk(x,z)&&!ROOTS.some(r=>Math.hypot(x-r.x,z-r.z)<1.04);}
export function inMill(x,z){return Math.abs(x-MILL.x)<5.1&&Math.abs(z-MILL.z)<5.1;}
export function inPit(x,z){return Math.abs(x-PIT.x)<1.12&&Math.abs(z-PIT.z)<1.18;}
export function expeditionReserved(x,z){return swampRadius(x,z)<1.24||Math.abs(x-MILL.x)<7.4&&Math.abs(z-MILL.z)<7.4||ROOTS.some(r=>Math.hypot(x-r.x,z-r.z)<1.3);}
export function expeditionTerrain(x,z,terrain){
 const s=swampRadius(x,z),sw=Math.max(0,Math.min(1,(1.19-s)/.25));
 let h=terrain*(1-sw)+(SWAMP.y-.12)*sw;
 const m=Math.max(Math.abs(x-MILL.x)/6.4,Math.abs(z-MILL.z)/6.4),mw=Math.max(0,Math.min(1,(1.12-m)/.25));
 return h*(1-mw)+MILL.y*mw;
}
export function expeditionFloor(x,z,feet,terrain){if(inPit(x,z)&&feet<MILL.y-.5)return PIT.floor;if(onBoardwalk(x,z))return SWAMP.y+.12;return terrain;}
export function expeditionRoof(x,z){return Math.abs(x-MILL.x)<5.3&&Math.abs(z-MILL.z)<5.35?MILL.y+4.91-Math.abs(x-MILL.x)*.31:-Infinity;}
export class ExpeditionNight{
 constructor(){this.reset();}
 reset(mode='full'){this.mode=mode;this.time=0;this.sink=0;this.drownLeft=6;this.swampWarned=false;this.wet=false;this.rescueUntil=0;this.nextBubble=3;this.millUntil=0;this.millReady=0;this.ropeInstalled=false;this.toolTaken=new Set();this.crateOpened=false;this.crate={kits:1,water:2,trapKits:1};this.pitTaken=false;this.traps=[];this.trapSerial=0;this.blood=[];this.lastBlood=null;this.trackedBloodAt=-Infinity;this.mirrorAge=0;this.mirrorUntil=0;this.mirrorReady=0;this.mirrorSeen=false;this.crows=PERCHES.map(()=>({age:9,ready:0}));}
 takeTool(id,run){if(run.status!=='playing'||this.toolTaken.has(id)||!['crowbar','rope'].includes(id))return false;if(!run.grant({[id]:1})[id])return false;this.toolTaken.add(id);return true;}
 installRope(run){if(run.status!=='playing'||!run.rope||this.ropeInstalled)return false;run.rope--;this.ropeInstalled=true;return true;}
 openCrate(run){if(run.status!=='playing'||!run.crowbar||this.crateOpened)return false;this.crateOpened=true;return true;}
 startMill(run){if(run.status!=='playing'||this.time<this.millReady)return false;this.millUntil=this.time+30;this.millReady=this.time+(this.mode==='demo'?70:180);return true;}
 get lure(){return this.time<this.millUntil?{x:MILL.x-1,z:MILL.z-1}:null;}
 placeTrap(run,x,z,canPlace=()=>true){if(run.status!=='playing'||run.trapKits<=0||this.traps.filter(t=>t.armed).length>=3||inSwamp(x,z)||inPit(x,z)||!Number.isFinite(x+z)||!canPlace(x,z))return false;run.trapKits--;this.traps.push({id:this.trapSerial++,x,z,armed:true,heldUntil:0,previous:null});return true;}
 catchWatcher(x,z){for(const t of this.traps){if(!t.armed)continue;const p=t.previous||{x,z},dx=x-p.x,dz=z-p.z,len=dx*dx+dz*dz,u=len?Math.max(0,Math.min(1,((t.x-p.x)*dx+(t.z-p.z)*dz)/len)):0;t.previous={x,z};if(Math.hypot(p.x+dx*u-t.x,p.z+dz*u-t.z)<.73){t.armed=false;t.heldUntil=this.time+6;return t;}}return null;}
 get held(){return this.traps.some(t=>t.heldUntil>this.time);}
 bloodTarget(x,z,canSee=()=>true){for(let i=this.blood.length-1;i>=0;i--){const b=this.blood[i];if(b.at>this.trackedBloodAt&&Math.hypot(b.x-x,b.z-z)<8&&canSee(b))return b;}return null;}
 rescue(){if(!this.wet)return false;this.sink=0;this.drownLeft=6;this.rescueUntil=this.time+4;return true;}
 update(dt,{active=true,x=0,z=0,feetY=0,moving=false,run=null,watcher=null,mirrorLooking=false}={}){
  if(!active||run&&run.status!=='playing'||!Number.isFinite(dt)||dt<=0)return [];const events=[];this.time+=dt;
  this.blood=this.blood.filter(b=>this.time-b.at<(this.mode==='demo'?100:240));
  if(run?.bleeding&&moving&&(!this.lastBlood||Math.hypot(x-this.lastBlood.x,z-this.lastBlood.z)>.8)){const b={x,z,y:feetY+.019,at:this.time};this.blood.push(b);if(this.blood.length>64)this.blood.shift();this.lastBlood=b;}else if(!run?.bleeding)this.lastBlood=null;
  this.wet=inSwamp(x,z)&&feetY<SWAMP.y+.38;
  if(this.wet&&this.time>this.rescueUntil){
   this.sink=Math.min(1,this.sink+dt*(moving?.10:.065));if(run){run.wetness=Math.min(100,run.wetness+dt*3);run.stamina=Math.max(0,run.stamina-dt*15);}
   if(!this.swampWarned){this.swampWarned=true;events.push({type:'swamp-enter'});}
   if(this.time>this.nextBubble){this.nextBubble=this.time+4;events.push({type:'bubble'});}
   if(this.sink>=1){if(this.drownLeft===6){events.push({type:'drown-warning'});this.drownLeft=5.99;}else{this.drownLeft=Math.max(0,this.drownLeft-dt);if(!this.drownLeft)events.push({type:'drown'});}}
  }else{this.sink=Math.max(0,this.sink-dt*.55);this.drownLeft=6;this.swampWarned=false;}
  const looking=mirrorLooking&&!watcher;
  this.mirrorAge=looking?this.mirrorAge+dt:0;
  if(looking&&this.mirrorAge>=1.8&&this.time>=this.mirrorReady){this.mirrorUntil=this.time+3.5;this.mirrorReady=this.time+(this.mode==='demo'?45:120);this.mirrorSeen=true;events.push({type:'mirror'});}
  if(!looking)this.mirrorUntil=0;
  for(let i=0;i<this.crows.length;i++){const c=this.crows[i];c.age+=dt;if(watcher&&c.age>7&&this.time>c.ready&&Math.hypot(watcher.x-PERCHES[i].x,watcher.z-PERCHES[i].z)<14){c.age=0;c.ready=this.time+55;events.push({type:'crows',id:i,x:PERCHES[i].x,z:PERCHES[i].z});}}
  return events;
 }
 get speedScale(){return this.wet?.35*(1-this.sink*.65):1;}
 get mirrorFigure(){return this.time<this.mirrorUntil;}
}
