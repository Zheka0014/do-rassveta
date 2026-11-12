import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {buildAnatomicalHead} from './anatomical-head.js?v=20261112-forest48-r2';

// Geometry authoring shared by the GLB exporter and the modelling tests.
// Runtime characters load the exported assets, rather than rebuilding them.
export const CHARACTER_PROFILES={
 watcher:{tile:0,height:2.04,hip:.97,chest:1.345,shoulder:1.655,head:1.875,width:.275,headScale:.90,thigh:.45,shin:.407,arm:.375,forearm:.33,coatDrop:.40,coat:0x646d5e,hood:true},
 listener:{tile:1,height:1.81,hip:.84,chest:1.21,shoulder:1.44,head:1.65,width:.26,headScale:.86,thigh:.39,shin:.337,arm:.34,forearm:.31,coat:0x777369,hunch:.18},
 double:{tile:2,height:1.84,hip:.86,chest:1.23,shoulder:1.48,head:1.68,width:.25,headScale:.86,thigh:.39,shin:.35,arm:.36,forearm:.34,coat:0x737d70,hood:true},
 stone:{tile:3,height:1.98,hip:.93,chest:1.35,shoulder:1.60,head:1.82,width:.26,headScale:.89,thigh:.42,shin:.40,arm:.39,forearm:.38,coat:0xbfc0b5,hunch:.045}
};
const clamp=T.MathUtils.clamp;
const gauss=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
const tileUV=(u,v,tile)=>[((tile%2)+.003+u*.994)*.5,((tile<2?1:0)+.003+v*.994)*.5];
export function mapSurface(g,tile){const a=g.attributes.uv;for(let i=0;i<a.count;i++){const [u,v]=tileUV(a.getX(i),a.getY(i),tile);a.setXY(i,u,v);}return g;}
function geometry(positions,uv,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
function jawWidth(y){return y<-.025?1-clamp((-y-.025)*1.55,0,.29):1;}
export function faceDepth(x,y,z,kind='double'){
 const gaunt=kind==='watcher'?1.35:kind==='listener'?1.18:1;
 let d=z+.047*gauss(x,y,0,.012,.020,.075)+.050*gauss(x,y,0,-.040,.023,.018);
 for(const s of [-1,1]){
  d-=.027*gauss(x,y,s*.057,.055,.039,.029);
  d+=.018*gauss(x,y,s*.067,.094,.041,.013);
  d+=.017*gauss(x,y,s*.094,.008,.027,.027);
  d-=.021*gaunt*gauss(x,y,s*.090,-.059,.038,.040);
  d+=.017*gauss(x,y,s*.026,-.049,.016,.013);
  d-=.022*gauss(x,y,s*.022,-.055,.007,.004);
 }
 d+=.009*gauss(x,y,0,-.071,.014,.015);
 d-=.009*gauss(x,y,0,-.098,.080,.014);
 d+=.020*gauss(x,y,0,-.164,.057,.029);
 if(kind==='listener')d+=.017*gauss(x,y,0,-.19,.06,.024);
 if(kind==='watcher')d+=.005*Math.sin(y*95+x*21)*gauss(x,y,0,.125,.12,.06);
 return d;
}
function surfaceZ(x,y,kind){const sx=.155*jawWidth(y),lat=Math.asin(clamp(y/.23,-1,1)),lon=Math.asin(clamp(x/(sx*Math.cos(lat)), -.999,.999)),z=Math.cos(lon)*Math.cos(lat)*.125;return z+(faceDepth(x,y,z,kind)-z)*Math.max(0,Math.cos(lon))**3;}
const mouths={watcher:{x:.004,y:-.107,w:.068,h:.028},listener:{x:-.003,y:-.112,w:.060,h:.064},double:{x:.003,y:-.104,w:.054,h:.010},stone:{x:0,y:-.105,w:.054,h:.012}};
function aperture(x,y,kind){
 if(kind!=='listener')for(const s of [-1,1])if(((x-s*.057)/.024)**2+((y-.055)/.0105)**2<1)return true;
 const m=mouths[kind];return ((x-m.x)/m.w)**2+((y-m.y)/m.h)**2<1;
}
export function createFaceGeometry(kind='double',segments=64){
 const p=CHARACTER_PROFILES[kind],positions=[],uv=[],indices=[];
 for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
  const lat=-Math.PI*.5+j/segments*Math.PI,lon=-Math.PI*.5+i/segments*Math.PI,y=Math.sin(lat)*.23;
  const x=Math.sin(lon)*Math.cos(lat)*.155*jawWidth(y),z=Math.cos(lon)*Math.cos(lat)*.125;
  positions.push(x,y,z+(faceDepth(x,y,z,kind)-z)*Math.max(0,Math.cos(lon))**3);
  uv.push(...tileUV(clamp(x/.31+.5,.002,.998),clamp(y/.46+.5,.002,.998),p.tile));
 }
 for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  for(const ids of [[a,a+1,b],[b,a+1,b+1]]){
   const x=ids.reduce((v,k)=>v+positions[k*3],0)/3,y=ids.reduce((v,k)=>v+positions[k*3+1],0)/3;
   const z=ids.reduce((v,k)=>v+positions[k*3+2],0)/3;
   if(z>.05&&aperture(x,y,kind))continue;
   indices.push(...ids);
  }
 }
 return geometry(positions,uv,indices);
}
function curveTube(points,radius=.003,segments=32){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,5,false);}
function ellipseTube(cx,cy,rx,ry,kind,radius=.003){const points=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;points.push([x,y,surfaceZ(x,y,kind)+.001]);}return curveTube(points,radius,64);}
function batch(parent){const bins=new Map();return {add(g,m,position=[0,0,0],rotation=[0,0,0]){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));if(!bins.has(m))bins.set(m,[]);bins.get(m).push(g);},finish(){for(const [m,parts]of bins){const g=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g),false);for(const p of parts)p.dispose();const mesh=new T.Mesh(g,m);mesh.name=m.name+'-details';parent.add(mesh);}}};}
function ellipsoid(x,y,z,tile,seg=24){return mapSurface(new T.SphereGeometry(1,seg,seg<=14?8:16).scale(x,y,z),tile);}

