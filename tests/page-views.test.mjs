import test from 'node:test';
import assert from 'node:assert/strict';
import { createPageViewTracker } from '../src/DameDast.Web/wwwroot/page-views.js';

test('screen visits count on entry with a session token and never on ordinary rerenders', () => {
  const visits = [], track = createPageViewTracker((...args) => visits.push(args));
  track('notes', null); track('notes', 'csrf'); track('notes', 'csrf');
  track('overview', 'csrf'); track('notes', 'csrf');
  assert.deepEqual(visits, [['notes', 'csrf'], ['overview', 'csrf'], ['notes', 'csrf']]);
});
test('synchronous and asynchronous telemetry errors leave the caller running', async () => {
  const sync = createPageViewTracker(() => { throw new Error('offline'); });
  const asyncTrack = createPageViewTracker(() => Promise.reject(new Error('unavailable')));
  assert.doesNotThrow(() => sync('notes', 'csrf'));
  assert.doesNotThrow(() => asyncTrack('overview', 'csrf'));
  await new Promise(resolve => setImmediate(resolve));
});
