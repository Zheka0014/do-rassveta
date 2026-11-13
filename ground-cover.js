import {loadPropLods,attachPropLods} from './prop-lod.js?v=20261113-forest49';
import {encounterReserved} from './encounters.js?v=20261113-forest49';
import * as T from './vendor/three.module.js';
import {initializePlantCulling} from './plant-culling.js?v=20261113-forest49';
import {cemeteryReserved,horrorPropReserved} from './horror-director.js?v=20261113-forest49';
import {loadForestAsset} from './assets.js?v=20261113-forest49';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

// One stream per asset: with a shared generator the layout depended on which
// download finished first, so rocks and dead trunks moved between page loads.
function stream(seed){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export async function buildGroundCover(forest,heightAt){
 const dummy=new T.Object3D();forest.coverChunks=[];forest.plantWind={value:0};initializePlantCulling(forest);
 const solidLods=await (forest.propLodData??=loadPropLods());
 const specs=[['grass_medium_01',117,.25,.58],['fern_02',260,.4,.95],['dead_tree_trunk',24,2.4,4.8],['rock_moss_set_01',36,.6,1.7]];
 await Promise.all(specs.map(async([name,count,min,max],order)=>{
  const solid=name==='dead_tree_trunk'||name==='rock_moss_set_01',rand=stream(7919+order*104729);
  const asset=await loadForestAsset(name==='grass_medium_01'?'./assets/grass.glb':name==='dead_tree_trunk'?'./assets/debris.glb':name==='rock_moss_set_01'?'./assets/rocks.glb':'./assets/'+name+'/model.gltf');asset.scene.updateMatrixWorld(true);
  let sources=[];asset.scene.traverse(o=>{if(o.isMesh){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.computeBoundingBox();const b=geo.boundingBox,c=b.getCenter(new T.Vector3());geo.translate(-c.x,-b.min.y,-c.z);const size=b.getSize(new T.Vector3()),scale=1/Math.max(.01,solid?Math.max(size.x,size.y,size.z):Math.max(size.y,Math.max(size.x,size.z)*.65));geo.scale(scale,scale,scale);sources.push({geo,original:o.material});}});
  // Small mixed patches preserve plant count with fewer draw calls.
  if(!solid){
   const sets=name==='grass_medium_01'?[[0,3,8],[1,6,13],[2,5,10],[4,9,12]]:[[0,1],[2,3]];
   const patches=sets.map(indices=>{
    const parts=indices.map((n,i)=>sources[n].geo.clone().rotateY(i*2.4).translate((i-(indices.length-1)/2)*.63,0,(i%2)*.33-.16));
    const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());return {geo,original:sources[indices[0]].original};
   });
   if(patches.every(p=>p.geo)){sources.forEach(p=>p.geo.dispose());sources=patches;}else patches.forEach(p=>p.geo?.dispose());
  }
  for(const source of sources){const original=source.original,mat=new T.MeshStandardMaterial({name:original.name,color:original.color,map:original.map,normalMap:original.normalMap,roughnessMap:original.roughnessMap,alphaTest:Math.max(original.alphaTest||0,original.transparent?.35:0),side:T.DoubleSide,roughness:.92,metalness:0,envMapIntensity:.25});
    mat.color.multiplyScalar(.86);
    if(!solid){
     mat.onBeforeCompile=shader=>{
      shader.uniforms.plantWind=forest.plantWind;shader.uniforms.coverDistance=forest.coverDistance;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float plantWind;varying vec3 vCoverWorld;').replace('#include <begin_vertex>',`#include <begin_vertex>\nvec3 center=(instanceMatrix*vec4(0,0,0,1)).xyz;float tip=max(position.y,0.);transformed.x+=sin(plantWind*1.3+center.x*.41+center.z*.2)*tip*tip*.026;`).replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCoverWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float coverDistance;varying vec3 vCoverWorld;').replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nfloat coverFade=1.-smoothstep(coverDistance-4.,coverDistance,distance(cameraPosition.xz,vCoverWorld.xz));float stipple=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(stipple>coverFade)discard;');
     };
     mat.customProgramCacheKey=()=> 'forest-understory-wind-2';
    }
  source.mat=mat;}
  const positions=[];
  for(let i=0;i<count;i++){
   let x,z;
   do{x=(rand()-.5)*70;z=(rand()-.5)*76;}while(cemeteryReserved(x,z,1.6)||horrorPropReserved(x,z)||encounterReserved(x,z)||(Math.abs(x)<4&&z<-8&&z>-20)||Math.hypot(x,z)<(solid?4:2.2)||Math.abs(x-(Math.sin(z*.045)*2-2))<(solid?3:1.65)||Math.hypot(x-1.4,z-4.3)<1.4||Math.hypot(x+30,z+23)<3||Math.hypot(x-30,z-32)<3);
   if(i<60&&!solid){z=28-i*.82+rand()*.7;x=Math.sin(z*.045)*2-2+(i%2?1:-1)*(2.0+rand()*2.3);if(Math.abs(x)<4&&z<-8&&z>-20)x=Math.sign(x||1)*(4.8+rand());}
   if(cemeteryReserved(x,z,.7)||horrorPropReserved(x,z)||encounterReserved(x,z))continue;
   positions.push({x,z,scale:min+rand()*(max-min),angle:rand()*6.28,variant:i%sources.length});
  }
  if(!solid){
   for(let n=0;n<sources.length;n++){
    const points=positions.filter(p=>p.variant===n);if(!points.length)continue;
    const {geo,mat}=sources[n],mesh=new T.InstancedMesh(geo,mat,points.length);geo.computeBoundingBox();
    const records=points.map(p=>{dummy.position.set(p.x,heightAt(p.x,p.z)-.015,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();const matrix=dummy.matrix.clone(),bounds=geo.boundingBox.clone().applyMatrix4(matrix).expandByScalar(.10),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());return {matrix,bounds,center,radius:Math.hypot(size.x,size.z)*.5};});
    mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.updateMatrix();mesh.matrixAutoUpdate=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);forest.scene.add(mesh);forest.plantBatches.push({mesh,records});
   }
   return;
  }
  const chunks=new Map();for(const p of positions){const key=Math.floor(p.x/10)+','+Math.floor(p.z/10);if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
  for(const [key,points]of chunks){
   const [cx,cz]=key.split(',').map(Number),group=new T.Group();forest.scene.add(group);forest.coverChunks.push({group,x:cx*10+5,z:cz*10+5,solid});
   for(let n=0;n<sources.length;n++){
    const subset=points.filter(p=>p.variant===n);if(!subset.length)continue;
    const {geo,mat}=sources[n];
    const inst=new T.InstancedMesh(geo,mat,subset.length);
    subset.forEach((p,i)=>{dummy.position.set(p.x,heightAt(p.x,p.z)-.015,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});
    inst.updateMatrix();inst.matrixAutoUpdate=false;inst.receiveShadow=true;inst.castShadow=solid;inst.computeBoundingSphere();group.add(inst);attachPropLods(inst,solidLods,forest.propLods??=[]);
   }
  }
  if(solid)positions.forEach(p=>{
   const geo=sources[p.variant].geo;geo.computeBoundingBox();const size=geo.boundingBox.getSize(new T.Vector3());
   const alongX=size.x>=size.z,length=Math.max(size.x,size.z)*p.scale,width=Math.min(size.x,size.z)*p.scale;
   const radius=Math.max(.055,width*.46),half=Math.max(0,length*.5-radius),dx=(alongX?Math.cos(p.angle):Math.sin(p.angle))*half,dz=(alongX?-Math.sin(p.angle):Math.cos(p.angle))*half;
   forest.colliders.push({x:p.x,z:p.z,ax:p.x-dx,az:p.z-dz,bx:p.x+dx,bz:p.z+dz,r:radius,top:heightAt(p.x,p.z)-.015+size.y*p.scale});
  });
 }));
}