export function makeSculptMaterials({skinAtlas=null,clothAtlas=null,skinNormal=null,clothNormal=null}={}){
 const m={skin:[],cloth:[],pants:[]};
 for(const [kind,p]of Object.entries(CHARACTER_PROFILES)){
  const skin=new T.MeshStandardMaterial({map:skinAtlas,color:kind==='stone'?0xc9c9be:kind==='watcher'?0xc3c7bb:0xd6d0c8,roughness:kind==='stone'?.94:.66,normalMap:skinNormal,normalScale:new T.Vector2(.035,.035),envMapIntensity:.26});skin.name='skin-'+kind;m.skin[p.tile]=skin;
  const cloth=new T.MeshStandardMaterial({map:clothAtlas,color:kind==='stone'?p.coat:0xe2e3d7,roughness:.91,normalMap:clothNormal,normalScale:new T.Vector2(.18,.18),envMapIntensity:.16});cloth.name='cloth-'+kind;m.cloth[p.tile]=cloth;
  const pants=cloth.clone();pants.color.multiplyScalar(.63);pants.name='pants-'+kind;m.pants[p.tile]=pants;
 }
 const simple=(name,values)=>{const mat=new T.MeshStandardMaterial(values);mat.name=name;m[name]=mat;};
 simple('boots',{color:0x202019,roughness:.63,normalMap:clothNormal,normalScale:new T.Vector2(.075,.075)});
 simple('sole',{color:0x10120f,roughness:.95});simple('thread',{color:0x777568,roughness:.91});
 simple('mouth',{color:0x110d0b,roughness:.93,side:T.DoubleSide});simple('lip',{color:0x72635a,roughness:.73});simple('teeth',{color:0x999780,roughness:.62});
 simple('eye',{color:0xaaa99a,roughness:.38,metalness:0,envMapIntensity:.2});simple('cloudy',{color:0x586259,roughness:.38});simple('iris',{color:0x3e4b3c,roughness:.32});simple('pupil',{color:0x070908,roughness:.3});simple('blind-pupil',{color:0x242b25,roughness:.38});
 simple('scar-watcher',{color:0x928c81,roughness:.87});simple('scar-listener',{color:0xa2938a,roughness:.87});
 return m;
}
export function buildSculptedHead(m,kind='double'){
 const p=CHARACTER_PROFILES[kind],skin=m.skin[p.tile],head=new T.Group();head.name='head';head.userData.faceKind=kind;
 const face=new T.Mesh(createFaceGeometry(kind),skin);face.name='facial-sculpt';head.add(face);
 const back=mapSurface(new T.SphereGeometry(1,32,24,Math.PI,Math.PI).scale(.155,.23,.125),p.tile);
 const a=back.attributes.position;for(let i=0;i<a.count;i++){a.setX(i,a.getX(i)*jawWidth(a.getY(i)));a.setZ(i,a.getZ(i)-.006*Math.abs(a.getZ(i))/.125*Math.exp(-Math.pow((a.getY(i)-.09)/.13,2)));}back.computeVertexNormals();head.add(new T.Mesh(back,skin));
 const details=batch(head);
 for(const s of [-1,1]){
  const ear=ellipsoid(.026,.051,.014,p.tile);const v=ear.attributes.position;
  for(let i=0;i<v.count;i++){const y=v.getY(i),x=v.getX(i),z=v.getZ(i);v.setZ(i,z-.011*Math.exp(-((x/.021)**2+(y/.035)**2)));}ear.computeVertexNormals();details.add(ear,skin,[s*.152,-.007,-.002],[0,s*.34,s*.1]);
  details.add(mapSurface(curveTube([[s*.153,.032,.011],[s*.17,.024,.014],[s*.177,-.016,.007],[s*.163,-.046,.003]],.0045,28),p.tile),skin);
  const cx=s*.057,cy=.055;
  if(kind==='listener'){
   details.add(mapSurface(curveTube([[cx-.024,cy,.114],[cx,cy-.002,.110],[cx+.024,cy+.002,.113]],.0034),p.tile),skin);
   for(let i=0;i<4;i++){const x=cx-.018+i*.012;details.add(curveTube([[x-.002,cy+.006,surfaceZ(x,cy,kind)+.003],[x+.003,cy-.006,surfaceZ(x,cy,kind)+.004]],.0009,4),m.mouth);}
  }else{
   const eye=new T.Group();eye.name='eye-'+s;eye.position.set(cx,cy,surfaceZ(cx,cy,kind)-.013);head.add(eye);
   const globe=new T.Mesh(new T.SphereGeometry(.023,20,14),kind==='stone'?skin:m.eye);globe.scale.y=.91;eye.add(globe);
   if(kind!=='stone'){
    const iris=new T.Mesh(new T.SphereGeometry(1,20,14).scale(kind==='watcher'?.006:.008,.007,.0016),m.iris);iris.position.z=.0225;eye.add(iris);
    const pupil=new T.Mesh(new T.SphereGeometry(1,14,10).scale(.0032,.0040,.0011),m.pupil);pupil.position.z=.0237;eye.add(pupil);
   }
   details.add(mapSurface(ellipseTube(cx,cy,.026,.012,kind,.0028),p.tile),skin);
  }
  details.add(mapSurface(curveTube([[s*.02,-.048,.174],[s*.025,-.054,.173],[s*.036,-.050,.153]],.002),p.tile),skin);
 }
 const mouth=mouths[kind],depth=surfaceZ(mouth.x,mouth.y,kind),cavity=new T.Mesh(new T.SphereGeometry(1,28,18,Math.PI,Math.PI).scale(mouth.w*1.11,mouth.h*1.15,.035),m.mouth);cavity.position.set(mouth.x,mouth.y,depth-.006);cavity.name='mouth-cavity';head.add(cavity);
 details.add(ellipseTube(mouth.x,mouth.y,mouth.w*1.05,mouth.h*1.04,kind,.0027),kind==='stone'?skin:m.lip);
 if(kind!=='stone')for(let i=0;i<(kind==='double'?6:8);i++){
  const x=mouth.x+(i-3.5)*.014;if(Math.abs(x-mouth.x)>mouth.w*.88)continue;
  const edge=Math.sqrt(Math.max(0,1-((x-mouth.x)/mouth.w)**2));
  const length=kind==='listener'?.013:kind==='watcher'?.010:.006;
  const tooth=ellipsoid(.0057,length*.6,.004,p.tile,12);details.add(tooth,m.teeth,[x,mouth.y+mouth.h*edge-length*.60,depth-.011],[.1,0,Math.sin(i*2.3)*.18]);
  if(kind==='listener'&&i%3!==0)details.add(ellipsoid(.0045,.007,.003,p.tile,12),m.teeth,[x,mouth.y-mouth.h*edge+.009,depth-.014],[0,0,.12]);
 }
 details.finish();head.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});return head;
}

