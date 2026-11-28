import test from 'node:test';
import assert from 'node:assert/strict';
import { clampDateParts, stepDatePart, installDatePicker } from '../src/DameDast.Web/wwwroot/date-picker.js';
import { fromJalali, jalaliParts } from '../src/DameDast.Web/wwwroot/calendar.js';

test('date wheels cross month and year boundaries without producing an invalid date', () => {
  assert.deepEqual(stepDatePart({year:1405,month:6,day:31},'month',1),{year:1405,month:7,day:30});
  assert.deepEqual(stepDatePart({year:1404,month:12,day:29},'day',1),{year:1405,month:1,day:1});
  assert.deepEqual(stepDatePart({year:1405,month:1,day:1},'day',-1),{year:1404,month:12,day:29});
  assert.deepEqual(stepDatePart({year:1403,month:12,day:30},'year',1),{year:1404,month:12,day:29});
  for(const part of ['day','month','year']) for(const delta of [-2,-1,1,2]) {
    const next=stepDatePart({year:1403,month:12,day:30},part,delta);
    assert.deepEqual(jalaliParts(fromJalali(next.year,next.month,next.day)),next);
  }
});
test('date wheels respect the supported year bounds and reject fractional input', () => {
  assert.deepEqual(stepDatePart({year:1378,month:1,day:1},'day',-1),{year:1378,month:1,day:1});
  assert.equal(stepDatePart({year:1479,month:12,day:1},'month',1).year,1479);
  assert.throws(()=>clampDateParts({year:1405,month:1.5,day:3}));
});

