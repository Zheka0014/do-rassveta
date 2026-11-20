import * as T from './vendor/three.module.js';
import {waterReflectionFragment} from './reflection.js?v=20261120-forest50';

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const reconstruction=`
 uniform sampler2D tDepth;uniform mat4 inverseProjection;
 vec3 viewPoint(vec2 uv,float depth){vec4 p=inverseProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return p.xyz/p.w;}
`;

export class ForestPost {
 constructor(renderer,camera,moonlight,moonDirection){
  this.renderer=renderer;this.camera=camera;this.moonlight=moonlight;
  this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
  this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  this.effects=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
  this.reflections=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
  this.bloomA=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});this.bloomB=this.bloomA.clone();
  this.bloomUniforms={source:{value:this.target.texture},direction:{value:new T.Vector2()},extract:{value:1}};
  this.bloomMaterial=new T.ShaderMaterial({uniforms:this.bloomUniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,fragmentShader:`
   precision highp float;varying vec2 vUv;uniform sampler2D source;uniform vec2 direction;uniform float extract;
   vec3 sampleLight(vec2 uv){vec3 c=texture2D(source,uv).rgb;if(extract>.5){float lum=dot(c,vec3(.2126,.7152,.0722));c*=smoothstep(.55,1.25,lum);c=min(c,vec3(5.));}return c;}
   void main(){vec3 c=sampleLight(vUv)*.227027;c+=(sampleLight(vUv+direction*1.384615)+sampleLight(vUv-direction*1.384615))*.316216;c+=(sampleLight(vUv+direction*3.230769)+sampleLight(vUv-direction*3.230769))*.070270;gl_FragColor=vec4(c,1.);}
  `});
  this.uniforms={tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},tEffects:{value:this.effects.texture},inverseProjection:{value:camera.projectionMatrixInverse},resolution:{value:new T.Vector2()},effectResolution:{value:new T.Vector2()},projectionScale:{value:new T.Vector2()},nearFar:{value:new T.Vector2(camera.near,camera.far)},uTime:{value:0},uLight:{value:1},uDawn:{value:0},uAO:{value:1},uCinema:{value:1},uDanger:{value:0},uHurt:{value:0},cameraWorld:{value:camera.matrixWorld},uFires:{value:[new T.Vector4(),new T.Vector4(),new T.Vector4()]}};
  Object.assign(this.uniforms,{tReflections:{value:this.reflections.texture},tBloom:{value:this.bloomB.texture},reflectionProjection:{value:camera.projectionMatrix},viewWorld:{value:camera.matrixWorldInverse},tMoonShadow:{value:null},moonShadowMatrix:{value:moonlight.shadow.matrix},moonDirection:{value:moonDirection},uMoonShadow:{value:0},uMoonPower:{value:1},tTorchShadow:{value:null},torchShadowMatrix:{value:new T.Matrix4()},torchPosition:{value:new T.Vector3()},torchDirection:{value:new T.Vector3()},uTorchShadow:{value:0}});
  this.reflectionMaterial=new T.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,fragmentShader:waterReflectionFragment});
  this.effectMaterial=new T.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,fragmentShader:`
   precision highp float;varying vec2 vUv;
   ${reconstruction}
   uniform mat4 cameraWorld,moonShadowMatrix;uniform vec4 uFires[3];uniform vec2 projectionScale;
   uniform sampler2D tMoonShadow;uniform vec3 moonDirection;uniform float uMoonShadow,uMoonPower;
   uniform sampler2D tTorchShadow;uniform mat4 torchShadowMatrix;uniform vec3 torchPosition,torchDirection;uniform float uTorchShadow;
   uniform float uTime,uLight,uDawn;
   #include <packing>
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float mistNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float groundLevel(vec2 p){float off=abs(p.x-(sin(p.y*.045)*2.-2.));float bank=clamp((off-2.1)/8.,0.,1.);return sin(p.y*.055)*.6+bank*(1.1+sin(p.x*.075+p.y*.042)*1.5+cos(p.y*.092)*.75);}
   void main(){
    float depth=texture2D(tDepth,vUv).x;
    if(depth>=.9998){gl_FragColor=vec4(0.0);return;}
    vec3 point=viewPoint(vUv,depth),ray=normalize(point);
    float dist=length(point),ao=0.0;
    vec3 normal=normalize(cross(dFdx(point),dFdy(point)));
    float angle=hash(floor(gl_FragCoord.xy))*6.2831853;
    vec2 direction=vec2(cos(angle),sin(angle));
    vec2 radius=projectionScale*clamp(.32/max(.1,-point.z),.0005,.027);
    for(int i=0;i<8;i++){
     vec2 uv=clamp(vUv+direction*radius*(.35+float(i)*.095),vec2(.001),vec2(.999));
     direction=mat2(-.737368,-.67549,.67549,-.737368)*direction;
     vec3 delta=viewPoint(uv,texture2D(tDepth,uv).x)-point;float len=length(delta);
     ao+=max(dot(normal,delta/max(len,.0001))-.1,0.0)*(1.-smoothstep(.12,1.35,len));
    }
    vec3 worldRay=mat3(cameraWorld)*ray,origin=cameraWorld[3].xyz;
    float lengthInFog=min(dist,64.0),optical=0.0,fireMist=0.0;
    for(int i=0;i<3;i++){
     vec3 w=origin+worldRay*lengthInFog*(float(i)+.5)/3.;float above=max(0.,w.y-groundLevel(w.xz));
     float density=exp(-above*.8)*(.42+.58*mistNoise(w.xz*.14+vec2(uTime*.018,0.0)))*.0042;
     float sheltered=step(abs(w.x),3.2)*step(-17.2,w.z)*step(w.z,-10.8);
     optical+=density*(1.-sheltered*.97)*lengthInFog/3.;
    }
    for(int j=0;j<3;j++){
     float along=dot(uFires[j].xyz-origin,worldRay);
     if(uFires[j].w>.5&&along>0.0&&along<lengthInFog){vec3 delta=origin+worldRay*along-uFires[j].xyz;fireMist+=optical*exp(-dot(delta,delta)*.18);}
    }
    float moonMist=0.;
    if(uMoonShadow>.5){
     float reach=min(dist,32.),jitter=angle/6.2831853-.5;
     for(int i=0;i<6;i++){
      vec3 w=origin+worldRay*reach*(float(i)+.5+jitter*.75)/6.;
      vec4 s=moonShadowMatrix*vec4(w,1.);vec3 q=s.xyz/s.w;
      if(all(greaterThan(q,vec3(.001)))&&all(lessThan(q,vec3(.999)))){
       float shadowDepth=unpackRGBAToDepth(texture2D(tMoonShadow,q.xy));
       float open=step(q.z-.00025,shadowDepth);if(open<=0.)continue;
       float above=max(0.,w.y-groundLevel(w.xz));
       float cabin=step(abs(w.x),3.3)*step(-17.5,w.z)*step(w.z,-10.4);
       moonMist+=open*exp(-above*.055)*.0035*reach/6.*(1.-cabin);
      }
     }
    }
    float phase=.18+.82*pow(max(0.,dot(worldRay,moonDirection)),6.);
    float cone=smoothstep(.86,.985,-ray.z);
    float haze=(1.-exp(-min(dist,28.0)*.033))*cone*uLight*.045;
    if(uTorchShadow>.5&&uLight>.01){
     float reach=min(dist,25.),beam=0.;
     for(int i=0;i<6;i++){
      vec3 w=origin+worldRay*reach*(float(i)+.55)/6.;vec3 fromTorch=w-torchPosition;float d=length(fromTorch);
      float spot=smoothstep(.906,.977,dot(fromTorch/max(d,.001),torchDirection));if(spot<=0.)continue;
      vec4 sc=torchShadowMatrix*vec4(w,1.);vec3 q=sc.xyz/sc.w;float open=0.;
      if(sc.w>0.&&all(greaterThan(q,vec3(.001)))&&all(lessThan(q,vec3(.999))))open=step(q.z-.0012,unpackRGBAToDepth(texture2D(tTorchShadow,q.xy)));
      if(open<=0.)continue;
      float density=.45+.55*mistNoise(w.xz*.26+vec2(uTime*.015,-uTime*.008));
      float cabin=step(abs(w.x),3.3)*step(-17.5,w.z)*step(w.z,-10.4);
      float train=step(abs(w.x-24.),1.65)*step(abs(w.z-52.),8.6);
      float cover=max(cabin,train);float above=max(0.,w.y-groundLevel(w.xz));
      beam+=open*spot*density*(1.-cover*.78)*exp(-above*.13)*reach/6./(1.+d*d*.017);
     }
     haze=min(.17,beam*.024)*uLight;
    }
    gl_FragColor=vec4(clamp(ao*.19,0.,.44),1.-exp(-optical),fireMist,haze+moonMist*phase*1.4*uMoonPower);
   }`});
  this.material=new T.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,vertexShader:vertex,fragmentShader:`
   precision highp float;varying vec2 vUv;
   ${reconstruction}
   uniform sampler2D tColor,tEffects,tReflections,tBloom;uniform vec2 resolution,effectResolution,nearFar;
   uniform float uTime,uLight,uDawn,uAO,uCinema,uDanger,uHurt;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float forestLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
   float viewDepth(float d){return nearFar.x*nearFar.y/(nearFar.y-d*(nearFar.y-nearFar.x));}
   void main(){
    vec3 base=texture2D(tColor,vUv).rgb,color=base;float depth=texture2D(tDepth,vUv).x;
    if(uAO>.5&&depth<.9998){
     // Bilateral upsampling keeps low-resolution fog and AO off nearby edges.
     vec2 p=vUv*effectResolution-.5,base=floor(p),fraction=fract(p);
     vec4 effect=vec4(0.0),reflection=vec4(0.0);float weight=0.0,center=viewDepth(depth);
     for(int i=0;i<4;i++){
      vec2 corner=vec2(float(i-i/2*2),float(i/2));vec2 uv=(base+corner+.5)/effectResolution;
      float difference=abs(viewDepth(texture2D(tDepth,uv).x)-center);
      vec2 blend=mix(vec2(1.)-fraction,fraction,corner);
      float w=blend.x*blend.y/(1.+difference*24./max(1.,center*.06));
      effect+=texture2D(tEffects,uv)*w;reflection+=texture2D(tReflections,uv)*w;weight+=w;
     }
     effect/=max(weight,.0001);reflection/=max(weight,.0001);color=mix(color,reflection.rgb,clamp(reflection.a,0.,.65));color*=1.-effect.r;
     color=mix(color,mix(vec3(.048,.075,.084),vec3(.21,.24,.2),uDawn),effect.g);
     color+=vec3(.21,.08,.019)*effect.b+vec3(.18,.24,.30)*effect.a;
    }
    vec2 pixel=1./resolution;
    vec3 north=texture2D(tColor,vUv+vec2(0,pixel.y)).rgb,south=texture2D(tColor,vUv-vec2(0,pixel.y)).rgb;
    vec3 east=texture2D(tColor,vUv+vec2(pixel.x,0)).rgb,west=texture2D(tColor,vUv-vec2(pixel.x,0)).rgb;
    float hi=max(max(forestLuma(north),forestLuma(south)),max(forestLuma(east),forestLuma(west)));
    float lo=min(min(forestLuma(north),forestLuma(south)),min(forestLuma(east),forestLuma(west)));
    // Soften high-contrast edges without blurring leaf and bark textures.
    vec3 around=(north+south+east+west)*.25;
    float edge=smoothstep(max(.06,hi*.22),max(.13,hi*.45),hi-lo)*.17;
    color=mix(color,around,edge);
    if(uCinema>.01){
     // Cinematic lens. Fine detail gets a light unsharp mask away from hard edges.
     color+=(base-around)*.28*uCinema*(1.-smoothstep(.02,.10,hi-lo));
     // Red and blue drift apart toward the corners, further while something hunts you.
     vec2 fromCentre=vUv-.5;vec2 shift=fromCentre*dot(fromCentre,fromCentre)*(.006+uDanger*.012)*uCinema;
     color.r+=texture2D(tColor,vUv+shift).r-base.r;color.b+=texture2D(tColor,vUv-shift).b-base.b;
    }
    // Halation: bright fire and torch light bleed warm into the film.
    if(uAO>.5){vec3 bloom=texture2D(tBloom,vUv).rgb;color+=bloom*.10+bloom*vec3(1.,.58,.28)*.12*uCinema;}
    float vignette=smoothstep(.8,.18,length((vUv-.5)*vec2(1.05,1.0)));
    color*=mix(.81-.08*uCinema-.14*uDanger*uCinema,1.,vignette);
    float lum=forestLuma(color);color=mix(vec3(lum),color,.83+uDawn*.12);color*=vec3(.96,1.01,1.025);
    if(uCinema>.01){
     // Split toning: cool night shadows, warm firelit highlights; eased at dawn.
     vec3 graded=color*mix(vec3(.93,1.01,1.07),vec3(1.08,1.,.90),smoothstep(.015,.32,lum));
     color=mix(color,graded,uCinema*(1.-uDawn*.65));
     // Wounds and the hunt drain the colour out of the night.
     color=mix(color,vec3(forestLuma(color)),clamp(uHurt*.42+uDanger*.20,0.,.55)*uCinema);
     lum=forestLuma(color);
    }
    float grain=(hash(gl_FragCoord.xy+fract(uTime)*379.)-.5)*(.006+.008*uCinema);
    color+=grain*max(.05,pow(lum,.35));
    gl_FragColor=vec4(max(color,vec3(0.)),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.scene=new T.Scene();this.ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);this.resize();
 }
 resize(){
  const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.target.setSize(size.x,size.y);
  this.effects.setSize(Math.max(1,Math.ceil(size.x/2)),Math.max(1,Math.ceil(size.y/2)));
  this.reflections.setSize(this.effects.width,this.effects.height);
  this.bloomA.setSize(Math.max(1,Math.ceil(size.x/4)),Math.max(1,Math.ceil(size.y/4)));this.bloomB.setSize(this.bloomA.width,this.bloomA.height);
  this.uniforms.resolution.value.copy(size);this.uniforms.effectResolution.value.set(this.effects.width,this.effects.height);
  this.uniforms.projectionScale.value.set(this.camera.projectionMatrix.elements[0],this.camera.projectionMatrix.elements[5]);
 }
 render(scene,time,light,dawn,high){
  this.uniforms.uTime.value=time;this.uniforms.uLight.value=light?1:0;this.uniforms.uDawn.value=dawn;this.uniforms.uAO.value=high?1:0;
  this.uniforms.uMoonPower.value=this.moonlight.intensity/(.65+dawn*2);
  this.renderer.setRenderTarget(this.target);this.renderer.render(scene,this.camera);this.sceneCalls=this.renderer.info.render.calls;this.sceneTriangles=this.renderer.info.render.triangles;
  if(high){
   this.uniforms.tMoonShadow.value=this.moonlight.shadow.map?.texture||null;if(this.flashLight){this.flashLight.getWorldPosition(this.uniforms.torchPosition.value);this.flashLight.target.getWorldPosition(this.uniforms.torchDirection.value).sub(this.uniforms.torchPosition.value).normalize();this.uniforms.torchShadowMatrix.value.copy(this.flashLight.shadow.matrix);this.uniforms.tTorchShadow.value=this.flashLight.shadow.map?.texture||null;this.uniforms.uTorchShadow.value=high&&this.flashLight.shadow.map?1:0;}
  this.uniforms.uMoonShadow.value=this.moonlight.shadow.map&&this.renderer.shadowMap.enabled?1:0;
   this.quad.material=this.reflectionMaterial;this.renderer.setRenderTarget(this.reflections);this.renderer.render(this.scene,this.ortho);
   this.quad.material=this.effectMaterial;this.renderer.setRenderTarget(this.effects);this.renderer.render(this.scene,this.ortho);
   this.quad.material=this.bloomMaterial;this.bloomUniforms.source.value=this.target.texture;this.bloomUniforms.extract.value=1;this.bloomUniforms.direction.value.set(1/this.bloomA.width,0);this.renderer.setRenderTarget(this.bloomA);this.renderer.render(this.scene,this.ortho);
   this.bloomUniforms.source.value=this.bloomA.texture;this.bloomUniforms.extract.value=0;this.bloomUniforms.direction.value.set(0,1/this.bloomB.height);this.renderer.setRenderTarget(this.bloomB);this.renderer.render(this.scene,this.ortho);
  }
  this.quad.material=this.material;this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.ortho);
 }
}
