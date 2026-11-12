// A toroidal patch keeps rain in world space. Only drops beyond its far edge
// move with the viewer; walking or turning never drags nearby drops sideways.
export function wrapRainCoordinate(value,center,width){
 const min=center-width*.5;
 if(value>=min&&value<min+width)return value;
 return min+((value-min)%width+width)%width;
}

export class RainField{
 constructor({count=1400,width=65,top=26,random=Math.random,surfaceAt=()=>0}={}){
  this.count=count;this.width=width;this.top=top;this.surfaceAt=surfaceAt;
  this.positions=new Float32Array(count*6);this.distance=0;this.initialized=false;
  this.x=new Float64Array(count);this.z=new Float64Array(count);
  this.stop=new Float64Array(count);this.span=new Float64Array(count);
  this.phase=new Float64Array(count);this.speed=new Float64Array(count);this.length=new Float64Array(count);
  for(let i=0;i<count;i++){
   this.x[i]=(random()-.5)*width;this.z[i]=(random()-.5)*width;
   this.phase[i]=random();this.speed[i]=.9+random()*.2;this.length[i]=.26+random()*.2;
  }
 }
 update(dt,cameraX,cameraZ,storm=0){
  const falling=Number.isFinite(dt)&&dt>0;
  if(falling)this.distance+=dt*(15+8*Math.max(0,Math.min(1,storm)));
  let changed=false;
  const p=this.positions;
  for(let i=0;i<this.count;i++){
   const x=this.initialized?wrapRainCoordinate(this.x[i],cameraX,this.width):cameraX+this.x[i];
   const z=this.initialized?wrapRainCoordinate(this.z[i],cameraZ,this.width):cameraZ+this.z[i];
   const relocated=!this.initialized||x!==this.x[i]||z!==this.z[i];
   if(!falling&&!relocated)continue;
   const j=i*6;
   if(relocated){
    this.x[i]=x;this.z[i]=z;
    const height=this.surfaceAt(x,z);
    this.stop[i]=Number.isFinite(height)?height:0;
    this.span[i]=Math.max(.5,this.top-this.stop[i]);
    p[j]=x;p[j+2]=z;p[j+3]=x-.05;p[j+5]=z;
   }
   // Evaluate a continuous fall distance rather than resetting to the top on
   // an impact frame. Overshoot survives resets, large dt and camera teleports.
   const span=this.span[i],stop=this.stop[i];
   const y=stop+span-(this.phase[i]*span+this.distance*this.speed[i])%span;
   p[j+1]=y;p[j+4]=Math.max(stop,y-this.length[i]);
   changed=true;
  }
  this.initialized=true;
  return changed;
 }
}
