// Player settings that survive a restart: volume, look, graphics, controller.
// Only values the player has actually chosen are stored, so a later version can
// change a default without being overridden by an untouched old value.
export const SETTINGS_KEY='do-rassveta.settings.v1';
export const DEFAULT_SETTINGS=Object.freeze({
 language:'',volume:55,sensitivity:75,brightness:105,quality:'high',resolution:'fhd',bobbing:true,invertY:false,fov:65,
 cinematic:true,particles:true,liveMenu:true,padSensitivity:100,vibration:true
});
const RANGES={volume:[0,100],sensitivity:[20,180],brightness:[75,155],fov:[55,90],padSensitivity:[40,200]};
const CHOICES={language:['','ru','en'],quality:['low','high','ultra'],resolution:['auto','fhd','qhd','uhd','native']};
const FLAGS=['bobbing','invertY','cinematic','particles','liveMenu','vibration'];

// Returns the accepted value, or undefined for anything that does not belong to the key.
export function validSetting(key,value){
 if(RANGES[key]){const n=typeof value==='string'&&value.trim()!==''?Number(value):value;if(typeof n!=='number'||!Number.isFinite(n))return undefined;const [lo,hi]=RANGES[key];return Math.min(hi,Math.max(lo,Math.round(n)));}
 if(CHOICES[key])return CHOICES[key].includes(value)?value:undefined;
 if(FLAGS.includes(key))return typeof value==='boolean'?value:value==='true'?true:value==='false'?false:undefined;
 return undefined;
}
export function sanitizeSettings(raw){
 const clean={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return clean;
 for(const key of Object.keys(DEFAULT_SETTINGS)){if(!Object.hasOwn(raw,key))continue;const value=validSetting(key,raw[key]);if(value!==undefined)clean[key]=value;}
 return clean;
}
export class Settings{
 constructor(storage=null,key=SETTINGS_KEY){this.storage=storage;this.key=key;this.chosen={};}
 load(){
  try{const text=this.storage?.getItem(this.key);this.chosen=text?sanitizeSettings(JSON.parse(text)):{};}catch{this.chosen={};}
  return this;
 }
 has(key){return Object.hasOwn(this.chosen,key);}
 get(key){return this.has(key)?this.chosen[key]:DEFAULT_SETTINGS[key];}
 // Returns true when the stored value changed.
 set(key,value){const clean=validSetting(key,value);if(clean===undefined||this.chosen[key]===clean)return false;this.chosen[key]=clean;this.save();return true;}
 save(){try{this.storage?.setItem(this.key,JSON.stringify(this.chosen));return true;}catch{return false;}}
 all(){return {...DEFAULT_SETTINGS,...this.chosen};}
}
