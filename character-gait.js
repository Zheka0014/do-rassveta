const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const angle=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const lerpPoint=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t)});

// Solve in the sagittal plane, then rotate that plane around Z. A ZXY hip
// rotation reproduces the complete 3D target, including lateral steps.
export function solveLeg(x,y,z,thigh,shin){
 const length=clamp(Math.hypot(x,y,z),Math.abs(thigh-shin)+.0001,(thigh+shin)*.9995);
 const lateral=Math.atan2(x,-y),planeY=-Math.hypot(x,y);
 const knee=Math.PI-Math.acos(clamp((thigh*thigh+shin*shin-length*length)/(2*thigh*shin),-1,1));
 const hip=-Math.atan2(z,-planeY)-Math.acos(clamp((thigh*thigh+length*length-shin*shin)/(2*thigh*length),-1,1));
 return {hip,knee,lateral};
}
export function toLocalFoot(foot,root){
 const c=Math.cos(root.yaw),s=Math.sin(root.yaw),x=foot.x-root.x,z=foot.z-root.z;
 return {x:c*x-s*z,y:foot.y-root.y,z:s*x+c*z};
}
export function supportDrop(feet,hips,thigh,shin){
 const reach=(thigh+shin)*.995;let drop=.025;
 for(let i=0;i<feet.length;i++){
  const foot=feet[i],hip=hips[i],horizontal=(foot.x-hip.x)**2+(foot.z-hip.z)**2;
  const vertical=Math.sqrt(Math.max(0,reach*reach-horizontal));drop=Math.max(drop,hip.y-foot.y-vertical);
 }
 return Math.min(.18,drop);
}
function worldFoot(root,side,ahead,ground){
 const c=Math.cos(root.yaw),s=Math.sin(root.yaw),x=root.x+c*side+s*ahead,z=root.z-s*side+c*ahead;
 return {x,y:ground(x,z)+.109,z};
}
function finish(foot){foot.point={...foot.goal};foot.yaw=foot.goalYaw;foot.mode='plant';foot.swing=false;}
function pose(foot,q,lift){
 const u=clamp(q,0,1),blend=smooth(u);foot.point=lerpPoint(foot.start,foot.goal,blend);foot.point.y+=Math.sin(u*Math.PI)*lift;
 foot.yaw=foot.startYaw+angle(foot.startYaw,foot.goalYaw)*blend;
 if(u>=1)finish(foot);
}
function begin(foot,target,yaw,mode){foot.start={...foot.point};foot.goal=target;foot.startYaw=foot.yaw;foot.goalYaw=yaw;foot.mode=mode;foot.swing=true;foot.age=0;}

