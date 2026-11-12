// Requests are serialized: changing graphics during loading never starts two
// WebGL warmups at once or enables Start after an obsolete request finishes.
export class GraphicsPreparation{
 constructor(prepare,onState=()=>{}){this.prepare=prepare;this.onState=onState;this.revision=0;this.queue=Promise.resolve();this.ready=false;}
 request(){
  const revision=++this.revision;this.ready=false;this.onState(false);
  const job=this.queue.catch(()=>{}).then(async()=>{if(revision!==this.revision)return;await this.prepare();if(revision===this.revision){this.ready=true;this.onState(true);}});
  this.queue=job;return job;
 }
}
