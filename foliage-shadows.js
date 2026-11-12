import * as T from './vendor/three.module.js';

const materials=new WeakMap();
// Shadow variants use the same vertex deformation and live uniforms as the
// visible foliage. Default Three shadows otherwise render the unbent mesh.
export function foliageShadowMaterials(source){
 if(materials.has(source))return materials.get(source);
 const options={map:source.alphaTest>0?source.map:null,alphaMap:source.alphaMap,alphaTest:source.alphaTest,opacity:source.opacity,side:source.shadowSide??source.side};
 const depth=new T.MeshDepthMaterial({...options,depthPacking:T.RGBADepthPacking}),distance=new T.MeshDistanceMaterial(options);
 // Capture the vertex-authoring hook before world lighting wrappers are bound;
 // depth passes must not acquire later lighting uniforms or shader variants.
 const compile=source.onBeforeCompile,key=source.customProgramCacheKey();
 for(const material of [depth,distance]){
  material.name=source.name+'-wind-shadow';
  material.onBeforeCompile=(shader,renderer)=>compile.call(source,shader,renderer);
  material.customProgramCacheKey=()=> 'foliage-shadow-1:'+key;
 }
 const result={depth,distance};materials.set(source,result);return result;
}
export function attachFoliageShadows(mesh){
 const {depth,distance}=foliageShadowMaterials(mesh.material);mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;
}
