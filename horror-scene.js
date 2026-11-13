import {mergeRetainedGeometry} from './render-batching.js?v=20261113-forest49';
import {SuspendedMotion} from './passive-motion.js?v=20261113-forest49';
import {translate,localizeCanvas} from './i18n.js?v=20261113-forest49';
import {createHangingCharacter} from './horror-characters.js?v=20261113-forest49';
import {poseHanging} from './hanging-pose.js?v=20261113-forest49';
import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {CEMETERY} from './horror-director.js?v=20261113-forest49';

const V=(x,y,z)=>new T.Vector3(x,y,z);
function tube(a,b,r,segments=7){const d=b.clone().sub(a),g=new T.CylinderGeometry(r*.8,r,d.length(),segments);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());return g;}
function labelTexture(lines,w=512,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;const a=c.getContext('2d');const draw=()=>{a.clearRect(0,0,c.width,c.height);a.fillStyle='#b4b0a2';a.textAlign='center';lines.forEach((line,i)=>{a.font=`${i===0?38:27}px Georgia`;a.fillText(translate(line),w/2,62+i*58,w-24);});};const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;localizeCanvas(t,draw);t.anisotropy=4;return t;}
function fabricTexture(){const n=256,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,v=155+Math.sin(x*2.1)*17+Math.cos(y*2.8)*15+Math.sin(x*.07+y*.13)*12;data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;}const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.needsUpdate=true;return t;}

