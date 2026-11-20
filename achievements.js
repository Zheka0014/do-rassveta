// Achievements. The ids are the Steam API names: the same list is entered in
// Steamworks (steam/store/achievements.csv), and the desktop build reports each
// unlock to Steam. In a browser they are remembered on this device only.
export const ACHIEVEMENTS=Object.freeze([
 {id:'FIRST_LIGHT',icon:'sun',name:'Первый свет',text:'Доживи до рассвета в полной двухчасовой ночи.',en:{name:'First Light',text:'Survive the full two-hour night until dawn.'}},
 {id:'TRIAL_NIGHT',icon:'moon',name:'Пробная ночь',text:'Доживи до утра в пробной ночи.',en:{name:'Trial Night',text:'Survive the trial night until morning.'}},
 {id:'TRUTH',icon:'antenna',name:'Правда',text:'Собери все три улики, настрой антенну и встреть рассвет.',en:{name:'The Truth',text:'Collect all three pieces of evidence, tune the antenna and see the dawn.'}},
 {id:'UNTOUCHED',icon:'shield',name:'Ни царапины',text:'Доживи до рассвета в полной ночи, ни разу не получив ранения.',en:{name:'Not a Scratch',text:'Reach dawn in the full night without being wounded once.'}},
 {id:'FOREST_REMEMBERS',icon:'tree',name:'Лес помнит',text:'Останься в лесу навсегда.',en:{name:'The Forest Remembers',text:'Stay in the forest forever.'}},
 {id:'JOURNAL',icon:'book',name:'Первая запись',text:'Прочитай журнал лесника.',en:{name:'The First Entry',text:'Read the ranger\'s journal.'}},
 {id:'ALL_EVIDENCE',icon:'tag',name:'Три улики',text:'Найди журнал, запись Лёши и жетон за одну ночь.',en:{name:'Three Clues',text:'Find the journal, Lyosha\'s tape and the dog tag in a single night.'}},
 {id:'SIGNAL',icon:'radio',name:'Есть связь',text:'Восстанови питание кордона и настрой антенну.',en:{name:'Signal',text:'Restore the outpost\'s power and tune the antenna.'}},
 {id:'BELL',icon:'bell',name:'Медный голос',text:'Ударь в колокол часовни.',en:{name:'Voice of Copper',text:'Ring the chapel bell.'}},
 {id:'LAST_SHIFT',icon:'saw',name:'Последняя смена',text:'Найди запись на дне шахты лесопилки.',en:{name:'The Last Shift',text:'Find the notes at the bottom of the sawmill shaft.'}},
 {id:'WAGON_04',icon:'rail',name:'Вагон № 04',text:'Прочитай запись дежурного в заброшенном вагоне.',en:{name:'Railcar No. 04',text:'Read the duty log in the abandoned railcar.'}},
 {id:'TRAPPER',icon:'trap',name:'Капканщик',text:'Задержи Смотрителя своим капканом.',en:{name:'Trapper',text:'Hold the Watcher with your own trap.'}},
 {id:'ROOTS',icon:'root',name:'Корни держат',text:'Выберись из топи, ухватившись за корень.',en:{name:'The Roots Hold',text:'Pull yourself out of the swamp by a root.'}},
 {id:'FILM_REMEMBERS',icon:'camera',name:'Плёнка помнит',text:'Проявь на снимке скрытую надпись.',en:{name:'The Film Remembers',text:'Reveal a hidden inscription on a photograph.'}},
 {id:'WELL_WATER',icon:'well',name:'Глубокая вода',text:'Подними воду из колодца.',en:{name:'Deep Water',text:'Draw water from the well.'}},
 {id:'DONT_BLINK',icon:'eye',name:'Не моргай',text:'Переживи встречу с Неподвижным.',en:{name:'Don\'t Blink',text:'Survive an encounter with the Still One.'}},
 {id:'HOLD_BREATH',icon:'ear',name:'Затаив дыхание',text:'Переживи охоту Слухача, ни разу не попавшись ему.',en:{name:'Hold Your Breath',text:'Outlast the Listener\'s hunt without being caught.'}},
 {id:'KNOCK_KNOCK',icon:'door',name:'Тук-тук',text:'Удержи баррикаду, пока снаружи проверяют дверь.',en:{name:'Knock Knock',text:'Keep the barricade up while something tests the door.'}}
]);
export const ACHIEVEMENT_KEY='do-rassveta.achievements.v1';
const KNOWN=new Set(ACHIEVEMENTS.map(a=>a.id));
export const achievementById=id=>ACHIEVEMENTS.find(a=>a.id===id)||null;
// Russian is the source; other languages take [name, text] from their locale table by id, with English as the fallback.
export function achievementText(achievement,language='ru',table=null){
 if(language==='ru')return {name:achievement.name,text:achievement.text};
 const own=language!=='en'&&table?.[achievement.id];
 return own?{name:own[0],text:own[1]}:achievement.en;
}

export class AchievementTracker{
 constructor(storage=null,notify=()=>{},key=ACHIEVEMENT_KEY){this.storage=storage;this.notify=notify;this.key=key;this.done=new Map();this.load();}
 load(){
  this.done=new Map();
  try{const raw=JSON.parse(this.storage?.getItem(this.key)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [id,at]of Object.entries(raw))if(KNOWN.has(id))this.done.set(id,Number.isFinite(at)?at:0);}catch{}
  return this;
 }
 has(id){return this.done.has(id);}
 unlocked(){return ACHIEVEMENTS.filter(a=>this.done.has(a.id)).map(a=>a.id);}
 get count(){return this.done.size;}
 // Returns true only for a new unlock; repeating a known one is silent.
 unlock(id,now=Date.now()){
  if(!KNOWN.has(id)||this.done.has(id))return false;
  this.done.set(id,now);
  try{this.storage?.setItem(this.key,JSON.stringify(Object.fromEntries(this.done)));}catch{}
  try{this.notify(achievementById(id));}catch{}
  return true;
 }
}

// Achievements decided when a night ends.
export function endOfRunAchievements({won=false,mode='full',abandoned=false,wounded=false,truth=false}={}){
 const ids=[];
 if(won&&mode==='full')ids.push('FIRST_LIGHT');
 if(won&&mode==='demo')ids.push('TRIAL_NIGHT');
 if(won&&truth)ids.push('TRUTH');
 if(won&&mode==='full'&&!wounded)ids.push('UNTOUCHED');
 if(!won&&!abandoned)ids.push('FOREST_REMEMBERS');
 return ids;
}
