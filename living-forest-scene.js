import * as T from './vendor/three.module.js';
import {LivingForest} from './forest-behavior.js?v=20261113-forest48-r3';
import {translate,localizeCanvas} from './i18n.js?v=20261113-forest48-r3';
import {lookedAt} from './exploration.js?v=20261113-forest48-r3';
import {batchStaticMeshes} from './render-batching.js?v=20261113-forest48-r3';

export function buildLivingForest(f,heightAt){
 const sites=[{id:'trail',x:-5.25,z:-2.8},{id:'cabin',x:-1.9,z:-8.6},{id:'camp',x:-5.4,z:2.4}],logic=new LivingForest(sites),root=new T.Group();root.name='Лес меняется';f.scene.add(root);
 const wood=f.material(0x716958,{map:f.texture('weathered_planks-diff-2k.jpg',1,true),roughness:.96}),iron=f.material(0x343a33,{metalness:.5,roughness:.85});
 const props=sites.map(site=>{
  const g=new T.Group();g.position.set(site.x,heightAt(site.x,site.z),site.z);root.add(g);
  const board=new T.Mesh(new T.BoxGeometry(.73,.41,.05),wood);board.position.y=.78;board.castShadow=true;g.add(board);
  const post=new T.Mesh(new T.BoxGeometry(.055,.82,.055),wood);post.position.y=.4;post.castShadow=true;g.add(post);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;let message='';
  const draw=()=>{ctx.clearRect(0,0,512,256);ctx.fillStyle='#302f23';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#777762';ctx.lineWidth=4;ctx.strokeRect(8,8,496,240);ctx.fillStyle='#b9b8a1';ctx.textAlign='center';ctx.font='32px Georgia';message.split('\n').forEach((line,i)=>ctx.fillText(translate(line),256,83+i*61,480));};localizeCanvas(map,draw);
  const writing=new T.Mesh(new T.PlaneGeometry(.65,.33),new T.MeshStandardMaterial({map,roughness:1}));writing.position.set(0,.78,.03);writing.visible=false;g.add(writing);
  const hanging=new T.Group();hanging.position.set(.32,.43,0);g.add(hanging);
  const cage=new T.Mesh(new T.CylinderGeometry(.055,.07,.15,10,1,true),iron);cage.position.y=.10;hanging.add(cage);
  const handle=new T.Mesh(new T.TorusGeometry(.052,.008,6,16,Math.PI),iron);handle.position.y=.20;hanging.add(handle);
  const plank=new T.Mesh(new T.BoxGeometry(.4,.06,.19),wood);plank.position.set(-.12,.22,.04);plank.rotation.y=.18;g.add(plank);
  batchStaticMeshes(hanging);
  return {site,g,writing,hanging,plank,set(stage){writing.visible=stage>0;message=stage===1?'ТЫ УЖЕ\nБЫЛ ЗДЕСЬ':stage===2?'МЫ ВИДЕЛИ\nКАК ТЫ УХОДИЛ':'НЕ ОБОРАЧИВАЙСЯ';draw();map.needsUpdate=true;hanging.position.x=.32-stage*.20;plank.rotation.y=.18+stage*.53;},reset(){this.set(0);}};
 });
 return {root,logic,props,reset(){logic.reset();props.forEach(p=>p.reset());},update(progress,player,yaw,pitch){
  const events=logic.update({progress,player,observed:site=>{const target={x:site.x,y:heightAt(site.x,site.z)+.6,z:site.z};return lookedAt(player,target,yaw,pitch,f.lineOfSight(player,target));}});
  for(const e of events)if(e.type==='change'){props.find(p=>p.site.id===e.id).set(e.stage);f.flash.shadow.needsUpdate=true;}
  return events.filter(e=>e.type==='return');
 }};
}
