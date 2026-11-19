import { EN_SAMPLE, LIMIT, SAMPLE, applySuggestion, canUseEnglishModel, compare, makeReview, redact } from './core.js';
import { suggestOnDevice } from './device.js';
import { renderReport } from './report.js';

const el = id => document.getElementById(id);
const source = el('source');
const english = el('english');
const file = el('file');
const draft = el('draft');
const consent = el('consent');
const make = el('make');
const suggest = el('suggest');
const inputStatus = el('input-status');
const reviewStatus = el('review-status');
const draftRevoked = '문구가 바뀌어 동의를 취소했습니다. 다시 확인해 주세요.';
const sourceRevoked = '원문 설정이나 내용이 바뀌어 동의를 취소했습니다. 새 초안을 만들어 주세요.';
const review = makeReview();
let generation = 0;
let inputRevision = 0;
let busy = false;
let proposal = null;

function setBusy(value) {
  busy = value;
  suggest.setAttribute('aria-disabled', String(value));
}

function clearProposal() {
  proposal = null;
  el('proposal').hidden = true;
  el('proposal-text').textContent = '';
}

function resetSuggestions() {
  generation++;
  clearProposal();
  el('model-status').textContent = '';
}

function hideCard() {
  el('card').hidden = true;
  el('card-text').textContent = '';
}

function revoke() {
  const hadConsent = consent.checked;
  review.revoke();
  consent.checked = false;
  make.disabled = true;
  hideCard();
  return hadConsent;
}

function invalidateSource() {
  resetSuggestions();
  const hadConsent = revoke();
  reviewStatus.textContent = '';
  draft.value = '';
  el('before').textContent = '';
  el('after').textContent = '';
  el('work').hidden = true;
  el('review').hidden = true;
  return hadConsent;
}

const englishSource = () => canUseEnglishModel(english.checked ? 'en' : null, source.value);
const manualStatus = '영어로 지정한 영어 기록만 모델에 전달합니다. 한국어·혼합 기록은 모델 없이 직접 편집해 주세요.';

function labelDraft() {
  const language = englishSource() && canUseEnglishModel('en', draft.value) ? 'en' : '';
  for (const id of ['draft', 'proposal-text']) el(id).lang = language;
}

function prepare() {
  invalidateSource();
  if (!source.value.trim() || source.value.length > LIMIT) {
    el('input-status').textContent = '낭독 기록을 1자 이상, 8,000자 이하로 입력해 주세요.';
    return;
  }
  const language = englishSource() ? 'en' : '';
  const clean = redact(source.value, language);
  const pair = compare(clean);
  el('pairs').hidden = !pair;
  el('no-pairs').hidden = Boolean(pair);
  el('before').textContent = pair?.before ?? '';
  el('after').textContent = pair?.after ?? '';
  el('before').lang = el('after').lang = language;
  draft.value = clean;
  labelDraft();
  if (!language) el('model-status').textContent = manualStatus;
  el('work').hidden = false;
  el('review').hidden = false;
  el('input-status').textContent = '패턴 가림을 적용해 초안을 만들었습니다.';
  el('comparison').focus();
}

function loadSample(text, isEnglish) {
  inputRevision++;
  english.checked = isEnglish;
  source.value = text;
  source.lang = isEnglish ? 'en' : '';
  prepare();
}
el('sample').onclick = () => loadSample(SAMPLE, false);
el('sample-en').onclick = () => loadSample(EN_SAMPLE, true);
el('prepare').onclick = () => { inputRevision++; prepare(); };
function sourceChanged() {
  inputRevision++;
  const hadConsent = invalidateSource();
  source.lang = englishSource() ? 'en' : '';
  if (hadConsent) inputStatus.textContent = sourceRevoked;
  else if (inputStatus.textContent !== sourceRevoked) inputStatus.textContent = '';
}
source.oninput = english.onchange = sourceChanged;
file.onchange = async () => {
  const selected = file.files[0];
  file.value = '';
  if (!selected) return;
  const revision = ++inputRevision;
  invalidateSource();
  el('input-status').textContent = '이 기기에서 파일을 읽는 중입니다.';
  try {
    if (selected.size > 32_003) throw new Error('File size');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await selected.arrayBuffer());
    if (revision !== inputRevision) return;
    if (!text.trim() || text.length > LIMIT || text.includes('\0')) throw new Error('Text format');
    source.value = text;
    english.checked = false;
    source.lang = '';
    prepare();
  } catch {
    if (revision === inputRevision) el('input-status').textContent = '파일을 읽지 못했습니다. 8,000자 이하의 UTF-8 텍스트 파일을 선택해 주세요.';
  }
};

