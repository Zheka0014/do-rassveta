import {roofAt,CHAPEL} from './weather-horror.js?v=20261120-forest50';
import {MILL} from './expedition.js?v=20261120-forest50';
import * as T from './vendor/three.module.js';
import {wrapRainCoordinate} from './rain-field.js?v=20261120-forest50';

// Sparse ground impacts share one draw. Their world positions are refreshed
// only after walking out of the local patch; lifetimes run on the GPU.
export function buildRainDetails(forest,heightAt){
 // Match the old 180-impact / 12 m disk density in the 26 m wrapping square.
 const count=270,phase=new Float32Array(count),dummy=new T.Object3D();
 const uniforms={time:{value:0},flashOn:{value:1},viewForward:{value:new T.Vector3(0,0,-1)}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,
  vertexShader:`attribute float impactPhase;varying vec2 vUv;varying float vAge;varying vec3 vWorld;uniform float time;
   void main(){vAge=fract(time*(.8+fract(impactPhase*17.)*.7)+impactPhase);vUv=uv;vec3 p=position;p.xz*=.2+vAge*.8;vec4 world=modelMatrix*instanceMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`varying vec2 vUv;varying float vAge;varying vec3 vWorld;uniform float flashOn;uniform vec3 viewForward;
   void main(){vec2 q=vUv-.5;float r=length(q)*2.;float ring=1.-smoothstep(.025,.13,abs(r-.76));
    float life=smoothstep(0.,.1,vAge)*(1.-vAge)*(1.-vAge);vec3 toPoint=normalize(vWorld-cameraPosition);float aim=smoothstep(.88,.98,dot(toPoint,viewForward));
    float distanceFade=1.-smoothstep(7.,13.,distance(cameraPosition,vWorld));float fire=exp(-length(vWorld.xz)*.35);
    vec3 color=mix(vec3(.31,.43,.5),vec3(.65,.34,.11),fire);float alpha=ring*life*distanceFade*(.08+aim*flashOn*.22+fire*.15);
    if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);}`});
 const geometry=new T.PlaneGeometry(.32,.32);geometry.rotateX(-Math.PI/2);geometry.setAttribute('impactPhase',new T.InstancedBufferAttribute(phase,1));
 const impacts=new T.InstancedMesh(geometry,material,count);impacts.frustumCulled=false;impacts.instanceMatrix.setUsage(T.DynamicDrawUsage);forest.scene.add(impacts);
 const rng=(()=>{let s=117;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();
 const impactX=new Float64Array(count),impactZ=new Float64Array(count);let initialized=false;
 for(let i=0;i<count;i++){phase[i]=rng()*11;impactX[i]=(rng()-.5)*26;impactZ[i]=(rng()-.5)*26;}
 geometry.attributes.impactPhase.needsUpdate=true;
 // Eave drops have different phases and fall outside the sheltered floor.
 const dripCount=94,positions=new Float32Array(dripCount*6),dripGeometry=new T.BufferGeometry();dripGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const drips=new T.LineSegments(dripGeometry,new T.LineBasicMaterial({color:0xa8b8bd,transparent:true,opacity:.28,depthWrite:false}));forest.scene.add(drips);
 const eaves=Array.from({length:dripCount},(_,i)=>i>=66?{x:MILL.x+(i%2?1:-1)*5.29,z:MILL.z-5.1+Math.floor((i-66)/2)*.77,y:MILL.y+3.23,phase:rng()}:i>=38?{x:CHAPEL.x+(i%2?1:-1)*3.36,z:CHAPEL.z-4.2+Math.floor((i-38)/2)*.64,y:CHAPEL.y+3.2,phase:rng()}:i<24?{x:(i%2?1:-1)*3.73,z:-17.5+Math.floor(i/2)*.62,y:3.2,phase:rng()}:{x:-1.75+(i-24)*.27,z:-9.25,y:2.9,phase:rng()});
 // A real fall time depends on roof height. Each eave waits independently for
 // its next drop, rather than slowing every roof to the same looping duration.
 for(let i=0;i<dripCount;i++){
  const drop=eaves[i];drop.ground=heightAt(drop.x,drop.z);drop.fall=Math.sqrt(Math.max(0,2*(drop.y-drop.ground)/9.81));drop.period=drop.fall+.35+rng()*.8;
  const j=i*6;positions[j]=drop.x;positions[j+2]=drop.z;positions[j+3]=drop.x+.005;positions[j+5]=drop.z;
 }
 let previousDripTime=-1;
 return {update(t,flash){
  const high=forest.quality!=='low';impacts.visible=drips.visible=high;if(!high)return;
  uniforms.time.value=t;uniforms.flashOn.value=flash?1:0;forest.camera.getWorldDirection(uniforms.viewForward.value);
  const camera=forest.camera.position;
  let moved=false;
  for(let i=0;i<count;i++){
   const x=initialized?wrapRainCoordinate(impactX[i],camera.x,26):camera.x+impactX[i];
   const z=initialized?wrapRainCoordinate(impactZ[i],camera.z,26):camera.z+impactZ[i];
   if(initialized&&x===impactX[i]&&z===impactZ[i])continue;
   impactX[i]=x;impactZ[i]=z;
   dummy.position.set(x,heightAt(x,z)+.018,z);dummy.rotation.set(0,phase[i],0);dummy.scale.setScalar(Number.isFinite(roofAt(x,z))?0:1);dummy.updateMatrix();impacts.setMatrixAt(i,dummy.matrix);moved=true;
  }
  initialized=true;if(moved)impacts.instanceMatrix.needsUpdate=true;
  drips.visible=camera.x**2+(camera.z+14)**2<784||(camera.x-CHAPEL.x)**2+(camera.z-CHAPEL.z)**2<784||(camera.x-MILL.x)**2+(camera.z-MILL.z)**2<784;
  if(drips.visible&&t!==previousDripTime){
   for(let i=0;i<dripCount;i++){
    const drop=eaves[i],age=(t+drop.phase*drop.period)%drop.period,j=i*6;
    const falling=age<drop.fall,y=falling?drop.y-.5*9.81*age*age:drop.y;
    positions[j+1]=y;positions[j+4]=falling?Math.min(drop.y,y+.012+9.81*age*.012):y;
    positions[j+3]=falling?drop.x+.005:drop.x;
   }
   dripGeometry.attributes.position.needsUpdate=true;previousDripTime=t;
  }
 }};
}
