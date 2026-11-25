import { jalaliParts, fromJalali, daysInMonth, faMonths, enMonths, solarText } from "./calendar.js";
import { today } from "./finance.js";
import { shiftDay } from "./planner.js";
import { t, getLanguage } from "./i18n.js";

const minYear = 1378, maxYear = 1479;
const plainNumber = value => String(value).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[,٬\s]/g, "");
export function clampDateParts(parts) {
  if (![parts.year, parts.month, parts.day].every(Number.isInteger)) throw Error("Enter a valid date.");
  const year = Math.min(maxYear, Math.max(minYear, parts.year));
  const month = Math.min(12, Math.max(1, parts.month));
  return { year, month, day: Math.min(daysInMonth(year, month), Math.max(1, parts.day)) };
}
export function stepDatePart(parts, part, offset) {
  if (part === "day") {
    const next = jalaliParts(shiftDay(fromJalali(parts.year, parts.month, parts.day), offset));
    return next.year < minYear || next.year > maxYear ? { ...parts } : next;
  }
  if (part === "month") {
    const index = parts.year * 12 + parts.month - 1 + offset;
    const year = Math.floor(index / 12);
    return year < minYear || year > maxYear ? { ...parts } : clampDateParts({ ...parts, year, month: index % 12 + 1 });
  }
  return clampDateParts({ ...parts, year: parts.year + offset });
}

