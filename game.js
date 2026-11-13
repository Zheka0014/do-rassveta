import {advancePlayerTravel} from './player-travel.js?v=20261113-forest49';
import {advanceGroundActor} from './actor-travel.js?v=20261113-forest49';
import {WatcherTactics,CreatureCadence,CREATURE_SOUND_PROFILES} from './forest-behavior.js?v=20261113-forest49';
import {MotionResponse,LookResponse,CameraResponse,motionDelta} from './smooth-motion.js?v=20261113-forest49';
import {GraphicsPreparation} from './preparation.js?v=20261113-forest49';
import {installLocalization,translate,getLanguage,setLanguage,onLanguageChange,setDisplayFilter} from './i18n.js?v=20261113-forest49';
import {consoleText,CONSOLE_TEXT_SCOPE,CONSOLE_TEXT_SKIP,creditsNodes,xboxCreditsNodes} from './xbox.js?v=20261113-forest49';
import {Settings} from './settings.js?v=20261113-forest49';
import {platform} from './platform.js?v=20261113-forest49';
import {ACHIEVEMENTS,AchievementTracker,achievementText,endOfRunAchievements} from './achievements.js?v=20261113-forest49';
import {GamepadState,PAD_ACTIONS,PAD_GLYPHS,padText,nextFocus} from './gamepad.js?v=20261113-forest49';
import {ITEMS,iconFor,hasContents,takeContents,interactionScore} from './inventory.js?v=20261113-forest49';
import {TRAIN,inTrain,footNoise} from './sound-horror.js?v=20261113-forest49';
import {SWAMP,MILL,PIT,ROOTS,inSwamp,inMill,inPit} from './expedition.js?v=20261113-forest49';
import {HandAction,FearPacing,StormClock,CHAPEL,inChapel,surfaceAt} from './weather-horror.js?v=20261113-forest49';
import {PursuitSight,CROUCH_HEIGHT,ATTIC_FLOOR,PHOTO_SECRETS,lookedAt,playerLevel} from './exploration.js?v=20261113-forest49';
import {StoryNight,WatcherMemory,phaseAt} from './story.js?v=20261113-forest49';
import {Forest,heightAt,seeded} from './world.js?v=20261113-forest49';
import {cemeteryReserved} from './horror-director.js?v=20261113-forest49';
import {inBasementRoom,onStairs} from './encounters.js?v=20261113-forest49';
import {HorrorDirector,CEMETERY} from './horror-director.js?v=20261113-forest49';
import {Run,formatTime} from './core.js?v=20261113-forest49';
import {ForestAudio} from './audio.js?v=20261113-forest49';
import {PlayerJump,PLAYER_HEIGHT,JUMP_COST} from './movement.js?v=20261113-forest49';
import {CHARACTER_PROFILES} from './horror-characters.js?v=20261113-forest49';
const keyboardHint=document.getElementById('controlsHint').textContent;
for(const node of document.querySelectorAll('[data-key]'))node.dataset.label=node.textContent;
// Xbox console edition: controller only, TV layout, keys in the static texts become controller buttons,
// 720p or 1080p frames (2K, 4K and the screen's own size belong to computers), Ultra only on Series X.
if(platform.xbox){
 document.body.classList.add('xbox');for(const node of document.querySelectorAll('.xbox-only'))node.hidden=false;
 setDisplayFilter((text,node)=>{const el=node.parentElement;return el?.closest(CONSOLE_TEXT_SCOPE)&&!el.closest(CONSOLE_TEXT_SKIP)?consoleText(text):text;});
 document.getElementById('resolution').replaceChildren(...[['hd','HD · 1280×720'],['fhd','Full HD · 1920×1080']].map(([value,label])=>new Option(label,value)));
 if(!/series x/i.test(platform.device))document.querySelector('#quality option[value="ultra"]')?.remove();
}
installLocalization(document);
const $=id=>document.getElementById(id),keys=new Set(),audio=new ForestAudio(),touch={x:0,y:0};
const watcherTactics=new WatcherTactics(),creatureCadence=new CreatureCadence();
const sight=new PursuitSight(),hands=new HandAction(),pacing=new FearPacing(),stormClock=new StormClock();
const motionResponse=new MotionResponse(),lookResponse=new LookResponse(),cameraResponse=new CameraResponse();
const jump=new PlayerJump(),horror=new HorrorDirector(),story=new StoryNight(),memory=new WatcherMemory();
let forest,run=null,yaw=0,pitch=0,last=performance.now(),simTime=0,nearby=null,moving=false,charging=false,ready=false;
let subtitleText='';
let toastUntil=0,subtitleUntil=0,hitFlash=0,enemyState='rest',enemyTimer=0,exposure=0,hitCooldown=0,boundaryNotice=0,previousPhase=-1,rng=Math.random,dragging=false,hasLock=false;
let openContainer=null,packReadOnly=false,watcherSpeed=0;
let crouched=false,hiddenHere=false,normalBattery=100,photos=[],photoIndex=0,photoFlash=0;
const level=()=>playerLevel(forest.camera.position.x,forest.camera.position.z,jump.feetY);
const bodyHeight=()=>crouched?CROUCH_HEIGHT:PLAYER_HEIGHT;
let sensitivity=.002,headBob=true,lastHud=-Infinity,lastSceneFrame=-Infinity,radioUntil=0;
const storage=(()=>{try{return window.localStorage;}catch{return null;}})(),settings=new Settings(storage).load();
if(platform.xbox)settings.useDefaults(platform.graphics());
let invertY=false,padRate=1,usingPad=false,dangerNow=0,lastSceneState=null,runFacts={wounded:false,abandoned:false,listenerHit:false};
const gamepad=new GamepadState(),padMove={x:0,y:0},padLook={x:0,y:0},padHeld={sprint:false,dynamo:false};
const achievements=new AchievementTracker(storage,a=>announceAchievement(a));
const award=id=>{if(achievements.unlock(id))platform.unlock(id);};
if(settings.get('language'))setLanguage(settings.get('language'));
// First launch without a chosen language: English unless the system speaks Russian (or a close neighbour).
else if(!new URLSearchParams(location.search).has('lang')&&!/^(ru|uk|be|kk)\b/i.test(navigator.language||'ru'))setLanguage('en');
onLanguageChange(language=>{settings.set('language',language);platform.setLanguage(language);renderAchievements();if(announceAchievement.current)fillAchievementToast(announceAchievement.current);});
const coarse=!platform.xbox&&matchMedia('(pointer:coarse)').matches;
const preparation=new GraphicsPreparation(()=>forest.prepareGraphics(),value=>{ready=value;$('start').disabled=$('resume').disabled=!value;$('start').textContent=value?'ВОЙТИ В ЛЕС':'ПОДГОТАВЛИВАЕМ СВЕТ И ЭФФЕКТЫ…';$('graphicsStatus').hidden=value;$('graphicsStatus').textContent='ПОДГОТАВЛИВАЕМ СВЕТ И ЭФФЕКТЫ…';});
$('start').disabled=true;$('start').textContent='ГОТОВИМ ЛЕС…';
const RELOAD_KEY='do-rassveta.reload';
try{
 forest=new Forest($('world'));forest.onResolutionChange=(w,h)=>$('renderSize').textContent='Кадр: '+w+' × '+h;forest.onResolutionChange(forest.canvas.width,forest.canvas.height);
 applySettings();
 forest.ready.then(()=>{try{sessionStorage.removeItem(RELOAD_KEY);}catch{}return preparation.request();}).catch(error=>{console.error(error);
  // On a slow or unstable connection one of the many downloads can fail. Files already received come
  // from the cache, so a quiet reload (at most twice) usually finishes the job without the player noticing.
  let tries=null;try{tries=+(sessionStorage.getItem(RELOAD_KEY)||0);sessionStorage.setItem(RELOAD_KEY,String(tries+1));}catch{tries=null;}
  if(tries!==null&&tries<2&&/^https?:$/.test(location.protocol)&&navigator.onLine!==false){$('start').textContent='ПОВТОРЯЕМ ЗАГРУЗКУ…';setTimeout(()=>location.reload(),1500);return;}
  $('loadError').hidden=false;$('loadError').textContent='Не удалось загрузить окружение. Обнови страницу, чтобы повторить загрузку.';$('start').textContent='ОКРУЖЕНИЕ НЕ ЗАГРУЖЕНО';});
}catch(error){$('loadError').hidden=false;$('loadError').textContent='Не удалось включить 3D. Открой игру в современном браузере с аппаратным ускорением.';$('start').textContent='3D НЕДОСТУПНО';console.error(error);}
const isPlaying=()=>run?.status==='playing';
const hint=text=>usingPad?padText(translate(text)):text;
function toast(text,seconds=5){const shown=hint(text);if(openContainer)$('containerFeedback').textContent=shown;else if(!$('packPanel').hidden)$('packFeedback').textContent=shown;$('toast').textContent=shown;toastUntil=simTime+seconds;}
function subtitle(text,seconds=6){subtitleText=text;$('subtitle').textContent=hint(text);subtitleUntil=simTime+seconds;}
function requestLock(){if(coarse||usingPad||panelOpen()||!isPlaying())return;try{const p=forest.canvas.requestPointerLock?.();p?.catch(()=>{if(isPlaying()&&!panelOpen())toast('Для обзора удерживай левую кнопку мыши.');});}catch{toast('Для обзора удерживай левую кнопку мыши.');}}
const panelIds=['journalPanel','packPanel','photoPanel','containerPanel'];
function panelOpen(){return panelIds.some(id=>!$(id).hidden);}
function clearControls(){motionResponse.reset();lookResponse.reset(yaw,pitch);keys.clear();touch.x=touch.y=0;moving=charging=dragging=false;lookPointer=null;releaseJoystick();}
function closePanels(lock=false){
 for(const id of panelIds){const panel=$(id);if(panel.open)panel.close();panel.hidden=true;}
 openContainer=null;document.body.classList.remove('panel-open');clearControls();if(lock){$('world').focus();requestLock();}
}
function showPanel(name,readonly=false){
 const id={pack:'packPanel',journal:'journalPanel',album:'photoPanel',container:'containerPanel'}[name],panel=$(id),closing=!panel.hidden;
 closePanels();if(closing){requestLock();return;}
 packReadOnly=readonly;panel.hidden=false;if(name==='pack')$('packFeedback').textContent='';document.body.classList.add('panel-open');clearControls();
 hasLock=false;if(document.pointerLockElement)document.exitPointerLock();
 renderHud();if(panel.showModal){panel.showModal();panel.scrollTop=0;}else panel.querySelector('button')?.focus();
}
function openLoot(title,contents,item,options={},deferred=false){
 if(!deferred&&!hands.current){if(reachInteraction(()=>openLoot(title,contents,item,options,true),'reach'))return;}
 forest.viewmodel.gesture('reach');
 closePanels();$('containerTitle').textContent=title;$('containerFeedback').textContent='Выбери нужные вещи. В рюкзаке свободно '+(run.capacity-run.load)+' ед.';
 $('containerPanel').hidden=false;openContainer={contents,item,...options};document.body.classList.add('panel-open');clearControls();hasLock=false;
 if(document.pointerLockElement)document.exitPointerLock();renderHud();$('containerPanel').showModal();$('containerPanel').scrollTop=0;audio.creak();
}
function takeLoot(key=null){
 if(!isPlaying()||!openContainer)return;const c=openContainer,picked=takeContents(run,c.contents,key,c.moisture||0),accepted=Object.keys(picked).length;
 if(accepted){forest.viewmodel.gesture('pickup');c.onTake?.(picked);audio.pickup();$('containerFeedback').textContent='Взято: '+Object.entries(picked).map(([k,n])=>ITEMS.find(i=>i.key===k).name+' ×'+n).join(', ')+'.';}
 else $('containerFeedback').textContent=hasContents(c.contents)?'Не помещается. Используй или выброси вещь справа; остаток остаётся здесь.':'Ящик пуст.';
 if(!hasContents(c.contents))c.onEmpty?.();renderHud();
}
function storageCard(i,loot=false){return '<div class="'+(loot?'loot-row':'pack-card')+'" data-item="'+i.key+'">'+iconFor(i)+'<div class="item-name">'+i.name+' <b id="'+(loot?'loot-':'pack-')+i.key+'">0</b></div><small>'+ (loot?'Вес '+i.weight:'Вес '+i.weight+' · '+(i.hint||i.use))+'</small>'+(loot?'<button data-take="'+i.key+'">Взять 1</button>':(i.action?'<button data-action="'+i.action+'">'+i.use+'</button>':'')+'<button class="drop-item" data-drop="'+i.key+'" aria-label="Выбросить: '+i.name+'">Выбросить 1</button>')+'</div>';}
$('packGrid').innerHTML=ITEMS.map(i=>storageCard(i)).join('');$('containerItems').innerHTML=ITEMS.map(i=>storageCard(i,true)).join('');
$('containerPack').innerHTML=ITEMS.map(i=>'<div class="bag-row" data-bag="'+i.key+'"><span>'+i.name+' <b></b></span><div>'+(i.action?'<button data-action="'+i.action+'">'+i.use+'</button>':'')+'<button data-drop="'+i.key+'" aria-label="Выбросить из ящика: '+i.name+'">−1</button></div></div>').join('');
function renderStorage(){
 if(!run)return;const active=isPlaying(),ex=forest.exploration.logic;
 $('packMode').textContent=packReadOnly?'Пауза · только осмотр':'Время идёт · управление движением отключено';$('containerLoad').textContent=run.load+' / '+run.capacity;
 for(const id of ['packVitals','containerVitals'])$(id).textContent='До рассвета '+formatTime(run.remaining)+' · Здоровье '+Math.ceil(run.health)+' · Тепло '+Math.ceil(run.warmth);
 const alarm=forest.soundNight.logic.trainAlarm,warning=(simTime<subtitleUntil?subtitleText:'')+(openContainer?.item?.id==='train-crate'&&alarm>0?' · Дверь откроется через '+Math.ceil(alarm)+' сек.':'');for(const id of ['packThreat','containerThreat'])if($(id).textContent!==warning)$(id).textContent=warning;
 const equipment=['Фонарь · '+Math.ceil(run.battery)+'%','Динамо',...(ex.camera?['Фотоаппарат · '+ex.film+' кадров']:[]),...(ex.curse?['Чужой фонарь']:[]),...(ex.map?['Карта лесника']:[]),...(forest.chapel.logic.key?['Ключ часовни']:[]),...(story.done.has('fuse')&&!story.done.has('generator')?['Предохранитель']:[]),...([...story.evidence].map(k=>({journal:'Журнал лесника',tape:'Запись Лёши',medal:'Жетон 0417'}[k])))];
 $('equipmentList').textContent=equipment.join(' · ');
 for(const i of ITEMS){
  const card=$('pack-'+i.key).closest('[data-item]');card.classList.toggle('empty',!run[i.key]);
  for(const button of card.querySelectorAll('button'))button.disabled=!active||packReadOnly||!run[i.key]||button.dataset.action==='eat'&&run.hunger>95||button.dataset.action==='drink'&&run.thirst>95||button.dataset.action==='heal'&&run.health>=100&&!run.bleeding&&!run.limp;
  const row=document.querySelector('[data-bag="'+i.key+'"]');row.hidden=!run[i.key];row.querySelector('b').textContent='×'+run[i.key];for(const button of row.querySelectorAll('button'))button.disabled=!active||!!hands.current||button.dataset.action==='eat'&&run.hunger>95||button.dataset.action==='drink'&&run.thirst>95||button.dataset.action==='heal'&&run.health>=100&&!run.bleeding&&!run.limp;
  const loot=$('loot-'+i.key),count=openContainer?.contents?.[i.key]||0;loot.textContent='×'+count;loot.closest('[data-item]').hidden=!count;loot.closest('[data-item]').querySelector('button').disabled=!active||run.capacity-run.load<i.weight;
 }
 for(const button of document.querySelectorAll('.pack-actions button'))button.disabled=!active||packReadOnly;
 $('containerEmpty').hidden=hasContents(openContainer?.contents);
 $('takeAll').disabled=!active||!hasContents(openContainer?.contents)||run.load>=run.capacity;
}
function start(mode){
 if(!forest||!ready)return {ok:false,error:'Лес ещё загружается'};
 if(run&&['playing','paused'].includes(run.status))return {ok:false,error:'Сначала заверши текущую попытку'};
 const chosen=mode||document.querySelector('input[name=mode]:checked').value;
 if(!['full','demo'].includes(chosen))throw new Error('Неизвестный режим');
 audio.start();audio.setActive(true);audio.nextStep=audio.nextHeart=audio.nextBird=audio.nextBreath=audio.breathUntil=audio.nextMill=0;run=new Run(chosen);runFacts={wounded:false,abandoned:false,listenerHit:false};
 // Wounds (attacks, traps, falls) are flagged as injuries; cold, hunger and bleeding ticks are not.
 const hurt=run.hurt.bind(run);run.hurt=(amount,reason,injury=false)=>{if(injury&&amount>=1&&run.status==='playing'){runFacts.wounded=true;rumble(Math.min(1,.35+amount/60),Math.min(1,.25+amount/80),Math.min(650,180+amount*6));}return hurt(amount,reason,injury);};const seed=crypto.getRandomValues(new Uint32Array(1))[0];rng=seeded(seed);forest.reset(seed,chosen);horror.reset();watcherTactics.reset();creatureCadence.reset();story.reset();memory.reset();sight.reset();hands.reset();pacing.reset(chosen);stormClock.reset(chosen);crouched=false;hiddenHere=false;normalBattery=100;photos=[];photoIndex=0;photoFlash=0;$('photoPanel').hidden=true;$('photoImage').removeAttribute('src');keys.clear();touch.x=touch.y=0;
 yaw=.16;pitch=-.065;simTime=0;last=performance.now();previousPhase=-1;enemyState='rest';enemyTimer=chosen==='demo'?28:65;exposure=0;hitCooldown=0;boundaryNotice=0;hitFlash=0;nearby=null;radioUntil=0;$('radioMessage').hidden=true;
 jump.reset(heightAt(1.4,4.3));forest.camera.position.set(1.4,jump.feetY+PLAYER_HEIGHT,4.3);forest.camera.rotation.set(pitch,yaw,0);lookResponse.reset(yaw,pitch);motionResponse.reset();cameraResponse.reset(jump.feetY,PLAYER_HEIGHT);lastSceneFrame=performance.now();lastHud=-Infinity;
 $('menu').hidden=true;$('pause').hidden=true;$('ending').hidden=true;$('hud').hidden=false;$('modeLabel').textContent=chosen==='demo'?'ПРОБНАЯ НОЧЬ · ДО УТРА':'ДО РАССВЕТА';
 closePanels();toast('Ты ищешь пропавшего брата Лёшу. Журнал лесника — в избе. J — записи · I — рюкзак.',10);subtitle('20:00. Лёша, я пришёл за тобой.',6);renderHud();$('world').focus();requestLock();updateMenuMode();platform.setRunActive(true);return {ok:true,mode:chosen,duration:run.duration};
}
function pause(){if(!isPlaying())return;run.pause();closePanels();clearControls();keys.clear();touch.x=touch.y=0;charging=false;dragging=false;$('pause').hidden=false;$('hud').hidden=true;audio.setActive(false);if(document.pointerLockElement)document.exitPointerLock();platform.setRunActive(false);if(usingPad)$('resume').focus();}
function resume(){if(!ready||run?.status!=='paused')return;run.resume();last=performance.now();lastSceneFrame=last;$('pause').hidden=true;$('hud').hidden=false;audio.setActive(true);$('world').focus();requestLock();platform.setRunActive(true);}
function finish(){
 const won=run.status==='won',ending=story.ending();hands.reset();closePanels();$('hud').hidden=true;$('pause').hidden=true;$('ending').hidden=false;$('ending').classList.toggle('won',won);keys.clear();touch.x=touch.y=0;charging=false;audio.setActive(false);if(document.pointerLockElement)document.exitPointerLock();
 $('endEyebrow').textContent=won?'ПЕРВЫЙ СОЛНЕЧНЫЙ СВЕТ':'ЛЕС ЗАПОМНИЛ ТЕБЯ';$('endTitle').textContent=won?ending.title:'Ты остался в лесу.';
 $('endReason').textContent=won?ending.text+(run.mode==='demo'?' Пробная ночь пройдена. Полная попытка длится два часа.':''):run.reason;
 $('endTime').textContent=formatTime(Math.floor(run.elapsed));$('endLoot').textContent=String(run.loot);$('damage').style.opacity='0';
 platform.setRunActive(false);
 for(const id of endOfRunAchievements({won,mode:run.mode,abandoned:runFacts.abandoned,wounded:runFacts.wounded,truth:story.done.has('antenna')&&story.evidence.size===3}))award(id);
 if(usingPad)$('restart').focus();
}
function backToMenu(){closePanels();run=null;hands.reset();enemyState='rest';forest.enemy.visible=false;$('menu').hidden=false;$('ending').hidden=true;$('pause').hidden=true;$('hud').hidden=true;audio.setActive(false);keys.clear();if(document.pointerLockElement)document.exitPointerLock();platform.setRunActive(false);
 // The menu scene starts from a fresh clearing with the fires lit again.
 forest.reset(crypto.getRandomValues(new Uint32Array(1))[0],'full');menuClock=0;updateMenuMode();if(usingPad)$('start').focus();}
