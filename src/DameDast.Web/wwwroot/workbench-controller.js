import { closeIcon } from "./ui-icons.js";
import { workbenchRecord, defaultWorkbench, standardWorkbench, packStandardWidgets, standardSize, resizeWorkbenchWidget, validateWorkbench, deviceWorkbench } from "./workbench.js";
import { addWidgetFields, widgetSettings } from "./workbench-ui.js";
import { t } from "./i18n.js";
import { preferences, savePreferences } from "./preferences.js";
import { prepareDeskImage, MAX_DESK_IMAGES } from "./desk-tools.js";
import { toolOptionFields, optionsFromForm } from "./desk-tool-ui.js";

export class WorkbenchController {
  constructor(callbacks) {
    this.callbacks = callbacks; this.editing = false; this.gesture = null; this.saving = false; this.suppressClickUntil = 0;
    document.addEventListener("pointerdown", event => this.startPointer(event));
    document.addEventListener("pointermove", event => this.movePointer(event));
    document.addEventListener("pointerup", event => void this.finishPointer(event));
    document.addEventListener("pointercancel", () => this.cancelPointer());
    document.addEventListener("touchmove", event => { if(this.gesture?.active)event.preventDefault(); }, {passive:false});
    document.addEventListener("contextmenu", event => { if(this.gesture?.card.contains(event.target))event.preventDefault(); });
    document.addEventListener("dragstart", event => { if(event.target.closest?.(".desk-card"))event.preventDefault(); });
    document.addEventListener("click", event => { if(Date.now()<this.suppressClickUntil && event.target.closest?.(".desk-card")){event.preventDefault();event.stopImmediatePropagation();} },true);
    window.addEventListener("blur", () => this.cancelPointer());
    document.addEventListener("keydown", event => void this.keyDown(event));
    document.addEventListener("click", event => void this.click(event).catch(callbacks.error));
  }
  get isInteracting() { return !!this.gesture || this.saving; }
  attach() {
    this.root = document.querySelector(".workbench-page"); this.board = this.root?.querySelector("#desk-board");
    this.editing = preferences().workbenchEditing;
  }
  current() {
    const context = this.callbacks.context(), record = workbenchRecord(context.records);
    return { context, record, space: context.space, layout: standardWorkbench(record?.data || defaultWorkbench()) };
  }
  async save(layout, base) {
    validateWorkbench(layout); this.saving = true;
    try { await this.callbacks.save(layout, base); }
    finally { this.saving = false; this.callbacks.refresh(); }
  }
  startPointer(event) {
    const card=event.target.closest?.(".desk-card"), edge=event.target.closest?.("[data-desk-resize]"), handle=event.target.closest?.("[data-desk-drag]");
    if(!card || !this.board?.contains(card) || event.button!==0 || this.isInteracting)return;
    if(edge && !this.editing)return;
    if(!edge && !handle && event.target.closest("input,textarea,select,[contenteditable=true],[data-desk-action]"))return;
    const touch=event.pointerType==='touch';
    const base=this.current(),widget=base.layout.widgets.find(w=>w.id===card.dataset.deskId), view=deviceWorkbench(base.layout,this.board.dataset.device), shown=view.widgets.find(w=>w.id===widget.id);
    const css=getComputedStyle(this.board),gap=parseFloat(css.columnGap), row=parseFloat(css.gridTemplateRows);
    this.gesture={base,id:widget.id,widget,shown,card,handle:edge||handle||card,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,scrollY:window.scrollY,targetId:null,edge:edge?.dataset.deskResize,columns:view.columns,cellX:(this.board.clientWidth+gap)/view.columns,cellY:row+gap,active:false,moved:false,touch};
    if(touch&&!edge&&!handle){this.gesture.timer=setTimeout(()=>this.activatePointer(),450);}
    else if(edge||handle){event.preventDefault();this.activatePointer();}
  }
  activatePointer() {
    const g=this.gesture;if(!g||!g.card.isConnected)return;
    g.active=true;g.handle.setPointerCapture(g.pointerId);g.card.classList.add(g.edge?'desk-resizing':'desk-moving','desk-selected');document.body.classList.add('desk-interacting');
    this.suppressClickUntil=Date.now()+700;
    if(!g.edge)this.autoScroll();
  }
  autoScroll() {
    const g=this.gesture;if(!g?.active||g.edge)return;
    const margin=60,delta=g.y<margin?-Math.ceil((margin-g.y)/5):g.y>innerHeight-margin?Math.ceil((g.y-innerHeight+margin)/5):0;
    if(delta){window.scrollBy(0,delta);this.updateMove(g);}
    g.frame=requestAnimationFrame(()=>this.autoScroll());
  }
  movePointer(event) {
    const g=this.gesture;if(!g||g.pointerId!==event.pointerId)return;
    if(!g.card.isConnected){this.cancelPointer();return;}
    g.x=event.clientX;g.y=event.clientY;
    if(!g.active){if(Math.hypot(g.x-g.startX,g.y-g.startY)<=8)return;if(g.touch){this.releasePointer();return;}this.activatePointer();}
    event.preventDefault();
    if(Math.hypot(g.x-g.startX,g.y-g.startY)>5)g.moved=true;
    if(g.edge){
      const dx=Math.round((g.x-g.startX)/g.cellX)*(g.edge==='left'?-1:1),dy=Math.round((g.y-g.startY)/g.cellY);
      let width=g.edge==='bottom'||dx===0?g.widget.width:Math.max(g.widget.type==='shortcut'?2:1,Math.min(g.columns,g.shown.width+dx));
      let height=['bottom','corner'].includes(g.edge)?Math.max(g.widget.type==='shortcut'?2:1,Math.min(12,g.widget.height+dy)):g.widget.height;
      if(g.widget.type==='shortcut'){const change=g.edge==='bottom'?dy:g.edge==='corner'?(Math.abs(dx)>Math.abs(dy)?dx:dy):dx;width=Math.max(2,Math.min(g.columns,12,g.shown.width+change));height=width;}
      if(width===g.widget.width&&height===g.widget.height){g.next=null;this.preview(g.base.layout);return;}
      g.next=resizeWorkbenchWidget(g.base.layout,g.id,width,height);this.preview(g.next);
    }else this.updateMove(g);
  }
  updateMove(g) {
    g.card.style.transform=`translate(${g.x-g.startX}px,${g.y-g.startY+window.scrollY-g.scrollY}px)`;
    const cards=[...this.board.querySelectorAll('.desk-card')].filter(card=>card!==g.card);
    const target=cards.map(card=>{const r=card.getBoundingClientRect();return {card,dist:Math.hypot(g.x-Math.max(r.left,Math.min(g.x,r.right)),g.y-Math.max(r.top,Math.min(g.y,r.bottom)))}}).sort((a,b)=>a.dist-b.dist)[0];
    this.board.querySelectorAll('.desk-drop-target').forEach(card=>card.classList.remove('desk-drop-target'));
    g.targetId=target?.card.dataset.deskId||null;target?.card.classList.add('desk-drop-target');
  }
  preview(layout) {
    const view=deviceWorkbench(layout,this.board.dataset.device);this.board.style.setProperty('--desk-rows',Math.max(12,view.rows));
    for(const widget of view.widgets){const card=this.board.querySelector(`[data-desk-id="${widget.id}"]`);card.style.gridColumn=`${widget.x+1}/span ${widget.width}`;card.style.gridRow=`${widget.y+1}/span ${widget.height}`;card.style.setProperty('--desk-widget-rows',widget.height);}
  }
  releasePointer() {
    const g=this.gesture;this.gesture=null;if(!g)return null;
    clearTimeout(g.timer);cancelAnimationFrame(g.frame);
    if(g.handle.hasPointerCapture(g.pointerId))g.handle.releasePointerCapture(g.pointerId);
    g.card.classList.remove('desk-moving','desk-resizing');g.card.style.removeProperty('transform');document.body.classList.remove('desk-interacting');
    this.board?.querySelectorAll('.desk-drop-target').forEach(card=>card.classList.remove('desk-drop-target'));
    if(g.active)this.suppressClickUntil=Date.now()+500;
    return g;
  }
  async reorder(base, id, targetId) {
    const widgets = [...base.layout.widgets], from = widgets.findIndex(widget=>widget.id===id), to = widgets.findIndex(widget=>widget.id===targetId);
    if (from<0 || to<0 || from===to) return;
    const [widget] = widgets.splice(from,1); widgets.splice(to,0,widget);
    await this.save(standardWorkbench({...base.layout,widgets}),base);
    this.board?.querySelector(`[data-desk-drag="${id}"]`)?.focus({preventScroll:true});
  }
  async finishPointer(event) {
    if(!this.gesture||this.gesture.pointerId!==event.pointerId)return;
    const g=this.releasePointer();if(!g.active||!g.moved)return;
    try {if(g.edge){if(g.next)await this.save(g.next,g.base);}else if(g.targetId)await this.reorder(g.base,g.id,g.targetId);}
    catch(error){this.callbacks.error(error);this.callbacks.refresh();}
  }
  cancelPointer() { if(this.gesture){const g=this.releasePointer();if(g.active)this.callbacks.refresh();} }
  async keyDown(event) {
    if(event.key==="Escape"&&this.gesture){event.preventDefault();this.cancelPointer();return;}
    const edge=event.target.closest?.('[data-desk-resize]');
    if(this.editing&&edge&&this.board?.contains(edge)&&!this.isInteracting&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();const base=this.current(),id=edge.closest('.desk-card').dataset.deskId,w=base.layout.widgets.find(w=>w.id===id);
      const dx=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,dy=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
      try{await this.save(resizeWorkbenchWidget(base.layout,id,Math.max(w.type==='shortcut'?2:1,Math.min(24,w.width+dx)),Math.max(w.type==='shortcut'?2:1,Math.min(12,w.height+dy))),base);this.board.querySelector(`[data-desk-id="${id}"] [data-desk-resize="${edge.dataset.deskResize}"]`)?.focus({preventScroll:true});}catch(error){this.callbacks.error(error);}return;
    }
    const handle=event.target.closest?.("[data-desk-drag]");
    if(!this.editing||this.isInteracting||!this.board?.contains(handle)||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
    event.preventDefault();const base=this.current(),index=base.layout.widgets.findIndex(widget=>widget.id===handle.dataset.deskDrag);
    const target=base.layout.widgets[index+(["ArrowLeft","ArrowUp"].includes(event.key)?-1:1)];
    if(target)try{await this.reorder(base,handle.dataset.deskDrag,target.id);}catch(error){this.callbacks.error(error);}
  }
  async click(event) {
    const shortcut=event.target.closest?.(".desk-widget-shortcut .desk-shortcut");
    if(shortcut&&this.editing&&!this.isInteracting){event.preventDefault();this.openDialog("configure",shortcut.closest(".desk-card").dataset.deskId);return;}
    const button=event.target.closest?.("[data-desk-action]");if(!button||this.isInteracting)return;
    const action=button.dataset.deskAction;
    if(action==="toggle-edit"||action==="done"){
      savePreferences({workbenchEditing:action==="toggle-edit"?!this.editing:false});this.callbacks.refresh();return;
    }
    if(!["add","configure"].includes(action))return;
    if(action==="add"&&!this.editing){savePreferences({workbenchEditing:true});this.callbacks.refresh();}
    if(action==="configure"&&!this.editing)return;
    this.openDialog(action,button.dataset.id);
  }
  openDialog(mode,id) {
    const base=this.current(),widget=base.layout.widgets.find(widget=>widget.id===id),dialog=document.querySelector("#workbench-dialog");
    if(mode==="configure"&&!widget)return;
    dialog.innerHTML=`<form id="desk-form"><div class="dialog-heading"><h2>${t(mode==="add"?"Add component":"Card settings")}</h2><button type="button" class="icon-button" data-desk-dialog-close aria-label="${t("Close")}">${closeIcon}</button></div><div class="desk-dialog-fields">${mode==="add"?addWidgetFields(this.callbacks.icon):widgetSettings(widget,base.context)}</div><p id="desk-form-error" role="alert"></p><div class="dialog-actions">${mode==="configure"?`<button type="button" class="text-button negative" data-desk-remove>${t("Remove card")}</button>`:""}<button type="submit" class="primary">${t(mode==="add"?"Add component":"Save")}</button><button type="button" class="secondary" data-desk-dialog-close>${t("Cancel")}</button></div></form>`;
    const form=dialog.querySelector("form");let imageData=widget?.options?.imageData||null,imagePromise=null,generation=0;
    form.addEventListener("click",event=>{
      const tab=event.target.closest("[data-component-category]");if(!tab)return;
      form.querySelectorAll("[data-component-category]").forEach(button=>button.setAttribute("aria-selected",String(button===tab)));
      form.querySelectorAll("[data-component-group]").forEach(group=>group.hidden=group.dataset.componentGroup!==tab.dataset.componentCategory);
      const first=form.querySelector(`[data-component-group="${tab.dataset.componentCategory}"] [name="widgetType"]`);first.checked=true;first.dispatchEvent(new Event("change",{bubbles:true}));
    });
    form.addEventListener("change",event=>{
      if(event.target.name==="widgetType"){generation++;imageData=null;form.querySelector("[data-widget-options]").innerHTML=toolOptionFields(event.target.value);}
      if(event.target.matches("[data-desk-image-input]")){
        const file=event.target.files[0],current=++generation;if(!file)return;
        form.querySelector('[type="submit"]').disabled=true;
        imagePromise=prepareDeskImage(file).then(data=>{if(current!==generation)return;imageData=data;let preview=form.querySelector(".desk-image-draft");if(!preview){preview=document.createElement("img");preview.className="desk-image-draft";preview.alt="";event.target.after(preview);}preview.src=data;form.querySelector("#desk-form-error").textContent="";})
          .catch(error=>{form.querySelector("#desk-form-error").textContent=t(error.message);}).finally(()=>{form.querySelector('[type="submit"]').disabled=false;});
      }
    });
    form.querySelectorAll("[data-desk-dialog-close]").forEach(button=>button.onclick=()=>dialog.close());
    const submit=async remove=>{
      const error=form.querySelector("#desk-form-error");error.textContent="";
      try{
        await imagePromise;const values=Object.fromEntries(new FormData(form));let next=structuredClone(base.layout);
        if(remove)next.widgets=next.widgets.filter(widget=>widget.id!==id);
        else if(mode==="add"){
          if(next.widgets.length>=72)throw Error("You can add up to 72 components.");
          if(values.widgetType==="image"&&next.widgets.filter(widget=>widget.type==="image").length>=MAX_DESK_IMAGES)throw Error("You can add up to 4 photos to your workbench.");
          if(values.widgetType==="image"&&!imageData)throw Error("Choose a photo in card settings.");
          next.widgets.push({id:crypto.randomUUID(),type:values.widgetType,x:0,y:0,...standardSize(values.widgetType),background:null,title:null,referenceId:null,options:optionsFromForm(values.widgetType,values,{},imageData)});
        }else next.widgets=next.widgets.map(previous=>previous.id===id?{...previous,referenceId:values.referenceId||null,background:null,devices:null,options:optionsFromForm(previous.type,values,previous.options||{},imageData)}:previous);
        // Direct edge gestures save dimensions; settings only change content.
        next.widgets=packStandardWidgets(next.widgets);next.rows=Math.max(12,...next.widgets.map(widget=>widget.y+widget.height));
        form.querySelectorAll("button").forEach(button=>button.disabled=true);await this.save(standardWorkbench(next),base);dialog.close();
      }catch(failure){error.textContent=t(failure.message);form.querySelectorAll("button").forEach(button=>button.disabled=false);}
    };
    form.onsubmit=event=>{event.preventDefault();void submit(false);};const remove=form.querySelector("[data-desk-remove]");if(remove)remove.onclick=()=>void submit(true);
    dialog.showModal();
  }
}