export function installDatePicker() {
  const dialog = document.createElement("dialog");
  dialog.id = "date-picker-dialog";
  dialog.className = "date-picker-dialog";
  dialog.setAttribute("aria-labelledby", "date-picker-title");
  document.body.append(dialog);
  let active = null, parts = null, lastWheel = 0, gesture = null, ignoreClickUntil = 0;
  const monthNames = () => getLanguage() === "fa" ? faMonths : enMonths;
  const partText = (value, part) => part === "month" ? monthNames()[value.month - 1] : new Intl.NumberFormat(getLanguage()==="fa"?"fa-IR":"en-US",{useGrouping:false}).format(value[part]);
  function wheel(part) {
    const label = t({ day: "Day", month: "Month", year: "Year" }[part]);
    return `<section class="date-wheel" data-date-wheel="${part}" aria-label="${label}"><h3>${label}</h3><div class="date-wheel-track">${[-2,-1].map(step=>`<button type="button" class="date-wheel-neighbor distance-${Math.abs(step)}" data-date-step="${step}" tabindex="-1" aria-label="${label} · ${t('Previous')}">${partText(stepDatePart(parts,part,step),part)}</button>`).join("")}<input type="text" class="date-wheel-current" data-date-part="${part}" aria-label="${label}" role="spinbutton" aria-valuemin="${part==='year'?minYear:1}" aria-valuemax="${part==='year'?maxYear:part==='month'?12:daysInMonth(parts.year,parts.month)}" aria-valuenow="${parts[part]}" value="${partText(parts,part)}" inputmode="numeric" autocomplete="off" ${matchMedia('(pointer: coarse)').matches?'readonly':''}>${[1,2].map(step=>`<button type="button" class="date-wheel-neighbor distance-${step}" data-date-step="${step}" tabindex="-1" aria-label="${label} · ${t('Next')}">${partText(stepDatePart(parts,part,step),part)}</button>`).join("")}</div><div class="date-wheel-arrows"><button type="button" data-date-step="-1" aria-label="${label} · ${t('Previous')}">−</button><button type="button" data-date-step="1" aria-label="${label} · ${t('Next')}">+</button></div></section>`;
  }
  function renderWheels() {
    dialog.querySelector(".date-wheels").innerHTML = ["day","month","year"].map(wheel).join("");
    dialog.querySelector(".date-picker-preview").textContent = solarText(fromJalali(parts.year,parts.month,parts.day));
    dialog.querySelector(".date-picker-error").textContent = "";
  }
  function close() {
    if (dialog.open) dialog.close();
    const target = active?.querySelector('[data-date-input]');
    target?.setAttribute("aria-expanded", "false");
    active = null;
    if (target?.isConnected) target.focus({preventScroll:true});
  }
  function open(root) {
    active = root;
    const value = root.querySelector('input[type=hidden]').value;
    parts = jalaliParts(value || today());
    dialog.dir = getLanguage() === "fa" ? "rtl" : "ltr";
    dialog.innerHTML = `<form><header class="dialog-heading"><h2 id="date-picker-title">${root.querySelector('legend').textContent}</h2><button type="button" class="icon-button" data-date-close aria-label="${t('Close')}">×</button></header><p class="date-picker-preview" aria-live="polite"></p><div class="date-wheels"></div><p class="date-picker-hint">${t('Scroll to choose; click a value to type.')}</p><p class="date-picker-error" role="alert"></p><footer><button type="button" class="text-button" data-date-today>${t('Today')}</button>${root.dataset.required?'':`<button type="button" class="text-button" data-date-clear>${t('Clear')}</button>`}<button type="submit" class="primary">${t('Select date')}</button></footer></form>`;
    renderWheels();
    root.querySelector('[data-date-input]').setAttribute("aria-expanded", "true");
    dialog.showModal();
  }
  function storeValue(value) {
    if (!active?.isConnected) { close(); return; }
    const root = active, hidden = root.querySelector('input[type=hidden]'), display = root.querySelector('[data-date-input]');
    hidden.value = value; display.value = value ? solarText(value) : "";
    display.setCustomValidity("");
    close();
    hidden.dispatchEvent(new Event("input", {bubbles:true}));
    hidden.dispatchEvent(new Event("change", {bubbles:true}));
  }
  function readInputs() {
    const next = {};
    for (const input of dialog.querySelectorAll('[data-date-part]')) {
      const part=input.dataset.datePart, text=plainNumber(input.value);
      let value=Number(text);
      if(part==='month' && !Number.isInteger(value)) value=monthNames().findIndex(name=>name.toLowerCase()===text.toLowerCase())+1;
      if(!text || !Number.isInteger(value) || value<(part==='year'?minYear:1) || value>(part==='year'?maxYear:part==='month'?12:31)) throw Error('Enter a valid date.');
      next[part]=value;
    }
    return clampDateParts(next);
  }
  function applyTypedPart() {
    try { parts = readInputs(); renderWheels(); return true; }
    catch { dialog.querySelector('.date-picker-error').textContent = t('Enter a valid date.'); return false; }
  }
  function step(part, offset) { if(!applyTypedPart())return; parts = stepDatePart(parts,part,offset); renderWheels(); }
  document.addEventListener("click", event => {
    const input = event.target.closest('[data-date-input]');
    if (input) open(input.closest('[data-date-control]'));
  });
  document.addEventListener("keydown", event => {
    if (event.target.matches('[data-date-input]') && ['Enter',' ','ArrowDown'].includes(event.key)) {
      event.preventDefault(); open(event.target.closest('[data-date-control]'));
    }
  });
  document.addEventListener('submit', event => {
    if (event.target === dialog.querySelector('form')) return;
    const missing = [...event.target.querySelectorAll('[data-date-control][data-required]')].find(root=>!root.querySelector('input[type=hidden]').value);
    if (missing) { event.preventDefault(); event.stopImmediatePropagation(); open(missing); }
  }, true);
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-date-close]')) { close(); return; }
    if (event.target.closest('[data-date-clear]')) { storeValue(''); return; }
    if (event.target.closest('[data-date-today]')) { parts=jalaliParts(today()); renderWheels(); return; }
    const button = event.target.closest('[data-date-step]');
    if (button && performance.now() > ignoreClickUntil) step(button.closest('[data-date-wheel]').dataset.dateWheel, Number(button.dataset.dateStep));
  });
  dialog.addEventListener('change', event => { if(event.target.matches('[data-date-part]')) applyTypedPart(event.target); });
  dialog.addEventListener('focusin', event => { if(event.target.matches('[data-date-part]') && !event.target.readOnly) event.target.select(); });
  dialog.addEventListener('keydown', event => {
    const input=event.target.closest('[data-date-part]');
    if (!input) return;
    if (['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); step(input.dataset.datePart,event.key==='ArrowUp'?1:-1); dialog.querySelector(`[data-date-part="${input.dataset.datePart}"]`).focus(); }
    if (event.key === 'Enter') { event.preventDefault(); if(applyTypedPart(input)) storeValue(fromJalali(parts.year,parts.month,parts.day)); }
  });
  dialog.addEventListener('submit', event => { event.preventDefault(); if(applyTypedPart()) storeValue(fromJalali(parts.year,parts.month,parts.day)); });
  dialog.addEventListener('wheel', event => {
    const column=event.target.closest('[data-date-wheel]'); if(!column)return;
    event.preventDefault();
    if(performance.now()-lastWheel<100 || Math.abs(event.deltaY)<2)return;
    lastWheel=performance.now();step(column.dataset.dateWheel,event.deltaY>0?1:-1);
  }, {passive:false});
  dialog.addEventListener('pointerdown', event => {
    const track=event.target.closest('.date-wheel-track');
    if(!track || (event.pointerType==='mouse' && event.target.matches('input')))return;
    gesture={y:event.clientY,part:track.closest('[data-date-wheel]').dataset.dateWheel,id:event.pointerId};
    gesture.track = track;
  });
  dialog.addEventListener('pointermove', event => {
    if(gesture && event.pointerId===gesture.id && Math.abs(gesture.y-event.clientY)>10) gesture.track.setPointerCapture(event.pointerId);
  });
  dialog.addEventListener('pointerup', event => {
    if(!gesture || event.pointerId!==gesture.id)return;
    const delta=gesture.y-event.clientY;
    if(Math.abs(delta)>18) {ignoreClickUntil=performance.now()+300;step(gesture.part,Math.sign(delta)*Math.min(6,Math.max(1,Math.round(Math.abs(delta)/40))));}
    gesture=null;
  });
  dialog.addEventListener('pointercancel',()=>{gesture=null;});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
}
if(typeof document!=="undefined") installDatePicker();
