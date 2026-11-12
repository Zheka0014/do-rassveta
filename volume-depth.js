import * as T from './vendor/three.module.js';

// A volume samples a separate copy: reading the depth attachment currently
// being rendered would create a framebuffer feedback loop. The first visible
// volume copies once; subsequent volumes in this camera render share it.
export class VolumeDepth {
 constructor(){this.target=null;this.frame=-1;this.source=null;this.camera=null;this.copies=0;}
 sample(renderer,camera){
  const source=renderer.getRenderTarget();
  if(!source?.depthTexture||source.samples>0||source.isWebGLCubeRenderTarget)return null;
  if(!this.target){
   this.target=new T.WebGLRenderTarget(source.width,source.height,{depthBuffer:true,stencilBuffer:false});
   this.target.depthTexture=new T.DepthTexture(source.width,source.height,source.depthTexture.type);
  }
  const resized=this.target.width!==source.width||this.target.height!==source.height;
  if(resized)this.target.setSize(source.width,source.height);
  const frame=renderer.info.render.frame;
  if(resized||this.frame!==frame||this.source!==source||this.camera!==camera){
   renderer.initRenderTarget(this.target);
   renderer.copyTextureToTexture(source.depthTexture,this.target.depthTexture);
   // copyTextureToTexture unbinds READ/DRAW_FRAMEBUFFER; restore the actual
   // draw target before Three submits the volume's triangles.
   renderer.setRenderTarget(source);
   this.frame=frame;this.source=source;this.camera=camera;this.copies++;
  }
  return this.target;
 }
 dispose(){this.target?.dispose();this.target=null;this.frame=-1;this.source=null;this.camera=null;}
}

export const volumeRayGLSL=`
 uniform sampler3D uNoise;uniform sampler2D uDepth;
 uniform vec3 uCamera;uniform vec2 uResolution;uniform mat4 uMVP,uInverseMVP;
 uniform float uHasDepth,uTime,uSteps;uniform vec2 uWind;varying vec3 vLocal;
 float volumeNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return texture(uNoise,(i+f+.5)/64.).r;}
 float volumeHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
 bool volumeInterval(vec3 ray,vec3 boxMin,vec3 boxMax,out float enter,out float leave){
  vec3 inv=mix(vec3(-1),vec3(1),step(vec3(0),ray))/max(abs(ray),vec3(.00001));
  vec3 a=(boxMin-uCamera)*inv,b=(boxMax-uCamera)*inv;
  vec3 lo=min(a,b),hi=max(a,b);enter=max(0.,max(max(lo.x,lo.y),lo.z));leave=min(min(hi.x,hi.y),hi.z);
  if(uHasDepth>.5){
   vec2 uv=gl_FragCoord.xy/uResolution;float depth=texture2D(uDepth,uv).r;
   vec4 scenePoint=uInverseMVP*vec4(uv*2.-1.,depth*2.-1.,1.);
   leave=min(leave,dot(scenePoint.xyz/scenePoint.w-uCamera,ray));
  }
  return leave>enter;
 }
 void volumeDepth(float distance,vec3 ray){vec4 p=uMVP*vec4(uCamera+ray*distance,1.);gl_FragDepth=clamp(p.z/p.w*.5+.5,0.,1.);}
`;

export function bindVolume(mesh,depth){
 const material=mesh.material,uniforms=material.uniforms;
 Object.assign(uniforms,{uCamera:{value:new T.Vector3()},uResolution:{value:new T.Vector2(1,1)},uMVP:{value:new T.Matrix4()},uInverseMVP:{value:new T.Matrix4()},uDepth:{value:null},uHasDepth:{value:0}});
 mesh.onBeforeRender=(renderer,_scene,camera)=>{
  const target=depth.sample(renderer,camera);
  uniforms.uHasDepth.value=target?1:0;uniforms.uDepth.value=target?.depthTexture||null;
  if(target)uniforms.uResolution.value.set(target.width,target.height);
  uniforms.uCamera.value.setFromMatrixPosition(camera.matrixWorld);mesh.worldToLocal(uniforms.uCamera.value);
  uniforms.uMVP.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(mesh.matrixWorld);
  uniforms.uInverseMVP.value.copy(uniforms.uMVP.value).invert();material.uniformsNeedUpdate=true;
 };
 return mesh;
}
