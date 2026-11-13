import {mergeRetainedGeometry} from './render-batching.js?v=20261113-forest49';
import {HandMotion} from './hand-motion.js?v=20261113-forest49';
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

function clothNormal(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,a=Math.sin(x*Math.PI*.5)*.2,b=Math.sin(y*Math.PI*.5)*.2;data.set([128+a*127,128+b*127,247,255],i);}
 const tex=new T.DataTexture(data,size,size);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(4,4);tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.needsUpdate=true;return tex;
}

export function buildViewmodel(forest){
 const root=new T.Group();forest.camera.add(root);
 const paint=new T.MeshStandardMaterial({color:0x424a43,metalness:.58,roughness:.48,envMapIntensity:1});
 const metal=new T.MeshStandardMaterial({color:0x747976,metalness:.88,roughness:.3,envMapIntensity:1});
 const rubber=new T.MeshStandardMaterial({color:0x161c19,roughness:.85});
 const fabric=new T.MeshStandardMaterial({color:0x34392b,roughness:.92,normalMap:clothNormal(),normalScale:new T.Vector2(.16,.16)});
 const leather=new T.MeshStandardMaterial({color:0x201d16,roughness:.76});
 const parts=new Map();
 function part(g,mat,p=[0,0,0],r=[0,0,0],s=[1,1,1]){const matrix=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...r)),new T.Vector3(...s));g.applyMatrix4(matrix);if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(g);}
 function cylinder(rt,rb,h,mat,z,y=.035){part(new T.CylinderGeometry(rt,rb,h,32,1),mat,[0,y,z],[Math.PI/2,0,0]);}
 // Reflector, knurled barrel, seals, recessed glass, switch and rear strap.
 cylinder(.05,.046,.24,paint,.0);cylinder(.071,.051,.07,paint,-.148);cylinder(.071,.071,.022,metal,-.19);cylinder(.058,.058,.013,rubber,-.2);
 for(let i=0;i<6;i++)cylinder(.051,.051,.005,rubber,.055+i*.018);
 for(let i=0;i<3;i++)cylinder(.058+i*.004,.058+i*.004,.004,metal,-.125-i*.017);
 part(new T.SphereGeometry(.054,24,12),metal,[0,.035,-.203],[0,0,0],[1,1,.25]);
 part(new T.CircleGeometry(.05,32),new T.MeshStandardMaterial({color:0x697e75,metalness:.4,roughness:.12,transparent:true,opacity:.7}),[0,.035,-.217],[0,Math.PI,0]);
 part(new T.BoxGeometry(.028,.008,.034),rubber,[0,.089,-.015]);
 for(let i=0;i<8;i++)part(new T.BoxGeometry(.008,.001,.002),metal,[Math.sin(i*2.7)*.028,.083,.065-i*.027],[0,i*.7,0]);
 // Closed fingers wrap around the barrel; palm, thumb, seams and cuff remain
 // distinct geometry, with a sleeve continuing beyond the bottom of frame.
 part(new T.SphereGeometry(.065,20,14),fabric,[.0,-.049,.045],[0,0,0],[1.32,.82,1.55]);
 for(let i=0;i<4;i++){
  const z=-.035+i*.033;
  part(new T.CapsuleGeometry(.019,.056,5,10),fabric,[-.049,-.015,z],[0,0,-.55]);
  part(new T.CapsuleGeometry(.018,.035,5,10),leather,[-.051,.035,z],[0,0,.86]);
  part(new T.SphereGeometry(.019,12,8),fabric,[-.041,.056,z],[0,0,0],[1,.72,1]);
  part(new T.CapsuleGeometry(.002,.04,2,5),rubber,[-.064,-.024,z],[0,0,-.55]);
 }
 part(new T.CapsuleGeometry(.022,.065,5,12),fabric,[.056,-.018,.067],[.4,0,.73]);
 part(new T.CapsuleGeometry(.019,.027,5,10),leather,[.033,.013,.017],[.65,.28,1.0]);
 part(new T.CylinderGeometry(.071,.082,.095,24),rubber,[.014,-.134,.09],[.42,0,0],[1,.9,1]);
 part(new T.CylinderGeometry(.079,.1,.23,24,3),fabric,[.015,-.259,.145],[.38,0,0]);
 for(let i=0;i<7;i++)part(new T.BoxGeometry(.022,.002,.0018),leather,[-.055+i*.018,-.075,.12],[0,0,.05]);
 for(const [mat,list]of parts){const mesh=new T.Mesh(mergeGeometries(list,false),mat);mesh.frustumCulled=false;root.add(mesh);list.forEach(g=>g.dispose());}
 const crank=new T.Group();crank.position.set(.065,.025,.06);root.add(crank);
 const handle=new T.Mesh(new T.BoxGeometry(.013,.074,.013),metal);handle.position.y=-.034;crank.add(handle);
 const knob=new T.Mesh(new T.CylinderGeometry(.012,.012,.025,12),rubber);knob.rotation.z=Math.PI/2;knob.position.set(.013,-.069,0);crank.add(knob);
 root.position.set(.29,-.29,-.43);root.rotation.set(-.12,-.1,-.16);root.visible=false;forest.hand=root;

 // The action rigs share the torch's materials and keep their transforms local
 // to the view camera. Static fingers, camera controls and tool heads are batched.
 function rig(){const g=new T.Group();forest.camera.add(g);g.visible=false;return g;}
 function builder(parent){const bins=new Map();return {add(g,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1)));if(!bins.has(m))bins.set(m,[]);bins.get(m).push(g);},box(w,h,d,m,x=0,y=0,z=0){this.add(new T.BoxGeometry(w,h,d),m,x,y,z);},done(){for(const [m,gs]of bins){const o=new T.Mesh(mergeRetainedGeometry(gs),m);o.frustumCulled=false;parent.add(o);gs.forEach(g=>g.dispose());}}};}
 function glove(parent,x,y,z,turn=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.z=turn;parent.add(g);const b=builder(g);b.add(new T.SphereGeometry(.052,16,10),fabric,0,0,0);b.add(new T.CylinderGeometry(.054,.077,.22,16),fabric,0,-.14,.025,.27);b.add(new T.CylinderGeometry(.057,.057,.05,16),rubber,0,-.055,0);for(let i=0;i<4;i++)b.add(new T.CapsuleGeometry(.011,.048,4,8),leather,-.032+i*.022,.044,-.006,0,0,.12);b.add(new T.CapsuleGeometry(.013,.04,4,8),fabric,.053,.012,-.003,0,0,-.55);b.done();return g;}
 const photo=rig(),pb=builder(photo);
 pb.box(.24,.135,.078,rubber);pb.box(.243,.023,.082,metal,0,.073,0);pb.box(.05,.09,.082,paint,.105,-.014,0);pb.box(.065,.04,.04,metal,-.044,.1,0);pb.box(.047,.029,.006,leather,-.044,.1,.025);pb.box(.15,.085,.006,leather,-.015,-.005,.043);
 for(let i=0;i<3;i++)pb.add(new T.CylinderGeometry(.024,.024,.016,20),metal,-.078+i*.077,.094,0);pb.add(new T.CylinderGeometry(.051,.041,.073,24),paint,0,0,-.071,Math.PI/2);pb.add(new T.CylinderGeometry(.052,.052,.005,24),metal,0,0,-.11,Math.PI/2);pb.done();glove(photo,-.155,-.074,.026,.2);glove(photo,.155,-.074,.026,-.2);
 const healing=rig(),bandageMat=new T.MeshStandardMaterial({color:0xb5ad92,roughness:1,normalMap:fabric.normalMap,normalScale:new T.Vector2(.10,.1)}),left=glove(healing,-.05,-.01,0,-1.18),right=glove(healing,.15,-.06,.045,.4),hb=builder(left);for(let i=0;i<7;i++)hb.add(new T.TorusGeometry(.059,.007,8,24),bandageMat,0,-.083+i*.009,.003,Math.PI/2);hb.done();const roll=new T.Mesh(new T.TorusGeometry(.035,.016,10,20),bandageMat);roll.rotation.y=Math.PI/2;roll.position.set(-.025,.06,-.035);right.add(roll);
 const hammerRig=rig(),hand=glove(hammerRig,.11,-.015,0,-.15),hammer=new T.Group();hammer.position.set(0,.09,-.02);hand.add(hammer);const hm=builder(hammer);hm.add(new T.CylinderGeometry(.013,.020,.23,12),leather,0,.07,0);hm.box(.13,.035,.033,metal,0,.195,0);hm.box(.034,.047,.047,metal,-.069,.195,0);hm.done();glove(hammerRig,-.18,-.02,-.025,1.0);
 const winding=rig(),turning=glove(winding,-.14,.025,0,-.3);glove(winding,.14,-.04,0,.3);
 const pry=rig(),pryHand=glove(pry,.12,-.025,0,-.2),pr=builder(pryHand);pr.add(new T.CylinderGeometry(.015,.015,.46,12),metal,0,.15,-.01,0,0,.14);pr.add(new T.TorusGeometry(.06,.015,8,16,Math.PI*.8),metal,-.015,.37,-.01,0,0,-.5);pr.done();glove(pry,-.16,-.04,0,.7);
 const climbing=rig(),cl=builder(climbing);cl.add(new T.CylinderGeometry(.013,.013,.64,12),leather,0,.08,-.025);cl.done();const climbL=glove(climbing,-.05,.13,.025,.5),climbR=glove(climbing,.055,-.07,.025,-.5);
 const trapRig=rig(),tr=builder(trapRig);tr.add(new T.TorusGeometry(.13,.012,7,24),metal,0,.045,-.045,Math.PI/2);for(const x of [-.11,.11])for(let i=0;i<7;i++)tr.add(new T.ConeGeometry(.009,.06,4),metal,x,.07,-.15+i*.035);tr.box(.18,.015,.07,metal,0,.02,-.045);tr.done();glove(trapRig,-.16,-.025,.02,.3);glove(trapRig,.16,-.025,.02,-.3);
 const throwing=rig(),throwHand=glove(throwing,.08,.0,0,-.3),stone=new T.Mesh(new T.DodecahedronGeometry(.045,1),rubber),bottle=new T.Mesh(new T.CylinderGeometry(.027,.043,.17,16),paint);stone.position.set(.0,.07,-.035);bottle.position.set(0,.10,-.03);throwHand.add(stone,bottle);
 const toyRig=rig(),toyHands=glove(toyRig,-.12,-.025,0,.35);glove(toyRig,.12,-.025,0,-.35);const toyBody=new T.Mesh(new T.SphereGeometry(.055,16,10),metal);toyBody.scale.set(1,.7,1.3);toyBody.position.set(0,.02,-.015);toyRig.add(toyBody);const toyKey=new T.Mesh(new T.BoxGeometry(.045,.009,.065),metal);toyKey.position.set(.067,.023,-.02);toyRig.add(toyKey);
 const reaching=rig(),reachHand=glove(reaching,.15,-.10,0,-.28),held=new T.Mesh(new T.BoxGeometry(.11,.12,.08),paint);held.position.set(0,.06,-.06);reachHand.add(held);
 const rigs=[photo,healing,hammerRig,winding,pry,climbing,trapRig,throwing,toyRig,reaching],handMotion=new HandMotion();let lowered=0,captureHidden=false,pulse=null;

 return {reset(){pulse=null;lowered=0;handMotion.reset();},gesture(name='reach'){pulse={name,age:0};},setCaptureHidden(value){captureHidden=value;for(const g of [root,...rigs])g.visible=false;},update(dt,t,state){
  if(pulse){if(state.active)pulse.age+=dt;if(pulse.age>=.65)pulse=null;}
  const motion=state.hand||pulse&&{name:pulse.name,age:pulse.age,progress:pulse.age/.65},name=motion?.name||null,a=motion?.age||0,progress=motion?.progress||0;
  rigs.forEach(g=>g.visible=false);root.visible=state.active===true&&!captureHidden;if(state.active!==true){handMotion.reset();return;}if(captureHidden)return;
  const camera=forest.camera,motionEnabled=state.bobbing!==false,bob=motionEnabled?(state.bob||0):0;
  const lag=handMotion.advance(dt,{yaw:camera.rotation.y,pitch:camera.rotation.x,x:camera.position.x,y:camera.position.y,z:camera.position.z,bobbing:motionEnabled});
  fabric.roughness=.92-(state.wetness||0)/100*.18;
  const actionRig=['reach','pickup','open-door'].includes(name)?reaching:name==='photo'?photo:name==='heal'?healing:['barricade','unbarrier'].includes(name)?hammerRig:name==='well'?winding:name==='crowbar'?pry:['rope','climb','descend','rescue'].includes(name)?climbing:name==='trap'?trapRig:name?.startsWith('throw-')?throwing:name==='wind-toy'?toyRig:null;
  if(actionRig){root.visible=false;actionRig.visible=true;const rise=name==='well'?1:Math.sin(Math.PI*Math.min(1,progress));actionRig.position.set(0,-.18+rise*.12+bob*.2,-.43);actionRig.rotation.set(0,0,0);if(name?.startsWith('throw-')){throwHand.rotation.x=.9-progress*2.6;stone.visible=name==='throw-stone'&&a<.32;bottle.visible=name==='throw-bottle'&&a<.32;actionRig.position.z=-.42-progress*.17;}if(['reach','pickup','open-door'].includes(name)){const extension=Math.sin(Math.PI*progress);reachHand.position.z=-extension*.16;reachHand.position.y=-.1+extension*.10;reachHand.rotation.x=-extension*.5;held.visible=name==='pickup'&&progress>.42;actionRig.position.x=.08;}if(name==='wind-toy'){toyKey.rotation.x=a*13;toyHands.rotation.z=.35+Math.sin(a*13)*.07;}if(name==='crowbar')pryHand.rotation.x=Math.sin(a*5)*.32;if(['rope','climb','descend','rescue'].includes(name)){climbL.position.y=.12+Math.sin(a*5)*.04;climbR.position.y=-.06-Math.sin(a*5)*.04;}if(name==='trap')actionRig.position.y-=progress*.06;if(name==='heal'){right.position.x=.12+Math.sin(a*11)*.024;right.position.y=-.015+Math.cos(a*11)*.035;}if(name==='barricade'||name==='unbarrier'){hand.rotation.x=-.2+Math.sin(a*15)*.52;actionRig.position.y-=.05;}if(name==='well'){turning.position.x=-.14+Math.cos(a*5)*.055;turning.position.y=-.02+Math.sin(a*5)*.055;}}

  // Tool actions retain their authored progress, reach and contact animation;
  // the whole rig receives only a reduced share of the cosmetic turn lag.
  if(actionRig){actionRig.position.x-=lag.yaw*.022;actionRig.position.y+=lag.pitch*.022;actionRig.rotation.x+=lag.pitch*.32;actionRig.rotation.y+=lag.yaw*.32;}
  const horizontal=Math.min(.29,Math.tan(T.MathUtils.degToRad(forest.camera.fov*.5))*.43*forest.camera.aspect*.68);
  lowered=T.MathUtils.damp(lowered,state.flash?0:.1,6,dt);root.position.set(horizontal-lag.yaw*.065,-.23+bob*.65+(motionEnabled?Math.sin(t*1.8)*.002:0)-lowered+lag.pitch*.065,-.43);
  root.rotation.z=-.16+(state.charging?Math.sin(t*12)*.035:0);root.rotation.x=-.12+(motionEnabled?Math.sin(t*1.3)*.008:0)+lag.pitch;root.rotation.y=-.1+lag.yaw;
  crank.rotation.x=state.charging?t*10:0;
  // Emit from the front of the lens, so the beam cannot illuminate its own
  // housing from behind or turn the nearby glove into a white hotspot.
  root.updateMatrix();forest.flash.position.set(0,.035,-.225).applyMatrix4(root.matrix);
 }};
}
