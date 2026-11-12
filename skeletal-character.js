import * as T from './vendor/three.module.js';
import {damp,dampAngle} from './smooth-motion.js?v=20261112-forest48-r2';
const controllers=new WeakMap(),clamp=T.MathUtils.clamp;
const clean=name=>name.replace(/mixamorig:?/,'').replace(/_0\d+$/,'');
const v=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),direction=new T.Vector3(),bend=new T.Vector3(),goalKnee=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion();

// Skinned clones need their own bones and palette. Geometry and maps are shared.
export function cloneSkeleton(source){
 const clone=source.clone(true),sources=[],clones=[],lookup=new Map();source.traverse(o=>sources.push(o));clone.traverse(o=>clones.push(o));sources.forEach((o,i)=>lookup.set(o,clones[i]));
 sources.forEach(o=>{if(!o.isSkinnedMesh)return;const mesh=lookup.get(o);mesh.skeleton=o.skeleton.clone();mesh.skeleton.bones=o.skeleton.bones.map(b=>lookup.get(b));mesh.bindMatrix.copy(o.bindMatrix);mesh.bind(mesh.skeleton,mesh.bindMatrix);mesh.frustumCulled=false;});return clone;
}
export function prepareSkeletalCharacter(asset,animationData,height=2.04){
 const model=asset.scene;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),scale=height/(bounds.max.y-bounds.min.y);
 const root=new T.Group(),visual=new T.Group();visual.name='skeletal-visual';visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;visual.add(model);root.add(visual);
 model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;o.material.roughness=.8;o.material.metalness=0;o.material.envMapIntensity=.35;o.material.normalScale?.set(.75,.75);if(o.material.map)o.material.map.anisotropy=8;}});
 root.userData.animationType='skeletal-v36';root.userData.modelVersion=36;root.userData.clips=animationData.clips;root.updateMatrixWorld(true);
 const bones={};root.traverse(o=>{if(o.isBone)bones[clean(o.name)]=o;});root.userData.ankles=['LeftFoot','RightFoot'].map(k=>bones[k].getWorldPosition(new T.Vector3()).y);return root;
}
function rotateWorld(bone,axis,angle){
 bone.getWorldQuaternion(q);q.premultiply(new T.Quaternion().setFromAxisAngle(axis,angle));bone.parent.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ.multiply(q));bone.updateMatrixWorld(true);
}
// Preserve the authored bend plane. IK makes small terrain/contact corrections;
// the animation clip supplies the whole-body motion and weight transfer.
export function solveSkeletonLeg(hip,knee,ankle,target){
 hip.getWorldPosition(a);knee.getWorldPosition(b);ankle.getWorldPosition(c);
 const upper=a.distanceTo(b),lower=b.distanceTo(c),distance=clamp(a.distanceTo(target),Math.abs(upper-lower)+.001,(upper+lower)*.998);
 direction.copy(target).sub(a).normalize();bend.copy(b).sub(a).addScaledVector(direction,-v.copy(b).sub(a).dot(direction));
 if(bend.lengthSq()<.000001)bend.set(0,0,1).addScaledVector(direction,-direction.z);bend.normalize();
 const along=(upper*upper+distance*distance-lower*lower)/(2*distance),lift=Math.sqrt(Math.max(0,upper*upper-along*along));goalKnee.copy(a).addScaledVector(direction,along).addScaledVector(bend,lift);
 q.setFromUnitVectors(v.copy(b).sub(a).normalize(),direction.copy(goalKnee).sub(a).normalize());q.multiply(hip.getWorldQuaternion(new T.Quaternion()));hip.parent.getWorldQuaternion(parentQ).invert();hip.quaternion.copy(parentQ.multiply(q));hip.updateMatrixWorld(true);
 knee.getWorldPosition(b);ankle.getWorldPosition(c);q.setFromUnitVectors(v.copy(c).sub(b).normalize(),direction.copy(target).sub(b).normalize());q.multiply(knee.getWorldQuaternion(new T.Quaternion()));knee.parent.getWorldQuaternion(parentQ).invert();knee.quaternion.copy(parentQ.multiply(q));knee.updateMatrixWorld(true);
}
export class SkeletalMotion {
 constructor(root){
  this.root=root;this.visual=root.getObjectByName('skeletal-visual');this.baseVisualY=this.visual.position.y;this.bones={};root.traverse(o=>{if(o.isBone)this.bones[clean(o.name)]=o;});
  this.mixer=new T.AnimationMixer(root);this.actions={};for(const data of root.userData.clips){const clip=T.AnimationClip.parse(data),action=this.mixer.clipAction(clip);action.play();action.paused=true;this.actions[clip.name]=action;}
  this.weights={Idle:1,Walk:0,Run:0};this.phase=0;this.speed=0;this.look=0;this.pitch=0;this.lastDistance=null;this.lastTime=null;this.lastYaw=root.rotation.y;this.turn=0;this.offset=0;this.feet=[null,null];
 }
 update(t,{moving=false,running=false,distance=null,scan=0,pitch=0,freeze=false,ground=null,attack=null,state='idle',peek=0}={}){
  const dt=this.lastTime===null?1/60:clamp(t-this.lastTime,0,.25);this.lastTime=t;if(dt===0&&!freeze)return;
  const root=this.root,position=root.position,teleport=this.previous&&Math.hypot(position.x-this.previous.x,position.z-this.previous.z)>1;
  let travel=this.lastDistance===null||distance===null?0:Math.max(0,distance-this.lastDistance);if(teleport||travel>1){travel=0;this.feet=[null,null];this.phase=0;this.speed=0;}
  this.lastDistance=distance;this.previous={x:position.x,z:position.z};
  const requested=freeze?0:moving?(distance===null?(running?2.9:1.2):travel/Math.max(dt,.001)):0;
  this.speed=damp(this.speed,requested,14,dt);
  const run=clamp((this.speed-1.8)/1.1,0,1),locomotion=clamp(this.speed/.14,0,1),targets={Idle:1-locomotion,Walk:locomotion*(1-run),Run:locomotion*run};
  // Clips share a foot phase; playback follows metres travelled, including slow stalking.
  const stride=T.MathUtils.lerp(1.83,3.33,run);if(!freeze)this.phase+=travel/stride;
  const turnDelta=Math.atan2(Math.sin(root.rotation.y-this.lastYaw),Math.cos(root.rotation.y-this.lastYaw));this.lastYaw=root.rotation.y;
  this.turn=damp(this.turn,teleport?0:clamp(turnDelta/Math.max(.001,dt),-2.3,2.3),10,dt);
  if(!moving&&Math.abs(this.turn)>.2&&!freeze){this.phase+=Math.abs(turnDelta)/3.8;targets.Walk=Math.min(.65,Math.abs(this.turn)*.25);targets.Idle=1-targets.Walk;}
  for(const [name,action]of Object.entries(this.actions)){this.weights[name]=freeze?(name==='Idle'?1:0):damp(this.weights[name],targets[name],moving?12:9,dt);action.setEffectiveWeight(this.weights[name]);action.time=name==='Idle'?(freeze?.35:t*.65)%action.getClip().duration:(this.phase%1)*action.getClip().duration;}
  this.mixer.update(0);this.visual.position.y=this.baseVisualY;root.updateMatrixWorld(true);
  this.look=freeze?scan:dampAngle(this.look,clamp(scan,-.65,.65),13,dt);this.pitch=damp(this.pitch,clamp(pitch,-.35,.45),10,dt);
  const head=this.bones.Head,neck=this.bones.Neck;
  // One deliberate gaze correction. No periodic head nod or random neck twitch.
  rotateWorld(neck,new T.Vector3(0,1,0),this.look*.30);rotateWorld(head,new T.Vector3(0,1,0),this.look*.70);
  const right=new T.Vector3(1,0,0).applyQuaternion(root.quaternion);rotateWorld(head,right,this.pitch);
  if(attack!==null&&!freeze){
   const u=clamp(attack,0,1),envelope=u<.28?u/.28:u<.5?1:Math.max(0,(1-u)/.5),strike=u<.28?-.22*envelope:u<.5?T.MathUtils.lerp(-.22,1.18,(u-.28)/.22):1.18*envelope;
   rotateWorld(this.bones.Spine2,right,strike*.16);rotateWorld(this.bones.RightArm,right,-strike);rotateWorld(this.bones.RightForeArm,right,-.25*envelope);rotateWorld(this.bones.LeftArm,right,-strike*.35);
  }
  // Move the upper body as one connected chain when peeking around a trunk.
  if(peek&&!freeze)rotateWorld(this.bones.Spine,new T.Vector3(0,0,1).applyQuaternion(root.quaternion),clamp(peek,-.12,.12)*.45);
  root.updateMatrixWorld(true);
  if(ground&&!freeze)this.correctFeet(dt,ground,moving,teleport);
  root.userData.motionState={speed:this.speed,phase:this.phase,weights:{...this.weights},attack:attack!==null};
 }
 correctFeet(dt,ground,moving,teleport){
  const root=this.root,poses=['Left','Right'].map((side,i)=>{const ankle=this.bones[side+'Foot'],point=ankle.getWorldPosition(new T.Vector3()),sole=root.userData.ankles[i],floor=ground(point.x,point.z)+sole;return {side,i,ankle,point,sole,floor,rotation:ankle.getWorldQuaternion(new T.Quaternion())};});
  // Terrain correction is shared by pelvis and torso, with the legs solving the residual.
  const adjustment=Math.min(...poses.map(p=>p.floor-p.point.y));this.offset=damp(this.offset,clamp(adjustment,-.16,.16),14,dt);this.visual.position.y+=this.offset;root.updateMatrixWorld(true);
  for(const p of poses){
   p.ankle.getWorldPosition(p.point);const height=p.point.y-(ground(p.point.x,p.point.z)+p.sole),contact=height<.035;
   let foot=this.feet[p.i];if(!foot||teleport)foot=this.feet[p.i]={point:p.point.clone(),planted:false,weight:0};
   const strained=foot.point.distanceTo(p.point)>.35||Math.abs(this.turn)>.6;
   if(!contact||strained)foot.planted=false;
   if(contact&&!foot.planted&&!strained){foot.point.copy(p.point);foot.point.y=ground(foot.point.x,foot.point.z)+p.sole;foot.planted=true;}
   foot.weight=damp(foot.weight,foot.planted?1:0,24,dt);
   const target=p.point.clone();target.y=Math.max(target.y,ground(target.x,target.z)+p.sole);
   if(foot.weight>.001)target.lerp(foot.point,foot.weight);
   solveSkeletonLeg(this.bones[p.side+'UpLeg'],this.bones[p.side+'Leg'],p.ankle,target);
   p.ankle.parent.getWorldQuaternion(parentQ).invert();p.ankle.quaternion.copy(parentQ.multiply(p.rotation));p.ankle.updateMatrixWorld(true);
  }
 }
}
export function animateSkeletalCharacter(root,t,options){let controller=controllers.get(root);if(!controller){controller=new SkeletalMotion(root);controllers.set(root,controller);}controller.update(t,options);}
