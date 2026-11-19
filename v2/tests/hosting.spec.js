import { readdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const project = 'replay-demo-invalid';
const init = '/__/firebase/init.json';
const endpoint = `https://firebasevertexai.googleapis.com/v1beta/projects/${project}/models/gemini-3.5-flash-lite:generateContent`;
const config = { projectId: project, appId: '1:000000000000:web:0000000000000000000000', apiKey: `AIza${'x'.repeat(35)}` };
const attestation = `https://content-firebaseappcheck.googleapis.com/v1/projects/${project}/apps/${config.appId}:exchangeRecaptchaEnterpriseToken`;
const sample = 'Before: Button\nAfter: Change delivery address, Button';
const instruction = 'Choose a tentative recommendation for this synthetic screen reader comparison. Return only JSON with a fix value: visible_label (give the button descriptive visible text) or programmatic_name (give an icon-only button a matching accessible name). Do not infer the cause from the log.';
const result = '{"fix":"programmatic_name"}';
const canary = 'RAW_NETWORK_CANARY';
const response = text => ({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }] });

async function intercept(page, { settings = config, status = 200, reply = response(result), waitForConfig } = {}) {
  const reads = [];
  const posts = [];
  const attestations = [];
  const unexpected = [];
  // All non-loopback traffic is intercepted, never continued.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === '127.0.0.1') {
      if (url.pathname !== init) return route.continue();
      reads.push(request);
      await waitForConfig;
      return settings === null ? route.continue() : route.fulfill({ json: settings });
    }
    if (url.href === 'https://www.google.com/recaptcha/enterprise.js?render=explicit') {
      return route.fulfill({ contentType: 'application/javascript', body: `window.grecaptcha = {enterprise: {ready: fn => fn(), render: (_, o) => {o.callback(); return 1}, execute: async () => 'fake-recaptcha'}}` });
    }
    if (url.origin + url.pathname === attestation && request.method() === 'POST') {
      attestations.push(request);
      return route.fulfill({ json: { token: 'intercepted-app-check', ttl: '3600s' } });
    }
    if (url.href === endpoint && request.method() === 'POST') {
      posts.push(request);
      return route.fulfill({ status, json: reply });
    }
    unexpected.push(request.url());
    return route.abort();
  });
  return { reads, posts, attestations, unexpected };
}

const select = page => page.getByRole('button', { name: 'Select approved synthetic sample' });
const approve = page => page.getByRole('checkbox', { name: /approve sending exactly/i });
const send = page => page.getByRole('button', { name: 'Send approved sample to Gemini' });

