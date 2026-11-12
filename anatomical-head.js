import * as T from './vendor/three.module.js';
import {buildAuthoredHead} from './authored-head.js?v=20261112-forest48-r2';

// Modified from Infinite, 3D Head Scan by Lee Perry-Smith / triplegangers.com.
// CC BY 3.0. See assets/characters-v35/ATTRIBUTION.txt.
const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
const tileUV=(u,v,tile)=>[((tile%2)+.003+u*.994)*.5,((tile<2?1:0)+.003+v*.994)*.5];
function tube(points,r=.001,segments=24){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,5,false);}

// Orthographic +Z ray intersection. A scan can contain eyelids and an eye
// surface at the same X/Y; averaging their depths places new eyes in the skin.
export function createFrontDepthSampler(position,index){
 const cache=new Map();
 return (x,y)=>{
  const key=x.toFixed(6)+','+y.toFixed(6);if(cache.has(key))return cache.get(key);
  let front=-Infinity;
  for(let i=0;i<index.length;i+=3){
   const a=index[i]*3,b=index[i+1]*3,c=index[i+2]*3;
   const ax=position[a],ay=position[a+1],bx=position[b],by=position[b+1],cx=position[c],cy=position[c+1];
   if(x<Math.min(ax,bx,cx)-1e-8||x>Math.max(ax,bx,cx)+1e-8||y<Math.min(ay,by,cy)-1e-8||y>Math.max(ay,by,cy)+1e-8)continue;
   const denominator=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(denominator)<1e-12)continue;
   const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denominator,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denominator,w=1-u-v;
   if(Math.min(u,v,w)<-1e-7)continue;
   front=Math.max(front,u*position[a+2]+v*position[b+2]+w*position[c+2]);
  }
  if(!Number.isFinite(front))throw new Error('Facial landmark outside the source surface: '+key);
  cache.set(key,front);return front;
 };
}

export function buildAnatomicalHead(m,kind,p,source){
 if(source.anatomy==='makehuman-cc0')return buildAuthoredHead(m,kind,p,source,createFrontDepthSampler);
 const root=new T.Group();root.name='head';root.userData.faceKind=kind;root.userData.anatomy='modified-3d-scan';
 const pos=[],uv=[],skin=m.skin[p.tile],scale=.078;
 for(let i=0;i<source.position.length;i+=3){
  let x=source.position[i]*scale,y=source.position[i+1]*scale-.125,z=source.position[i+2]*scale;
  if(z>.025){
   const gaunt=kind==='watcher'?.011:kind==='listener'?.006:kind==='double'?.002:0;
   for(const s of [-1,1]){z-=gaunt*gaussian(x,y,s*.088,-.077,.032,.042);x+=s*gaunt*.23*gaussian(x,y,s*.107,-.010,.035,.035);}
   if(kind==='stone')z+=.0007*Math.sin(x*407+y*263)*Math.sin(y*711);
  }
  pos.push(x,y,z);uv.push(...tileUV(source.uv[i/3*2],1-source.uv[i/3*2+1],p.tile));
 }
 const original=new T.BufferGeometry();original.setAttribute('position',new T.Float32BufferAttribute(pos,3));original.setAttribute('uv',new T.Float32BufferAttribute(uv,2));original.setAttribute('normal',new T.Float32BufferAttribute(source.normal,3));original.setIndex(Array.from(source.index));
 const positions=original.attributes.position.array,uvs=original.attributes.uv.array,normals=original.attributes.normal.array,indices=original.index?.array||Uint32Array.from({length:positions.length/3},(_,i)=>i);
 const vertex=id=>({p:Array.from(positions.slice(id*3,id*3+3)),uv:Array.from(uvs.slice(id*2,id*2+2)),n:Array.from(normals.slice(id*3,id*3+3))});
 const mix=(a,b,t)=>({p:a.p.map((v,i)=>T.MathUtils.lerp(v,b.p[i],t)),uv:a.uv.map((v,i)=>T.MathUtils.lerp(v,b.uv[i],t)),n:a.n.map((v,i)=>T.MathUtils.lerp(v,b.n[i],t))});
 function split(poly,distance){const inside=[],outside=[];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a.p),db=distance(b.p);(da<=0?inside:outside).push(a);if((da<0&&db>0)||(da>0&&db<0)){const v=mix(a,b,da/(da-db));inside.push(v);outside.push(v);}}return {inside,outside};
 }
 const finalPos=[],finalUV=[],finalNormals=[];
 for(let i=0;i<indices.length;i+=3){const pieces=[split(Array.from(indices.slice(i,i+3)).map(vertex),p=>-.218-p[1]).inside];
  for(const poly of pieces)for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){finalPos.push(...v.p);finalUV.push(...v.uv);const n=new T.Vector3(...v.n).normalize();finalNormals.push(n.x,n.y,n.z);}
 }
 const faceGeometry=new T.BufferGeometry();faceGeometry.setAttribute('position',new T.Float32BufferAttribute(finalPos,3));faceGeometry.setAttribute('uv',new T.Float32BufferAttribute(finalUV,2));faceGeometry.setAttribute('normal',new T.Float32BufferAttribute(finalNormals,3));faceGeometry.computeBoundingBox();faceGeometry.computeBoundingSphere();
 original.dispose();
 const face=new T.Mesh(faceGeometry,skin);face.name='facial-sculpt';root.add(face);
 // Sampling the actual scan lets rims meet the skin even in profile.
 const depth=createFrontDepthSampler(pos,source.index);
 function add(g,material,name){const mesh=new T.Mesh(g,material);mesh.name=name;root.add(mesh);return mesh;}
 const closedEyes=[{x:-.0534,y:.002},{x:.0405,y:.0005}];
 if(kind==='listener')for(const [i,eye]of closedEyes.entries()){
   for(let j=0;j<5;j++){const x=eye.x-.020+j*.010,y=eye.y;add(tube([[x-.002,y+.004,depth(x,y+.004)+.001],[x+.001,y-.004,depth(x,y-.004)+.001]],.00075,6),m.mouth,'eyelid-stitch-'+i+'-'+j);}
 }
 // Original sculpted upper lip, lower lip and curved mouth seam stay intact.
 // Cutting a second guessed oval below these lips creates a displaced mouth.
 // Shallow, asymmetrical healed scars retain a human surface under side light.
 if(kind==='watcher'||kind==='listener')for(const [cx,cy,len]of [[-.089,-.058,.036],[.039,.103,.027]]){
  const points=[];for(let i=0;i<7;i++){const y=cy-len/2+i*len/6,x=cx+Math.sin(i*.8)*.002;points.push([x,y,depth(x,y)+.0005]);}add(tube(points,.00045,20),m['scar-'+kind],'healed-scar');
 }
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});return root;
}