function action(name,fromPanel=false){
 if(['journal','pack','album'].includes(name)){if(isPlaying()||name==='pack'&&run?.status==='paused')showPanel(name,run?.status==='paused');return;}
 if(!isPlaying())return;
 if(panelOpen()&&!fromPanel)return;
 if(fromPanel&&!['eat','drink'].includes(name))closePanels(true);
 if(name==='crouch'){if(crouched&&jump.feetY+PLAYER_HEIGHT>forest.ceilingAt(forest.camera.position.x,forest.camera.position.z,jump.feetY)){toast('Слишком низко, чтобы встать.');}else{crouched=!crouched;toast(crouched?'Ты присел. Укрытие помогает, когда тебя закрывает камень или стена.':'Ты встал.',3);}}
 if(name==='photo')beginPhoto();if(['throw-auto','throw-stone','throw-bottle','wind-toy'].includes(name))beginNoiseAction(name==='wind-toy'?'toy':name.slice(6));
 if(name==='barricade')beginBarricade();if(name==='set-trap')beginPlayerTrap();
 if(name==='curse'){const n=forest.exploration.logic;if(!n.curse)toast('Чужой фонарь ещё не найден.');else{if(!n.cursedLight)normalBattery=run.battery;if(n.toggleCurse()){run.battery=n.cursedLight?100:normalBattery;toast(n.cursedLight?'Чужой свет не гаснет. Его гул слышен в лесу.':'Обычный фонарь снова в руке.',5);}}}
 if(name==='jump'){if(forest.expedition.logic.wet){toast('Топь держит ноги. E у корня — выбраться.',3);}else if(level()==='attic'){toast('Под крышей не прыгнуть.',2);}else if(jump.jump(run.stamina)){run.stamina=Math.max(0,run.stamina-JUMP_COST);}else if(jump.grounded&&run.stamina<JUMP_COST)toast('Не хватает сил для прыжка.',2);}
 if(name==='flash'){run.flash=!run.flash;audio.noise(.07,.1,2600);if(run.flash&&run.battery<=0)toast('Батарея пуста. Удерживай R, чтобы зарядить фонарь.');}
 if(name==='heal'){if(hands.current||forest.exploration.logic.well)toast('Руки заняты.',2);else if(run.kits===0||run.health>=100&&!run.bleeding&&!run.limp)toast(run.kits===0?'Аптечек нет. Проверь ящики у огней.':'Раны пока не требуют перевязки.');else if(hands.start('heal',3)){toast('Перевязываешь руку. Три секунды без бега.',4);audio.noise(.3,.08,1800);}}
 if(name==='flare'){if(run.useFlare()){forest.throwFlare(forest.camera.position.x,forest.camera.position.z,yaw,jump.feetY);audio.noise(.8,.4,1800);toast('Фальшфейер горит 35 секунд. Отступай к свету.');}else toast('Фальшфейеры закончились.');}
 if(name==='eat'){toast(run.eat()?'Еда восстановила сытость.':run.food===0?'Еда закончилась.':'Ты пока сыт.');}
 if(name==='drink'){toast(run.drink()?'Вода утолила жажду.':run.water===0?'Вода закончилась.':'Ты пока не хочешь пить.');}
 if(name==='interact')interact();
 renderHud();
}
function closestInteraction(){
 const p=forest.camera.position;let best=null,score=Infinity;
 const offer=(type,item,range)=>{const y=(item.feetY??item.root?.position.y??item.y??jump.feetY)+(item.targetHeight??(type==='crate'?.68:type==='fire'?.35:type==='door'?1:type==='hatch'?.12:.65)),target={x:item.x,y,z:item.z};
  const door=type==='door'||type==='hatch'||item.id==='chapel-door'||item.id==='train-door'||item.id==='train-end';
  const candidate=interactionScore(p,target,yaw,pitch,range,door||forest.lineOfSight(p,target));if(candidate<score){best={type,item};score=candidate;}};
 for(const c of forest.crates)if(Math.abs(jump.feetY-c.root.position.y)<1.35)offer('crate',c,2.8);
 for(const f of forest.fires)if(Math.abs(jump.feetY-f.y)<1.35)offer('fire',f,3.0);
 const n=forest.night.logic,e=forest.exploration.logic;
 if(n.snared!==null)return {type:'release',item:n.traps[n.snared]};
 if(e.well&&Math.hypot(p.x+20,p.z-4)<2.7)return {type:'explore',item:forest.exploration.items.find(o=>o.id==='well')};
 const sound=forest.soundNight.logic;for(const item of forest.soundNight.items){if(item.bundle&&(sound.taken.has(item.id)||sound.time<(sound.pileReady[item.id]||0))||item.id==='train-notes'&&sound.notes)continue;if(Math.abs(jump.feetY-item.feetY)<.75&&(item.id==='train-door'||item.id==='train-end'||forest.lineOfSight(p,{x:item.x,y:item.feetY+.5,z:item.z})))offer('sound',item,item.id==='train-door'||item.id==='train-end'?2.3:1.9);}
 const expedition=forest.expedition.logic;
 for(const item of forest.expedition.items){if(['crowbar','rope'].includes(item.id)&&expedition.toolTaken.has(item.id)||item.id==='pit-up'&&!expedition.ropeInstalled||item.id==='pit-notes'&&expedition.pitTaken)continue;if(item.id.startsWith('root-')){if(!expedition.wet)continue;offer('expedition',item,4.8);continue;}if(Math.abs(jump.feetY-item.feetY)<.7&&forest.lineOfSight(p,{x:item.x,y:item.feetY+.55,z:item.z}))offer('expedition',item,2.0);}
 if(level()==='ground'){for(const t of n.traps)if(t.armed)offer('trap',t,2.05);offer('radio',forest.night.radio,2.3);if(n.doorClosed)offer('door',{x:0,z:-10.8},2.9);}
 if(level()!=='attic'&&(!n.hatchOpen||jump.feetY>-.15))offer('hatch',{x:0,z:-14.45},2.7);
 if(jump.feetY<-1.8&&!n.lootTaken)offer('basement-loot',forest.night.loot,2.2);
 for(const item of forest.storyScene.items)if(!story.done.has(item.id)&&Math.abs(jump.feetY-item.feetY)<1.2)offer('story',item,2.1);
 for(const item of forest.exploration.items){const owned=item.id==='camera'?e.camera:item.id==='curse'?e.curse:item.id==='map'?e.map:false;if(!owned&&Math.abs(jump.feetY-item.feetY)<.8)offer('explore',item,item.id==='ladder'?1.6:2.4);}
 for(const item of forest.chapel.items){const c=forest.chapel.logic;if(item.id==='chapel-key'&&c.key||item.id==='chapel-notes'&&c.notes)continue;if(['chapel-key','chapel-notes'].includes(item.id)&&!forest.lineOfSight(p,{x:item.x,y:item.feetY+.85,z:item.z}))continue;if(Math.abs(jump.feetY-item.feetY)<.6)offer('chapel',item,item.id==='chapel-door'?2.5:2.1);}
 if(level()==='attic')offer('attic-down',{x:0,z:-12.35},2.0);
 if(level()==='ground')for(const site of e.sites)if(site.visible&&(!site.opened||site.contents&&Object.values(site.contents).some(v=>v>0)))offer('site',site,2.8);
 return best;
}
function interact(){
 nearby=closestInteraction();if(!nearby){toast('Подойди ближе к предмету и нажми E.',2);return;}
 const {type,item}=nearby,n=forest.night.logic;
 if(type==='sound'){soundInteract(item);return;}
 if(type==='expedition'){expeditionInteract(item);return;}
 if(type==='chapel'){chapelInteract(item.id);return;}
 if(hands.current){toast('Руки заняты. Подожди окончания действия.',2);return;}
 if(type==='explore'||type==='attic-down'||type==='site'){exploreInteract(type,item);return;}
 if(type==='story'){const result=story.interact(item.id,run.wood);if(result.ok){for(let i=0;i<result.wood;i++)run.useWood();if(item.id==='generator')run.battery=100;if(item.id==='antenna')run.grant({water:1,food:1});audio.pickup();radioGuide({text:result.text});if(item.id==='journal')award('JOURNAL');if(item.id==='antenna')award('SIGNAL');if(story.evidence.size===3)award('ALL_EVIDENCE');}else toast(result.text,7);renderHud();return;}
 if(type==='release'){n.release();audio.chain();toast('Нога свободна. Рану можно перевязать: H.');return;}
 if(type==='trap'){n.disarm(item.id);audio.chain();toast('Ловушка обезврежена.');return;}
 if(type==='hatch'){reachInteraction(()=>{const open=n.toggleHatch();audio.scrape();forest.staticShadowsDirty=true;toast(open?'Люк открыт. Спускайся по ступеням.':'Люк закрыт.');});return;}
 if(type==='door'){if(forest.chapel.logic.barricade){if(!hands.current&&hands.start('unbarrier',2,2,{x:forest.camera.position.x,z:forest.camera.position.z}))toast('Снимаешь доски. Две секунды.',3);else toast('Руки заняты.');}else{reachInteraction(()=>{n.openDoor();forest.cabinDoor.wall.active=false;audio.scrape();toast('Засов откинут. Путь к костру открыт.');});}return;}
 if(type==='radio'){const message=n.radio();if(message)radioGuide(message);else toast('В эфире только помехи. Подожди несколько секунд.');return;}
 if(type==='basement-loot'){
  n.basementLidOpen=true;n.basementContents??={water:3,food:2,wood:4,kits:2,flares:2};
  openLoot('Запас кордона',n.basementContents,item,{onTake(){if(!n.basementOpened){run.battery=Math.min(100,run.battery+65);run.loot++;n.basementOpened=true;}},onEmpty(){n.takeLoot();}});return;
 }
 if(type==='fire'){if(item.fuel>600){toast('В костре уже достаточно дров.');return;}const fuel=run.useFuel();if(fuel.ok){item.fuel+=fuel.fuel;toast(fuel.kindling?'Мокрые дрова занялись от сухой растопки. Две минуты огня.':'Сухие дрова добавлены. Ещё 2½ минуты тепла.');audio.pickup();}else toast(fuel.reason==='kindling'?'Дрова мокрые. Нужна сухая растопка из избы или вагона; либо суши связку на полке в избе.':'Нужны дрова. Ищи их в ящиках у огней.',7);}
 if(type==='crate'){
  if(item.cooldown>0){toast('Ящик пуст. Новые припасы через '+Math.ceil(item.cooldown/60)+' мин.');return;}
  if(!item.contents){item.contents={water:1,food:1,wood:2,...(rng()<.5?{flares:1}:{kits:1})};item.wasPicked=false;run.battery=Math.min(100,run.battery+30);}
  item.opened=true;forest.staticShadowsDirty=true;
  openLoot('Ящик с припасами',item.contents,item,{moisture:65,onTake(){if(!item.wasPicked){run.loot++;item.wasPicked=true;}},onEmpty(){if(item.cooldown<=0){item.cooldown=run.mode==='demo'?95:420;item.beacon.visible=item.glow.visible=false;}}});
 }

}

