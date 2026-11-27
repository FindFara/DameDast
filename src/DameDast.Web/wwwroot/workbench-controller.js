import { closeIcon } from "./ui-icons.js";
import { workbenchRecord, defaultWorkbench, standardWorkbench, packStandardWidgets, standardSize, resizeWorkbenchWidget, validateWorkbench, deskColors } from "./workbench.js";
import { addWidgetFields, widgetSettings } from "./workbench-ui.js";
import { t } from "./i18n.js";
import { preferences, savePreferences } from "./preferences.js";
import { prepareDeskImage, MAX_DESK_IMAGES } from "./desk-tools.js";
import { toolOptionFields, optionsFromForm } from "./desk-tool-ui.js";

export class WorkbenchController {
  constructor(callbacks) {
    this.callbacks = callbacks; this.editing = false; this.gesture = null; this.saving = false;
    document.addEventListener("pointerdown", event => this.startPointer(event));
    document.addEventListener("pointermove", event => this.movePointer(event));
    document.addEventListener("pointerup", event => void this.finishPointer(event));
    document.addEventListener("pointercancel", () => this.cancelPointer());
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
    const handle = event.target.closest?.("[data-desk-drag]");
    if (!handle || !this.editing || !this.board?.contains(handle) || event.button !== 0 || this.isInteracting) return;
    event.preventDefault();
    this.gesture = { base:this.current(), id:handle.dataset.deskDrag, handle, pointerId:event.pointerId, targetId:null, card:handle.closest(".desk-card") };
    handle.setPointerCapture(event.pointerId); this.gesture.card.classList.add("desk-moving");
  }
  movePointer(event) {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.card.isConnected) { this.cancelPointer(); return; }
    event.preventDefault();
    const target = document.elementsFromPoint(event.clientX,event.clientY).map(element=>element.closest?.(".desk-card")).find(card=>card && card!==gesture.card && this.board.contains(card));
    this.board.querySelectorAll(".desk-drop-target").forEach(card=>card.classList.remove("desk-drop-target"));
    gesture.targetId = target?.dataset.deskId || null; target?.classList.add("desk-drop-target");
  }
  releasePointer() {
    const gesture = this.gesture; this.gesture = null;
    if (!gesture) return null;
    if (gesture.handle.hasPointerCapture(gesture.pointerId)) gesture.handle.releasePointerCapture(gesture.pointerId);
    gesture.card.classList.remove("desk-moving"); this.board?.querySelectorAll(".desk-drop-target").forEach(card=>card.classList.remove("desk-drop-target"));
    return gesture;
  }
  async reorder(base, id, targetId) {
    const widgets = [...base.layout.widgets], from = widgets.findIndex(widget=>widget.id===id), to = widgets.findIndex(widget=>widget.id===targetId);
    if (from<0 || to<0 || from===to) return;
    const [widget] = widgets.splice(from,1); widgets.splice(to,0,widget);
    await this.save(standardWorkbench({...base.layout,widgets}),base);
    this.board?.querySelector(`[data-desk-drag="${id}"]`)?.focus({preventScroll:true});
  }
  async finishPointer(event) {
    if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
    const gesture=this.releasePointer();
    if (!gesture.targetId) return;
    try { await this.reorder(gesture.base,gesture.id,gesture.targetId); } catch(error) { this.callbacks.error(error); }
  }
  cancelPointer() { if(this.gesture){this.releasePointer();this.callbacks.refresh();} }
  async keyDown(event) {
    if(event.key==="Escape"&&this.gesture){event.preventDefault();this.cancelPointer();return;}
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
    const setColor=color=>{
      if(!deskColors.includes(color))return;
      form.elements.background.value=color;
      form.querySelectorAll("[data-desk-swatch]").forEach(button=>{
        const selected=button.dataset.deskSwatch===color;button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",String(selected));
      });
    };
    form.querySelectorAll("[data-desk-swatch]").forEach(button=>button.onclick=()=>setColor(button.dataset.deskSwatch));
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
        }else next.widgets=next.widgets.map(previous=>previous.id===id?{...previous,referenceId:values.referenceId||null,background:values.background.trim()||null,devices:Object.fromEntries(["phone","tablet","desktop"].map(device=>[device,!!values[`device-${device}`]])),options:optionsFromForm(previous.type,values,previous.options||{},imageData)}:previous);
        // New components use defaults; only the edit dialog submits dimensions.
        next.widgets=packStandardWidgets(next.widgets);next.rows=Math.max(12,...next.widgets.map(widget=>widget.y+widget.height));
        if(mode==="configure"&&!remove)next=resizeWorkbenchWidget(next,id,Number(values.width),Number(values.height));
        form.querySelectorAll("button").forEach(button=>button.disabled=true);await this.save(standardWorkbench(next),base);dialog.close();
      }catch(failure){error.textContent=t(failure.message);form.querySelectorAll("button").forEach(button=>button.disabled=false);}
    };
    form.onsubmit=event=>{event.preventDefault();void submit(false);};const remove=form.querySelector("[data-desk-remove]");if(remove)remove.onclick=()=>void submit(true);
    dialog.showModal();
  }
}