draft.oninput = () => {
  if (revoke()) reviewStatus.textContent = draftRevoked;
  else if (reviewStatus.textContent !== draftRevoked) reviewStatus.textContent = '';
  resetSuggestions();
  labelDraft();
};
consent.onchange = () => {
  hideCard();
  if (consent.checked && review.approve(draft.value)) {
    make.disabled = false;
    reviewStatus.textContent = '현재 문구에 동의했습니다. 이 기기에서 카드로 만들 수 있습니다.';
  } else {
    revoke();
    reviewStatus.textContent = draft.value.trim() ? '카드 만들기 동의를 취소했습니다.' : '동의하기 전에 카드 문구를 입력해 주세요.';
  }
};
make.onclick = () => {
  const exact = consent.checked ? review.get(draft.value) : null;
  if (exact === null) {
    if (document.activeElement === make) consent.focus();
    revoke();
    reviewStatus.textContent = '카드를 만들지 못했습니다. 문구를 다시 확인하고 동의해 주세요.';
    return;
  }
  const pair = compare(redact(exact, englishSource() ? 'en' : ''));
  renderReport(el('card-text'), pair, {
    delivery: (pair?.before === 'Button' && pair.after === 'Change shipping address, button') ||
      (pair?.before === '버튼' && pair.after === '배송지 변경, 버튼'),
  });
  el('card').hidden = false;
  el('card-title').focus();
};

suggest.onclick = async () => {
  if (busy) {
    el('model-status').textContent = '이전 기기 내 요청이 끝나기를 기다리는 중입니다.';
    return;
  }
  resetSuggestions();
  const original = draft.value;
  if (!original.trim() || original.length > LIMIT) {
    el('model-status').textContent = '제안을 받으려면 문구를 1자 이상, 8,000자 이하로 입력해 주세요.';
    return;
  }
  if (!englishSource() || !canUseEnglishModel('en', original)) {
    el('model-status').textContent = manualStatus;
    return;
  }
  const request = generation;
  const active = () => request === generation && original === draft.value;
  setBusy(true);
  el('model-status').textContent = '기기 내 모델을 준비하고 있습니다.';
  let lastStep = -1;
  try {
    const candidates = await suggestOnDevice(original, 'en', {
      active,
      progress(value) {
        const step = Math.min(100, Math.floor(value * 10) * 10);
        if (active() && step > lastStep) {
          lastStep = step;
          el('model-status').textContent = `기기 내 모델 다운로드 ${step}%`;
        }
      },
      generating: () => { el('model-status').textContent = '기기에서 추가 가림 제안을 만드는 중입니다.'; },
    });
    if (!active()) return;
    const clean = redact(original, 'en');
    const next = applySuggestion(clean, candidates, 'en');
    if (next === original) {
      el('model-status').textContent = '기기 내 모델 응답을 확인했습니다. 적용할 추가 가림이 없습니다.';
      return;
    }
    proposal = { original, next };
    el('proposal-text').textContent = next;
    el('proposal').hidden = false;
    el('model-status').textContent = '기기 내 모델 응답을 확인했습니다. 제안 문구를 검토한 다음 적용할 수 있습니다.';
  } catch {
    if (active()) el('model-status').textContent = '기기 내 모델을 사용할 수 없습니다. 또는 제안 응답을 읽지 못했습니다. 클라우드로 전송하지 않았습니다. 초안을 직접 편집할 수 있습니다.';
  } finally {
    setBusy(false);
    if (!active()) el('model-status').textContent = '문구가 바뀌어 이전 제안을 사용하지 않았습니다.';
  }
};

el('apply').onclick = () => {
  if (!proposal || proposal.original !== draft.value) return;
  draft.value = proposal.next;
  clearProposal();
  const hadConsent = revoke();
  reviewStatus.textContent = '';
  el('model-status').textContent = hadConsent
    ? `추가 가림 제안을 적용했습니다. ${draftRevoked}`
    : '추가 가림 제안을 적용했습니다. 카드 문구를 다시 검토해 주세요.';
  draft.focus();
};