function exploreInteract(type,item){
 const ex=forest.exploration.logic,p=forest.camera.position;
 if(type==='attic-down'){if(!forest.canMove(-1.5,-12,.23,0,CROUCH_HEIGHT)){toast('Выход перекрыт.');return;}jump.reset(.23);p.set(-1.5,.23+CROUCH_HEIGHT,-12);ex.atticVisited=true;if(ex.map&&!ex.atticScare){ex.atticScare=true;audio.overhead();audio.doorSlam();subtitle('Лестница скрипнула ещё раз. На ступень выше — чужой вес.',7);}forest.night.logic.previous=null;toast('Ты спустился в избу.');return;}
 if(type==='site'){let result;if(!item.opened){result=ex.visitSite(item.id);if(result?.type==='site-alarm'){audio.bell();audio.radio();alertWatcher();subtitle(item.id==='phone'?'Оборванный телефон звонит. В трубке твоё дыхание.':item.id==='car'?'Под капотом сработал клаксон. Двигателя здесь нет.':'В пустой палатке зашуршал спальник.',6);}else{audio.pickup();subtitle('Припасы оставлены недавно. Хозяина рядом нет.',5);}}
  openLoot({car:'Брошенная машина',tent:'Пустая палатка',phone:'Запас у телефона'}[item.id],item.contents||{},item,{onTake(){if(!item.counted){run.loot++;item.counted=true;}}});return;
 }
 if(item.id==='well'){if(ex.well){const event=ex.releaseWell();audio.chain();toast(event.lost?'Ты отпустил верёвку. Ведро ушло вниз.':'Ворот остановлен.',5);}else if(!ex.bucket)toast('Ведро потеряно. В эту ночь воды здесь больше не набрать.');else if(run.load>=run.capacity)toast('Для воды нужно свободное место в рюкзаке.');else if(ex.startWell()){audio.creak();toast('Вода глубоко. Крути 8 секунд. Если потянут снизу — E, отпустить.',9);}else toast('Вода ещё набирается.');}
 if(item.id==='camera'&&ex.takeCamera()){audio.pickup();story.log.push('ФОТОАППАРАТ · Восемь кадров. X — вспышка; P — последний снимок. Видишь знакомое место — проверь его на плёнке. Вспышка выдаёт тебя.');toast('Фотоаппарат взят. X — снимок · P — плёнка. Осталось 8 кадров.',8);}
 if(item.id==='curse'&&ex.takeCurse()){audio.whisper();story.log.push('ЧУЖОЙ ФОНАРЬ · Батарея не садится. Свет гудит, и силуэты идут на этот звук. B — сменить фонарь.');toast('Чужой фонарь взят. B — включить. Гул привлекает силуэты.',8);}
 if(item.id==='ladder'){crouched=true;jump.reset(ATTIC_FLOOR);p.set(0,ATTIC_FLOOR+CROUCH_HEIGHT,-12.6);forest.night.logic.previous=null;audio.overhead();toast('Чердак. Под крышей можно идти только пригнувшись. E у лестницы — спуститься.',8);}
 if(item.id==='map'&&ex.takeMap()){audio.creak();story.log.push('КАРТА ЛЕСНИКА · Колодец — западнее кордона. Повторяющаяся тропа — ещё западнее. Если снова видишь дерево 17, поверни на запад к ручью и иди вдоль воды на север. Фотоаппарат проявляет чужие надписи. Брошенная машина — восток, палатка — юго-запад, оборванный телефон — север. Вагон 04 — юго-восток, за восточным костром (24, 52).');radioGuide({text:story.log.at(-1)});}
 renderHud();
}
function beginPhoto(){
 const ex=forest.exploration.logic;if(hands.current||ex.well){toast('Руки заняты.',2);return;}if(!ex.camera){toast('Сначала найди фотоаппарат в избе.');return;}if(!ex.film){toast('Плёнка закончилась. P — посмотреть снимки.');return;}if(ex.time<ex.photoReady){toast('Фотоаппарат ещё взводится.',2);return;}hands.start('photo',1.4,.7);
}
function capturePhoto(){
 const ex=forest.exploration.logic;if(!ex.camera){toast('Сначала найди фотоаппарат в избе.');return;}if(!ex.film){toast('Плёнка закончилась. Все снимки остались в P до конца попытки.');return;}
 const p=forest.camera.position,seen=PHOTO_SECRETS.filter(o=>{const target={x:o.x,y:heightAt(o.x,o.z)+o.y,z:o.z};return Math.hypot(o.x-p.x,o.z-p.z)<20&&lookedAt(p,target,yaw,pitch,forest.lineOfSight(p,target));}).map(o=>o.id),result=ex.photograph(seen);
 if(!result){toast('Фотоаппарат ещё взводится.',2);return;}
 audio.camera();photoFlash=.8;const original=forest.flash.intensity;forest.exploration.reveal(true);forest.flash.intensity=350;forest.flash.shadow.needsUpdate=true;forest.viewmodel.setCaptureHidden(true);
 try{forest.post.render(forest.scene,forest.time,true,0,forest.quality!=='low');const c=document.createElement('canvas'),w=Math.min(960,forest.canvas.width);c.width=w;c.height=Math.round(w*forest.canvas.height/forest.canvas.width);c.getContext('2d').drawImage(forest.canvas,0,0,c.width,c.height);const data=c.toDataURL('image/jpeg',.80);const text=result.found.length?result.found.map(o=>o.text).join('\n'):seen.length?'Знакомая метка уже записана.':'На этом кадре скрытых меток не видно.';photos.push({data,text});photoIndex=photos.length-1;$('photoImage').src=data;story.log.push('КАДР '+photos.length+' · '+text);}catch(error){toast('Снимок не удалось проявить. Попробуй другой режим графики.',6);console.error(error);}finally{forest.exploration.reveal(false);forest.flash.intensity=original;forest.viewmodel.setCaptureHidden(false);}
 alertWatcher();if(result.found.length)award('FILM_REMEMBERS');toast(result.found.length?'На плёнке проступила надпись. P — посмотреть.':'Снимок готов. Вспышку могли увидеть. P — посмотреть.',6);
}
function explorationEvents(raw,movement){
 const ex=forest.exploration.logic,p=forest.camera.position,s=ex.statue;
 const walk=(x,z)=>forest.canMove(x,z)&&forest.actorSpaceFree(x,z,.7)&&!forest.protectedAt(x,z);
 const observed=s?lookedAt(p,{x:s.x,y:heightAt(s.x,s.z)+1.5,z:s.z},yaw,pitch,forest.lineOfSight(p,{x:s.x,y:heightAt(s.x,s.z)+1.5,z:s.z})):false;
 for(const event of ex.update(raw,{active:isPlaying(),x:p.x,z:p.z,feetY:jump.feetY,flash:run.flash,moving,protectedHere:forest.protectedAt(p.x,p.z),observed,canWalk:walk,allowThreats:(pacing.allow()&&enemyState==='rest'&&!forest.soundNight.logic.hunter.active&&!forest.night.logic.double)||ex.cursedLight&&run.flash,lure:forest.expedition.logic.lure||forest.chapel.logic.lure||forest.soundNight.logic.decoys.lure,canStrike:s=>forest.lineOfSight({x:s.x,y:heightAt(s.x,s.z)+1.5,z:s.z},p)})){
  if(event.type==='well-pull'){audio.chain();audio.tone(39,2,.13,22);subtitle('Верёвка натянулась снизу. ОТПУСТИ НА E — сейчас.',4);toast('E — отпустить верёвку. Три секунды.',4);}
  if(event.type==='well-release'&&event.lost){audio.chain();toast('Ты отступил. Ведро утянули вниз.');}
  if(event.type==='well-water'){const taken=run.grant({water:event.water});audio.pickup();if(taken.water)award('WELL_WATER');toast('Вода поднята: '+(taken.water||0)+' порции. V — пить.');}
  if(event.type==='well-hurt'){run.hurt(event.damage,'Тебя затянуло в колодец. Отпускай верёвку на E, когда её тянут снизу.',true);hitFlash=.6;audio.hurt();toast('Руку рассекло верёвкой. Ведро потеряно. H — перевязать.',6);alertWatcher();}
  if(event.type==='curse-warning'){audio.whisper();subtitle('Этот свет не гаснет. Но в ответ кто-то зашевелился.',6);}
  if(event.type==='curse-call'){audio.tone(54,.9,.08,37);if(enemyState==='rest')spawnWatcher(false,true);ex.nextStatue=Math.min(ex.nextStatue,ex.time);}
  if(event.type==='loop'){const destination=[-43,-43.8,-42.2].map(x=>({x,z:-18})).find(q=>forest.canMove(q.x,q.z));if(destination){p.x=destination.x;p.z=destination.z;jump.reset(heightAt(p.x,p.z));p.y=jump.feetY+bodyHeight();forest.night.logic.previous=null;ex.previous={x:p.x,z:p.z};audio.whisper();subtitle('Снова дерево 17. Даже зарубки те же. Ручей шумит слева.',7);story.log.push('ПЕТЛЯ · Знакомое дерево вернулось. Поверни на запад к воде, затем иди вдоль ручья на север.');}}
  if(event.type==='statue-spawn'){for(let i=0;i<16;i++){const angle=yaw+(i%2?1:-1)*(.22+i*.07),r=13+i*.35,x=p.x-Math.sin(angle)*r,z=p.z-Math.cos(angle)*r;if(walk(x,z)&&forest.actorSpaceFree(x,z,1.1)&&lookedAt(p,{x,y:heightAt(x,z)+1.5,z},yaw,pitch,forest.lineOfSight(p,{x,y:heightAt(x,z)+1.5,z}))&&!(Math.abs(x)<5&&z>-21&&z<-8)){ex.spawnStatue({x,z,yaw:Math.atan2(p.x-x,p.z-z)});audio.scrape();subtitle('Фигура застыла между деревьями. Слышен каменный скрежет.',6);story.log.push('НЕПОДВИЖНЫЙ · Он двигается, когда ты отводишь взгляд. Смотри на него и отступай к настоящему огню.');break;}}}
  if(event.type==='statue-warning'){audio.scrape();subtitle('Скрежет совсем рядом. Найди фигуру взглядом.',4);}
  if(event.type==='statue-gone'){pacing.recover();if(isPlaying())award('DONT_BLINK');}
  if(event.type==='statue-hurt'){run.hurt(event.damage,'Неподвижный оказался за спиной. Смотри на него, отступая к настоящему огню.',true);hitFlash=.6;audio.hurt();}
 }
}
function movePlayer(dt){
 const p=forest.camera.position;
 let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-touch.y-padMove.y,side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.x+padMove.x;
 const blocked=panelOpen();if(blocked){forward=side=0;motionResponse.reset();moving=charging=false;}
 else{const yawRate=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*1.65-padLook.x*3.1*padRate,pitchRate=-padLook.y*2.1*padRate*(invertY?-1:1);const view=lookResponse.advance(dt,{yawRate,pitchRate});yaw=view.yaw;pitch=view.pitch;}
 const input=Math.hypot(forward,side)>.06;
 const sprinting=input&&!blocked&&!crouched&&!hands.current&&!forest.expedition.logic.wet&&!forest.exploration.logic.well&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||padHeld.sprint)&&run.stamina>3;
 charging=!blocked&&!hands.current&&!forest.exploration.logic.well&&(keys.has('KeyR')||padHeld.dynamo)&&run.battery<100&&!forest.exploration.logic.cursedLight;
 const stairSlow=onStairs(p.x,p.z)?.72:1;
 const speed=(sprinting?4.5:crouched?1.05:2.25)*forest.night.logic.speedScale*forest.expedition.logic.speedScale*(run.limp?.78:1)*stairSlow*(charging?.42:1)*(hands.current?.42:1)*(run.warmth<15||run.hunger<20||run.thirst<20?.8:1);
 const view=advancePlayerTravel(dt,{position:p,jump,motion:motionResponse,camera:cameraResponse,height:bodyHeight(),
  drive:{forward:input?forward:0,side:input?side:0,yaw,speed:input?speed:0},
  floorAt:(x,z,feet,step)=>forest.floorAt(x,z,feet,step),ceilingAt:(x,z,feet)=>forest.ceilingAt(x,z,feet),canMove:(x,z,feet,step,height)=>forest.canMove(x,z,feet,step,height),
  sprinting,crouched,bobbing:headBob,sink:forest.expedition.logic.sink*Math.min(1.35,bodyHeight()-.23),blocked});
 moving=view.moving;
 if(moving&&Math.hypot(p.x,p.z)>99&&simTime>boundaryNotice){toast('За туманом снова лес. До рассвета выхода нет.',5);boundaryNotice=simTime+12;}
 forest.camera.rotation.set(pitch,yaw,0);return {sprinting:sprinting&&moving,bob:view.bob,step:view.step,stepSide:view.stepSide,phase:view.phase};
}
function spawnWatcher(campAmbush=false,explicit=false){
 if(!pacing.allow(explicit)||!explicit&&(forest.soundNight.logic.hunter.active||forest.exploration.logic.statue||forest.night.logic.double))return false;
 const p=forest.camera.position,allowed=(x,z)=>Math.hypot(x,z)<96&&forest.canMove(x,z)&&forest.actorSpaceFree(x,z,1)&&!forest.protectedAt(x,z);
 let chosen=memory.ambush(p.x,p.z,allowed);
 if(campAmbush){const crate=forest.crates.filter(c=>Math.hypot(c.x-p.x,c.z-p.z)>12&&Math.hypot(c.x-p.x,c.z-p.z)<40).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(crate)for(const [dx,dz]of [[4,0],[-4,0],[0,4]])if(allowed(crate.x+dx,crate.z+dz)){chosen={x:crate.x+dx,z:crate.z+dz};break;}}
 if(!chosen)for(let i=0;i<40;i++){const angle=yaw+Math.PI+(rng()-.5)*2.7,r=24+rng()*13,x=p.x+Math.sin(angle)*r,z=p.z+Math.cos(angle)*r;if(allowed(x,z)){chosen={x,z};break;}}
 if(!chosen){enemyTimer=8;return false;}
 forest.expedition.logic.traps.forEach(t=>t.previous=null);forest.enemy.position.set(chosen.x,heightAt(chosen.x,chosen.z),chosen.z);forest.enemy.visible=true;enemyState='stalk';watcherSpeed=0;forest.enemy.userData.attackLeft=0;enemyTimer=run.mode==='demo'?16:30;exposure=0;sight.reset();watcherTactics.reset();audio.twig((rng()-.5)*1.6);subtitle(campAmbush?'Он ждёт у припасов. Смени маршрут.':'Сухой треск. Где-то между деревьями.',5);return true;
}
function warnWatcher(){if(enemyState==='hunt'||enemyState==='warning'||enemyState==='retreat')return;enemyState='warning';enemyTimer=4;audio.twig();subtitle('Лес затих. Ветка треснула совсем рядом. Отступай к огню.',5);}
function updateWatcher(dt,sprinting,clockDt=dt){
 const previousAttack=forest.enemy.userData.attackLeft||0;forest.enemy.userData.attackLeft=Math.max(0,previousAttack-dt);
 const p=forest.camera.position,e=forest.enemy;hitCooldown=Math.max(0,hitCooldown-clockDt);enemyTimer-=clockDt;
 if(enemyState==='rest'){watcherSpeed=0;hiddenHere=false;if(enemyTimer<=0&&pacing.allow())spawnWatcher();return 0;}
 const physicalDistance=Math.hypot(p.x-e.position.x,p.z-e.position.z),safe=forest.protectedAt(p.x,p.z),clear=forest.lineOfSight({x:e.position.x,y:e.position.y+CHARACTER_PROFILES.watcher.head,z:e.position.z},p);hiddenHere=crouched&&physicalDistance>2.8&&!clear&&!charging&&(!run.flash||run.battery<=0);sight.update(clockDt,{x:p.x,z:p.z,hidden:hiddenHere});
 if(enemyState==='hunt'&&sight.searching){enemyState='search';enemyTimer=10;subtitle('Он потерял тебя. Шаги идут к последнему месту, где ты стоял.',6);}
 if(enemyState==='search'&&!hiddenHere){enemyState='stalk';enemyTimer=5;exposure=0;}
 const lure=forest.expedition.logic.lure||forest.chapel.logic.lure||forest.soundNight.logic.decoys.lure;
 if(enemyState==='investigate'&&(!lure||enemyTimer<=0)){enemyState='stalk';enemyTimer=8;exposure=0;}
 const blood=hiddenHere?forest.expedition.logic.bloodTarget(e.position.x,e.position.z,b=>forest.lineOfSight({x:e.position.x,y:e.position.y+.5,z:e.position.z},b)):null;if(blood&&enemyState==='search')enemyTimer=Math.max(enemyTimer,3);
 const baseTarget=lure&&enemyState==='investigate'?lure:hiddenHere?(blood||sight.last):p;
 const tactic=watcherTactics.target(simTime,{enemy:e.position,player:p,trees:forest.treeRecords,state:hiddenHere?'search':enemyState,safe,canWalk:(x,z)=>forest.canMove(x,z)&&forest.actorSpaceFree(x,z,.8),protectedAt:(x,z)=>forest.protectedAt(x,z)});
 const target=enemyState==='stalk'&&!hiddenHere?tactic.target:baseTarget,dx=target.x-e.position.x,dz=target.z-e.position.z,d=Math.hypot(dx,dz);
 if(blood&&enemyState==='search'&&d<.85)forest.expedition.logic.trackedBloodAt=Math.max(forest.expedition.logic.trackedBloodAt,blood.at);
 e.userData.aim={x:(watcherTactics.cover&&enemyState==='stalk'?p:target).x,z:(watcherTactics.cover&&enemyState==='stalk'?p:target).z};e.userData.behavior=enemyState;e.userData.peek=tactic.peek;
 const aim=(-Math.sin(yaw)*(e.position.x-p.x)-Math.cos(yaw)*(e.position.z-p.z))/Math.max(.001,physicalDistance),lit=run.flash&&run.battery>0&&clear&&aim>.94&&physicalDistance<35;
 exposure=Math.max(0,exposure+clockDt*(lit?1:-1.5));
 if(lit&&exposure>1.3&&exposure<1.3+clockDt*2){subtitle('Он повернул голову. Убери свет.',3);audio.twig();}
 if(enemyState==='stalk'&&(exposure>3.4||enemyTimer<=0||((sprinting||charging)&&physicalDistance<15)))warnWatcher();
 if(enemyState==='warning'&&enemyTimer<=0){enemyState='hunt';enemyTimer=(run.mode==='demo'?18:24)+run.progress*8;}
 if(enemyState==='investigate'&&physicalDistance<4&&clear)warnWatcher();
 if(forest.expedition.logic.catchWatcher(e.position.x,e.position.z)){audio.chain();award('TRAPPER');toast('Твой капкан удержит Смотрителя шесть секунд. Уходи!',6);enemyState='warning';enemyTimer=10;}
 let speed=enemyState==='retreat'?-4:enemyState==='investigate'?(d>1.4?1.55:0):enemyState==='hunt'?(2.7+run.progress*.25)*phaseAt(run.progress).hunt:enemyState==='warning'?0:.65;
 if(safe&&d<10){speed=-1.8;enemyTimer-=clockDt*1.8;}if(enemyState==='stalk'&&!safe){if(watcherTactics.cover)speed=d<.45?0:.65;else if(physicalDistance<11)speed=0;}if(enemyState==='search'){speed=d>1?.8:0;if(enemyTimer<=0){enemyState='retreat';enemyTimer=6;}}
 if(forest.expedition.logic.held){speed=0;enemyTimer=Math.max(enemyTimer,4);}
 if(forest.enemy.userData.attackLeft>.1)speed=0;
 if(forest.expedition.logic.held)watcherSpeed=0;
 watcherSpeed=advanceGroundActor(e.position,watcherSpeed,speed,dt,dx,dz,(x,z)=>forest.canMove(x,z)&&!forest.protectedAt(x,z),Math.sin(simTime*.7)>0?1:-1);
 if(enemyState==='hunt'&&level()==='ground'&&physicalDistance<1.65&&clear&&!hiddenHere&&!safe&&!forest.expedition.logic.held&&hitCooldown===0){hitCooldown=2;forest.enemy.userData.attackLeft=.65;}
 if(previousAttack>.33&&forest.enemy.userData.attackLeft<=.33&&enemyState==='hunt'&&level()==='ground'&&physicalDistance<1.95&&clear&&!safe&&!forest.expedition.logic.held){run.hurt(38,'Смотритель настиг тебя. Беги к огню или бросай фальшфейер до того, как он окажется рядом.',true);hitFlash=.75;audio.hurt();toast('Ты ранен. H — перевязка.',4);}
 if(enemyState==='hunt'&&enemyTimer<=0){enemyState='retreat';enemyTimer=6;}
 if(enemyState==='retreat'){if(enemyTimer<=0){e.visible=false;enemyState='rest';pacing.recover();enemyTimer=(run.mode==='demo'?20:55)+rng()*25-run.progress*10;}}
 return Math.max(0,1-physicalDistance/35)*(enemyState==='hunt'?1:.45);
}
function horrorEvents(dt){
 const p=forest.camera.position;
 for(const event of horror.update(dt,{active:isPlaying(),x:p.x,z:p.z,yaw,flash:run.flash&&run.battery>0,bodies:level()==='ground'?(forest.horror?.bodies||[]):[],props:level()==='ground'?(forest.horror?.props||[]):[]})){
  if(!pacing.event())continue;
  const dx=(event.x??CEMETERY.x)-p.x,dz=(event.z??CEMETERY.z)-p.z,pan=Math.max(-.9,Math.min(.9,(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/Math.max(1,Math.hypot(dx,dz))));
  if(event.type==='rope'){audio.creak(pan);subtitle('Верёвка скрипит. Ветра почти нет.',4);}
  if(event.type==='body'){forest.horror.disturb(event.id);audio.creak(pan);audio.whisper(-pan);subtitle('Голова повернулась к свету.',4);}
  if(event.type==='whisper'){audio.whisper(Math.sin(simTime)*.8);subtitle('Кто-то выдохнул за спиной.',3);}
  if(event.type==='bell')audio.bell(pan);
  if(event.type==='radio'){const message=forest.night.logic.radio();if(message)radioGuide(message,pan);}
  if(event.type==='scrape'){audio.scrape(pan);subtitle('Металл скребёт по камню. Каталка стоит неподвижно.',4);}
  if(event.type==='chain')audio.chain(pan);
  if(event.type==='grave'){
   audio.bell(pan);subtitle('Эта могила ещё пуста. За оградой кто-то стоит.',7);toast('Кладбище. Держи путь к костру открытым.',6);
   if(enemyState==='rest'&&!forest.soundNight.logic.hunter.active&&!forest.exploration.logic.statue&&!forest.night.logic.double){
    const candidates=[[-17,-19.4],[-22,-18],[-22,-7],[-12,-19.1],[-19,-15.8],[-15,-18]];
    const place=candidates.filter(([x,z])=>forest.canMove(x,z)&&Math.hypot(x-p.x,z-p.z)>7).sort((a,b)=>Math.hypot(b[0]-p.x,b[1]-p.z)-Math.hypot(a[0]-p.x,a[1]-p.z))[0];
    if(place){forest.enemy.position.set(place[0],heightAt(...place),place[1]);forest.enemy.visible=true;enemyState='stalk';enemyTimer=18;exposure=0;forest.flash.shadow.needsUpdate=true;}
   }
  }
 }
}
function radioGuide(event,pan=0){audio.radioMessage(translate(event.text),pan,getLanguage());$('radioMessage').textContent='РАЦИЯ · '+event.text;$('radioMessage').hidden=false;radioUntil=simTime+22;}
function nightEvents(raw,movement){
 const p=forest.camera.position,n=forest.night.logic;
 const walk=(x,z)=>forest.canMove(x,z)&&forest.actorSpaceFree(x,z,1)&&Math.hypot(x,z)<95;
 const spawn=(x,z)=>walk(x,z)&&forest.actorSpaceFree(x,z,1.8)&&!forest.protectedAt(x,z)&&!(Math.abs(x)<4.8&&z>-21&&z<-8)&&Math.hypot(x-p.x,z-p.z)>14;
 for(const e of n.update(raw,{active:isPlaying(),x:p.x,z:p.z,feetY:jump.feetY,ground:heightAt(p.x,p.z),yaw,pitch,moving:moving&&jump.grounded,sprinting:movement.sprinting,flash:run.flash&&run.battery>0,grave:cemeteryReserved(p.x,p.z,0),canSpawn:spawn,canWalk:walk,allowScares:pacing.allow()&&enemyState==='rest'&&!forest.soundNight.logic.hunter.active&&!forest.exploration.logic.statue})){
  const dx=(e.x??p.x)-p.x,dz=(e.z??p.z)-p.z,pan=Math.max(-.9,Math.min(.9,(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/Math.max(1,Math.hypot(dx,dz))));
  if(e.type==='double-gone')pacing.recover();
  if(e.type==='trap'){pacing.recover();run.hurt(e.damage,'Ловушка ранила тебя. Проверяй землю фонарём и обезвреживай капканы на E.',true);run.stamina=Math.max(0,run.stamina-20);hitFlash=.5;audio.chain(pan);audio.hurt();toast(n.snared!==null?'Капкан! E — освободить ногу · H — перевязать.':'Растяжка сработала. Шум привлёк Смотрителя.',6);alertWatcher();}
  if(e.type==='false-camp'){audio.whisper(pan);subtitle('Они не дышат. Огонь не греет. Уходи.',6);toast('У этого огня нет треска дров и белых зарубок.',6);alertWatcher();}
  if(e.type==='basement-enter'){audio.overhead();subtitle('Наверху скрипнули половицы. Ты здесь один.',5);}
  if(e.type==='door-close'){audio.doorSlam();toast('Дверь наверху закрылась. Вернись и откинь засов на E.',7);}
  if(e.type==='new-grave'){audio.bell(-.4);subtitle('Этой могилы здесь не было. На камне — прожитое тобой время.',7);}
  if(e.type==='echo'&&pacing.event())audio.echoSteps(pan);
  if(e.type==='double-appear'){audio.whisper(pan);subtitle('Между деревьями зажёгся такой же фонарь.',5);}
  if(e.type==='double-free'){audio.twig(pan);subtitle('Ты остановился. Он продолжает идти.',5);}
 }
}
function alertWatcher(){if(enemyState==='rest'){if(spawnWatcher(false,true))warnWatcher();}else warnWatcher();}
function phaseUpdate(){
 const phase=story.update(run.progress);if(phase){$('objective').textContent=phase.name;toast(phase.text,10);if(story.phase>0){audio.tone(80,2,.08,39);radioGuide({text:phase.text});}}
 forest.storyScene.update(run.progress,story);
 for(const e of forest.livingForest.update(run.progress,forest.camera.position,yaw,pitch)){audio.creak();subtitle('Здесь что-то изменилось, пока тебя не было.',6);story.log.push('ЛЕС МЕНЯЕТСЯ · Вещи передвинуты. На доске появилась надпись.');}
}
function renderHud(){
 if(!run)return;
 $('countdown').textContent=formatTime(run.remaining);const clock=20*3600+run.progress*36000,h=Math.floor(clock/3600)%24,m=Math.floor(clock/60)%60;$('nightClock').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
 for(const key of ['health','warmth','stamina','hunger','thirst']){$(key+'Text').textContent=Math.ceil(run[key]);$(key+'Bar').style.width=run[key]+'%';$(key+'Bar').style.background=run[key]<25?'#d39973':'#b5c4a1';}
 const bearing=((Math.round(-yaw*180/Math.PI)%360)+360)%360;const compass=['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'][Math.round(bearing/45)%8];$('locationLabel').textContent=(inTrain(forest.camera.position.x,forest.camera.position.z)?'ВАГОН № 04':inPit(forest.camera.position.x,forest.camera.position.z)?'ШАХТА ЛЕСОПИЛКИ':inMill(forest.camera.position.x,forest.camera.position.z)?'ЛЕСОПИЛКА № 4':inSwamp(forest.camera.position.x,forest.camera.position.z)?'ТОПЬ':level()==='attic'?'ЧЕРДАК КОРДОНА':level()==='lower'?'ПОДВАЛ КОРДОНА':'КОРДОН № 04')+' · '+compass+' '+bearing+'°';
 $('wetText').textContent=run.wetness<1?'СУХО':Math.ceil(run.wetness)+'% МОКРО';$('wetText').classList.toggle('soaked',run.wetness>65);$('barrierButton').hidden=!barrierPlace()||!!forest.chapel.logic.barricade;const a=hands.current;$('handAction').hidden=!a;$('handAction').textContent=a?({reach:'ОБЫСК','open-door':'ОТКРЫВАЕШЬ ДВЕРЬ',heal:'ПЕРЕВЯЗКА',photo:'ФОТОАППАРАТ',barricade:'ЗАБИВАЕШЬ ДОСКИ',unbarrier:'СНИМАЕШЬ ДОСКИ',crowbar:'ВСКРЫВАЕШЬ ЯЩИК',rope:'КРЕПИШЬ ВЕРЁВКУ',climb:'ПОДНИМАЕШЬСЯ',descend:'СПУСКАЕШЬСЯ',rescue:'ХВАТАЕШЬСЯ ЗА КОРЕНЬ',trap:'СТАВИШЬ КАПКАН','throw-stone':'БРОСАЕШЬ КАМЕНЬ','throw-bottle':'БРОСАЕШЬ БУТЫЛКУ','wind-toy':'ЗАВОДИШЬ ПТИЦУ'}[a.name]||a.name)+' · '+Math.round(a.age/a.duration*100)+'%':'';
 $('batteryText').textContent=forest.exploration.logic.cursedLight?(run.flash?'ЧУЖОЙ · ∞':'ВЫКЛ · ЧУЖОЙ'):(run.flash?'':'ВЫКЛ · ')+Math.ceil(run.battery)+'%';$('woodText').textContent=run.wood;$('medText').textContent=run.kits;$('flareText').textContent=run.flares;
 $('foodText').textContent=run.food;$('waterText').textContent=run.water;$('loadText').textContent=run.load+' / '+run.capacity;$('injuryText').textContent=run.bleeding?'КРОВОТЕЧЕНИЕ · H':run.limp?'ХРОМАЕШЬ':'БЕЗ РАН';$('toolsText').textContent=(run.crowbar?'ЛОМ · ':'')+(run.rope?'ВЕРЁВКА · ':'')+'КАПКАНЫ '+run.trapKits;$('fuelText').textContent='ДРОВА '+Math.ceil(run.woodWet)+'% ВЛАГИ'+(run.dryFuel?' · СУХИХ '+run.dryFuel:'')+' · РАСТОПКА '+run.kindling;for(const key of ['stones','bottles','toys','kindling','crowbar','rope','trapKits'])$('pack-'+key).textContent=run[key];const ex=forest.exploration.logic;$('stanceText').textContent=crouched?(hiddenHere?'В УКРЫТИИ':'ПРИСЕЛ'):'СТОЯ';$('filmText').textContent=ex.camera?ex.film:'НЕТ';$('photoCounter').textContent=ex.camera?(photos.length?photoIndex+1:0)+' / '+photos.length+' · осталось '+ex.film:'фотоаппарат не найден';$('photoNotes').textContent=photos.length?photos[photoIndex].text:'Фотографий пока нет. Фотоаппарат лежит в избе.';$('photoImage').hidden=!photos.length;if(photos.length&&$('photoImage').getAttribute('src')!==photos[photoIndex].data)$('photoImage').src=photos[photoIndex].data;$('photoPrev').disabled=photoIndex<=0;$('photoNext').disabled=photoIndex>=photos.length-1;$('questText').textContent=story.objective+' · улики '+story.evidence.size+'/3';$('journalText').textContent='Ты ищешь брата Лёшу.\n'+story.objective+'\n\n'+(story.log.join('\n\n')||'Пока нет записей. Найди журнал в избе.');for(const key of ['wood','kits','flares','food','water']){$('pack-'+key).textContent=run[key];}renderStorage();nearby=isPlaying()&&!panelOpen()?closestInteraction():null;$('interaction').hidden=!nearby;
 if(nearby){const labels={'release':'Освободить ногу','trap':'Обезвредить ловушку','radio':'Слушать рацию','door':'Откинуть засов','hatch':forest.night.logic.hatchOpen?'Закрыть люк':'Открыть подвал','basement-loot':'Забрать запас кордона'};const label=nearby.type==='sound'?(nearby.item.id==='dry-rack'?(forest.soundNight.logic.rackReady?'Забрать сухую связку':forest.soundNight.logic.rack!==null?'Дрова сохнут · '+Math.ceil(forest.soundNight.logic.rack)+' сек':nearby.item.label):nearby.item.label):nearby.type==='expedition'?(nearby.item.id==='mill-crate'&&forest.expedition.logic.crateOpened?'Забрать припасы лесопилки':nearby.item.id==='pit-top'&&forest.expedition.logic.ropeInstalled?'Спуститься по верёвке':nearby.item.label):nearby.type==='chapel'?({'chapel-key':'Взять ключ часовни','chapel-door':forest.chapel.logic.doorOpen?'Закрыть часовню':forest.chapel.logic.key?'Отпереть часовню':'Заперто · нужен ключ из избы','chapel-bell':'Тянуть колокол · они услышат','chapel-notes':'Прочитать записи звонаря'}[nearby.item.id]):nearby.type==='door'&&forest.chapel.logic.barricade?'Снять баррикаду · 2 секунды':nearby.type==='attic-down'?'Спуститься по лестнице':nearby.type==='site'?'Осмотреть '+({car:'перевёрнутую машину',tent:'пустую палатку',phone:'оборванный телефон'}[nearby.item.id]):nearby.type==='explore'?(nearby.item.id==='well'?ex.wellLabel:nearby.item.label):nearby.type==='story'?nearby.item.label:labels[nearby.type]||(nearby.type==='fire'?(nearby.item.fuel>0?'Подбросить дрова · '+Math.ceil(nearby.item.fuel/60)+' мин огня':'Разжечь костёр'):(nearby.item.cooldown>0?'Ящик пуст':'Открыть ящик · выбрать припасы'));$('interaction').querySelector('span').textContent=label;}
}
function frame(now){
 pollPad(now);
 const raw=Math.max(0,(now-last)/1000);last=now;let bob=0,renderSprinting=false,renderGaitPhase=cameraResponse.phase;
 if(forest){
  if(isPlaying()){
   const dt=motionDelta(raw);simTime+=raw;const movement=movePlayer(dt);bob=movement.bob;renderSprinting=movement.sprinting;renderGaitPhase=movement.phase;
   const p=forest.camera.position,warmth=forest.warmthAt(p.x,p.z,jump.feetY),shelter=forest.shelteredAt(p.x,p.z,jump.feetY);pacing.update(raw);updateHands(raw);updateAtmosphere(raw);
   run.advance(raw,{warmth,shelter,sprinting:movement.sprinting,charging,cursed:forest.exploration.logic.cursedLight,coldScale:phaseAt(run.progress).cold,rain:.35+phaseAt(run.progress).storm*.65});
   const camp=forest.fires.findIndex(f=>f.fuel>0&&Math.hypot(p.x-f.x,p.z-f.z)<5);if(memory.update(raw,{active:isPlaying(),x:p.x,z:p.z,moving:moving&&level()==='ground',camp:camp<0?null:camp,mode:run.mode})&&enemyState==='rest')spawnWatcher(true);
   for(const f of forest.fires)f.fuel=Math.max(0,f.fuel-raw);
   for(const c of forest.crates){const previous=c.cooldown;c.cooldown=Math.max(0,c.cooldown-raw);if(previous>0&&c.cooldown===0){c.beacon.visible=c.glow.visible=true;c.contents=null;c.opened=false;c.wasPicked=false;}}
   let danger=0;if(isPlaying()){horrorEvents(raw);nightEvents(raw,movement);explorationEvents(raw,movement);expeditionEvents(raw);soundEvents(raw,movement);if(isPlaying())danger=updateWatcher(dt,movement.sprinting,raw);if(forest.soundNight.logic.hunter.active)danger=Math.max(danger,Math.max(0,1-Math.hypot(p.x-forest.soundNight.logic.hunter.x,p.z-forest.soundNight.logic.hunter.z)/24)*.7);}dangerNow=danger;
   audio.listener(p,yaw,pitch);creatureSounds();audio.update(simTime,{step:movement.step,stepSide:movement.stepSide,moving:moving&&jump.grounded,running:movement.sprinting,danger,fire:warmth,charging,warning:enemyState==='warning',crouched,creek:Math.max(0,1-Math.abs(p.x+48)/8)*(p.z<-11&&p.z>-39?1:0),cursed:forest.exploration.logic.cursedLight&&run.flash,stage:story.phase,surface:surfaceAt(p.x,p.z,jump.feetY),stamina:run.stamina,shelter,rain:.35+phaseAt(run.progress).storm*.65,storm:phaseAt(run.progress).storm});photoFlash=Math.max(0,photoFlash-dt*4);$('cameraFlash').style.opacity=String(photoFlash);hitFlash=Math.max(0,hitFlash-dt*.5);$('damage').style.opacity=String(Math.max(hitFlash,run.health<30?.14:0));
   if(simTime>radioUntil)$('radioMessage').hidden=true;if(simTime>toastUntil)$('toast').textContent='';if(simTime>subtitleUntil)$('subtitle').textContent='';phaseUpdate();
   if(now-lastHud>=100){renderHud();lastHud=now;}if(run.status==='dead'||run.status==='won')finish();
  }
  if(isPlaying()&&!document.hidden){const sceneDt=motionDelta((now-lastSceneFrame)/1000);lastSceneFrame=now;forest.update(sceneDt,lastSceneState={danger:dangerNow,health:run?.health??100,warmth:run?.warmth??100,stamina:run?.stamina??100,progress:run?.progress||0,flash:run?.flash??true,battery:run?.battery??100,active:isPlaying(),feetY:jump.feetY,yaw,crouched,moving,grounded:jump.grounded,sprinting:renderSprinting,gaitPhase:renderGaitPhase,bobbing:headBob,storm:run?phaseAt(run.progress).storm:0,bob,charging,cursed:forest.exploration?.logic.cursedLight,chasing:enemyState==='hunt',horrorLight:isPlaying()?horror.lightScale:1,lightning:isPlaying()?stormClock.intensity:0,lightningPhase:isPlaying()?stormClock.phase:'dark',wetness:run?.wetness||0,hand:hands.view||(forest.exploration?.logic.well?{name:'well',age:forest.exploration.logic.well.age,progress:0}:null)});}
  else if(menuIsLive()&&!document.hidden)menuScene(now);
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
$('photoPrev').onclick=()=>{if(photoIndex>0){photoIndex--;renderHud();}};$('photoNext').onclick=()=>{if(photoIndex<photos.length-1){photoIndex++;renderHud();}};
$('start').onclick=()=>start();$('pauseButton').onclick=pause;$('resume').onclick=resume;
$('restart').onclick=()=>{const mode=run.mode;run=null;start(mode);};$('backMenu').onclick=backToMenu;
$('abandon').onclick=()=>{runFacts.abandoned=true;run.status='dead';run.reason='Ты завершил попытку. Следующая ночь начнётся с нуля.';finish();};
$('settingsOpen').onclick=()=>$('settings').showModal();$('pauseSettings').onclick=()=>$('settings').showModal();$('helpOpen').onclick=()=>$('help').showModal();
$('achievementsOpen').onclick=()=>{renderAchievements();$('achievementsDialog').showModal();};
// Every control is stored as soon as it changes; a paused frame is redrawn so the change shows behind the dialog.
const bindRange=(id,apply)=>{$(id).oninput=e=>{settings.set(id,e.target.value);apply(settings.get(id));previewFrame();};};
const bindCheck=(id,apply)=>{$(id).onchange=e=>{settings.set(id,e.target.checked);apply(e.target.checked);previewFrame();};};
bindRange('volume',v=>audio.setVolume(v/100));bindRange('sensitivity',v=>sensitivity=v/37500);
bindRange('brightness',v=>{if(forest)forest.renderer.toneMappingExposure=v/100;});bindRange('fov',v=>{if(forest)forest.setFov(v);$('fovValue').textContent=v+'°';});
bindRange('padSensitivity',v=>{padRate=v/100;$('padSensitivityValue').textContent=v+'%';});
$('quality').onchange=e=>{settings.set('quality',e.target.value);changeGraphics('quality',e.target.value);};$('resolution').onchange=e=>{settings.set('resolution',e.target.value);changeGraphics('resolution',e.target.value);};
bindCheck('bobbing',v=>headBob=v);bindCheck('invertY',v=>invertY=v);bindCheck('cinematic',v=>{if(forest)forest.cinematic=v;});bindCheck('particles',v=>{if(forest)forest.setParticles(v);});
bindCheck('liveMenu',()=>updateMenuMode());bindCheck('vibration',v=>{if(v)rumble(.25,.3,160);});
$('displayMode').onchange=e=>platform.setFullscreen(e.target.value==='fullscreen');
function changeGraphics(kind,value){if(!forest)return;if(isPlaying())pause();kind==='quality'?forest.setQuality(value):forest.setResolution(value);preparation.request().catch(error=>{console.error(error);$('loadError').hidden=false;$('loadError').textContent='Не удалось подготовить графику. Обнови страницу, чтобы повторить загрузку.';});}
document.querySelectorAll('input[name=mode]').forEach(input=>input.onchange=()=>{$('modeHelp').textContent=input.value==='demo'?'Короткая проверка всех механик. Основная ночь длится 2 часа.':'Одна жизнь. Без сохранений. Выход завершает попытку.';});
addEventListener('keydown',e=>{
 setInputMode(false);
 if($('settings').open||$('help').open||$('achievementsDialog').open)return;
 if(e.code==='Escape'){e.preventDefault();if(panelOpen())closePanels(isPlaying());else if(isPlaying())pause();else if(run?.status==='paused')resume();return;}
 if((['KeyI','KeyJ','KeyP'].includes(e.code)||e.code==='Tab'&&isPlaying()&&!panelOpen())&&!e.repeat&&(isPlaying()||run?.status==='paused')){
  if(run.status==='paused'&&!['KeyI','Tab'].includes(e.code))return;e.preventDefault();action(e.code==='KeyJ'?'journal':e.code==='KeyP'?'album':'pack');return;
 }
 if(panelOpen()){if(e.code==='KeyE'&&!$('containerPanel').hidden){e.preventDefault();closePanels(true);}return;}
 if(!isPlaying()||e.target.matches?.('input,select,textarea,button'))return;
 if(['KeyW','KeyA','KeyS','KeyD','KeyR','KeyF','KeyE','KeyH','KeyG','KeyC','KeyV','KeyX','KeyB','KeyT','KeyK','KeyQ','KeyN','ControlLeft','ControlRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.repeat)return;const map={KeyF:'flash',KeyE:'interact',KeyH:'heal',KeyG:'flare',KeyC:'eat',KeyV:'drink',KeyX:'photo',KeyB:'curse',KeyT:'barricade',KeyK:'set-trap',KeyQ:'throw-auto',KeyN:'wind-toy',ControlLeft:'crouch',ControlRight:'crouch',Space:'jump'};if(map[e.code])action(map[e.code]);
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('mousemove',e=>{if(Math.abs(e.movementX)+Math.abs(e.movementY)>3)setInputMode(false);if(isPlaying()&&!panelOpen()&&(document.pointerLockElement===forest.canvas||dragging)){lookResponse.add(-e.movementX*sensitivity,(invertY?1:-1)*e.movementY*sensitivity);}});
$('world').addEventListener('mousedown',e=>{setInputMode(false);if(isPlaying()&&!panelOpen()&&e.button===0){document.activeElement?.blur();dragging=true;if(!document.pointerLockElement)requestLock();}});addEventListener('mouseup',()=>dragging=false);
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===forest?.canvas;if(hasLock&&!locked&&isPlaying()&&!panelOpen())pause();hasLock=locked;});
document.addEventListener('pointerlockerror',()=>{hasLock=false;if(isPlaying()&&!panelOpen())toast('Обзор: удерживай левую кнопку мыши или используй стрелки.',6);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});addEventListener('blur',()=>{keys.clear();if(isPlaying())pause();});
addEventListener('beforeunload',e=>{if(run&&['playing','paused'].includes(run.status)){e.preventDefault();e.returnValue='';}});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();if(run&&['playing','paused'].includes(run.status)){run.status='dead';run.reason='Браузер потерял 3D-контекст. Попытка завершена без сохранения.';finish();}$('loadError').hidden=false;$('loadError').textContent='Потерян 3D-контекст. Обнови страницу, чтобы начать новую попытку.';$('start').disabled=true;$('restart').disabled=true;});
let joyPointer=null,joyOrigin={x:0,y:0},lookPointer=null,lookLast={x:0,y:0};const joystick=$('joystick');
joystick.addEventListener('pointerdown',e=>{if(!isPlaying()||panelOpen())return;joyPointer=e.pointerId;const r=joystick.getBoundingClientRect();joyOrigin={x:r.left+r.width/2,y:r.top+r.height/2};joystick.setPointerCapture(e.pointerId);updateJoystick(e);});
function updateJoystick(e){if(e.pointerId!==joyPointer)return;const dx=e.clientX-joyOrigin.x,dy=e.clientY-joyOrigin.y,len=Math.max(42,Math.hypot(dx,dy));touch.x=dx/len;touch.y=dy/len;joystick.firstElementChild.style.transform='translate('+touch.x*34+'px,'+touch.y*34+'px)';}
joystick.addEventListener('pointermove',updateJoystick);function releaseJoystick(){joyPointer=null;touch.x=touch.y=0;joystick.firstElementChild.style.transform='';}joystick.addEventListener('pointerup',releaseJoystick);joystick.addEventListener('pointercancel',releaseJoystick);
$('lookZone').addEventListener('pointerdown',e=>{if(!isPlaying()||panelOpen())return;lookPointer=e.pointerId;lookLast={x:e.clientX,y:e.clientY};e.target.setPointerCapture(e.pointerId);});
$('lookZone').addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||!isPlaying()||panelOpen())return;lookResponse.add(-(e.clientX-lookLast.x)*.005,-(e.clientY-lookLast.y)*.005);lookLast={x:e.clientX,y:e.clientY};});
$('lookZone').addEventListener('pointerup',()=>lookPointer=null);$('lookZone').addEventListener('pointercancel',()=>lookPointer=null);
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-close-panel')){closePanels(isPlaying());return;}
 if(b.dataset.take){takeLoot(b.dataset.take);return;}
 if(b.dataset.drop){if(run?.drop(b.dataset.drop)){toast('Предмет выброшен. Место освобождено.');renderHud();}return;}
 if(b.dataset.action){const fromPanel=!!b.closest('#packPanel,#containerPanel');action(b.dataset.action,fromPanel);if(!panelOpen())b.blur();}
});
$('takeAll').onclick=()=>takeLoot();$('pausePack').onclick=()=>showPanel('pack',true);
for(const id of ['packPanel','containerPanel'])$(id).addEventListener('cancel',e=>{e.preventDefault();closePanels(isPlaying());});
document.querySelectorAll('[data-hold]').forEach(b=>{b.onpointerdown=e=>{if(!isPlaying()||panelOpen())return;keys.add(b.dataset.hold);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.hold);});
const context=document.modelContext;
if(context?.registerTool){
 const life=new AbortController(),register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}};
 register({name:'read_survival_status',title:'Состояние попытки',description:'Прочитать видимые показатели текущей попытки без изменения игры.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('Параметры не поддерживаются');return run?{status:run.status,mode:run.mode,remaining:formatTime(run.remaining),health:Math.ceil(run.health),warmth:Math.ceil(run.warmth),battery:Math.ceil(run.battery),wood:run.wood,medkits:run.kits,flares:run.flares,hunger:Math.ceil(run.hunger),thirst:Math.ceil(run.thirst),load:run.load,capacity:run.capacity,food:run.food,water:run.water,objective:translate(story.objective),evidence:story.evidence.size,crouched,hidden:hiddenHere,camera:forest.exploration.logic.camera,film:forest.exploration.logic.film,cursedLight:forest.exploration.logic.cursedLight,wetness:Math.ceil(run.wetness),barricade:!!forest.chapel.logic.barricade,chapelKey:forest.chapel.logic.key,bleeding:run.bleeding,limp:run.limp,crowbar:run.crowbar,rope:run.rope,trapKits:run.trapKits,stones:run.stones,bottles:run.bottles,toys:run.toys,kindling:run.kindling,woodMoisture:Math.ceil(run.woodWet),swampSink:forest.expedition.logic.sink}:{status:'menu'};}});
 register({name:'start_survival_run',title:'Начать ночь',description:'Начать новую попытку из меню: full — 2 реальных часа, demo — 6 минут. Не заменяет активную попытку.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['full','demo']}},required:['mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!['full','demo'].includes(input.mode)||Object.keys(input).some(k=>k!=='mode'))throw new Error('Укажи режим full или demo');return start(input.mode);}});
 addEventListener('pagehide',()=>life.abort(),{once:true});
}

