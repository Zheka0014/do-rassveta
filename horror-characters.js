import {prepareSkeletalCharacter,cloneSkeleton,animateSkeletalCharacter} from './skeletal-character.js?v=20261113-forest49';
import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {PlantedGait,solveLeg,supportDrop} from './character-gait.js?v=20261113-forest49';
import {makeSculptMaterials,CHARACTER_PROFILES} from './character-sculpt.js?v=20261113-forest49';
import {buildHangingIdentity,HANGING_IDENTITIES} from './hanging-identities.js?v=20261113-forest49';
import {prepareBasementWoman,animateBasementWoman} from './basement-woman.js?v=20261113-forest49';
export {CHARACTER_PROFILES,createFaceGeometry,faceDepth} from './character-sculpt.js?v=20261113-forest49';
const assets=new WeakMap(),rigs=new WeakMap(),motion=new WeakMap();
const footUp=new T.Vector3(0,1,0),footWorld=new T.Quaternion(),footParent=new T.Quaternion();
function microNormal(cloth=false,size=256){
 const data=new Uint8Array(size*size*4),height=(x,y)=>cloth?Math.sin(x*2.7)*.12+Math.sin(y*2.7)*.12:Math.sin(x*12.9898+y*78.233)*Math.sin(x*4.123-y*9.2)*.14+Math.sin(x*.31+y*.27)*.07;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=height(x+1,y)-height(x-1,y),dy=height(x,y+1)-height(x,y-1),n=new T.Vector3(-dx,-dy,1).normalize(),i=(y*size+x)*4;data.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],i);}
 const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.needsUpdate=true;return t;
}
function resources(f){
 if(assets.has(f))return assets.get(f);
 const r={models:new Map(),pending:[]},loader=new T.TextureLoader(),tasks=[];
 function texture(name){let map;tasks.push(new Promise((resolve,reject)=>{map=loader.load(new URL('./assets/textures/'+name+'?v=20261113-forest49',import.meta.url).href,resolve,undefined,reject);}));map.flipY=false;map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return map;}
 r.materials=makeSculptMaterials({skinAtlas:texture('npc-surface-v35.png'),clothAtlas:texture('npc-cloth-v35.png'),skinNormal:microNormal(),clothNormal:microNormal(true)});
 const named=new Map();for(const value of Object.values(r.materials))for(const mat of Array.isArray(value)?value:[value])named.set(mat.name,mat);
 const gltf=new GLTFLoader();
 tasks.push(gltf.loadAsync(new URL('./assets/characters-v41/basement-woman.glb?v=20261113-forest49',import.meta.url).href).then(asset=>r.models.set('basement-woman',prepareBasementWoman(asset))));
 tasks.push(Promise.all([gltf.loadAsync(new URL('./assets/characters-v36/watcher.glb?v=20261113-forest49',import.meta.url).href),fetch(new URL('./assets/characters-v36/watcher-motion.json?v=20261113-forest49',import.meta.url)).then(response=>{if(!response.ok)throw new Error('Watcher animation download failed');return response.json();})]).then(([asset,data])=>{r.watcher=prepareSkeletalCharacter(asset,data,CHARACTER_PROFILES.watcher.height);}));
 for(const kind of Object.keys(CHARACTER_PROFILES))tasks.push(gltf.loadAsync(new URL('./assets/characters-v35/'+kind+'.glb?v=20261113-forest49',import.meta.url).href).then(asset=>{
  const prototype=asset.scene.children[0],replaced=new Set(),sides=new Map();
  prototype.traverse(o=>{if(!o.isMesh)return;const old=o.material;let mat=named.get(old.name);if(!mat)throw new Error('Unknown character material: '+old.name);if(old.side===T.DoubleSide&&mat.side!==T.DoubleSide){if(!sides.has(mat)){const clone=mat.clone();clone.side=T.DoubleSide;sides.set(mat,clone);}mat=sides.get(mat);}o.material=mat;o.castShadow=o.receiveShadow=true;o.updateMatrix();o.matrixAutoUpdate=false;replaced.add(old);});
  for(const old of replaced){old.map?.dispose();old.dispose();}r.models.set(kind,prototype);
 }));
 r.ready=Promise.all(tasks).then(()=>{for(const [id,p]of HANGING_IDENTITIES.entries())r.models.set('hanging-'+id,buildHangingIdentity(r.models.get(p.base),id,r.materials.cloth[0].normalMap));for(const request of r.pending)hydrate(request.root,request.kind,request.head,r);r.pending.length=0;});
 assets.set(f,r);return r;
}
function hydrate(root,kind,head,r){
 if(kind==='watcher'&&!head&&r.watcher){const clone=cloneSkeleton(r.watcher);root.userData={...clone.userData,...root.userData,modelVersion:36};for(const child of [...clone.children])root.add(child);return;}
 const source=head?r.models.get(kind).getObjectByName('head'):r.models.get(kind),clone=source.clone(true);
 if(head){clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.set(1,1,1);}
 root.userData={...clone.userData,...root.userData};for(const child of [...clone.children])root.add(child);
 root.userData.modelVersion=kind==='basement-woman'?41:35;
}
export function loadCharacterAssets(f){return resources(f).ready;}
function create(f,kind,head){const root=new T.Group();root.name=head?'head':'character-'+kind;root.userData.horrorKind=kind;root.userData.faceKind=kind;const r=resources(f);if(r.models.has(kind)&&(kind!=='watcher'||head||r.watcher))hydrate(root,kind,head,r);else r.pending.push({root,kind,head});return root;}
export function createHorrorCharacter(f,kind='double'){return create(f,kind,false);}
export function createHorrorHead(f,kind='double'){return create(f,kind,true);}
export function createHangingCharacter(f,id){const p=HANGING_IDENTITIES[id];if(!p)throw new Error('Unknown hanging identity '+id);const root=create(f,'hanging-'+id,false);root.userData.horrorKind=root.userData.faceKind=p.base;return root;}
const clamp=T.MathUtils.clamp;

