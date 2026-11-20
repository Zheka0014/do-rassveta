import * as T from './vendor/three.module.js';
import {basementBreathPhase,basementBreathOffset} from './basement-motion.js?v=20261120-forest50';
const motion=new WeakMap();

// The adult body and authored outfit are skinned and posed offline. Keep a
// container around all meshes because the character factory transfers children.
export function prepareBasementWoman(asset){
 const root=new T.Group(),body=asset.scene;root.name='basement-woman';
 root.userData={...body.userData,horrorKind:'double',faceKind:'double',identity:'basement-woman',pose:'supported-all-fours',modelVersion:41};
 body.name='basement-woman-model';body.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if(m.name.includes('sportsuit'))m.side=T.DoubleSide;if(m.map)m.map.anisotropy=8;if(m.normalMap)m.normalMap.anisotropy=4;}o.updateMatrix();o.matrixAutoUpdate=false;});
 const head=new T.Group();head.name='head';head.position.fromArray(body.userData.headPosition||[0,.62,.55]);body.add(head);root.add(body);root.updateMatrixWorld(true);return root;
}

export function animateBasementWoman(root,seconds,{freeze=false}={}){
 let rig=motion.get(root);if(!rig){const meshes=[];root.traverse(o=>{if(o.isMesh&&o.morphTargetInfluences?.length)meshes.push(o);});if(!meshes.length)return 0;const head=root.getObjectByName('head');rig={meshes,head,base:head?.position.clone(),offset:[0,0,0],phase:-1};motion.set(root,rig);}
 const phase=freeze?0:basementBreathPhase(seconds);if(phase===rig.phase)return phase;
 for(const mesh of rig.meshes)mesh.morphTargetInfluences[0]=phase;
 if(rig.head){const p=rig.base,delta=basementBreathOffset(p.x,p.y,p.z,rig.offset);rig.head.position.set(p.x+delta[0]*phase,p.y+delta[1]*phase,p.z+delta[2]*phase);}
 rig.phase=phase;return phase;
}
