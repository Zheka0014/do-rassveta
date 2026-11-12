// Damped suspension, with angular velocity preserved between frames. Wind is
// a force, not a prescribed pose; after an impulse the figure settles again.
export class SuspendedMotion {
 constructor(id=0){this.id=id;this.length=2.35+id*.09;this.reset();}
 reset(){this.x=this.z=this.vx=this.vz=this.lag=this.lagVelocity=0;}
 impulse(x=.055,z=.105){this.vx+=x;this.vz+=z;}
 update(dt,time,wind=1){
  if(!Number.isFinite(dt)||dt<=0)return this;
  const duration=Math.min(dt,.25),steps=Math.ceil(duration*120),h=duration/steps;
  const gravity=9.81/this.length,drag=.82+this.id*.035;
  for(let i=0;i<steps;i++){
   const t=time-duration+(i+1)*h,force=wind*(Math.sin(t*.27+this.id*1.7)*.006+Math.sin(t*.61+this.id*2.3)*.002);
   this.vx+=(force*.6-gravity*this.x-drag*this.vx)*h;
   this.vz+=(force-gravity*this.z-drag*this.vz)*h;
   this.x+=this.vx*h;this.z+=this.vz*h;
   this.lagVelocity+=(-this.vz*1.8-18*this.lag-4.8*this.lagVelocity)*h;
   this.lag+=this.lagVelocity*h;
  }
  return this;
 }
}
