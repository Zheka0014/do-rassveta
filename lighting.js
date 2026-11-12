import * as T from './vendor/three.module.js';

// The projector contains a hot spot and faint reflector rings, in linear light.
export function flashlightCookie(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,r=Math.hypot(u,v),i=(y*size+x)*4;
  const core=Math.exp(-r*r*15),spill=Math.max(0,1-r*r)*.32;
  const ring=Math.exp(-Math.pow((r-.66)/.035,2))*.036;
  const energy=Math.min(1,core*.72+spill+ring);
  const grain=1+Math.sin(x*1.37+y*4.31)*.012;
  data[i]=255*Math.pow(Math.min(1,energy*grain),1/2.2);data[i+1]=255*Math.pow(Math.min(1,energy*.985*grain),1/2.2);data[i+2]=255*Math.pow(Math.min(1,energy*.92*grain),1/2.2);data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

export function configureMoon(light){
 light.castShadow=true;light.shadow.mapSize.set(1536,1536);light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
 Object.assign(light.shadow.camera,{left:-37,right:37,top:37,bottom:-37,near:.5,far:240});light.shadow.camera.updateProjectionMatrix();
 light.shadow.bias=-.00012;light.shadow.normalBias=.11;
}
