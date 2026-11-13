import * as T from './vendor/three.module.js';
import {createVolumeNoise} from './volume-noise.js?v=20261113-forest49';
import {bindVolume,volumeRayGLSL} from './volume-depth.js?v=20261113-forest49';
let noise;
const vertex=`varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const field=()=>noise??=createVolumeNoise();

export function createFlameVolume(depth){
 const material=new T.ShaderMaterial({
  uniforms:{uNoise:{value:field()},uTime:{value:0},uSteps:{value:24},uWind:{value:new T.Vector2()},uPlumes:{value:[new T.Vector4(-.21,.04,1.26,.18),new T.Vector4(.19,-.14,1.1,.17),new T.Vector4(.02,.21,1.36,.16)]}},
  transparent:true,depthWrite:false,premultipliedAlpha:true,side:T.BackSide,forceSinglePass:true,
  vertexShader:vertex,fragmentShader:`precision highp float;precision highp sampler3D;
   ${volumeRayGLSL}
   uniform vec4 uPlumes[3];
   float density(vec3 p){
    float h=p.y/1.6;vec3 flow=p*vec3(7.4,4.7,7.4)-vec3(0,uTime*3.1,0);
    float turbulence=volumeNoise(flow)*.68+volumeNoise(flow*2.03+vec3(3.1,0,7.3))*.32;
    vec2 curl=vec2(volumeNoise(flow*.47+vec3(11,0,3)),volumeNoise(flow*.43+vec3(2,0,17)))-.5;
    vec2 bend=vec2(sin(p.y*8.-uTime*3.3),cos(p.y*6.7-uTime*2.7))*.045*h;
    vec2 q=p.xz-curl*(.04+h*.29)-uWind*h*h-bend;
    float d=0.;
    for(int j=0;j<3;j++){
     float height=clamp(p.y/uPlumes[j].z,0.,1.);
     float radius=uPlumes[j].w*(1.-height*.92);
     float cone=1.-length(q-uPlumes[j].xy*(1.-height*.48))/max(radius,.01);
     float tongue=smoothstep(.04,.46,cone+(turbulence-.48)*1.18);
     d=max(d,tongue*(1.-smoothstep(.72,1.,height)));
    }
    float breakup=mix(1.,smoothstep(.28,.69,turbulence),smoothstep(.18,1.05,p.y)*.86);
    return d*breakup*smoothstep(0.,.11,p.y);
   }
   void main(){
    vec3 ray=normalize(vLocal-uCamera);float enter,leave;
    if(!volumeInterval(ray,vec3(-.62,0,-.62),vec3(.62,1.6,.62),enter,leave))discard;
    float stepSize=(leave-enter)/uSteps;
    // Fixed subpixel stratification: the moving density supplies animation,
    // rather than a new random grain pattern thirty times a second.
    float jitter=.2+.6*volumeHash(gl_FragCoord.xy);vec3 color=vec3(0);float alpha=0.,contact=-1.;
    for(int i=0;i<32;i++){
     if(float(i)>=uSteps||alpha>.98)break;
     float distance=enter+(float(i)+jitter)*stepSize;vec3 p=uCamera+ray*distance;float d=density(p);
     if(d>.035&&contact<0.)contact=distance;
     float heat=clamp(d*.54+(1.-p.y/1.6)*.40,0.,1.);
     vec3 flame=mix(vec3(1.8,.055,.002),vec3(3.4,.85,.055),smoothstep(.18,.72,heat));
     flame=mix(flame,vec3(5.,2.8,.8),smoothstep(.72,.94,heat)*(1.-smoothstep(.18,.65,p.y)));
     float opacity=1.-exp(-d*stepSize*3.8);
     color+=(1.-alpha)*opacity*flame;alpha+=(1.-alpha)*opacity;
    }
    if(alpha<.001)discard;volumeDepth(contact<0.?enter:contact,ray);
    // Flame emits strongly but absorbs little of the background.
    gl_FragColor=vec4(color,alpha*.12);
   }`
 });
 const geometry=new T.BoxGeometry(1.24,1.6,1.24);geometry.translate(0,.8,0);
 const mesh=new T.Mesh(geometry,material);mesh.position.y=.17;mesh.renderOrder=2;
 return bindVolume(mesh,depth);
}

export function createSmokeVolume(depth){
 const material=new T.ShaderMaterial({
  uniforms:{uNoise:{value:field()},uTime:{value:0},uSteps:{value:10},uWind:{value:new T.Vector2()}},
  transparent:true,depthWrite:false,premultipliedAlpha:true,side:T.BackSide,forceSinglePass:true,
  vertexShader:vertex,fragmentShader:`precision highp float;precision highp sampler3D;
   ${volumeRayGLSL}
   void main(){
    vec3 ray=normalize(vLocal-uCamera);float enter,leave;
    if(!volumeInterval(ray,vec3(-1.4,0,-1.4),vec3(1.4,3.8,1.4),enter,leave))discard;
    float stepSize=(leave-enter)/uSteps,jitter=.2+.6*volumeHash(gl_FragCoord.xy);vec3 color=vec3(0);float alpha=0.,contact=-1.;
    for(int i=0;i<14;i++){
     if(float(i)>=uSteps||alpha>.9)break;
     float distance=enter+(float(i)+jitter)*stepSize;vec3 p=uCamera+ray*distance;
     float h=p.y/3.8;vec2 drift=uWind*(p.y+p.y*p.y*.42)+vec2(sin(p.y*2.8-uTime*.5),cos(p.y*2.3-uTime*.37))*.07*p.y;
     vec2 q=p.xz-drift;float radius=.13+p.y*.22,radial=dot(q,q)/(radius*radius);
     // Outside six squared radii, even a fully dense cloud contributes less
     // than 0.005 of one 8-bit alpha level across the entire 3.8 m volume.
     if(radial>6.)continue;
     float shape=exp(-radial*2.);
     vec3 flow=p*vec3(3.2,2.4,3.2)-vec3(0,uTime*.65,0);
     float cloud=volumeNoise(flow)*.72+volumeNoise(flow*2.1+vec3(7,0,3))*.28;
     float d=shape*smoothstep(.27,.69,cloud)*smoothstep(0.,.7,p.y)*(1.-smoothstep(2.1,3.8,p.y));
     if(d>.015&&contact<0.)contact=distance;
     float opacity=1.-exp(-d*stepSize*.72);
     vec3 lit=mix(vec3(.32,.125,.033),vec3(.075,.09,.10),smoothstep(0.,1.7,p.y));
     color+=(1.-alpha)*opacity*lit;alpha+=(1.-alpha)*opacity;
    }
    if(alpha<.002)discard;volumeDepth(contact<0.?enter:contact,ray);gl_FragColor=vec4(color,alpha);
   }`
 });
 const geometry=new T.BoxGeometry(2.8,3.8,2.8);geometry.translate(0,1.9,0);
 const mesh=new T.Mesh(geometry,material);mesh.position.y=.7;mesh.renderOrder=3;
 return bindVolume(mesh,depth);
}

export function createFireSparks(){
 const count=34,positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){positions.set([Math.sin(i*2.39)*.3,0,Math.cos(i*2.39)*.3],i*3);seeds[i]=i;}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new T.BufferAttribute(seeds,1));
 const material=new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uPixelScale:{value:500},uWind:{value:new T.Vector2()}},
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`attribute float aSeed;uniform float uTime,uPixelScale;uniform vec2 uWind;varying float vLife;
   void main(){
    float age=fract(uTime*(.21+mod(aSeed,7.)*.017)+aSeed*.371);vec3 p=position;
    p.xz+=vec2(sin(uTime*1.7+aSeed),cos(uTime*1.1+aSeed))*age*.13+uWind*age*age*4.;
    p.y=.32+3.1*(age-.35*age*age);vLife=smoothstep(0.,.07,age)*(1.-smoothstep(.45,1.,age));
    vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
    gl_PointSize=clamp(uPixelScale*(.009+mod(aSeed,3.)*.002)/max(.1,-view.z),1.5,10.);
   }`,
  fragmentShader:`varying float vLife;void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);float alpha=(1.-smoothstep(.25,1.,r))*vLife;
   if(alpha<.01)discard;gl_FragColor=vec4(mix(vec3(2.,.25,.015),vec3(3.,1.2,.2),1.-r),alpha);}`
 });
 const sparks=new T.Points(geometry,material),size=new T.Vector2();sparks.frustumCulled=false;sparks.renderOrder=4;
 sparks.onBeforeRender=(renderer,_scene,camera)=>{
  const target=renderer.getRenderTarget(),height=target?.height??renderer.getDrawingBufferSize(size).y;
  material.uniforms.uPixelScale.value=height*camera.projectionMatrix.elements[5]*.5;material.uniformsNeedUpdate=true;
 };
 return sparks;
}

const random=i=>{const n=Math.sin(i*127.1+19.19)*43758.5453;return n-Math.floor(n);};
const smoothNoise=t=>{const i=Math.floor(t),f=t-i,s=f*f*(3-2*f);return random(i)*(1-s)+random(i+1)*s;};
export function fireFlicker(time){return 1+(smoothNoise(time*3.7)-.5)*.18+(smoothNoise(time*1.3+71)-.5)*.16+(smoothNoise(time*.33+149)-.5)*.12;}
