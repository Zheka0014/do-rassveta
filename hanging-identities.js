import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {createFrontDepthSampler} from './anatomical-head.js?v=20261120-forest50';

// Five persistent people, authored once during asset preparation. They share
// texture maps and unchanged body geometry, but never facial vertex buffers.
export const HANGING_IDENTITIES=Object.freeze([
 {id:'keeper',name:'Худой мужчина',base:'double',height:.99,bodyWidth:.90,width:.86,faceHeight:1.04,jaw:-.03,nose:.009,cheek:-.009,brow:.003,skin:0xb8c2c3,coat:0xa5b9b7,pants:0x89938f,hair:0x35302a,style:'receding',beard:'stubble',pitch:.30,roll:-.17,arm:[.03,.12],knees:[.04,.15]},
 {id:'woman',name:'Женщина',base:'double',height:.92,bodyWidth:.85,width:.91,faceHeight:.96,jaw:-.09,nose:-.004,cheek:.004,brow:-.002,skin:0xd4c4bc,coat:0xd9a6ad,pants:0x7f858c,hair:0x1f1716,style:'long',coatLength:.23,pitch:.27,roll:.13,arm:[.07,.025],knees:[.13,.04]},
 {id:'woodcutter',name:'Лесоруб',base:'double',height:1.04,bodyWidth:1.13,width:1.14,faceHeight:.98,jaw:.07,nose:.014,cheek:.004,brow:.008,skin:0xcac1af,coat:0xdcb37d,pants:0x89908a,hair:0x30231d,style:'short',beard:'full',pitch:.32,roll:-.08,arm:[.11,.065],knees:[.025,.09]},
 {id:'elder',name:'Старик',base:'listener',height:.94,bodyWidth:.94,width:.97,faceHeight:.96,jaw:.01,nose:.007,cheek:-.012,brow:.004,skin:0xc4c4b6,coat:0x959a9b,pants:0x747f83,hair:0x96978d,style:'bald',coatLength:.18,pitch:.20,roll:.18,arm:[.025,.075],knees:[.09,.13]},
 {id:'young',name:'Молодой мужчина',base:'double',height:1,bodyWidth:.90,width:.92,faceHeight:1,jaw:-.045,nose:-.002,cheek:.002,brow:.001,skin:0xd0c2be,coat:0xa3b7d1,pants:0x89959f,hair:0x171a1b,style:'fringe',pitch:.35,roll:.055,arm:[.08,.04],knees:[.12,.035]}
]);
const gauss=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
const noseWidths={keeper:.83,woman:.76,woodcutter:1.08,elder:1.02,young:.86};
function shape(v,p){
 const {x,y,z}=v,front=T.MathUtils.smoothstep(z,.03,.10);
 v.x=x*(p.width+p.jaw*Math.exp(-(((y+.09)/.065)**2)))*(1+(noseWidths[p.id]-1)*front*gauss(x,y,0,-.008,.033,.039));
 v.y=y*p.faceHeight;
 v.z=z+front*(p.nose*gauss(x,y,0,-.006,.024,.033)+p.brow*gauss(x,y,0,.053,.082,.018)
  +p.cheek*(gauss(x,y,-.075,-.038,.035,.041)+gauss(x,y,.075,-.038,.035,.041)));
 return v;
}
function smoothNormals(g){
 g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,sums=new Map();
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<p.count;i++){const k=key(i),v=sums.get(k)||new T.Vector3();v.x+=n.getX(i);v.y+=n.getY(i);v.z+=n.getZ(i);sums.set(k,v);}
 for(const v of sums.values())v.normalize();
 for(let i=0;i<p.count;i++){const v=sums.get(key(i));n.setXYZ(i,v.x,v.y,v.z);}
}
// Every head component passes through the same map in HEAD coordinates,
// including the globe, iris, pupil, lids, stitches and oral interior.
function sculptIdentity(head,p){
 head.updateWorldMatrix(true,true);const toHead=head.matrixWorld.clone().invert(),v=new T.Vector3();
 head.traverse(o=>{
  if(!o.isMesh)return;const localToHead=new T.Matrix4().multiplyMatrices(toHead,o.matrixWorld),back=localToHead.clone().invert();
  const g=o.geometry.clone(),a=g.attributes.position;
  for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(localToHead);shape(v,p).applyMatrix4(back);a.setXYZ(i,v.x,v.y,v.z);}
  smoothNormals(g);g.computeBoundingBox();g.computeBoundingSphere();o.geometry=g;
 });
 head.userData.identity=p.id;
}
function surfacePatch(face,predicate,offset,density=null){
 const g=face.geometry.clone(),a=g.attributes.position,n=g.attributes.normal,indices=g.index?.array||Array.from({length:a.count},(_,i)=>i),out=[];
 for(let i=0;i<indices.length;i+=3){const ids=Array.from(indices.slice(i,i+3));if(ids.every(j=>predicate(a.getX(j),a.getY(j),a.getZ(j))))out.push(...ids);}
 g.setIndex(out);
 const colors=[];for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),d=offset*(.83+.17*Math.sin(i*3.71));a.setXYZ(i,x+n.getX(i)*d,y+n.getY(i)*d,z+n.getZ(i)*d);if(density)colors.push(1,1,1,density(x,y,z));}
 if(density)g.setAttribute('color',new T.Float32BufferAttribute(colors,4));
 return g;
}
let strandAtlas;
function hairTexture(){
 if(strandAtlas)return strandAtlas;const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const grain=Math.sin(x*12.9898+y*78.233)*43758.5453,random=grain-Math.floor(grain),v=155+70*random+22*Math.sin(x*1.9+y*.09);data.set([v,v,v,255],(y*size+x)*4);}
 strandAtlas=new T.DataTexture(data,size,size);strandAtlas.colorSpace=T.SRGBColorSpace;strandAtlas.wrapS=strandAtlas.wrapT=T.RepeatWrapping;strandAtlas.repeat.set(3,3);strandAtlas.generateMipmaps=true;strandAtlas.minFilter=T.LinearMipmapLinearFilter;strandAtlas.needsUpdate=true;return strandAtlas;
}
function addHair(head,p,hairNormal){
 const face=head.getObjectByName('facial-sculpt'),a=face.geometry.attributes.position,index=face.geometry.index?.array||Array.from({length:a.count},(_,i)=>i);
 // GLTFLoader may interleave position, normals and UVs. The sampler expects
 // packed XYZ, otherwise eyebrow fibres can be projected onto a normal value.
 const positions=new Float32Array(a.count*3);for(let i=0;i<a.count;i++)positions.set([a.getX(i),a.getY(i),a.getZ(i)],i*3);
 const depth=createFrontDepthSampler(positions,index),mat=new T.MeshStandardMaterial({color:p.hair,map:hairTexture(),roughness:.86,normalMap:hairNormal,normalScale:new T.Vector2(.08,.08),side:T.DoubleSide,vertexColors:true,alphaHash:true});mat.name='hair-'+p.id;
 const frontLine=(x,z)=>p.style==='bald'?.16:p.style==='receding'?(z>.06?.165:.035):z<.065&&Math.abs(x)>.075?-.005:p.style==='fringe'?.108+.012*Math.sin(x*26+.8):p.style==='long'?.095+.008*Math.cos(x*22):.12;
 const backLine=p.style==='long'?-.09:p.style==='bald'?.025:-.01;
 const scalp=surfacePatch(face,(x,y,z)=>y>frontLine(x,z)||(z<.012&&y>backLine),.0025,(x,y,z)=>Math.max(T.MathUtils.smoothstep(y-frontLine(x,z),0,.012),z<.012?T.MathUtils.smoothstep(y-backLine,0,.012):0));
 const cap=new T.Mesh(scalp,mat);cap.name='scalp-hair';head.add(cap);
 const strands=[];
 function strand(points,r=.001,segments=8){strands.push(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(q=>new T.Vector3(...q))),segments,r,3,false));}
 // Fine brow fibres lie on the source surface, not a painted eyebrow card.
 const browY=p.base==='listener'?.025:.049;
 for(const side of [-1,1])for(let i=0;i<21;i++){
  const x=side*(.024+i*.0018),y=browY+.006*Math.sin(i/20*Math.PI);
  try{const z=depth(x,y)+.0014;strand([[x,y,z],[x+side*.002,y+.003,z+.0005],[x+side*.003,y+.004,z]],.00055,3);}catch{}
 }
 if(p.style==='long')for(const side of [-1,1])for(let i=0;i<30;i++){
  const t=i/29,angle=.30+t*2.1,x=side*(.093+.017*Math.sin(angle)),z=.018+.072*Math.cos(angle),endZ=z+.015*Math.sin(i*2.3);
  strand([[x,.080,z],[x+side*.010,-.045,z-.008],[x+side*.007,-.145,endZ],[x+side*(.005+.004*Math.sin(i)),-.25-.025*Math.sin(i*.65),endZ+.004]],.0020,12);
 }
 if(p.style==='fringe')for(let i=0;i<78;i++){
  const x=-.065+i*.0017,y=.127+.007*Math.sin(i*.7);
  try{const z=depth(x,y)+.003,ex=x+.010,ey=.051+.015*Math.cos(i*.35),ez=depth(ex,ey)+.003;
   strand([[x,y,z],[x+.006,y-.025,z+.007],[ex,ey,ez]],.0011,9);
  }catch{}
 }
 if(p.style==='short'||p.style==='receding')for(let i=0;i<80;i++){
  const theta=i*2.399,y=.11+(i%13)*.006,rx=.083*Math.sqrt(Math.max(.1,1-((y-.05)/.18)**2)),x=Math.sin(theta)*rx,z=Math.cos(theta)*.09;
  if(p.style==='receding'&&z>.04)continue;
  strand([[x,y,z],[x*.99,y+.012,z-.012],[x*.92,y+.008,z-.024]],.0011,5);
 }
 if(p.beard==='stubble'){
  const g=face.geometry.clone(),v=g.attributes.position,colors=[];
  for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),mask=T.MathUtils.smoothstep(-y,.068,.10)*T.MathUtils.smoothstep(z,.07,.10)*(.5+.12*Math.sin(i*1.39));colors.push(1-mask,1-mask,1-mask);}
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));face.geometry=g;face.material.vertexColors=true;
 }
 if(p.beard==='full'){
  const density=(x,y,z)=>T.MathUtils.smoothstep(z,.07,.09)*T.MathUtils.smoothstep(-.013-.050*Math.exp(-((x/.052)**2))-y,0,.015)*Math.max(T.MathUtils.smoothstep(Math.abs(x),.030,.045),T.MathUtils.smoothstep(-y,.073,.090));
  const beard=surfacePatch(face,(x,y,z)=>density(x,y,z)>.03&&y>-.16,.0035,density),b=new T.Mesh(beard,mat);b.name='beard-full';head.add(b);
  for(let i=0;i<480;i++){
   const x=-.092+(i%32)*.0059,y=-.024-Math.floor(i/32)*.0069;
   if(density(x,y,.14)<.25)continue;
   try{const z=depth(x,y)+.004;strand([[x,y,z],[x+.0007*Math.sin(i),y-.007,z+.001],[x+.0015*Math.sin(i),y-.013,z-.001]],.00055,4);}catch{}
  }
  for(let i=0;i<160;i++){
   const x=-.034+(i%40)*.00175,y=-.031-Math.floor(i/40)*.0025;
   try{const z=depth(x,y)+.002;strand([[x,y,z],[x+Math.sign(x)*.002,y-.003,z+.001],[x+Math.sign(x)*.004,y-.006,z]],.00045,4);}catch{}
  }
 }
 if(strands.length){const g=mergeGeometries(strands,false);strands.forEach(s=>s.dispose());const mesh=new T.Mesh(g,mat);mesh.name='wet-hair-strands';head.add(mesh);}
}
export function buildHangingIdentity(prototype,id,hairNormal=null,overrides={}){
 const base=HANGING_IDENTITIES[id];if(!base)throw new Error('Unknown hanging identity '+id);const p={...base,...overrides};
 const root=prototype.clone(true),head=root.getObjectByName('head'),hood=head.getObjectByName('ragged-hood');if(hood)hood.removeFromParent();
 root.name='hanging-'+p.id;root.userData={...root.userData,horrorKind:p.base,hangingIdentity:p.id,hangingIndex:id};
 const materials=new Map();root.traverse(o=>{
  if(!o.isMesh)return;const old=o.material;if(!materials.has(old)){
   const m=old.clone();if(old.name.startsWith('skin-'))m.color.set(p.skin);
   else if(old.name.startsWith('cloth-'))m.color.set(p.coat);
   else if(old.name.startsWith('pants-'))m.color.set(p.pants);
   else if(old.name==='iris')m.color.set(id===0?0x717a71:id===2?0x514031:0x39404a);
   m.name=old.name+'-'+p.id;materials.set(old,m);
  }o.material=materials.get(old);
 });
 addHair(head,p,hairNormal);sculptIdentity(head,p);
 const coat=root.getObjectByName('tailored-coat');if(p.coatLength){
  const g=coat.geometry.clone(),a=g.attributes.position;
  for(let i=0;i<a.count;i++){const y=a.getY(i);a.setY(i,y-p.coatLength*T.MathUtils.smoothstep(-y,.12,.44));}
  smoothNormals(g);g.computeBoundingBox();g.computeBoundingSphere();coat.geometry=g;
 }
 for(const child of root.children){child.position.multiplyScalar(p.height);child.scale.multiplyScalar(p.height);if(child!==head){child.position.x*=p.bodyWidth;child.scale.x*=p.bodyWidth;}}
 root.traverse(o=>{o.updateMatrix();if(o.isMesh)o.castShadow=o.receiveShadow=true;});root.updateMatrixWorld(true);return root;
}