async function pickerFixture(context, date, mode = "date") {
  const { parseHTML } = await import('linkedom');
  const { document, window } = parseHTML(`<html><body><fieldset data-date-control data-date-mode="${mode}"><legend>Date</legend><input type="hidden" value="${date}"><input data-date-input></fieldset></body></html>`);
  const originals = { document: globalThis.document, matchMedia: globalThis.matchMedia, Event: globalThis.Event };
  let reduce = false;
  globalThis.document = document;
  globalThis.Event = window.Event;
  window.HTMLElement.prototype.setCustomValidity = () => {};
  globalThis.matchMedia = query => ({matches: query.includes('reduced-motion') && reduce});
  const animations = [];
  window.HTMLElement.prototype.animate = function(frames, options) {
    const animation = { target: this, frames, options, cancelled: false, cancel() { this.cancelled = true; } };
    animations.push(animation); return animation;
  };
  window.HTMLElement.prototype.setPointerCapture = () => {};
  const create = document.createElement.bind(document);
  document.createElement = tag => {
    const element = create(tag);
    if (tag === 'dialog') { element.showModal = () => {element.open = true;}; element.close = () => {element.open = false;}; }
    return element;
  };
  context.after(() => {
    for (const [key,value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  });
  installDatePicker();
  const send = (target, type, fields = {}) => {
    const event = new window.Event(type, {bubbles:true,cancelable:true}); Object.assign(event,fields); target.dispatchEvent(event);
  };
  send(document.querySelector('[data-date-input]'), 'click');
  return { document, animations, send, reduce: () => {reduce = true;}, part: name => document.querySelector(`[data-date-part="${name}"]`) };
}

test('animated steps keep input nodes, handle rapid reversals and rollovers, and respect reduced motion', async context => {
  const picker = await pickerFixture(context, fromJalali(1405,6,31));
  const {document,animations,send,part} = picker;
  const month = part('month'), day = part('day');
  assert.equal(document.querySelectorAll('.date-wheel-neighbor').length,6);
  assert.equal(document.querySelectorAll('.date-wheel-arrows, .date-picker-hint, .date-picker-preview, .date-wheel h3, [data-date-today], .distance-2').length,0);
  send(month, 'keydown', {key:'ArrowUp'});
  assert.equal(part('month'), month); assert.equal(part('day'), day);
  assert.equal(month.getAttribute('aria-valuenow'),'7');
  assert.equal(day.value,'30'); assert.equal(day.getAttribute('aria-valuemax'),'30');
  assert.equal(animations.length,6); // Day clamping and month both move.
  assert.equal(animations.at(-1).frames[0].transform,'translateY(44px)');
  const previous = animations.at(-1);
  send(month, 'keydown', {key:'ArrowDown'});
  assert.equal(previous.cancelled,true); assert.equal(month.getAttribute('aria-valuenow'),'6');
  assert.equal(animations.at(-1).frames[0].transform,'translateY(-44px)');
  picker.reduce(); const count = animations.length;
  send(month,'keydown',{key:'ArrowUp'});
  assert.equal(animations.length,count); assert.equal(month.getAttribute('aria-valuenow'),'7');
  month.value = 'invalid'; send(month,'keydown',{key:'ArrowUp'});
  assert.ok(document.querySelector('.date-picker-error').textContent);
  assert.equal(month.value,'invalid'); // Invalid manual input is retained for correction.
});

test('dragging follows the pointer, snaps to a valid date and cancels without changing it', async context => {
  const {document,send,part} = await pickerFixture(context, fromJalali(1405,8,15));
  const track = part('day').closest('.date-wheel-track');
  send(track,'pointerdown',{clientY:100,pointerId:1,pointerType:'touch'});
  send(track,'pointermove',{clientY:70,pointerId:1});
  assert.equal(part('day').value,'16');
  assert.equal(part('day').style.transform,'translateY(14px)');
  send(track,'pointerup',{clientY:70,pointerId:1});
  assert.equal(part('day').value,'16'); assert.equal(part('day').style.transform,'');
  send(track,'pointerdown',{clientY:100,pointerId:2,pointerType:'touch'});
  send(track,'pointermove',{clientY:130,pointerId:2});
  send(track,'pointercancel',{pointerId:2});
  assert.equal(part('day').value,'16'); assert.equal(part('day').style.transform,'');
  assert.equal(document.querySelector('[data-date-control] input[type=hidden]').value,fromJalali(1405,8,15)); // Draft only until confirmed.
});

test('the middle day, month and year values can all be dragged with a mouse in both directions', async context => {
  const {send,part} = await pickerFixture(context, fromJalali(1405,8,15));
  for (const name of ['day','month','year']) {
    const input = part(name), before = Number(input.getAttribute('aria-valuenow'));
    send(input,'pointerdown',{clientY:100,pointerId:1,pointerType:'mouse',button:0});
    send(input,'pointermove',{clientY:65,pointerId:1});
    send(input,'pointerup',{clientY:65,pointerId:1});
    assert.equal(Number(input.getAttribute('aria-valuenow')),before+1);
    send(input,'pointerdown',{clientY:100,pointerId:2,pointerType:'mouse',button:0});
    send(input,'pointermove',{clientY:135,pointerId:2});
    send(input,'pointerup',{clientY:135,pointerId:2});
    assert.equal(Number(input.getAttribute('aria-valuenow')),before);
  }
});

test('touch dragging survives implicit capture moving from the middle input to its wheel', async context => {
  const {send,part} = await pickerFixture(context, fromJalali(1405,8,15));
  for (const name of ['day','month','year']) {
    const input = part(name), track = input.closest('.date-wheel-track');
    const before = Number(input.getAttribute('aria-valuenow'));
    send(input,'pointerdown',{clientY:100,pointerId:1,pointerType:'touch',button:0});
    send(input,'pointermove',{clientY:85,pointerId:1,pointerType:'touch'});
    // A real touch has implicit capture on the input. Transferring it to the
    // track bubbles lostpointercapture from the input before the next move.
    send(input,'lostpointercapture',{pointerId:1,pointerType:'touch'});
    send(track,'pointermove',{clientY:65,pointerId:1,pointerType:'touch'});
    send(track,'pointerup',{clientY:65,pointerId:1,pointerType:'touch'});
    assert.equal(Number(input.getAttribute('aria-valuenow')),before+1,name);
  }
});

test('losing the track capture still cancels a touch without committing a different day', async context => {
  const {send,part} = await pickerFixture(context, fromJalali(1405,8,15));
  const input = part('day'), track = input.closest('.date-wheel-track');
  send(input,'pointerdown',{clientY:100,pointerId:1,pointerType:'touch',button:0});
  send(input,'pointermove',{clientY:65,pointerId:1,pointerType:'touch'});
  send(track,'lostpointercapture',{pointerId:1,pointerType:'touch'});
  send(track,'pointerup',{clientY:65,pointerId:1,pointerType:'touch'});
  assert.equal(input.value,'15'); assert.equal(input.style.transform,'');
});

test('long touch swipes update all wheels before release, reverse continuously and never jump on release', async context => {
  const {document,send,part} = await pickerFixture(context, fromJalali(1405,5,15));
  for (const name of ['day','month','year']) {
    const input = part(name), track = input.closest('.date-wheel-track');
    const before = Number(input.getAttribute('aria-valuenow'));
    send(input,'pointerdown',{clientY:300,pointerId:1,pointerType:'touch',button:0});
    send(input,'pointermove',{clientY:256,pointerId:1});
    assert.equal(Number(input.getAttribute('aria-valuenow')),before+1);
    send(input,'lostpointercapture',{pointerId:1});
    send(track,'pointermove',{clientY:124,pointerId:1});
    assert.equal(Number(input.getAttribute('aria-valuenow')),before+4);
    send(track,'pointermove',{clientY:344,pointerId:1});
    assert.equal(Number(input.getAttribute('aria-valuenow')),before-1);
    const shown = input.value;
    send(track,'pointerup',{clientY:344,pointerId:1});
    assert.equal(input.value,shown); assert.equal(input.style.transform,'');
  }
  assert.equal(document.querySelector('[data-date-control] input[type=hidden]').value,fromJalali(1405,5,15));
});


test('month-only selection crosses years and stores a Persian month without inventing a day', async context => {
  const {document, send, part} = await pickerFixture(context, '1405-12', 'month');
  assert.equal(document.querySelectorAll('[data-date-part]').length, 2);
  assert.equal(part('day'), null);
  send(part('month'), 'keydown', {key:'ArrowUp'});
  assert.equal(part('month').getAttribute('aria-valuenow'), '1');
  assert.equal(part('year').getAttribute('aria-valuenow'), '1406');
  send(document.querySelector('#date-picker-dialog form'), 'submit');
  assert.equal(document.querySelector('[data-date-control] input[type=hidden]').value, '1406-01');
});

test('recurring day selection keeps day 31 independent of short months and supports wrapping', async context => {
  const {document, send, part} = await pickerFixture(context, '31', 'day');
  assert.equal(document.querySelectorAll('[data-date-part]').length, 1);
  assert.equal(part('day').getAttribute('aria-valuenow'), '31');
  send(part('day'), 'keydown', {key:'ArrowUp'});
  assert.equal(part('day').getAttribute('aria-valuenow'), '1');
  send(part('day'), 'keydown', {key:'ArrowDown'});
  send(document.querySelector('#date-picker-dialog form'), 'submit');
  assert.equal(document.querySelector('[data-date-control] input[type=hidden]').value, '31');
});
