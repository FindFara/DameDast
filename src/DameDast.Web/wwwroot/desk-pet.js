import { drawVoxelPet } from "./desk-pet-renderer.js";
import { t } from "./i18n.js";
export const petMoods = ["happy", "sad", "angry"];
export const nextPetMood = current => petMoods[(petMoods.indexOf(current) + 1) % petMoods.length];
const labels = { happy:"Happy dog. Change mood.", sad:"Sad dog. Change mood.", angry:"Angry dog. Change mood." };

export class DeskPetController {
  constructor() {
    this.states=new Map();this.items=[];this.motion=matchMedia("(prefers-reduced-motion: reduce)");
    this.motion.addEventListener("change",()=>this.schedule());
    document.addEventListener("visibilitychange",()=>this.schedule());
  }
  detach() {
    cancelAnimationFrame(this.frame);this.frame=null;this.lastTime=null;this.observer?.disconnect();this.events?.abort();this.items=[];
  }
  attach(root,scope) {
    this.detach();this.root=root;
    if(this.scope!==scope){this.states.clear();this.scope=scope;}
    if(!root)return;
    const ids=new Set();
    this.items=[...root.querySelectorAll("[data-pet-scene]")].map(element=>{
      const id=element.dataset.petScene;ids.add(id);
      if(!this.states.has(id))this.states.set(id,{mood:"happy",phase:0});
      return{id,element,button:element.querySelector("button"),canvas:element.querySelector("canvas"),style:element.dataset.petStyle,visible:false};
    });
    for(const id of this.states.keys())if(!ids.has(id))this.states.delete(id);
    this.events=new AbortController();
    root.addEventListener("click",event=>{
      const button=event.target.closest(".desk-pet-character");
      if(!button||root.classList.contains("workbench-editing"))return;
      const id=button.closest("[data-pet-scene]").dataset.petScene,state=this.states.get(id);
      state.mood=nextPetMood(state.mood);state.phase=0;this.draw();
    },{signal:this.events.signal});
    this.observer=new IntersectionObserver(entries=>{
      for(const entry of entries){const item=this.items.find(item=>item.element===entry.target);if(item)item.visible=entry.isIntersecting;}
      this.schedule();
    });
    this.items.forEach(item=>this.observer.observe(item.element));this.draw();
  }
  active() { return this.root?.isConnected&&!this.root.classList.contains("workbench-editing")&&!document.hidden&&!this.motion.matches&&this.items.some(item=>item.visible); }
  schedule() {
    cancelAnimationFrame(this.frame);this.frame=null;this.lastTime=null;
    if(this.active())this.frame=requestAnimationFrame(time=>this.tick(time));else this.draw();
  }
  tick(time) {
    this.frame=null;if(!this.active())return;
    if(this.lastTime==null)this.lastTime=time;
    const elapsed=(time-this.lastTime)/1000;
    if(elapsed>=.05){for(const item of this.items)if(item.visible){const state=this.states.get(item.id);state.phase+=Math.min(elapsed,.15)*(state.mood==="sad"?2:state.mood==="angry"?10:6);}this.lastTime=time;this.draw(true);}
    this.frame=requestAnimationFrame(next=>this.tick(next));
  }
  draw(visibleOnly=false) {
    for(const item of this.items){
      if(visibleOnly&&!item.visible)continue;
      const state=this.states.get(item.id);item.element.dataset.petMood=state.mood;item.button.setAttribute("aria-label",t(labels[state.mood]));
      drawVoxelPet(item.canvas,{style:item.style,mood:state.mood,phase:state.phase,yaw:.6,blink:state.phase%40>39});
    }
  }
}
