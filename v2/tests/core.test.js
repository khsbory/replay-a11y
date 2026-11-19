import assert from 'node:assert/strict';
import test from 'node:test';
import { redact, compare, applySuggestion, makeReview, SAMPLE } from '../src/core.js';

test('sample masks all four categories while preserving the TalkBack comparison', () => {
  const clean = redact(SAMPLE);
  assert.deepEqual(compare(clean), { before: '버튼', after: '배송지 변경, 버튼' });
  for (const kind of ['전화번호', '이메일', '금액', '주소']) assert.ok(clean.includes(`[${kind} 가림]`), clean);
  for (const value of ['010-0000-0000', 'replay@example.invalid', '12,300원', '예시로 123']) assert.ok(!clean.includes(value));
  assert.equal(redact(clean), clean);
});

test('patterns cover representative international, Korean and labeled forms without eating next line', () => {
  const text = '전화 +82 (0)10 1234 5678 / 02.123.4567 / 01012345678\n주소: 가상마을 12동\n금액: ₩ 20,000 / $9.50 / ３만원\n서울특별시 종로구 예시길 12-3 101호\n유저@example.invalid\n수정 후: 배송지 변경, 버튼';
  assert.equal(redact(text), '전화 [전화번호 가림] / [전화번호 가림] / [전화번호 가림]\n주소: [주소 가림]\n금액: [금액 가림] / [금액 가림] / [금액 가림]\n[주소 가림]\n[이메일 가림]\n수정 후: 배송지 변경, 버튼');
  assert.equal(compare('자유 형식'), null);
});

test('suggestions can only remove exact known substrings; model-provided replacement is never used', () => {
  const draft = '  예시봄 / 예시봄\n  버튼  ';
  assert.equal(applySuggestion(draft, [{ text: '예시봄', replacement: 'do not insert' }, { text: '없는 문구' }]), '  [추가 가림] / [추가 가림]\n  버튼  ');
});

test('existing pattern markers remain literal even if the model proposes content inside them', () => {
  assert.equal(applySuggestion('[이메일 가림] 버튼, 이메일', [{ text: '이메일' }, { text: '가림' }]), '[이메일 가림] 버튼, [추가 가림]');
});

test('consent is tied to exact bytes and explicitly revoked even if the same text returns', () => {
  const review = makeReview();
  const exact = '  문구\n\n';
  assert.equal(review.approve('  '), false);
  assert.equal(review.approve(exact), true);
  assert.equal(review.get(exact.trim()), null);
  assert.equal(review.get(exact), exact);
  review.revoke();
  assert.equal(review.get(exact), null);
});
import { parseConnectedCard, prepareConnected, readGrantedPrompt, validateConnectedCard } from '../src/connected-card.js';

test('identical evidence and ordinary state transitions require a non-defect card in both languages', () => {
  for (const pair of [
    { before: 'Button', after: ' button ' },
    { before: 'Notifications, switch, off', after: 'Notifications, switch, on' },
    { before: 'Filters, collapsed, button', after: 'Filters, expanded, button' },
    { before: '알림, 스위치, 꺼짐', after: '알림, 스위치, 켜짐' },
  ]) {
    const { prompt } = prepareConnected('', `Before: ${pair.before}\nAfter: ${pair.after}`);
    assert.match(prompt, /This pair has insufficient evidence/i);
    assert.deepEqual(readGrantedPrompt(prompt), pair);
    const card = {
      en: { ...pair, impact: 'Insufficient evidence to identify an accessibility issue.', retest: ['Repeat with the same screen reader and settings.', 'Record the action, expected behavior, and actual announcement.'], fix: 'No fix is justified by this evidence.' },
      ko: { ...pair, impact: '접근성 문제를 확인하기에 근거가 부족합니다.', retest: ['같은 스크린 리더와 설정으로 다시 확인합니다.', '동작, 예상 결과, 실제 낭독을 기록합니다.'], fix: '이 근거만으로는 수정을 제안할 수 없습니다.' },
    };
    assert.deepEqual(validateConnectedCard(card, pair), card);
    assert.equal(validateConnectedCard({ ...card, ko: { ...card.ko, fix: '이 스위치의 접근성 이름을 수정하세요.' } }, pair), null);
    assert.equal(validateConnectedCard({ ...card, en: { ...card.en, impact: 'This control is broken.' } }, pair), null);
  }
});

