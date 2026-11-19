import { CLOUD_FIXES, DELIVERY_OBSERVATIONS, readRecommendation, renderReport } from './report.js';
import { initLocale, setStatus } from './ui-locale.js';

const messages = {
  unconfigured: ["Live cloud demo unavailable: production App Check is not configured in this build.", "이 빌드에는 운영 App Check가 설정되지 않아 클라우드 데모를 사용할 수 없습니다."],
  withdrawn: ["Approval withdrawn. No card will be shown. If a request already left this page, it cannot be recalled.", "승인을 취소했습니다. 카드를 표시하지 않습니다. 이미 나간 요청은 회수할 수 없습니다."],
  approved: ["Sample approved. Use Send to start the cloud request.", "샘플을 승인했습니다. 전송 버튼을 눌러 클라우드 요청을 시작하세요."],
  notSent: ["Approval withdrawn. Nothing was sent with this approval.", "승인을 취소했습니다. 이 승인으로 보낸 내용은 없습니다."],
  preparing: ["Preparing the approved cloud request…", "승인한 클라우드 요청을 준비하는 중입니다…"],
  checking: ["Verifying this browser with App Check…", "App Check로 이 브라우저를 확인하는 중입니다…"],
  waiting: ["Waiting for Gemini in the cloud…", "클라우드에서 Gemini 응답을 기다리는 중입니다…"],
  source: ["Source: Firebase AI Logic · Gemini Developer API · cloud (IN_CLOUD)", "출처: Firebase AI Logic · Gemini Developer API · 클라우드 (IN_CLOUD)"],
  success: ["Cloud issue card received.", "클라우드 이슈 카드를 받았습니다."],
  failed: ["Live cloud demo unavailable for this attempt. No cloud card was generated; see the saved example below.", "이번에는 클라우드 데모를 사용할 수 없습니다. 클라우드 카드가 만들어지지 않았습니다. 아래 저장된 예시를 확인하세요."],
};

initLocale();

const PROJECT = __CLOUD_PROJECT_ID__;
const MODEL = __CLOUD_MODEL__;
const FIXTURE = `Before: ${DELIVERY_OBSERVATIONS.before}\nAfter: ${DELIVERY_OBSERVATIONS.after}`;
const INSTRUCTION = 'Choose a tentative recommendation for this synthetic screen reader comparison. Return only JSON with a fix value: visible_label (give the button descriptive visible text) or programmatic_name (give an icon-only button a matching accessible name). Do not infer the cause from the log.';
const PROMPT = `${INSTRUCTION}\n\n${FIXTURE}`;

const select = document.querySelector('#select-figure');
const preview = document.querySelector('#preview');
const outgoing = document.querySelector('#outgoing-preview');
const approval = document.querySelector('#approve');
const send = document.querySelector('#send');
const status = document.querySelector('#cloud-status');
const result = document.querySelector('#cloud-result');
const source = document.querySelector('#inference-source');
const card = document.querySelector('#card-text');
const resultTitle = document.querySelector('#result-title');
const fallback = document.querySelector('#verified-fallback');
renderReport(document.querySelector('#verified-card'), DELIVERY_OBSERVATIONS, { delivery: true, fix: 'visible_label' });
const SITE_KEY = __RECAPTCHA_SITE_KEY__;
approval.disabled = !SITE_KEY;
if (!SITE_KEY) {
  setStatus(status, messages.unconfigured);
  fallback.open = true;
}

let selected = false;
let approved = false;
let attempt = null;
let attemptNumber = 0;

function revoke() {
  approved = false;
  const previous = attempt;
  attempt = null;
  previous?.abort();
  send.disabled = true;
}

function clearResult() {
  result.hidden = true;
  setStatus(source);
  card.textContent = '';
}

select.addEventListener('click', event => {
  if (!event.isTrusted || selected) return;
  selected = true;
  outgoing.textContent = PROMPT;
  approval.checked = false;
  preview.hidden = false;
  select.setAttribute('aria-expanded', 'true');
  document.querySelector('#preview-title').focus();
});

