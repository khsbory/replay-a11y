import { expect, test } from '@playwright/test';

const raw = 'Before: Collapsed, button\nAfter: Expanded, button\nCustomer name: Avery Example\nAddress: 101 Sample Street\nUNAPPROVED_CANARY';
const edited = 'Before: Filters, collapsed, button\nAfter: Filters, expanded, button\nUNAPPROVED_DRAFT';
const quotes = { before: 'Filters, collapsed, button', after: 'Filters, expanded, button' };
const config = { projectId: 'replay-demo-invalid', appId: '1:000000000000:web:0000000000000000000000', apiKey: `AIza${'x'.repeat(35)}` };
const card = {
  en: { ...quotes, impact: '<b>The expanded state helps users expect the filter panel.</b>', retest: ['Focus Filters with the same screen reader.', 'Activate the button and compare the state announcement.'], fix: 'If the state is stale, inspect whether aria-expanded tracks the panel.' },
  ko: { ...quotes, impact: '펼침 상태가 필터 패널을 예고합니다.', retest: ['같은 스크린리더에서 필터를 실행합니다.', '펼침 상태가 읽히는지 비교합니다.'], fix: '상태가 다르면 펼침 속성을 확인합니다.' },
};

async function setup(page, baseURL, variant = 'success') {
  const gate = Promise.withResolvers();
  const reads = [], posts = [], other = [], exchanges = [];
  await page.context().route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === baseURL) {
      if (url.pathname !== '/__/firebase/init.json') return route.continue();
      reads.push(req);
      if (/^pending/.test(variant)) await gate.promise;
      const settings = variant === 'wrong-app' ? { ...config, appId: 'unexpected-app' } : config;
      return route.fulfill({ json: settings }).catch(() => {});
    }
    if (url.href === 'https://www.google.com/recaptcha/enterprise.js?render=explicit') {
      return route.fulfill({ contentType: 'application/javascript', body: `window.relayIsolation = [window.opener === null, location.hash, document.querySelectorAll('textarea').length]; window.grecaptcha = {enterprise: {ready: fn => fn(), render: (_, o) => {o.callback(); return 1}, execute: async () => 'fake-recaptcha'}}` });
    }
    if (url.origin + url.pathname === `https://content-firebaseappcheck.googleapis.com/v1/projects/${config.projectId}/apps/${config.appId}:exchangeRecaptchaEnterpriseToken` && req.method() === 'POST') {
      exchanges.push(req.postDataJSON());
      return route.fulfill({ json: { token: 'intercepted-app-check', ttl: '3600s' } });
    }
    if (url.href === `https://firebasevertexai.googleapis.com/v1beta/projects/${config.projectId}/models/gemini-3.5-flash-lite:generateContent` && req.method() === 'POST') {
      posts.push(req);
      if (variant === 'late') await gate.promise;
      if (variant === 'http') return route.fulfill({ status: 503, json: { error: { message: 'HIDDEN_ERROR' } } });
      const result = structuredClone(card);
      if (variant === 'altered') result.ko.before += '.';
      if (variant === 'incomplete') delete result.en.fix;
      const text = variant === 'malformed' ? 'not json' : JSON.stringify(result);
      return route.fulfill({ json: { candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }] } }).catch(() => {});
    }
    other.push(req.url());
    return route.abort();
  });
  await page.goto('/');
  await page.locator('#source').fill(raw);
  await page.locator('#prepare').click();
  await page.locator('#draft').fill(edited);
  await page.locator('#cloud-preview-button').click({ timeout: 3500 });
  return { gate, reads, posts, other, exchanges };
}

async function send(page) {
  await page.locator('#cloud-approve').check();
  const popup = page.context().waitForEvent('page');
  await page.locator('#cloud-send').click();
  return popup;
}

