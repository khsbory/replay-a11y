import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const raw = 'Before: Collapsed, button\nAfter: Expanded, button\nCustomer name: Avery Example\nAddress: 101 Sample Street\nUNAPPROVED_CANARY';
const edited = 'Before: Button\nAfter: Filters, button\nUNAPPROVED_DRAFT';
const quotes = { before: 'Button', after: 'Filters, button' };
const config = { projectId: 'replay-demo-invalid', appId: '1:000000000000:web:0000000000000000000000', apiKey: `AIza${'x'.repeat(35)}` };
const card = {
  en: { ...quotes, impact: '<b>A descriptive label helps users identify the control.</b>', retest: ['Focus Filters with the same screen reader.', 'Compare the name and role in each version.'], fix: 'If inspection confirms the accessible name is missing or unclear, use a descriptive name.' },
  ko: { ...quotes, impact: '버튼 이름을 들으면 기능을 알 수 있습니다.', retest: ['같은 스크린리더에서 필터를 실행합니다.', '이름과 역할이 읽히는지 비교합니다.'], fix: '검사 결과 접근 가능한 이름이 없거나 불분명하다면, 의미를 설명하는 이름을 붙입니다.' },
};

async function setup(page, baseURL, variant = 'success', locale = 'ko') {
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
      if (variant === 'late' || variant.startsWith('locale-')) await gate.promise;
      if (variant === 'http' || variant === 'locale-failure') return route.fulfill({ status: 503, json: { error: { message: 'HIDDEN_ERROR' } } });
      const result = structuredClone(card);
      if (variant === 'altered') result.ko.before += '.';
      if (variant === 'incomplete') delete result.en.fix;
      const text = variant === 'malformed' ? 'not json' : JSON.stringify(result);
      return route.fulfill({ json: { candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }] } }).catch(() => {});
    }
    other.push(req.url());
    return route.abort();
  });
  await page.goto(locale === 'ko' ? '/#ko' : '/');
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
  const exact = await page.locator('#cloud-utterances, #cloud-outgoing').allTextContents().then(parts => parts.join(''));
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
  await relay.locator('#ui-language').press('Enter'); // Keep the original English relay assertion.
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

for (const locale of ['en', 'ko']) for (const outcome of ['success', 'failure']) {
  test(`bilingual keyboard/axe: ${locale} relay ${outcome}, switch during inference`, async ({ page, baseURL }) => {
    const { gate, posts } = await setup(page, baseURL, `locale-${outcome}`, locale);
    const audit = async (target, stage) => {
      expect((await new AxeBuilder({ page: target }).analyze()).violations, stage).toEqual([]);
    };
    const approve = page.locator('#cloud-approve');
    const exact = await page.locator('#cloud-utterances, #cloud-outgoing').allTextContents().then(parts => parts.join(''));
    await page.keyboard.press('Tab');
    await expect(page.locator('#cloud-copy')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(approve).toBeFocused();
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await expect(page.locator('#cloud-send')).toBeFocused();
    const popup = page.context().waitForEvent('page');
    await page.keyboard.press('Enter');
    const relay = await popup;
    try {
      await expect.poll(() => posts.length).toBe(1);
      await expect(relay.locator('html')).toHaveAttribute('lang', locale);
      await expect(relay.locator('#relay-status')).toHaveText(locale === 'en' ? 'Waiting for Gemini…' : 'Gemini 응답을 기다리는 중입니다…');
      await expect(approve).toBeFocused();
      await audit(relay, 'relay pending');
      await audit(page, 'workspace pending');
      await page.locator('#ui-language').press('Enter');
      await relay.locator('#ui-language').press('Space');
      await expect(approve).toBeChecked();
      await expect(page.locator('#cloud-send')).toBeDisabled();
      await expect(page.locator('#connected-status')).toHaveText(locale === 'en' ? '승인한 문구에 대해 Gemini 응답을 기다리고 있습니다.' : 'Waiting for Gemini to respond to the approved text.');
      gate.resolve();
      await expect(page.locator('#connected-status')).toContainText(outcome === 'success'
        ? locale === 'en' ? '클라우드 카드를 받았습니다' : 'Cloud card received'
        : locale === 'en' ? '클라우드 카드를 만들지 못했습니다' : 'Could not make a cloud card');
      await expect(relay.locator('#relay-status')).toContainText(outcome === 'success'
        ? locale === 'en' ? '클라우드 카드를 받았습니다' : 'Cloud card received'
        : locale === 'en' ? '클라우드 카드가 만들어지지 않았습니다' : 'No cloud card was generated');
      await expect(page.locator('#ui-language')).toBeFocused();
      await expect(relay.locator('#ui-language')).toBeFocused();
      await expect(approve).not.toBeChecked();
      expect(posts[0].postDataJSON().contents[0].parts[0].text).toBe(exact);
      if (outcome === 'success') {
        await expect(page.locator('#connected-result')).toBeVisible();
        for (const lang of ['en', 'ko']) {
          expect(await page.locator(`#connected-card article[lang=${lang}] dd[lang=en]`).allTextContents()).toEqual(Object.values(quotes));
        }
      } else await expect(page.locator('#connected-result')).toBeHidden();
      await audit(page, 'workspace terminal');
      await audit(relay, 'relay terminal');
    } finally { gate.resolve(); }
  });
}