function fullscreen(){if(platform.desktop){platform.setFullscreen('toggle').then(v=>{$('displayMode').value=v?'fullscreen':'window';});return;}if(document.fullscreenElement){document.exitFullscreen?.();}else{document.documentElement.requestFullscreen?.().catch(()=>{});}}
$('fullscreenMenu').onclick=fullscreen;$('fullscreenGame').onclick=fullscreen;

function barrierPlace(){const p=forest.camera.position;return !!run&&level()==='ground'&&Math.abs(p.x)<2.65&&p.z>-13.3&&p.z<-11.05;}
function beginBarricade(){
 if(hands.current||forest.exploration.logic.well){toast('Руки заняты.');return;}if(!barrierPlace()){toast('Баррикаду ставят изнутри у двери избы. T — две связки дров.');return;}if(forest.chapel.logic.barricade){toast('Доски уже стоят. E у двери — снять за две секунды.');return;}if(run.wood<2){toast('Для баррикады нужны две связки дров.');return;}const p=forest.camera.position;hands.start('barricade',2.4,2.4,{x:p.x,z:p.z});toast('Забиваешь доски. Стой у двери. Две связки дров.',4);audio.noise(.1,.15,1200);
}
function reachInteraction(apply,name='open-door'){const p=forest.camera.position;if(!hands.start(name,.65,.27,{x:p.x,z:p.z}))return false;hands.current.apply=apply;return true;}
function updateHands(raw){
 const a=hands.current,p=forest.camera.position;if(a?.origin&&Math.hypot(p.x-a.origin.x,p.z-a.origin.z)>1){hands.reset();toast('Ты отступил. Действие прервано, предметы сохранены.',3);return;}
 const oldAge=a?.age||0;for(const e of hands.update(raw,isPlaying())){
  if(e.type!=='cue')continue;
  if(['reach','open-door'].includes(e.name))a?.apply?.();
  if(e.name==='photo')capturePhoto();
  if(e.name==='heal'){if(run.heal()){toast('Перевязка готова. +45 здоровья; кровь остановлена.');audio.pickup();}else toast('Перевязка не потребовалась.');}
  if(e.name==='barricade'){if(barrierPlace()&&forest.chapel.logic.build(run)){forest.night.logic.doorClosed=true;forest.night.logic.doorDelay=0;forest.cabinDoor.wall.active=true;forest.staticShadowsDirty=true;audio.doorSlam();alertWatcher();toast('Дверь укреплена. E — снять доски; они выдержат три удара.',7);}else toast('Не удалось поставить доски: нужны две связки дров.');}
  finishExpeditionAction(e.name,a);finishSoundAction(e.name,a);
  if(e.name==='unbarrier'&&forest.chapel.logic.remove()){forest.night.logic.openDoor();forest.cabinDoor.wall.active=false;forest.staticShadowsDirty=true;audio.scrape();toast('Доски сняты. Дверь открыта.');}
 }
 if(a&&['barricade','unbarrier'].includes(a.name)&&Math.floor(oldAge*3)!==Math.floor(a.age*3))audio.noise(.08,.16,650);
}
function chapelInteract(id){
 if(hands.current||forest.exploration.logic.well){toast('Руки заняты.');return;}const c=forest.chapel.logic;
 if(id==='chapel-key'&&c.takeKey()){audio.pickup();story.log.push('КЛЮЧ ЧАСОВНИ · На северо-западе, за кладбищем, стоит часовня потерянных голосов. Её крыша даёт укрытие от дождя. Колокол зовёт всех, кто ещё слышит.');toast('Ключ часовни. Ищи указатель за кладбищем, на северо-западе.',8);}
 if(id==='chapel-door'){if(!c.key){toast('Заперто. Ключ оставлен в избе, у стены слева от входа.',6);audio.chain();return;}forest.viewmodel.gesture('open-door');c.toggleDoor();forest.chapel.doorWall.active=!c.doorOpen;forest.staticShadowsDirty=true;audio.creak();toast(c.doorOpen?'Дверь часовни открыта. Крыша укроет от дождя.':'Дверь закрыта. Здесь холодно даже без дождя.',5);}
 if(id==='chapel-notes'&&!c.notes){c.notes=true;const text='ЗАПИСИ ЗВОНАРЯ · Лес удерживает последние слова умерших. Рация повторяет их, чтобы привести живого к чужому огню. Не отвечай, когда услышишь свой голос. Медный колокол на двадцать пять секунд стягивает шаги к часовне. Он не различает живых и мёртвых. Звони и уходи — если останешься рядом, найдут тебя.';story.log.push(text);toast('Записи звонаря добавлены в J. Колокол отвлекает, но выдаёт часовню.',9);subtitle('«Голоса идут на медь. Не стой под колоколом».',8);audio.noise(.3,.10,1500);}
 if(id==='chapel-bell'){if(!c.ring()){toast('Колокол ещё гудит. Снова через '+Math.ceil(c.bellReady-c.time)+' секунд.');return;}forest.chapel.ring();audio.bell();award('BELL');if(enemyState==='rest')spawnWatcher(false,true);if(forest.enemy.visible){enemyState='investigate';enemyTimer=25;exposure=0;}toast('Колокол зовёт существ сюда на 25 секунд. Уходи от часовни.',8);subtitle('Гул ушёл в лес. Несколько шагов сменили направление.',7);}
 renderHud();
}
function updateAtmosphere(raw){
 const p=forest.camera.position,c=forest.chapel.logic,pressed=forest.enemy.visible&&Math.hypot(forest.enemy.position.x,forest.enemy.position.z+10.8)<5;
 for(const e of c.update(raw,{active:isPlaying(),pressed})){
  if(e.type==='knock'){forest.chapel.knock();audio.knock();award('KNOCK_KNOCK');subtitle('Доска треснула. Кто-то проверяет ручку снаружи.',5);}
  if(e.type==='barrier-warning'){audio.creak();toast('Последняя доска сдаёт. Четыре секунды — готовься отходить!',5);}
  if(e.type==='barrier-broken'){forest.night.logic.doorClosed=false;forest.cabinDoor.wall.active=false;forest.staticShadowsDirty=true;audio.doorSlam();if(forest.enemy.visible){enemyState='warning';enemyTimer=4;exposure=0;}toast('Доски сорваны. E больше не нужен. Отступай к огню!',5);}
 }
 for(const e of stormClock.update(raw,{active:isPlaying(),storm:phaseAt(run.progress).storm,random:rng()})){
  if(e.type==='lightning'){forest.chapel.clearStrike();let place=null;for(let i=0;i<14;i++){const angle=yaw+(i%2?1:-1)*(.13+i*.04),r=9+i*.3,x=p.x-Math.sin(angle)*r,z=p.z-Math.cos(angle)*r;if(forest.canMove(x,z)&&forest.actorSpaceFree(x,z,.8)&&forest.lineOfSight(p,{x,y:heightAt(x,z)+1.5,z})){place={x,z};break;}}if(place){forest.chapel.strike(place.x,place.z,Math.atan2(p.x-place.x,p.z-place.z));forest.moonlight.shadow.needsUpdate=true;}}
  if(e.type==='thunder')audio.thunder(.35);
 }
 if(pacing.natural(rng())&&enemyState==='rest'&&!forest.soundNight.logic.hunter.active&&!forest.exploration.logic.statue&&!forest.shelteredAt(p.x,p.z,jump.feetY)){const x=p.x+Math.cos(yaw)*3,z=p.z-Math.sin(yaw)*3;forest.chapel.twig(x,z);audio.noise(.23,.14,1450,.6);}
}

