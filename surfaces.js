import * as T from './vendor/three.module.js';

const noiseGLSL=`
float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(groundHash(i),groundHash(i+vec2(1,0)),f.x),mix(groundHash(i+vec2(0,1)),groundHash(i+vec2(1,1)),f.x),f.y);}
`;

export function wetForestMaterial(forest,map,normal,rough){
 const height=forest.texture('ground-height.jpg',43);
 const material=new T.MeshStandardMaterial({color:0xbcc1b3,map,normalMap:normal,normalScale:new T.Vector2(.95,.95),vertexColors:true,roughness:.83,roughnessMap:rough,envMapIntensity:.65});
 material.userData.surfaceUniforms={groundHeight:{value:height},groundTime:{value:0},groundDetail:{value:1}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,material.userData.surfaceUniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGroundWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vGroundWorld;uniform sampler2D groundHeight;uniform float groundTime,groundDetail;
   ${noiseGLSL}
   vec2 groundParallax(vec2 uv,vec3 view){
    if(groundDetail<.5||distance(cameraPosition,vGroundWorld)>12.0)return uv;
    float grazing=max(view.y,.28);vec2 delta=vec2(view.x,-view.z)/grazing*.009*groundDetail/8.0;
    vec2 q=uv;float layer=0.0,height=1.0-texture2D(groundHeight,q).r;
    for(int i=0;i<8;i++){if(layer<height){q-=delta;layer+=.125;height=1.0-texture2D(groundHeight,q).r;}}
    return q;
   }`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 groundView=normalize(cameraPosition-vGroundWorld);
   vec2 groundUV=groundParallax(vMapUv,groundView);
   float pools=groundNoise(vGroundWorld.xz*.36)*.66+groundNoise(vGroundWorld.xz*.91)*.34;
   float path=abs(vGroundWorld.x-(sin(vGroundWorld.z*.045)*2.0-2.0));
   float wetness=smoothstep(.45,.70,pools)*(.42+.58*(1.0-smoothstep(1.0,5.0,path)));
   float bowl=min(length((vGroundWorld.xz-vec2(-.3,2.15))/vec2(1.35,.95)),length((vGroundWorld.xz-vec2(.2,-2.4))/vec2(.95,1.7)));
   float standing=1.-smoothstep(.73+pools*.14,1.01+pools*.14,bowl);
   wetness=max(wetness,standing*.98);
   ${T.ShaderChunk.map_fragment.replaceAll('vMapUv','groundUV')}
   diffuseColor.rgb*=mix(1.0,.53,wetness);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replaceAll('vRoughnessMapUv','groundUV')+'\nroughnessFactor=mix(roughnessFactor,.105,wetness);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replaceAll('vNormalMapUv','groundUV')+`
   vec2 flow=vec2(sin(vGroundWorld.x*16.0+groundTime*2.1),cos(vGroundWorld.z*15.0-groundTime*1.8));
   vec2 cell=floor(vGroundWorld.xz*2.3),local=fract(vGroundWorld.xz*2.3);
   vec2 center=vec2(groundHash(cell),groundHash(cell+vec2(3.7,1.9)))*.64+.18;
   float age=fract(groundTime*.85+groundHash(cell+vec2(9.2,4.1))*17.);
   vec2 offset=local-center;float radius=length(offset);
   float ring=sin(radius*80.-age*16.)*exp(-abs(radius-age*.44)*34.)*(1.-age)*.038*groundDetail;
   flow=flow*.012+offset/max(radius,.001)*ring;
   vec3 waterNormal=normalize(tbn*vec3(flow,1.0));
   normal=normalize(mix(normal,waterNormal,wetness*.94));
  `);
 };
 material.customProgramCacheKey=()=> 'wet-forest-ground-1';
 return material;
}

export function ageTimber(material,roof=false){
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTimberWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvTimberWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vTimberWorld;\n${noiseGLSL}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float stain=groundNoise(vTimberWorld.xz*2.7+vTimberWorld.y*.43)*.6+groundNoise(vTimberWorld.xz*12.0)*.4;
   float rainStreak=groundNoise(vTimberWorld.xz*vec2(13.,17.)+vTimberWorld.y*.06);
   float runoff=smoothstep(.48,.78,rainStreak)*(.32+.68*smoothstep(.6,4.7,vTimberWorld.y));
   float damp=${roof?'smoothstep(.42,.74,stain)*.7':'(1.0-smoothstep(.25,1.45,vTimberWorld.y))*smoothstep(.25,.75,stain)*.7'};
   float wetTimber=clamp(damp*.7+runoff*.42,0.,.85);
   float moss=groundNoise(vTimberWorld.xz*22.+vTimberWorld.y*17.)*damp;
   diffuseColor.rgb*=mix(vec3(.94,.96,.97),vec3(.29,.39,.2),damp+moss*.25);
   diffuseColor.rgb*=1.-runoff*.23;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.38,wetTimber);roughnessFactor=mix(roughnessFactor,.95,moss);');
 };
 material.customProgramCacheKey=()=>roof?'aged-roof-3':'aged-timber-3';
 return material;
}

export function endGrainTexture(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x-size*.46)/(size*.5),v=(y-size*.53)/(size*.5),r=Math.hypot(u,v),angle=Math.atan2(v,u);
  const distort=Math.sin(angle*5+r*3)*.019+Math.sin(angle*9-r*4)*.012;
  const ring=Math.sin((r+distort)*89+Math.sin(r*18)*1.3);
  const grain=Math.sin(x*21.1+y*37.3)*.03;
  const split=Math.abs(Math.sin(angle*2.5+Math.sin(r*5)*.06));
  const crack=split<.014&&r>.24?.34:1,edge=r>.89?.7:1;
  const value=(.65+ring*.07+grain)*crack*edge,i=(y*size+x)*4;
  data.set([value*159,value*145,value*116,255],i);
 }
 const texture=new T.DataTexture(data,size,size);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
