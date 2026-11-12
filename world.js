import {CollisionGrid} from './collision-grid.js?v=20261112-forest48-r2';
import {enableLocalLightCulling,batchStaticMeshes} from './render-batching.js?v=20261112-forest48-r2';
import {attachFoliageShadows} from './foliage-shadows.js?v=20261112-forest48-r2';
import {createShadowFilter} from './shadow-filter.js?v=20261112-forest48-r2';
import {updateGroundCover} from './plant-culling.js?v=20261112-forest48-r2';
import {frontToBack} from './instance-order.js?v=20261112-forest48-r2';
import {buildLivingForest} from './living-forest-scene.js?v=20261112-forest48-r2';
import {RainField} from './rain-field.js?v=20261112-forest48-r2';
import {RainSurfaceCache} from './render-detail.js?v=20261112-forest48-r2';
import {turnActor} from './smooth-motion.js?v=20261112-forest48-r2';
import {loadCharacterAssets,createHorrorCharacter,animateCharacter,characterMotion} from './horror-characters.js?v=20261112-forest48-r2';
import {buildPlayerBody} from './player-body.js?v=20261112-forest48-r2';
import {buildCrate} from './crate-model.js?v=20261112-forest48-r2';
import {buildSoundScene} from './sound-scene.js?v=20261112-forest48-r2';
import {trainTerrain,trainFloor,inTrain,TRAIN} from './sound-horror.js?v=20261112-forest48-r2';
import {buildExpeditionScene} from './expedition-scene.js?v=20261112-forest48-r2';
import {expeditionTerrain,expeditionFloor,inPit,onBoardwalk,MILL,PIT} from './expedition.js?v=20261112-forest48-r2';
import {buildChapelScene} from './chapel-scene.js?v=20261112-forest48-r2';
import {CHAPEL,inChapel,roofAt} from './weather-horror.js?v=20261112-forest48-r2';
import {buildExplorationScene} from './exploration-scene.js?v=20261112-forest48-r2';
import {inAttic,ATTIC_FLOOR,lineBlocked,playerLevel} from './exploration.js?v=20261112-forest48-r2';
import {buildStoryScene} from './story-scene.js?v=20261112-forest48-r2';
import {buildNightScene} from './night-scene.js?v=20261112-forest48-r2';
import {cabinFloor,cabinCeiling} from './encounters.js?v=20261112-forest48-r2';
import {encounterReserved,CRATE_SITES} from './encounters.js?v=20261112-forest48-r2';
import * as T from './vendor/three.module.js';
import {loadForestAsset} from './assets.js?v=20261112-forest48-r2';
import {loadPropLods,attachPropLods,updatePropLods} from './prop-lod.js?v=20261112-forest48-r2';
import {ForestPost} from './post.js?v=20261112-forest48-r2';
import {buildGroundCover} from './ground-cover.js?v=20261112-forest48-r2';
import {buildCabin} from './cabin.js?v=20261112-forest48-r2';
import {wetForestMaterial} from './surfaces.js?v=20261112-forest48-r2';
import {createFire,updateFire,createFlare,updateFlare} from './fire.js?v=20261112-forest48-r2';
import {flashlightCookie,configureMoon} from './lighting.js?v=20261112-forest48-r2';
import {buildSaplings,updateSaplings} from './saplings.js?v=20261112-forest48-r2';
import {createNightSky} from './sky.js?v=20261112-forest48-r2';
import {renderScale} from './resolution.js?v=20261112-forest48-r2';
import {buildAtmosphereFx} from './atmosphere-fx.js?v=20261112-forest48-r2';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {buildRainDetails} from './rain-details.js?v=20261112-forest48-r2';
import {buildViewmodel} from './viewmodel.js?v=20261112-forest48-r2';
import {buildHorrorScene} from './horror-scene.js?v=20261112-forest48-r2';
import {cemeteryReserved,horrorPropReserved} from './horror-director.js?v=20261112-forest48-r2';
import {canOccupy,supportHeight} from './movement.js?v=20261112-forest48-r2';

