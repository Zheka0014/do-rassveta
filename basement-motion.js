const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const ease=t=>t*t*t*(10+t*(-15+t*6));
export const BASEMENT_BREATH_PERIOD=8.8;
// A short inhale, a longer exhale and a quiet rest. Zero velocity and
// acceleration at each join prevent a mechanical, sinusoidal rocking motion.
export function basementBreathPhase(seconds){
 if(!Number.isFinite(seconds))return 0;const t=((seconds%BASEMENT_BREATH_PERIOD)+BASEMENT_BREATH_PERIOD)%BASEMENT_BREATH_PERIOD;
 if(t<.6)return 0;if(t<3)return ease((t-.6)/2.4);if(t<8.2)return 1-ease((t-3)/5.2);return 0;
}
export function advanceBasementBreath(seconds,dt,active){return seconds+(active&&Number.isFinite(dt)&&dt>0?dt:0);}
// One continuous displacement field is shared by skin, eyes, hair and cloth.
// The lower 13 cm never move: palms, fingers, knees and feet remain planted.
export function basementBreathOffset(x,y,z,out){
 const support=smooth(.13,.31,y),chest=smooth(-.17,.15,z),head=smooth(.37,.46,z),rib=(1-head)*chest*support;
 out[0]=x*.016*rib;
 out[1]=support*chest*(.0052*(1-head)+.0034*head);
 out[2]=-support*chest*(.0006*(1-head)+.0013*head);
 return out;
}
