// Screen-space water reflections; only wet, exposed ground traces a ray.
export const waterReflectionFragment=`
 precision highp float;varying vec2 vUv;
 uniform sampler2D tDepth,tColor;uniform mat4 inverseProjection,reflectionProjection,cameraWorld,viewWorld;
 uniform vec2 nearFar;uniform float uTime;
 float waterHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float waterNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(waterHash(i),waterHash(i+vec2(1,0)),f.x),mix(waterHash(i+vec2(0,1)),waterHash(i+vec2(1,1)),f.x),f.y);}
 float waterGround(vec2 p){float off=abs(p.x-(sin(p.y*.045)*2.-2.)),bank=clamp((off-2.1)/8.,0.,1.);float h=sin(p.y*.055)*.6+bank*(1.1+sin(p.x*.075+p.y*.042)*1.5+cos(p.y*.092)*.75);h+=bank*(sin(p.x*.35+p.y*.11)*.27+sin(p.y*.32-p.x*.18)*.22);return h*clamp((max(abs(p.x)/4.6,abs(p.y+14.)/5.)-.8)*2.,0.,1.);}
 float waterDepth(float d){return nearFar.x*nearFar.y/(nearFar.y-d*(nearFar.y-nearFar.x));}
 vec2 waterProject(vec3 p){vec4 clip=reflectionProjection*vec4(p,1.);return clip.xy/clip.w*.5+.5;}
 void main(){
  gl_FragColor=vec4(0.0);float depth=texture2D(tDepth,vUv).x;if(depth>=.9998)return;
  vec4 homogeneous=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);
  vec3 point=homogeneous.xyz/homogeneous.w,world=(cameraWorld*vec4(point,1.)).xyz;
  float dist=length(point);if(dist>28.||dist<.5)return;
  if(abs(world.y-waterGround(world.xz))>.14)return;
  if(abs(world.x)<3.5&&world.z>-18.&&world.z< -10.)return;
  float pools=waterNoise(world.xz*.36)*.66+waterNoise(world.xz*.91)*.34;
  float path=abs(world.x-(sin(world.z*.045)*2.-2.));
  float wetness=smoothstep(.45,.70,pools)*(.42+.58*(1.-smoothstep(1.,5.,path)));
  float bowl=min(length((world.xz-vec2(-.3,2.15))/vec2(1.35,.95)),length((world.xz-vec2(.2,-2.4))/vec2(.95,1.7)));
  float standing=1.-smoothstep(.73+pools*.14,1.01+pools*.14,bowl);wetness=max(wetness,standing*.98);
  if(wetness<.12)return;
  vec3 up=normalize(vec3(sin(world.x*16.+uTime*2.1)*.012,1.,cos(world.z*15.-uTime*1.8)*.012));
  vec3 normal=normalize(mat3(viewWorld)*up),ray=reflect(normalize(point),normal),origin=point+normal*.045;
  if(ray.z>-.025)return;
  float travel=.08,previous=.08,stride=.19,oldGap=-1.;
  for(int i=0;i<24;i++){
   travel+=stride;stride*=1.12;vec3 samplePoint=origin+ray*travel;
   vec2 uv=waterProject(samplePoint);if(samplePoint.z>-.1||any(lessThan(uv,vec2(.004)))||any(greaterThan(uv,vec2(.996))))break;
   float gap=-samplePoint.z-waterDepth(texture2D(tDepth,uv).x);
   if(gap>0.&&oldGap<=0.){
    float lo=previous,hi=travel;
    for(int j=0;j<4;j++){float mid=(lo+hi)*.5;vec3 p=origin+ray*mid;vec2 q=waterProject(p);float delta=-p.z-waterDepth(texture2D(tDepth,q).x);if(delta>0.)hi=mid;else lo=mid;}
    samplePoint=origin+ray*hi;uv=waterProject(samplePoint);gap=-samplePoint.z-waterDepth(texture2D(tDepth,uv).x);
    if(gap<.25&&hi>.22){
     float border=smoothstep(.0,.07,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
     float fresnel=.035+.72*pow(1.-clamp(dot(-normalize(point),normal),0.,1.),4.);
     float confidence=border*(1.-smoothstep(.10,.25,gap))*(1.-smoothstep(14.,28.,dist));
     gl_FragColor=vec4(texture2D(tColor,uv).rgb,wetness*fresnel*confidence);
    }
    return;
   }
   previous=travel;oldGap=gap;
  }
}
`;
