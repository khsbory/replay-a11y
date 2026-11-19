import { DELIVERY_OBSERVATIONS, EN_SAMPLE, LIMIT, SAMPLE, applySuggestion, canUseEnglishModel, compare, makeReview, redact } from './core.js';
import { suggestOnDevice } from './device.js';
import { cardOutput, trackerModel } from './tracker-card.js';
import { fields, invalidateCloud, outcome, safeFields, sample } from './connected-workspace.js';
import { chromiumCase } from './chromium-case.js';
import { sameMetadata, reviewedPair } from './tracker-cloud.js';
import { contentLanguage, hasStatus, initLocale, setStatus } from './ui-locale.js';

const messages = {
  draftRevoked: ["The text changed, so consent was cleared. Review it again.", "문구가 바뀌어 동의를 취소했습니다. 다시 확인해 주세요."],
  sourceRevoked: ["The original or its language setting changed, so consent was cleared. Make a new draft.", "원문 설정이나 내용이 바뀌어 동의를 취소했습니다. 새 초안을 만들어 주세요."],
  manualStatus: ["The model only receives English recordings marked as English. Edit Korean or mixed-language recordings manually without the model.", "영어로 지정한 영어 기록만 모델에 전달합니다. 한국어·혼합 기록은 모델 없이 직접 편집해 주세요."],
  inputLength: ["Enter a recording between 1 and 8,000 characters.", "낭독 기록을 1자 이상, 8,000자 이하로 입력해 주세요."],
  prepared: ["Draft created with pattern redaction.", "패턴 가림을 적용해 초안을 만들었습니다."],
  reading: ["Reading the file on this device.", "이 기기에서 파일을 읽는 중입니다."],
  fileError: ["Could not read the file. Choose a UTF-8 text file of up to 8,000 characters.", "파일을 읽지 못했습니다. 8,000자 이하의 UTF-8 텍스트 파일을 선택해 주세요."],
  consented: ["You consented to the current text. You can make a card on this device.", "현재 문구에 동의했습니다. 이 기기에서 카드로 만들 수 있습니다."],
  consentWithdrawn: ["Consent to make a card was withdrawn.", "카드 만들기 동의를 취소했습니다."],
  consentEmpty: ["Enter card text before giving consent.", "동의하기 전에 카드 문구를 입력해 주세요."],
  cardError: ["Could not make the card. Review the text and give consent again.", "카드를 만들지 못했습니다. 문구를 다시 확인하고 동의해 주세요."],
  waiting: ["Waiting for the previous on-device request to finish.", "이전 기기 내 요청이 끝나기를 기다리는 중입니다."],
  modelLength: ["Enter between 1 and 8,000 characters to get suggestions.", "제안을 받으려면 문구를 1자 이상, 8,000자 이하로 입력해 주세요."],
  modelPreparing: ["Preparing the on-device model.", "기기 내 모델을 준비하고 있습니다."],
  modelGenerating: ["Generating additional redaction suggestions on this device.", "기기에서 추가 가림 제안을 만드는 중입니다."],
  noSuggestions: ["Received the on-device model response. There are no additional redactions to apply.", "기기 내 모델 응답을 확인했습니다. 적용할 추가 가림이 없습니다."],
  suggestionsReady: ["Received the on-device model response. Review the suggested text before applying it.", "기기 내 모델 응답을 확인했습니다. 제안 문구를 검토한 다음 적용할 수 있습니다."],
  modelError: ["The on-device model is unavailable or its response could not be read. Nothing was sent to the cloud. You can edit the draft manually.", "기기 내 모델을 사용할 수 없습니다. 또는 제안 응답을 읽지 못했습니다. 클라우드로 전송하지 않았습니다. 초안을 직접 편집할 수 있습니다."],
  staleSuggestions: ["The text changed, so the previous suggestions were not used.", "문구가 바뀌어 이전 제안을 사용하지 않았습니다."],
  applied: ["Additional redactions applied. Review the card text again.", "추가 가림 제안을 적용했습니다. 카드 문구를 다시 검토해 주세요."],
};

initLocale();

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
const review = makeReview();
const localOutput = cardOutput(el('card-text'), el('card-copy'), el('card-copy-status'));
const reviewText = () => draft.value.trim() && JSON.stringify([draft.value, fields(), outcome(), sample()]);
const fieldStatus = el('tracker-status');
const metadataWarning = ['Tracker details may contain private information. Edit them or apply pattern redaction, then review.', '이슈 카드 정보에 개인정보가 있을 수 있습니다. 직접 편집하거나 패턴 가림을 적용한 후 검토해 주세요.'];
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
  setStatus(el('model-status'));
}

