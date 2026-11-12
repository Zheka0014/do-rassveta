import * as T from './vendor/three.module.js';
import {HANGING_IDENTITIES} from './hanging-identities.js?v=20261113-forest48-r3';

export const NOOSE_RADIUS=.064;
export const HANGING_ANCHOR=Object.freeze([0,-1.66,-.015]);

// The strand attaches to the back of the neck loop. Both are expressed in
// pivot coordinates after posing, so body lean cannot separate them.
export function poseHanging(root,id=0){
 const head=root.getObjectByName('head'),neck=root.getObjectByName('neck');
 if(!head||!neck)throw new Error('Hanging pose requires a loaded anatomical character');
 root.rotation.set(.075,id%2?-.35:.23,id%2?.035:-.025);
 const identity=root.userData.hangingIdentity?HANGING_IDENTITIES[id]:null;
 head.rotation.set(identity?.pitch??(root.userData.horrorKind==='listener'?.25:.38),0,identity?.roll??-.12);
 const hood=head.getObjectByName('ragged-hood');if(hood)hood.visible=false;
 for(const side of [-1,1]){
  root.getObjectByName('arm-'+side).rotation.z=side*(identity?.arm[side<0?0:1]??.055);
  root.getObjectByName('elbow-'+side).rotation.x=.045;
  root.getObjectByName('knee-'+side).rotation.x=identity?.knees[side<0?0:1]??(side<0?.04:.11);
 }
 const nooseRadius=NOOSE_RADIUS*(identity?identity.height*identity.bodyWidth:1);
 const neckPoint=neck.position.clone();neckPoint.y-=.055*(identity?.height??1);
 const anchor=new T.Vector3(...HANGING_ANCHOR);
 root.position.copy(anchor).sub(neckPoint.clone().applyQuaternion(root.quaternion));
 const ropeEnd=neckPoint.clone().add(new T.Vector3(0,0,-nooseRadius)).applyQuaternion(root.quaternion).add(root.position);
 root.updateMatrixWorld(true);
 return {head,neckPoint,ropeEnd,nooseRadius};
}
