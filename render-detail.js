// Visual rain collision only: player terrain and shelter tests stay exact.
export class RainSurfaceCache{
 constructor(sample,cell=.75){this.sample=sample;this.cell=cell;this.heights=new Map();}
 get(x,z){
  const ix=Math.floor(x/this.cell),iz=Math.floor(z/this.cell),key=ix+','+iz;
  if(this.heights.has(key))return this.heights.get(key);
  if(this.heights.size>=4096)this.heights.clear();
  // Roof boundaries need a conservative top, so drops stop on the eaves.
  const x0=ix*this.cell,z0=iz*this.cell,c=this.cell;
  const top=Math.max(this.sample(x0,z0),this.sample(x0+c,z0),this.sample(x0,z0+c),this.sample(x0+c,z0+c),this.sample(x0+c*.5,z0+c*.5));
  this.heights.set(key,top);return top;
 }
}
