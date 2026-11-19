import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const path = file => fileURLToPath(new URL(file, import.meta.url));
const model = 'gemini-3.5-flash-lite';
const offlinePolicy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
const cloudPages = new Set(['approved-demo.html', 'cloud-relay.html']);

async function cloudSettings(mode) {
  if (mode === 'release-test') return {
    projectId: 'replay-demo-invalid', appId: '1:000000000000:web:0000000000000000000000', siteKey: 'synthetic-site-id-for-tests-only',
  };
  if (mode !== 'connected-live') return { projectId: '', appId: '', siteKey: '' };
  let settings;
  try {
    settings = JSON.parse(await readFile(path('./cloud-config.json.local'), 'utf8'));
  } catch {
    throw new Error('Connected live mode requires a readable cloud-config.json.local with valid JSON.');
  }
  const valid = (value, pattern) => typeof value === 'string' && pattern.test(value);
  if (!settings || Object.keys(settings).sort().join(',') !== 'appId,projectId,siteKey' ||
      !valid(settings.projectId, /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/) ||
      !valid(settings.appId, /^1:[0-9]+:web:[a-f0-9]+$/) ||
      !valid(settings.siteKey, /^[A-Za-z0-9_-]{20,100}$/)) {
    throw new Error('Connected live mode expects only projectId, appId and the public reCAPTCHA Enterprise siteKey.');
  }
  return settings;
}

function cloudPolicy({ projectId, appId }) {
  const check = `https://content-firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps/${appId}:exchangeRecaptchaEnterpriseToken`;
  const inference = `https://firebasevertexai.googleapis.com/v1beta/projects/${projectId}/models/${model}:generateContent`;
  return offlinePolicy
    .replace("script-src 'self'", "script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/")
    .replace("connect-src 'none'", `frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; connect-src 'self' https://www.google.com/recaptcha/ ${check} ${inference}`);
}

export default defineConfig(async ({ mode }) => {
  const settings = await cloudSettings(mode);
  return {
    define: {
      __RECAPTCHA_SITE_KEY__: JSON.stringify(settings.siteKey),
      __CLOUD_PROJECT_ID__: JSON.stringify(settings.projectId),
      __CLOUD_APP_ID__: JSON.stringify(settings.appId),
      __CLOUD_MODEL__: JSON.stringify(model),
    },
    publicDir: false, // No implicit copy of sources, evidence or project files.
    build: {
      outDir: mode === 'release-test' ? 'dist-test' : 'dist',
      sourcemap: false,
      rollupOptions: { input: [path('./index.html'), ...Array.from(cloudPages, name => path(`./${name}`))] },
    },
    plugins: [{
      name: 'configured-cloud-policy',
      transformIndexHtml(html, { path: htmlPath }) {
        if (!settings.siteKey || !cloudPages.has(htmlPath.slice(1))) return;
        if (!html.includes(offlinePolicy)) throw new Error('Cloud page is missing its restrictive default policy.');
        return html.replace(offlinePolicy, cloudPolicy(settings));
      },
    }, {
      name: 'approved-phone-pages',
      apply: 'build',
      async generateBundle() {
        for (const name of ['before', 'after']) {
          const source = await readFile(path(`../phone/${name}.html`));
          this.emitFile({ type: 'asset', fileName: `${name}.html`, source });
        }
      },
    }],
  };
});
