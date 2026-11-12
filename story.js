export const PHASES=[
 {from:0,name:'20:00 · Поиски',text:'Ты приехал за братом. Найди журнал лесника в избе.',cold:1,storm:0,hunt:1},
 {from:.2,name:'22:00 · Чужие шаги',text:'Лёша в эфире: «Не верь моему голосу». Другой голос повторяет те же слова без помех.',cold:1.15,storm:.15,hunt:1.05},
 {from:.4,name:'00:00 · Лес меняет следы',text:'На знакомой дороге появились чужие отпечатки. Проверь запись в подвале.',cold:1.35,storm:.35,hunt:1.1},
 {from:.7,name:'03:00 · Буря',text:'Ветер срывает ориентиры. Питание кордона и антенна помогут установить связь.',cold:1.7,storm:1,hunt:1.18},
 {from:.9,name:'05:00 · Последний час',text:'Голос зовёт к выходу. Не уходи раньше первого света.',cold:1.5,storm:.7,hunt:1.23}
];
export const STORY_ITEMS=[
 {id:'journal',x:2.15,z:-16,level:'upper',label:'Прочитать журнал лесника'},
 {id:'tape',x:2.2,z:-12,level:'lower',label:'Прослушать запись Лёши'},
 {id:'medal',x:-12.7,z:-8.4,level:'outside',label:'Осмотреть жетон у могилы'},
 {id:'fuse',x:2.1,z:-15.5,level:'lower',label:'Взять предохранитель'},
 {id:'generator',x:-30,z:17,level:'outside',label:'Восстановить питание'},
 {id:'antenna',x:29,z:-23,level:'outside',label:'Настроить антенну'}
];
export const storyReserved=(x,z)=>STORY_ITEMS.some(o=>o.level==='outside'&&Math.hypot(x-o.x,z-o.z)<3.4);
export function phaseAt(progress){return PHASES.filter(p=>progress>=p.from).at(-1)||PHASES[0];}
const notes={journal:'ЖУРНАЛ · «Лёша пришёл вчера. Через час рация заговорила его голосом. Сам он в это время спал. Предохранитель оставил в подвале; генератор — на западе, антенна — на северо-востоке».',tape:'ЗАПИСЬ ЛЁШИ · «Он повторяет всё, что я говорю. Потом произносит это раньше меня. Если услышишь меня у выхода — проверь жетон. На моём номер 0417».',medal:'ЖЕТОН · 0417. Под ним запись лесника: «Лёша не вышел. В эфире остался голос. Сигнал можно оборвать только на исправной антенне».',fuse:'ПРЕДОХРАНИТЕЛЬ · Деталь подходит к генератору западнее кордона. Для его запуска нужны две связки дров.',generator:'ПИТАНИЕ ВОССТАНОВЛЕНО · Ток подан на кордон. Теперь настрой антенну на северо-востоке.',antenna:'АНТЕННА · На частоте спасателей слышно дыхание. Собери все три улики, чтобы отличить голос брата от подражателя.'};
export class StoryNight{
 constructor(){this.reset();}
 reset(){this.done=new Set();this.evidence=new Set();this.phase=-1;this.log=[];}
 update(progress,active=true){if(!active)return null;const phase=PHASES.indexOf(phaseAt(progress));if(phase===this.phase)return null;this.phase=phase;return PHASES[phase];}
 interact(id,wood=0,active=true){if(!active||this.done.has(id)||!STORY_ITEMS.some(o=>o.id===id))return {ok:false,text:'Здесь больше ничего нет.'};if(id==='generator'&&!this.done.has('fuse'))return {ok:false,text:'Не хватает предохранителя. Он в подвале.'};if(id==='generator'&&wood<2)return {ok:false,text:'Для генератора нужны две связки дров.'};if(id==='antenna'&&!this.done.has('generator'))return {ok:false,text:'Антенна обесточена. Восстанови генератор на западе.'};this.done.add(id);if(['journal','tape','medal'].includes(id))this.evidence.add(id);const text=id==='antenna'&&this.evidence.size===3?'АНТЕННА · Журнал, запись и жетон совпадают. Чужой голос выдаёт номер 0419. Ты знаешь правильный: 0417. На рассвете можно разорвать сигнал.':notes[id];this.log.push(text);return {ok:true,text,wood:id==='generator'?2:0};}
 get objective(){if(!this.done.has('journal'))return 'Журнал лесника · в избе';if(!this.done.has('fuse'))return 'Предохранитель · в подвале';if(!this.done.has('generator'))return 'Генератор · запад · дрова ×2';if(!this.done.has('antenna'))return 'Антенна · северо-восток';if(!this.done.has('tape'))return 'Запись Лёши · в подвале';if(!this.done.has('medal'))return 'Жетон · на кладбище';return 'Сигнал разоблачён · дожить до утра';}
 ending(){if(this.done.has('antenna')&&this.evidence.size===3)return {title:'Ты узнал правду.',text:'В 06:00 ты разрываешь чужой сигнал и вызываешь спасателей. У выхода голос брата замолкает. Ты уносишь его запись и жетон: Лёша погиб здесь, но лес больше не говорит за него.'};if(this.done.has('antenna'))return {title:'Тебя услышали.',text:'Спасатели отвечают по восстановленной связи. Ты уходишь на рассвете. В эфире Лёша просит подождать. Улик не хватило, чтобы понять, кто зовёт тебя обратно.'};return {title:'Ты вышел один.',text:'Первый свет открывает дорогу. Ты выжил, но связь осталась чужой. За спиной брат произносит твоё имя. Его судьба остаётся неизвестной.'};}
}
export class WatcherMemory{
 constructor(){this.reset();}
 reset(){this.routes=new Map();this.camps=new Map();this.clock=0;this.warned=new Set();}
 update(dt,{active=true,x=0,z=0,moving=false,camp=null,mode='full'}={}){if(!active||!Number.isFinite(dt)||dt<=0)return false;this.clock+=dt;if(moving){const key=Math.round(x/8)+','+Math.round(z/8);this.routes.set(key,(this.routes.get(key)||0)+dt);}if(camp!==null){const t=(this.camps.get(camp)||0)+dt;this.camps.set(camp,t);if(t>(mode==='demo'?22:150)&&!this.warned.has(camp)){this.warned.add(camp);return true;}}return false;}
 ambush(x,z,allowed){const ranked=[...this.routes].sort((a,b)=>b[1]-a[1]);for(const [key,time]of ranked){if(time<8)continue;const [cx,cz]=key.split(',').map(v=>Number(v)*8);for(const [dx,dz]of [[5,0],[-5,0],[0,5],[0,-5]]){const p={x:cx+dx,z:cz+dz};if(Math.hypot(p.x-x,p.z-z)>15&&Math.hypot(p.x-x,p.z-z)<42&&allowed(p.x,p.z))return p;}}return null;}
}
