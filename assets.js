import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
// Placements clone the cached scene prototype or its geometry.
const loader=new GLTFLoader(),models=new Map();
export function loadForestAsset(url){
 if(!models.has(url))models.set(url,loader.loadAsync(url).catch(error=>{models.delete(url);throw error;}));
 return models.get(url);
}
