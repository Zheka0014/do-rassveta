import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {createHorrorCharacter,animateCharacter} from './horror-characters.js?v=20261112-forest48-r2';

export function buildPlayerBody(f){
 const root=new T.Group();root.name='Тело игрока';f.scene.add(root);root.visible=false;
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data.set([128+Math.sin(x*2)*18,128+Math.sin(y*2)*18,250,255],i);}
 const weave=new T.DataTexture(data,size,size);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(5,5);weave.generateMipmaps=true;weave.minFilter=T.LinearMipmapLinearFilter;weave.needsUpdate=true;
 const cloth=new T.MeshStandardMaterial({color:0x424837,roughness:.93,normalMap:weave,normalScale:new T.Vector2(.17,.17)}),leather=new T.MeshStandardMaterial({color:0x34302a,roughness:.72}),rubber=new T.MeshStandardMaterial({color:0x131512,roughness:.96}),thread=new T.MeshStandardMaterial({color:0x787766,roughness:.94});
 const torso=new T.Mesh(new T.CylinderGeometry(.235,.205,.47,16,3),cloth);torso.scale.z=.67;root.add(torso);
 const belt=new T.Mesh(new T.CylinderGeometry(.208,.21,.07,16),leather);belt.scale.z=.7;root.add(belt);
 const reflection=new T.Group();reflection.visible=false;root.add(reflection);
 const reflectedBody=createHorrorCharacter(f,'double');reflectedBody.scale.setScalar(.95);reflectedBody.rotation.y=Math.PI;reflection.add(reflectedBody);
 const legs=[];
 function limb(radius,length){const m=new T.Mesh(new T.CylinderGeometry(radius,radius*.8,length,12,3),cloth);root.add(m);return m;}
 for(const s of [-1,1]){
  const thigh=limb(.108,.42),shin=limb(.083,.39),boot=new T.Group();root.add(boot);const bins=new Map();
  const add=(g,m,x,y,z)=>{g.translate(x,y,z);if(!bins.has(m))bins.set(m,[]);bins.get(m).push(g);};
  add(new T.CapsuleGeometry(.102,.115,5,12).rotateX(Math.PI/2).scale(.83,.58,1),leather,0,.112,-.095);
  add(new T.CylinderGeometry(.085,.078,.22,12),leather,0,.225,.015);
  add(new T.BoxGeometry(.18,.044,.32),rubber,0,.035,-.06);
  for(let i=0;i<5;i++)add(new T.BoxGeometry(.19,.012,.026),rubber,0,.008,-.19+i*.064);
  for(let i=0;i<5;i++)add(new T.BoxGeometry(.096,.008,.01).rotateY((i%2?1:-1)*.2),thread,0,.183+i*.007,-.14+i*.028);
  add(new T.BoxGeometry(.013,.17,.016),thread,0,.23,.095);
  for(const [m,gs]of bins){const mesh=new T.Mesh(mergeGeometries(gs,false),m);boot.add(mesh);gs.forEach(g=>g.dispose());}
  const pocket=new T.Mesh(new T.BoxGeometry(.026,.17,.14),cloth);root.add(pocket);legs.push({s,thigh,shin,boot,pocket});
 }
 root.traverse(o=>{if(o.isMesh){o.receiveShadow=true;/* Keep the player's torch clear of its own body. */o.castShadow=false;}});
 const up=new T.Vector3(0,1,0),dir=new T.Vector3(),center=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let gait=0,amount=0,crouch=0;
 function link(mesh,a,b,length){dir.subVectors(b,a);center.copy(a).add(b).multiplyScalar(.5);mesh.position.copy(center);mesh.scale.y=dir.length()/length;mesh.quaternion.setFromUnitVectors(up,dir.normalize());}
 let bodyTime=0,lastState=null;
 function poseReflection(state,time){
  if(!state)return;root.visible=!!state.active;root.position.set(f.camera.position.x,state.feetY??f.camera.position.y-1.68,f.camera.position.z);root.rotation.y=state.yaw??f.camera.rotation.y;
  const phase=Number.isFinite(state.gaitPhase)?state.gaitPhase:gait;reflectedBody.scale.y=.95*(1-crouch*.33);
  animateCharacter(reflectedBody,time,{moving:state.moving&&state.grounded,running:state.sprinting,distance:phase/4.7,pitch:-Math.max(-.6,Math.min(.6,f.camera.rotation.x||0))});
 }
 return {root,setReflection(value,state=lastState,time=bodyTime){if(value)poseReflection(state,time);reflection.visible=value;for(const child of root.children)if(child!==reflection)child.visible=!value;},reset(){gait=amount=crouch=bodyTime=0;},update(dt,state){
  lastState=state;root.visible=!!state.active;if(!root.visible)return;
  root.position.set(f.camera.position.x,state.feetY??f.camera.position.y-1.68,f.camera.position.z);root.rotation.y=state.yaw??f.camera.rotation.y;
  crouch=T.MathUtils.damp(crouch,state.crouched?1:0,12,dt);amount=T.MathUtils.damp(amount,state.moving&&state.grounded?1:0,10,dt);if(Number.isFinite(state.gaitPhase))gait=state.gaitPhase;else if(state.moving&&state.grounded)gait+=dt*(state.sprinting?11:state.crouched?4.5:7);
  const hip=.89-crouch*.34,chest=1.16-crouch*.44;
  bodyTime+=dt;
  torso.position.set(0,chest,.31);torso.rotation.x=-crouch*.24;belt.position.set(0,hip+.04,.25);cloth.roughness=.93-(state.wetness||0)*.0015;
  for(const l of legs){const swing=Math.sin(gait+(l.s<0?Math.PI:0))*amount,air=state.grounded?0:.11;
   a.set(l.s*.125,hip,.19);b.set(l.s*.135,.48-crouch*.18+air,.01-crouch*.25-swing*.16);c.set(l.s*.14,.13+Math.max(0,swing)*.12+air,-.065+swing*(state.sprinting?.26:.16));
   link(l.thigh,a,b,.42);link(l.shin,b,c,.39);l.boot.position.set(c.x,c.y-.13,c.z);l.boot.rotation.x=-Math.max(0,swing)*.14-air*.6;l.pocket.position.copy(a).lerp(b,.45);l.pocket.position.x+=l.s*.085;
  }
 }};
}
