import {encounterReserved} from './encounters.js?v=20261113-forest49';
import * as T from './vendor/three.module.js';
import {attachFoliageShadows} from './foliage-shadows.js?v=20261113-forest49';
import {cemeteryReserved,horrorPropReserved} from './horror-director.js?v=20261113-forest49';
import {loadForestAsset} from './assets.js?v=20261113-forest49';
import {frontToBack} from './instance-order.js?v=20261113-forest49';

// All three photographic saplings share textures across both geometry levels.
export async function buildSaplings(forest,heightAt){
 const [full,middle]=await Promise.all([loadForestAsset('./assets/saplings.glb'),loadForestAsset('./assets/saplings-mid-v32.glb')]);
 const materials=new Map(),variants=[];
 for(const prototype of full.scene.children){
  prototype.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(prototype),center=bounds.getCenter(new T.Vector3()),height=bounds.max.y-bounds.min.y;
  const extract=node=>{node.updateMatrixWorld(true);const sources=[];node.traverse(o=>{if(o.isMesh){
   const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-bounds.min.y,-center.z);geo.scale(1/height,1/height,1/height);
   let material=materials.get(o.material.name);
   if(!material){
    const original=o.material,leaf=original.alphaTest>0||original.transparent;
    material=new T.MeshStandardMaterial({name:original.name,color:original.color,map:original.map,normalMap:original.normalMap,roughnessMap:original.roughnessMap,roughness:.92,metalness:0,alphaTest:leaf?.38:0,side:leaf?T.DoubleSide:T.FrontSide,shadowSide:T.FrontSide,envMapIntensity:.2});
    material.color.multiplyScalar(.9);if(material.map)material.map.anisotropy=4;
    material.onBeforeCompile=shader=>{
     shader.uniforms.saplingWind=forest.treeWind;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 saplingWind;').replace('#include <begin_vertex>',`#include <begin_vertex>
      float tip=clamp(position.y,0.,1.);vec3 origin=(instanceMatrix*vec4(0,0,0,1)).xyz;
      transformed.x+=tip*tip*saplingWind.x*(.35+fract(origin.x*.37+origin.z*.21));
      transformed.z+=tip*tip*saplingWind.y*.4;`);
    };
    material.customProgramCacheKey=()=> 'sapling-wind-1';materials.set(original.name,material);
   }
   sources.push({geo,material});
  }});return sources;};
  const close=extract(prototype),mid=extract(middle.scene.children.find(n=>n.name===prototype.name));
  const normalized=bounds.clone();normalized.min.sub(new T.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(1/height);normalized.max.sub(new T.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(1/height);
  variants.push({sources:[close,mid],bounds:normalized,batches:[[],[]]});
 }
 const rng=(()=>{let s=7811;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();
 const points=[[-5.4,9,3.9],[5.6,5.1,3.2],[-5.8,-4,3.5],[5.8,-5.2,4.4],[-6.2,-12,4.7],[5.3,-19,3.8],[-4.6,19,3.4],[4.4,17,2.8],[-10,2,4.2],[9,11,3.7],[-7,-24,4.1],[8,-28,3.6]];
 for(let i=0;i<96;i++){
  const cluster=Math.floor(i/4),angle=cluster*2.399,radius=6+Math.sqrt(cluster/24)*30;
  const x=Math.cos(angle)*radius+(rng()-.5)*6,z=Math.sin(angle)*radius+(rng()-.5)*6;
  if(cemeteryReserved(x,z,1.5)||horrorPropReserved(x,z)||encounterReserved(x,z)||Math.abs(x-(Math.sin(z*.045)*2-2))<2.2||Math.abs(x)<5&&z>-21&&z<-8||Math.hypot(x,z)<4||Math.hypot(x+30,z+23)<4||Math.hypot(x-30,z-32)<4)continue;
  points.push([x,z,1.7+rng()*3.5]);
 }
 const dummy=new T.Object3D();forest.saplingRecords=[];forest.saplingVariants=variants;
 points.forEach(([x,z,height],i)=>{
  if(cemeteryReserved(x,z,1.5)||horrorPropReserved(x,z)||encounterReserved(x,z))return;
  const variant=i%variants.length,width=.86+rng()*.3;
  dummy.position.set(x,heightAt(x,z)-.025,z);dummy.rotation.set((rng()-.5)*.07,rng()*Math.PI*2,(rng()-.5)*.07);dummy.scale.set(height*width,height,height*width);dummy.updateMatrix();
  forest.saplingRecords.push({x,z,matrix:dummy.matrix.clone(),bounds:variants[variant].bounds.clone().applyMatrix4(dummy.matrix).expandByScalar(.18),variant,lod:1});
  forest.colliders.push({x,z,r:.13});
 });
 variants.forEach(v=>v.sources.forEach((sources,lod)=>sources.forEach(({geo,material})=>{
  const batch=new T.InstancedMesh(geo,material,points.length);batch.updateMatrix();batch.matrixAutoUpdate=false;batch.count=0;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.castShadow=lod===0;batch.receiveShadow=true;batch.frustumCulled=false;forest.scene.add(batch);v.batches[lod].push(batch);
  if(batch.castShadow)attachFoliageShadows(batch);
 })));
 forest.saplingCullPosition=new T.Vector3(999,999,999);forest.saplingCullRotation=new T.Quaternion();forest.saplingCullQuality='';
 updateSaplings(forest,true);
}

export function updateSaplings(forest,all=false){
 if(!forest.saplingRecords)return;
 const position=forest.camera.position,rotation=forest.camera.quaternion;
 if(!all&&forest.saplingCullQuality===forest.quality&&position.distanceToSquared(forest.saplingCullPosition)<.0004&&rotation.angleTo(forest.saplingCullRotation)<.002)return;
 forest.camera.updateMatrixWorld();const frustum=forest.treeFrustum??new T.Frustum();frustum.setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(forest.camera.projectionMatrix,forest.camera.matrixWorldInverse));
 const counts=forest.saplingVariants.map(()=>[0,0]),range=forest.quality==='ultra'?60:forest.quality==='high'?45:27;
 for(const p of forest.instanceDepthOrder===false?forest.saplingRecords:frontToBack(forest.saplingRecords,forest.camera)){
  const distance=Math.hypot(position.x-p.x,position.z-p.z);
  if(!all&&(distance>range||!frustum.intersectsBox(p.bounds)))continue;
  const lod=forest.quality!=='low'&&distance<(p.lod===0?14:12)*(forest.quality==='ultra'?1.4:1)?0:1,index=counts[p.variant][lod]++;p.lod=lod;
  forest.saplingVariants[p.variant].batches[lod].forEach(batch=>batch.setMatrixAt(index,p.matrix));
 }
 forest.saplingVariants.forEach((v,n)=>v.batches.forEach((batches,lod)=>batches.forEach(batch=>{
  batch.count=counts[n][lod];batch.visible=batch.count>0;batch.instanceMatrix.clearUpdateRanges();if(batch.count){batch.instanceMatrix.addUpdateRange(0,batch.count*16);batch.instanceMatrix.needsUpdate=true;}
 })));
 forest.visibleSaplingCounts=counts.reduce((total,n)=>[total[0]+n[0],total[1]+n[1]],[0,0]);
 forest.saplingCullPosition.copy(position);forest.saplingCullRotation.copy(rotation);forest.saplingCullQuality=forest.quality;
 if(all)forest.saplingCullPosition.set(999,999,999);
}