function expeditionInteract(item){
 const ex=forest.expedition.logic,p=forest.camera.position;if(hands.current||forest.exploration.logic.well){toast('Руки заняты.');return;}
 if(['rope','crowbar'].includes(item.id)){if(ex.takeTool(item.id,run)){audio.pickup();const text=item.id==='rope'?'Верёвка для шахты лесопилки на юго-западе. E у ограждения — закрепить и спуститься.':'Лом вскрывает запертый ящик лесопилки. Внутри аптечка и переносной капкан.';story.log.push('ИНСТРУМЕНТ · '+text);toast(text,8);}else toast('Нужно свободное место в рюкзаке. I — использовать припасы.');}
 if(item.id==='mill'){if(ex.startMill(run)){audio.sawmill();if(enemyState==='rest')spawnWatcher(false,true);if(forest.enemy.visible){enemyState='investigate';enemyTimer=30;exposure=0;}toast('Пила шумит 30 секунд. Шаги идут сюда. Уходи через другой проход.',8);}else toast('Привод остывает. Подожди '+Math.ceil(ex.millReady-ex.time)+' секунд.');}
 if(item.id==='mill-crate'){if(ex.crateOpened){openLoot('Ящик лесопилки',ex.crate,item);}else if(!run.crowbar)toast('Нужен лом: на верстаке в дальнем правом углу лесопилки.');else startExpeditionAction('crowbar',2.2,item);}
 if(item.id==='pit-top'){if(!ex.ropeInstalled&&!run.rope)toast('Без верёвки не выбраться. Моток оставлен в избе справа от входа.');else startExpeditionAction(ex.ropeInstalled?'descend':'rope',2.4,item);}
 if(item.id==='pit-up')startExpeditionAction('climb',2,item);
 if(item.id==='pit-notes'&&!ex.pitTaken){ex.pitTaken=true;award('LAST_SHIFT');story.log.push('ЗАПИСЬ ПОСЛЕДНЕЙ СМЕНЫ · Лёша спустился под пилу, когда наверху заработал привод. Кабель питания был перерезан три дня назад. У топи он слышал наши голоса под водой. Держись досок. Если увяз — корни ещё держат живых. След от раны доведёт Смотрителя до двери: перевязывайся перед тем, как прятаться.');subtitle('«Я слышал смену наверху. Мы хоронили их в пятницу».',8);audio.whisper();toast('Запись смены добавлена в J. Она связывает лесопилку, топь и исчезновение Лёши.',9);}
 if(item.id.startsWith('root-'))startExpeditionAction('rescue',1.8,item);
 renderHud();
}
function startExpeditionAction(name,duration,item){const p=forest.camera.position;if(hands.start(name,duration,duration,{x:p.x,z:p.z})){hands.current.item=item;toast({crowbar:'Упираешь лом. Стой у ящика.',rope:'Крепишь верёвку к ограждению.',descend:'Спускаешься в шахту.',climb:'Поднимаешься по верёвке.',rescue:'Держись за корень. Ещё две секунды.',trap:'Ставишь капкан. Шум может выдать тебя.'}[name],4);audio.scrape();}}
function beginPlayerTrap(){const p=forest.camera.position,ex=forest.expedition.logic;if(hands.current||forest.exploration.logic.well){toast('Руки заняты.');return;}if(!run.trapKits){toast('Капкан ищи в запертом ящике лесопилки. Нужен лом.',6);return;}if(level()!=='ground'||inPit(p.x,p.z)||ex.wet||!jump.grounded){toast('Капкан ставят на твёрдой земле.');return;}const item={x:p.x-Math.sin(yaw)*1.7,z:p.z-Math.cos(yaw)*1.7};if(!forest.canMove(item.x,item.z)||!forest.actorSpaceFree(item.x,item.z,.35)){toast('Перед тобой препятствие. Выбери свободное место.');return;}startExpeditionAction('trap',2,item);}
function finishExpeditionAction(name,a){
 const ex=forest.expedition.logic,p=forest.camera.position,item=a?.item;if(!item||!isPlaying())return;
 if(name==='crowbar'&&ex.openCrate(run)){audio.chain();toast('Замок выломан. E — забрать припасы и переносной капкан.',6);alertWatcher();}
 if(name==='trap'){if(ex.placeTrap(run,item.x,item.z,(x,z)=>forest.canMove(x,z)&&forest.actorSpaceFree(x,z,.35))){audio.chain();toast('Капкан поставлен. Задержит Смотрителя на шесть секунд.',6);}else toast('Здесь нельзя установить капкан.');}
 if(['rope','descend'].includes(name)){if(name==='rope'&&!ex.installRope(run))return;const destination={x:PIT.x,z:PIT.z+.65};if(!forest.canMove(destination.x,destination.z,PIT.floor)){toast('Спуск перекрыт.');return;}jump.reset(PIT.floor);p.set(destination.x,PIT.floor+bodyHeight(),destination.z);forest.night.logic.previous=null;toast('Шахта. E у верёвки — подняться. Запись лежит внизу.',7);}
 if(name==='climb'&&ex.ropeInstalled){const destination={x:PIT.x,z:PIT.z+2};if(!forest.canMove(destination.x,destination.z,MILL.y)){toast('Выход перекрыт.');return;}jump.reset(MILL.y);p.set(destination.x,MILL.y+bodyHeight(),destination.z);forest.night.logic.previous=null;toast('Ты выбрался из шахты. Верёвка остаётся на ограждении.');}
 if(name==='rescue'&&ex.rescue()){award('ROOTS');const clear=[[.7,0],[-.7,0],[0,.7],[0,0]].map(([dx,dz])=>({x:item.x+dx,z:item.z+dz})).find(q=>forest.canMove(q.x,q.z));if(clear){jump.reset(heightAt(clear.x,clear.z));p.set(clear.x,jump.feetY+bodyHeight(),clear.z);forest.night.logic.previous=null;audio.pickup();toast('Корень выдержал. Возвращайся на настил.',6);}}
}
function expeditionEvents(raw){
 const ex=forest.expedition.logic,p=forest.camera.position;
 for(const e of ex.update(raw,{active:isPlaying(),x:p.x,z:p.z,feetY:jump.feetY,moving,run,watcher:forest.enemy.visible?{x:forest.enemy.position.x,z:forest.enemy.position.z}:null,mirrorLooking:forest.expedition.mirror.looking()})){
  if(e.type==='swamp-enter'){audio.bubble();toast('Топь держит ноги. Держись настила; E у корня — выбраться.',8);}
  if(e.type==='bubble')audio.bubble();
  if(e.type==='drown-warning'){audio.hurt();toast('ТЕБЯ ТЯНЕТ ПОД ВОДУ. Шесть секунд! E — схватиться за корень.',6);}
  if(e.type==='drown'){run.hurt(100,'Топь утянула тебя. Держись настила; когда вязнешь, хватайся за корни на E.');hitFlash=.8;}
  if(e.type==='mirror'){audio.whisper();subtitle('В отражении кто-то стоит за тобой.',5);}
  if(e.type==='crows'){audio.crows((e.x-p.x)>0?.5:-.5);subtitle('Вороны сорвались с ветки. Они услышали шаги раньше тебя.',5);}
 }
 if(ex.lure&&ex.time>(audio.nextMill||0)){audio.nextMill=ex.time+1.2;audio.sawmill(Math.max(0,1-Math.hypot(p.x-MILL.x,p.z-MILL.z)/40));}
}

