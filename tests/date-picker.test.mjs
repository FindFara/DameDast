import test from 'node:test';
import assert from 'node:assert/strict';
import { clampDateParts, stepDatePart } from '../src/DameDast.Web/wwwroot/date-picker.js';
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