export function buildHorrorScene(f,heightAt){
 const cemetery=new T.Group();cemetery.name='Заброшенное кладбище';f.scene.add(cemetery);
 const stone=new T.MeshStandardMaterial({color:0x777f75,map:f.texture('../stone_fire_pit/textures/stone_fire_pit_diff_1k.jpg',1.5,true),normalMap:f.texture('../stone_fire_pit/textures/stone_fire_pit_nor_gl_1k.jpg',1.5),normalScale:new T.Vector2(.75,.75),roughness:.95});
 const wood=new T.MeshStandardMaterial({color:0x717767,map:f.texture('weathered_planks-diff-2k.jpg',1,true),normalMap:f.texture('weathered_planks-nor_gl-2k.jpg'),roughnessMap:f.texture('weathered_planks-rough-2k.jpg'),roughness:.95});
 const iron=new T.MeshStandardMaterial({color:0x3c3430,roughness:.82,metalness:.5});
 const soil=new T.MeshStandardMaterial({color:0x24271e,map:f.texture('ground-color.jpg',2,true),normalMap:f.texture('ground-normal.jpg',2),roughness:.96});
 const dark=new T.MeshStandardMaterial({color:0x020302,roughness:1});
 const bone=new T.MeshStandardMaterial({color:0x939a87,roughness:.87});
 const candle=new T.MeshStandardMaterial({color:0xdac494,roughness:.95});
 const flame=new T.MeshBasicMaterial({color:0xffb453,toneMapped:false});
 const buckets=new Map();
 function part(g,mat,position=V(0,0,0),rotation=new T.Euler()) {g.applyMatrix4(new T.Matrix4().compose(position,new T.Quaternion().setFromEuler(rotation),V(1,1,1)));if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(g);}
 function box(w,h,d,x,y,z,mat,rot=0){part(new T.BoxGeometry(w,h,d),mat,V(x,y,z),new T.Euler(0,rot,0));}
 function rail(ax,az,bx,bz){const ay=heightAt(ax,az),by=heightAt(bx,bz),len=Math.hypot(bx-ax,bz-az);part(tube(V(ax,ay+.55,az),V(bx,by+.55,bz),.018),iron);part(tube(V(ax,ay+1.12,az),V(bx,by+1.12,bz),.015),iron);for(let j=0;j<=Math.ceil(len/.45);j++){const u=j/Math.ceil(len/.45),x=T.MathUtils.lerp(ax,bx,u),z=T.MathUtils.lerp(az,bz,u),y=heightAt(x,z),h=1.33+Math.sin(j*1.7)*.13;part(tube(V(x,y,z),V(x+.035*Math.sin(j),y+h,z),.017,5),iron);part(new T.ConeGeometry(.048,.12,4),iron,V(x,y+h+.05,z));}f.colliders.push({ax,az,bx,bz,x:(ax+bx)/2,z:(az+bz)/2,r:.06,top:Math.max(ay,by)+1.5});}
 // The eastern opening leads directly from the camp. Fence collisions follow
 // individual segments and leave a 3.4-metre gate and broad grave aisles.
 rail(-23,-20,-11,-20);rail(-23,-20,-23,-6);rail(-23,-6,-11,-6);rail(-11,-20,-11,-11);rail(-11,-7.6,-11,-6);
 for(const z of [-11,-7.6]){const y=heightAt(-11,z);box(.24,1.7,.24,-11,y+.85,z,stone);part(new T.SphereGeometry(.18,8,6),stone,V(-11,y+1.78,z));}
 // A broken gate leans inward instead of closing the only entrance.
 for(let i=0;i<5;i++){const z=-10.9+i*.33;part(tube(V(-11, heightAt(-11,z)+.15,z),V(-12,heightAt(-12,z)+1.1,z),.017,5),iron);}
 const names=['НЕИЗВЕСТНЫЙ','ЕЛЕНА М.','ИВАН К.','НЕИЗВЕСТНАЯ','СЕРГЕЙ В.','АННА Р.','ПАВЕЛ Л.','ЛИДИЯ Н.'];
 const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;const ctx=atlas.getContext('2d');const drawGraves=()=>{ctx.clearRect(0,0,1024,1024);ctx.textAlign='center';ctx.fillStyle='#a3ab9c';
 for(let i=0;i<16;i++){const x=(i%4)*256+128,y=Math.floor(i/4)*256;ctx.font='25px Georgia';ctx.fillText(translate(names[i%8]),x,y+94,244);ctx.font='22px Georgia';ctx.fillText(i===15?translate('ТВОЁ ИМЯ'):`${1893+i*3} — ${1921+i*4}`,x,y+145);ctx.fillText('†',x,y+46);}
 };
 const inscriptions=new T.MeshStandardMaterial({map:new T.CanvasTexture(atlas),transparent:true,alphaTest:.05,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});inscriptions.map.colorSpace=T.SRGBColorSpace;localizeCanvas(inscriptions.map,drawGraves);
 let grave=0;
 for(let row=0;row<4;row++)for(let col=0;col<5;col++){
  const x=-21.5+col*2.05,z=-18.6+row*3.0;if(col===4&&row===3)continue;
  const y=heightAt(x,z),angle=Math.sin(grave*2.71)*.13,h=.82+(grave%4)*.15;
  const mound=new T.SphereGeometry(1,12,7);mound.scale(.52,.13,.96);part(mound,soil,V(x,y+.015,z+.72),new T.Euler(0,angle,0));
  if(grave%4===2){box(.14,h,.12,x,y+h/2,z,wood,angle);box(.63,.12,.12,x,y+h*.72,z,wood,angle);}else{
   const shape=new T.Shape();shape.moveTo(-.32,0);shape.lineTo(-.32,h-.24);shape.lineTo(-.28,h-.20);shape.quadraticCurveTo(-.31,h+.05,0,h+.1);shape.quadraticCurveTo(.29,h+.05,.31,h-.16);shape.lineTo(.29,h-.21);shape.lineTo(.32,h-.24);shape.lineTo(.32,0);shape.closePath();
   const g=new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.016,bevelThickness:.014,curveSegments:5});part(g,stone,V(x,y,z),new T.Euler(.03*Math.sin(grave),angle,.07*Math.sin(grave*4)));
   box(.83,.13,.36,x,y+.07,z+.07,stone,angle);
   const lettering=new T.PlaneGeometry(.52,.51),uv=lettering.attributes.uv,tile=grave%16;for(let k=0;k<uv.count;k++)uv.setXY(k,(uv.getX(k)+tile%4)/4,(uv.getY(k)+3-Math.floor(tile/4))/4);part(lettering,inscriptions,V(x+Math.sin(angle)*.165,y+h*.57,z+Math.cos(angle)*.165),new T.Euler(0,angle,0));
  }
  f.colliders.push({x,z,r:.3,top:y+h+.1});
  if(grave%5===0){for(let c=0;c<3;c++){const cx=x+.32+c*.09,cy=heightAt(cx,z+.6),cz=z+.6;part(new T.CylinderGeometry(.025,.032,.17+c*.045,7),candle,V(cx,cy+.085+c*.02,cz));part(new T.SphereGeometry(.024,6,4).scale(1,2.7,1),flame,V(cx,cy+.21+c*.045,cz));}}
  grave++;
 }
 // A fresh empty burial box: raised soil edges conceal the black interior.
 const gx=-16.5,gz=-7.65,gy=heightAt(gx,gz);box(1.05,.03,2.25,gx,gy+.025,gz,dark);
 for(const dx of [-.57,.57])box(.15,.28,2.5,gx+dx,gy+.12,gz,soil);
 for(const dz of [-1.2,1.2])box(1.25,.28,.15,gx,gy+.12,gz+dz,soil);
 box(.07,.09,2.08,gx-.4,gy+.06,gz,wood);box(.07,.09,2.08,gx+.4,gy+.06,gz,wood);box(.85,.09,.08,gx,gy+.06,gz-1,wood);
 part(new T.PlaneGeometry(.64,.45),new T.MeshStandardMaterial({map:labelTexture(['ТЕБЯ','ЖДАЛИ']),transparent:true,alphaTest:.03,roughness:1}),V(gx+.95,gy+.33,gz+.6),new T.Euler(-Math.PI/2,0,.25));
 const lid=new T.BoxGeometry(.82,.05,2.1);part(lid,wood,V(gx+1,gy+.28,gz),new T.Euler(0,.25,-.4));
 // Bones remain in a dark, partly uncovered old grave.
 part(new T.SphereGeometry(.11,10,8).scale(.8,1,1),bone,V(-21.5,heightAt(-21.5,-9.1)+.09,-9.1));
 part(tube(V(-21.7,heightAt(-21.7,-9.4)+.06,-9.4),V(-21.4,heightAt(-21.4,-9.9)+.05,-9.9),.022),bone);
 const bellY=heightAt(-18,-20);for(const dx of [-.9,.9])box(.16,3.4,.16,-18+dx,bellY+1.7,-20.1,wood);box(2.2,.15,.18,-18,bellY+3.4,-20.1,wood);
 const bellProfile=[V(.13,0,0),V(.35,.06,0),V(.3,.15,0),V(.2,.45,0),V(.14,.56,0)].map(p=>new T.Vector2(p.x,p.y));part(new T.LatheGeometry(bellProfile,16),iron,V(-18,bellY+2.65,-20.1));part(tube(V(-18,bellY+2.9,-20.1),V(-18,bellY+.3,-20.1),.013,5),wood);
 function sign(x,z,lines,w=1.4){const y=heightAt(x,z),rot=Math.PI/2;box(.12,1.7,.12,x,y+.85,z,wood);box(w,.7,.055,x,y+1.55,z,wood,rot);const g=new T.PlaneGeometry(w*.92,.66),m=new T.MeshStandardMaterial({map:labelTexture(lines),transparent:true,alphaTest:.03,roughness:1});part(g,m,V(x+.075,y+1.55,z),new T.Euler(0,rot,0));}
 sign(-10.8,-7.5,['КОРДОН № 04','НЕ СЧИТАЙ МОГИЛЫ'],1.85);
 // Trail marker faces the arriving player.
 const sy=heightAt(-3.2,-2.3);box(.1,1.6,.1,-3.2,sy+.8,-2.3,wood);box(1.55,.48,.07,-3.2,sy+1.45,-2.3,wood);part(new T.PlaneGeometry(1.48,.43),new T.MeshStandardMaterial({map:labelTexture(['← КЛАДБИЩЕ'],512,150),transparent:true,alphaTest:.03,roughness:1}),V(-3.2,sy+1.45,-2.235));
 // Abandoned stretcher outside the cabin: bent steel, sagging wet canvas.
 const props=[],sx=2.8,sz=-6,by=heightAt(sx,sz);
 for(const side of [-1,1]){
  part(tube(V(sx+side*.41,by+.72,sz-1.2),V(sx+side*.41,by+.8,sz+1.2),.032,9),iron);
  for(const end of [-1,1]){part(tube(V(sx+side*.4,by+.74,sz+end*.85),V(sx+side*.4,by+.18,sz+end*.85),.025,8),iron);part(new T.TorusGeometry(.13,.027,6,14),iron,V(sx+side*.43,by+.15,sz+end*.85),new T.Euler(0,Math.PI/2,0));}
 }
 for(const end of [-1,1])part(tube(V(sx-.4,by+.73,sz+end*.9),V(sx+.4,by+.73,sz+end*.9),.025,8),iron);
 const sheet=new T.PlaneGeometry(.94,2.1,10,18);sheet.rotateX(-Math.PI/2);const sp=sheet.attributes.position;
 for(let i=0;i<sp.count;i++){const x=sp.getX(i),z=sp.getZ(i);sp.setY(i,-Math.max(0,Math.abs(x)-.35)*1.9-Math.cos(z*2)*.035+Math.sin(z*19+x*23)*.012);}sheet.computeVertexNormals();
 const stained=new T.MeshStandardMaterial({color:0x767668,map:fabricTexture(),roughness:1,side:T.DoubleSide});
 stained.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  float stain=1.-smoothstep(.10,.34,length((vMapUv-vec2(2.1,2.0))*vec2(.8,.5))+.07*sin(vMapUv.x*32.)*sin(vMapUv.y*38.));
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.30,.105,.07),stain*.9);`);};
 stained.customProgramCacheKey=()=> 'abandoned-stretcher-cloth';part(sheet,stained,V(sx,by+.75,sz));props.push({id:'stretcher',x:sx,z:sz,sound:'scrape',range:6});f.colliders.push({x:sx,z:sz,ax:sx,az:sz-.85,bx:sx,bz:sz+.85,r:.43,top:by+.79});
 // Broken field radio on a small crate, with dials, grille and bent antenna.
 const rx=2.5,rz=-8.9,ry=heightAt(rx,rz);box(.56,.38,.38,rx,ry+.19,rz,wood);box(.37,.22,.14,rx,ry+.51,rz,iron);
 const grille=new T.MeshStandardMaterial({color:0x131b19,roughness:.85});box(.21,.14,.012,rx-.025,ry+.51,rz+.079,grille);
 for(let i=0;i<7;i++)box(.012,.13,.007,rx-.12+i*.029,ry+.51,rz+.088,iron);
 for(const dy of [-.05,.06])part(new T.CylinderGeometry(.021,.021,.025,10),grille,V(rx+.13,ry+.51+dy,rz+.085),new T.Euler(Math.PI/2,0,0));
 part(tube(V(rx+.12,ry+.62,rz),V(rx+.21,ry+1.06,rz-.02),.006,5),iron);
 part(new T.SphereGeometry(.009,6,4),new T.MeshBasicMaterial({color:0xac3b22,toneMapped:false}),V(rx+.08,ry+.56,rz+.086));props.push({id:'radio',x:rx,z:rz,sound:'radio',range:5.5});f.colliders.push({x:rx,z:rz,r:.27,top:ry+.62});
 // Bone and chain wind chimes hang from branches along both possible routes.
 const chimes=[];
 for(const [id,[x,z]] of [[-5.2,9.5],[6.4,-5.5],[-22.7,-10.5]].entries()){
  const y=heightAt(x,z)+2.45,root=new T.Group();root.position.set(x,y,z);const ring=new T.Mesh(new T.TorusGeometry(.18,.015,6,14),iron);ring.rotation.x=Math.PI/2;root.add(ring);
  for(let c=0;c<5;c++){const angle=c*Math.PI*2/5,cx=Math.cos(angle)*.16,cz=Math.sin(angle)*.16,len=.37+c%3*.09;
   const chain=new T.Mesh(tube(V(cx,.1,cz),V(cx,-len,cz),.007,5),iron);root.add(chain);
   const g=new T.CylinderGeometry(.015,.023,.22+c%2*.1,7);const ends=[g,new T.SphereGeometry(.031,7,5).translate(0,.12+c%2*.05,0),new T.SphereGeometry(.033,7,5).translate(0,-.12-c%2*.05,0)];const hangingBone=new T.Mesh(mergeGeometries(ends),bone);hangingBone.position.set(cx,-len-.15,cz);hangingBone.rotation.z=c*.17-.3;root.add(hangingBone);
  }
  const cord=new T.Mesh(tube(V(0,.1,0),V(0,.9,0),.011,5),wood);root.add(cord);f.scene.add(root);chimes.push({root,phase:id*1.9});props.push({id:'chain'+id,x,z,sound:'chain',range:5});
 }
 for(const [mat,parts] of buckets){const g=mergeRetainedGeometry(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,mat);mesh.castShadow=!mat.transparent&&mat!==flame;mesh.receiveShadow=true;cemetery.add(mesh);}
 const glow=new T.PointLight(0xe29e51,2.2,8,2);glow.position.set(-17,heightAt(-17,-12)+.6,-12);cemetery.add(glow);
 const clothMap=fabricTexture(),coat=new T.MeshStandardMaterial({color:0x494c40,map:clothMap,bumpMap:clothMap,bumpScale:.007,roughness:.98}),pants=new T.MeshStandardMaterial({color:0x303434,map:clothMap,bumpMap:clothMap,bumpScale:.005,roughness:1}),boots=new T.MeshStandardMaterial({color:0x141716,roughness:.81}),skin=new T.MeshStandardMaterial({color:0x686b5e,roughness:.98}),rope=new T.MeshStandardMaterial({color:0x6a6246,map:clothMap,bumpMap:clothMap,bumpScale:.006,roughness:1});
 const bodySpecs=[[-4.8,-4,1.75,.1],[7,-6,-1.7,.3],[-11.4,-20,1.35,.3],[-23.5,-10,1.6,0],[-31,22,1.5,-.4]];
 const bodies=[];let lastBodyShadow=0;
 for(const [id,s] of bodySpecs.entries()){
  const [tx,tz,ox,oz]=s,x=tx+ox,z=tz+oz,ground=heightAt(x,z),anchor=ground+3.85;
  const tree=bodies.length<2?null:new T.Group();if(tree){tree.position.set(tx,heightAt(tx,tz),tz);const bark=new T.MeshStandardMaterial({map:f.texture('bark-color-2k.jpg',1,true),normalMap:f.texture('bark-normal-2k.jpg'),roughness:.96,color:0x716d5e});const trunk=new T.Mesh(new T.CylinderGeometry(.16,.29,6,9),bark);trunk.position.y=3;trunk.castShadow=true;tree.add(trunk);for(let j=0;j<3;j++){const branch=new T.Mesh(tube(V(0,3.5+j*.8,0),V((j%2?1:-1)*(1.5+j*.3),4.2+j*.9,.3),.1),bark);branch.castShadow=true;tree.add(branch);}f.scene.add(tree);f.colliders.push({x:tx,z:tz,r:.28});}
  const branch=new T.Mesh(tube(V(tx,heightAt(tx,tz)+3.3,tz),V(x,anchor,z),.11,9),wood);branch.castShadow=true;f.scene.add(branch);
  const pivot=new T.Group();pivot.position.set(x,anchor,z);f.scene.add(pivot);
  const body=createHangingCharacter(f,id);body.name='human';
  const {head,neckPoint,ropeEnd,nooseRadius}=poseHanging(body,id);pivot.add(body);
  const ropeMesh=new T.Mesh(tube(V(0,0,0),ropeEnd,.010,10),rope);ropeMesh.name='suspension-rope';ropeMesh.castShadow=true;pivot.add(ropeMesh);
  const collarRope=new T.Mesh(new T.TorusGeometry(nooseRadius,.008,10,32),rope);collarRope.position.copy(neckPoint);collarRope.rotation.x=Math.PI/2;collarRope.name='neck-rope';collarRope.castShadow=true;body.add(collarRope);
  const joints=[-1,1].flatMap(side=>['elbow-','knee-'].map(prefix=>{const joint=body.getObjectByName(prefix+side);return {joint,base:joint.rotation.x};}));
  bodies.push({id,x,z,pivot,body,head,joints,motion:new SuspendedMotion(id),baseTurn:head.rotation.y,kick:0,phase:id*2.19});
 }
 return {cemetery,bodies,props,reset(){bodies.forEach(b=>{b.kick=0;b.motion.reset();b.pivot.rotation.set(0,0,0);b.head.rotation.y=b.baseTurn;for(const j of b.joints)j.joint.rotation.x=j.base;});},disturb(id){const b=bodies[id];if(b){b.kick=3;b.motion.impulse(.035,.11);}f.flash.shadow.needsUpdate=true;f.moonlight.shadow.needsUpdate=true;},update(dt,t,active){for(const c of chimes){c.root.rotation.z=Math.sin(t*1.2+c.phase)*.075;c.root.rotation.x=Math.sin(t*.83+c.phase)*.04;}for(const b of bodies){b.pivot.visible=Math.hypot(f.camera.position.x-b.x,f.camera.position.z-b.z)<(f.quality==='ultra'?70:f.quality==='high'?55:36);b.kick=Math.max(0,b.kick-(active?dt:0));if(active)b.motion.update(dt,t,.45+(f.stormStrength||0));b.pivot.rotation.z=b.motion.z;b.pivot.rotation.x=b.motion.x;for(const [i,j] of b.joints.entries())j.joint.rotation.x=j.base+b.motion.lag*(i%2?.5:1);b.head.rotation.y=T.MathUtils.damp(b.head.rotation.y,b.kick>0?.7:b.baseTurn,4,dt);}if(active&&t-lastBodyShadow>.18&&bodies.some(b=>Math.hypot(f.camera.position.x-b.x,f.camera.position.z-b.z)<20)){f.flash.shadow.needsUpdate=true;lastBodyShadow=t;}}};
}