export function seeded(seed) { return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function heightAt(x,z){
 const trail=Math.sin(z*.045)*2-2,off=Math.abs(x-trail),bank=Math.min(1,Math.max(0,(off-2.1)/8));
 let h=Math.sin(z*.055)*.6+bank*(1.1+Math.sin(x*.075+z*.042)*1.5+Math.cos(z*.092)*.75);
 h+=bank*(Math.sin(x*.35+z*.11)*.27+Math.sin(z*.32-x*.18)*.22);
 // Shallow foot-worn channels and lumpy banks remain shared with player height.
 h+=bank*(Math.sin(x*1.37+z*.71)*Math.cos(z*1.14-x*.43)*.085+Math.sin(x*.82-z*1.7)*.035);
 const rut=Math.exp(-Math.pow((off-.55)/.24,2));h-=rut*.07;
 const cabin=Math.max(0,Math.min(1,(Math.max(Math.abs(x)/4.6,Math.abs(z+14)/5)-.8)*2));
 const chapel=Math.max(0,Math.min(1,(Math.max(Math.abs(x-CHAPEL.x)/5.3,Math.abs(z-CHAPEL.z)/6.0)-.82)*4));return trainTerrain(x,z,expeditionTerrain(x,z,CHAPEL.y*(1-chapel)+h*cabin*chapel));
}
const clamp=T.MathUtils.clamp;

export class Forest {
  constructor(canvas){
    enableLocalLightCulling();
    this.canvas=canvas;this.rand=seeded(6148);this.time=0;this.colliders=[];this.crates=[];this.fires=[];this.flares=[];this.quality='high';this.perfFrames=0;this.perfSeconds=0;this.textureCache=new Map();this.treeWind={value:new T.Vector2()};this.dawnColor=new T.Color(0x9daba0);this.lightningColor=new T.Color(0x526776);this.coverDistance={value:30};
    this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
    this.renderResolution='fhd';this.renderer.setPixelRatio(renderScale(this.renderResolution,innerWidth,innerHeight,devicePixelRatio,this.quality));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x0d1920);this.scene.fog=new T.FogExp2(0x101e25,.032);
    // The world root never moves. Avoid forcing every static prop's world
    // matrix to rebuild; moving children still update their own transforms.
    this.scene.matrixAutoUpdate=false;
    this.camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.075,240);this.camera.rotation.order='YXZ';this.camera.position.set(0,1.72,10);this.scene.add(this.camera);
    this.ambient=new T.HemisphereLight(0x8ca5b0,0x11140e,.17);this.scene.add(this.ambient);
    this.moonDirection=new T.Vector3(-75,95,-130).normalize();this.moonAnchor=new T.Vector3(999,0,999);
    this.moonlight=new T.DirectionalLight(0xacc2ca,.65);configureMoon(this.moonlight);this.scene.add(this.moonlight,this.moonlight.target);this.updateMoonShadow();
    this.flash=new T.SpotLight(0xd8e3d0,65,38,.43,.64,1.6);this.flash.position.set(.2,-.2,-.15);this.flash.target.position.set(0,-.12,-12);this.flash.castShadow=true;this.flash.shadow.mapSize.set(2048,2048);this.flash.shadow.bias=-.001;this.flash.shadow.normalBias=.08;this.flash.shadow.autoUpdate=false;this.flash.shadow.needsUpdate=true;this.shadowPosition=new T.Vector3(999,999,999);this.shadowRotation=new T.Quaternion();this.lastShadow=0;
    this.flash.map=flashlightCookie();this.flash.color.set(0xe6e4da);
    this.camera.add(this.flash,this.flash.target);this.fill=new T.PointLight(0xadc1a6,.7,3,1);this.camera.add(this.fill);
    this.shadowFilter=createShadowFilter([this.moonlight],[this.flash]);
    // Flares borrow these lights. Adding a light during play changes the light count
    // and makes Three recompile every lit material: a visible freeze on the first throw.
    this.flareLights=[0,1,2].map(()=>{const light=new T.PointLight(0xff4c24,0,18,1.5);light.position.set(0,-80,0);this.scene.add(light);return light;});
    this.buildTerrain();this.ready=Promise.all([this.buildTrees(),this.buildHeroTrees(),this.buildProps(),buildGroundCover(this,heightAt),loadCharacterAssets(this)]).then(()=>{this.horror=buildHorrorScene(this,heightAt);this.night=buildNightScene(this,heightAt);this.storyScene=buildStoryScene(this,heightAt);this.exploration=buildExplorationScene(this,heightAt);this.chapel=buildChapelScene(this,heightAt);this.expedition=buildExpeditionScene(this,heightAt);this.soundNight=buildSoundScene(this,heightAt);this.livingForest=buildLivingForest(this,heightAt);this.scene.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.needsUpdate=true;});this.shadowFilter.bind(this.scene);this.prepareEnvironment();});this.buildSky();this.buildCabin();this.buildRain();this.rainSurface=new RainSurfaceCache((x,z)=>Math.max(heightAt(x,z),roofAt(x,z)));this.buildEnemy();this.buildHand();
    for(const p of [[0,0],[-30,-23],[30,32]])this.buildFire(p[0],p[1]);
    this.addCrates();this.camera.lookAt(0,2,-15);this.hand.visible=false;this.post=new ForestPost(this.renderer,this.camera,this.moonlight,this.moonDirection);this.post.flashLight=this.flash;this.cinematic=true;this.danger=0;this.fx=buildAtmosphereFx(this);
    this.resize=()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.applyResolution();this.treeCullPosition?.set(999,999,999);this.saplingCullPosition?.set(999,999,999);this.coverCullPosition?.set(999,999,999);};addEventListener('resize',this.resize);
  }
  material(color,options={}){return new T.MeshStandardMaterial({color,roughness:.92,...options});}
  updateMoonShadow(){
    const p=this.camera.position;
    if((p.x-this.moonAnchor.x)**2+(p.z-this.moonAnchor.z)**2<196)return;
    this.moonAnchor.set(p.x,0,p.z);this.moonlight.target.position.set(p.x,heightAt(p.x,p.z)+2,p.z);
    this.moonlight.position.copy(this.moonlight.target.position).addScaledVector(this.moonDirection,160);
    this.moonlight.shadow.needsUpdate=true;this.staticShadowsDirty=true;
  }
  noiseTexture(type){
    const size=256,data=new Uint8Array(size*size*4),rng=seeded(type==='bark'?19:31);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4;let n=rng();let v=type==='bark'?(Math.sin(x*.3+Math.sin(y*.05)*.4)*.2+n*.4+.28):(Math.sin(x*.1)*Math.cos(y*.11)*.12+n*.5+.23);data[k]=v*(type==='bark'?125:98);data[k+1]=v*(type==='bark'?115:108);data[k+2]=v*(type==='bark'?96:85);data[k+3]=255;}
    const tex=new T.DataTexture(data,size,size);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(type==='bark'?2:30,type==='bark'?4:30);tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;return tex;
  }
  texture(file,repeat=1,color=false){
    const key=file+'|'+repeat+'|'+color;if(this.textureCache.has(key))return this.textureCache.get(key);
    const t=new T.TextureLoader().load('./assets/textures/'+file);this.textureCache.set(key,t);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=Math.min(this.quality==='ultra'?16:8,this.renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;return t;
  }
  buildTerrain(){
    const g=new T.PlaneGeometry(290,290,260,260);g.rotateX(-Math.PI/2);const a=g.attributes.position,uv=g.attributes.uv;
    // Concentrate the existing vertices around the playable clearing instead
    // of spending the same detail on distant, invisible ground.
    const warp=v=>Math.sign(v)*Math.pow(Math.abs(v)/145,1.42)*145;
    for(let i=0;i<a.count;i++){const x=warp(a.getX(i)),z=warp(a.getZ(i));a.setXYZ(i,x,heightAt(x,z),z);uv.setXY(i,x/290+.5,.5-z/290);}g.computeVertexNormals();
    const triangles=[],index=g.index.array;for(let k=0;k<index.length;k+=3){const ids=[index[k],index[k+1],index[k+2]],x=ids.reduce((s,i)=>s+a.getX(i),0)/3,z=ids.reduce((s,i)=>s+a.getZ(i),0)/3;if(Math.abs(x)<2.78&&z>-17&&z<-11||inPit(x,z))continue;triangles.push(...ids);}g.setIndex(triangles);
    const colors=[];for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),off=Math.abs(x-(Math.sin(z*.045)*2-2)),v=.57+Math.sin(x*.21+z*.15)*.10+Math.min(1,off/4)*.2;colors.push(v,v*.99,v*.89);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const map=this.texture('ground-color.jpg',43,true),normal=this.texture('ground-normal.jpg',43),rough=this.texture('ground-rough.jpg',43);
    this.groundMaterial=wetForestMaterial(this,map,normal,rough);const ground=new T.Mesh(g,this.groundMaterial);ground.receiveShadow=true;this.scene.add(ground);
  }
  prepareEnvironment(){
    const target=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType}),capture=new T.CubeCamera(.1,240,target);
    capture.position.set(.4,1.4,2.5);this.scene.add(capture);
    const flash=this.flash.visible,fill=this.fill.visible;this.flash.visible=this.fill.visible=false;
    this.updateTreeInstances(true);updateSaplings(this,true);updateGroundCover(this,true);
    capture.update(this.renderer,this.scene);this.flash.visible=flash;this.fill.visible=fill;
    const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromCubemap(target.texture);
    this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.3;
    this.scene.remove(capture);target.dispose();pmrem.dispose();this.staticShadowsDirty=false;this.treeCullPosition?.set(999,999,999);this.saplingCullPosition?.set(999,999,999);
  }
  async buildTrees(){
    const [asset,middle,distant]=await Promise.all([loadForestAsset('./assets/fir-low.glb'),loadForestAsset('./assets/fir-mid-v32.glb'),loadForestAsset('./assets/fir-far-v32.glb')]);asset.scene.updateMatrixWorld(true);middle.scene.updateMatrixWorld(true);distant.scene.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(asset.scene),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),sources=[];
    asset.scene.traverse(o=>{if(o.isMesh){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-bounds.min.y,-center.z);sources.push({geo,mat:o.material});}});
    const extractLOD=asset=>{const list=[];asset.scene.traverse(o=>{if(o.isMesh){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-bounds.min.y,-center.z);const mat=sources.find(s=>s.mat.name===o.material.name)?.mat;if(!mat)throw new Error('Не найден материал дерева: '+o.material.name);list.push({geo,mat});}});return list;};
    const midSources=extractLOD(middle),farSources=extractLOD(distant);
    for(const list of [sources,midSources,farSources])for(const source of list){
      const canopy=source.mat.name.includes('twig')||source.mat.name.includes('bark'),geometry=source.geo,p=geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const y=p.getY(i),level=y/size.y,spread=1.18+(1-level)*.5;
        p.setX(i,p.getX(i)*(canopy?spread:1)+Math.sin(level*Math.PI)*level*.34);p.setZ(i,p.getZ(i)*(canopy?spread:1)+Math.sin(level*4.5)*level*.12);
      }
      geometry.computeVertexNormals();
      if(canopy){
        source.shadowCount=geometry.index?.count??geometry.attributes.position.count;
        const lower=geometry.clone();lower.scale(.86,.73,.86);lower.rotateY(1.92);lower.translate(.05,size.y*.035,-.06);
        const merged=mergeGeometries([geometry,lower],false);if(merged){source.geo=merged;geometry.dispose();}lower.dispose();
      }
    }
    // A private stream: the shared one was consumed in whatever order the downloads finished,
    // so the forest differed between page loads.
    const rand=seeded(6148);
    const positions=[],hero=[[-4,22],[4,19],[-5.2,10],[6,6],[-4.8,-4],[7,-6],[-7,-14],[5.6,-24],[-10,27],[8,29]];
    for(let i=0;i<570;i++){
      let x,z,attempt=0;
      if(i<hero.length){[x,z]=hero[i];}else{
        do {const span=i<220?104:216;x=(rand()-.5)*span;z=(rand()-.5)*span;attempt++;}while(attempt<120&&(cemeteryReserved(x,z,2)||horrorPropReserved(x,z)||encounterReserved(x,z)||(Math.abs(x-(Math.sin(z*.045)*2-2))<2.4&&z>-65&&z<70)||(Math.abs(x)<4.5&&z>-20&&z< -9)||Math.hypot(x,z)<3.5||Math.hypot(x+30,z+23)<3.5||Math.hypot(x-30,z-32)<3.5||positions.some(p=>Math.hypot(p.x-x,p.z-z)<3.9)));
      }
      const height=i<hero.length?8.6+rand()*5.7:8.5+rand()*11,scale=height/size.y,width=1.13+rand()*.48;positions.push({x,z,scale,width,leanX:(rand()-.5)*.07,leanZ:(rand()-.5)*.07,angle:rand()*6.28,tint:.8+rand()*.2});this.colliders.push({x,z,r:.38});
    }
    const dummy=new T.Object3D(),materials=new Map(),farMaterials=new Map();
    this.treeRecords=positions;this.treeBatches=[[],[],[]];this.treeFrustum=new T.Frustum();this.treeProjection=new T.Matrix4();this.treeCullPosition=new T.Vector3(999,999,999);this.treeCullRotation=new T.Quaternion();this.treeCullDawn=-1;this.treeCullQuality='';
    for(const p of positions){
      const y=heightAt(p.x,p.z)-.08;
      dummy.position.set(p.x,y,p.z);dummy.rotation.set(p.leanX,p.angle,p.leanZ);dummy.scale.set(p.scale*p.width,p.scale,p.scale*p.width);dummy.updateMatrix();p.matrix=dummy.matrix.clone();p.lod=2;
      p.bounds=new T.Box3(new T.Vector3(-size.x*.85,0,-size.z*.85),new T.Vector3(size.x*.85,size.y,size.z*.85)).applyMatrix4(p.matrix).expandByScalar(.2);
    }
    for(const [lod,list] of [sources,midSources,farSources].entries()){
      for(const source of list){
        const original=source.mat,cache=lod===2?farMaterials:materials,cacheKey=original.name+lod;let material=cache.get(cacheKey);if(!material){
        // Distant silhouettes retain their photographic color/alpha maps but
        // don't need expensive normal, reflection and shadow-map sampling.
        material=lod===2?new T.MeshLambertMaterial({color:original.color,map:original.map,transparent:original.transparent}):new T.MeshStandardMaterial({color:original.color,map:original.map,normalMap:lod===0?original.normalMap:null,roughnessMap:lod===0?original.roughnessMap:null,aoMap:lod===0?original.aoMap:null,roughness:.94,metalness:0,transparent:original.transparent,envMapIntensity:.35});
        if(material.transparent){material.transparent=false;material.alphaTest=.34;material.depthWrite=true;material.side=T.DoubleSide;material.shadowSide=T.FrontSide;}else material.side=T.FrontSide;
        if(material.map)material.map.anisotropy=4;
        if(material.alphaTest>0){
          material.onBeforeCompile=shader=>{shader.uniforms.treeWind=this.treeWind;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 treeWind;').replace('#include <begin_vertex>',`#include <begin_vertex>\nvec3 treeOrigin=(instanceMatrix*vec4(0,0,0,1)).xyz;float sway=clamp(position.y/${size.y.toFixed(4)},0.,1.);sway*=sway;transformed.x+=sway*(treeWind.x+treeWind.y*fract(dot(treeOrigin.xz,vec2(.173,.117))));transformed.z+=sway*treeWind.y*.4;`);};
          material.customProgramCacheKey=()=> 'fir-wind-1';
        }
        cache.set(cacheKey,material);}
        const inst=new T.InstancedMesh(source.geo,material,positions.length);
        inst.updateMatrix();inst.matrixAutoUpdate=false;inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.count=0;inst.frustumCulled=false;inst.castShadow=lod<2;inst.receiveShadow=lod<2;this.scene.add(inst);this.treeBatches[lod].push(inst);
        if(inst.castShadow&&material.alphaTest>0)attachFoliageShadows(inst);
        if(source.shadowCount){inst.onBeforeShadow=()=>source.geo.setDrawRange(0,source.shadowCount);inst.onAfterShadow=()=>source.geo.setDrawRange(0,Infinity);}
      }
    }
    this.updateTreeInstances(true);
  }
  updateTreeInstances(all=false,dawn=0){
    if(!this.treeRecords)return;
    const position=this.camera.position,rotation=this.camera.quaternion;
    if(!all&&position.distanceToSquared(this.treeCullPosition)<.0004&&rotation.angleTo(this.treeCullRotation)<.002&&Math.abs(dawn-this.treeCullDawn)<.008&&this.treeCullQuality===this.quality)return;
    this.camera.updateMatrixWorld();this.treeProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.treeFrustum.setFromProjectionMatrix(this.treeProjection);
    const ultra=this.quality==='ultra',reach=ultra?1.6:1,counts=[0,0,0],range=(ultra?92:70)+dawn*18,tint=this.treeTint??=(new T.Color());
    for(const p of this.instanceDepthOrder===false?this.treeRecords:frontToBack(this.treeRecords,this.camera)){
      const distance=Math.hypot(position.x-p.x,position.z-p.z);
      if(!all&&(distance>range||!this.treeFrustum.intersectsBox(p.bounds)))continue;
      // Hysteresis prevents a tree repeatedly switching mesh near an LOD boundary.
      const near=(p.lod===0?13:10)*reach,far=(p.lod===2?34:38)*reach;
      const lod=this.quality==='low'?(distance<32?1:2):(distance<near?0:distance<far?1:2);
      p.lod=lod;const index=counts[lod]++;
      tint.setRGB(p.tint,p.tint*.995,p.tint*.94);for(const batch of this.treeBatches[lod]){batch.setMatrixAt(index,p.matrix);batch.setColorAt(index,tint);}
    }
    this.treeBatches.forEach((batches,lod)=>batches.forEach(batch=>{batch.count=counts[lod];batch.visible=counts[lod]>0;batch.instanceMatrix.clearUpdateRanges();if(counts[lod]>0){batch.instanceMatrix.addUpdateRange(0,counts[lod]*16);batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;}}));
    this.visibleTreeCounts=counts;this.treeCullPosition.copy(position);this.treeCullRotation.copy(rotation);this.treeCullDawn=dawn;this.treeCullQuality=this.quality;
    if(all)this.treeCullPosition.set(999,999,999);
  }
  async buildHeroTrees(){await buildSaplings(this,heightAt);}
  async prepareGraphics(){
    await this.ready;
    const r=this.renderer,target=r.getRenderTarget(),position=this.camera.position.clone(),rotation=this.camera.quaternion.clone();
    try{
      this.camera.position.set(1.4,heightAt(1.4,4.3)+1.68,4.3);this.camera.rotation.set(-.065,.16,0);this.camera.updateMatrixWorld(true);
      this.updateTreeInstances(false);updateSaplings(this);updateGroundCover(this);
      // Compile for the linear offscreen scene target, exactly as during play.
      r.setRenderTarget(this.post.target);await r.compileAsync(this.scene,this.camera);
      const quad=this.post.quad,original=quad.material;
      try{for(const [material,output]of [[this.post.reflectionMaterial,this.post.reflections],[this.post.effectMaterial,this.post.effects],[this.post.bloomMaterial,this.post.bloomA],[this.post.material,null]]){quad.material=material;r.setRenderTarget(output);await r.compileAsync(this.post.scene,this.post.ortho);}}finally{quad.material=original;}
      this.viewmodel.update(0,this.time,{active:true,flash:true});
      // Upload textures, initialize shadow programs and exercise the actual
      // render passes while no Run exists and the survival clock is stopped.
      this.post.render(this.scene,this.time,true,0,this.quality!=='low');
      await new Promise(resolve=>requestAnimationFrame(resolve));
      this.post.render(this.scene,this.time,true,0,this.quality!=='low');
    }finally{this.viewmodel.update(0,this.time,{active:false});this.camera.position.copy(position);this.camera.quaternion.copy(rotation);this.camera.updateMatrixWorld(true);r.setRenderTarget(target);this.treeCullPosition.set(999,999,999);this.saplingCullPosition.set(999,999,999);this.coverCullPosition.set(999,999,999);}
  }
  async buildProps(){
    const names=['pine_roots','wooden_military_crate','wooden_lantern_01','stone_fire_pit','tree_stump_02'],assets={};
    const [lodData]=await Promise.all([(this.propLodData??=loadPropLods()),Promise.all(names.map(async name=>{assets[name]=(await loadForestAsset(name==='pine_roots'?'./assets/roots.glb':'./assets/'+name+'/model.gltf')).scene;}))]);this.propLods??=[];
    const place=(name,x,z,width,parent=this.scene,raise=0)=>{
      const obj=assets[name].clone(true);obj.position.set(0,0,0);obj.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(obj),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),scale=width/Math.max(size.x,size.z);
      obj.scale.setScalar(scale);obj.position.set(x-center.x*scale,(parent===this.scene?heightAt(x,z):0)-bounds.min.y*scale+raise,z-center.z*scale);
      obj.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;if(m.material.map)m.material.map.anisotropy=8;}});
      batchStaticMeshes(obj,{preserveNamed:false});obj.updateMatrixWorld(true);obj.traverse(m=>{m.updateMatrix();m.matrixAutoUpdate=false;});parent.add(obj);
      if(name==='pine_roots'||name==='tree_stump_02')attachPropLods(obj,lodData,this.propLods);return obj;
    };
    const roots=[[-4,22],[4,19],[-5.2,10],[6,6],[-4.8,-4],[7,-6],[-7,-14],[5.6,-24],[-10,27],[8,29],[-16,5],[14,10]];
    const rand=seeded(6149);
    roots.forEach(([x,z],i)=>place('pine_roots',x,z,3+rand()*1.4));
    for(const c of this.crates)place('wooden_lantern_01',.60,.09,.19,c.root,.015);
    for(const f of this.fires)place('stone_fire_pit',0,0,1.6,f.base,-.04);
    if(this.cabinLantern){const {x,z,y}=this.cabinLantern;place('wooden_lantern_01',x,z,.2,this.scene,y);}
    for(const [x,z] of [[-3,16],[5,11],[-5,-8],[7,-24],[-12,30],[12,28],[-25,7],[26,-12]])place('tree_stump_02',x,z,.7+rand()*.5);
  }
  glowTexture(){
    const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,240,192,.8)');g.addColorStop(.45,'rgba(255,163,70,.15)');g.addColorStop(1,'rgba(255,100,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(c);
  }
  buildSky(){this.sky=createNightSky(this);this.sky.update(0,0);}
  box(w,h,d,x,y,z,mat,parent=this.scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  buildCabin(){this.cabin=buildCabin(this);}
  buildFire(x,z){this.fires.push(createFire(this,x,z,heightAt(x,z)));}
  addCrates(){
    const locations=CRATE_SITES;
    const mat=this.material(0xa1a18c,{map:this.texture('weathered_planks-diff.jpg',1,true),normalMap:this.texture('weathered_planks-nor_gl.jpg')}),metal=this.material(0x555c51,{metalness:.5});
    locations.forEach(([x,z],i)=>{
      const root=new T.Group(),y=i===1?.23:heightAt(x,z);root.position.set(x,y,z);this.scene.add(root);const model=buildCrate(this,root,mat,metal);
      const beacon=new T.Mesh(new T.BoxGeometry(.09,.12,.08),this.material(0xe7b563,{emissive:0xe7a04a,emissiveIntensity:1.8}));beacon.position.set(.60,.20,.09);root.add(beacon);
      const glow=new T.Sprite(new T.SpriteMaterial({map:this.glowTexture(),color:0xf9c881,transparent:true,opacity:.18,depthWrite:false}));glow.position.copy(beacon.position);glow.scale.set(.38,.38,1);root.add(glow);
      this.wallBoxes.push({x,z,w:.90,d:.64,bottom:y,top:y+.63});this.crates.push({x,z,root,model,beacon,glow,cooldown:0,id:i,opened:false});
    });
  }
  buildRain(){
    // Keep the old environment RNG sequence independent of rain detail changes.
    const seeds=new Float64Array(1400*3);for(let i=0;i<seeds.length;i++)seeds[i]=this.rand();
    let seedIndex=0;const detailRandom=seeded(45117);
    this.rainField=new RainField({count:1400,random:()=>{const channel=seedIndex%5,particle=Math.floor(seedIndex++/5);return channel<3?seeds[particle*3+channel]:detailRandom();},surfaceAt:(x,z)=>this.rainSurface.get(x,z)});
    const g=new T.BufferGeometry();this.rainData=this.rainField.positions;g.setAttribute('position',new T.BufferAttribute(this.rainData,3).setUsage(T.DynamicDrawUsage));
    this.rain=new T.LineSegments(g,new T.LineBasicMaterial({color:0x9aadb0,transparent:true,opacity:.18,depthWrite:false}));this.rain.frustumCulled=false;this.scene.add(this.rain);
    this.rainDetails=buildRainDetails(this,heightAt);
  }
  buildEnemy(){
    this.enemy=createHorrorCharacter(this,'watcher');this.enemy.visible=false;this.enemy.position.set(30,0,-40);this.scene.add(this.enemy);
  }
  buildHand(){
    this.viewmodel=buildViewmodel(this);this.playerBody=buildPlayerBody(this);
  }
  applyResolution(){
    const ratio=renderScale(this.renderResolution,innerWidth,innerHeight,devicePixelRatio,this.quality),limit=this.renderer.capabilities.maxTextureSize/Math.max(innerWidth,innerHeight);
    this.renderer.setPixelRatio(Math.min(ratio,limit));this.renderer.setSize(innerWidth,innerHeight);this.post?.resize();this.onResolutionChange?.(this.canvas.width,this.canvas.height);
  }
  setResolution(value){if(!['auto','fhd','qhd','uhd','native'].includes(value))return;this.renderResolution=value;this.perfFrames=this.perfSeconds=0;this.applyResolution();}
  setQuality(value){if(!['low','high','ultra'].includes(value))return;const anisotropy=value==='ultra'?16:8;if((this.quality==='ultra')!==(value==='ultra'))this.setAnisotropy(anisotropy);this.quality=value;this.perfFrames=this.perfSeconds=0;if(this.groundMaterial)this.groundMaterial.userData.surfaceUniforms.groundDetail.value=value!=='low'?1:0;this.applyResolution();this.renderer.shadowMap.enabled=value!=='low';this.rain.visible=value!=='low';this.coverDistance.value=value==='ultra'?44:value==='high'?30:18;this.flash.shadow.needsUpdate=true;this.fx?.setEnabled(this.fx.enabled);if(value!=='low'){this.staticShadowsDirty=true;this.scene.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.needsUpdate=true;});}this.post?.resize();}
  // Camera field of view in degrees (vertical).
  setFov(degrees){const fov=clamp(Number(degrees)||65,55,90);if(Math.abs(this.camera.fov-fov)<.01)return;this.camera.fov=fov;this.camera.updateProjectionMatrix();this.post?.resize();this.treeCullPosition?.set(999,999,999);this.saplingCullPosition?.set(999,999,999);this.coverCullPosition?.set(999,999,999);}
  setParticles(value){this.fx?.setEnabled(!!value);}
  // Sharper filtering of ground and bark at grazing angles; applied on the next upload.
  setAnisotropy(level){const max=this.renderer.capabilities.getMaxAnisotropy();for(const t of this.textureCache.values()){const next=Math.min(level,max);if(t.anisotropy!==next){t.anisotropy=next;t.needsUpdate=true;}}}
  reset(seed,mode='full'){const rng=seeded(seed);this.fx?.reset();this.danger=0;this.playerBody.reset();this.viewmodel.reset();this.crates.forEach(c=>{c.cooldown=0;c.contents=null;c.opened=false;c.wasPicked=false;c.model.reset();c.beacon.visible=c.glow.visible=true;});this.fires.forEach(f=>f.fuel=150+rng()*90);for(const f of this.flares){this.scene.remove(f.root);f.dispose();}this.flares=[];this.enemy.visible=false;this.horror?.reset();this.livingForest?.reset();this.night?.reset(seed,mode);this.storyScene?.reset();this.exploration?.reset(seed,mode);this.chapel?.reset(mode);this.expedition?.reset(mode);this.soundNight?.reset(mode);}
  actorSpaceFree(x,z,margin=1.8){return (this.treeRecords||[]).every(p=>Math.hypot(p.x-x,p.z-z)>margin)&&(this.saplingRecords||[]).every(p=>Math.hypot(p.x-x,p.z-z)>margin*1.05);}
  collisionCandidates(x,z){if(!this.collisionGrid||this.collisionGrid.colliders!==this.colliders||this.collisionGrid.walls!==this.wallBoxes)this.collisionGrid=new CollisionGrid(this.colliders,this.wallBoxes);return this.collisionGrid.at(x,z);}
  canMove(x,z,feetY=heightAt(x,z),step=0,height=1.68){const nearby=this.collisionCandidates(x,z);if(inTrain(x,z)&&(feetY+step<TRAIN.floor-.012||feetY+height>TRAIN.floor+2.5))return false;if(inPit(x,z)){if(feetY>=MILL.y-.5)return false;return feetY>=PIT.floor-.05&&canOccupy(x,z,nearby.colliders,nearby.walls,feetY,step,height);}if(feetY<MILL.y-.5&&Math.abs(x-PIT.x)<2&&Math.abs(z-PIT.z)<2)return false;if(feetY>2.8&&(Math.abs(x)<4.2&&z>-18&&z<-10)){if(!inAttic(x,z)||feetY+height>this.ceilingAt(x,z,feetY)+.01)return false;}if(feetY<-.15&&cabinFloor(x,z,feetY,this.night?.logic.hatchOpen,heightAt(x,z))>feetY+step+.025)return false;if(feetY<-.15&&cabinCeiling(x,z,feetY,this.night?.logic.hatchOpen)<Math.max(feetY,cabinFloor(x,z,feetY,this.night?.logic.hatchOpen,heightAt(x,z)))+height-.02)return false;return canOccupy(x,z,nearby.colliders,nearby.walls,feetY,step,height);}
  floorAt(x,z,feetY,step=0){const railway=trainFloor(x,z,NaN);if(Number.isFinite(railway))return railway;if(inPit(x,z)||onBoardwalk(x,z))return expeditionFloor(x,z,feetY,heightAt(x,z));if(inChapel(x,z))return CHAPEL.y+.12;if(feetY>2.8&&inAttic(x,z))return ATTIC_FLOOR;return supportHeight(x,z,cabinFloor(x,z,feetY,this.night?.logic.hatchOpen,heightAt(x,z)),this.collisionCandidates(x,z).colliders,feetY,step);}
  ceilingAt(x,z,feetY=0){
    if(inTrain(x,z))return TRAIN.floor+2.5;
    const lower=cabinCeiling(x,z,feetY,this.night?.logic.hatchOpen);if(Number.isFinite(lower))return lower;
    if(feetY>=-.15&&feetY<2.8&&inAttic(x,z))return 2.95;
    if(Math.abs(x)<3.7&&z>-17.8&&z<-10.1)return 4.7-Math.abs(x)*.42;
    if(Math.abs(x)<1.85&&z>=-10.1&&z<-9.15)return 2.86;
    return Infinity;
  }
  shelteredAt(x,z,feetY){return feetY+1<roofAt(x,z);}
  lineOfSight(a,b){return !lineBlocked(a,b,this.colliders,this.wallBoxes);}
  warmthAt(x,z,feetY=heightAt(x,z)){let best=0;for(const f of this.fires)if(f.fuel>0&&Math.abs(feetY-f.y)<1.5)best=Math.max(best,1-Math.hypot(x-f.x,z-f.z)/6);for(const f of this.flares)if(Math.abs(feetY-f.root.position.y)<1.5)best=Math.max(best,(1-Math.hypot(x-f.x,z-f.z)/5)*.6);return Math.max(0,best);}
  protectedAt(x,z){return this.fires.some(f=>f.fuel>0&&Math.hypot(x-f.x,z-f.z)<5)||this.flares.some(f=>Math.hypot(x-f.x,z-f.z)<7);}
  throwFlare(x,z,yaw,feetY=heightAt(x,z)){let fx=x-Math.sin(yaw)*4,fz=z-Math.cos(yaw)*4;if(playerLevel(x,z,feetY)==='lower'){fx=clamp(fx,-2.3,2.3);fz=clamp(fz,-16.4,-11.6);}const floor=playerLevel(x,z,feetY)==='lower'?this.floorAt(fx,fz,feetY):this.floorAt(fx,fz,feetY,.18);this.flares.push(createFlare(this,fx,fz,floor,yaw));}
  update(dt,state){
    this.time+=dt;const t=this.time;
    if(this.renderResolution==='auto'&&this.quality!=='low'&&state.active!==false&&dt>0){this.perfFrames++;this.perfSeconds+=dt;if(this.perfFrames>=100){const average=this.perfSeconds/this.perfFrames,ratio=this.renderer.getPixelRatio(),ceiling=Math.min(devicePixelRatio,this.quality==='ultra'?2:1.35);let next=ratio;if(average>1/28)next=Math.max(Math.min(1,ceiling),ratio-.15);else if(average<1/48)next=Math.min(ceiling,ratio+.1);if(Math.abs(next-ratio)>.04){this.renderer.setPixelRatio(next);this.post.resize();this.onResolutionChange?.(this.canvas.width,this.canvas.height);}this.perfFrames=this.perfSeconds=0;}}
    updateGroundCover(this);this.treeWind.value.set(Math.sin(t*.7)*.043+Math.sin(t*.23)*.025,Math.sin(t*1.1)*.023);
    if(this.plantWind)this.plantWind.value=t;for(const c of this.coverChunks||[]){const range=c.solid?(this.quality==='ultra'?80:this.quality==='high'?55:38):this.coverDistance.value+8;c.group.visible=(this.camera.position.x-c.x)**2+(this.camera.position.z-c.z)**2<range*range;}this.groundMaterial.userData.surfaceUniforms.groundTime.value=t;this.stormStrength=T.MathUtils.damp(this.stormStrength||0,state.storm||0,.3,dt);const storm=this.stormStrength;this.weatherTime=(this.weatherTime||0)+dt*(1+storm*2);this.treeWind.value.multiplyScalar(1+storm*2);this.rain.material.opacity=.18+storm*.16;const p=state.progress||0,dawn=clamp((p-.95)/.05,0,1);const lightning=state.lightning||0,moonTransmission=this.sky.update(this.weatherTime,dawn,lightning);this.ambient.intensity=.17*(.75+.25*moonTransmission)+dawn*1.6+lightning*.8;this.moonlight.intensity=.65*moonTransmission*(1-storm*.5)+dawn*2+lightning*2.1;this.scene.fog.color.set(0x101e25).lerp(this.dawnColor,dawn).lerp(this.lightningColor,lightning*.35);this.scene.background.copy(this.scene.fog.color);this.scene.fog.density=.032+storm*.009-dawn*.014;this.updateMoonShadow();this.updateTreeInstances(!!this.staticShadowsDirty,dawn);updateSaplings(this,!!this.staticShadowsDirty);
    if(t-this.lastShadow>.065&&(this.camera.position.distanceToSquared(this.shadowPosition)>.0025||this.camera.quaternion.angleTo(this.shadowRotation)>.015||this.enemy.visible)){this.flash.shadow.needsUpdate=true;this.shadowPosition.copy(this.camera.position);this.shadowRotation.copy(this.camera.quaternion);this.lastShadow=t;}
    this.horror?.update(dt,t,state.active);this.night?.update(dt,t,state);this.exploration?.update(dt,t,state);this.chapel?.update(dt,t,state);this.flash.color.set(state.cursed?0xa8ccca:0xe6e4da);
    this.flash.intensity=state.flash&&state.battery>0?80*(state.horrorLight??1)*(state.battery<10?.5+Math.sin(t*23)*.25:1):0;this.fill.intensity=state.hand?.36:state.flash&&state.battery>0?1.05*(state.horrorLight??1):.02;
    this.playerBody.update(dt,state);for(const c of this.crates)c.model.update(dt,c.opened,c.contents&&Object.values(c.contents).every(n=>n===0));
    this.viewmodel.update(dt,t,state);this.rainDetails.update(t,state.flash&&state.battery>0);
    for(const f of this.fires)updateFire(f,t,this.camera,this.quality);
    for(let i=this.flares.length-1;i>=0;i--){const f=this.flares[i];if(state.active)f.life-=dt;updateFlare(f,t);if(f.life<=0){this.scene.remove(f.root);f.dispose();this.flares.splice(i,1);}}
    if(this.rain.visible&&this.rainField.update(dt,this.camera.position.x,this.camera.position.z,storm))this.rain.geometry.attributes.position.needsUpdate=true;
    if(this.enemy.visible&&!state.characterPreview){const e=this.enemy,aim=e.userData.aim||this.camera.position;e.position.y=heightAt(e.position.x,e.position.z);const gait=characterMotion(e),gaze=Math.atan2(aim.x-e.position.x,aim.z-e.position.z),retreat=e.userData.behavior==='retreat',angle=retreat&&Number.isFinite(e.userData.travelHeading)?e.userData.travelHeading:gaze;turnActor(e,angle,dt,state.chasing?7:retreat?6:3.5);const look=Math.atan2(Math.sin(gaze-e.rotation.y),Math.cos(gaze-e.rotation.y));animateCharacter(e,t,{...gait,running:state.chasing,state:e.userData.behavior,peek:e.userData.peek||0,attack:e.userData.attackLeft>0?1-e.userData.attackLeft/.65:null,ground:(x,z)=>this.floorAt(x,z,e.position.y,.18),scan:clamp(look,-.65,.65)});}
    this.post.uniforms.uFires.value.forEach((v,i)=>{const f=this.fires[i];v.set(f.x,f.y+.8,f.z,f.fuel>0?1:0);});
    this.soundNight?.update(dt,t,state);this.expedition?.update(dt,t,state);updatePropLods(this.propLods||[],this.camera,this.canvas.height);this.fx?.update(dt,t,state);
    // Lens and grade: danger and wounds are felt in the picture, damped so nothing snaps.
    this.danger=T.MathUtils.damp(this.danger,clamp(state.danger||0,0,1),2.2,dt);const lens=this.post.uniforms;lens.uCinema.value=this.cinematic?1:0;lens.uDanger.value=this.danger;lens.uHurt.value=T.MathUtils.damp(lens.uHurt.value,Number.isFinite(state.health)&&state.health<30?1-state.health/30:0,1.5,dt);
    this.post.render(this.scene,t,state.flash&&state.battery>0,dawn,this.quality!=='low');if(this.staticShadowsDirty){this.staticShadowsDirty=false;this.treeCullPosition?.set(999,999,999);}
  }
}
