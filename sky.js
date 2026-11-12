import * as T from './vendor/three.module.js';

const fract=x=>x-Math.floor(x),smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
function hash(x,y){x=fract(x*.1031);y=fract(y*.103);const dot=x*(y+33.33)+y*(x+33.33);x+=dot;y+=dot;return fract((x+y)*x);}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(0,1,fract(x)),fy=smooth(0,1,fract(y));return (hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;}
function cloudDensity(x,y,detail){let sum=noise(x,y)*.53;[x,y]=[(x*.8+y*.6)*2.03,(-x*.6+y*.8)*2.03];sum+=noise(x,y)*.27;x=x*2.07+7.3;y=y*2.07+2.8;sum+=noise(x,y)*.14;if(detail)sum+=noise(x*2.01,y*2.01)*.06;return sum;}

// One distant dome renders after opaque geometry, so hidden sky pixels can
// fail the depth test. Clouds, lunar detail and stars share this single pass.
export function createNightSky(forest){
 const uniforms={uTime:{value:0},uDawn:{value:0},uLightning:{value:0},uDetail:{value:1},moonDirection:{value:forest.moonDirection}};
 const material=new T.ShaderMaterial({uniforms,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false,
  vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`precision highp float;varying vec3 vDirection;uniform float uTime,uDawn,uDetail,uLightning;uniform vec3 moonDirection;
   float h(vec2 p){p=fract(p*vec2(.1031,.103));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
   float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
   float cloud(vec2 p){float sum=n(p)*.53;p=mat2(.8,-.6,.6,.8)*p*2.03;sum+=n(p)*.27;p=p*2.07+vec2(7.3,2.8);sum+=n(p)*.14;if(uDetail>.5)sum+=n(p*2.01)*.06;return sum;}
   void main(){
    vec3 d=normalize(vDirection);float elevation=max(d.y,0.);
    float horizon=exp(-elevation*5.);
    vec3 color=mix(vec3(.0015,.003,.006),vec3(.006,.014,.019),horizon);
    vec3 morning=mix(vec3(.14,.22,.29),vec3(.32,.31,.24),horizon);
    color=mix(color,morning,uDawn);
    vec2 sphere=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.1415927+.5);
    vec2 grid=sphere*vec2(330.,170.),cell=floor(grid),local=fract(grid)-vec2(h(cell),h(cell+vec2(19.,5.)));
    float star=smoothstep(.10+fwidth(grid.x)*.5,.012,length(local))*step(.992,h(cell+vec2(3.,9.)));
    color+=star*(.12+h(cell+17.)*.22)*(1.-uDawn)*smoothstep(.03,.15,d.y);
    vec3 east=normalize(cross(moonDirection,vec3(0.,1.,0.))),north=cross(east,moonDirection);
    vec2 moonUV=vec2(dot(d,east),dot(d,north))/.009;float radius=length(moonUV);
    if(radius<1.03&&dot(d,moonDirection)>0.){
     float disc=1.-smoothstep(.96,1.03,radius);
     float maria=cloud(moonUV*3.5+vec2(12.2,4.7)),craters=n(moonUV*29.);
     float lunar=mix(.44,.95,smoothstep(.27,.72,maria))*(.88+.12*craters);
     float rim=sqrt(max(0.,1.-radius*radius));
     color+=vec3(.86,.9,.88)*lunar*disc*(.3+.7*rim)*(1.-uDawn)*3.2;
    }
    float moonDistance=length(d-moonDirection);
    color+=vec3(.019,.026,.032)*exp(-moonDistance*38.)*(1.-uDawn);
    vec2 q=d.xz/max(d.y,.13)*.44+vec2(uTime*.0021,-uTime*.0008);
    q+=vec2(n(q*.7+13.),n(q*.7+47.))*.45;
    float body=cloud(q*3.2),cover=smoothstep(.44,.69,body)*smoothstep(-.04,.17,d.y);
    float edge=clamp(body-cloud(q*3.2+moonDirection.xz*.16),0.,.22)*2.7;
    vec3 cloudColor=mix(vec3(.007,.011,.015),vec3(.013,.021,.029),edge);
    cloudColor+=vec3(.014,.019,.021)*exp(-moonDistance*6.)*(.25+edge);
    cloudColor=mix(cloudColor,vec3(.21,.24,.25)+edge*.16,uDawn);
    color=mix(color,cloudColor,cover*.94);
    color+=vec3(.20,.28,.36)*uLightning*(.35+cover*.65);gl_FragColor=vec4(color,1.);
   }`});
 const dome=new T.Mesh(new T.SphereGeometry(210,32,16),material);dome.frustumCulled=false;dome.renderOrder=10;forest.scene.add(dome);
 return {dome,uniforms,update(time,dawn,lightning=0){
  dome.position.copy(forest.camera.position);uniforms.uTime.value=time;uniforms.uDawn.value=dawn;uniforms.uLightning.value=lightning;const detail=forest.quality!=='low';uniforms.uDetail.value=detail?1:0;
  const moon=forest.moonDirection;let x=moon.x/Math.max(moon.y,.13)*.44+time*.0021,y=moon.z/Math.max(moon.y,.13)*.44-time*.0008;
  const wx=noise(x*.7+13,y*.7+13),wy=noise(x*.7+47,y*.7+47);x+=wx*.45;y+=wy*.45;
  return 1-smooth(.44,.69,cloudDensity(x*3.2,y*3.2,detail))*.68;
 }};
}
