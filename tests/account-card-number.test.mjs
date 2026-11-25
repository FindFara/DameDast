import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCardNumber, formatCardNumber} from '../src/DameDast.Web/wwwroot/account-card-number.js';

test('card numbers preserve leading zeros and normalize Persian/Arabic input without numeric rounding', () => {
  assert.equal(parseCardNumber('۰۰۰۰-٠٠٠٠ ۰۰۰۰ ۰۰۰۱'), '0000000000000001');
  assert.equal(formatCardNumber('0000000000000001'), '0000 0000 0000 0001');
  assert.equal(parseCardNumber(undefined), '');
  assert.equal(formatCardNumber(undefined), '');
  for (const value of ['123', '00000000000000000', '000000000000000x', '1e15000000000000', '<script>'])
    assert.throws(() => parseCardNumber(value), /16-digit/);
});
