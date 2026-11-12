import {mergeRetainedGeometry} from './render-batching.js?v=20261113-forest48-r3';
import {animateBasementWoman} from './basement-woman.js?v=20261113-forest48-r3';
import {advanceBasementBreath} from './basement-motion.js?v=20261113-forest48-r3';
import {turnActor} from './smooth-motion.js?v=20261113-forest48-r3';
import {translate,localizeCanvas} from './i18n.js?v=20261113-forest48-r3';
import {createHorrorCharacter,poseSeated,animateCharacter,characterMotion} from './horror-characters.js?v=20261113-forest48-r3';
import {buildCrate} from './crate-model.js?v=20261113-forest48-r3';
import * as T from './vendor/three.module.js';
import {mergeGeometries,mergeVertices} from './vendor/addons/utils/BufferGeometryUtils.js';
import {NightEncounters,FALSE_CAMPS,TRAPS,BASEMENT,stairHeight} from './encounters.js?v=20261113-forest48-r3';
import {createFire,updateFire} from './fire.js?v=20261113-forest48-r3';
import {formatTime} from './core.js?v=20261113-forest48-r3';
import {buildBasementDoll} from './basement-prop.js?v=20261113-forest48-r3';

const V=(x,y,z)=>new T.Vector3(x,y,z);
function beam(a,b,r=.025){const d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());return g;}
function textMap(lines){const c=document.createElement('canvas');c.width=512;c.height=384;const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;let current=lines;const draw=()=>{const a=c.getContext('2d');a.clearRect(0,0,512,384);a.textAlign='center';a.fillStyle='#b7b6a2';current.forEach((s,i)=>{a.font=`${i===0?46:34}px Georgia`;a.fillText(translate(s),256,90+i*80,490);});};const paint=lines=>{current=lines;draw();t.needsUpdate=true;};localizeCanvas(t,draw);return {map:t,paint};}
// Static figures keep every triangle, UV seam and hard normal. Indexing avoids
// storing their scanned faces once for each corner of every triangle.
export function mergeStaticFigureGeometry(parts){
 const temporary=[];
 const indexed=parts.map(g=>{
  if(g.index)return g;
  const copy=new T.BufferGeometry();
  for(const [name,attribute]of Object.entries(g.attributes))copy.setAttribute(name,attribute);
  const count=g.attributes.position.count,indices=count<=65536?new Uint16Array(count):new Uint32Array(count);
  for(let i=0;i<count;i++)indices[i]=i;
  copy.setIndex(new T.BufferAttribute(indices,1));temporary.push(copy);return copy;
 });
 const joined=mergeGeometries(indexed,false);
 temporary.forEach(g=>g.dispose());
 if(!joined)throw new Error('Incompatible static figure geometry');
 // The complete attribute tuple is compared; matching positions alone must
 // never smooth a fabric seam or join the two sides of an atlas boundary.
 const compact=mergeVertices(joined,1e-6);joined.dispose();return compact;
}
function batcher(parent,{indexed=false}={}){const bins=new Map();return {add(g,m,p=V(0,0,0),r=new T.Euler()){g.applyMatrix4(new T.Matrix4().compose(p,new T.Quaternion().setFromEuler(r),V(1,1,1)));if(!bins.has(m))bins.set(m,[]);bins.get(m).push(g);},finish(){for(const [m,parts]of bins){const geo=indexed?mergeStaticFigureGeometry(parts):mergeRetainedGeometry(parts);const mesh=new T.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);parts.forEach(g=>g.dispose());}}};}

