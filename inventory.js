export const ITEMS = [
 {key:'wood',name:'Дрова',weight:1,icon:'M4 17 19 5M5 5l14 12M3 18l3 3M18 3l3 3',hint:'E у костра · мокрые дрова требуют растопку'},
 {key:'kits',name:'Аптечка',weight:2,icon:'M4 7h16v14H4zM9 7V3h6v4M12 10v8M8 14h8',action:'heal',use:'Перевязать · H'},
 {key:'flares',name:'Фальшфейер',weight:1,icon:'M9 12h6v10H9zM12 2v5M4 5l4 4M20 5l-4 4',action:'flare',use:'Зажечь · G'},
 {key:'food',name:'Консервы',weight:1,icon:'M5 6h14v14H5zM5 6l3-3h8l3 3M5 10h14M9 15h6',action:'eat',use:'Съесть · C'},
 {key:'water',name:'Вода',weight:1,icon:'M9 2h6v5l3 4v11H6V11l3-4zM9 15h6',action:'drink',use:'Выпить · V'},
 {key:'crowbar',name:'Лом',weight:1,icon:'M6 22 16 6q3-7 6-2l-3 3',hint:'E у запертого ящика лесопилки'},
 {key:'rope',name:'Верёвка',weight:1,icon:'M8 18q-8-8 0-14q8-6 12 2q4 9-7 12q-8 2-7-6q1-6 7-6q7 0 2 6M13 18v5',hint:'E у шахты · остаётся после установки'},
 {key:'trapKits',name:'Капкан',weight:2,icon:'M3 17q9-11 18 0M3 17h18M6 15v-5M10 13V8M14 13V8M18 15v-5',action:'set-trap',use:'Установить · K'},
 {key:'stones',name:'Камни',weight:1,icon:'M3 16 7 6 17 4 22 14 16 21 6 21z',action:'throw-stone',use:'Бросить · Q'},
 {key:'bottles',name:'Бутылки',weight:1,icon:'M10 2h4v6l4 4v10H6V12l4-4zM6 16h12',action:'throw-bottle',use:'Бросить бутылку'},
 {key:'toys',name:'Заводная птица',weight:1,icon:'M3 15q4-11 13-5l4-3v9l-4-2q-6 8-13 1M10 17v5M7 22h7M21 11h2',action:'wind-toy',use:'Завести · N'},
 {key:'kindling',name:'Растопка',weight:1,icon:'M3 19 19 4M5 21 21 6M4 6l15 15M2 8l15 15',hint:'Расходуется при розжиге мокрых дров'}
];
export const iconFor = item => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+item.icon+'"/></svg>';
export const hasContents = contents => ITEMS.some(i => (contents?.[i.key]||0)>0);
// Transfer only accepted items. A full pack never destroys the remainder.
export function takeContents(run, contents, key=null, moisture=0){
 if(!contents||run.status!=='playing')return {};
 const bundle=key?{[key]:Math.min(1,contents[key]||0)}:{...contents};
 const taken=run.grant({...bundle,woodWet:moisture});
 for(const [id,n] of Object.entries(taken))contents[id]=Math.max(0,(contents[id]||0)-n);
 return taken;
}
// Prefer the object being looked at, reject objects behind the player or walls.
export function interactionScore(player,target,yaw,pitch,range,clear=true){
 if(!clear)return Infinity;
 const dx=target.x-player.x,dy=target.y-player.y,dz=target.z-player.z,d=Math.hypot(dx,dz),length=Math.hypot(dx,dy,dz);
 if(d>range||length<.001)return Infinity;
 const dot=(-Math.sin(yaw)*Math.cos(pitch)*dx+Math.sin(pitch)*dy-Math.cos(yaw)*Math.cos(pitch)*dz)/length;
 if(dot<.20)return Infinity;
 return (1-dot)*5+d*.18;
}
