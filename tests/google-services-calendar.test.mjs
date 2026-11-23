import test from 'node:test';
import assert from 'node:assert/strict';
import { googleServices, googleServicesMarkup } from '../src/DameDast.Web/wwwroot/google-services.js';
import { plainCalendarMarkup } from '../src/DameDast.Web/wwwroot/desk-tool-ui.js';
import { defaultWorkbench, deviceWorkbench, validateWorkbench, overlaps } from '../src/DameDast.Web/wwwroot/workbench.js';
import { setLanguage } from '../src/DameDast.Web/wwwroot/i18n.js';

test('Google services are local vector icons with labelled HTTPS links and no opener access', () => {
  setLanguage('fa');
  const html = googleServicesMarkup();
  assert.equal(googleServices.length, 8);
  for (const service of googleServices) {
    assert.equal(new URL(service.url).protocol, 'https:');
    assert.ok(['google.com', 'docs.google.com', 'mail.google.com', 'drive.google.com', 'calendar.google.com', 'meet.google.com', 'translate.google.com', 'www.google.com'].includes(new URL(service.url).hostname));
    assert.ok(html.includes(`href="${service.url}"`));
  }
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 8);
  assert.equal((html.match(/<svg /g) || []).length, 8);
  assert.match(html, /سرویس‌های گوگل/);
  assert.doesNotMatch(html, /<img|<script|onerror|onclick/);
});

test('calendar uses Tehran today across midnight, highlights holidays and supports leap-month navigation', () => {
  setLanguage('en');
  const now = '2026-11-20T21:00:00Z';
  const html = plainCalendarMarkup({calendar:'persian'}, 0, now);
  assert.match(html, /datetime="2026-11-21" class="is-today" aria-current="date"/);
  assert.match(html, /data-tool-action="calendar-today"/);
  assert.equal((html.match(/<abbr /g) || []).length, 7);
  assert.match(html, /class="is-holiday"/);
  const february = plainCalendarMarkup({calendar:'gregory'}, 0, '2028-02-10T12:00:00Z');
  assert.match(february, /datetime="2028-02-29"/);
  assert.doesNotMatch(february, /datetime="2028-02-30"/);
  const january = plainCalendarMarkup({calendar:'gregory'}, -1, '2028-02-10T12:00:00Z');
  assert.match(january, /datetime="2028-01-31"/);
});

test('the default workbench includes Google services with non-overlapping layouts on every device', () => {
  const layout = defaultWorkbench();
  validateWorkbench(layout);
  assert.equal(layout.widgets.filter(widget => widget.type === 'googleServices').length, 1);
  for (const device of ['desktop', 'tablet', 'phone']) {
    const packed = deviceWorkbench(layout, device);
    assert.equal(packed.widgets.length, layout.widgets.length);
    for (const a of packed.widgets) for (const b of packed.widgets) if (a !== b) assert.equal(overlaps(a,b), false);
  }
});

test('saved calendars with null options can navigate months and return to today', () => {
  const now = '2026-11-23T12:00:00Z';
  const current = plainCalendarMarkup(null, 0, now);
  const next = plainCalendarMarkup(null, 1, now);
  assert.equal(current, plainCalendarMarkup({}, 0, now));
  assert.notEqual(current, next);
  assert.match(current, /aria-current="date"/);
  assert.doesNotMatch(next, /aria-current="date"/);
});