export function buildNightScene(f,heightAt){
 const logic=new NightEncounters(),iron=new T.MeshStandardMaterial({color:0x514239,roughness:.8,metalness:.65});
 const wood=new T.MeshStandardMaterial({color:0x787e6d,map:f.texture('weathered_planks-diff-2k.jpg',1,true),normalMap:f.texture('weathered_planks-nor_gl-2k.jpg'),roughnessMap:f.texture('weathered_planks-rough-2k.jpg'),roughness:.96});
 const stone=new T.MeshStandardMaterial({color:0x777c71,map:f.texture('../stone_fire_pit/textures/stone_fire_pit_diff_1k.jpg',2,true),normalMap:f.texture('../stone_fire_pit/textures/stone_fire_pit_nor_gl_1k.jpg',2),roughness:.96});
 const dirt=new T.MeshStandardMaterial({color:0x33382c,map:f.texture('ground-color.jpg',1,true),normalMap:f.texture('ground-normal.jpg'),roughness:1});
 function human(seated=false){
  const origin=seated?1.55:1.86,actor=new T.Group(),model=createHorrorCharacter(f,'double');actor.name='human';actor.position.y=origin;model.position.y=-origin;actor.add(model);
  if(seated)poseSeated(model);return actor;
 }
 // Below the existing cabin, not a teleport or a separate illustration.
 const basement=new T.Group();basement.name='Подвал кордона';f.scene.add(basement);const b=batcher(basement);
 const box=(w,h,d,x,y,z,m=wood)=>b.add(new T.BoxGeometry(w,h,d),m,V(x,y,z));
 box(5.5,.2,5.9,0,BASEMENT.floor-.1,-14,stone);
 for(const x of [-2.75,2.75])box(.24,3,5.9,x,-1.35,-14,stone);
 for(const z of [-16.95,-11.05])box(5.5,3,.24,0,-1.35,z,stone);
 for(let i=0;i<24;i++){const z=BASEMENT.front-(i+.5)*(BASEMENT.front-BASEMENT.back)/24,y=stairHeight(z)-.075;box(1.68,.15,.183,0,y,z);}
 for(const x of [-.995,.995]){box(.26,.1,4.2,x,.20,-14.5);b.add(beam(V(x,.48,-12.45),V(x,-2.3,-16.5),.035),iron);for(const z of [-12.6,-14.2,-16.2])b.add(beam(V(x,stairHeight(z)+.02,z),V(x,stairHeight(z)+.65,z),.023),iron);}
 for(const x of [-2.4,2.4]){box(.19,2.8,.2,x,-1.37,-14);box(.22,.18,5.5,x,-.02,-14);}
 for(const y of [-2.25,-1.55,-.84]){box(.73,.075,2.5,2.23,y,-13.4);for(const z of [-14.5,-12.4])box(.08,2.8,.08,2.54,-1.36,z,iron);}
 for(let i=0;i<9;i++){const can=new T.CylinderGeometry(.095,.095,.27,12);b.add(can,iron,V(2.15,-1.38+(i%3)*.71,-14.25+Math.floor(i/3)*.62));}
 const crateRoot=new T.Group();crateRoot.position.set(-1.75,BASEMENT.floor,-15.5);basement.add(crateRoot);const crateModel=buildCrate(f,crateRoot,wood,iron,.8,.60,.58);
 for(const z of [-12.1,-13.0]){b.add(beam(V(-2.5,-.17,z),V(-2.5,-2.4,z),.016),iron);b.add(new T.TorusGeometry(.06,.014,6,14),iron,V(-2.5,-2.43,z));}
 b.finish();
 const basementWoman=buildBasementDoll(basement,f),womanBounds=new T.Box3().setFromObject(basementWoman),womanCenter=womanBounds.getCenter(new T.Vector3());
 f.wallBoxes.push({x:womanCenter.x,z:womanCenter.z,w:womanBounds.max.x-womanBounds.min.x+.06,d:womanBounds.max.z-womanBounds.min.z+.06,bottom:BASEMENT.floor,top:womanBounds.max.y+.03});
 const note=textMap(['НЕ СЛУШАЙ','ТОГО, КТО','ХОДИТ НАВЕРХУ']);const writing=new T.Mesh(new T.PlaneGeometry(1.3,.92),new T.MeshStandardMaterial({map:note.map,transparent:true,alphaTest:.05,roughness:1}));writing.position.set(-2.61,-1.2,-13.4);writing.rotation.y=Math.PI/2;basement.add(writing);
 const red=new T.PointLight(0xd75b39,2.1,6,2);red.position.set(-1.9,-1.75,-15.6);basement.add(red);
 const lootGlow=new T.Mesh(new T.BoxGeometry(.1,.12,.1),new T.MeshStandardMaterial({color:0xe3b363,emissive:0xc18d41,emissiveIntensity:1.2}));lootGlow.position.set(-1.65,-2.05,-15.5);basement.add(lootGlow);
 const hatch=new T.Group();hatch.position.set(-.86,.24,-14.47);f.scene.add(hatch);const hb=batcher(hatch);
 for(let i=0;i<7;i++)hb.add(new T.BoxGeometry(.238,.075,4.03),wood,V(.13+i*.245,0,0));
 for(const z of [-1.7,1.7])hb.add(new T.BoxGeometry(1.7,.055,.09),iron,V(.85,.058,z));
 hb.add(new T.TorusGeometry(.07,.012,8,18),iron,V(1.5,.065,1.52),new T.Euler(Math.PI/2,0,0));hb.finish();
 const hatchLabel=textMap(['ПОДВАЛ','ПРИПАСЫ ↓']);const label=new T.Mesh(new T.PlaneGeometry(.66,.5),new T.MeshStandardMaterial({map:hatchLabel.map,transparent:true,alphaTest:.05,roughness:1}));label.rotation.x=-Math.PI/2;label.position.set(.86,.051,1.3);hatch.add(label);
 f.wallBoxes.push({x:-2.77,z:-14,w:.22,d:5.9,bottom:-3.05,top:.16},{x:2.77,z:-14,w:.22,d:5.9,bottom:-3.05,top:.16},{x:0,z:-16.96,w:5.6,d:.22,bottom:-3.05,top:.16},{x:0,z:-11.04,w:5.6,d:.22,bottom:-3.05,top:.16});

 const traps=TRAPS.map(t=>{
  const root=new T.Group(),ground=heightAt(t.x,t.z);root.position.set(t.x,ground+.015,t.z);f.scene.add(root);const tb=batcher(root),jaws=[];
  if(t.type==='jaw'){
   tb.add(new T.TorusGeometry(.28,.026,8,24),iron,V(0,.025,0),new T.Euler(Math.PI/2,0,0));tb.add(new T.CylinderGeometry(.135,.135,.035,12),iron,V(0,.025,0));
   for(const side of [-1,1]){const jaw=new T.Group();jaw.position.z=side*.2;root.add(jaw);const jb=batcher(jaw);jb.add(new T.TorusGeometry(.28,.022,6,16,Math.PI),iron,V(0,.035,-side*.2),new T.Euler(side*Math.PI/2,0,side>0?0:Math.PI));for(let n=0;n<7;n++){const a=(n+.5)/7*Math.PI;jb.add(new T.ConeGeometry(.027,.10,4),iron,V(Math.cos(a)*.25,.09,-side*.2+Math.sin(a)*.25*side));}jb.finish();jaws.push({mesh:jaw,side});}
   tb.add(beam(V(.2,.04,0),V(.42,.03,-.08),.018),iron);for(let i=0;i<5;i++)tb.add(new T.TorusGeometry(.025,.008,4,8),iron,V(.44+i*.04,.027,-.08),new T.Euler(Math.PI/2,i%2?Math.PI/2:0,0));
  }else{
   for(const [x,z]of [[t.ax,t.az],[t.bx,t.bz]])tb.add(new T.BoxGeometry(.065,.6,.065),wood,V(x-t.x,.22,z-t.z));
   tb.add(beam(V(t.ax-t.x,.27,t.az-t.z),V(t.bx-t.x,.27,t.bz-t.z),.007),iron);tb.add(new T.CylinderGeometry(.055,.055,.11,10),iron,V(t.bx-t.x,.38,.015));
  }
  tb.finish();return {...t,root,jaws};
 });

 const falseCamps=FALSE_CAMPS.map(c=>{
  const fire=createFire(f,c.x,c.z,heightAt(c.x,c.z));fire.light.castShadow=false;const people=new T.Group();f.scene.add(people);const pb=batcher(people,{indexed:true});
  for(let i=0;i<4;i++){const angle=i*Math.PI/2+.25,x=c.x+Math.sin(angle)*2.2,z=c.z+Math.cos(angle)*2.2,actor=human(true);actor.position.set(x,heightAt(x,z)+1.55,z);actor.rotation.y=angle+Math.PI;actor.updateMatrixWorld(true);pb.add(new T.CylinderGeometry(.22,.27,.60,11),wood,V(x,heightAt(x,z)+.30,z));actor.traverse(o=>{if(o.isMesh&&o.visible&&o.parent?.visible!==false)pb.add(o.geometry.clone().applyMatrix4(o.matrixWorld),o.material);});f.colliders.push({x,z,r:.27,top:heightAt(x,z)+1.55});}
  pb.finish();return {...c,fire,people};
 });
 // The same coat, glove colours and torch as the unseen first-person player.
 const doubleRoot=new T.Group();doubleRoot.add(human());doubleRoot.visible=false;f.scene.add(doubleRoot);
 const torch=new T.Group();torch.position.set(.31,1.21,.56);torch.rotation.x=Math.PI/2;doubleRoot.add(torch);
 const grip=new T.Mesh(new T.CylinderGeometry(.035,.043,.24,12),iron);torch.add(grip);const rim=new T.Mesh(new T.CylinderGeometry(.072,.045,.065,14),iron);rim.position.y=.13;torch.add(rim);
 const lens=new T.Mesh(new T.CircleGeometry(.062,14),new T.MeshBasicMaterial({color:0xd8e2ca,toneMapped:false}));lens.rotation.x=-Math.PI/2;lens.position.y=.165;torch.add(lens);
 const doubleLight=new T.SpotLight(0xdbe2cf,9,18,.35,.7,1.5);doubleLight.position.set(.31,1.22,.7);f.scene.add(doubleLight,doubleLight.target);doubleLight.intensity=0;doubleLight.target.position.set(.31,1.1,12);
 const newGraves=[];
 for(const [id,[x,z]]of [[-13.3,-9.6],[-22,-7.4],[-20.8,-7.25]].entries()){
  const root=new T.Group();root.position.set(x,heightAt(x,z),z);root.visible=false;f.scene.add(root);const gb=batcher(root);
  const shape=new T.Shape();shape.moveTo(-.34,0);shape.lineTo(-.34,.76);shape.quadraticCurveTo(0,1.13,.34,.76);shape.lineTo(.34,0);shape.closePath();gb.add(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.015,bevelThickness:.013,bevelSegments:1,curveSegments:6}),stone);gb.add(new T.BoxGeometry(.88,.12,.37),stone,V(0,.04,.04));gb.add(new T.SphereGeometry(1,12,7).scale(.56,.15,.9),dirt,V(0,.02,.73));gb.finish();
  const inscription=textMap(['ТЫ','00:00:00','УЖЕ ЗДЕСЬ']);const text=new T.Mesh(new T.PlaneGeometry(.6,.58),new T.MeshStandardMaterial({map:inscription.map,transparent:true,alphaTest:.05,roughness:1}));text.position.set(0,.56,.177);root.add(text);const collider={x,z,r:.3,top:heightAt(x,z)+1.02,active:false};f.colliders.push(collider);newGraves.push({id,root,inscription,collider});
 }
 // Honest camps carry three pale cuts; tracks lead into them from the trail.
 const marks=new T.Group();f.scene.add(marks);const mb=batcher(marks),chalk=new T.MeshStandardMaterial({color:0xb6b99e,roughness:1});
 for(const c of f.fires){const x=c.x+1.8,z=c.z+.2,y=heightAt(x,z);mb.add(new T.BoxGeometry(.16,1.25,.13),wood,V(x,y+.61,z));for(let i=0;i<3;i++)mb.add(new T.BoxGeometry(.14,.035,.015),chalk,V(x,y+.65+i*.14,z+.073));
  for(let i=0;i<14;i++){const xx=c.x+.17*(i%2?1:-1),zz=c.z+2.1+i*.29;mb.add(new T.SphereGeometry(1,10,6).scale(.072,.008,.15),dirt,V(xx,heightAt(xx,zz)+.013,zz));}
 }
 mb.finish();let graveCount=0,lastHatch=0,lastDoor=-1.34,womanTime=0,lastWomanBreath=0;
 return {logic,basement,hatch,marks,traps,falseCamps,doubleRoot,newGraves,radio:{x:2.5,z:-8.9},loot:{x:-1.75,z:-15.5},reset(seed,mode){logic.reset(seed,mode);logic.basementLidOpen=false;crateModel.reset();womanTime=0;lastWomanBreath=0;animateBasementWoman(basementWoman,0);f.flash.shadow.needsUpdate=true;graveCount=0;newGraves.forEach(g=>{g.root.visible=g.collider.active=false;});falseCamps.forEach(c=>c.fire.fuel=180);doubleRoot.visible=false;doubleLight.intensity=0;lootGlow.visible=true;hatch.rotation.z=0;f.cabinDoor.mesh.rotation.y=-1.34;f.cabinDoor.wall.active=false;},update(dt,t,state){womanTime=advanceBasementBreath(womanTime,dt,state.active);const breath=animateBasementWoman(basementWoman,womanTime);if(state.active&&f.camera.position.y<-.3&&f.camera.position.distanceToSquared(basementWoman.position)<100&&Math.abs(breath-lastWomanBreath)>.025){f.flash.shadow.needsUpdate=true;lastWomanBreath=breath;}crateModel.update(dt,logic.basementLidOpen,logic.lootTaken);
  hatch.rotation.z=T.MathUtils.damp(hatch.rotation.z,logic.hatchOpen?1.48:0,7,dt);const door=f.cabinDoor;door.mesh.rotation.y=T.MathUtils.damp(door.mesh.rotation.y,logic.doorClosed?0:-1.34,3.5,dt);door.wall.active=logic.doorClosed;
  if(Math.abs(lastHatch-hatch.rotation.z)>.035||Math.abs(lastDoor-door.mesh.rotation.y)>.035){f.flash.shadow.needsUpdate=f.moonlight.shadow.needsUpdate=door.light.shadow.needsUpdate=true;lastHatch=hatch.rotation.z;lastDoor=door.mesh.rotation.y;}
  for(const trap of traps){const armed=logic.traps[trap.id].armed;trap.jaws.forEach(j=>j.mesh.rotation.x=T.MathUtils.damp(j.mesh.rotation.x,armed?0:j.side*1.05,10,dt));if(trap.type==='wire')trap.root.visible=armed;}
  for(const c of falseCamps){c.fire.fuel=logic.falseSeen.has(c.id)?0:180;const distance=Math.hypot(f.camera.position.x-c.x,f.camera.position.z-c.z),nearby=distance<65;c.people.visible=distance<(f.quality!=='low'?65:28);c.fire.root.visible=nearby;c.fire.light.visible=true;updateFire(c.fire,t,f.camera,f.quality);if(!nearby)c.fire.light.intensity=0;}
  if(logic.newGraves!==graveCount){graveCount=logic.newGraves;newGraves.forEach(g=>{g.root.visible=g.collider.active=g.id<graveCount;if(g.id===graveCount-1)g.inscription.paint(['ТЫ',formatTime(logic.graveTime),'УЖЕ ЗДЕСЬ']);});f.staticShadowsDirty=true;f.moonlight.shadow.needsUpdate=true;f.flash.shadow.needsUpdate=true;}
  const d=logic.double;doubleRoot.visible=!!d&&state.active;if(!d)doubleLight.intensity=0;if(d){doubleRoot.position.set(d.x,heightAt(d.x,d.z),d.z);turnActor(doubleRoot,d.yaw,dt,16);animateCharacter(doubleRoot,t,{...characterMotion(doubleRoot),pitch:d.pitch,ground:(x,z)=>f.floorAt(x,z,doubleRoot.position.y,.18),scan:0});doubleLight.intensity=d.flash?9:0;lens.visible=d.flash;doubleRoot.updateMatrixWorld(true);doubleLight.position.set(.31,1.22,.7).applyMatrix4(doubleRoot.matrixWorld);doubleLight.target.position.set(.31,1.22-Math.sin(d.pitch)*10,12).applyMatrix4(doubleRoot.matrixWorld);}
  lootGlow.visible=!logic.lootTaken;
 }};
}