function hideCard() {
  el('card').hidden = true;
  localOutput(null);
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
  invalidateCloud();
  resetSuggestions();
  const hadConsent = revoke();
  setStatus(reviewStatus);
  draft.value = '';
  el('before').textContent = '';
  el('after').textContent = '';
  el('work').hidden = true;
  el('review').hidden = true;
  return hadConsent;
}

const englishSource = () => canUseEnglishModel(english.checked ? 'en' : null, source.value);

function labelDraft() {
  const language = contentLanguage(draft.value);
  for (const id of ['draft', 'proposal-text']) el(id).lang = language;
}

function prepare() {
  invalidateSource();
  if (!source.value.trim() || source.value.length > LIMIT) {
    setStatus(el('input-status'), messages.inputLength);
    return;
  }
  const language = englishSource() ? 'en' : '';
  const clean = redact(source.value, language);
  const pair = compare(clean);
  el('pairs').hidden = !pair;
  el('no-pairs').hidden = Boolean(pair);
  el('before').textContent = pair?.before ?? '';
  el('after').textContent = pair?.after ?? '';
  el('before').lang = contentLanguage(pair?.before ?? '');
  el('after').lang = contentLanguage(pair?.after ?? '');
  draft.value = clean;
  labelDraft();
  if (!language) setStatus(el('model-status'), messages.manualStatus);
  el('work').hidden = false;
  el('review').hidden = false;
  setStatus(el('input-status'), messages.prepared);
  el('comparison').focus();
}

function assignFields(values = {}) {
  for (const key of Object.keys(fields())) el(`tracker-${key}`).value = values[key] ?? '';
  setStatus(fieldStatus);
}

function clearSample() {
  if (sample()) assignFields();
  el('real-info').hidden = true;
  el('tracker-outcome').value = '';
}

const realRecording = `Before: ${chromiumCase.pair.before}\nAfter: ${chromiumCase.pair.after}`;
function loadSample(text, isEnglish, real = false) {
  inputRevision++;
  clearSample();
  assignFields(real ? chromiumCase.fields : {});
  el('real-info').hidden = !real;
  english.checked = isEnglish;
  source.value = text;
  source.lang = contentLanguage(text);
  prepare();
}
el('sample').onclick = () => loadSample(SAMPLE, false);
el('sample-en').onclick = () => loadSample(EN_SAMPLE, true);
el('sample-real').onclick = () => loadSample(realRecording, true, true);
el('prepare').onclick = () => { inputRevision++; prepare(); };
function sourceChanged() {
  inputRevision++;
  if (sample() && source.value !== realRecording) clearSample();
  el('tracker-outcome').value = '';
  const hadConsent = invalidateSource();
  source.lang = contentLanguage(source.value);
  if (hadConsent) setStatus(inputStatus, messages.sourceRevoked);
  else if (!hasStatus(inputStatus, messages.sourceRevoked)) setStatus(inputStatus);
}
source.oninput = english.onchange = sourceChanged;
el('choose-file').onclick = () => file.click();
file.onchange = async () => {
  const selected = file.files[0];
  file.value = '';
  if (!selected) return;
  clearSample();
  const revision = ++inputRevision;
  invalidateSource();
  setStatus(el('input-status'), messages.reading);
  try {
    if (selected.size > 32_003) throw new Error('File size');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await selected.arrayBuffer());
    if (revision !== inputRevision) return;
    if (!text.trim() || text.length > LIMIT || text.includes('\0')) throw new Error('Text format');
    source.value = text;
    english.checked = false;
    source.lang = contentLanguage(text);
    prepare();
  } catch {
    if (revision === inputRevision) setStatus(el('input-status'), messages.fileError);
  }
};

