import * as T from './vendor/three.module.js';

const fract=x=>x-Math.floor(x);
// A periodic lattice shared by all fires: 256 KiB, no network asset or mipmaps.
// Smooth interpolation is applied to the sample coordinates in the shader.
export function volumeNoiseData(size=64){
 const data=new Uint8Array(size**3);
 for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let a=fract(x*.1031),b=fract(y*.1031),c=fract(z*.1031);
  const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);a+=d;b+=d;c+=d;
  data[x+size*(y+size*z)]=Math.round(fract((a+b)*c)*255);
 }
 return data;
}
export function createVolumeNoise(){
 const size=64,texture=new T.Data3DTexture(volumeNoiseData(size),size,size,size);
 texture.name='shared-flame-noise';texture.format=T.RedFormat;texture.type=T.UnsignedByteType;
 texture.minFilter=texture.magFilter=T.LinearFilter;
 texture.wrapS=texture.wrapT=texture.wrapR=T.RepeatWrapping;
 texture.unpackAlignment=1;texture.generateMipmaps=false;texture.needsUpdate=true;
 return texture;
}
