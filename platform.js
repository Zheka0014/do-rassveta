// The game runs both in a browser and inside the desktop (Steam) shell. The shell's
// preload script exposes window.desktop; in a browser every call is a harmless no-op.
const bridge=typeof window==='object'&&window.desktop&&typeof window.desktop.info==='function'?window.desktop:null;
const safe=async(call,fallback)=>{if(!bridge)return fallback;try{return await call();}catch{return fallback;}};

export const platform={
 desktop:!!bridge,steam:false,deck:false,language:'',version:'',
 // Resolves once the shell has answered (immediately in a browser).
 async init(){
  const info=await safe(()=>bridge.info(),null);
  if(info){this.steam=!!info.steam;this.deck=!!info.deck;this.language=info.language==='en'||info.language==='ru'?info.language:'';this.version=String(info.version||'');}
  return this;
 },
 quit(){return safe(()=>bridge.quit(),false);},
 // true / false / 'toggle' / 'query'
 setFullscreen(value){return safe(()=>bridge.setFullscreen(value),false);},
 setRunActive(active){return safe(()=>bridge.setRunActive(!!active),false);},
 setLanguage(language){return safe(()=>bridge.setLanguage(language),false);},
 unlock(id){return safe(()=>bridge.unlock(id),false);}
};
