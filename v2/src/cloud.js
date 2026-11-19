import process from 'node:process';
import { randomUUID } from 'node:crypto';

// Closed allowlist: never accept editor, file, log, or model-generated text.
export const CLOUD_FIXTURE = '  수정 전: 버튼\n수정 후: 배송지 변경, 버튼\n';

const dummyConfig = Object.freeze({
  projectId: 'replay-simulation-invalid',
  appId: 'replay-simulation-invalid',
  apiKey: 'not-a-real-firebase-key',
});

export function makeCloudPreparation() {
  let approval = null;

  function revoke() {
    const previous = approval;
    approval = null;
    previous?.controller.abort();
  }

  return {
    approve(text) {
      revoke();
      if (text !== CLOUD_FIXTURE) return false;
      approval = { controller: new AbortController(), used: false };
      return true;
    },
    revoke,
    async send(text) {
      if (text !== CLOUD_FIXTURE) revoke();
      const current = approval;
      if (!current || current.used) return { status: 'not-approved' };
      // Simulation only: no browser, unconfined Node, or live configuration.
      if (process.permission?.has('net') !== false) {
        revoke();
        return { status: 'network-guard-required' };
      }
      current.used = true;
      const { signal } = current.controller;
      let app;
      let deleteApp;
      let status = 'failed';
      try {
        const [appSdk, ai] = await Promise.all([import('firebase/app'), import('firebase/ai')]);
        if (signal.aborted) return { status: 'revoked' };
        ({ deleteApp } = appSdk);
        app = appSdk.initializeApp(dummyConfig, {
          name: `replay-cloud-simulation-${randomUUID()}`,
          automaticDataCollectionEnabled: false,
        });
        const service = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
        const model = ai.getGenerativeModel(service, {
          mode: ai.InferenceMode.ONLY_IN_CLOUD,
          inCloudParams: { model: 'gemini-3.5-flash-lite' },
        });
        if (signal.aborted) return { status: 'revoked' };
        const { response } = await model.generateContent(CLOUD_FIXTURE, { signal, timeout: 5_000 });
        if (!signal.aborted && response.inferenceSource === ai.InferenceSource.IN_CLOUD && response.text().trim()) {
          status = 'simulated';
        }
      } catch {
        // Do not expose or log SDK errors (which may contain provider messages).
      } finally {
        if (app) {
          try { await deleteApp(app); } catch { status = 'failed'; }
        }
        if (approval === current) approval = null;
      }
      return { status: signal.aborted ? 'revoked' : status };
    },
  };
}
