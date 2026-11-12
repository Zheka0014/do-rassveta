import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
export function buildCrate(f,parent,wood,iron,width=.9,depth=.64,height=.62){
 function batch(p){const bins=new Map();return {box(w,h,d,x,y,z,m){const g=new T.BoxGeometry(w,h,d).translate(x,y,z);if(!bins.has(m))bins.set(m,[]);bins.get(m).push(g);},done(){for(const [m,gs]of bins){const o=new T.Mesh(mergeGeometries(gs,false),m);o.castShadow=o.receiveShadow=true;p.add(o);gs.forEach(g=>g.dispose());}}};}
 const dark=f.material(0x24281e,{roughness:1}),b=batch(parent),thick=.055;
 b.box(width,.05,depth,0,.03,0,wood);
 for(const x of [-1,1])b.box(thick,height,depth,x*(width-thick)*.5,height*.5,0,wood);
 for(const z of [-1,1]){b.box(width,height,thick,0,height*.5,z*(depth-thick)*.5,wood);for(const x of [-.32,.32])b.box(.045,height+.025,.014,x,height*.5,z*(depth*.5+.008),iron);}
 b.box(width-.13,.025,depth-.13,0,.063,0,dark);b.done();
 const lid=new T.Group();lid.position.set(0,height,-depth*.5);parent.add(lid);const l=batch(lid);l.box(width+.035,.065,depth+.035,0,.02,depth*.5,wood);for(const x of [-.32,.32])l.box(.05,.025,depth+.05,x,.065,depth*.5,iron);l.box(.13,.16,.018,0,-.045,depth+.02,iron);l.done();
 const supplies=new T.Group();parent.add(supplies);const s=batch(supplies);for(const x of [-.19,.17]){s.box(.19,.24,.16,x,.2,.035,dark);s.box(.17,.018,.16,x,.33,.035,iron);}s.done();
 let amount=0;
 return {lid,supplies,reset(){amount=0;lid.rotation.x=0;supplies.visible=true;},update(dt,opened,empty=false){const before=amount;amount=T.MathUtils.damp(amount,opened?1:0,6,dt);if(Math.abs(amount-before)>.008&&parent.getWorldPosition(new T.Vector3()).distanceToSquared(f.camera.position)<625)f.flash.shadow.needsUpdate=true;lid.rotation.x=-amount*1.85;supplies.visible=!empty;}};
}
