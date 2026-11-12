import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

// Merge triangle streams without expanding indexed input or welding seams.
// Source buffers remain owned by the caller, including unindexed inputs.
export function mergeRetainedGeometry(parts){
 if(!parts.length)return null;
 const indexed=parts.some(g=>g.index),temporary=[];
 const compatible=parts.map(g=>{
  if(!indexed||g.index)return g;
  const copy=new T.BufferGeometry();
  for(const [name,attribute]of Object.entries(g.attributes))copy.setAttribute(name,attribute);
  copy.morphAttributes=g.morphAttributes;copy.morphTargetsRelative=g.morphTargetsRelative;
  const count=g.attributes.position.count,indices=count>65535?new Uint32Array(count):new Uint16Array(count);
  for(let i=0;i<count;i++)indices[i]=i;
  copy.setIndex(new T.BufferAttribute(indices,1));temporary.push(copy);return copy;
 });
 const result=mergeGeometries(compatible,false);temporary.forEach(g=>g.dispose());
 if(result)result.userData.retainedBatch=true;
 return result;
}

// Keep the number of light shader variants stable. Three already computes
// exact zero attenuation outside a local light's range; skip its BRDF there.
export function enableLocalLightCulling(){
 let pars=T.ShaderChunk.lights_pars_begin;
 for(const kind of ['Point','Spot']){
  const name=kind.toLowerCase()+'Light',marker=`forest-${name}-range-cull`;
  const start=pars.indexOf(`void get${kind}LightInfo`),end=pars.indexOf('#endif',start);
  if(start<0||end<0||pars.includes(marker))continue;
  const vector=`vec3 lVector = ${name}.position - geometryPosition;`;
  // Preserve Three's finite-range attenuation exactly. Distant and unlit
  // lights need neither normalization, square root, nor distance falloff.
  const early=`${vector}
  /* ${marker} */
  float distanceSquared = dot( lVector, lVector );
  if ( ${name}.color == vec3( 0.0 ) || ( ${name}.distance > 0.0 && distanceSquared >= ${name}.distance * ${name}.distance ) ) {
   light.direction = vec3( 0.0 ); light.color = vec3( 0.0 ); light.visible = false; return;
  }`;
  pars=pars.slice(0,start)+pars.slice(start,end).replace(vector,early)+pars.slice(end);
 }
 T.ShaderChunk.lights_pars_begin=pars;
 const chunk=T.ShaderChunk.lights_fragment_begin;
 const boundary=chunk.indexOf('#if ( NUM_DIR_LIGHTS > 0 )');
 if(boundary<0||chunk.includes('forest-local-light-cull'))return;
 const call='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
 let local=chunk.slice(0,boundary).replaceAll(call,'/* forest-local-light-cull */ if ( directLight.visible ) { '+call+' }');
 local=local.replace(
  'spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );\n\t\t\tdirectLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;',
  // Explicit gradients preserve the cookie mip level at cone/range edges,
  // where neighbouring fragments may take different sides of this branch.
  '{ vec2 forestSpotDx = dFdx( spotLightCoord.xy );\n\t\t\tvec2 forestSpotDy = dFdy( spotLightCoord.xy );\n\t\t\tif ( directLight.visible && inSpotLightMap ) {\n\t\t\t\tspotColor = textureGrad( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy, forestSpotDx, forestSpotDy );\n\t\t\t\tdirectLight.color *= spotColor.rgb;\n\t\t\t} }'
 );
 T.ShaderChunk.lights_fragment_begin=local+chunk.slice(boundary);
}

// Only call on models whose mesh transforms are fixed. Animated parent groups
// stay intact, including doors, knees, crate lids and independently turned heads.
// Transparent surfaces keep separate bounds and sorting; named meshes stay
// available to animation and interaction code by default.
export function batchStaticMeshes(root,{exclude=new Set(),preserveNamed=true}={}){
 let saved=0;
 function visit(parent){
  if(exclude.has(parent))return;
  for(const child of [...parent.children])if(child.isGroup)visit(child);
  const bins=new Map();
  for(const mesh of parent.children){
   if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.children.length||exclude.has(mesh)||preserveNamed&&mesh.name)continue;
   const m=mesh.material,g=mesh.geometry;
   if(Array.isArray(m)||m.transparent||g.morphAttributes.position||g.drawRange.start!==0||g.drawRange.count!==Infinity)continue;
   if(mesh.matrixAutoUpdate)mesh.updateMatrix();
   // Mirroring also changes face winding; retain Three's original draw for it.
   if(mesh.matrix.determinant()<0)continue;
   const attributes=Object.keys(g.attributes).sort().map(k=>k+':'+g.attributes[k].array.constructor.name+':'+g.attributes[k].itemSize+':'+g.attributes[k].normalized).join('|');
   const key=[m.uuid,mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,mesh.renderOrder,mesh.visible,attributes].join(';');
   if(!bins.has(key))bins.set(key,[]);bins.get(key).push(mesh);
  }
  for(const meshes of bins.values()){
   if(meshes.length<2)continue;
   // Retain the source indices, including UV and hard-normal splits. Expanding
   // every triangle duplicated most vertices and defeated the GPU vertex cache.
   // Mixed batches need a linear index only for the non-indexed inputs.
   const parts=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrix));
   const geometry=mergeRetainedGeometry(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const source=meshes[0],merged=new T.Mesh(geometry,source.material);
   merged.castShadow=source.castShadow;merged.receiveShadow=source.receiveShadow;merged.layers.mask=source.layers.mask;merged.renderOrder=source.renderOrder;merged.visible=source.visible;
   merged.updateMatrix();merged.matrixAutoUpdate=false;parent.add(merged);meshes.forEach(mesh=>parent.remove(mesh));saved+=meshes.length-1;
  }
 }
 visit(root);return saved;
}
