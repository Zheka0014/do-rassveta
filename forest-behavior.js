const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class WatcherTactics{
 constructor(){this.reset();}
 reset(){this.cover=null;this.nextChoice=0;this.side=1;this.peekSince=null;}
 target(t,{enemy,player,trees=[],state='stalk',safe=false,canWalk=()=>true,protectedAt=()=>false}){
  if(state!=='stalk'||safe){this.cover=null;this.peekSince=null;return {target:player,peek:0};}
  if(t>=this.nextChoice||this.cover&&!canWalk(this.cover.x,this.cover.z)){
   this.nextChoice=t+4;let best=null,score=Infinity;
   for(const tree of trees){
    const pd=distance(player,tree),ed=distance(enemy,tree);if(pd<8||pd>25||ed>10)continue;
    const dx=(tree.x-player.x)/pd,dz=(tree.z-player.z)/pd;
    const p={x:tree.x+dx*1.12,z:tree.z+dz*1.12};
    if(!canWalk(p.x,p.z)||protectedAt(p.x,p.z))continue;
    const rank=ed+Math.abs(pd-14)*.3;if(rank<score){score=rank;best=p;}
   }
   if(best&&(!this.cover||distance(best,this.cover)>.5)){this.side*=-1;this.peekSince=null;}
   this.cover=best;
  }
  if(!this.cover)return {target:player,peek:0};
  const near=distance(enemy,this.cover)<1.4;
  if(!near)this.peekSince=null;else if(this.peekSince===null)this.peekSince=t;
  const elapsed=this.peekSince===null?0:t-this.peekSince,blend=elapsed<1.6?0:elapsed<2.8?(elapsed-1.6)/1.2:elapsed<5.2?1:Math.max(0,1-(elapsed-5.2)/1.2),ease=blend*blend*(3-2*blend);
  return {target:this.cover,peek:near&&ease>0?ease*.11*this.side:0};
 }
}

// A visited place changes only after leaving it, outside the player's view.
// Report the change on a subsequent visit, rather than spoiling it remotely.
export class LivingForest{
 constructor(sites){this.sites=sites;this.reset();}
 reset(){this.states=this.sites.map(()=>({visited:false,stage:0,reported:0}));}
 update({active=true,progress=0,player,observed=()=>false}){
  if(!active||!player||!Number.isFinite(progress))return [];
  const stage=progress>=.60?3:progress>=.30?2:progress>=.12?1:0,events=[];
  this.sites.forEach((site,i)=>{
   const s=this.states[i],d=distance(player,site);
   if(d<8){s.visited=true;if(s.stage>s.reported){s.reported=s.stage;events.push({type:'return',id:site.id,stage:s.stage});}}
   if(s.visited&&d>12&&s.stage<stage&&!observed(site)){s.stage++;events.push({type:'change',id:site.id,stage:s.stage});}
  });return events;
 }
}

export const CREATURE_SOUND_PROFILES={watcher:{stride:1.4,range:32,noise:.27,frequency:240},listener:{stride:.75,range:24,noise:.16,frequency:1300},double:{stride:.95,range:22,noise:.14,frequency:560},stone:{stride:.55,range:25,noise:.20,frequency:2100}};
export class CreatureCadence{
 constructor(){this.reset();}
 reset(){this.previous=new Map();}
 update(kind,position,t,{active=true,heard=true}={}){
  if(!active||!position||!Number.isFinite(t))return false;
  const profile=CREATURE_SOUND_PROFILES[kind];if(!profile)return false;
  let s=this.previous.get(kind);if(!s){this.previous.set(kind,{x:position.x,z:position.z,traveled:0,last:t});return false;}
  const step=Math.hypot(position.x-s.x,position.z-s.z);s.x=position.x;s.z=position.z;
  if(step>2){s.traveled=0;return false;}s.traveled+=step;
  if(s.traveled<profile.stride||t-s.last<.25)return false;
  s.traveled%=profile.stride;s.last=t;return heard;
 }
}
