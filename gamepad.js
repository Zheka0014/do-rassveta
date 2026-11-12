// Controller support (Xbox / PlayStation / Steam Deck through the browser's
// standard mapping). Pure input logic: no DOM, so it can be tested in node.
export const PAD_BUTTONS=Object.freeze(['A','B','X','Y','LB','RB','LT','RT','BACK','START','L3','R3','UP','DOWN','LEFT','RIGHT','HOME']);
// One press = one game action. RT (sprint) and LT (dynamo) are held instead.
export const PAD_ACTIONS=Object.freeze({A:'jump',B:'crouch',X:'interact',Y:'flash',LB:'throw-auto',RB:'flare',L3:'journal',R3:'photo',UP:'heal',LEFT:'eat',RIGHT:'drink',DOWN:'curse',BACK:'pack',START:'pause'});
// What the keyboard prompts become while the controller is in use.
export const PAD_GLYPHS=Object.freeze({KeyE:'X',KeyF:'Y',KeyR:'LT',Space:'A',KeyH:'↑',KeyG:'RB',KeyC:'←',KeyV:'→',KeyQ:'LB',KeyX:'R3',KeyB:'↓',KeyJ:'L3',KeyI:'⧉',Tab:'⧉',ControlLeft:'B',ShiftLeft:'RT',Escape:'☰',KeyP:'⧉',KeyT:'⧉',KeyK:'⧉',KeyN:'⧉'});
const LETTER_KEYS={E:'KeyE',F:'KeyF',R:'KeyR',H:'KeyH',G:'KeyG',C:'KeyC',V:'KeyV',Q:'KeyQ',X:'KeyX',B:'KeyB',J:'KeyJ',I:'KeyI',P:'KeyP',T:'KeyT',K:'KeyK',N:'KeyN'};
const WORD_KEYS={CTRL:'ControlLeft',Ctrl:'ControlLeft',TAB:'Tab',Tab:'Tab',Esc:'Escape',ESC:'Escape',SHIFT:'ShiftLeft',Shift:'ShiftLeft','ПРОБЕЛ':'Space','Пробел':'Space',SPACE:'Space',Space:'Space'};
const LETTER=/[A-Za-zА-Яа-яЁё]/;

export const glyphFor=code=>PAD_GLYPHS[code]||null;
// Rewrites key names in a hint ("E — взять", "нажми E", "I / Tab") into controller buttons.
// A lone capital letter is replaced only where it names a key: followed by a dash,
// a separator or punctuation, or after a verb like "нажми" / "press". English "I am" stays.
export function padText(text){
 const source=String(text??'');let out='';
 const tokens=source.split(/(\s+)/);
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];if(/^\s+$/.test(token)||!token){out+=token;continue;}
  const match=token.match(/^([(«"]?)([A-Za-zА-Яа-яЁё]+)([)»".,:;!?·/]*)$/);
  if(!match){out+=token;continue;}
  const [,lead,word,tail]=match;const next=(tokens[i+2]||'').trim(),prev=(tokens[i-2]||'').trim().toLowerCase();
  let code=WORD_KEYS[word]||null;
  if(!code&&LETTER_KEYS[word]){
   const dash=/^[—–\-·/]/.test(next),verb=/^(нажми|нажать|удерживай|клавиша|кнопка|press|hold|key|на|on|in|в|at|из|from)$/.test(prev);
   // English "I" is also a pronoun: it becomes a button only beside a dash or after a verb.
   const keyLike=word==='I'?dash||verb:tail.length>0||dash||verb;
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
