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