function soundInteract(item){
 const n=forest.soundNight.logic,p=forest.camera.position;if(hands.current||forest.exploration.logic.well){toast('Руки заняты.');return;}
 if(item.bundle){if(n.taken.has(item.id)||n.time<(n.pileReady[item.id]||0))return;const remaining=n.pickups??={};remaining[item.id]??={...item.bundle};const got=run.grant(remaining[item.id]);for(const [k,v]of Object.entries(got))remaining[item.id][k]-=v;if(Object.values(remaining[item.id]).every(v=>v===0)){if(item.renew){n.pileReady[item.id]=n.time+(run.mode==='demo'?30:90);delete remaining[item.id];}else n.taken.add(item.id);}audio.pickup();toast(Object.keys(got).length?'Предметы взяты. Q — бросить камень; бутылку можно выбрать в I.':'Нужно место в рюкзаке. I — использовать припасы.',6);}
 if(item.id==='train-door'){forest.viewmodel.gesture('open-door');n.doorOpen=!n.doorOpen;forest.soundNight.doorWall.active=!n.doorOpen;forest.staticShadowsDirty=true;n.decoys.sound(p.x,p.z,'stone');audio.creak();toast(n.doorOpen?'Боковая дверь открыта.':'Дверь закрыта. Слухач слышит через стены слабее.');}
 if(item.id==='train-end'){n.endOpen=!n.endOpen;forest.soundNight.endWall.active=!n.endOpen;forest.staticShadowsDirty=true;audio.creak();}
 if(item.id==='train-crate'){
  n.crateOpened=true;openLoot('Припасы вагона № 04',n.contents,item,{onTake(){if(!n.trainVisited){n.trainVisited=true;n.trainAlarm=6;run.loot++;n.decoys.sound(item.x,item.z,'bottle');audio.chain();subtitle('Замок звякнул. Дверь откроется через шесть секунд.',6);}}});
 }
 if(item.id==='train-notes'&&!n.notes){n.notes=true;award('WAGON_04');story.log.push('ВАГОН № 04 · Лёша спрятался здесь от того, кто не видит. Мы прозвали его Слухачом. Веки срослись, но он различает шаги, динамо и звон бутылок. Замри или присядь. Камень на Q уводит его к удару; бутылка слышна дальше. Заводная птица на N трещит двадцать восемь секунд. Не стой там, где её оставил. Переходи на другой конец вагона, пока он слушает.');subtitle('«Он слушал, как я дышу. Я зажал рот рукавом».',8);toast('Запись дежурного добавлена в J. Вагон расположен на юго-востоке (24, 52).',8);audio.whisper();}
 if(item.id==='dry-rack'){const result=n.dryWood(run);toast({drying:'Связка оставлена на сушилке. Вернись через '+(run.mode==='demo'?20:60)+' секунд.',collected:'Сухая связка возвращена в рюкзак.',waiting:'Дрова ещё сохнут: '+Math.ceil(n.rack)+' секунд.',empty:'Дров нет.',full:'Сухая связка готова, но рюкзак полон.'}[result]||'Действие недоступно.',6);audio.scrape();}
 renderHud();
}
function beginNoiseAction(kind){
 if(hands.current||forest.exploration.logic.well){toast('Руки заняты.');return;}
 const n=forest.soundNight.logic,p=forest.camera.position;if(kind==='toy'){if(!run.toys){toast('Заводная птица лежит в вагоне на юго-востоке.',6);return;}const x=p.x-Math.sin(yaw)*1.4,z=p.z-Math.cos(yaw)*1.4;if(!jump.grounded||forest.expedition.logic.wet||!forest.canMove(x,z,forest.floorAt(x,z,jump.feetY,.18))||!forest.lineOfSight(p,{x,y:jump.feetY+.3,z})){toast('Нужна свободная сухая поверхность перед тобой.');return;}if(hands.start('wind-toy',3,3,{x:p.x,z:p.z}))hands.current.item={x,z};toast('Заводишь птицу. Три секунды — затем отходи.',4);return;}
 if(kind==='auto')kind=run.stones?'stone':'bottle';const key=kind==='stone'?'stones':'bottles';if(!run[key]){toast(kind==='stone'?'Камни лежат у тропы рядом с первым костром.':'Пустые бутылки — в избе и вагоне.');return;}if(hands.start('throw-'+kind,.65,.32)){hands.current.throwKind=kind;toast(kind==='bottle'?'Бросаешь бутылку. Осколки слышны далеко.':'Бросаешь камень по направлению взгляда.',3);}
}
function finishSoundAction(name,a){const n=forest.soundNight.logic,p=forest.camera.position;if(name.startsWith('throw-')){if(n.decoys.throw(a.throwKind,run,{x:p.x,y:p.y-.1,z:p.z},yaw,pitch))audio.noise(.12,.09,800);}if(name==='wind-toy'&&a.item){const {x,z}=a.item,allowed=jump.grounded&&!forest.expedition.logic.wet&&forest.canMove(x,z,forest.floorAt(x,z,jump.feetY,.18))&&forest.lineOfSight(p,{x,y:jump.feetY+.3,z});if(n.decoys.toy(run,x,z,allowed)){audio.chain();toast('Птица трещит 28 секунд. Уходи в другую сторону.',6);}else toast('Здесь нельзя оставить птицу. Она осталась в рюкзаке.');}}
function spawnBlind(explicit=false){
 const n=forest.soundNight.logic,p=forest.camera.position;if(n.hunter.active||enemyState!=='rest'||forest.exploration.logic.statue||forest.night.logic.double||!pacing.allow(explicit))return false;
 const positions=explicit?[{x:23,z:41}]:Array.from({length:24},(_,i)=>{const a=yaw+Math.PI+(i%2?1:-1)*(.6+i*.10),r=17+(i%7);return {x:p.x+Math.sin(a)*r,z:p.z+Math.cos(a)*r};});
 const place=positions.find(q=>Math.hypot(q.x-p.x,q.z-p.z)>10&&forest.canMove(q.x,q.z,heightAt(q.x,q.z),.18,1.9)&&forest.actorSpaceFree(q.x,q.z,.75)&&!forest.protectedAt(q.x,q.z)&&!inSwamp(q.x,q.z));if(!place)return false;n.hunter.spawn(place.x,place.z);n.hunter.y=heightAt(place.x,place.z);runFacts.listenerHit=false;n.nextHunter=n.time+(run.mode==='demo'?90:210);audio.creak();subtitle('Тяжёлое дыхание. Он слушает. Замри или брось камень на Q.',7);return true;
}
function soundEvents(raw,movement){
 const n=forest.soundNight.logic,h=n.hunter,p=forest.camera.position,panAt=(x,z)=>Math.max(-.9,Math.min(.9,((x-p.x)*Math.cos(yaw)-(z-p.z)*Math.sin(yaw))/Math.max(1,Math.hypot(x-p.x,z-p.z)))),gainAt=(x,z)=>Math.max(0,1-Math.hypot(x-p.x,z-p.z)/42);
 for(const e of n.decoys.update(raw,{active:isPlaying(),floorAt:(x,z,y)=>forest.floorAt(x,z,y,.18),clear:(a,b)=>forest.lineOfSight(a,b)})){const gain=gainAt(e.x,e.z),pan=panAt(e.x,e.z);if(e.type==='impact'){audio.noise(e.kind==='bottle'?.32:.12,.3*gain,e.kind==='bottle'?4600:700,pan);if(e.kind==='bottle')audio.chain(pan);if(forest.enemy.visible&&Math.hypot(forest.enemy.position.x-e.x,forest.enemy.position.z-e.z)<e.radius){enemyState='investigate';enemyTimer=e.kind==='bottle'?14:9;exposure=0;}}if(e.type==='toy-tick'&&gain>.01){audio.tone(790,.12,.055*gain,440,pan);audio.noise(.11,.08*gain,2700,pan);if(forest.enemy.visible&&Math.hypot(forest.enemy.position.x-e.x,forest.enemy.position.z-e.z)<e.radius&&enemyState!=='retreat'){enemyState='investigate';enemyTimer=3;}}}
 for(const e of n.update(raw,{active:isPlaying(),x:p.x,z:p.z,feetY:jump.feetY,heightAt,shelter:level()==='ground'&&Math.abs(p.x)<3&&p.z>-17&&p.z<-11,quiet:enemyState==='rest'&&!h.active&&!forest.exploration.logic.statue&&!forest.night.logic.double&&pacing.allow(),storm:phaseAt(run.progress).storm,random:rng()})){
  if(e.type==='train-door'){forest.soundNight.endWall.active=false;forest.staticShadowsDirty=true;audio.doorSlam();subtitle('Дверь на другом конце вагона открылась. Ты её не трогал.',7);n.decoys.sound(23,43.5,'bottle');if(!spawnBlind(true))n.nextHunter=Math.min(n.nextHunter,n.time+8);}
  if(e.type==='tree-warning'){audio.creak(panAt(e.x,e.z));toast('СТВОЛ ТРЕЩИТ И НАКЛОНЯЕТСЯ. Четыре секунды — отойди в сторону!',5);subtitle('Старое дерево сдаёт под ветром.',4);}
  if(e.type==='tree-fall')audio.noise(1.3,.25,550,panAt(e.x,e.z));if(e.type==='tree-land'){forest.staticShadowsDirty=true;audio.thunder(panAt(e.tree.x,e.tree.z));n.decoys.sound(e.tree.x+e.tree.dx*.5,e.tree.z+e.tree.dz*.5,'bottle');}
  if(e.type==='tree-hit'){run.hurt(e.damage,'Дерево придавило тебя. При треске отходи поперёк наклона, затем перепрыгивай лежащий ствол.',true);hitFlash=.6;audio.hurt();toast('Ветка рассекла руку. H — перевязка.',5);}
  if(e.type==='wood-dry')toast('Связка на сушилке высохла. E — забрать в избе.',6);
  if(e.type==='shelter'){if(e.kind==='shadow'){audio.echoSteps(.5);subtitle('Под дверью прошла тень. Шаги остановились.',6);}if(e.kind==='chimney'){audio.noise(1.4,.14,700,0,0,{x:0,y:3.5,z:-14});audio.tone(68,1.3,.03,43);subtitle('Из дымохода слышно дыхание.',6);}if(e.kind==='wardrobe'){audio.creak(-.6);audio.noise(.5,.2,500,-.6);subtitle('Закрытый шкаф выплюнул рюкзак. Такой же, как твой.',7);}}
 }
 if(!h.active&&n.time>=n.nextHunter&&level()==='ground'){if(!spawnBlind())n.nextHunter=n.time+8;}
 const noise=footNoise({moving:moving&&jump.grounded,sprinting:movement.sprinting,crouched,charging,stamina:run.stamina,load:run.load,surface:surfaceAt(p.x,p.z,jump.feetY)}),noises=n.decoys.sounds.filter(s=>n.decoys.time<s.audibleUntil),lure=forest.expedition.logic.lure||forest.chapel.logic.lure;
 if(noise)noises.push({id:'player',x:p.x,z:p.z,...noise});if(lure)noises.push({id:'machine',...lure,radius:65,power:2.4});if(hands.current&&['crowbar','barricade','unbarrier'].includes(hands.current.name))noises.push({id:'tools',x:p.x,z:p.z,radius:22,power:1});
 for(const e of h.update(raw,{active:isPlaying(),noises,player:p,safe:forest.protectedAt(h.x,h.z)||forest.protectedAt(p.x,p.z)&&Math.hypot(h.x-p.x,h.z-p.z)<8,canWalk:(x,z)=>{const floor=forest.floorAt(x,z,h.y,.18);return Math.abs(floor-h.y)<=.21&&forest.canMove(x,z,h.y,.18,1.9)&&!forest.protectedAt(x,z);},canHear:q=>forest.lineOfSight({x:h.x,y:h.y+1.5,z:h.z},{x:q.x,y:forest.floorAt(q.x,q.z,jump.feetY,.18)+.7,z:q.z}),canStrike:Math.abs(jump.feetY-h.y)<1&&forest.lineOfSight({x:h.x,y:h.y+1.6,z:h.z},p)})){
  if(e.type==='hunter-heard'){audio.creak(panAt(e.x,e.z));if(e.id==='player')subtitle('Он повернулся на твой шум. Замри. Q — отвлечь в сторону.',5);}
  if(e.type==='hunter-breath'){const g=gainAt(e.x,e.z);if(g>.05){audio.noise(.75,.13*g,650,0,0,{x:e.x,y:h.y+1.5,z:e.z});audio.tone(51,.7,.025*g,35,panAt(e.x,e.z));}}
  if(e.type==='hunter-hit'){runFacts.listenerHit=true;run.hurt(e.damage,'Слухач нашёл источник шума. Присядь, перестань заряжать фонарь и брось отвлекающий предмет в другую сторону.',true);hitFlash=.65;audio.hurt();toast('Слухач рядом. Q — отвлечь, G — отступить к огню.',5);}
  if(e.type==='hunter-gone'){pacing.recover();if(isPlaying()&&!runFacts.listenerHit)award('HOLD_BREATH');}
 }
}

