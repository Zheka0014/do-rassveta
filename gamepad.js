// Controller support (Xbox / PlayStation / Steam Deck through the browser's
// standard mapping). Pure input logic: no DOM, so it can be tested in node.
export const PAD_BUTTONS=Object.freeze(['A','B','X','Y','LB','RB','LT','RT','BACK','START','L3','R3','UP','DOWN','LEFT','RIGHT','HOME']);
// One press = one game action. RT (sprint) and LT (dynamo) are held instead.
export const PAD_ACTIONS=Object.freeze({A:'jump',B:'crouch',X:'interact',Y:'flash',LB:'throw-auto',RB:'flare',L3:'journal',R3:'photo',UP:'heal',LEFT:'eat',RIGHT:'drink',DOWN:'curse',BACK:'pack',START:'pause'});
// What the keyboard prompts become while the controller is in use.
export const PAD_GLYPHS=Object.freeze({KeyE:'X',KeyF:'Y',KeyR:'LT',Space:'A',KeyH:'↑',KeyG:'RB',KeyC:'←',KeyV:'→',KeyQ:'LB',KeyX:'R3',KeyB:'↓',KeyJ:'L3',KeyI:'⧉',Tab:'⧉',ControlLeft:'B',ShiftLeft:'RT',Escape:'☰',KeyP:'⧉',KeyT:'⧉',KeyK:'⧉',KeyN:'⧉'});
const LETTER_KEYS={E:'KeyE',F:'KeyF',R:'KeyR',H:'KeyH',G:'KeyG',C:'KeyC',V:'KeyV',Q:'KeyQ',X:'KeyX',B:'KeyB',J:'KeyJ',I:'KeyI',P:'KeyP',T:'KeyT',K:'KeyK',N:'KeyN'};
// Key names as the translations write them (the space bar has a name in every language).
export const SPACE_NAMES=Object.freeze(['ПРОБЕЛ','Пробел','SPACE','Space','LEERTASTE','Leertaste','ESPACE','Espace','ESPACIO','Espacio','ESPAÇO','Espaço','SPAZIO','Spazio','SPACJA','Spacja','BOŞLUK','Boşluk','ПРОБІЛ','Пробіл','空格键','スペース','스페이스바']);
const WORD_KEYS={CTRL:'ControlLeft',Ctrl:'ControlLeft',STRG:'ControlLeft',Strg:'ControlLeft',TAB:'Tab',Tab:'Tab',Esc:'Escape',ESC:'Escape',SHIFT:'ShiftLeft',Shift:'ShiftLeft',...Object.fromEntries(SPACE_NAMES.map(name=>[name,'Space']))};
// Key names that are also ordinary words ("Space freed", "Espacio libre", "SHIFT LOG", "空きスペース"):
// they are keys only beside a dash, after a verb like "press", or as the whole text.
const AMBIGUOUS=new Set(['Shift','SHIFT','Space','SPACE','Espace','ESPACE','Espacio','ESPACIO','Espaço','ESPAÇO','Spazio','SPAZIO','Boşluk','BOŞLUK','スペース']);
// Words before a key ("нажми E", "press E", "drücke E", "appuie sur E", "按 E", "with E", "dans I", "no Q", "w P")
// and words after it in languages that name the key first ("E tuşu", "E キー", "E 키").
const KEY_BEFORE=/^(нажми|нажать|удерживай|клавиша|кнопка|на|в|из|натисни|натисніть|утримуй|клавіша|клавішею|з|із|зі|press|hold|key|on|in|at|from|with|using|via|drücke|drück|halte|taste|mit|auf|über|im|appuie|appuyez|maintiens|maintenez|touche|sur|avec|dans|depuis|par|pulsa|presiona|mantén|tecla|con|en|desde|por|pressione|aperte|segure|com|em|no|na|pelo|pela|premi|premuto|tieni|tasto|su|da|nel|nello|dal|dallo|naciśnij|wciśnij|przytrzymaj|klawisz|klawiszem|w|z|按|按住|长按)$/;
const KEY_AFTER=/^(tuş|TUŞ|menü|キー|키|键|鍵)/;
const CJK_KEY=new RegExp('(?<![A-Za-z0-9])(?:'+[...Object.keys(WORD_KEYS),...Object.keys(LETTER_KEYS)].sort((a,b)=>b.length-a.length).join('|')+')(?![A-Za-z0-9])','g');
// After this a new sentence or clause begins ("… sound. B switches", "— E to let go", "photo, P opens").
const CLAUSE_END=/(^|[.,!?:;·—–])$/;

