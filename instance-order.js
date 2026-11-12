// Alpha-tested foliage writes opaque depth. Within each instanced draw, nearby
// leaves should fill it first so hidden fragments can fail the early depth test.
// Keep the placement records untouched: colliders and LOD state use their identity.
export function frontToBack(records, camera) {
 const e=camera.matrixWorld.elements;
 return records.map(record=>{
  const {min,max}=record.bounds;
  return {record,depth:-((min.x+max.x)*e[8]+(min.y+max.y)*e[9]+(min.z+max.z)*e[10])};
 }).sort((a,b)=>a.depth-b.depth).map(item=>item.record);
}