test('judge follows the production UI, and the real SDK sends only the exact displayed prompt', async ({ page }) => {
  const { reads, posts, attestations, unexpected } = await intercept(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#source').fill(canary);
  await page.locator('#prepare').click();
  await page.locator('#draft').fill(`${canary}_EDIT`);
  const link = page.getByRole('link', { name: 'Approved cloud demo', exact: true });
  expect(await link.getAttribute('href')).toBe('/approved-demo.html');
  await link.click();
  await expect(page).toHaveURL(/\/approved-demo\.html$/);
  await expect(page.locator('textarea, input:not([type=checkbox]), [contenteditable], form, iframe')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(canary);
  await expect(send(page)).toBeHidden();
  await select(page).focus();
  await page.keyboard.press('Enter');
  const exact = `${instruction}\n\n${sample}`;
  expect(await page.locator('#outgoing-preview').textContent()).toBe(exact);
  await expect(send(page)).toBeDisabled();
  await approve(page).focus();
  await page.keyboard.press('Space');
  await expect(send(page)).toBeEnabled();
  await send(page).evaluate(button => button.click()); // untrusted DOM events cannot authorize transport
  expect([reads.length, posts.length]).toEqual([0, 0]);
  await page.keyboard.press('Tab');
  await expect(send(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cloud-result')).toBeVisible();
  for (const id of ['card-text', 'verified-card']) {
    if (id === 'verified-card') await page.getByText('View the saved bilingual example card').click();
    for (const [lang, headings] of [['en', ['Observed', 'User impact', 'Retest steps', 'Possible fix']], ['ko', ['관찰 결과', '사용자 영향', '재검증 절차', '가능한 수정']]]) {
      const variant = page.locator(`#${id} article[lang=${lang}]`);
      await expect(variant).toBeVisible();
      expect(await variant.locator('h4').allTextContents()).toEqual(headings);
      expect(await variant.locator('dd').allTextContents()).toEqual(['Button', 'Change delivery address, Button']);
      expect(await variant.locator('dd[lang=en]').count()).toBe(2);
    }
    await expect(page.locator(`#${id}`)).not.toContainText(/Avery Example|Sample Street|\[.*redacted\]/i);
  }
  await expect(page.locator('#card-text article[lang=en]')).toContainText('If the button is icon-only');
  await expect(page.locator('#verified-card article[lang=en]')).toContainText('descriptive visible label');
  await expect(page.locator('#inference-source')).toHaveText('Source: Firebase AI Logic · Gemini Developer API · cloud (IN_CLOUD)');
  expect(reads.map(req => [req.method(), req.postData()])).toEqual([['GET', null]]);
  expect(attestations.map(req => req.postDataJSON())).toEqual([{ recaptcha_enterprise_token: 'fake-recaptcha' }]);
  expect(posts[0].headers()).toMatchObject({ 'x-goog-api-key': config.apiKey, 'x-firebase-appcheck': 'intercepted-app-check' });
  expect(posts[0].headers().authorization).toBeUndefined();
  expect(posts.map(req => req.postDataJSON())).toEqual([{
    generationConfig: { responseMimeType: 'application/json', responseSchema: {
      type: 'object', nullable: false, properties: { fix: { type: 'string', enum: ['visible_label', 'programmatic_name'], nullable: false } }, required: ['fix'],
    } }, safetySettings: [], contents: [{ role: 'user', parts: [{ text: exact }] }],
  }]);
  await expect(send(page)).toBeDisabled();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

for (const scenario of ['no Hosting config', 'wrong project', 'provider error', 'empty response', 'extra model fields', 'unapproved fix', 'revoked before dispatch']) {
  test(`cloud result fails closed: ${scenario}`, async ({ page }) => {
    const delay = Promise.withResolvers();
    const revoked = scenario === 'revoked before dispatch';
    const noConfig = scenario === 'no Hosting config';
    const badConfig = scenario === 'wrong project';
    const { reads, posts, unexpected } = await intercept(page, {
      settings: noConfig ? null : badConfig ? { ...config, projectId: 'other-project' } : config,
      status: scenario === 'provider error' ? 500 : 200,
      reply: scenario === 'empty response' ? response(' ')
        : scenario === 'extra model fields' ? response('{"fix":"visible_label","observed":"Avery Example, 101 Sample Street, [Name redacted], PRIVATE_PROVIDER_CANARY"}')
        : scenario === 'unapproved fix' ? response('{"fix":"PRIVATE_PROVIDER_CANARY"}')
        : { error: { message: 'PRIVATE_PROVIDER_CANARY' } },
      waitForConfig: revoked ? delay.promise : undefined,
    });
    await page.goto(`/approved-demo.html?discard=${canary}#${canary}`);
    await select(page).click();
    await approve(page).check();
    await send(page).click();
    if (revoked) {
      await expect.poll(() => reads.length).toBe(1);
      await approve(page).uncheck();
      delay.resolve();
    }
    await expect(page.getByRole('status')).toContainText(revoked ? 'Approval withdrawn' : 'No cloud card was generated');
    await expect(page.locator('#cloud-result')).toBeHidden();
    await expect(page.locator('body')).not.toContainText('PRIVATE_PROVIDER_CANARY');
    if (!revoked) await expect(page.locator('#verified-card article[lang=ko]')).toBeVisible();
    await expect(send(page)).toBeDisabled();
    expect(reads).toHaveLength(1);
    expect(posts).toHaveLength(noConfig || badConfig || revoked ? 0 : 1);
    expect(unexpected).toEqual([]);
  });
}

test('cloud CSP blocks other Firebase API paths and only the exact immutable preview can be approved', async ({ page }) => {
  const { reads, posts, unexpected } = await intercept(page);
  await page.goto('/approved-demo.html');
  await select(page).click();
  await approve(page).check();
  await page.locator('#outgoing-preview').evaluate((el, raw) => { el.textContent = raw; }, canary);
  await send(page).click();
  expect([reads.length, posts.length]).toEqual([0, 0]);
  const blocked = await page.evaluate(url => new Promise(resolve => {
    addEventListener('securitypolicyviolation', event => resolve(event.effectiveDirective), { once: true });
    fetch(url.replace('/models/', '/alternate-path/')).catch(() => {});
  }), endpoint);
  expect(blocked).toBe('connect-src');
  expect(unexpected).toEqual([]);
});

test('public build contains only declared pages and bundled assets, including the phone accessibility comparison', async ({ page }) => {
  const dist = new URL('../dist-test/', import.meta.url);
  expect((await readdir(dist)).sort()).toEqual(['after.html', 'approved-demo.html', 'assets', 'before.html', 'index.html']);
  const main = await readFile(new URL('index.html', dist), 'utf8');
  expect(main).toContain("connect-src 'none'");
  expect(main).not.toContain('firebasevertexai.googleapis.com');
  for (const [path, name] of [['/before.html', ''], ['/after.html', 'Change delivery address']]) {
    await page.goto(path);
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    const published = await readFile(new URL(path.slice(1), dist));
    const original = await readFile(new URL(`../../phone${path}`, import.meta.url));
    expect(published.equals(original), `${path} preserves the original HTML bytes`).toBe(true);
    await expect(page.getByText('Customer name: Avery Example')).toBeVisible();
    await expect(page.getByText('Address: 101 Sample Street')).toBeVisible();
  }
  const assets = await readdir(new URL('assets/', dist));
  for (const asset of assets) expect(asset).toMatch(/\.(js|css)$/);
  const hosting = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8')).hosting;
  expect(hosting.site).toBeUndefined();
  expect(hosting.public).toBe('dist');
  expect(hosting.rewrites).toBeUndefined();
  expect(hosting.headers.flatMap(rule => rule.headers)).toContainEqual({ key: 'X-Frame-Options', value: 'DENY' });
});
