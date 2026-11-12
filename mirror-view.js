import * as T from './vendor/three.module.js';

// The reflection camera sees just the physical glass, rather than rendering
// an entire second view of the forest around a tiny mirror. Off-axis framing
// follows the eye position, so turning the head does not drag the reflection.
export class MirrorView {
 constructor(width,height){
  this.width=width;this.height=height;
  this.camera=new T.PerspectiveCamera();this.textureMatrix=new T.Matrix4();
  this.bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  this.origin=new T.Vector3();this.normal=new T.Vector3();this.eye=new T.Vector3();
  this.right=new T.Vector3();this.up=new T.Vector3();this.back=new T.Vector3();
  this.a=new T.Vector3();this.b=new T.Vector3();this.c=new T.Vector3();this.delta=new T.Vector3();
  this.basis=new T.Matrix4();this.plane=new T.Plane();this.clip=new T.Vector4();this.q=new T.Vector4();
 }
 update(source,glass){
  glass.updateWorldMatrix(true,false);source.updateWorldMatrix(true,false);
  const {camera,origin,normal,eye,right,up,back,a,b,c,delta}=this;
  origin.setFromMatrixPosition(glass.matrixWorld);normal.set(0,0,1).transformDirection(glass.matrixWorld);
  eye.setFromMatrixPosition(source.matrixWorld);
  const distance=delta.copy(eye).sub(origin).dot(normal);
  if(distance<=source.near)return false;
  eye.addScaledVector(normal,-2*distance);
  // The virtual eye looks at the back of the glass; reverse its horizontal
  // edge to retain a right-handed camera and the correct mirrored image.
  a.set(this.width/2,-this.height/2,0).applyMatrix4(glass.matrixWorld);
  b.set(-this.width/2,-this.height/2,0).applyMatrix4(glass.matrixWorld);
  c.set(this.width/2,this.height/2,0).applyMatrix4(glass.matrixWorld);
  right.subVectors(b,a).normalize();up.subVectors(c,a).normalize();back.crossVectors(right,up).normalize();
  camera.position.copy(eye);camera.quaternion.setFromRotationMatrix(this.basis.makeBasis(right,up,back));
  camera.near=source.near;camera.far=source.far;camera.updateMatrixWorld(true);
  const nearScale=source.near/distance;
  const left=delta.subVectors(a,eye).dot(right)*nearScale,bottom=delta.dot(up)*nearScale;
  const rightEdge=delta.subVectors(b,eye).dot(right)*nearScale,top=delta.subVectors(c,eye).dot(up)*nearScale;
  camera.projectionMatrix.makePerspective(left,rightEdge,top,bottom,source.near,source.far);
  this.textureMatrix.copy(this.bias).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
  // Clip everything behind the physical surface (wall, frame backs, exterior).
  this.plane.setFromNormalAndCoplanarPoint(normal,origin).applyMatrix4(camera.matrixWorldInverse);
  const {clip,q}=this,e=camera.projectionMatrix.elements;
  clip.set(this.plane.normal.x,this.plane.normal.y,this.plane.normal.z,this.plane.constant);
  q.set((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);
  clip.multiplyScalar(2/clip.dot(q));e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.002;e[14]=clip.w;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return true;
 }
}
