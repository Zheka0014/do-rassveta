const clamp=(value,limit)=>Math.max(-limit,Math.min(limit,value));
const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

// Cosmetic lag in camera-local radians. The camera and gameplay aim are never
// written here. Integrating a constant angular velocity exactly avoids stronger
// sway at low frame rates; only unusually fast turns reach the small hard bounds.
export class HandMotion {
 constructor(){this.offset={yaw:0,pitch:0};this.reset();}
 reset(){this.initialized=false;this.offset.yaw=this.offset.pitch=0;return this.offset;}
 advance(dt,{yaw,pitch,x=0,y=0,z=0,bobbing=true}){
  if(!Number.isFinite(yaw)||!Number.isFinite(pitch)||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return this.reset();
  const dy=this.initialized?angleDelta(this.lastYaw,yaw):0,dp=this.initialized?pitch-this.lastPitch:0;
  const teleport=this.initialized&&((x-this.x)**2+(y-this.y)**2+(z-this.z)**2>4||Math.abs(dy)>1.2||Math.abs(dp)>1.2);
  const clear=!this.initialized||teleport||!bobbing||dt>.3;
  this.initialized=true;this.lastYaw=yaw;this.lastPitch=pitch;this.x=x;this.y=y;this.z=z;
  if(clear){this.offset.yaw=this.offset.pitch=0;return this.offset;}
  // Reflection captures and pause redraws use dt=0. Observe their current pose
  // without advancing the lag or queueing their angle change for the next frame.
  if(!Number.isFinite(dt)||dt<=0)return this.offset;
  const rate=12,decay=Math.exp(-rate*dt),response=-Math.expm1(-rate*dt)/(rate*dt),gain=.28;
  this.offset.yaw=clamp(this.offset.yaw*decay-dy*gain*response,.045);
  this.offset.pitch=clamp(this.offset.pitch*decay-dp*gain*response,.035);
  return this.offset;
 }
}
