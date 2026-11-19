import { CLOUD_FIXES, DELIVERY_OBSERVATIONS, readRecommendation, renderReport } from './report.js';

const PROJECT = 'replay-demo-invalid';
const MODEL = 'gemini-3.5-flash-lite';
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
if (!SITE_KEY) {
  status.textContent = 'Live cloud demo unavailable: production App Check is not configured in this build.';
  approval.disabled = true;
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
  source.textContent = '';
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
    status.textContent = 'Approval withdrawn. No card will be shown. If a request already left this page, it cannot be recalled.';
    return;
  }
  approved = Boolean(SITE_KEY) && !attempt && approval.checked && outgoing.textContent === PROMPT;
  send.disabled = !approved;
  if (approved) status.textContent = 'Sample approved. Use Send to start the cloud request.';
  else if (!approval.checked) status.textContent = 'Approval withdrawn. Nothing was sent with this approval.';
});

async function readSettings(signal) {
  const response = await fetch('/__/firebase/init.json', {
    method: 'GET', mode: 'same-origin', credentials: 'omit', redirect: 'error',
    cache: 'no-store', referrerPolicy: 'no-referrer',
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
  });
  if (!response.ok) throw new Error('Settings unavailable');
  const { projectId, appId, apiKey } = await response.json();
  if (projectId !== PROJECT || appId !== __VERIFIED_QA_APP__ ||
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
  status.textContent = 'Preparing the approved cloud request…';
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
    status.textContent = 'Verifying this browser with App Check…';
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
    status.textContent = 'Waiting for Gemini in the cloud…';
    const { response } = await model.generateContent(PROMPT, { signal, timeout: 25_000 });
    signal.throwIfAborted();
    if (response.inferenceSource !== ai.InferenceSource.IN_CLOUD) throw new Error('Unverified inference source');
    const fix = readRecommendation(response.text());
    renderReport(card, DELIVERY_OBSERVATIONS, { delivery: true, fix });
    source.textContent = 'Source: Firebase AI Logic · Gemini Developer API · cloud (IN_CLOUD)';
    result.hidden = false;
    status.textContent = 'Cloud issue card received.';
    // Do not pull users away from wherever they moved while waiting.
    if (document.activeElement === approval) resultTitle.focus();
  } catch {
    if (!signal.aborted) {
      status.textContent = 'Live cloud demo unavailable for this attempt. No cloud card was generated; see the saved example below.';
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
  status.textContent = '';
  clearResult();
});
