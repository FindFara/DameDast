import { closeIcon } from "./ui-icons.js";
import { t, getLanguage } from "./i18n.js";
import { escapeHtml as esc } from "./finance.js";

export const normalizeOptionText = value => String(value).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/ي/g,"ی").replace(/ك/g,"ک").toLocaleLowerCase().trim();
export function filterOptions(options, query) {
  const term=normalizeOptionText(query);
  return options.filter(option=>!option.hidden && normalizeOptionText(option.text).includes(term));
}
export function installSelectSheet() {
  const triggers=new WeakMap();
  let active=null, returnButton=null;
  const dialog=document.createElement("dialog");
  dialog.id="selection-sheet";
  dialog.className="selection-sheet";
  dialog.setAttribute("aria-labelledby","selection-sheet-title");
  dialog.innerHTML=`<header><h2 id="selection-sheet-title"></h2><button type="button" class="icon-button" data-selection-close aria-label="${t("Close")}">${closeIcon}</button></header><label class="selection-search"><span class="sr-only">${t("Search options")}</span><input type="search" autocomplete="off" placeholder="${t("Search options")}" aria-label="${t("Search options")}"></label><p class="selection-error" role="alert" hidden></p><div class="selection-options" role="listbox"></div>`;
  document.body.append(dialog);
  const search=dialog.querySelector("input"), list=dialog.querySelector("[role=listbox]");
  const labelFor=select=>select.getAttribute("aria-label") || (select.labels?.[0] ? [...select.labels[0].childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join("").trim() : "") || select.closest("fieldset")?.querySelector("legend")?.textContent || t("Choose an option");
  function close(restore=true) {
    if(dialog.open)dialog.close();
    const button=returnButton;
    active=null;returnButton=null;
    if(restore&&button?.isConnected)button.focus({preventScroll:true});
  }
  function renderOptions() {
    if(!active)return;
    const options=filterOptions([...active.options].map((option,index)=>({index,value:option.value,text:option.textContent || "—",hidden:option.hidden,disabled:option.disabled || option.parentElement?.disabled,selected:option.selected})),search.value);
    list.innerHTML=options.map(option=>`<button type="button" role="option" aria-selected="${option.selected}" data-option-index="${option.index}" ${option.disabled?'disabled':''}><span>${esc(option.text)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>`).join("") || `<p class="selection-empty">${t("No matching options")}</p>`;
  }
  function positionCompact() {
    const anchor = returnButton.getBoundingClientRect(), popup = dialog.getBoundingClientRect();
    const left = getLanguage() === "fa" ? anchor.right - popup.width : anchor.left;
    const top = anchor.bottom + 8 + popup.height <= innerHeight - 12 ? anchor.bottom + 8 : anchor.top - popup.height - 8;
    dialog.style.left = `${Math.max(12, Math.min(innerWidth - popup.width - 12, left))}px`;
    dialog.style.top = `${Math.max(12, Math.min(innerHeight - popup.height - 12, top))}px`;
  }
  function open(select,error="") {
    if(select.disabled)return;
    active=select;returnButton=triggers.get(select);
    const compact = select.hasAttribute("data-select-compact");
    dialog.classList.toggle("is-compact", compact);
    dialog.style.removeProperty("left");dialog.style.removeProperty("top");
    dialog.dir=getLanguage()==="fa"?"rtl":"ltr";
    dialog.querySelector("h2").textContent=labelFor(select);
    list.setAttribute("aria-label",labelFor(select));
    const notice=dialog.querySelector(".selection-error");notice.textContent=error;notice.hidden=!error;
    search.value="";
    dialog.querySelector(".selection-search").hidden=compact || select.options.length<8;
    search.placeholder=t("Search options");search.setAttribute("aria-label",t("Search options"));
    dialog.querySelector("[data-selection-close]").setAttribute("aria-label",t("Close"));
    renderOptions();
    if(!dialog.open)dialog.showModal();
    if(compact)positionCompact();
    if(!compact && select.options.length>=8)search.focus();
    else (list.querySelector('[aria-selected="true"]:not(:disabled)') || list.querySelector("button:not(:disabled)"))?.focus();
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});
  }
  function update(select) {
    let button=triggers.get(select);
    if(!button || !button.isConnected) {
      button=select.parentElement.querySelector('[data-select-trigger]');
      if(!button) {
        button=document.createElement("button");button.type="button";button.className="unified-select-trigger";
        button.innerHTML='<span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
        select.after(button);
      }
      button.setAttribute("aria-haspopup","dialog");
      triggers.set(select,button);
      button.addEventListener("click",()=>open(select));
      select.classList.add("unified-native-select");select.tabIndex=-1;select.setAttribute("aria-hidden","true");
      select.addEventListener("invalid",event=>{event.preventDefault();open(select,select.validationMessage || t("Choose an option"));});
    }
    const text=select.selectedOptions[0]?.textContent || t("Choose an option");
    if(!button.hasAttribute('data-select-trigger') && button.firstElementChild.textContent!==text)button.firstElementChild.textContent=text;
    const label=labelFor(select)+": "+text;
    if(button.getAttribute("aria-label")!==label)button.setAttribute("aria-label",label);
    if(button.disabled!==select.disabled)button.disabled=select.disabled;
    button.hidden=select.hidden;
    if(select.required)button.setAttribute("aria-required","true");else button.removeAttribute("aria-required");
  }
  function refresh() {
    if(active&&!active.isConnected)close(false);
    for(const select of document.querySelectorAll("select:not([multiple]):not([data-native-select])")) {
      if(!select.closest(".excalidraw"))update(select);
    }
  }
  dialog.addEventListener("click",event=>{
    if(event.target === dialog && dialog.classList.contains("is-compact")) {
      const bounds = dialog.getBoundingClientRect();
      if(event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {close();return;}
    }
    if(event.target.closest("[data-selection-close]")){close();return;}
    const option=event.target.closest("[data-option-index]");
    if(!option||!active)return;
    const select=active,trigger=returnButton,index=Number(option.dataset.optionIndex);
    close(false);select.selectedIndex=index;
    select.dispatchEvent(new Event("input",{bubbles:true}));
    select.dispatchEvent(new Event("change",{bubbles:true}));
    if(select.isConnected)update(select);
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
  });
  dialog.addEventListener("cancel",event=>{event.preventDefault();close();});
  dialog.addEventListener("keydown",event=>{
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    if(event.target===search && !["ArrowDown","ArrowUp"].includes(event.key))return;
    const options=[...list.querySelectorAll("button:not(:disabled)")];if(!options.length)return;
    event.preventDefault();const index=options.indexOf(document.activeElement);
    const next=event.key==="Home"?0:event.key==="End"?options.length-1:index<0?(event.key==="ArrowDown"?0:options.length-1):(index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;
    options[next].focus();
  });
  search.addEventListener("input",renderOptions);
  document.addEventListener("change",event=>{if(event.target.matches("select")&&triggers.has(event.target))update(event.target);});
  document.addEventListener("click",event=>{if(event.target.matches("select")&&triggers.has(event.target)){event.preventDefault();open(event.target);}},true);
  document.addEventListener("focusin",event=>{if(event.target.matches("select")&&triggers.has(event.target))triggers.get(event.target).focus();});
  const observer=new MutationObserver(refresh);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","selected","hidden"]});
  refresh();
}
if(typeof document!=="undefined")installSelectSheet();
