import {EN} from './locale-en.js?v=20261120-forest50';

// Russian is the source language: the page and the code are written in Russian, and every dictionary maps
// those texts to a translation. English ships with the game; the other languages load on demand
// (locale-<code>.js) and fall back to English for any text they leave out.
export const LANGUAGES=Object.freeze([
 ['ru','Русский'],['en','English'],['de','Deutsch'],['fr','Français'],['es','Español'],['pt-BR','Português (Brasil)'],['it','Italiano'],
 ['pl','Polski'],['tr','Türkçe'],['uk','Українська'],['zh-CN','简体中文'],['ja','日本語'],['ko','한국어']
].map(([code,name])=>Object.freeze({code,name})));
export const LANGUAGE_CODES=Object.freeze(LANGUAGES.map(l=>l.code));
const SUPPORTED=new Set(LANGUAGE_CODES);
export const isLanguage=code=>SUPPORTED.has(code);
// A system, browser or store language tag ("de-AT", "pt-PT", "zh-Hant-TW", "uk_UA") → a shipped language, or ''.
export function matchLanguage(tag){
 const base=String(tag||'').trim().toLowerCase().replace(/_/g,'-').split('-')[0];
 if(!base)return '';
 // Belarusian and Kazakh systems read Russian more often than English, as before.
 if(['ru','be','kk'].includes(base))return 'ru';
 if(base==='pt')return 'pt-BR';
 if(base==='zh')return 'zh-CN';
 return LANGUAGE_CODES.find(code=>code===base)||'';
}
// The first shipped language in the player's list (navigator.languages), otherwise English.
export function preferredLanguage(tags){
 for(const tag of [].concat(tags||[])){const code=matchLanguage(tag);if(code)return code;}
 return 'en';
}

// An optional last step for shown texts (the console edition writes keys as controller buttons).
let displayFilter=null;
export function setDisplayFilter(filter){displayFilter=typeof filter==='function'?filter:null;}

const cyrillic=/[А-Яа-яЁё]/,ukrainianLetters=/[ІіЇїЄєҐґ]/;
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Every dictionary has the English keys. Longer phrases win over item names; Cyrillic boundaries protect whole words.
const phrases=new RegExp('(?<![А-Яа-яЁё])(?:'+Object.keys(EN).sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![А-Яа-яЁё])','g');
const locales=new Map([['en',{strings:EN,values:new Set(Object.values(EN)),achievements:null,console:[]}]]);
const loading=new Map();
// Loads a language once; resolves to true when its texts are ready (Russian and English always are).
export function loadLanguage(code){
 if(code==='ru'||locales.has(code))return Promise.resolve(true);
 if(!SUPPORTED.has(code))return Promise.resolve(false);
 if(!loading.has(code))loading.set(code,import('./locale-'+code+'.js?v=20261120-forest50').then(module=>{
  const own=module.STRINGS||{};
  locales.set(code,{strings:Object.freeze({...EN,...own}),values:new Set(Object.values(own)),achievements:module.ACHIEVEMENTS||null,console:module.CONSOLE||[]});
  return true;
 },error=>{loading.delete(code);throw error;}));
 return loading.get(code);
}
export const isLanguageReady=code=>code==='ru'||locales.has(code);

const listeners=new Set();
const requested=typeof location==='object'?new URLSearchParams(location.search).get('lang'):null;
let language=requested&&SUPPORTED.has(requested)?requested:'ru',wanted=language;
// A language asked for in the address (the Steam shell passes the Steam language) is ready before the first frame.
if(!isLanguageReady(language)){try{await loadLanguage(language);}catch{language=wanted='en';}}

export const getLanguage=()=>language;
export const languageName=(code=language)=>LANGUAGES.find(l=>l.code===code)?.name||code;
export function translate(value,lang=language){
 const text=String(value??'');if(lang==='ru'||!cyrillic.test(text))return text;
 const locale=locales.get(lang)||locales.get('en'),strings=locale.strings;
 if(Object.hasOwn(strings,text))return strings[text];
 // Already shown in this language: a Ukrainian line is Cyrillic too.
 if(locale.values.has(text)||lang==='uk'&&ukrainianLetters.test(text))return text;
 return text.replace(phrases,match=>strings[match]??match);
}
// A text with values: format('Открыто {n} из {total}.',{n:3,total:18}). The template itself is the key.
export function format(template,values={},lang=language){
 let text=translate(template,lang);
 for(const [name,value] of Object.entries(values))text=text.split('{'+name+'}').join(String(value));
 return text;
}
// Extra tables of the current language: achievements by id ([name,text]) and console text fixes.
export const localeTable=(name,lang=language)=>locales.get(lang)?.[name]||null;
export function onLanguageChange(callback){listeners.add(callback);return()=>listeners.delete(callback);}
function apply(next){
 if(language===next)return false;
 language=next;for(const callback of listeners)callback(next);return true;
}
// Switches at once when the language is ready, otherwise as soon as its file has loaded
// (a later choice wins over a slow load). Returns false for an unknown or the current language.
export function setLanguage(next){
 if(!SUPPORTED.has(next))return false;
 if(next===language&&wanted===next)return false;
 wanted=next;
 if(isLanguageReady(next))return apply(next);
 loadLanguage(next).then(()=>{if(wanted===next)apply(next);},()=>{if(wanted===next)wanted=language;});
 return true;
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
 // Every language under its own name; the list itself is never translated.
 const selects=['languageMenu','language'].map(id=>doc.getElementById(id)).filter(Boolean);
 for(const select of selects){
  select.setAttribute('translate','no');
  select.replaceChildren(...LANGUAGES.map(l=>{const option=doc.createElement('option');option.value=l.code;option.textContent=l.name;option.lang=l.code;return option;}));
  select.addEventListener('change',event=>setLanguage(event.target.value));
 }
 function refresh(){
  doc.documentElement.lang=language;visit(doc.documentElement);
  for(const select of selects)select.value=wanted;
 }
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
