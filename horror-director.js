export const CEMETERY={x:-17,z:-13,halfX:6,halfZ:7};
export function horrorPropReserved(x,z){return Math.abs(x-2.8)<1.25&&Math.abs(z+6)<1.65||Math.hypot(x-2.5,z+8.9)<1;}
export function cemeteryReserved(x,z,margin=1){return Math.abs(x-CEMETERY.x)<CEMETERY.halfX+margin&&Math.abs(z-CEMETERY.z)<CEMETERY.halfZ+margin;}

// Runs on active survival time only. Looking at a body is deliberate; turning
// away lets the director quietly rearm an encounter after a long cooldown.
export class HorrorDirector {
 constructor(){this.reset();}
 reset(){this.time=0;this.nextAmbient=42;this.nextGrave=0;this.entered=false;this.seen=new Set();this.gaze=new Map();this.nextBody=new Map();this.nextProp=new Map();this.flicker=0;}
 update(dt,{active=true,x=0,z=0,yaw=0,flash=false,bodies=[],props=[]}={}){
  if(!active||dt<=0)return [];
  this.time+=dt;this.flicker=Math.max(0,this.flicker-dt);const events=[];
  const inside=cemeteryReserved(x,z,0);
  if(inside&&!this.entered&&this.time>=this.nextGrave){events.push({type:'grave'});this.nextGrave=this.time+150;this.flicker=1.8;}
  this.entered=inside;
  for(const b of bodies){
   const dx=b.x-x,dz=b.z-z,d=Math.hypot(dx,dz),aim=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(.001,d),looking=d<19&&aim>.88;
   if(looking&&!this.seen.has(b.id)&&this.time>5){this.seen.add(b.id);events.push({type:'rope',id:b.id,x:b.x,z:b.z});}
   const gaze=looking&&flash?(this.gaze.get(b.id)||0)+dt:0;this.gaze.set(b.id,gaze);
   if(gaze>2.2&&this.time>=(this.nextBody.get(b.id)||0)){events.push({type:'body',id:b.id,x:b.x,z:b.z});this.nextBody.set(b.id,this.time+90);this.gaze.set(b.id,0);this.flicker=1.1;}
  }
  for(const p of props){
   if(this.time>8&&Math.hypot(p.x-x,p.z-z)<p.range&&this.time>=(this.nextProp.get(p.id)||0)){
    events.push({type:p.sound,x:p.x,z:p.z});this.nextProp.set(p.id,this.time+(p.sound==='radio'?65:48));
   }
  }
  if(this.time>=this.nextAmbient){events.push({type:inside?'bell':'whisper'});this.nextAmbient=this.time+70+(Math.sin(this.time)*.5+.5)*50;}
  return events;
 }
 get lightScale(){return this.flicker>0?(Math.sin(this.time*47)>.1?1:.13):1;}
}
