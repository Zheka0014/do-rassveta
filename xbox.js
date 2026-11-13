// Xbox console edition: texts and credits without a keyboard, a mouse or links.
// Pure functions without the DOM (except creditsNodes), so the rules can be tested in node.
import {PAD_GLYPHS} from './gamepad.js?v=20261113-forest49';

// Texts that name keys outside the controller hints: the help list, the pause screen, the backpack
// and crate windows ("Зажечь · G", "E у костра") and the barricade button. Left alone: the controller
// part of the help (already in buttons) and the live messages and threats in those windows (story text,
// where an English "I" is a word, not a key; their key hints are converted by the game itself).
export const CONSOLE_TEXT_SCOPE='#help li, #pausePack, #packPanel, #containerPanel, #barrierButton';
export const CONSOLE_TEXT_SKIP='.pad-help, #packFeedback, #containerFeedback, #packThreat, #containerThreat';

const KEYS={E:'KeyE',F:'KeyF',R:'KeyR',H:'KeyH',G:'KeyG',C:'KeyC',V:'KeyV',Q:'KeyQ',X:'KeyX',B:'KeyB',J:'KeyJ',I:'KeyI',P:'KeyP',T:'KeyT',K:'KeyK',N:'KeyN',
 CTRL:'ControlLeft',Ctrl:'ControlLeft',TAB:'Tab',Tab:'Tab',ESC:'Escape',Esc:'Escape',SHIFT:'ShiftLeft',Shift:'ShiftLeft','ПРОБЕЛ':'Space','Пробел':'Space',SPACE:'Space',Space:'Space'};
// A word joiner marks buttons that are already right, so the key pass below leaves them alone.
const J='⁠',button=name=>J+name+J;
// Closing a window is B on the controller (the keyboard text says Esc or E / Esc); a page reload
// and a phone do not exist on the console.
const FIXES=[
 [' Esc закрывает окно.',' '+button('B')+' закрывает окно.'],[' Esc closes the panel.',' '+button('B')+' closes the panel.'],
 ['I / Esc — закрыть.',button('B')+' — закрыть.'],['I / Esc — close.',button('B')+' — close.'],
 ['закрой окно на E / Esc.','закрой окно на '+button('B')+'.'],['close with E / Esc.','close with '+button('B')+'.'],
 ['выход и обновление страницы завершают попытку','выход из игры завершает попытку'],['leaving or refreshing the page ends your run','leaving the game ends your run'],
 [' На телефоне нажми «Прыжок».',''],[' On a phone, tap “Jump”.','']
];
// Whole words only: "R3", "L3" or "If" are not keys.
const KEY_WORD=new RegExp('(^|[^A-Za-zА-Яа-яЁё0-9'+J+'])('+Object.keys(KEYS).sort((a,b)=>b.length-a.length).join('|')+')(?=$|[^A-Za-zА-Яа-яЁё0-9'+J+'])','g');

// "I или Tab — рюкзак… E у ящика… Esc закрывает окно" → "⧉ или ⧉ — рюкзак… X у ящика… B закрывает окно".
export function consoleText(text){
 let out=String(text??'');
 for(const [from,to] of FIXES)out=out.split(from).join(to);
 out=out.replace(KEY_WORD,(match,lead,word)=>lead+(PAD_GLYPHS[KEYS[word]]||word));
 return out.split(J).join('');
}

// The credits page (made from CREDITS.md) as plain dialog content: a console cannot open links,
// so every link becomes its text followed by the address, which keeps the attribution complete.
export function creditsNodes(doc,html){
 const page=new DOMParser().parseFromString(html,'text/html'),main=page.querySelector('main')||page.body;
 main.querySelectorAll('nav,script,style').forEach(node=>node.remove());
 main.querySelectorAll('a').forEach(link=>{
  const text=link.textContent.trim(),href=link.getAttribute('href')||'';
  const shown=/^https?:\/\//.test(href)&&!text.includes(href.replace(/^https?:\/\//,''))?text+' ('+href.replace(/^https?:\/\//,'').replace(/\/$/,'')+')':text;
  link.replaceWith(page.createTextNode(shown));
 });
 // The page heading repeats the dialog title.
 const first=main.querySelector('h1');if(first)first.remove();
 // The PC and Steam shell (Electron, steamworks.js) is not part of the console edition: its section goes.
 for(const head of [...main.querySelectorAll('h2,h3')]){
  if(!/Steam/.test(head.textContent))continue;
  let next=head.nextElementSibling;
  while(next&&!/^H[23]$/.test(next.tagName)){const after=next.nextElementSibling;next.remove();next=after;}
  head.remove();
 }
 return [...main.childNodes].map(node=>doc.importNode(node,true));
}

// What the console package adds instead: the Xbox app itself, the WebView2 SDK inside the package (its
// BSD-style licence asks for the notice in the materials shipped with it; the build copies the licence file
// from the SDK into the package) and WinUI 2.
export const XBOX_CREDITS=[
 'Оболочка для Xbox — UWP-приложение на C#, создано для проекта. Значки, плитки и заставка консольной версии тоже созданы для проекта.',
 'Microsoft Edge WebView2 SDK (Microsoft.Web.WebView2) — © Microsoft Corporation, лицензия в стиле BSD; её текст ниже.',
 'WinUI 2 (Microsoft.UI.Xaml) — © Microsoft Corporation, лицензия MIT (github.com/microsoft/microsoft-ui-xaml).'
];
export function xboxCreditsNodes(doc,licence){
 const head=doc.createElement('h3');head.textContent='Версия для Xbox';
 const list=doc.createElement('ul');
 for(const text of XBOX_CREDITS){const item=doc.createElement('li');item.textContent=text;list.append(item);}
 const nodes=[head,list];
 if(licence&&licence.trim()){
  const pre=doc.createElement('pre');pre.textContent=licence.trim();
  pre.style.cssText='white-space:pre-wrap;font:12px/1.5 ui-monospace,Consolas,monospace;margin:10px 0 0';
  nodes.push(pre);
 }
 return nodes;
}