function creatureSounds(){
 const player=forest.camera.position,stone=forest.exploration.logic.statue;
 const actors=[['watcher',forest.enemy.visible?forest.enemy.position:null],['listener',forest.soundNight.logic.hunter.active?forest.soundNight.hunter.position:null],['double',forest.night.logic.double],['stone',stone]];
 for(const [kind,position]of actors){if(!position){creatureCadence.previous.delete(kind);continue;}const profile=CREATURE_SOUND_PROFILES[kind],d=Math.hypot(player.x-position.x,player.z-position.z),point={x:position.x,y:Number.isFinite(position.y)?position.y+1:heightAt(position.x,position.z)+1,z:position.z},clear=forest.lineOfSight(player,point);if(creatureCadence.update(kind,position,simTime,{heard:d<profile.range}))audio.creature(kind,point,clear?1:.23);}
}

// ── PC edition: settings, controller, achievements, desktop shell, live menu ──
function applySettings(){
 // Touch devices start on the light preset unless the player chose otherwise.
 const quality=settings.has('quality')||platform.xbox?settings.get('quality'):coarse?'low':'high';
 forest.setQuality(quality);forest.setResolution(settings.get('resolution'));forest.renderer.toneMappingExposure=settings.get('brightness')/100;
 forest.setFov(settings.get('fov'));forest.cinematic=settings.get('cinematic');forest.setParticles(settings.get('particles'));
 audio.setVolume(settings.get('volume')/100);sensitivity=settings.get('sensitivity')/37500;headBob=settings.get('bobbing');invertY=settings.get('invertY');padRate=settings.get('padSensitivity')/100;
 for(const id of ['volume','sensitivity','brightness','fov','padSensitivity'])$(id).value=settings.get(id);
 $('quality').value=quality;$('resolution').value=settings.get('resolution');
 for(const id of ['bobbing','invertY','cinematic','particles','liveMenu','vibration'])$(id).checked=settings.get(id);
 $('fovValue').textContent=settings.get('fov')+'°';$('padSensitivityValue').textContent=settings.get('padSensitivity')+'%';
}
// While paused the world is still; one redraw shows a new brightness, field of view or look.
function previewFrame(){if(forest&&ready&&run?.status==='paused'&&lastSceneState&&!document.hidden)forest.update(0,lastSceneState);}

