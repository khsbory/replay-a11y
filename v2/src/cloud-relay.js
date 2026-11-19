import { parseTracker, readTrackerGrant } from './tracker-cloud.js';
import { initLocale, setStatus } from './ui-locale.js';

const messages = {
  inactive: ["No active approval or App Check configuration. Return to the workspace.", "활성 승인 또는 App Check 설정이 없습니다. 작업 탭으로 돌아가세요."],
  failed: ["No cloud card was generated. Return to the workspace.", "클라우드 카드가 만들어지지 않았습니다. 작업 탭으로 돌아가세요."],
  checking: ["Verifying this browser with App Check…", "App Check로 이 브라우저를 확인하는 중입니다…"],
  withdrawn: ["Withdrawn. No cloud card will be displayed.", "승인을 취소했습니다. 클라우드 카드를 표시하지 않습니다."],
  waiting: ["Waiting for Gemini…", "Gemini 응답을 기다리는 중입니다…"],
  success: ["Cloud card received. Return to the workspace.", "클라우드 카드를 받았습니다. 작업 탭으로 돌아가세요."],
};

const status = document.getElementById('relay-status');
const capability = /^#([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})(\.ko)?$/.exec(location.hash);
const key = capability?.[1];
// Strip the capability before any provider script loads. Do not accept a query-string or an opener.
history.replaceState(null, '', '/cloud-relay.html');
initLocale(capability?.[2] ? 'ko' : 'en');
document.getElementById('relay-close').onclick = () => window.close();

if (window.opener === null && key && __RECAPTCHA_SITE_KEY__) {
  startRelay(key);
} else {
  setStatus(status, messages.inactive);
}

function startRelay(key) {
  const channel = new BroadcastChannel(`replay-relay-${key}`);
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(42_000)]);
  let phase = 'ready';
  let app;
  let appSdk;
  let ai;

  function finish(text, result) {
    if (phase === 'done') return;
    phase = 'done';
    setStatus(status, text);
    if (result) channel.postMessage(result);
    controller.abort();
    channel.close();
    if (app) void appSdk.deleteApp(app).catch(() => {});
  }
  const fail = () => finish(messages.failed, { type: 'failed' });
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
    setStatus(status, messages.checking);
    await check.getToken(attestation);
    signal.throwIfAborted();

    phase = 'waiting';
    channel.postMessage({ type: 'grant-request' });
  }

  channel.onmessage = async ({ data }) => {
    if (data?.type === 'revoke') return finish(messages.withdrawn);
    try {
      if (data?.type === 'prepare' && phase === 'ready') {
        phase = 'attesting';
        await prepare();
      } else if (data?.type === 'grant' && phase === 'waiting') {
        phase = 'generating';
        const prompt = data.prompt;
        const approved = readTrackerGrant(prompt);
        if (!approved) return fail();
        signal.throwIfAborted();
        const { Schema } = ai;
        const edition = () => Schema.object({ properties: {
          summary: Schema.string(),
          steps: Schema.array({ items: Schema.string(), minItems: 1, maxItems: 4 }),
          ...(!approved.metadata.expected && { expected: Schema.string() }),
        } });
        const service = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
        const model = ai.getGenerativeModel(service, {
          mode: ai.InferenceMode.ONLY_IN_CLOUD,
          inCloudParams: { model: __CLOUD_MODEL__, generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: Schema.object({ properties: { en: edition(), ko: edition() } }),
          } },
        });
        setStatus(status, messages.waiting);
        const { response } = await model.generateContent(prompt, { signal, timeout: 25_000 });
        signal.throwIfAborted();
        if (response.inferenceSource !== ai.InferenceSource.IN_CLOUD || response.candidates?.length !== 1 || response.candidates[0].finishReason !== 'STOP') return fail();
        const text = response.text();
        const card = parseTracker(text, approved);
        if (!card) return fail();
        finish(messages.success, { type: 'result', source: 'IN_CLOUD', card });
      }
    } catch {
      fail();
    }
  };
  channel.postMessage({ type: 'ready' });
}
