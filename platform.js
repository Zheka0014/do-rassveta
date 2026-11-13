// The game runs in a browser, inside the desktop (Steam) shell and inside the Xbox console shell.
// The Steam shell's preload script exposes window.desktop. The Xbox shell (a UWP app with WebView2)
// injects window.xboxHost before any page script runs. In a plain browser every call is a no-op.
const bridge=typeof window==='object'&&window.desktop&&typeof window.desktop.info==='function'?window.desktop:null;
const xboxHost=typeof window==='object'&&window.xboxHost&&typeof window.xboxHost.on==='function'?window.xboxHost:null;
const consoleInfo=xboxHost&&xboxHost.info&&typeof xboxHost.info==='object'?xboxHost.info:{};
const safe=async(call,fallback)=>{if(!bridge)return fallback;try{return await call();}catch{return fallback;}};

// Starting graphics for each console model; the player can still change the preset in the settings.
// Xbox One and One S have a slow processor and graphics: the performance preset at 720p and a still menu.
export function consoleGraphics(device){
 const d=String(device||'').toLowerCase();
 if(d.includes('series x'))return {quality:'high',resolution:'fhd',liveMenu:true,particles:true};
 if(d.includes('series s'))return {quality:'high',resolution:'hd',liveMenu:true,particles:true};
 if(d.includes('one x'))return {quality:'low',resolution:'fhd',liveMenu:false,particles:true};
 return {quality:'low',resolution:'hd',liveMenu:false,particles:false};
}

export const platform={
 desktop:!!bridge,xbox:!!xboxHost,steam:false,deck:false,
 language:consoleInfo.language==='en'||consoleInfo.language==='ru'?consoleInfo.language:'',version:String(consoleInfo.version||''),device:String(consoleInfo.device||''),
 // Resolves once the shell has answered (immediately in a browser and on the console).
 async init(){
  if(xboxHost)return this;
  const info=await safe(()=>bridge.info(),null);
  if(info){this.steam=!!info.steam;this.deck=!!info.deck;this.language=info.language==='en'||info.language==='ru'?info.language:'';this.version=String(info.version||'');}
  return this;
 },
 // Console shell events: 'suspend' (the console put the game aside), 'deactivate' (the guide or
 // another app is in front), 'resume' and 'activate'. Nothing happens outside the console.
 onHost(type,callback){if(xboxHost)xboxHost.on(type,callback);},
 graphics(){return consoleGraphics(this.device);},
 quit(){return safe(()=>bridge.quit(),false);},
 // true / false / 'toggle' / 'query'
 setFullscreen(value){return safe(()=>bridge.setFullscreen(value),false);},
 setRunActive(active){return safe(()=>bridge.setRunActive(!!active),false);},
 setLanguage(language){return safe(()=>bridge.setLanguage(language),false);},
 unlock(id){return safe(()=>bridge.unlock(id),false);}
};
