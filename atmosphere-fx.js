import * as T from './vendor/three.module.js';

// Small airborne detail: drizzle and dust caught in the torch beam, and breath in
// the cold air. Neither adds a light, so the set of lit shader variants stays
// exactly as prepared before the night starts. Hidden on the low preset.
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

function beamMotes(forest){
 const count=900,cell=new T.Vector3(10,6,10),positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){positions.set([hash(i*3+1)*cell.x,hash(i*3+2)*cell.y,hash(i*3+3)*cell.z],i*3);seeds[i]=hash(i*7+.5);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('seed',new T.BufferAttribute(seeds,1));
 const uniforms={uTime:{value:0},uOn:{value:0},uRain:{value:.4},uScale:{value:7},uCell:{value:cell},uTorch:{value:new T.Vector3()},uTorchDir:{value:new T.Vector3(0,0,-1)}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`attribute float seed;uniform float uTime,uOn,uRain,uScale;uniform vec3 uCell,uTorch,uTorchDir;varying float vAlpha;
   void main(){
    // The field wraps around the viewer, so it has no edge and never needs respawning.
    vec3 drift=vec3(sin(uTime*.31+seed*17.)*.25+uTime*.12,-uTime*(.10+uRain*.95+fract(seed*7.)*.12),cos(uTime*.27+seed*11.)*.25);
    vec3 world=mod(position+drift-cameraPosition+uCell*.5,uCell)-uCell*.5+cameraPosition;
    vec3 fromTorch=world-uTorch;float d=length(fromTorch);
    float cone=smoothstep(.90,.975,dot(fromTorch/max(d,.001),uTorchDir));
    vAlpha=cone*smoothstep(.4,1.2,d)/(1.+d*d*.035)*uOn*(.55+.45*sin(uTime*(1.7+fract(seed*3.)*2.)+seed*40.));
    vec4 mv=viewMatrix*vec4(world,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=vAlpha<.004?0.:clamp(uScale*(.9+fract(seed*13.)*1.3)/max(.3,-mv.z),1.5,9.);
   }`,
  fragmentShader:`varying float vAlpha;
   void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,r))*vAlpha;if(a<.004)discard;gl_FragColor=vec4(vec3(.93,.95,.86)*a*1.7,1.);}`});
 const points=new T.Points(geometry,material);points.frustumCulled=false;points.renderOrder=3;forest.scene.add(points);
 const target=new T.Vector3();
 return {points,uniforms,update(t,state,sheltered){
  uniforms.uTime.value=t;uniforms.uOn.value=state.flash&&state.battery>0?1:0;uniforms.uRain.value=sheltered?.02:.35+(state.storm||0)*.65;
  uniforms.uScale.value=forest.canvas.height/(2*Math.tan(T.MathUtils.degToRad(forest.camera.fov*.5)))*.013;
  forest.flash.getWorldPosition(uniforms.uTorch.value);forest.flash.target.getWorldPosition(target);uniforms.uTorchDir.value.copy(target).sub(uniforms.uTorch.value).normalize();
 }};
}

