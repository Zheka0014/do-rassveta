import * as T from './vendor/three.module.js';
const hash=a=>{let h=2166136261;for(const n of a)h=Math.imul(h^n,16777619);return h>>>0;};
export async function loadPropLods(){
 const [meta,bytes]=await Promise.all([
  fetch('./assets/prop-lods-v42.json').then(r=>{if(!r.ok)throw Error('Prop LOD metadata '+r.status);return r.json();}),
  fetch('./assets/prop-lods-v42.bin').then(r=>{if(!r.ok)throw Error('Prop LOD indices '+r.status);return r.arrayBuffer();})
 ]);
 return {records:meta.records,bytes,cache:new WeakMap()};
}
export function attachPropLods(root,data,targets){
 root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const g=mesh.geometry,record=data.records.find(r=>r.material===mesh.material.name&&r.vertices===g.attributes.position.count&&r.indices===g.index?.count);
  if(!record)return;
  let levels=data.cache.get(g);
  if(!levels){
   // Fail closed if an asset was re-exported with another vertex/index order.
   if(hash(g.index.array)!==record.hash)return;
   g.computeBoundingSphere();levels=[{geometry:g,error:0}];
   for(const level of record.levels){
    const indices=new Uint32Array(data.bytes,level.offset,level.count);
    const geometry=new T.BufferGeometry();for(const [key,value]of Object.entries(g.attributes))geometry.setAttribute(key,value);
    geometry.setIndex(new T.BufferAttribute(indices,1));geometry.boundingSphere=g.boundingSphere.clone();geometry.boundingBox=g.boundingBox?.clone()??null;
    levels.push({geometry,error:level.error});
   }
   data.cache.set(g,levels);
  }
  targets.push({mesh,levels,current:0,center:new T.Vector3(),scale:1,radius:0,placed:false});
 });
}
// Error budgets are measured in rendered pixels, so QHD retains detailed
// geometry farther out. Hysteresis avoids flickering at the switch distance.
export function choosePropLod(errors,current,distance,scale,pixelsPerRadian){
 if(distance<6)return 0;
 let choice=0;
 for(let i=1;i<errors.length;i++){
  const pixels=errors[i]*scale*pixelsPerRadian/Math.max(.1,distance);
  if(pixels<=(i===current?.85:.65))choice=i;
 }
 return choice;
}
export function updatePropLods(targets,camera,renderHeight){
 const pixels=renderHeight/(2*Math.tan(T.MathUtils.degToRad(camera.fov)/2));
 for(const target of targets){
  const {mesh,levels}=target;
  if(!target.placed){
   mesh.updateWorldMatrix(true,false);const worldScale=mesh.matrixWorld.getMaxScaleOnAxis();target.scale=worldScale;
   if(mesh.isInstancedMesh){
    // One level per chunk, conservative for its closest/largest instance.
    // A mesh-origin sphere would put distant rocks at (0,0) for LOD selection.
    mesh.computeBoundingSphere();target.center.copy(mesh.boundingSphere.center).applyMatrix4(mesh.matrixWorld);target.radius=mesh.boundingSphere.radius*worldScale;
    const instance=new T.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,instance);target.scale=Math.max(target.scale,instance.getMaxScaleOnAxis()*worldScale);}
   }else{target.center.copy(levels[0].geometry.boundingSphere.center).applyMatrix4(mesh.matrixWorld);target.radius=levels[0].geometry.boundingSphere.radius*target.scale;}
   target.errors=levels.map(l=>l.error);target.placed=true;
  }
  const distance=Math.max(0,camera.position.distanceTo(target.center)-target.radius);
  const level=choosePropLod(target.errors,target.current,distance,target.scale,pixels);
  if(level!==target.current){target.current=level;mesh.geometry=levels[level].geometry;}
 }
}
