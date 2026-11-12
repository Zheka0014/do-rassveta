import {translate,localizeCanvas} from './i18n.js?v=20261112-forest48-r2';
import * as T from './vendor/three.module.js';
import {createHorrorCharacter} from './horror-characters.js?v=20261112-forest48-r2';

// An adult woman in weathered clothes, supported by palms and knees.
export function buildBasementDoll(basement,f){
 const root=new T.Group();root.name='Женская фигура в подвале';root.position.set(-1.78,-2.75,-12.30);root.rotation.y=.45;basement.add(root);
 const body=createHorrorCharacter(f,'basement-woman');root.add(body);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const a=canvas.getContext('2d');
 const draw=()=>{a.clearRect(0,0,1024,512);a.fillStyle='#514837';a.fillRect(0,0,1024,512);a.fillStyle='#71644a';a.fillRect(12,12,1000,488);
 for(let i=0;i<75;i++){a.fillStyle=i%2?'#635841':'#7b6c50';a.fillRect((i*173)%1024,(i*97)%512,30+i%40,2);}
 a.fillStyle='#e0d7b7';a.font='bold 92px sans-serif';a.textAlign='center';a.fillText(translate('ТВОЯ МАМА'),512,130,950);
 a.strokeStyle='#d5c9a5';a.lineWidth=19;a.lineCap='round';a.lineJoin='round';a.beginPath();a.moveTo(520,190);a.quadraticCurveTo(405,235,440,414);a.moveTo(440,414);a.lineTo(374,343);a.moveTo(440,414);a.lineTo(494,336);a.stroke();
 };
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;localizeCanvas(map,draw);
 const sign=new T.Mesh(new T.BoxGeometry(1.12,.56,.035),new T.MeshStandardMaterial({color:0x514534,roughness:.95}));sign.position.set(-1.88,-.47,-11.22);basement.add(sign);
 const print=new T.Mesh(new T.PlaneGeometry(1.1,.54),new T.MeshStandardMaterial({map,roughness:.9,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.055}));print.position.set(-1.88,-.47,-11.241);print.rotation.y=Math.PI;basement.add(print);
 return root;
}