function renderAchievements(){
 const language=getLanguage(),list=$('achievementList');if(!list)return;
 list.replaceChildren(...ACHIEVEMENTS.map(a=>{const t=achievementText(a,language),li=document.createElement('li'),icon=document.createElement('i'),name=document.createElement('strong'),text=document.createElement('span');li.classList.toggle('done',achievements.has(a.id));icon.textContent=achievements.has(a.id)?'✦':'✧';icon.setAttribute('aria-hidden','true');name.textContent=t.name;text.textContent=t.text;li.append(icon,name,text);return li;}));
 const n=achievements.count,total=ACHIEVEMENTS.length;$('achievementCount').textContent=n+' / '+total;
 // Only the Steam edition mentions Steam; the web and Microsoft Store versions keep achievements on the device.
 $('achievementsSummary').textContent=language==='en'?'Unlocked '+n+' of '+total+'.'+(platform.steam?' They also appear in your Steam profile.':''):'Открыто '+n+' из '+total+'.'+(platform.steam?' Они появляются и в вашем профиле Steam.':'');
}
function fillAchievementToast(a){
 const t=achievementText(a,getLanguage()),box=$('achievementToast');
 box.querySelector('small').textContent=getLanguage()==='en'?'ACHIEVEMENT':'ДОСТИЖЕНИЕ';box.querySelector('strong').textContent=t.name;box.querySelector('span').textContent=t.text;
}
function announceAchievement(a){
 if(!a)return;announceAchievement.current=a;fillAchievementToast(a);const box=$('achievementToast');
 box.hidden=false;box.classList.remove('show');void box.offsetWidth;box.classList.add('show');
 clearTimeout(announceAchievement.timer);announceAchievement.timer=setTimeout(()=>{box.classList.remove('show');setTimeout(()=>{if(!box.classList.contains('show'))box.hidden=true;},600);},5200);
 renderAchievements();
}

const PAD_HINT_TV='ЛЕВЫЙ СТИК — идти · ПРАВЫЙ — осмотр · RT — бег · A — прыжок · B — присесть · X — взять · ⧉ — рюкзак · ☰ — пауза';
const PAD_HINT='ЛЕВЫЙ СТИК — идти   ПРАВЫЙ СТИК — осмотреться   RT — бежать   A — прыжок   B — присесть   X — взять   Y — фонарь   LT — динамо   LB — бросить   RB — фальшфейер   ↑ — аптечка   ← — еда   → — вода   ↓ — чужой фонарь   L3 — записи   R3 — снимок   ⧉ — рюкзак   ☰ — пауза';
function connectedPad(){const pads=[...(navigator.getGamepads?.()||[])].filter(p=>p&&p.connected);return pads.find(p=>p.mapping==='standard')||pads[0]||null;}
function rumble(strong,weak,duration){
 if(!settings.get('vibration'))return;const actuator=connectedPad()?.vibrationActuator;if(!actuator?.playEffect)return;
 try{Promise.resolve(actuator.playEffect('dual-rumble',{duration,strongMagnitude:strong,weakMagnitude:weak})).catch(()=>{});}catch{}
}
function setInputMode(pad){
 // The console edition is played with a controller only.
 if(platform.xbox)pad=true;
 if(usingPad===pad)return;usingPad=pad;document.body.classList.toggle('gamepad',pad);
 for(const node of document.querySelectorAll('[data-key]'))node.textContent=pad?(PAD_GLYPHS[node.dataset.key]||node.dataset.label):node.dataset.label;
 $('controlsHint').textContent=pad?(platform.xbox?PAD_HINT_TV:PAD_HINT):keyboardHint;
 if(pad&&document.pointerLockElement)document.exitPointerLock();
}
// The topmost thing a controller is talking to: a dialog, a panel, a screen, or the night itself (null).
function uiLayer(){
 for(const id of ['creditsDialog','settings','help','achievementsDialog'])if($(id)?.open)return $(id);
 for(const id of ['containerPanel','packPanel','photoPanel','journalPanel'])if(!$(id).hidden)return $(id);
 for(const id of ['ending','pause','menu'])if(!$(id).hidden)return $(id);
 return null;
}
function focusable(layer){return [...layer.querySelectorAll('button,select,input,[tabindex="0"]')].filter(e=>!e.disabled&&!e.closest('[hidden]')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');}
function adjustControl(control,direction){
 if(control.tagName==='SELECT'){const count=control.options.length;control.selectedIndex=(control.selectedIndex+direction+count)%count;control.dispatchEvent(new Event('change',{bubbles:true}));return;}
 const min=Number(control.min||0),max=Number(control.max||100),step=Math.max(Number(control.step)||1,(max-min)/20);
 control.value=String(Math.min(max,Math.max(min,Number(control.value)+direction*step)));control.dispatchEvent(new Event('input',{bubbles:true}));
}
function moveFocus(layer,dx,dy){
 const items=focusable(layer),current=items.indexOf(document.activeElement);
 // The first press only shows where the focus is.
 if(current<0){const first=items.find(e=>e.classList.contains('primary'))||items[0];first?.focus();return;}
 const control=items[current];if(dx&&!dy&&(control.matches('input[type=range]')||control.tagName==='SELECT')){adjustControl(control,dx);return;}
 // A radio button or a checkbox is as wide as its caption, which is what the player sees.
 const next=nextFocus(items.map(e=>(e.matches('input[type=radio],input[type=checkbox]')&&e.closest('label')||e).getBoundingClientRect()),current,dx,dy);if(next>=0){items[next].focus();items[next].scrollIntoView({block:'nearest',inline:'nearest'});}
}
function pressFocused(layer){
 const control=document.activeElement;if(!control||!layer.contains(control)||control===layer){moveFocus(layer,0,0);return;}
 if(control.matches('input[type=checkbox]')){control.checked=!control.checked;control.dispatchEvent(new Event('change',{bubbles:true}));return;}
 if(control.matches('input[type=radio]')){control.checked=true;control.dispatchEvent(new Event('change',{bubbles:true}));return;}
 if(control.tagName==='SELECT'){adjustControl(control,1);return;}
 if(control.matches('input[type=range]'))return;
 control.click();
}
function padBack(layer){
 if(['creditsDialog','settings','help','achievementsDialog'].includes(layer.id)){layer.close();return;}
 if(['containerPanel','packPanel','photoPanel','journalPanel'].includes(layer.id)){closePanels(isPlaying());return;}
 if(layer.id==='pause')resume();
}
// Long texts (rules, credits, achievements) scroll with up and down; at either end the focus moves on.
const TEXT_LAYERS=['help','creditsDialog','achievementsDialog'];
function scrollText(layer,step){
 if(!TEXT_LAYERS.includes(layer.id)||step.dx||!step.dy)return false;
 const before=layer.scrollTop;layer.scrollTop+=step.dy*Math.max(60,Math.round(layer.clientHeight*.4));return layer.scrollTop!==before;
}
function pollPad(now){
 const state=gamepad.read(connectedPad(),now);
 padMove.x=padMove.y=padLook.x=padLook.y=0;padHeld.sprint=padHeld.dynamo=false;
 if(!state.connected)return;
 if(state.active)setInputMode(true);
 if(!usingPad)return;
 const layer=uiLayer();
 if(layer){
  if(state.navigate&&!scrollText(layer,state.navigate))moveFocus(layer,state.navigate.dx,state.navigate.dy);
  if(TEXT_LAYERS.includes(layer.id)&&Math.abs(state.look.y)>.05)layer.scrollTop+=state.look.y*26;
  if(state.pressed.has('A'))pressFocused(layer);
  if(state.pressed.has('B'))padBack(layer);
  if(state.pressed.has('START')){if(layer.id==='menu')start();else if(layer.id==='pause')resume();}
  if(state.pressed.has('BACK')&&layer.id==='packPanel'&&isPlaying())closePanels(true);
  if(state.pressed.has('L3')&&layer.id==='journalPanel')action('journal');
  return;
 }
 if(!isPlaying())return;
 padMove.x=state.move.x;padMove.y=state.move.y;padLook.x=state.look.x;padLook.y=state.look.y;padHeld.sprint=state.sprint;padHeld.dynamo=state.dynamo;
 for(const name of state.pressed){const act=PAD_ACTIONS[name];if(!act)continue;if(act==='pause')pause();else action(act);if(!isPlaying())break;}
}

// The main menu can show the real clearing at the outpost instead of a picture.
let menuClock=0,menuLast=0;
function menuIsLive(){return !!forest&&ready&&!run&&!$('menu').hidden&&settings.get('liveMenu')&&!coarse;}
function updateMenuMode(){$('menu').classList.toggle('live',menuIsLive());}
function menuScene(now){
 const dt=Math.min(.05,Math.max(0,(now-(menuLast||now))/1000));menuLast=now;menuClock+=dt;
 // A slow drift beside the first fire, with the cabin and the cemetery in view; the night clock is not running.
 const a=menuClock*.021,x=1.9+Math.sin(a)*.9,z=5.4+Math.cos(a*.7)*.55,feet=heightAt(x,z),c=forest.camera;
 const turn=.42+Math.sin(menuClock*.043)*.07,tilt=-.04+Math.sin(menuClock*.061)*.012;
 c.position.set(x,feet+1.66,z);c.rotation.set(tilt,turn,0);
 forest.update(dt,{danger:0,health:100,warmth:100,stamina:100,progress:.02,flash:false,battery:100,active:false,feetY:feet,yaw:turn,crouched:false,moving:false,grounded:true,sprinting:false,gaitPhase:0,bobbing:false,storm:.12,bob:0,charging:false,cursed:false,chasing:false,horrorLight:1,lightning:0,lightningPhase:'dark',wetness:0,hand:null});
}
// Turning the live menu on or off, or finishing the graphics preparation, changes what the menu shows.
setInterval(()=>{if(!document.hidden)updateMenuMode();},500);

// Desktop (Steam) build: quit buttons, real fullscreen, Steam language and achievements.
$('quitGame').onclick=()=>platform.quit();$('pauseQuit').onclick=()=>platform.quit();
function pcEdition(version,label='ВЕРСИЯ ДЛЯ ПК '){const edition=$('edition');edition.textContent=label;const b=document.createElement('b');b.textContent=version||'1.0';edition.append(b);}
platform.init().then(()=>{
 // The installed web app (Microsoft Store) on a computer is the PC edition too, not a browser tab.
 if(!platform.desktop&&matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)').matches&&matchMedia('(pointer: fine)').matches)pcEdition('1.0');
 if(platform.xbox){
  pcEdition(platform.version.split('.').slice(0,2).join('.'),'ВЕРСИЯ ДЛЯ XBOX ');
  if(!settings.has('language')&&platform.language)setLanguage(platform.language);
 }
 if(!platform.desktop)return;
 document.body.classList.add('desktop');$('quitGame').hidden=$('pauseQuit').hidden=$('displayModeRow').hidden=false;
 pcEdition(platform.version.split('.').slice(0,2).join('.'));
 // First launch follows the Steam language; afterwards the player's own choice is kept.
 if(!settings.has('language')&&platform.language)setLanguage(platform.language);
 platform.setLanguage(getLanguage());
 for(const id of achievements.unlocked())platform.unlock(id);
 renderAchievements();
 platform.setFullscreen('query').then(v=>{$('displayMode').value=v?'fullscreen':'window';});
});
renderAchievements();

// ── Xbox console edition ──
if(platform.xbox){
 setInputMode(true);
 // The guide, another app or a suspended game pauses the night; it never resumes by itself.
 platform.onHost('deactivate',()=>pause());
 platform.onHost('suspend',()=>{pause();audio.setActive(false);});
 // Credits and licenses inside the game: the console cannot open the web page.
 $('creditsOpen').onclick=async()=>{
  const dialog=$('creditsDialog'),box=$('creditsText');
  if(!box.childElementCount){try{const response=await fetch('credits.html');if(!response.ok)throw new Error(response.status);
   // The WebView2 SDK licence is copied into the package by the console build (absent on the website).
   let licence='';try{const file=await fetch('licenses/webview2-sdk.txt');if(file.ok)licence=await file.text();}catch{}
   box.replaceChildren(...creditsNodes(document,await response.text()),...xboxCreditsNodes(document,licence));}catch{box.textContent='Список авторов не загрузился.';}}
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('creditsClose').focus();
 };
}