export function poseSeated(root){
 const profile=CHARACTER_PROFILES[root.userData.horrorKind]||CHARACTER_PROFILES.double,drop=profile.hip-profile.shin-.113;
 for(const s of [-1,1]){const leg=root.getObjectByName('leg-'+s),knee=root.getObjectByName('knee-'+s);leg.position.y-=drop;leg.rotation.x=-Math.PI*.5;knee.rotation.x=Math.PI*.5;root.getObjectByName('ankle-'+s).rotation.x=0;root.getObjectByName('arm-'+s).position.y-=drop;root.getObjectByName('arm-'+s).rotation.x=-.22;}
 const neck=root.getObjectByName('neck');if(neck){neck.position.y-=drop;neck.updateMatrix();}
 root.getObjectByName('chest').position.y-=drop;root.getObjectByName('head').position.y-=drop;
}
export function characterMotion(root){
 const {x,z}=root.position,previous=motion.get(root),step=previous?Math.hypot(x-previous.x,z-previous.z):0;
 // Spawns and teleports never advance the stride. Still figures breathe without
 // walking in place; the gait follows the distance actually covered.
 const traveled=step<1?step:0,distance=(previous?.distance||0)+traveled;
 if(traveled>.0001)root.userData.travelHeading=Math.atan2(x-previous.x,z-previous.z);else if(step>=1)delete root.userData.travelHeading;
 motion.set(root,{x,z,distance});return {moving:traveled>.0001,distance};
}
export function animateCharacter(root,t,{moving=false,running=false,freeze=false,distance=null,scan=0,pitch=0,ground=null,state='idle',attack=null,peek=0}={}){
 if(root.userData.identity==='basement-woman')return animateBasementWoman(root,t,{freeze});
 if(root.userData.animationType==='skeletal-v36')return animateSkeletalCharacter(root,t,{moving,running,freeze,distance,scan,pitch,ground,state,attack,peek});
 let rig=rigs.get(root);if(!rig){const head=root.getObjectByName('head'),chest=root.getObjectByName('chest');if(!head||!chest)return;rig={head,chest,baseY:chest.position.y,baseHeadZ:head.rotation.z,baseHeadY:head.position.y,baseChestX:chest.rotation.x,baseChestZ:chest.rotation.z,baseHeadX:head.position.x,gait:new PlantedGait(),legs:[],arms:[]};for(const s of [-1,1]){rig.legs.push({s,leg:root.getObjectByName('leg-'+s),knee:root.getObjectByName('knee-'+s),ankle:root.getObjectByName('ankle-'+s),hipY:root.getObjectByName('leg-'+s)?.position.y});rig.arms.push({s,arm:root.getObjectByName('arm-'+s),baseY:root.getObjectByName('arm-'+s)?.position.y,elbow:root.getObjectByName('elbow-'+s)});}for(const l of rig.legs)l.leg?.rotation.reorder('ZXY');rigs.set(root,rig);}
 const dt=Math.min(.25,Math.max(0,rig.lastTime===undefined?1/60:t-rig.lastTime));rig.lastTime=t;
 const time=freeze?0:t;let phase=distance!==null?distance*4.7:time*(running?7.5:3.5);const targetStride=freeze?0:moving?(running?.42:.23):0;
 const stride=rig.stride=freeze?0:damp(rig.stride||0,targetStride,14,dt);
 const pose=(from,to,rate=22)=>freeze?to:damp(from,to,rate,dt);
 const profile=CHARACTER_PROFILES[root.userData.horrorKind]||CHARACTER_PROFILES.double;
 const reach=freeze?0:attack!==null?Math.sin(Math.PI*clamp(attack,0,1)):state==='warning'?.30:0;
 const hunch=freeze?0:(running?.11:state==='search'||state==='investigate'?.045:0)+reach*.15;
 const planted=ground&&!freeze&&rig.legs.every(l=>l.ankle)?rig.gait.update({x:root.position.x,y:root.position.y,z:root.position.z,yaw:root.rotation.y},distance,dt,{moving,running,stepLength:profile.height>3?1.4:.83,width:profile.height>3?.15:.115,lift:profile.height>3?.18:.105,ground}):null;
 if(planted)phase=rig.gait.phase*Math.PI*2;
 const required=planted?supportDrop(planted,rig.legs.map(l=>({x:l.leg.position.x,y:l.hipY,z:l.leg.position.z})),profile.thigh,profile.shin):0;
 const pelvis=rig.pelvis=planted?Math.max(required,damp(rig.pelvis??required,required,14,dt)):pose(rig.pelvis||0,0); 
 if(!rig.neckChecked){rig.neck=root.getObjectByName('neck');rig.baseNeckY=rig.neck?.position.y;rig.neckChecked=true;}
 for(let i=0;i<rig.legs.length;i++){
  const l=rig.legs[i],swing=Math.sin(phase+(l.s<0?Math.PI:0));l.leg.position.y=l.hipY-pelvis;
  if(planted){const foot=planted[i];
   const angles=solveLeg(foot.x-l.leg.position.x,foot.y-l.leg.position.y,foot.z-l.leg.position.z,profile.thigh,profile.shin);
   // The planned foot path is already smooth. Filtering the solved joint angles
   // again makes a planted sole slide and delays its contact with the floor.
   l.leg.rotation.x=angles.hip;l.leg.rotation.z=angles.lateral;l.knee.rotation.x=angles.knee;
  }else{
   l.leg.rotation.x=pose(l.leg.rotation.x,swing*stride);l.leg.rotation.z=pose(l.leg.rotation.z,0);l.knee.rotation.x=pose(l.knee.rotation.x,Math.max(0,-swing)*stride*1.3);
   if(l.ankle)l.ankle.rotation.set(-l.leg.rotation.x-l.knee.rotation.x,0,-l.leg.rotation.z);
  }
 }
 for(const a of rig.arms){a.arm.position.y=a.baseY-pelvis;const swing=-Math.sin(phase+(a.s<0?Math.PI:0))*stride*(running?.82:.47)-.055;
  a.arm.rotation.x=pose(a.arm.rotation.x,swing*(1-reach)-reach*(a.s<0?1.22:1.04));
  a.arm.rotation.z=pose(a.arm.rotation.z,a.s*(.045+reach*.12));a.elbow.rotation.x=pose(a.elbow.rotation.x,-.10+reach*.40+(running?-.23:0)+Math.sin(time*.83+a.s)*.035);
 }
 rig.chest.position.y=rig.baseY-pelvis+Math.sin(time*1.17)*.005+(stride?Math.sin(phase*2)*.009*Math.min(1,stride/.23):0);
 rig.chest.rotation.x=pose(rig.chest.rotation.x,rig.baseChestX+hunch,12);rig.chest.rotation.y=pose(rig.chest.rotation.y,freeze?0:Math.sin(phase)*stride*.11,12);
 rig.chest.rotation.z=pose(rig.chest.rotation.z,rig.baseChestZ+(freeze?0:Math.cos(phase)*stride*.035),12);
 rig.head.position.y=rig.baseHeadY-pelvis;rig.head.position.x=pose(rig.head.position.x,rig.baseHeadX+(freeze?0:peek),10);
 if(rig.neck){rig.neck.position.y=rig.baseNeckY-pelvis;if(!rig.neck.matrixAutoUpdate)rig.neck.updateMatrix();}
 rig.head.rotation.y=freeze?scan:dampAngle(rig.head.rotation.y,scan,12,dt);rig.head.rotation.x=pose(rig.head.rotation.x,pitch+(freeze?-.06:0)+hunch*.2,12);
 // Stillness is intentional: a head turn comes from perception, not a timer.
 rig.head.rotation.z=pose(rig.head.rotation.z,rig.baseHeadZ,12);
 if(planted){
  root.updateMatrixWorld(true);
  for(let i=0;i<rig.legs.length;i++){
   const ankle=rig.legs[i].ankle;footWorld.setFromAxisAngle(footUp,root.rotation.y+planted[i].yaw);
   ankle.parent.getWorldQuaternion(footParent).invert();ankle.quaternion.copy(footParent.multiply(footWorld));ankle.updateMatrixWorld(true);
  }
 }
}
import {damp,dampAngle} from './smooth-motion.js?v=20261113-forest49';
