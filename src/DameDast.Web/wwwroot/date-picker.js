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
  const wheelAnimations = new WeakMap();
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function wheel(part) {
    const label = t({ day: "Day", month: "Month", year: "Year" }[part]);
    return `<section class="date-wheel" data-date-wheel="${part}" aria-label="${label}"><h3>${label}</h3><div class="date-wheel-track">${[-1].map(step=>`<button type="button" class="date-wheel-neighbor distance-${Math.abs(step)}" data-date-step="${step}" tabindex="-1" aria-label="${label} · ${t('Previous')}"><span data-wheel-value>${partText(stepDatePart(parts,part,step),part)}</span></button>`).join("")}<div class="date-wheel-selection"><input type="text" data-wheel-value class="date-wheel-current" data-date-part="${part}" aria-label="${label}" role="spinbutton" aria-valuemin="${part==='year'?minYear:1}" aria-valuemax="${part==='year'?maxYear:part==='month'?12:daysInMonth(parts.year,parts.month)}" aria-valuenow="${parts[part]}" value="${partText(parts,part)}" inputmode="numeric" autocomplete="off" ${matchMedia('(pointer: coarse)').matches?'readonly':''}></div>${[1].map(step=>`<button type="button" class="date-wheel-neighbor distance-${step}" data-date-step="${step}" tabindex="-1" aria-label="${label} · ${t('Next')}"><span data-wheel-value>${partText(stepDatePart(parts,part,step),part)}</span></button>`).join("")}</div></section>`;
  }
  function moveValues(column, from, animate = true) {
    for (const value of column.querySelectorAll('[data-wheel-value]')) {
      wheelAnimations.get(value)?.cancel();
      value.style.transform = "";
      if (reducedMotion()) continue;
      if (!animate) {
        value.style.transform = `translateY(${from}px)`;
      } else if (from && value.animate) {
        wheelAnimations.set(value, value.animate([
          { transform: `translateY(${from}px)` },
          { transform: "translateY(0)" },
        ], { duration: 190, easing: "cubic-bezier(.2,.75,.25,1)" }));
      }
    }
  }
  function renderWheels(previous = null, direction = 0, dragOffset = 0, draggedPart = null) {
    const wheels = dialog.querySelector(".date-wheels");
    if (!wheels.children.length) wheels.innerHTML = ["day","month","year"].map(wheel).join("");
    for (const column of wheels.children) {
      const part = column.dataset.dateWheel;
      const input = column.querySelector('[data-date-part]');
      input.value = partText(parts, part);
      input.setAttribute("aria-valuenow", parts[part]);
      input.setAttribute("aria-valuetext", partText(parts, part));
      input.setAttribute("aria-valuemax", part === "year" ? maxYear : part === "month" ? 12 : daysInMonth(parts.year, parts.month));
      for (const neighbor of column.querySelectorAll('.date-wheel-neighbor')) {
        neighbor.querySelector('[data-wheel-value]').textContent = partText(stepDatePart(parts, part, Number(neighbor.dataset.dateStep)), part);
      }
      const changed = previous && parts[part] !== previous[part];
      const drag = part === draggedPart ? dragOffset : 0;
      moveValues(column, changed && direction ? Math.sign(direction) * 44 + drag : drag);
    }
    dialog.querySelector(".date-picker-error").textContent = "";
  }
  function resetGesture() {
    if (!gesture) return;
    moveValues(gesture.track.closest('[data-date-wheel]'), gesture.offset || 0);
    gesture = null;
  }
  function close() {
    resetGesture();
    if (dialog.open) dialog.close();
    const target = active?.querySelector('[data-date-input]');
    target?.setAttribute("aria-expanded", "false");
    active = null;
    if (target?.isConnected) target.focus({preventScroll:true});
  }
  function open(root) {
    resetGesture();
    lastWheel = 0;
    ignoreClickUntil = 0;
    active = root;
    const value = root.querySelector('input[type=hidden]').value;
    parts = jalaliParts(value || today());
    dialog.dir = getLanguage() === "fa" ? "rtl" : "ltr";
    dialog.innerHTML = `<form><header class="dialog-heading"><h2 id="date-picker-title">${root.querySelector('legend').textContent}</h2><button type="button" class="icon-button" data-date-close aria-label="${t('Close')}">×</button></header><div class="date-wheels"></div><p class="date-picker-error" role="alert"></p><footer><button type="button" class="text-button" data-date-today>${t('Today')}</button>${root.dataset.required?'':`<button type="button" class="text-button" data-date-clear>${t('Clear')}</button>`}<button type="submit" class="primary">${t('Select date')}</button></footer></form>`;
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
  function step(part, offset, dragOffset = 0) {
    let previous;
    try { previous = readInputs(); }
    catch { dialog.querySelector('.date-picker-error').textContent = t('Enter a valid date.'); return; }
    parts = stepDatePart(previous, part, offset);
    renderWheels(previous, offset, dragOffset, part);
  }
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
    if (performance.now() <= ignoreClickUntil) return;
    const input = event.target.closest('[data-date-part]');
    if (input && !input.readOnly) { input.focus(); input.select(); }
    const button = event.target.closest('[data-date-step]');
    if (button) step(button.closest('[data-date-wheel]').dataset.dateWheel, Number(button.dataset.dateStep));
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
    const track = event.target.closest('.date-wheel-track');
    if (!track || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // Reserve dragging for the wheel, then focus editable values on an actual click.
    event.preventDefault();
    resetGesture();
    gesture = { y: event.clientY, part: track.closest('[data-date-wheel]').dataset.dateWheel, id: event.pointerId, track, offset: 0 };
  });
  dialog.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const distance = event.clientY - gesture.y;
    if (Math.abs(distance) <= 10 && !gesture.moved) return;
    event.preventDefault();
    gesture.moved = true;
    gesture.track.setPointerCapture(event.pointerId);
    gesture.offset = Math.max(-44, Math.min(44, distance));
    moveValues(gesture.track.closest('[data-date-wheel]'), gesture.offset, false);
  });
  dialog.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const current = gesture;
    gesture = null;
    const delta = current.y - event.clientY;
    if (current.moved) ignoreClickUntil = performance.now() + 300;
    if (Math.abs(delta) > 18) {
      ignoreClickUntil = performance.now() + 300;
      step(current.part, Math.sign(delta) * Math.min(6, Math.max(1, Math.round(Math.abs(delta) / 44))), current.offset);
    } else {
      moveValues(current.track.closest('[data-date-wheel]'), current.offset);
    }
  });
  dialog.addEventListener('pointercancel', resetGesture);
  dialog.addEventListener('lostpointercapture', resetGesture);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
}
if(typeof document!=="undefined") installDatePicker();