test('role-only to action name assesses observed impact without assuming a confirmed defect', () => {
  const pairs = [['Button', 'Change delivery address, Button'], ['버튼', '배송지 변경, 버튼'],
    ['Link', 'Link, Shipping policy'], ['링크', '배송 정책, 링크']];
  const guidance = pairs.map(([before, after]) => {
    const { prompt } = prepareConnected('', `Before: ${before}\nAfter: ${after}`);
    assert.match(prompt, /role-only before announcement/);
    assert.match(prompt, /Do not claim a confirmed defect or cause/);
    assert.doesNotMatch(prompt, /copy these impact, retest, fix values/);
    return prompt.replace(`Before: ${before}\nAfter: ${after}`, '');
  });
  assert.equal(new Set(guidance).size, 1, 'use identical criteria and instructions in both languages');
});

test('missing, blank and role-plus-state evidence are not evidence of a missing name', () => {
  for (const draft of ['Before: Button', 'Before:   \nAfter: 배송지 변경, 버튼', 'After: Button']) {
    assert.deepEqual(prepareConnected('', draft), { error: 'pair' });
  }
  for (const draft of ['Before: Link\nAfter: Selected, Link', 'Before: 버튼\nAfter: 버튼, 접힘', 'Before: Button\nAfter: Shipping policy, Link']) {
    assert.doesNotMatch(prepareConnected('', draft).prompt, /role-only before announcement/);
  }
});

test('the naming suggestion must be conditional in both languages; accepted prose is not rewritten', () => {
  const pair = { before: '링크', after: '배송 정책, 링크' };
  const card = {
    en: { ...pair, impact: 'The additional words identify the destination.', retest: ['Use identical reader settings.', 'Compare both full announcements.'], fix: 'If inspection confirms the accessible name is missing or unclear, use a descriptive name.' },
    ko: { ...pair, impact: '추가 문구가 링크의 목적지를 알려 줍니다.', retest: ['같은 리더 설정을 사용합니다.', '두 전체 낭독을 비교합니다.'], fix: '검사 결과 접근 가능한 이름이 없거나 불분명하다면, 목적지를 설명하는 이름을 붙입니다.' },
  };
  assert.equal(validateConnectedCard(card, pair), card);
  assert.deepEqual(parseConnectedCard(JSON.stringify([card]), pair), card);
  assert.equal(parseConnectedCard(JSON.stringify([card, card]), pair), null);
  for (const [lang, fix] of [['en', 'Add a descriptive name to the link.'], ['ko', '링크에 목적지를 설명하는 이름을 붙입니다.']]) {
    assert.equal(validateConnectedCard({ ...card, [lang]: { ...card[lang], fix } }, pair), null);
  }
});

test('the exact outgoing text starts with the quotes and counts every character of the full prompt', () => {
  const draft = 'Before:  Button  \nAfter:  Filters, button  ';
  const { prompt, pair } = prepareConnected('', draft);
  assert.ok(prompt.startsWith(`${draft}\n\n`));
  assert.deepEqual(readGrantedPrompt(prompt), pair);
  assert.equal(readGrantedPrompt(prompt + ' '), null);
  const fill = 'x'.repeat(1000 - prompt.length);
  const max = draft.replace('Filters', `Filters${fill}`);
  assert.equal(prepareConnected('', max).prompt.length, 1000);
  assert.deepEqual(prepareConnected('', max + ' '), { error: 'length' });
});
