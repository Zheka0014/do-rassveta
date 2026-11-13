import * as T from './vendor/three.module.js';
import {frontToBack} from './instance-order.js?v=20261113-forest49';

export function compactPlants(batch,records,frustum,position,range){
 let count=0;
 for(const p of records){
  const dx=position.x-p.center.x,dz=position.z-p.center.z;
  if(dx*dx+dz*dz>(range+p.radius)**2||frustum&&!frustum.intersectsBox(p.bounds))continue;
  batch.setMatrixAt(count++,p.matrix);
 }
 batch.count=count;batch.visible=count>0;batch.instanceMatrix.clearUpdateRanges();
 if(count){batch.instanceMatrix.addUpdateRange(0,count*16);batch.instanceMatrix.needsUpdate=true;}
 return count;
}
export function updateGroundCover(f,all=false){
 if(!f.plantBatches)return;
 const p=f.camera.position,q=f.camera.quaternion,range=f.coverDistance.value;
 if(!all&&f.coverCullRange===range&&p.distanceToSquared(f.coverCullPosition)<.0004&&q.angleTo(f.coverCullRotation)<.002)return;
 f.camera.updateMatrixWorld();f.coverProjection.multiplyMatrices(f.camera.projectionMatrix,f.camera.matrixWorldInverse);f.coverFrustum.setFromProjectionMatrix(f.coverProjection);
 f.visiblePlantCount=0;for(const b of f.plantBatches)f.visiblePlantCount+=compactPlants(b.mesh,f.instanceDepthOrder===false?b.records:frontToBack(b.records,f.camera),all?null:f.coverFrustum,p,all?Infinity:range);
 f.coverCullPosition.copy(p);f.coverCullRotation.copy(q);f.coverCullRange=range;
 if(all)f.coverCullPosition.set(999,999,999);
}
export function initializePlantCulling(f){
 f.plantBatches=[];f.coverCullPosition=new T.Vector3(999,999,999);f.coverCullRotation=new T.Quaternion();f.coverFrustum=new T.Frustum();f.coverProjection=new T.Matrix4();
}
