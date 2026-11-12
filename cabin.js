import * as T from './vendor/three.module.js';
import {batchStaticMeshes} from './render-batching.js?v=20261113-forest48-r3';
import {ageTimber,endGrainTexture} from './surfaces.js?v=20261113-forest48-r3';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';

// Individual timbers retain their grain and uneven silhouette; geometry is
// batched by material so the detail does not add hundreds of draw calls.
export function buildCabin(forest){
 const root=new T.Group();root.position.z=-14;forest.scene.add(root);
 const rng=(()=>{let n=187;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};})();
 const tex=(file,color=false)=>forest.texture(file,1,color);
 const wood=new T.MeshStandardMaterial({color:0xa9aca3,map:tex('weathered_planks-diff-2k.jpg',true),normalMap:tex('weathered_planks-nor_gl-2k.jpg'),normalScale:new T.Vector2(1.,1.),roughnessMap:tex('weathered_planks-rough-2k.jpg'),roughness:1});
 const bark=new T.MeshStandardMaterial({color:0xaeb3a4,map:tex('bark-color-2k.jpg',true),normalMap:tex('bark-normal-2k.jpg'),normalScale:new T.Vector2(1.35,1.35),roughnessMap:tex('bark-arm-2k.jpg'),roughness:1});
 const endwood=wood.clone();endwood.color.set(0x787a68);
 const endgrain=new T.MeshStandardMaterial({color:0xb0a591,map:endGrainTexture(),roughness:.94});
 const iron=new T.MeshStandardMaterial({color:0x282b29,metalness:.65,roughness:.83});
 const stone=new T.MeshStandardMaterial({color:0x676f65,map:tex('ground-color.jpg',true),normalMap:tex('ground-normal.jpg'),roughness:1});
 const slate=new T.MeshStandardMaterial({color:0x737c78,map:tex('grey_roof_01-diff-2k.jpg',true),normalMap:tex('grey_roof_01-nor_gl-2k.jpg'),normalScale:new T.Vector2(1.2,1.2),roughnessMap:tex('grey_roof_01-rough-2k.jpg'),roughness:1,side:T.DoubleSide});
 ageTimber(bark);ageTimber(wood);ageTimber(slate,true);
 const groups=new Map();
 function add(g,mat,p=[0,0,0],r=[0,0,0]){const m=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...r)),new T.Vector3(1,1,1));g.applyMatrix4(m);if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(g);}
 function board(w,h,d,x,y,z,rx=0,ry=0,rz=0,mat=wood){
  const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv,offset=Math.floor(rng()*10)*.1;
  if(h>w*2&&d<.12){const p=g.attributes.position,left=rng()*.045,right=rng()*.06;for(let i=0;i<p.count;i++)if(p.getY(i)>0)p.setY(i,p.getY(i)-(p.getX(i)<0?left:right));g.computeVertexNormals();}
  for(let i=0;i<uv.count;i++)uv.setXY(i,offset+uv.getX(i)*.078,uv.getY(i)*Math.max(h,w,d)/2.5);
  add(g,mat,[x,y,z],[rx,ry,rz]);
 }
 function beam(a,b,r=.09,mat=wood){
  const pa=new T.Vector3(...a),pb=new T.Vector3(...b),dir=pb.clone().sub(pa),g=new T.CylinderGeometry(r*.9,r,dir.length(),10,2);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize()));add(g,mat,pa.add(pb).multiplyScalar(.5).toArray());
 }
 function log(a,b,y,fixed,axis='x'){
  const length=b-a,r=.142+rng()*.012,g=new T.CylinderGeometry(r*.97,r,length,16,Math.ceil(length*3),true),p=g.attributes.position,uv=g.attributes.uv,phase=rng()*6;
  for(let i=0;i<p.count;i++){const py=p.getY(i),bend=Math.sin(py*1.7+phase)*.009;const bulge=1+Math.sin(py*9+phase)*.045;p.setX(i,p.getX(i)*bulge+bend);p.setZ(i,p.getZ(i)*bulge);uv.setXY(i,uv.getX(i)*.52+phase,uv.getY(i)*length*.72+phase);}
  g.computeVertexNormals();g.rotateZ(-Math.PI/2);if(axis==='z')g.rotateY(Math.PI/2);
  add(g,bark,axis==='x'?[(a+b)/2,y,fixed]:[fixed,y,(a+b)/2]);
  for(const end of [a,b]){
   const cap=new T.CircleGeometry(r*.97,16);if(axis==='x')cap.rotateY(end===a?-Math.PI/2:Math.PI/2);else if(end===a)cap.rotateY(Math.PI);
   const p=axis==='x'?[end,y,fixed]:[fixed,y,end];add(cap,endgrain,p);
  }
 }
 // Rubble foundation and worn raised floor.
 for(let side=0;side<4;side++)for(let i=0;i<10;i++){
  const g=new T.IcosahedronGeometry(.34+rng()*.09,1);g.scale(1,.57,.75);
  const v=-3.1+i*.69;add(g,stone,side<2?[v,.05,side===0?3.16:-3.16]:[side===2?-3.16:3.16,.05,v],[rng()*.15,rng()*6,0]);
 }
 for(let i=0;i<24;i++){
  const x=-3.04+i*.266,lean=(rng()-.5)*.008;
  if(Math.abs(x)<.98){board(.26,.075,1.60,x,.19,2.37,0,0,lean);board(.26,.075,.56,x,.19,-2.895,0,0,lean);}
  else board(.26,.075,6.35,x,.19,0,0,0,lean);
 }
 for(let row=0;row<13;row++){
  const y=.38+row*.234,jitter=(rng()-.5)*.026,extension=row%2?.14:.28;
  log(-3.24-extension,3.24+extension,y,-3.2);
  log(-3.3-extension,3.3+extension,y+.07,-3.18,'z');
  // A side window also opens into the interior.
  if(y>1.3&&y<2.25){log(-3.5,-.74,y+.07,3.18,'z');log(.74,3.5,y+.07,3.18,'z');}
  else log(-3.3-extension,3.3+extension,y+.07,3.18,'z');
  if(y>2.45)log(-3.24-extension,3.24+extension,y,3.2+jitter);
  else for(const sign of [-1,1]){
   if(y>1.15&&y<2.3){log(sign<0?-3.24-extension:.84,sign<0?-2.76:1.28,y,3.2+jitter);log(sign<0?-1.28:2.76,sign<0?-.84:3.24+extension,y,3.2+jitter);}
   else log(sign<0?-3.24-extension:.84,sign<0?-.84:3.24+extension,y,3.2+jitter);
  }
 }
 // Weatherboard gables follow the pitch, with a few split ends.
 for(const z of [-3.22,3.22])for(let i=0;i<27;i++){
  const x=-3.12+i*.24,h=1.44*(1-Math.abs(x)/3.38);
  if(h>.02)board(.229,h,.065,x,3.27+h/2,z,0,0,(rng()-.5)*.012);
 }
 // Rafters remain visible through missing shingles near the front right eave.
 for(let i=0;i<10;i++)for(const side of [-1,1])beam([0,4.72,-3.52+i*.77],[side*3.64,3.14,-3.52+i*.77],.075);
 beam([0,4.68,-3.8],[0,4.68,3.85],.13);
 for(const side of [-1,1]){
  for(let row=0;row<6;row++)beam([side*(.4+row*.58),4.48-row*.25,-3.63],[side*(.4+row*.58),4.48-row*.25,3.7],.043);
  // Separate overlapping strips produce real edges and irregular eaves.
  for(let row=0;row<8;row++)for(let col=0;col<18;col++){
   if(side===1&&row>5&&col>14&&rng()>.25)continue;
   const x=(row+.5)*.46,z=-3.68+(col+.5)*.419;
   const g=new T.PlaneGeometry(.515,.445,1,1),p=g.attributes.position,uv=g.attributes.uv,tileX=Math.floor(rng()*10),tileY=Math.floor(rng()*10);
   for(let k=0;k<p.count;k++){
    const px=x+p.getX(k),pz=z+p.getY(k);p.setXYZ(k,side*px,4.78-px*.425-row*.003+(rng()-.5)*.055,pz);
    uv.setXY(k,(tileX+uv.getX(k))*.1,(tileY+uv.getY(k))*.1);
   }
   g.computeVertexNormals();add(g,slate);
  }
  beam([0,4.76,3.8],[side*3.72,3.17,3.8],.085);
 }
 // Deep frames, inset glass, shutters and sills replace the old glowing cube.
 const glass=new T.MeshStandardMaterial({color:0x414435,emissive:0xb77732,emissiveIntensity:.08,metalness:.05,roughness:.22,transparent:true,opacity:.27,envMapIntensity:.9,side:T.DoubleSide});
 function windowAt(x,y,z,side=false){
  const g=new T.Group();g.position.set(x,y,z);if(side)g.rotation.y=Math.PI/2;root.add(g);
  function piece(w,h,d,px,py,pz,mat=wood){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(px,py,pz);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;}
  for(const sx of [-.79,.79])piece(.115,1.27,.2,sx,0,.04);
  for(const sy of [-.59,.59])piece(1.7,.13,.22,0,sy,.06);
  piece(1.84,.09,.36,0,-.67,.1);piece(.046,1.1,.06,0,0,.035);piece(1.46,.045,.06,0,0,.035);
  const panes=[[-.73,-.54,-.73,.54,-.035,.54,-.035,-.1,-.26,.05,-.37,-.29], [.035,.54,.73,.54,.73,-.1,.53,-.27,.31,-.09,.035,-.3], [.73,-.54,.73,-.21,.56,-.34,.48,-.54]];
  for(const vertices of panes){const shape=new T.Shape();shape.moveTo(vertices[0],vertices[1]);for(let i=2;i<vertices.length;i+=2)shape.lineTo(vertices[i],vertices[i+1]);shape.closePath();const pane=new T.Mesh(new T.ShapeGeometry(shape),glass);pane.position.z=-.055;g.add(pane);}
  const shutter=new T.Group();shutter.position.set(-.9,0,.1);shutter.rotation.set(0,-.36,-.07);g.add(shutter);
  for(let n=0;n<4;n++){const m=new T.Mesh(new T.BoxGeometry(.16,1.12,.035),wood);m.position.x=-.1-n*.17;m.castShadow=true;shutter.add(m);}
  for(const sy of [-.36,.36]){const m=new T.Mesh(new T.BoxGeometry(.64,.08,.055),endwood);m.position.set(-.36,sy,.04);shutter.add(m);}
  const broken=piece(1.64,.11,.055,.02,-.18,.18,endwood);broken.rotation.z=.24;
 }
 windowAt(-2.02,1.74,3.27);windowAt(2.02,1.74,3.27);windowAt(3.27,1.78,0,true);
 // Thick jamb, open sagging plank door and forged hinges.
 for(const x of [-.89,.89])board(.18,2.52,.27,x,1.47,3.22);
 board(1.96,.2,.28,0,2.72,3.23);board(1.66,.09,.34,0,.27,3.27);
 const door=new T.Group();door.position.set(-.8,.29,3.15);door.rotation.set(0,-1.34,-.025);root.add(door);
 for(let n=0;n<7;n++){
  const height=2.25-(n===6?.07:0),shape=new T.Shape();
  shape.moveTo(-.112,-height/2);shape.lineTo(.112,-height/2+.017*(n%3));shape.lineTo(.112,height/2-.035*(n%2));shape.lineTo(.046,height/2);shape.lineTo(.02,height/2-.12*(n%3===0?1:0));shape.lineTo(-.011,height/2-.03);shape.lineTo(-.112,height/2-.012*(n%3));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:false}),uv=g.attributes.uv,p=g.attributes.position;g.translate(0,0,-.0375);
  for(let i=0;i<uv.count;i++)uv.setXY(i,n*.1+(p.getX(i)+.112)/.224*.086,(p.getY(i)+height/2)/height);
  const m=new T.Mesh(g,wood);m.position.set(.115+n*.229,1.13,0);m.castShadow=m.receiveShadow=true;door.add(m);
 }
 for(const y of [.45,1.85]){const m=new T.Mesh(new T.BoxGeometry(1.56,.1,.09),iron);m.position.set(.79,y,.055);door.add(m);}
 const handle=new T.Mesh(new T.TorusGeometry(.068,.011,8,18),iron);handle.position.set(1.39,1.13,.09);door.add(handle);
 const nails=[];for(const y of [.45,1.85])for(let n=0;n<7;n++){const head=new T.CylinderGeometry(.013,.013,.009,8);head.rotateX(Math.PI/2);head.translate(.115+n*.229,y,.109);nails.push(head);}const nailMesh=new T.Mesh(mergeGeometries(nails,false),iron);door.add(nailMesh);nails.forEach(g=>g.dispose());
 // Porch, broken steps and a narrow pitched rain hood.
 for(let i=0;i<13;i++)board(.24,.09,1.25,-1.51+i*.25,.2,3.86,0,0,(rng()-.5)*.014);
 for(let i=0;i<3;i++)board(2.5-i*.15,.09,.28,0,.12-i*.04,4.58+i*.29);
 for(const x of [-1.58,1.58]){beam([x,.12,4.44],[x+(x>0?.04:-.035),2.91,4.44],.073);beam([x,2.24,4.43],[x,2.94,3.76],.053);}
 for(let i=0;i<14;i++)board(.26,.065,1.75,-1.69+i*.26,2.94,3.93,.1,0,(rng()-.5)*.02);
 beam([-1.82,2.86,4.74],[1.82,2.86,4.74],.066);
 // A table and discarded timber give the open interior depth.
 board(1.8,.095,.8,-1.56,1.04,-1.72);
 for(const x of [-2.28,-.84])for(const z of [-2.02,-1.42])board(.09,.81,.09,x,.62,z);
 for(let i=0;i<12;i++)log(-.49,.49,.29+(i%3)*.18,-2.78+Math.floor(i/3)*.22);
 // Uneven wall shelves and a discarded stool make the open room read deeper.
 for(const y of [1.45,2.08]){board(1.92,.065,.34,-1.4,y,-2.91,0,0,.013);for(const x of [-2.1,-.7])beam([x,y-.28,-3.02],[x,y-.025,-2.72],.026,iron);}
 board(.5,.075,.47,.64,.56,-1.43,0,0,-.07);for(const x of [.45,.83])for(const z of [-1.58,-1.27])beam([x,.12,z],[x,.54,z],.033);
 // Small metal stovepipe, hood and collar, all unlit.
 beam([2,3.5,-1.8],[2,5.48,-1.8],.105,iron);board(.4,.06,.4,2,5.56,-1.8,0,0,0,iron);
 for(const [mat,geometries] of groups){const geo=mergeGeometries(geometries,false),mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);geometries.forEach(g=>g.dispose());}
 const warm=new T.PointLight(0xffbd76,7,8,2);warm.position.set(0,1.85,-.6);root.add(warm);
 const doorlight=new T.PointLight(0xffc17d,5,7,2);doorlight.position.set(.97,2.32,3.8);doorlight.castShadow=true;doorlight.shadow.mapSize.set(512,512);doorlight.shadow.bias=-.002;doorlight.shadow.autoUpdate=false;doorlight.shadow.needsUpdate=true;root.add(doorlight);
 forest.cabinLantern={x:.98,z:-10.35,y:2.12};
 forest.wallBoxes=[{x:-3.2,z:-14,w:.36,d:6.6},{x:3.2,z:-14,w:.36,d:6.6},{x:0,z:-17.2,w:6.6,d:.36},{x:-2.08,z:-10.8,w:2.4,d:.36},{x:2.08,z:-10.8,w:2.4,d:.36}];
 forest.cabinDoor={mesh:door,light:doorlight,handle,wall:{x:0,z:-10.8,w:1.7,d:.19,bottom:0,top:2.75,active:false}};forest.wallBoxes.push(forest.cabinDoor.wall);
 batchStaticMeshes(root,{exclude:new Set([handle])});
 return root;
}