test('connected card uses the edited comparison; approval alone stays offline', async ({ page, baseURL }) => {
  const network = await setup(page, baseURL);
  const exact = await page.locator('#cloud-outgoing').textContent();
  expect(exact).toContain(`Before: ${quotes.before}\nAfter: ${quotes.after}`);
  expect(exact.length).toBeLessThanOrEqual(1000);
  expect(exact).not.toMatch(/Avery|Sample Street|UNAPPROVED/);
  await expect(page.locator('#consent')).not.toBeChecked();
  await expect(page.locator('#cloud-send')).toBeDisabled();
  await page.locator('#cloud-approve').check();
  await page.locator('#cloud-send').evaluate(b => b.click());
  expect(page.context().pages()).toHaveLength(1);
  expect(network.reads).toHaveLength(0);
  const relay = await send(page);
  await expect(page.locator('#connected-result')).toBeVisible();
  await expect(page.locator('#connected-source')).toContainText('IN_CLOUD');
  expect(network.reads).toHaveLength(1);
  expect(network.posts).toHaveLength(1);
  expect(await relay.evaluate(() => window.relayIsolation)).toEqual([true, '', 0]);
  expect(await relay.locator('body').innerText()).not.toMatch(/Filters|Avery|Sample Street/);
  const post = network.posts[0];
  expect(post.postDataJSON()).toEqual({ generationConfig: { responseMimeType: 'application/json' }, safetySettings: [], contents: [{ role: 'user', parts: [{ text: exact }] }] });
  expect(post.headers()['x-firebase-appcheck']).toBe('intercepted-app-check');
  expect(network.exchanges).toEqual([{ recaptcha_enterprise_token: 'fake-recaptcha' }]);
  expect(network.other).toEqual([]);
  for (const lang of ['en', 'ko']) expect(await page.locator(`#connected-card article[lang=${lang}] dd`).allTextContents()).toEqual(Object.values(quotes));
  await expect(page.locator('#connected-card b')).toHaveCount(0);
  await expect(page.locator('#connected-card')).toContainText(card.en.impact);
});

test('mismatched Hosting app fails closed before attestation', async ({ page, baseURL }) => {
  const { reads, posts, exchanges, other } = await setup(page, baseURL, 'wrong-app');
  await send(page);
  await expect(page.locator('#connected-status')).toContainText('클라우드 카드를 만들지 못했습니다');
  await expect(page.locator('#connected-result')).toBeHidden();
  await expect(page.locator('#cloud-approve')).not.toBeChecked();
  expect(reads).toHaveLength(1);
  expect([posts, exchanges, other]).toEqual([[], [], []]);
});

test('preview refuses known private content in a selected quote', async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.locator('#draft').fill('Before: Avery Example\nAfter: Filters, button');
  await page.locator('#cloud-preview-button').click();
  await expect(page.locator('#cloud-preview')).toBeHidden();
  await expect(page.locator('#connected-status')).toContainText('개인정보');
});

for (const id of ['source', 'draft']) test(`${id} edit invalidates the approval before Send`, async ({ page, baseURL }) => {
  const { reads, posts } = await setup(page, baseURL);
  await page.locator('#cloud-approve').check();
  await page.locator(`#${id}`).press('End');
  await page.locator(`#${id}`).press('Space');
  await expect(page.locator('#cloud-approve')).not.toBeChecked();
  await expect(page.locator('#cloud-send')).toBeDisabled();
  expect([reads.length, posts.length]).toEqual([0, 0]);
});

for (const [variant, change, expectedPosts] of [
  ['pending-uncheck', page => page.locator('#cloud-approve').uncheck(), 0],
  ['pending-draft', page => page.locator('#draft').fill('Before: Options\nAfter: More options'), 0],
  ['pending-source', page => page.locator('#source').fill('Before: Options\nAfter: More options'), 0],
  ['late', page => page.locator('#cloud-approve').uncheck(), 1],
]) test(`withdrawn work cannot publish: ${variant}`, async ({ page, baseURL }) => {
  const { gate, reads, posts } = await setup(page, baseURL, variant);
  const relay = await send(page);
  await expect.poll(() => (expectedPosts ? posts : reads).length).toBe(1);
  await change(page);
  await expect(relay.locator('#relay-status')).toContainText('Withdrawn');
  gate.resolve();
  await expect(page.locator('#connected-result')).toBeHidden();
  await expect(page.locator('#cloud-send')).toBeDisabled();
  expect(posts).toHaveLength(expectedPosts);
});

for (const variant of ['altered', 'incomplete', 'malformed', 'http']) test(`provider ${variant} consumes approval and never renders a card`, async ({ page, baseURL }) => {
  const { posts } = await setup(page, baseURL, variant);
  await send(page);
  await expect(page.locator('#connected-status')).toContainText('클라우드 카드를 만들지 못했습니다');
  await expect(page.locator('#connected-result')).toBeHidden();
  await expect(page.locator('#cloud-approve')).not.toBeChecked();
  await expect(page.locator('#cloud-send')).toBeDisabled();
  expect(posts).toHaveLength(1);
});
