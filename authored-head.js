import * as T from './vendor/three.module.js';

// MakeHuman hm08 anatomical mesh, CC0 1.0. The authored eyelid openings and
// lips are retained as one surface, rather than cut into a closed-eye scan.
const tileUV=(u,v,tile)=>[((tile%2)+.003+u*.994)*.5,((tile<2?1:0)+.003+v*.994)*.5];
function corneaCap(radius,aperture,offset){
 const sides=32,rings=5,position=[0,0,radius+offset],uv=[.5,.5],index=[];
 for(let ring=1;ring<=rings;ring++)for(let i=0;i<=sides;i++){
  const r=aperture*ring/rings,a=i/sides*Math.PI*2,x=r*Math.cos(a),y=r*Math.sin(a);
  position.push(x,y,Math.sqrt(radius*radius-r*r)+offset);uv.push(.5+x/(aperture*2),.5+y/(aperture*2));
 }
 for(let i=0;i<sides;i++)index.push(0,1+i,2+i);
 for(let ring=0;ring<rings-1;ring++)for(let i=0;i<sides;i++){
  const a=1+ring*(sides+1)+i,b=a+sides+1;index.push(a,b,a+1,b,b+1,a+1);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
function smoothUVSeams(g){
 const p=g.attributes.position,n=g.attributes.normal,shared=new Map();
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
 for(let i=0;i<p.count;i++){const k=key(i),sum=shared.get(k)||new T.Vector3();sum.x+=n.getX(i);sum.y+=n.getY(i);sum.z+=n.getZ(i);shared.set(k,sum);}
 for(const n of shared.values())n.normalize();
 for(let i=0;i<p.count;i++){const value=shared.get(key(i));n.setXYZ(i,value.x,value.y,value.z);}
}
export function buildAuthoredHead(m,kind,p,source,sampler){
 const root=new T.Group();root.name='head';root.userData={faceKind:kind,anatomy:'MakeHuman hm08, CC0 1.0; original eyelids and lips'};
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(source.position,3));
 const uv=[];for(let i=0;i<source.uv.length;i+=2)uv.push(...tileUV(source.uv[i],1-source.uv[i+1],p.tile));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(source.index);g.computeVertexNormals();smoothUVSeams(g);g.computeBoundingBox();g.computeBoundingSphere();
 const face=new T.Mesh(g,m.skin[p.tile]);face.name='facial-sculpt';root.add(face);
 for(const [i,eye]of source.eyes.entries()){
  const orbital=new T.Group();orbital.name='orbital-eye-'+i;orbital.position.set(eye.x,eye.y,eye.z);root.add(orbital);
  const globe=new T.Mesh(new T.SphereGeometry(eye.radius,32,24),m.eye);globe.name='eye-'+i;orbital.add(globe);
  const iris=new T.Mesh(corneaCap(eye.radius,.0064,.00018),kind==='watcher'?m.cloudy:m.iris);iris.name='iris-'+i;orbital.add(iris);
  const pupil=new T.Mesh(corneaCap(eye.radius,.0026,.00036),kind==='watcher'?m['blind-pupil']:m.pupil);pupil.name='pupil-'+i;orbital.add(pupil);
 }
 // A recessed dark oral interior cannot alter the original lip silhouette.
 const mouth=new T.Mesh(new T.SphereGeometry(1,24,16),m.mouth);mouth.name='oral-interior';mouth.position.set(0,-.053,.133);mouth.scale.set(.028,.012,.013);root.add(mouth);
 if(kind==='watcher'){
  const depth=sampler(source.position,source.index);
  for(const [x,y,length]of [[-.074,-.049,.028],[.032,.105,.033]]){
   const points=[];for(let i=0;i<7;i++){const py=y-length/2+length*i/6,px=x+.0012*Math.sin(i*.8);points.push(new T.Vector3(px,py,depth(px,py)+.00025));}
   const scar=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.0004,5,false),m['scar-watcher']);scar.name='healed-scar';root.add(scar);
  }
 }
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});return root;
}