function interpolate(sections,t){let i=0;while(i<sections.length-2&&t>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],f=clamp((t-a[0])/(b[0]-a[0]),0,1),s=f*f*(3-2*f);return a.slice(1).map((v,k)=>T.MathUtils.lerp(v,b[k+1],s));}
// A non-circular tailored surface: anatomical taper, elliptical cross-sections,
// biased folds at the elbow/knee, and curved centre lines rather than cylinders.
function limbSurface(length,sections,tile,{fold=.002,curve=.012,radial=20,rows=16}={}){
 const pos=[],uv=[],idx=[];
 for(let j=0;j<=rows;j++){const t=j/rows,[rx,rz]=interpolate(sections,t),bend=curve*Math.sin(t*Math.PI),joint=Math.exp(-Math.pow((t-.83)/.17,2));
  for(let i=0;i<=radial;i++){const theta=i/radial*Math.PI*2,wave=fold*(Math.sin(theta*9+t*38)+joint*Math.sin(t*75+theta*3));pos.push(Math.sin(theta)*(rx+wave),-t*length,Math.cos(theta)*(rz+wave)+bend);uv.push(...tileUV(i/radial,t,tile));}}
 for(let j=0;j<rows;j++)for(let i=0;i<radial;i++){const a=j*(radial+1)+i,b=a+radial+1;idx.push(a,b,a+1,b,b+1,a+1);}return geometry(pos,uv,idx);
}
function coatSurface(p){
 const bottom=p.hip-(p.coatDrop??.16)-p.chest,top=p.shoulder+.045-p.chest,length=top-bottom,rows=32,radial=44,pos=[],uv=[],idx=[];
 for(let j=0;j<=rows;j++){const t=j/rows,y=bottom+t*length,[rx,rz]=interpolate([[0,p.width*.81,p.width*.50],[.10,p.width*.89,p.width*.53],[.28,p.width*.70,p.width*.42],[.53,p.width*.67,p.width*.45],[.76,p.width*.93,p.width*.55],[.90,p.width,p.width*.57],[1,p.width*.34,p.width*.33]],t);
  for(let i=0;i<=radial;i++){const theta=-Math.PI+i/radial*Math.PI*2,front=Math.max(0,Math.cos(theta)),hem=(1-t)**5;
   const fold=.005*Math.sin(theta*11+t*24)+.004*Math.sin(theta*7-t*17)+hem*.012*Math.sin(theta*9+1.3);
   const x=Math.sin(theta)*(rx+fold)*(1+.015*Math.sin(theta*3)),z=Math.cos(theta)*(rz+fold)+front*.007*Math.sin(t*18+theta*2);
   pos.push(x,y-hem*(.014+.021*Math.sin(theta*7+.7)),z);uv.push(...tileUV(i/radial,t,p.tile));}}
 for(let j=0;j<rows;j++)for(let i=0;i<radial;i++){
  const theta=-Math.PI+(i+.5)/radial*Math.PI*2,t=(j+.5)/rows;
  const opening=t>.72?.19+(t-.72)*.75:t<.24?.035+(1-t/.24)*.11:.035;
  if(Math.abs(theta)<opening)continue;
  const a=j*(radial+1)+i,b=a+radial+1;idx.push(a,a+1,b,b,a+1,b+1);
 }return geometry(pos,uv,idx);
}
function hoodSurface(tile){
 const rows=28,cols=44,pos=[],uv=[],idx=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const lat=.08+j/rows*Math.PI*.86,theta=.62+i/cols*(Math.PI*2-1.24),r=1+.035*Math.sin(theta*7+lat*4)+.024*Math.sin(lat*17);
  pos.push(Math.sin(theta)*Math.sin(lat)*.184*r,Math.cos(lat)*.27+.008,Math.cos(theta)*Math.sin(lat)*.16-.015);uv.push(...tileUV(i/cols,j/rows,tile));
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){if(j>rows-3&&(i%11===0||i%13===0))continue;const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,a+1,b,b,a+1,b+1);}return geometry(pos,uv,idx);
}
function addHand(parent,m,p,side){
 const hand=new T.Group();hand.name='hand-'+side;hand.position.set(0,-p.forearm-.015,.013);parent.add(hand);const b=batch(hand),skin=m.skin[p.tile],scale=p.height>3?1.17:1;
 const palm=limbSurface(.115*scale,[[0,.029,.019],[.25,.040,.022],[.60,.042,.019],[1,.027,.013]],p.tile,{fold:.0005,curve:.006,radial:22,rows:18});b.add(palm,skin);
 for(let i=0;i<4;i++){
  const length=(.087+Math.sin((i+.4)/4*Math.PI)*.028)*scale,x=(i-1.5)*.020*scale,angle=(i-1.5)*.045;
  const finger=limbSurface(length,[[0,.0092,.008],[.23,.0102,.0084],[.42,.0079,.0072],[.61,.009,.0076],[.85,.0065,.0058],[1,.0036,.004]],p.tile,{fold:.0004,curve:.016,radial:12,rows:18});b.add(finger,skin,[x,-.103*scale,.005],[.16,0,angle]);
  b.add(ellipsoid(.0045,.008,.001,p.tile,12),m.teeth,[x,-.103*scale-length*.87,.018+Math.sin(.87*Math.PI)*.016],[.16,0,angle]);
 }
 const thumb=limbSurface(.079*scale,[[0,.012,.010],[.4,.010,.009],[.7,.008,.007],[1,.004,.004]],p.tile,{curve:.010,radial:14,rows:16});b.add(thumb,skin,[side*.036,-.023,.008],[.23,0,-side*.66]);b.finish();
}
function addBoot(ankle,m,p){
 const b=batch(ankle),stone=p.tile===3,mat=stone?m.skin[3]:m.boots,sole=stone?m.skin[3]:m.sole;
 const hull=limbSurface(.17,[[0,.060,.062],[.22,.064,.070],[.57,.077,.132],[.86,.080,.147],[1,.077,.146]],p.tile,{fold:.001,curve:.043,rows:22,radial:32});b.add(hull,mat,[0,.07,.040]);
 const bottom=ellipsoid(.080,.024,.153,p.tile,28);b.add(bottom,sole,[0,-.089,.061]);
 for(let i=0;i<5;i++){const y=.015-i*.014,z=.064+i*.015;b.add(curveTube([[-.041,y,z],[-.012,y+.006,z+.006],[.039,y,z+.018]],.0021,8),stone?mat:m.thread);}
 b.add(mapSurface(curveTube([[-.073,-.064,-.074],[-.079,-.064,.082],[-.059,-.064,.202],[0,-.064,.215],[.063,-.064,.194],[.079,-.064,.050],[.072,-.064,-.075]],.0024,48),p.tile),mat);b.finish();
}
export function buildSculptedCharacter(m,kind='double',headSource=null){
 const p=CHARACTER_PROFILES[kind],cloth=m.cloth[p.tile],pants=m.pants[p.tile],skin=m.skin[p.tile],root=new T.Group();root.name='character-'+kind;root.userData.horrorKind=kind;root.userData.modelVersion=35;
 const chest=new T.Group();chest.name='chest';chest.position.set(0,p.chest,0);chest.rotation.x=p.hunch||0;root.add(chest);
 const jacket=new T.Mesh(coatSurface(p),cloth);jacket.name='tailored-coat';jacket.material=cloth.clone();jacket.material.name=cloth.name;jacket.material.side=T.DoubleSide;chest.add(jacket);
 const details=batch(chest),top=p.shoulder-p.chest;
 const lining=ellipsoid(p.width*.62,(p.shoulder-p.hip)*.46,p.width*.43,p.tile,32);details.add(lining,pants,[0,(p.hip+p.shoulder)/2-p.chest,0]);
 for(const side of [-1,1]){
  const collar=geometry([side*.035,top+.025,.074,side*.165,top-.015,.13,side*.112,top-.24,.145,side*.020,top-.12,.099],tileUV(0,0,p.tile).concat(tileUV(1,0,p.tile),tileUV(1,1,p.tile),tileUV(0,1,p.tile)),side>0?[0,2,1,0,3,2]:[0,1,2,0,2,3]);details.add(collar,cloth);
  details.add(mapSurface(curveTube([[side*.084,top-.26,p.width*.57],[side*.067,-.08,p.width*.45],[side*.026,p.hip-(p.coatDrop??.16)+.02-p.chest,p.width*.5]],.004,32),p.tile),cloth);
  const pocket=limbSurface(.135,[[0,.063,.011],[.12,.068,.018],[.87,.065,.019],[1,.055,.009]],p.tile,{fold:.001,radial:16,rows:14});details.add(pocket,pants,[side*.12,p.hip+.16-p.chest,p.width*.45]);
 }
 for(let i=0;i<4;i++)details.add(new T.SphereGeometry(.007,10,8),m.boots,[.018,top-.21-i*.125,p.width*.48]);details.finish();
 const neck=limbSurface(.18,[[0,.057,.055],[.3,.055,.054],[.73,.071,.061],[1,.09,.064]],p.tile,{fold:.0008,radial:24,rows:22});const n=new T.Mesh(neck,skin);n.name='neck';n.position.set(0,p.head-.12,.018);if(headSource?.anatomy==='makehuman-cc0')n.position.set(0,p.head+(6.06-7.1)*.13*p.headScale,.025+.00486*p.headScale);root.add(n);
 const head=headSource?buildAnatomicalHead(m,kind,p,headSource):buildSculptedHead(m,kind);head.scale.setScalar(p.headScale);head.position.set(0,p.head,kind==='listener'?.13:.025);head.rotation.z=kind==='watcher'?-.065:kind==='double'?.025:.02;root.add(head);
 if(p.hood){const hoodMaterial=cloth.clone();hoodMaterial.name=cloth.name;hoodMaterial.side=T.DoubleSide;const hoodGeometry=hoodSurface(p.tile);if(headSource)hoodGeometry.scale(1,.85,1.35);const hood=new T.Mesh(hoodGeometry,hoodMaterial);hood.name='ragged-hood';head.add(hood);}
 for(const s of [-1,1]){
  const arm=new T.Group();arm.name='arm-'+s;arm.position.set(s*p.width*.90,p.shoulder-.04,.005);arm.rotation.z=s*.065;root.add(arm);
  const upper=limbSurface(p.arm,[[0,.071,.072],[.12,.092,.084],[.38,.079,.072],[.69,.063,.056],[1,.049,.045]],p.tile,{fold:.0025,curve:.008});arm.add(new T.Mesh(upper,cloth));
  const elbow=new T.Group();elbow.name='elbow-'+s;elbow.position.y=-p.arm;elbow.rotation.x=-.1;arm.add(elbow);
  const forearm=limbSurface(p.forearm,[[0,.051,.048],[.24,.061,.054],[.57,.047,.043],[.86,.032,.029],[1,.028,.026]],p.tile,{fold:kind==='listener'?.0007:.002,curve:.014});elbow.add(new T.Mesh(forearm,kind==='listener'?skin:cloth));addHand(elbow,m,p,s);
  const leg=new T.Group();leg.name='leg-'+s;leg.position.set(s*(p.height>3?.15:.115),p.hip,0);root.add(leg);
  leg.add(new T.Mesh(limbSurface(p.thigh,[[0,.108,.099],[.2,.112,.101],[.50,.089,.080],[.83,.067,.059],[1,.065,.059]],p.tile,{fold:.003,curve:.009}),pants));
  const knee=new T.Group();knee.name='knee-'+s;knee.position.y=-p.thigh;leg.add(knee);knee.add(new T.Mesh(limbSurface(p.shin,[[0,.065,.063],[.2,.078,.074],[.47,.069,.066],[.77,.047,.043],[1,.042,.041]],p.tile,{fold:.0022,curve:-.007}),pants));
  const ankle=new T.Group();ankle.name='ankle-'+s;ankle.position.y=-p.shin;knee.add(ankle);addBoot(ankle,m,p);
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});return root;
}
