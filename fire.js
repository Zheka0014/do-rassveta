import * as T from './vendor/three.module.js';
import {VolumeDepth} from './volume-depth.js?v=20261113-forest49';
import {createFlameVolume,createSmokeVolume,createFireSparks,fireFlicker} from './fire-volume.js?v=20261113-forest49';
import {endGrainTexture} from './surfaces.js?v=20261113-forest49';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

let flameMap;
function flameMaterial(phase){
 flameMap??=new T.TextureLoader().load('./assets/flame.png');
 flameMap.colorSpace=T.SRGBColorSpace;
 return new T.ShaderMaterial({
  uniforms:{uMap:{value:flameMap},uTime:{value:0},uPhase:{value:phase},uGain:{value:phase===0?.9:.35},uTint:{value:new T.Vector3(1,1,1)}},
  transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:`varying vec2 vUv;uniform float uTime,uPhase;
   void main(){vUv=uv;vec3 p=position;float h=uv.y;
    p.x+=h*h*(sin(uTime*3.3+h*5.0+uPhase)*.065+sin(uTime*7.1-h*8.0+uPhase)*.025);
    p.y*=.93+sin(uTime*4.0+uPhase)*.06;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
  fragmentShader:`varying vec2 vUv;uniform sampler2D uMap;uniform float uTime,uPhase,uGain;uniform vec3 uTint;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){
    vec2 uv=vUv;float h=uv.y;
    float n=noise(vec2(uv.x*6.0,h*5.0-uTime*2.3+uPhase));
    float fine=noise(vec2(uv.x*17.0,h*12.0-uTime*4.8));
    uv.x+=(n-.5)*(.025+h*.105);uv.y+=(fine-.5)*.035*h;
    vec3 c=texture2D(uMap,clamp(uv,0.001,.999)).rgb;
    float edge=smoothstep(0.0,.06,uv.x)*smoothstep(1.0,.94,uv.x)*smoothstep(0.0,.045,uv.y)*smoothstep(1.0,.96,uv.y);
    float flicker=.7+.3*noise(vec2(uv.x*9.0,h*7.0-uTime*3.8+uPhase));
    if(max(c.r,max(c.g,c.b))*edge<.012)discard;
    gl_FragColor=vec4(c*uTint*uGain*flicker*edge,1.0);
   }`
 });
}

export function createFire(forest,x,z,y){
 const root=new T.Group();root.position.set(x,y,z);forest.scene.add(root);
 const base=new T.Group();root.add(base);
 const depth=forest.volumeDepth??=new VolumeDepth();
 const volume=createFlameVolume(depth);root.add(volume);
 const coalMap=forest.texture('bark-color.jpg',1,true),cracks=new Uint8Array(128*128*4);
 for(let py=0;py<128;py++)for(let px=0;px<128;px++){const i=(py*128+px)*4,v=Math.abs(Math.sin(px*.24+Math.sin(py*.11)*2.5)*Math.sin(py*.21+Math.sin(px*.1)*2));const glow=v<.035?1:v<.1?.22:0;cracks.set([255*glow,64*glow,4*glow,255],i);}
 const emissiveMap=new T.DataTexture(cracks,128,128);emissiveMap.wrapS=emissiveMap.wrapT=T.RepeatWrapping;emissiveMap.needsUpdate=true;
 const coalMaterial=new T.MeshStandardMaterial({color:0x34302b,map:coalMap,roughness:1,emissive:0xffa340,emissiveMap,emissiveIntensity:.9});
 const coals=new T.InstancedMesh(new T.IcosahedronGeometry(.06,1),coalMaterial,72),dummy=new T.Object3D();
 for(let i=0;i<72;i++){const a=i*2.399,r=Math.sqrt(i/72)*.51;dummy.position.set(Math.cos(a)*r,.16+Math.sin(i*12)*.03,Math.sin(a)*r);dummy.rotation.set(i,0,i*3);dummy.scale.set(1+(i%3)*.3,.5,1);dummy.updateMatrix();coals.setMatrixAt(i,dummy.matrix);coals.setColorAt(i,new T.Color().setScalar(.3+(i%4)*.13));}root.add(coals);
 const logmat=new T.MeshStandardMaterial({color:0x1c1713,map:forest.texture('bark-color-2k.jpg',1,true),normalMap:forest.texture('bark-normal-2k.jpg'),normalScale:new T.Vector2(1.6,1.6),roughness:1,emissive:0xff6617,emissiveMap,emissiveIntensity:.2});
 const ends=new T.MeshStandardMaterial({color:0x393027,map:endGrainTexture(),roughness:1});
 const logParts=[],capParts=[];
 for(let i=0;i<7;i++){
  const length=.68+(i%3)*.09,g=new T.CylinderGeometry(.058,.077,length,14,6,true),p=g.attributes.position;
  for(let k=0;k<p.count;k++){const y=p.getY(k),stretch=1+Math.sin(y*19+i)*.065;p.setX(k,p.getX(k)*stretch);p.setZ(k,p.getZ(k)*stretch+Math.sin(y*11+i)*.009);}g.computeVertexNormals();
  const log=new T.Object3D();log.rotation.set(Math.PI/2+(i%2)*.09,i*1.12,.06*Math.sin(i));log.position.set(Math.sin(i)*.12,.18+(i%2)*.09,Math.cos(i)*.12);log.updateMatrix();g.applyMatrix4(log.matrix);logParts.push(g);
  for(const sign of [-1,1]){const cap=new T.CircleGeometry(sign>0?.058:.077,14);cap.rotateX(sign>0?-Math.PI/2:Math.PI/2);cap.translate(0,sign*length/2,0);cap.applyMatrix4(log.matrix);capParts.push(cap);}
 }
 for(const [parts,mat] of [[logParts,logmat],[capParts,ends]]){const mesh=new T.Mesh(mergeGeometries(parts,false),mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);parts.forEach(g=>g.dispose());}
 const sparks=createFireSparks();root.add(sparks);
 const smoke=createSmokeVolume(depth);root.add(smoke);
 const light=new T.PointLight(0xffaa58,12,14,1.9);light.position.set(x,y+.72,z);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.radius=3.2;light.shadow.intensity=.88;light.shadow.bias=-.002;light.shadow.normalBias=.08;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;forest.scene.add(light);
 return {x,z,y,root,base,light,volume,logmat,coals,sparks,smoke,fuel:180};
}

export function updateFire(f,t,camera,quality='high'){
 const live=f.fuel>0,flicker=fireFlicker(t);
 f.light.intensity=live?12*flicker:0;f.coals.material.emissiveIntensity=live?.8*flicker:.025;
 f.logmat.emissiveIntensity=live?.15*flicker:0;
 f.volume.visible=live;const uniforms=f.volume.material.uniforms;uniforms.uTime.value=t;uniforms.uSteps.value=quality==='ultra'?32:quality==='high'?24:12;
 uniforms.uWind.value.set(Math.sin(t*.23)*.07+.06,Math.cos(t*.31)*.04);
 uniforms.uPlumes.value[0].z=1.20+Math.sin(t*2.13)*.12+Math.sin(t*.73)*.06;
 uniforms.uPlumes.value[1].z=1.07+Math.sin(t*1.71+2)*.13;
 uniforms.uPlumes.value[2].z=1.30+Math.sin(t*1.93+4)*.14;
 f.smoke.visible=f.sparks.visible=live;
 const smoke=f.smoke.material.uniforms;smoke.uTime.value=t;smoke.uSteps.value=quality==='ultra'?14:quality==='high'?10:6;smoke.uWind.value.copy(uniforms.uWind.value);
 const sparks=f.sparks.material.uniforms;sparks.uTime.value=t;sparks.uWind.value.copy(uniforms.uWind.value);
}

export function createFlare(forest,x,z,y,yaw){
 const root=new T.Group();root.position.set(x,y+.045,z);root.rotation.y=yaw;forest.scene.add(root);
 const body=new T.Mesh(new T.CylinderGeometry(.022,.027,.29,14),new T.MeshStandardMaterial({color:0x692219,roughness:.7,metalness:.12}));
 body.rotation.z=Math.PI*.46;body.position.set(-.08,0,0);root.add(body);
 const cap=new T.Mesh(new T.SphereGeometry(.025,12,8),new T.MeshStandardMaterial({color:0xe8d0ab,emissive:0xff7242,emissiveIntensity:2.5}));cap.position.set(.06,.025,0);root.add(cap);
 const flames=[];for(let i=0;i<2;i++){
  const g=new T.PlaneGeometry(.22,.44,4,10);g.translate(0,.22,0);
  const material=flameMaterial(i*2.8);material.uniforms.uTint.value.set(1,.35,.18);material.uniforms.uGain.value=1.4;
  const m=new T.Mesh(g,material);m.position.set(.07,.04,0);m.rotation.y=i*Math.PI*.5;m.renderOrder=2;root.add(m);flames.push(m);
 }
 // The light comes from the forest's pre-made pool, so the scene's light count never
 // changes during play. When every light is busy the oldest flare hands its own over.
 const pool=forest.flareLights||[];let light=pool.find(l=>!l.userData.lit)||null;
 if(!light){const oldest=forest.flares.filter(f=>f.light).sort((a,b)=>a.life-b.life)[0];if(oldest){light=oldest.light;oldest.light=null;}}
 if(light){light.userData.lit=true;light.position.set(x,y+.22,z);light.intensity=45;}
 const flare={x,z,root,light,flames,cap,life:35};
 flare.dispose=()=>{const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());if(flare.light){flare.light.intensity=0;flare.light.position.set(0,-80,0);flare.light.userData.lit=false;flare.light=null;}};
 return flare;
}
export function updateFlare(f,t){
 const fade=Math.min(1,f.life/5);if(f.light)f.light.intensity=(30+Math.sin(t*22)*10)*fade;
 f.cap.material.emissiveIntensity=2.5*fade;
 f.flames.forEach(m=>{m.material.uniforms.uTime.value=t;m.material.uniforms.uGain.value=1.4*fade;});
}
