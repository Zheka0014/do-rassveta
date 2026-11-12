import {PLAYER_RADIUS} from './movement.js?v=20261113-forest48-r3';
// Static horizontal bounds, live obstacle references: opening doors, disarmed
// traps and newly revealed graves retain their current active/height values.
// Call invalidate() if an obstacle's horizontal bounds are moved in the future.
export class CollisionGrid {
 constructor(colliders,walls,cell=4){this.colliders=colliders;this.walls=walls;this.cell=cell;this.invalidate();}
 invalidate(){this.count=-1;this.wallCount=-1;}
 rebuild(){
  this.cells=new Map();this.global={colliders:[],walls:[]};this.empty={colliders:[],walls:[]};
  const add=(object,type,x0,x1,z0,z1)=>{
   if(![x0,x1,z0,z1].every(Number.isFinite)){this.global[type].push(object);return;}
   const ax=Math.floor(x0/this.cell),bx=Math.floor(x1/this.cell),az=Math.floor(z0/this.cell),bz=Math.floor(z1/this.cell);
   if((bx-ax+1)*(bz-az+1)>4096){this.global[type].push(object);return;}
   for(let x=ax;x<=bx;x++)for(let z=az;z<=bz;z++){const key=x+','+z;let bin=this.cells.get(key);if(!bin){bin={colliders:[],walls:[]};this.cells.set(key,bin);}bin[type].push(object);}
  };
  for(const c of this.colliders){const r=c.r+PLAYER_RADIUS;add(c,'colliders',Math.min(c.ax??c.x,c.bx??c.x)-r,Math.max(c.ax??c.x,c.bx??c.x)+r,Math.min(c.az??c.z,c.bz??c.z)-r,Math.max(c.az??c.z,c.bz??c.z)+r);}
  for(const w of this.walls)add(w,'walls',w.x-w.w/2-PLAYER_RADIUS,w.x+w.w/2+PLAYER_RADIUS,w.z-w.d/2-PLAYER_RADIUS,w.z+w.d/2+PLAYER_RADIUS);
  for(const bin of [...this.cells.values(),this.empty]){bin.colliders.push(...this.global.colliders);bin.walls.push(...this.global.walls);}
  this.count=this.colliders.length;this.wallCount=this.walls.length;
 }
 at(x,z){if(this.count!==this.colliders.length||this.wallCount!==this.walls.length)this.rebuild();return this.cells.get(Math.floor(x/this.cell)+','+Math.floor(z/this.cell))||this.empty;}
}