draft.oninput = () => {
  el('tracker-outcome').value = '';
  invalidateCloud();
  if (revoke()) setStatus(reviewStatus, messages.draftRevoked);
  else if (!hasStatus(reviewStatus, messages.draftRevoked)) setStatus(reviewStatus);
  resetSuggestions();
  labelDraft();
};
function trackerChanged() {
  invalidateCloud();
  resetSuggestions();
  if (revoke()) setStatus(reviewStatus, messages.draftRevoked);
  setStatus(fieldStatus);
}
for (const key of Object.keys(fields())) el(`tracker-${key}`).oninput = () => {
  el('tracker-outcome').value = '';
  trackerChanged();
};
el('tracker-outcome').onchange = trackerChanged;
el('tracker-mask').onclick = () => {
  const clean = safeFields();
  if (!sameMetadata(clean, fields())) {
    trackerChanged();
    el('tracker-outcome').value = '';
    assignFields(clean);
    setStatus(fieldStatus, ['Potential private details masked. Review the resulting fields.', '개인정보로 보이는 내용을 가렸습니다. 변경된 항목을 검토해 주세요.']);
  } else setStatus(fieldStatus, ['No matching patterns found. Check these fields yourself before approving.', '일치하는 패턴이 없습니다. 승인 전에 직접 확인해 주세요.']);
};
consent.onchange = () => {
  hideCard();
  if (consent.checked && !sameMetadata(fields(), safeFields())) {
    revoke();
    setStatus(reviewStatus, metadataWarning);
  } else if (consent.checked && review.approve(reviewText())) {
    make.disabled = false;
    setStatus(reviewStatus, messages.consented);
  } else {
    revoke();
    setStatus(reviewStatus, draft.value.trim() ? messages.consentWithdrawn : messages.consentEmpty);
  }
};
make.onclick = () => {
  const exact = consent.checked ? review.get(reviewText()) : null;
  if (exact === null) {
    if (document.activeElement === make) consent.focus();
    revoke();
    setStatus(reviewStatus, messages.cardError);
    return;
  }
  const pair = reviewedPair(source.value, draft.value, fields());
  localOutput(trackerModel(pair, fields(), {
    outcome: outcome(), sample: sample(),
    delivery: (pair?.before === DELIVERY_OBSERVATIONS.before && pair.after === DELIVERY_OBSERVATIONS.after) ||
      (pair?.before === '버튼' && pair.after === '배송지 변경, 버튼'),
  }));
  el('card').hidden = false;
  el('card-title').focus();
};

suggest.onclick = async () => {
  if (busy) {
    setStatus(el('model-status'), messages.waiting);
    return;
  }
  resetSuggestions();
  const original = draft.value;
  if (!original.trim() || original.length > LIMIT) {
    setStatus(el('model-status'), messages.modelLength);
    return;
  }
  if (!englishSource() || !canUseEnglishModel('en', original)) {
    setStatus(el('model-status'), messages.manualStatus);
    return;
  }
  const request = generation;
  const active = () => request === generation && original === draft.value;
  setBusy(true);
  setStatus(el('model-status'), messages.modelPreparing);
  let lastStep = -1;
  try {
    const candidates = await suggestOnDevice(original, 'en', {
      active,
      progress(value) {
        const step = Math.min(100, Math.floor(value * 10) * 10);
        if (active() && step > lastStep) {
          lastStep = step;
          setStatus(el('model-status'), [`Downloading the on-device model: ${step}%`, `기기 내 모델 다운로드 ${step}%`]);
        }
      },
      generating: () => { setStatus(el('model-status'), messages.modelGenerating); },
    });
    if (!active()) return;
    const clean = redact(original, 'en');
    const next = applySuggestion(clean, candidates, 'en');
    if (next === original) {
      setStatus(el('model-status'), messages.noSuggestions);
      return;
    }
    proposal = { original, next };
    el('proposal-text').textContent = next;
    el('proposal').hidden = false;
    setStatus(el('model-status'), messages.suggestionsReady);
  } catch {
    if (active()) setStatus(el('model-status'), messages.modelError);
  } finally {
    setBusy(false);
    if (!active()) setStatus(el('model-status'), messages.staleSuggestions);
  }
};

el('apply').onclick = () => {
  if (!proposal || proposal.original !== draft.value) return;
  invalidateCloud();
  el('tracker-outcome').value = '';
  draft.value = proposal.next;
  clearProposal();
  const hadConsent = revoke();
  setStatus(reviewStatus);
  setStatus(el('model-status'), hadConsent ? [
    `Additional redactions applied. ${messages.draftRevoked[0]}`,
    `추가 가림 제안을 적용했습니다. ${messages.draftRevoked[1]}`,
  ] : messages.applied);
  draft.focus();
};