// Breath is mist, not smoke: it has no colour of its own and only scatters the light
// that reaches it. In the dark it is all but invisible; in the torch beam or beside a
// fire it shows as a short wisp below the line of sight.
function breath(forest,torch){
 const count=5,life=new Float32Array(count).fill(1),seeds=new Float32Array(count),strength=new Float32Array(count);
 const geometry=new T.PlaneGeometry(1,1);
 geometry.setAttribute('life',new T.InstancedBufferAttribute(life,1).setUsage(T.DynamicDrawUsage));
 geometry.setAttribute('seed',new T.InstancedBufferAttribute(seeds,1).setUsage(T.DynamicDrawUsage));
 geometry.setAttribute('strength',new T.InstancedBufferAttribute(strength,1).setUsage(T.DynamicDrawUsage));
 const uniforms={uTorch:torch.uTorch,uTorchDir:torch.uTorchDir,uTorchOn:torch.uOn,uGlow:{value:0}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`attribute float life,seed,strength;varying vec2 vUv;varying float vAlpha,vSeed,vLife;varying vec3 vWorld;
   void main(){vUv=uv;vSeed=seed;vLife=life;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.);vWorld=world.xyz;vec4 mv=viewMatrix*world;
    // A puff the player walks into fades out instead of filling the screen.
    vAlpha=strength*sin(3.14159*clamp(life,0.,1.))*(1.-life*.35)*smoothstep(.16,.42,-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uTorch,uTorchDir;uniform float uTorchOn,uGlow;varying vec2 vUv;varying float vAlpha,vSeed,vLife;varying vec3 vWorld;
   float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
   float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
   void main(){float turn=vSeed*6.2832;vec2 q=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*(vUv-.5);
    float cloud=n(q*3.4+vSeed*19.+vec2(0.,vLife*1.6))*.6+n(q*7.5+vSeed*7.)*.4;
    // Wisps, not discs: the outline is torn by noise and spreads sideways as the puff ages.
    float a=(1.-smoothstep(.04,.5,length(q*vec2(1.,1.35+vLife*.4))+(cloud-.5)*.5))*vAlpha;if(a<.003)discard;
    vec3 fromTorch=vWorld-uTorch;float d=length(fromTorch);
    float beam=uTorchOn*smoothstep(.70,.95,dot(fromTorch/max(d,.001),uTorchDir))/(1.+d*d*.45);
    vec3 light=vec3(.60,.66,.70)*(.10+beam*2.)+vec3(1.,.50,.20)*uGlow*.5;
    gl_FragColor=vec4(light,a);}`});
 const mesh=new T.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.renderOrder=4;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);forest.scene.add(mesh);
 const puffs=Array.from({length:count},()=>({age:9,duration:1,position:new T.Vector3(),velocity:new T.Vector3()})),dummy=new T.Object3D(),forward=new T.Vector3(),before=new T.Vector3(),carried=new T.Vector3();
 let next=1.5,cursor=0,moved=false;
 return {mesh,uniforms,puffs,reset(){for(const p of puffs)p.age=9;next=1.5;moved=false;},update(dt,state,sheltered){
  const camera=forest.camera,warmth=Number.isFinite(state.warmth)?state.warmth:100;
  // The exhaled air leaves with the speed of the head; a teleport is not a speed.
  if(moved&&dt>0)carried.copy(camera.position).sub(before).divideScalar(dt);else carried.set(0,0,0);if(carried.lengthSq()>144)carried.set(0,0,0);before.copy(camera.position);moved=true;
  const cold=.25+.75*T.MathUtils.clamp((90-warmth)/55,0,1),heavy=state.sprinting||(Number.isFinite(state.stamina)&&state.stamina<35);
  let glow=0;for(const fire of forest.fires)if(fire.fuel>0){const dx=fire.x-camera.position.x,dz=fire.z-camera.position.z;glow=Math.max(glow,1/(1+(dx*dx+dz*dz)*.1));}
  uniforms.uGlow.value=glow;
  if(state.active){next-=dt;if(next<=0){
   next=heavy?1.35:3.3;
   // Warm and under a roof there is nothing to see.
   if(!(sheltered&&warmth>85)){
    const index=cursor,p=puffs[index];cursor=(cursor+1)%count;camera.getWorldDirection(forward);
    p.age=0;p.duration=heavy?1.4:2.1;p.position.copy(camera.position).addScaledVector(forward,.42);p.position.y-=.17;
    p.velocity.copy(forward).multiplyScalar(heavy?.62:.42).addScaledVector(carried,.85);p.velocity.y-=.03;seeds[index]=Math.random();strength[index]=cold*(heavy?.42:.32);
   }
  }}
  puffs.forEach((p,i)=>{
   if(p.age<p.duration){p.age+=dt;p.velocity.multiplyScalar(Math.exp(-dt*1.9));p.velocity.y+=dt*.05;p.position.addScaledVector(p.velocity,dt);}
   const u=Math.min(1,p.age/p.duration);life[i]=u;
   dummy.position.copy(p.position);dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(u>=1?0:.08+u*.30);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;geometry.attributes.life.needsUpdate=geometry.attributes.seed.needsUpdate=geometry.attributes.strength.needsUpdate=true;
 }};
}

export function buildAtmosphereFx(forest){
 const motes=beamMotes(forest),vapour=breath(forest,motes.uniforms);let enabled=true;
 const apply=()=>{const on=enabled&&forest.quality!=='low';motes.points.visible=vapour.mesh.visible=on;return on;};
 return {motes,vapour,
  setEnabled(value){enabled=!!value;apply();},
  get enabled(){return enabled;},
  reset(){vapour.reset();},
  update(dt,t,state){
   if(!apply())return;
   const p=forest.camera.position,sheltered=forest.shelteredAt(p.x,p.z,state.feetY??p.y-1.68);
   motes.update(t,state,sheltered);vapour.update(dt,state,sheltered);
  }};
}
