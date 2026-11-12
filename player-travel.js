import {STEP_HEIGHT} from './movement.js?v=20261112-forest48-r2';
import {motionDelta,motionSteps} from './smooth-motion.js?v=20261112-forest48-r2';

// Feet and camera advance together. Sampling feet just once per rendered frame
// loses the landing impact and changes the camera's lag on stairs at low FPS.
export function advancePlayerTravel(dt,{position,jump,motion,camera,height,drive,
 floorAt,ceilingAt,canMove,sprinting=false,crouched=false,bobbing=true,sink=0,blocked=false}){
 const duration=motionDelta(dt),count=motionSteps(duration),h=duration/count;
 let distance=0,stepped=false,stepSide=0,view;
 for(let i=0;i<count;i++){
  const x=position.x,z=position.z;
  const allowance=jump.grounded?STEP_HEIGHT:0;
  jump.advance(h,floorAt(x,z,jump.feetY,allowance),ceilingAt(x,z,jump.feetY),height);
  const delta=motion.advance(h,drive),step=jump.grounded?STEP_HEIGHT:0;
  if(canMove(x+delta.x,z,jump.feetY,step,height))position.x+=delta.x;else motion.block('x');
  if(canMove(position.x,z+delta.z,jump.feetY,step,height))position.z+=delta.z;else motion.block('z');
  const floor=floorAt(position.x,position.z,jump.feetY,step);
  if(jump.grounded&&floor>=jump.feetY-.035)jump.feetY=floor;
  else if(jump.grounded){jump.grounded=false;jump.velocity=0;}
  const travelled=Math.hypot(position.x-x,position.z-z);distance+=travelled;
  view=camera.advance(h,{feetY:jump.feetY,height,grounded:jump.grounded,distance:travelled,
   moving:!blocked&&travelled>1e-8,sprinting,crouched,bobbing,sink,ceiling:ceilingAt(position.x,position.z,jump.feetY)});
  if(view.step){stepped=true;stepSide=view.stepSide;}
 }
 position.y=view.y;
 return {distance,moving:!blocked&&distance>.00005,bob:view.bob,step:stepped,stepSide,phase:view.phase};
}
