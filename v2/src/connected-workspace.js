import { prepareConnected, renderConnectedCard, validateConnectedCard } from './connected-card.js';

const el = id => document.getElementById(id);
const original = el('source');
const draft = el('draft');
const preview = el('cloud-preview');
const outgoing = el('cloud-outgoing');
const approve = el('cloud-approve');
const send = el('cloud-send');
const status = el('connected-status');
const configured = Boolean(__RECAPTCHA_SITE_KEY__);
approve.disabled = !configured;
el('cloud-disabled').hidden = configured;
let snapshot = null;
let approved = null;
let attempt = null;

const current = () => snapshot && snapshot.original === original.value && snapshot.draft === draft.value && outgoing.textContent === snapshot.prompt;
const clearResult = () => {
  el('connected-result').hidden = true;
  el('connected-card').replaceChildren();
  el('connected-source').textContent = '';
};
const failed = '클라우드 카드를 만들지 못했습니다. 다시 보내려면 내용을 확인하고 새로 승인해 주세요.';
const withdrawn = '클라우드 승인을 취소했습니다. 결과를 표시하지 않습니다. 이미 나간 요청은 회수할 수 없습니다.';

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
  status.textContent = message;
}

export function invalidateCloud() {
  const message = (approved || attempt) ? withdrawn : '';
  if (preview.contains(document.activeElement)) el('cloud-preview-button').focus();
  end(message, true);
  snapshot = null;
  preview.hidden = true;
  outgoing.textContent = '';
  el('cloud-preview-button').setAttribute('aria-expanded', 'false');
  clearResult();
}

el('cloud-preview-button').addEventListener('click', event => {
  if (!event.isTrusted || el('review').hidden) return;
  invalidateCloud();
  const next = prepareConnected(original.value, draft.value);
  if (next.error) {
    status.textContent = {
      pair: '수정 전과 수정 후 낭독을 각각 한 줄로 입력해 주세요.',
      privacy: '낭독 문구에 개인정보로 보이는 내용이 있습니다. 초안에서 제거하거나 클라우드에 보내지 마세요.',
      length: '전송 텍스트는 지시문을 포함해 최대 1,000자입니다. 낭독 문구를 줄여 주세요.',
    }[next.error];
    return;
  }
  snapshot = { ...next, original: original.value, draft: draft.value };
  outgoing.textContent = snapshot.prompt;
  preview.hidden = false;
  el('cloud-preview-button').setAttribute('aria-expanded', 'true');
  el('cloud-preview-title').focus();
});

approve.addEventListener('change', event => {
  if (!configured || !event.isTrusted) return;
  if (!approve.checked || !current() || attempt) {
    end(withdrawn, true);
    clearResult();
    return;
  }
  approved = snapshot;
  send.disabled = false;
  status.textContent = '이 문구를 승인했습니다. 전송 버튼을 눌러야 요청이 시작됩니다.';
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
    const active = { channel, phase: 'opened', timer: setTimeout(() => end(failed, true), 45_000) };
    attempt = active;
    channel.onmessage = ({ data }) => {
      if (attempt !== active) return;
      if (!current() || snapshot !== reviewed || !approve.checked) return end(withdrawn, true);
      if (data?.type === 'ready' && active.phase === 'opened') {
        active.phase = 'attesting';
        channel.postMessage({ type: 'prepare' });
      } else if (data?.type === 'grant-request' && active.phase === 'attesting') {
        active.phase = 'sent';
        channel.postMessage({ type: 'grant', prompt: reviewed.prompt });
        status.textContent = '승인한 문구에 대해 Gemini 응답을 기다리고 있습니다.';
      } else if (data?.type === 'result' && active.phase === 'sent') {
        const card = data.source === 'IN_CLOUD' && validateConnectedCard(data.card, reviewed.pair);
        if (!card) return end(failed);
        renderConnectedCard(el('connected-card'), card);
        el('connected-source').textContent = 'Firebase AI Logic · Gemini Developer API · IN_CLOUD';
        el('connected-result').hidden = false;
        end('클라우드 카드를 받았습니다. 아래에서 확인하세요.');
      } else if (data?.type === 'failed') {
        end(failed);
      }
    };
    // Do not accept a WindowProxy. Only the random channel ID (no content) is in the fragment.
    window.open(`/cloud-relay.html#${key}`, '_blank', 'noopener,noreferrer');
    status.textContent = '격리된 탭에서 브라우저를 확인하고 있습니다. 이 탭에서 동의를 취소할 수 있습니다.';
  } catch {
    end(failed, true);
  }
});

addEventListener('pagehide', invalidateCloud);
