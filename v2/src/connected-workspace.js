import { maskMetadata, metadataKeys, prepareTracker, sameMetadata, validateTracker } from './tracker-cloud.js';
import { cardOutput, trackerModel } from './tracker-card.js';
import { contentLanguage, setStatus, uiLanguage } from './ui-locale.js';

const messages = {
  failed: ["Could not make a cloud card. Review the text and approve it again before resending.", "클라우드 카드를 만들지 못했습니다. 다시 보내려면 내용을 확인하고 새로 승인해 주세요."],
  withdrawn: ["Cloud approval withdrawn. No result will be shown. A request that has already left cannot be recalled.", "클라우드 승인을 취소했습니다. 결과를 표시하지 않습니다. 이미 나간 요청은 회수할 수 없습니다."],
  pair: ["Enter the Before and After utterances on separate lines.", "수정 전과 수정 후 낭독을 각각 한 줄로 입력해 주세요."],
  privacy: ["The utterances appear to contain private information. Remove it from the draft or do not send it to the cloud.", "낭독 문구에 개인정보로 보이는 내용이 있습니다. 초안에서 제거하거나 클라우드에 보내지 마세요."],
  metadata: ["Tracker details may contain private information. Apply pattern redaction or edit them, then review again.", "이슈 카드 정보에 개인정보가 있을 수 있습니다. 패턴 가림을 적용하거나 직접 편집한 후 다시 검토해 주세요."],
  length: ["The full outgoing text, including metadata and instructions, must be at most 1,000 characters. Shorten the details or utterances.", "입력 정보와 지시문을 포함해 최대 1,000자입니다. 입력 정보나 낭독을 줄여 주세요."],
  approved: ["You approved this text. The request starts only when you press Send.", "이 문구를 승인했습니다. 전송 버튼을 눌러야 요청이 시작됩니다."],
  waiting: ["Waiting for Gemini to respond to the approved text.", "승인한 문구에 대해 Gemini 응답을 기다리고 있습니다."],
  success: ["Cloud card received. Review it below.", "클라우드 카드를 받았습니다. 아래에서 확인하세요."],
  checking: ["Checking this browser in the isolated tab. You can withdraw approval in this tab.", "격리된 탭에서 브라우저를 확인하고 있습니다. 이 탭에서 동의를 취소할 수 있습니다."],
};

const el = id => document.getElementById(id);
const original = el('source');
const draft = el('draft');
const preview = el('cloud-preview');
const utterances = el('cloud-utterances');
const outgoing = el('cloud-outgoing');
const copyStatus = el('cloud-copy-status');
const approve = el('cloud-approve');
const send = el('cloud-send');
const status = el('connected-status');
const configured = Boolean(__RECAPTCHA_SITE_KEY__);
approve.disabled = !configured;
el('cloud-disabled').hidden = configured;
let snapshot = null;
let approved = null;
let attempt = null;
export const fields = () => Object.fromEntries(metadataKeys.map(key => [key, el(`tracker-${key}`).value]));
export const outcome = () => el('tracker-outcome').value;
export const sample = () => !el('real-info').hidden;
export const safeFields = () => maskMetadata(fields(), original.value, draft.value);
const output = cardOutput(el('connected-card'), el('connected-copy'), el('connected-copy-status'));

const current = () => snapshot && snapshot.original === original.value && snapshot.draft === draft.value &&
  sameMetadata(snapshot.fields, fields()) && snapshot.outcome === outcome() && snapshot.sample === sample() &&
  utterances.textContent === snapshot.utterances && outgoing.textContent === snapshot.instructions;
const clearResult = () => {
  el('connected-result').hidden = true;
  output(null);
  el('connected-source').textContent = '';
};

function end(message, notify = false) {
  const prior = attempt;
  attempt = null;
  if (prior) {
    clearTimeout(prior.timer);
    if (notify) prior.channel.postMessage({ type: 'revoke' });
    prior.channel.close();
  }
  approved = null;
  approve.checked = false;
  send.disabled = true;
  setStatus(status, message);
}

