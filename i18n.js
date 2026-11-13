import {EN} from './locale-en.js?v=20261113-forest49';

// An optional last step for shown texts (the console edition writes keys as controller buttons).
let displayFilter=null;
export function setDisplayFilter(filter){displayFilter=typeof filter==='function'?filter:null;}
let language=typeof location==='object'&&new URLSearchParams(location.search).get('lang')==='en'?'en':'ru';
const listeners=new Set(),cyrillic=/[А-Яа-яЁё]/;
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Longer phrases win over item names; Cyrillic boundaries protect whole words.
const phrases=new RegExp('(?<![А-Яа-яЁё])(?:'+Object.keys(EN).sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![А-Яа-яЁё])','g');
export const getLanguage=()=>language;
export function translate(value,lang=language){
 const text=String(value??'');if(lang!=='en'||!cyrillic.test(text))return text;
 if(Object.hasOwn(EN,text))return EN[text];
 return text.replace(phrases,match=>EN[match]);
}
export function onLanguageChange(callback){listeners.add(callback);return()=>listeners.delete(callback);}
export function setLanguage(next){
 if(!['ru','en'].includes(next)||language===next)return false;
 language=next;for(const callback of listeners)callback(next);return true;
}

// Only text nodes and accessible labels are observed, never animation styles.
// Remember the Russian source so a live run can switch back without restarting.
export function installLocalization(doc){
 const sources=new WeakMap(),attributes=new WeakMap(),names=['aria-label','alt','title','placeholder'];
 function textNode(node){
  if(['SCRIPT','STYLE'].includes(node.parentElement?.tagName)||node.parentElement?.closest('[translate="no"]'))return;
  const current=node.data,previous=sources.get(node);
  const source=previous&&current===previous.rendered?previous.source:current;
  const translated=translate(source),rendered=displayFilter?displayFilter(translated,node):translated;sources.set(node,{source,rendered});if(current!==rendered)node.data=rendered;
 }
 function element(node){
  let saved=attributes.get(node);if(!saved){saved=new Map();attributes.set(node,saved);}
  const attrs=node.tagName==='META'&&node.getAttribute('name')==='description'?[...names,'content']:names;
  for(const name of attrs){if(!node.hasAttribute(name))continue;const current=node.getAttribute(name),old=saved.get(name),source=old&&current===old.rendered?old.source:current,rendered=translate(source);saved.set(name,{source,rendered});if(current!==rendered)node.setAttribute(name,rendered);}
 }
 function visit(node){if(node.nodeType===3)textNode(node);else if(node.nodeType===1){if(['SCRIPT','STYLE'].includes(node.tagName)||node.getAttribute('translate')==='no')return;element(node);for(const child of node.childNodes)visit(child);}}
 function refresh(){
  doc.documentElement.lang=language;visit(doc.documentElement);
  for(const id of ['languageMenu','language']){const select=doc.getElementById(id);if(select)select.value=language;}
 }
 for(const id of ['languageMenu','language'])doc.getElementById(id)?.addEventListener('change',event=>setLanguage(event.target.value));
 const observer=new doc.defaultView.MutationObserver(records=>{
  for(const record of records){if(record.type==='characterData')textNode(record.target);else if(record.type==='attributes')element(record.target);else for(const node of record.addedNodes)visit(node);}
 });
 refresh();observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...names,'content']});
 const unsubscribe=onLanguageChange(refresh);
 return {refresh,dispose(){observer.disconnect();unsubscribe();}};
}

// Redraw lettering in existing GPU textures: no geometry rebuild on language change.
export function localizeCanvas(texture,paint){
 const redraw=()=>{paint();texture.needsUpdate=true;};
 const unsubscribe=onLanguageChange(redraw);texture.addEventListener('dispose',unsubscribe);redraw();return texture;
}