export class PlantedGait{
 constructor(){this.reset();}
 reset(){this.phase=0;this.previous=null;this.feet=[null,null];this.distance=null;this.started=false;}
 update(root,distance,dt,options={}){
  const previous=this.previous,duration=Number.isFinite(dt)?clamp(dt,0,.25):0;
  if(!previous||!duration||Math.hypot(root.x-previous.x,root.z-previous.z)>1||Math.abs(root.y-previous.y)>.6||Number.isFinite(distance)&&distance<this.distance-1e-6)return this.advance(root,distance,duration,options);
  if(!options.moving&&this.feet.every(f=>f.mode==='plant')&&Math.hypot(root.x-previous.x,root.y-previous.y,root.z-previous.z)<1e-10&&Math.abs(angle(previous.yaw,root.yaw))<1e-10)return this.advance(root,distance,duration,options);
  const count=Math.ceil(duration*120),start={...previous},startDistance=this.distance;let result;
  for(let i=1;i<=count;i++){
   const f=i/count,r={x:mix(start.x,root.x,f),y:mix(start.y,root.y,f),z:mix(start.z,root.z,f),yaw:start.yaw+angle(start.yaw,root.yaw)*f};
   result=this.advance(r,Number.isFinite(distance)?mix(startDistance,distance,f):null,duration/count,options);
  }
  return result;
 }
 advance(root,distance,dt,{moving=false,running=false,stepLength=.85,width=.115,lift=.12,ground=()=>root.y}={}){
  const previous=this.previous,travel=previous?Math.hypot(root.x-previous.x,root.z-previous.z):0;
  const discontinuity=!previous||travel>1||Math.abs(root.y-previous.y)>.6||Number.isFinite(distance)&&this.distance!==null&&distance<this.distance-1e-6;
  const sides=[-width,width],stride=stepLength*(running?1.3:1),duration=Number.isFinite(dt)?clamp(dt,0,.25):0;
  const view=()=>this.feet.map(f=>({...toLocalFoot(f.point,root),yaw:angle(root.yaw,f.yaw),swing:f.mode!=='plant'}));
  if(discontinuity){
   this.phase=0;this.started=false;this.distance=Number.isFinite(distance)?distance:0;this.previous={...root};
   this.feet=sides.map(side=>({point:worldFoot(root,side,0,ground),yaw:root.yaw,mode:'plant',swing:false}));return view();
  }
  if(duration===0)return view();
  const covered=Number.isFinite(distance)?Math.max(0,distance-this.distance):travel;
  this.distance=Number.isFinite(distance)?distance:this.distance+travel;
  const starting=!this.started&&moving&&covered>1e-10;
  // A standing character starts with a short half-step. Beginning at a full
  // stance would drag the torso almost a whole step beyond the support foot.
  if(starting){this.phase=.3;this.started=true;}
  const oldPhase=this.phase,advance=moving?covered/stride:0;this.phase+=advance;
  const vx=travel>.00001?(root.x-previous.x)/travel:Math.sin(root.yaw),vz=travel>.00001?(root.z-previous.z)/travel:Math.cos(root.yaw);
  const at=f=>({x:mix(previous.x,root.x,f),y:mix(previous.y,root.y,f),z:mix(previous.z,root.z,f),yaw:previous.yaw+angle(previous.yaw,root.yaw)*f});
  if(starting){
   const foot=this.feet[1],target=worldFoot(previous,sides[1],0,ground);target.x+=vx*stride*.5;target.z+=vz*stride*.5;target.y=ground(target.x,target.z)+.109;
   begin(foot,target,previous.yaw,'stride');foot.startPhase=.8;foot.phaseSpan=.2;foot.lift=lift*.7;
  }
  for(let i=0;i<2;i++){
   const foot=this.feet[i],from=oldPhase+i*.5,to=this.phase+i*.5;
   // A stopped swing finishes its existing landing, rather than chasing a
   // neutral point under the moving body or snapping down at a phase boundary.
   if(!moving&&foot.mode==='stride'){
    const local=toLocalFoot(foot.goal,root),goal=worldFoot(root,clamp(local.x,sides[i]-.08,sides[i]+.08),clamp(local.z,-stride*.28,stride*.28),ground);
    begin(foot,goal,root.yaw,'settle');foot.duration=.24;foot.lift=0;
   }
   if(foot.mode==='settle'||foot.mode==='recover'){
    foot.age+=duration;pose(foot,foot.age/foot.duration,foot.lift);continue;
   }
   if(advance>0){
    let boundary=Math.floor(from)+.6;
    if(boundary<=from+1e-10)boundary=Math.floor(from)+1;
    for(let events=0;boundary<=to+1e-10&&events<8;events++){
     const liftOff=Math.abs(boundary-Math.floor(boundary)-.6)<1e-8;
     if(liftOff){
      if(this.feet[1-i].mode==='plant'){
       const r=at(clamp((boundary-from)/advance,0,1)),target=worldFoot(r,sides[i],0,ground);
       // Predict the end of this swing once. A fixed world-space destination
       // gives the foot a clean landing and supports backward/sideways travel.
       target.x+=vx*stride*.7;target.z+=vz*stride*.7;target.y=ground(target.x,target.z)+.109;
       begin(foot,target,r.yaw,'stride');foot.startPhase=boundary;foot.phaseSpan=.4;foot.lift=lift*(running?1.6:1);
      }
      boundary=Math.floor(boundary)+1;
     }else{
      if(foot.mode==='stride')finish(foot);
      boundary+=.6;
     }
    }
   }
   if(foot.mode==='stride')pose(foot,(to-foot.startPhase)/foot.phaseSpan,foot.lift);
  }
  // Turn-in-place and a sudden direction change require a real step. Release
  // one foot at a time; the other remains a world-space support point.
  if(this.feet.every(f=>f.mode==='plant')){
   const scores=this.feet.map((foot,i)=>{const local=toLocalFoot(foot.point,root);return Math.max(Math.abs(angle(foot.yaw,root.yaw))/.55,Math.abs(local.x-sides[i])/.22,Math.abs(local.z)/(stride*.60));});
   const i=scores[0]>=scores[1]?0:1;
   if(scores[i]>1){
    const foot=this.feet[i],target=worldFoot(root,sides[i],0,ground);
    if(moving){target.x+=vx*stride*.18;target.z+=vz*stride*.18;target.y=ground(target.x,target.z)+.109;}
    begin(foot,target,root.yaw,'recover');foot.duration=.24;foot.lift=Math.min(.075,lift);
   }
  }
  this.previous={...root};return view();
 }
}
