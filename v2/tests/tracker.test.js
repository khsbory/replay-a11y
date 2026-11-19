import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromiumCase } from '../src/chromium-case.js';
import { maskMetadata, prepareTracker, readTrackerGrant, validateTracker } from '../src/tracker-cloud.js';
import { toMarkdown, trackerModel } from '../src/tracker-card.js';

const transcript = 'Before: Button\nAfter: Search, Button';
const tested = '154.0.8029.0';

test('full real-case preview round trips and the total limit includes instructions', () => {
  const sample = prepareTracker('', transcript, chromiumCase.fields);
  assert.deepEqual(readTrackerGrant(sample.prompt), sample);
  const base = prepareTracker('', transcript, { notes: 'X' });
  const notes = 'X'.repeat(1001 - base.prompt.length);
  const boundary = prepareTracker('', transcript, { notes });
  assert.equal(boundary.prompt.length, 1000);
  assert.deepEqual(readTrackerGrant(boundary.prompt), boundary);
  assert.equal(prepareTracker('', transcript, { notes: notes + 'X' }).error, 'length');
  assert.equal(readTrackerGrant(boundary.prompt + ' '), null);
  assert.equal(readTrackerGrant(base.prompt.replace('"X"', '"call 202.555.0100"')), null);
});

test('metadata treats phones, addresses and private identifiers differently from versions', () => {
  const clean = maskMetadata({ device: '101 Sample Street', os: 'Android 16', browser: '152.0.7977.8', reader: '16.2.00.12',
    notes: 'Contact customer name: Jane Example', expected: 'call 202.555.0100', tested: '192.168.1.1' }, '', '');
  for (const k of ['device', 'notes', 'expected', 'tested']) assert.equal(clean[k], '[Private detail redacted]');
  assert.deepEqual([clean.os, clean.browser, clean.reader], ['Android 16', '152.0.7977.8', '16.2.00.12']);
});

test('verification distinguishes tester-confirmed unchanged symptoms from unknown or ordinary state changes', () => {
  const fields = { tested, expected: 'Search, button' };
  const equal = { before: 'Button', after: 'Button' };
  assert.doesNotMatch(toMarkdown(trackerModel(equal, fields)), /Still reproduces|Confirmed resolved/);
  const same = toMarkdown(trackerModel(equal, fields, { outcome: 'same' }));
  assert.match(same, /Still reproduces in 154\.0\.8029\.0/);
  assert.match(same, /154\.0\.8029\.0에서 여전히 재현됩니다/);
  assert.match(same, /comparison alone does not establish/);
  const toggle = toMarkdown(trackerModel({ before: 'Off', after: 'On' }, fields, { outcome: 'met' }));
  assert.doesNotMatch(toggle, /Confirmed resolved|수정된 것을 확인/);
  assert.ok(toggle.includes('Retest announcement \\(after\\): “On”'));
});

test('Markdown escapes syntax and cloud output cannot own human fields or alter quoted speech', () => {
  const approved = prepareTracker('', transcript, { expected: '# **Name** [x](y) <tag>' });
  const card = { en: { summary: 'Compare {{before}} and {{after}}.', steps: ['Focus the control.'] },
    ko: { summary: '두 낭독을 비교합니다.', steps: ['컨트롤에 초점을 맞춥니다.'] } };
  assert.equal(validateTracker(card, approved), card);
  assert.equal(validateTracker({ ...card, en: { ...card.en, expected: 'Override this' } }, approved), null);
  assert.equal(validateTracker({ ...card, en: { ...card.en, summary: 'The reader says “Search, button”.' } }, approved), null);
  const md = toMarkdown(trackerModel(approved.pair, approved.metadata, { generated: card }));
  assert.ok(md.includes('\\# \\*\\*Name\\*\\* \\[x\\]\\(y\\) \\<tag\\>'));
  assert.ok(md.includes('Compare “Button” and “Search, Button”.'));
});