approval.addEventListener('change', event => {
  if (!event.isTrusted || !selected) return;
  if (attempt && !approval.checked) {
    revoke();
    setStatus(status, messages.withdrawn);
    return;
  }
  approved = Boolean(SITE_KEY) && !attempt && approval.checked && outgoing.textContent === PROMPT;
  send.disabled = !approved;
  if (approved) setStatus(status, messages.approved);
  else if (!approval.checked) setStatus(status, messages.notSent);
});

async function readSettings(signal) {
  const response = await fetch('/__/firebase/init.json', {
    method: 'GET', mode: 'same-origin', credentials: 'omit', redirect: 'error',
    cache: 'no-store', referrerPolicy: 'no-referrer',
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
  });
  if (!response.ok) throw new Error('Settings unavailable');
  const { projectId, appId, apiKey } = await response.json();
  if (projectId !== PROJECT || appId !== __CLOUD_APP_ID__ ||
      typeof apiKey !== 'string' || !/^AIza[A-Za-z0-9_-]{35}$/.test(apiKey)) {
    throw new Error('Invalid web settings');
  }
  return { projectId: PROJECT, appId, apiKey };
}

send.addEventListener('click', async event => {
  if (!event.isTrusted || !selected || !approved || !approval.checked || attempt || outgoing.textContent !== PROMPT) return;
  approved = false;
  // Leave keyboard focus on the control that can still withdraw approval.
  if (document.activeElement === send) approval.focus();
  send.disabled = true;
  clearResult();
  setStatus(status, messages.preparing);
  const current = new AbortController();
  const appName = `replay-approved-cloud-${++attemptNumber}`;
  attempt = current;
  const { signal } = current;
  let app;
  let appSdk;
  try {
    const settings = await readSettings(signal);
    signal.throwIfAborted();
    const { signal: deadline } = { signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]) };
    let ai, check;
    [appSdk, ai, check] = await Promise.all([import('firebase/app'), import('firebase/ai'), import('firebase/app-check')]);
    signal.throwIfAborted();
    app = appSdk.initializeApp(settings, { name: appName, automaticDataCollectionEnabled: false });
    if (globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN) throw new Error('Debug App Check is not allowed');
    const attestation = check.initializeAppCheck(app, {
      provider: new check.ReCaptchaEnterpriseProvider(SITE_KEY), isTokenAutoRefreshEnabled: false,
    });
    setStatus(status, messages.checking);
    deadline.throwIfAborted();
    let onAbort;
    try {
      await Promise.race([check.getToken(attestation), new Promise((_, reject) => {
        onAbort = () => reject(deadline.reason);
        deadline.addEventListener('abort', onAbort, { once: true });
      })]);
    } finally {
      deadline.removeEventListener('abort', onAbort);
    }
    signal.throwIfAborted();
    const service = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
    const model = ai.getGenerativeModel(service, {
      mode: ai.InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ai.Schema.object({ properties: { fix: ai.Schema.enumString({ enum: CLOUD_FIXES }) } }),
        },
      },
    });
    signal.throwIfAborted();
    setStatus(status, messages.waiting);
    const { response } = await model.generateContent(PROMPT, { signal, timeout: 25_000 });
    signal.throwIfAborted();
    if (response.inferenceSource !== ai.InferenceSource.IN_CLOUD) throw new Error('Unverified inference source');
    const fix = readRecommendation(response.text());
    renderReport(card, DELIVERY_OBSERVATIONS, { delivery: true, fix });
    setStatus(source, messages.source);
    result.hidden = false;
    setStatus(status, messages.success);
    // Do not pull users away from wherever they moved while waiting.
    if (document.activeElement === approval) resultTitle.focus();
  } catch {
    if (!signal.aborted) {
      setStatus(status, messages.failed);
      fallback.open = true;
    }
  } finally {
    if (app) {
      try { await appSdk.deleteApp(app); } catch { /* No settings or SDK errors are exposed. */ }
    }
    if (attempt === current) {
      attempt = null;
      approval.checked = false;
    }
  }
});

addEventListener('pagehide', () => {
  revoke();
  selected = false;
  approval.checked = false;
  preview.hidden = true;
  select.setAttribute('aria-expanded', 'false');
  setStatus(status);
  clearResult();
});
