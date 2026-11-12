const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const damp=(from,to,rate,dt)=>to+(from-to)*Math.exp(-rate*Math.max(0,dt));
export const dampAngle=(from,to,rate,dt)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*(1-Math.exp(-rate*Math.max(0,dt)));
export function motionDelta(dt){return Number.isFinite(dt)?Math.min(.25,Math.max(0,dt)):0;}
export function motionSteps(dt){return Math.max(1,Math.ceil(motionDelta(dt)*120));}

export class MotionResponse {
 constructor(){this.reset();}
 reset(){this.x=this.z=0;}
 block(axis){this[axis]=0;}
 advance(dt,{forward=0,side=0,yaw=0,speed=0}={}){
  if(!Number.isFinite(dt)||dt<=0)return {x:0,z:0};
  const length=Math.max(1,Math.hypot(forward,side));forward/=length;side/=length;
  const tx=(side*Math.cos(yaw)-forward*Math.sin(yaw))*speed,tz=(-side*Math.sin(yaw)-forward*Math.cos(yaw))*speed;
  const rate=Math.hypot(tx,tz)<.01?24:16,a=1-Math.exp(-rate*dt);
  // Integrate the exponential response exactly, so 30/60/120 Hz cover the same distance.
  const x=tx*dt+(this.x-tx)*a/rate,z=tz*dt+(this.z-tz)*a/rate;
  this.x+=(tx-this.x)*a;this.z+=(tz-this.z)*a;
  if(Math.hypot(this.x,this.z)<.0005)this.reset();return {x,z};
 }
}
export class LookResponse {
 constructor(){this.reset(0,0);}
 reset(yaw,pitch){this.yaw=this.targetYaw=yaw;this.pitch=this.targetPitch=clamp(pitch,-1.48,1.48);}
 add(yaw,pitch=0){this.targetYaw+=yaw;this.targetPitch=clamp(this.targetPitch+pitch,-1.48,1.48);}
 advance(dt,{yawRate=0,pitchRate=0}={}){
  if(!Number.isFinite(dt)||dt<=0)return {yaw:this.yaw,pitch:this.pitch};
  yawRate=Number.isFinite(yawRate)?yawRate:0;pitchRate=Number.isFinite(pitchRate)?pitchRate:0;
  // Keyboard input moves the target throughout the frame. Integrating that
  // ramp avoids a different turn lag at 20, 60 and 120 FPS. Mouse add() still
  // changes the target immediately and follows the same exponential response.
  this.yaw=lookRamp(this.yaw,this.targetYaw,yawRate,dt);this.targetYaw+=yawRate*dt;
  const pitchTime=pitchRate?Math.min(dt,Math.max(0,((pitchRate>0?1.48:-1.48)-this.targetPitch)/pitchRate)):dt;
  this.pitch=lookRamp(this.pitch,this.targetPitch,pitchRate,pitchTime);
  this.targetPitch=clamp(this.targetPitch+pitchRate*pitchTime,-1.48,1.48);
  // After the target reaches the pitch limit, it stays there for the rest of
  // the frame; splitting at this instant also keeps long frames consistent.
  this.pitch=damp(this.pitch,this.targetPitch,38,dt-pitchTime);
  return {yaw:this.yaw,pitch:this.pitch};
 }
}
function lookRamp(from,target,velocity,dt){const response=-Math.expm1(-38*dt);return from+(target-from)*response+velocity*(dt-response/38);}
export class CameraResponse {
 constructor(){this.reset(0,1.68);}
 reset(feet,height){this.lastFeet=feet;this.eye=height;this.stepOffset=this.phase=this.amount=0;this.wasGrounded=true;this.fallSpeed=this.landing=this.landingVelocity=0;}
 advance(dt,{feetY,height,grounded=true,distance=0,moving=false,sprinting=false,crouched=false,bobbing=true,sink=0,ceiling=Infinity}){
  const change=feetY-this.lastFeet;
  if(!grounded&&dt>0)this.fallSpeed=Math.min(this.fallSpeed,change/dt);
  if(grounded&&!this.wasGrounded){if(bobbing&&this.fallSpeed<-.8)this.landingVelocity-=Math.min(.8,-this.fallSpeed*.11);this.fallSpeed=0;}
  // Exact critically damped spring: a small compression at touchdown, without
  // a repeated bounce or a frame-rate-dependent camera shake.
  if(!bobbing)this.landing=this.landingVelocity=0;
  else{const w=20,k=this.landingVelocity+w*this.landing,e=Math.exp(-w*Math.max(0,dt));this.landing=(this.landing+k*dt)*e;this.landingVelocity=(this.landingVelocity-w*k*dt)*e;}
  if(Math.abs(change)>.6)this.stepOffset=0;
  else if(grounded&&this.wasGrounded)this.stepOffset=clamp(this.stepOffset-change,-.20,.20);
  this.lastFeet=feetY;this.wasGrounded=grounded;this.stepOffset=damp(this.stepOffset,0,22,dt);this.eye=damp(this.eye,height,16,dt);
  const before=Math.floor(this.phase/Math.PI),stride=sprinting?1.22:crouched?.57:.76;
  if(grounded&&moving)this.phase+=Math.max(0,distance)*Math.PI/stride;
  const step=grounded&&moving&&Math.floor(this.phase/Math.PI)>before;
  this.amount=damp(this.amount,bobbing&&grounded&&moving?(sprinting?.020:crouched?.004:.009):0,12,dt);
  const bob=-Math.cos(this.phase*2)*this.amount+this.landing;
  const y=Math.min(feetY+this.eye+this.stepOffset+bob-sink,ceiling-.08);
  return {y:Math.max(feetY+.23,y),bob,step,stepSide:Math.floor(this.phase/Math.PI)%2?-.18:.18,phase:this.phase};
 }
}
const turns=new WeakMap();
export function turnActor(root,target,dt,rate=9){
 const p=root.position,old=turns.get(root),teleport=!old||Math.hypot(p.x-old.x,p.z-old.z)>3;
 root.rotation.y=teleport?target:dampAngle(root.rotation.y,target,rate,dt);turns.set(root,{x:p.x,z:p.z});
}
