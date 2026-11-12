import * as T from './vendor/three.module.js';
import {MirrorView} from './mirror-view.js?v=20261113-forest48-r3';

// A tightly framed planar reflection, rendered only from inside the cabin.
export function buildCabinMirror(f,logic,wood,iron){
 const root=new T.Group();root.position.set(2.99,1.69,-14.35);root.rotation.y=-Math.PI/2;f.scene.add(root);
 const target=new T.WebGLRenderTarget(640,1024,{type:T.HalfFloatType});
 const view=new MirrorView(.82,1.30),texMatrix=view.textureMatrix;
 const material=new T.ShaderMaterial({uniforms:{reflection:{value:target.texture},textureMatrix:{value:texMatrix},lit:{value:.65}},
  vertexShader:'uniform mat4 textureMatrix;varying vec4 vMirror;varying vec2 vUv;void main(){vUv=uv;vMirror=textureMatrix*modelMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform sampler2D reflection;uniform float lit;varying vec4 vMirror;varying vec2 vUv;void main(){vec3 c=texture2DProj(reflection,vMirror).rgb;float edge=smoothstep(0.,.07,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));float stain=sin(vUv.x*83.+sin(vUv.y*11.))*sin(vUv.y*7.);c=mix(vec3(.027,.035,.025),c*vec3(.80,.86,.79)*lit,edge*.93);c+=max(0.,stain-.76)*.009;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
 const face=new T.Mesh(new T.PlaneGeometry(.82,1.30),material);root.add(face);
 for(const x of [-.47,.47]){const m=new T.Mesh(new T.BoxGeometry(.09,1.48,.065),wood);m.position.set(x,0,.035);root.add(m);}for(const y of [-.70,.70]){const m=new T.Mesh(new T.BoxGeometry(.99,.09,.065),wood);m.position.set(0,y,.035);root.add(m);}
 for(const x of [-.43,.43])for(const y of [-.67,.67]){const m=new T.Mesh(new T.SphereGeometry(.016,8,6),iron);m.position.set(x,y,.078);root.add(m);}
 const ghost=f.night.doubleRoot.children[0].clone(true);ghost.visible=false;const ghostMats=new Map();ghost.traverse(o=>{if(o.isMesh){if(!ghostMats.has(o.material)){const m=o.material.clone();m.emissive?.set(0x3d493e);m.emissiveIntensity=.12;ghostMats.set(o.material,m);}o.material=ghostMats.get(o.material);}});f.scene.add(ghost);
 const origin=new T.Vector3(2.99,1.69,-14.35),forward=new T.Vector3(),toMirror=new T.Vector3(),viewport=new T.Vector4();let last=-100,next=-Infinity;
 return {root,face,ghost,target,view,looking(){const p=f.camera.position;f.camera.getWorldDirection(forward);return p.x<2.8&&Math.abs(p.z+14.35)<2.5&&p.y>1&&p.y<2.6&&p.distanceTo(origin)<3.7&&forward.dot(toMirror.subVectors(origin,p).normalize())>.65;},update(t,state){
  const high=f.quality!=='low',width=high?640:256,height=high?1024:400;if(target.width!==width||target.height!==height)target.setSize(width,height);if(!this.looking()||t<=last||(!high&&t<next))return;
  if(!view.update(f.camera,face))return;last=t;
  // High quality follows every displayed frame. Low quality keeps a 15 Hz
  // deadline instead of restarting the interval and dropping to half rate
  // whenever a 30 Hz frame lands just short of the next capture time.
  next=high?t:Number.isFinite(next)?t+1/15-((t-next)%(1/15)):t+1/15;
  const camera=f.camera;camera.updateMatrixWorld();camera.getWorldDirection(forward);
  ghost.position.set(camera.position.x-forward.x*1.55-forward.z*.48,.23+1.86,camera.position.z-forward.z*1.55+forward.x*.48);ghost.rotation.y=Math.atan2(camera.position.x-ghost.position.x,camera.position.z-ghost.position.z);ghost.visible=state.active&&logic.mirrorFigure;
  material.uniforms.lit.value=state.flash?.92:.58;
  const oldTarget=f.renderer.getRenderTarget(),oldXr=f.renderer.xr.enabled,shadowAuto=f.renderer.shadowMap.autoUpdate,faceVisible=face.visible;f.renderer.getViewport(viewport);face.visible=false;f.viewmodel.setCaptureHidden(true);f.playerBody.setReflection(true,state,t);
  try{f.renderer.xr.enabled=false;f.renderer.shadowMap.autoUpdate=false;f.renderer.setRenderTarget(target);f.renderer.clear();f.renderer.render(f.scene,view.camera);}finally{face.visible=faceVisible;ghost.visible=false;f.playerBody.setReflection(false);f.viewmodel.setCaptureHidden(false);f.viewmodel.update(0,t,state);f.renderer.xr.enabled=oldXr;f.renderer.shadowMap.autoUpdate=shadowAuto;f.renderer.setRenderTarget(oldTarget);f.renderer.setViewport(viewport);}
 }};
}
