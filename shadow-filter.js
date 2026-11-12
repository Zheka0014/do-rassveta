import * as T from './vendor/three.module.js';

// Factor the existing separable PCF-soft kernel into two bilinear comparisons
// per axis. The four weights are unchanged; the GPU performs the comparisons.
export function shadowAxis(fraction){
 const a=2-fraction,b=1+fraction;
 return {positions:[-1+1/a,1+fraction/b],weights:[a/3,b/3]};
}

const shader=`
#if defined( FOREST_HARDWARE_PCF ) && defined( SHADOWMAP_TYPE_PCF_SOFT )
 #if NUM_DIR_LIGHT_SHADOWS > 0
  uniform highp sampler2DShadow forestDirectionalCompare[ NUM_DIR_LIGHT_SHADOWS ];
 #endif
 #if NUM_SPOT_LIGHT_SHADOWS > 0
  uniform highp sampler2DShadow forestSpotCompare[ NUM_SPOT_LIGHT_SHADOWS ];
 #endif
 float forestFilteredShadow( highp sampler2DShadow map, vec2 size, float intensity, float bias, vec4 coord ) {
  vec3 q=coord.xyz/coord.w;q.z+=bias;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0)return 1.0;
  vec2 texel=1.0/size,f=fract(q.xy*size+0.5),base=q.xy-f*texel;
  vec2 a=2.0-f,b=1.0+f;
  vec2 lo=base+(-1.0+1.0/a)*texel,hi=base+(1.0+f/b)*texel;
  float value=texture(map,vec3(lo,q.z))*a.x*a.y;
  value+=texture(map,vec3(hi.x,lo.y,q.z))*b.x*a.y;
  value+=texture(map,vec3(lo.x,hi.y,q.z))*a.x*b.y;
  value+=texture(map,vec3(hi,q.z))*b.x*b.y;
  return mix(1.0,value/9.0,intensity);
 }
#endif
`;

export function installShadowFilterShader(){
 if(T.ShaderChunk.shadowmap_pars_fragment.includes('forestFilteredShadow'))return;
 T.ShaderChunk.shadowmap_pars_fragment+=shader;
 let chunk=T.ShaderChunk.lights_fragment_begin;
 for(const [kind,uniform]of [['directional','forestDirectionalCompare'],['spot','forestSpotCompare']]){
  const pattern=new RegExp('directLight\\.color \\*= \\( directLight\\.visible && receiveShadow \\) \\? getShadow\\( '+kind+'ShadowMap\\[ i \\], ([^;]+) \\) : 1\\.0;');
  chunk=chunk.replace(pattern,(original,args)=>{
   // Original arguments: size, intensity, bias, radius, projected coordinate.
   const fields=args.split(', ');if(fields.length!==5)throw new Error('Unexpected Three shadow arguments');
   const call=`forestFilteredShadow( ${uniform}[ i ], ${fields[0]}, ${fields[1]}, ${fields[2]}, ${fields[4]} )`;
   return `#if defined( FOREST_HARDWARE_PCF ) && defined( SHADOWMAP_TYPE_PCF_SOFT )\n directLight.color *= ( directLight.visible && receiveShadow ) ? ${call} : 1.0;\n#else\n ${original}\n#endif`;
  });
 }
 T.ShaderChunk.lights_fragment_begin=chunk;
}

function comparisonTarget(light){
 const shadow=light.shadow,size=shadow.mapSize;
 const depth=new T.DepthTexture(size.x,size.y,T.UnsignedIntType);
 depth.compareFunction=T.LessEqualCompare;depth.minFilter=depth.magFilter=T.LinearFilter;
 // Keep packed color depth for volumetric fog and the original filter path.
 const target=new T.WebGLRenderTarget(size.x,size.y,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true,depthTexture:depth});
 target.texture.name='forest-shadow-packed';depth.name='forest-shadow-comparison';shadow.map=target;shadow.needsUpdate=true;
 return depth;
}

export function createShadowFilter(directional,spots){
 installShadowFilterShader();
 const uniforms={forestDirectionalCompare:{value:directional.map(comparisonTarget)},forestSpotCompare:{value:spots.map(comparisonTarget)}};
 let enabled=true;const bound=new Set();
 return {uniforms,get enabled(){return enabled;},setEnabled(value){
  if(enabled===value)return;enabled=value;for(const material of bound)material.needsUpdate=true;
 },bind(scene){
  scene.traverse(object=>{
   for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){
    if(bound.has(material)||!(material.isMeshStandardMaterial||material.isMeshLambertMaterial||material.isMeshPhongMaterial||material.isMeshToonMaterial))continue;
    const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
    // Three keeps one uniform map per material when reusing cached variants.
    // Keep its schema stable even in the reference variant, or a later cached
    // hardware program would receive no comparison samplers.
    material.onBeforeCompile=(program,renderer)=>{compile.call(material,program,renderer);Object.assign(program.uniforms,uniforms);if(enabled)program.fragmentShader='#define FOREST_HARDWARE_PCF\n'+program.fragmentShader;};
    material.customProgramCacheKey=()=>key+(enabled?':forest-pcf4':':forest-pcf-original');
    material.needsUpdate=true;bound.add(material);
   }
  });
 }};
}
