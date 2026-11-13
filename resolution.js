export function renderScale(mode,width,height,dpr=1,quality='high'){
 const targets={hd:[1280,720],fhd:[1920,1080],qhd:[2560,1440],uhd:[3840,2160]},target=targets[mode];
 if(target)return Math.min(target[0]/Math.max(1,width),target[1]/Math.max(1,height));
 // Native: one rendered pixel per physical screen pixel.
 if(mode==='native')return Math.max(.5,dpr);
 return Math.min(Math.max(.5,dpr),quality==='low'?1:quality==='ultra'?2:1.35);
}