export const glyphFor=code=>PAD_GLYPHS[code]||null;
// Rewrites key names in a hint ("E — взять", "нажми E", "I / Tab") into controller buttons.
// A lone capital letter is replaced only where it names a key: followed by a dash,
// a separator or punctuation, or after a verb like "нажми" / "press". English "I am" stays.
export function padText(text){
 const source=String(text??''),cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(source);
 // Chinese, Japanese and Korean: a Latin key name that does not touch other Latin letters is always a key
 // ("。V で", "按 E 拾取", "R를"), whatever stands around it; the Japanese space bar only beside a dash or キー.
 if(cjk)return source.replace(CJK_KEY,(match,offset)=>{
  const code=WORD_KEYS[match]||LETTER_KEYS[match];if(!code||!PAD_GLYPHS[code])return match;
  if(AMBIGUOUS.has(match)&&!/^\s*(—|–|-|キー)/.test(source.slice(offset+match.length))&&source.trim()!==match)return match;
  return PAD_GLYPHS[code];
 });
 let out='';
 const tokens=source.split(/(\s+)/);
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];if(/^\s+$/.test(token)||!token){out+=token;continue;}
  const match=token.match(/^([(«"„“‘]?)(\p{L}+)([)»"“”’.,:;!?·/、。，：；！？]*)$/u);
  if(!match){out+=token;continue;}
  const [,lead,word,tail]=match;const next=(tokens[i+2]||'').trim(),before=(tokens[i-2]||'').trim(),prev=before.toLowerCase();
  const dash=/^[—–\-·/]/.test(next)||KEY_AFTER.test(next),verb=KEY_BEFORE.test(prev),alone=source.trim()===token;
  let code=null;
  if(WORD_KEYS[word])code=!AMBIGUOUS.has(word)||dash||verb||alone?WORD_KEYS[word]:null;
  else if(LETTER_KEYS[word]){
   // "IVAN K." and "N. 04" are an initial and an abbreviation, not keys.
   const initial=tail==='.'&&!verb&&(/^\d/.test(next)||/^\p{Lu}{2,}$/u.test(before)&&!/^\p{Ll}/u.test(next));
   // A key that opens a sentence or a clause and is followed by a verb: "E starts the saw", "— E to let go".
   const opens=!lead&&!tail&&CLAUSE_END.test(before)&&/^\p{Ll}/u.test(next);
   // English "I" is also a pronoun (and "I"/"E" are conjunctions in Polish, Italian and Portuguese):
   // it becomes a button only beside a dash or after a verb.
   // A lone letter is a compass point ("N", "E"), never a prompt.
   const keyLike=word==='I'?dash||verb:!initial&&(tail.length>0||dash||verb||opens);
   if(keyLike)code=LETTER_KEYS[word];
  }
  out+=code&&PAD_GLYPHS[code]?lead+PAD_GLYPHS[code]+tail:token;
 }
 return out;
}

// Radial dead zone with rescaling, so small stick drift never moves the player.
export function stick(x,y,dead=.18){
 const length=Math.hypot(x,y);if(!Number.isFinite(length)||length<=dead)return {x:0,y:0};
 const scaled=Math.min(1,(length-dead)/(1-dead))/length;return {x:x*scaled,y:y*scaled};
}
// Fine aiming near the centre, full speed at the edge.
export const lookCurve=v=>Math.sign(v)*Math.pow(Math.min(1,Math.abs(v)),1.8);

export class GamepadState{
 constructor(){this.previous=new Set();this.repeatAt=0;this.direction='';this.connected=false;}
 reset(){this.previous=new Set();this.repeatAt=0;this.direction='';}
 // pad: a Gamepad (or a plain object with buttons/axes); now: milliseconds.
 read(pad,now=0){
  const result={connected:!!pad,active:false,move:{x:0,y:0},look:{x:0,y:0},sprint:false,dynamo:false,held:new Set(),pressed:new Set(),navigate:null};
  if(!pad){this.connected=false;this.previous.clear();this.direction='';return result;}
  this.connected=true;
  const value=index=>{const b=pad.buttons?.[index];return b===undefined?0:typeof b==='number'?b:b.value||(b.pressed?1:0);};
  PAD_BUTTONS.forEach((name,index)=>{const threshold=name==='LT'||name==='RT'?.35:.5;if(value(index)>threshold)result.held.add(name);});
  for(const name of result.held)if(!this.previous.has(name))result.pressed.add(name);
  this.previous=new Set(result.held);
  const axes=pad.axes||[];
  result.move=stick(axes[0]||0,axes[1]||0);const look=stick(axes[2]||0,axes[3]||0,.14);result.look={x:lookCurve(look.x),y:lookCurve(look.y)};
  result.sprint=result.held.has('RT');result.dynamo=result.held.has('LT');
  result.active=result.held.size>0||Math.hypot(result.move.x,result.move.y)>0||Math.hypot(result.look.x,result.look.y)>0;
  // Menu navigation: d-pad or left stick, with a held-direction repeat.
  const dx=result.held.has('LEFT')||result.move.x<-.55?-1:result.held.has('RIGHT')||result.move.x>.55?1:0;
  const dy=result.held.has('UP')||result.move.y<-.55?-1:result.held.has('DOWN')||result.move.y>.55?1:0;
  const direction=dx||dy?dx+','+dy:'';
  if(!direction){this.direction='';}
  else if(direction!==this.direction){this.direction=direction;this.repeatAt=now+380;result.navigate={dx,dy};}
  else if(now>=this.repeatAt){this.repeatAt=now+140;result.navigate={dx,dy};}
  return result;
 }
}

// Spatial focus: the nearest control in the pressed direction.
// rects: [{x,y,width,height}], current: index or -1. Returns an index or -1.
export function nextFocus(rects,current,dx,dy){
 if(!rects.length)return -1;
 if(current<0||current>=rects.length)return 0;
 const centre=r=>({x:r.x+r.width/2,y:r.y+r.height/2}),from=centre(rects[current]);
 let best=-1,score=Infinity;
 rects.forEach((r,i)=>{
  if(i===current||r.width<=0||r.height<=0)return;const c=centre(r),vx=c.x-from.x,vy=c.y-from.y;
  const along=vx*dx+vy*dy;if(along<=4)return;
  const across=Math.abs(vx*dy-vy*dx);const s=along+across*2.2;
  if(s<score){score=s;best=i;}
 });
 return best;
}