export function invalidateCloud() {
  const message = (approved || attempt) ? messages.withdrawn : null;
  if (preview.contains(document.activeElement)) el('cloud-preview-button').focus();
  end(message, true);
  snapshot = null;
  preview.hidden = true;
  utterances.textContent = '';
  outgoing.textContent = '';
  setStatus(copyStatus);
  el('cloud-preview-button').setAttribute('aria-expanded', 'false');
  clearResult();
}

el('cloud-preview-button').addEventListener('click', event => {
  if (!event.isTrusted || el('review').hidden) return;
  invalidateCloud();
  const next = prepareTracker(original.value, draft.value, fields());
  if (next.error) {
    setStatus(status, messages[next.error]);
    return;
  }
  snapshot = { ...next, original: original.value, draft: draft.value, fields: fields(), outcome: outcome(), sample: sample() };
  // Headings are UI chrome; only the contents of these two blocks are sent.
  const quote = text => {
    const span = document.createElement('span');
    span.lang = contentLanguage(text);
    span.textContent = text;
    return span;
  };
  utterances.replaceChildren('Before: ', quote(next.pair.before), '\nAfter: ', quote(next.pair.after), '\n\n');
  outgoing.textContent = next.instructions;
  preview.hidden = false;
  el('cloud-preview-button').setAttribute('aria-expanded', 'true');
  el('cloud-preview-title').focus();
});

el('cloud-copy').addEventListener('click', async event => {
  if (!event.isTrusted || !current()) return;
  const reviewed = snapshot;
  let message;
  try {
    await navigator.clipboard.writeText(reviewed.prompt);
    message = ['Exact request text copied.', '정확한 요청 텍스트를 복사했습니다.'];
  } catch {
    message = ['Could not copy the request text.', '요청 텍스트를 복사하지 못했습니다.'];
  }
  if (snapshot === reviewed) setStatus(copyStatus, message);
});

approve.addEventListener('change', event => {
  if (!configured || !event.isTrusted) return;
  if (!approve.checked || !current() || attempt) {
    end(messages.withdrawn, true);
    clearResult();
    return;
  }
  approved = snapshot;
  send.disabled = false;
  setStatus(status, messages.approved);
});

send.addEventListener('click', event => {
  if (!configured || !event.isTrusted || !navigator.userActivation.isActive || attempt || !current() || !approve.checked || approved !== snapshot) return;
  const reviewed = approved;
  approved = null;
  if (document.activeElement === send) approve.focus();
  send.disabled = true;
  clearResult();
  try {
    const key = crypto.randomUUID();
    const channel = new BroadcastChannel(`replay-relay-${key}`);
    const active = { channel, phase: 'opened', timer: setTimeout(() => end(messages.failed, true), 45_000) };
    attempt = active;
    channel.onmessage = ({ data }) => {
      if (attempt !== active) return;
      if (!current() || snapshot !== reviewed || !approve.checked) return end(messages.withdrawn, true);
      if (data?.type === 'ready' && active.phase === 'opened') {
        active.phase = 'attesting';
        channel.postMessage({ type: 'prepare' });
      } else if (data?.type === 'grant-request' && active.phase === 'attesting') {
        active.phase = 'sent';
        channel.postMessage({ type: 'grant', prompt: reviewed.prompt });
        setStatus(status, messages.waiting);
      } else if (data?.type === 'result' && active.phase === 'sent') {
        const card = data.source === 'IN_CLOUD' && validateTracker(data.card, reviewed);
        if (!card) return end(messages.failed);
        output(trackerModel(reviewed.pair, reviewed.fields, { generated: card, outcome: reviewed.outcome, sample: reviewed.sample }));
        el('connected-source').textContent = 'Firebase AI Logic · Gemini Developer API · IN_CLOUD';
        el('connected-result').hidden = false;
        end(messages.success);
      } else if (data?.type === 'failed') {
        end(messages.failed);
      }
    };
    // Do not accept a WindowProxy. Only the random channel ID (no content) is in the fragment.
    window.open(`/cloud-relay.html#${key}${uiLanguage() === 'ko' ? '.ko' : ''}`, '_blank', 'noopener,noreferrer');
    setStatus(status, messages.checking);
  } catch {
    end(messages.failed, true);
  }
});

addEventListener('pagehide', invalidateCloud);
