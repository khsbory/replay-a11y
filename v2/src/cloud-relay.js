import { readGrantedPrompt, validateConnectedCard } from './connected-card.js';

const status = document.getElementById('relay-status');
const key = location.hash.slice(1);
// Strip the capability before any provider script loads. Do not accept a query-string or an opener.
history.replaceState(null, '', '/cloud-relay.html');
document.getElementById('relay-close').onclick = () => window.close();

if (window.opener === null && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(key) && __RECAPTCHA_SITE_KEY__) {
  startRelay(key);
} else {
  status.textContent = 'No active approval or App Check configuration. Return to the workspace.';
}

function startRelay(key) {
  const channel = new BroadcastChannel(`replay-relay-${key}`);
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(42_000)]);
  let phase = 'ready';
  let app;
  let appSdk;
  let ai;
  let model;
  function finish(text, result) {
    if (phase === 'done') return;
    phase = 'done';
    status.textContent = text;
    if (result) channel.postMessage(result);
    controller.abort();
    channel.close();
    if (app) void appSdk.deleteApp(app).catch(() => {});
  }
  const fail = () => finish('No cloud card was generated. Return to the workspace.', { type: 'failed' });
  signal.addEventListener('abort', fail, { once: true });
  addEventListener('pagehide', fail, { once: true });

  async function prepare() {
    const reply = await fetch('/__/firebase/init.json', {
      method: 'GET', mode: 'same-origin', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
      signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    });
    if (!reply.ok) throw new Error('Missing settings');
    const { projectId, appId, apiKey } = await reply.json();
    if (projectId !== __CLOUD_PROJECT_ID__ || appId !== __CLOUD_APP_ID__ || typeof apiKey !== 'string' || !/^AIza[A-Za-z0-9_-]{35}$/.test(apiKey)) throw new Error('Unexpected settings');
    let check;
    [appSdk, ai, check] = await Promise.all([import('firebase/app'), import('firebase/ai'), import('firebase/app-check')]);
    signal.throwIfAborted();
    if (globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN) throw new Error('Debug App Check forbidden');
    app = appSdk.initializeApp({ projectId, appId, apiKey }, { automaticDataCollectionEnabled: false });
    const attestation = check.initializeAppCheck(app, {
      provider: new check.ReCaptchaEnterpriseProvider(__RECAPTCHA_SITE_KEY__), isTokenAutoRefreshEnabled: false,
    });
    status.textContent = 'Verifying this browser with App Check…';
    await check.getToken(attestation);
    signal.throwIfAborted();
    const service = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
    model = ai.getGenerativeModel(service, {
      mode: ai.InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: { model: __CLOUD_MODEL__, generationConfig: { responseMimeType: 'application/json' } },
    });
    phase = 'waiting';
    channel.postMessage({ type: 'grant-request' });
  }

  channel.onmessage = async ({ data }) => {
    if (data?.type === 'revoke') return finish('Withdrawn. No cloud card will be displayed.');
    try {
      if (data?.type === 'prepare' && phase === 'ready') {
        phase = 'attesting';
        await prepare();
      } else if (data?.type === 'grant' && phase === 'waiting') {
        phase = 'generating';
        const prompt = data.prompt;
        const pair = readGrantedPrompt(prompt);
        if (!pair) return fail();
        signal.throwIfAborted();
        status.textContent = 'Waiting for Gemini…';
        const { response } = await model.generateContent(prompt, { signal, timeout: 25_000 });
        signal.throwIfAborted();
        if (response.inferenceSource !== ai.InferenceSource.IN_CLOUD || response.candidates?.length !== 1 || response.candidates[0].finishReason !== 'STOP') return fail();
        const text = response.text();
        const card = text.length <= 16_000 && validateConnectedCard(JSON.parse(text), pair);
        if (!card) return fail();
        finish('Cloud card received. Return to the workspace.', { type: 'result', source: 'IN_CLOUD', card });
      }
    } catch {
      fail();
    }
  };
  channel.postMessage({ type: 'ready' });
}
