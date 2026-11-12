export const PLAYER_RADIUS=.27,PLAYER_HEIGHT=1.68,STEP_HEIGHT=.18,JUMP_COST=12;
const GRAVITY=18,JUMP_SPEED=6.2;

// A finite capsule follows the length of fallen timber, rather than blocking
// an oversized circle around its centre. Trees without a top stay solid.
export function overlapsObstacle(c,x,z,radius=PLAYER_RADIUS){
 if(c.ax!==undefined){
  const dx=c.bx-c.ax,dz=c.bz-c.az,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((x-c.ax)*dx+(z-c.az)*dz)/length)):0;
  return (x-c.ax-dx*t)**2+(z-c.az-dz*t)**2<(c.r+radius)**2;
 }
 return (x-c.x)**2+(z-c.z)**2<(c.r+radius)**2;
}

export function obstacleTop(c,x,z){if(!Number.isFinite(c.ay)||!Number.isFinite(c.by))return c.top;const dx=c.bx-c.ax,dz=c.bz-c.az,u=Math.max(0,Math.min(1,((x-c.ax)*dx+(z-c.az)*dz)/(dx*dx+dz*dz||1)));return c.ay+(c.by-c.ay)*u;}

export function canOccupy(x,z,colliders,walls,feetY=0,step=0,height=PLAYER_HEIGHT){
 if(x*x+z*z>104*104)return false;
 for(const c of colliders){
  if(c.active===false||Number.isFinite(c.bottom)&&feetY+height<=c.bottom+.002)continue;
  if(Number.isFinite(c.top)&&feetY+step>=obstacleTop(c,x,z)-.002)continue;
  if(overlapsObstacle(c,x,z))return false;
 }
 for(const w of walls)if(w.active!==false&&!(Number.isFinite(w.bottom)&&feetY+height<=w.bottom+.002)&&!(Number.isFinite(w.top)&&feetY+step>=w.top-.002)&&Math.abs(x-w.x)<w.w/2+PLAYER_RADIUS&&Math.abs(z-w.z)<w.d/2+PLAYER_RADIUS)return false;
 return true;
}

export function supportHeight(x,z,terrain,colliders,feetY,step=0){
 let floor=terrain;
 for(const c of colliders)if(c.active!==false&&Number.isFinite(c.top)&&obstacleTop(c,x,z)<=feetY+step+.002&&obstacleTop(c,x,z)>floor&&overlapsObstacle(c,x,z))floor=obstacleTop(c,x,z);
 return floor;
}

export class PlayerJump {
 constructor(floor=0){this.reset(floor);}
 reset(floor=0){this.feetY=floor;this.velocity=0;this.grounded=true;}
 jump(stamina){
  if(!this.grounded||stamina<JUMP_COST)return false;
  this.velocity=JUMP_SPEED;this.grounded=false;return true;
 }
 advance(dt,floor,ceiling=Infinity,height=PLAYER_HEIGHT){
  if(!Number.isFinite(dt)||dt<=0)return;
  if(this.grounded){
   if(floor>=this.feetY-.035){this.feetY=floor;return;}
   this.grounded=false;this.velocity=0;
  }
  let next=this.feetY+this.velocity*dt-GRAVITY*dt*dt*.5;this.velocity-=GRAVITY*dt;
  if(next+height>ceiling){next=Math.max(floor,ceiling-height);this.velocity=Math.min(0,this.velocity);}
  if(next<=floor){this.feetY=floor;this.velocity=0;this.grounded=true;}else this.feetY=next;
 }
}
