import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const raw = 'Before: Collapsed, button\nAfter: Expanded, button\nCustomer name: Avery Example\nAddress: 101 Sample Street\nUNAPPROVED_CANARY';
const edited = 'Before: Button\nAfter: Filters, button\nUNAPPROVED_DRAFT';
const quotes = { before: 'Button', after: 'Filters, button' };
const koreanQuotes = { before: '버튼', after: '배송지 변경, 버튼' };
const wireSchema = humanExpected => {
  const str = { type: 'string', nullable: false };
  const properties = { summary: str, steps: { type: 'array', nullable: false, items: str, minItems: 1, maxItems: 4 }, ...(!humanExpected && { expected: str }) };
  const edition = { type: 'object', nullable: false, properties, required: Object.keys(properties) };
  return { type: 'object', nullable: false, properties: { en: edition, ko: edition }, required: ['en', 'ko'] };
};
const config = { projectId: 'replay-demo-invalid', appId: '1:000000000000:web:0000000000000000000000', apiKey: `AIza${'x'.repeat(35)}` };
const card = {
  en: { summary: '<b>A descriptive label helps users identify the control.</b>', steps: ['Focus the same control with the same screen reader.', 'Compare {{before}} with {{after}}.'], expected: 'Announce the control name and role.' },
  ko: { summary: '버튼 이름을 들으면 기능을 알 수 있습니다.', steps: ['같은 스크린 리더로 같은 컨트롤에 초점을 둡니다.', '수정 전후의 낭독을 비교합니다.'], expected: '컨트롤의 이름과 역할을 낭독합니다.' },
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
      if (variant.startsWith('late') || variant.startsWith('locale-')) await gate.promise;
      if (variant === 'http' || variant === 'locale-failure') return route.fulfill({ status: 503, json: { error: { message: 'HIDDEN_ERROR' } } });
      const result = structuredClone(card);
      if (variant === 'human-expected') for (const item of Object.values(result)) delete item.expected;
      if (variant === 'korean-evidence') {
        result.en.steps = ['Listen to the original announcement.', 'Compare it with the updated announcement.'];
      }
      if (variant === 'altered') result.ko.before = `${quotes.before}.`;
      if (variant === 'bare-retest') result.en.steps = ['"Button"', '"Filters, button"'];
      if (variant === 'case-body') result.en.summary = 'Only “button” is announced before.';
      if (variant === 'translated-body') result.ko.steps[1] = '“버튼”과 “필터, 버튼”을 비교합니다.';
      if (variant === 'incomplete') delete result.en.expected;
      const text = variant === 'malformed' ? 'not json' : JSON.stringify(result);
      return route.fulfill({ json: { candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }] } }).catch(() => {});
    }
    other.push(req.url());
    return route.abort();
  });
  await page.goto(locale === 'ko' ? '/#ko' : '/');
  await page.locator('#source').fill(raw);
  await page.locator('#prepare').click();
  await page.locator('#draft').fill(variant === 'korean-evidence' ? `Before: ${koreanQuotes.before}\nAfter: ${koreanQuotes.after}` : edited);
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
  expect(post.postDataJSON()).toEqual({ generationConfig: { responseMimeType: 'application/json', responseSchema: wireSchema(false) }, safetySettings: [], contents: [{ role: 'user', parts: [{ text: exact }] }] });
  expect(post.headers()['x-firebase-appcheck']).toBe('intercepted-app-check');
  expect(network.exchanges).toEqual([{ recaptcha_enterprise_token: 'fake-recaptcha' }]);
  expect(network.other).toEqual([]);
  for (const lang of ['en', 'ko']) expect(await page.locator(`#connected-card article[lang=${lang}] [data-evidence]`).allTextContents()).toEqual(Object.values(quotes).map(q => `“${q}”`));
  const enRetest = page.locator('#connected-card article[lang=en] li');
  expect(await enRetest.allTextContents()).toEqual([card.en.steps[0], 'Compare “Button” with “Filters, button”.']);
  expect(await enRetest.locator('span[lang=en]').allTextContents()).toEqual(['“Button”', '“Filters, button”']);
  await expect(page.locator('#connected-card b')).toHaveCount(0);
  await expect(page.locator('#connected-card')).toContainText(card.en.summary);
  await expect(page.locator('#connected-card')).toContainText(`AI suggestion: ${card.en.expected}`);
  await expect(page.locator('#connected-card')).toContainText(`AI 제안: ${card.ko.expected}`);
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

test('English tracker renders separate verbatim Korean evidence alongside untouched generated steps', async ({ page, baseURL }) => {
  await setup(page, baseURL, 'korean-evidence');
  await send(page);
  const english = page.locator('#connected-card article[lang=en]');
  await expect(english).toBeVisible();
  expect(await english.locator('[data-evidence][lang=ko]').allTextContents()).toEqual(['“버튼”', '“배송지 변경, 버튼”']);
  expect(await english.locator('li').allTextContents()).toEqual(['Listen to the original announcement.', 'Compare it with the updated announcement.']);
});

test('preview refuses known private content in a selected quote', async ({ page, baseURL }) => {
  await setup(page, baseURL);
  await page.locator('#draft').fill('Before: Avery Example\nAfter: Filters, button');
  await page.locator('#cloud-preview-button').click();
  await expect(page.locator('#cloud-preview')).toBeHidden();
  await expect(page.locator('#connected-status')).toContainText('개인정보');
});

test('approved metadata and human expectation reach the SDK exactly', async ({ page, baseURL }) => {
  const { posts } = await setup(page, baseURL, 'human-expected', 'en');
  const input = key => page.locator(`#tracker-${key}`);
  for (const [key, value] of Object.entries({ device: 'Samsung Galaxy S23', os: 'Android 16', browser: 'WebView 152.0.7977.8', reader: 'Samsung TalkBack 16.2.00.12', tested: 'user@example.invalid', notes: 'Avery Example', expected: 'qa@example.invalid' })) await input(key).fill(value);
  const preview = page.locator('#cloud-preview-button');
  await preview.click();
  await expect(page.locator('#cloud-preview')).toBeHidden();
  await expect(page.locator('#connected-status')).toContainText('private information');
  await page.locator('#tracker-mask').click();
  for (const key of ['tested', 'notes', 'expected']) await expect(input(key)).toHaveValue('[Private detail redacted]');
  const expected = '**Name** plus role\nKeep  this exact.';
  await input('expected').fill(expected);
  await input('tested').fill('154.0.8029.0');
  await input('outcome').selectOption('met');
  await preview.click();
  const exact = await page.locator('#cloud-utterances, #cloud-outgoing').allTextContents().then(parts => parts.join(''));
  for (const value of ['Samsung Galaxy S23', 'Android 16', '152.0.7977.8', '16.2.00.12', '154.0.8029.0', JSON.stringify(expected), '[Private detail redacted]']) expect(exact).toContain(value);
  expect(exact).not.toMatch(/example\.invalid|Avery Example/);
  await send(page);
  const target = page.locator('#connected-card');
  await expect(target).toBeVisible();
  expect(posts[0].postDataJSON().generationConfig.responseSchema).toEqual(wireSchema(true));
  expect(posts[0].postDataJSON().contents[0].parts[0].text).toBe(exact);
  for (const lang of ['en', 'ko']) {
    const article = target.locator(`article[lang=${lang}]`);
    expect(await article.locator('h4').count()).toBe(6);
    expect(await article.locator('p').allTextContents()).toContain(expected);
  }
  await expect(target).not.toContainText(/AI suggestion|AI 제안/);
  await expect(target).toContainText('Confirmed resolved in 154.0.8029.0. Retest announcement (after): “Filters, button”');
});

for (const id of ['source', 'draft', 'tracker-device', 'tracker-os', 'tracker-browser', 'tracker-reader', 'tracker-notes', 'tracker-expected', 'tracker-tested']) test(`${id} edit invalidates the approval before Send`, async ({ page, baseURL }) => {
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
  ['pending-version', page => page.locator('#tracker-tested').fill('154.0.8029.0'), 0],
  ['late', page => page.locator('#cloud-approve').uncheck(), 1],
  ['late-notes', page => page.locator('#tracker-notes').fill('Edited while waiting'), 1],
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

for (const variant of ['altered', 'translated-body', 'bare-retest', 'case-body', 'incomplete', 'malformed', 'http']) test(`provider ${variant} consumes approval and never renders a card`, async ({ page, baseURL }) => {
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
          expect(await page.locator(`#connected-card article[lang=${lang}] [data-evidence][lang=en]`).allTextContents()).toEqual(Object.values(quotes).map(q => `“${q}”`));
        }
      } else await expect(page.locator('#connected-result')).toBeHidden();
      await audit(page, 'workspace terminal');
      await audit(relay, 'relay terminal');
    } finally { gate.resolve(); }
  });
}
