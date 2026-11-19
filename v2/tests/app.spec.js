import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function observe(page) {
  const requests = [];
  const faults = [];
  page.on('request', req => requests.push({ url: req.url(), method: req.method(), body: req.postData() }));
  page.on('pageerror', error => faults.push(error.message));
  await page.addInitScript(() => {
    window.violations = [];
    addEventListener('securitypolicyviolation', event => window.violations.push(event.effectiveDirective));
  });
  return async () => {
    const origin = new URL(page.url()).origin;
    expect(requests.filter(r => !r.url.startsWith(`${origin}/`) || r.method !== 'GET' || r.body !== null)).toEqual([]);
    expect(requests.every(r => !/RAW_NETWORK_CANARY|010-0000-0000|example\.invalid/.test(decodeURIComponent(r.url)))).toBe(true);
    expect(await page.evaluate(() => ({ violations: window.violations, local: localStorage.length, session: sessionStorage.length }))).toEqual({ violations: [], local: 0, session: 0 });
    expect(faults).toEqual([]);
  };
}

const sample = page => page.getByRole('button', { name: '합성 샘플 불러오기', exact: true });
const englishSample = page => page.getByRole('button', { name: '영어 합성 샘플 불러오기' });
const suggest = page => page.getByRole('button', { name: '기기 내 모델 제안 받기' });
const preview = page => page.getByRole('textbox', { name: '카드에 들어갈 정확한 문구' });
const consent = page => page.getByRole('checkbox', { name: '현재 문구를 이 기기에서 카드로 만드는 데 동의합니다.' });
const makeCard = page => page.getByRole('button', { name: '이 기기에서 카드 만들기' });

test('English synthetic TalkBack reaches Firebase with English options and masked English text', async ({ page }) => {
  const checkNetwork = await observe(page);
  await page.addInitScript(() => {
    window.calls = [];
    Object.defineProperty(window, 'LanguageModel', { value: {
      availability: async options => { window.calls.push(['availability', options]); return 'available'; },
      create: async options => {
        window.calls.push(['create', options]);
        return { prompt: async messages => { window.calls.push(['prompt', messages]); return '[{"text":"Avery Example"}]'; }, destroy() {} };
      },
    } });
  });
  await page.goto('/#ko');
  await englishSample(page).click({ timeout: 2000 });
  await expect(page.locator('#before')).toHaveText('Button');
  await expect(page.locator('#after')).toHaveText('Change delivery address, Button');
  await suggest(page).click();
  await expect(page.locator('#proposal-text')).toContainText('Customer name: [Additional redaction]');
  const calls = await page.evaluate(() => window.calls);
  expect(calls.map(([name]) => name)).toEqual(['availability', 'availability', 'create', 'prompt']);
  for (const [, options] of calls.slice(0, -1)) {
    expect(options.expectedInputs).toEqual([{ type: 'text', languages: ['en'] }]);
    expect(options.expectedOutputs).toEqual([{ type: 'text', languages: ['en'] }]);
  }
  const prompt = JSON.stringify(calls.at(-1)[1]);
  expect(prompt).not.toMatch(/\p{Script=Hangul}|example\.invalid|555-0100|\$12\.30|101 Sample Street/u);
  for (const kind of ['Phone', 'Email', 'Amount', 'Address']) expect(prompt).toContain(`[${kind} redacted]`);
  await page.locator('#apply').click();
  await page.locator('#cloud-preview-button').click();
  const outgoing = await page.locator('#cloud-utterances, #cloud-outgoing').allTextContents().then(parts => parts.join(''));
  expect(outgoing).toMatch(/^Before: Button\nAfter: Change delivery address, Button\n\n/);
  expect(outgoing).not.toMatch(/Avery Example|Sample Street|\[.*redacted\]|Additional redaction/);
  await expect(page.locator('#cloud-send')).toBeDisabled();
  await checkNetwork();
});

test('local card does not diagnose an ordinary toggle', async ({ page }) => {
  const checkNetwork = await observe(page);
  await page.goto('/#ko');
  await page.locator('#source').fill('Before: Notifications, switch, off\nAfter: Notifications, switch, on');
  await page.locator('#prepare').click();
  await consent(page).check();
  await makeCard(page).click();
  await expect(page.locator('#card-text article[lang=en]')).toContainText('This comparison alone does not establish a defect or a fix.');
  await expect(page.locator('#card-text article[lang=ko]')).toContainText('이 비교만으로는 결함이나 수정 여부를 확인할 수 없습니다.');
  await checkNetwork();
});

for (const provider of ['missing', 'unavailable']) {
  test(`real SDK fails closed with Prompt API ${provider}; keyboard fallback and exact consent`, async ({ page }) => {
    const checkNetwork = await observe(page);
    await page.addInitScript(mode => {
      window.providerCalls = [];
      Object.defineProperty(window, 'LanguageModel', { value: mode === 'missing' ? undefined : {
        availability: async () => { window.providerCalls.push('availability'); return 'unavailable'; },
        create: async () => { window.providerCalls.push('create'); throw new Error('Unexpected creation'); },
      } });
    }, provider);
    await page.goto('/#ko');
    await page.keyboard.press('Tab');
    await expect(page.locator('#ui-language')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#sample-real')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(sample(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(englishSample(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: '2. 수정 전후 비교' })).toBeFocused();
    await expect(preview(page)).toHaveValue(/\[Phone redacted\][\s\S]*\[Address redacted\]/);
    await suggest(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: '기기 내 모델을 사용할 수 없습니다' })).toBeVisible();
    expect(await page.evaluate(() => window.providerCalls)).toEqual(provider === 'missing' ? [] : ['availability']);
    const exact = 'Before: Button\nAfter: Change delivery address, Button\nCustomer name: Avery Example\nAddress: 101 Sample Street\nName: [Name redacted]\n<b>RAW_NETWORK_CANARY</b>\n';
    await preview(page).fill(exact);
    await expect(makeCard(page)).toBeDisabled();
    await consent(page).check();
    await preview(page).press('End');
    await preview(page).press('Space');
    await expect(consent(page)).not.toBeChecked();
    await expect(makeCard(page)).toBeDisabled();
    await preview(page).fill(exact);
    await expect(makeCard(page)).toBeDisabled();
    await consent(page).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await expect(makeCard(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: '4. 이 기기에서 만든 카드' })).toBeFocused();
    for (const [lang, headings] of [['en', ['Summary', 'Environment', 'Steps to reproduce', 'Expected result', 'Actual result', 'Fix verification']], ['ko', ['요약', '환경', '재현 절차', '예상 결과', '실제 결과', '수정 검증']]]) {
      const variant = page.locator(`#card-text article[lang=${lang}]`);
      await expect(variant).toBeVisible();
      expect(await variant.locator('h4').allTextContents()).toEqual(headings);
      expect(await variant.locator('[data-evidence][lang=en]').allTextContents()).toEqual(['“Button”', '“Change delivery address, Button”']);
    }
    await expect(page.locator('#card-text')).not.toContainText(/Avery Example|Sample Street|\[.*redacted\]|RAW_NETWORK_CANARY/);
    await preview(page).fill('바뀐 초안');
    await expect(page.locator('#card')).toBeHidden();
    await checkNetwork();
  });
}

test('real SDK masks the prompt, accepts literal candidates only, and requires renewed consent', async ({ page }) => {
  const checkNetwork = await observe(page);
  await page.addInitScript(() => {
    window.promptsSeen = [];
    Object.defineProperty(window, 'LanguageModel', { value: {
      availability: async () => 'available',
      create: async () => ({ prompt: async messages => {
        window.promptsSeen.push(JSON.stringify(messages));
        return JSON.stringify([{ text: 'Avery Example', replacement: 'RAW_NETWORK_CANARY' }, { text: 'redacted' }, { text: 'not in draft' }]);
      }, destroy() {} }),
    } });
  });
  await page.goto('/#ko');
  await englishSample(page).click();
  await preview(page).fill(`${await preview(page).inputValue()}\nBackup email: hidden@example.invalid`);
  await consent(page).check();
  await suggest(page).click();
  const apply = page.getByRole('button', { name: '추가 가림 제안 적용' });
  await expect(apply).toBeEnabled();
  const prompts = await page.evaluate(() => window.promptsSeen);
  expect(prompts).toHaveLength(1);
  expect(prompts[0]).toContain('Backup email: [Email redacted]');
  expect(prompts[0]).not.toContain('example.invalid');
  await expect(preview(page)).toHaveValue(/Avery Example/);
  await apply.click();
  await expect(preview(page)).toHaveValue(/Customer name: \[Additional redaction\][\s\S]*Phone: \[Phone redacted\]/);
  expect(await preview(page).inputValue()).not.toMatch(/Avery Example|RAW_NETWORK_CANARY/);
  await expect(consent(page)).not.toBeChecked();
  await checkNetwork();
});

test('pending SDK results cannot replace an edited and re-approved draft', async ({ page }) => {
  const checkNetwork = await observe(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'LanguageModel', { value: {
      availability: async () => 'available',
      create: async () => ({ prompt: () => new Promise(resolve => { window.finishPrompt = resolve; }), destroy() {} }),
    } });
  });
  await page.goto('/#ko');
  await englishSample(page).click();
  await suggest(page).click();
  await expect.poll(() => page.evaluate(() => typeof window.finishPrompt)).toBe('function');
  await preview(page).fill('새로 검토한 본문\n');
  await consent(page).check();
  await page.evaluate(() => window.finishPrompt('[{"text":"Avery Example"}]'));
  await expect(page.getByText('문구가 바뀌어 이전 제안을 사용하지 않았습니다.')).toBeVisible();
  await expect(page.locator('#proposal')).toBeHidden();
  await makeCard(page).click();
  await expect(page.locator('#card-text article[lang=ko]')).toContainText('수정 전·후 낭독이 모두 제공되지는 않았습니다.');
  await expect(page.locator('#card-text')).not.toContainText('새로 검토한 본문');
  await checkNetwork();
});

for (const input of ['Korean sample', 'mixed source', 'mixed draft', 'unconfirmed English']) {
  test(`${input} stays on rules/manual without touching the Prompt API`, async ({ page }) => {
    const checkNetwork = await observe(page);
    await page.addInitScript(() => {
      window.providerReads = 0;
      Object.defineProperty(window, 'LanguageModel', { get() {
        window.providerReads++;
        return undefined;
      } });
    });
    await page.goto('/#ko');
    if (input === 'Korean sample') {
      await sample(page).click();
      await expect(preview(page)).toHaveValue(/\[전화번호 가림\][\s\S]*\[주소 가림\]/);
    } else if (input === 'mixed source') {
      await englishSample(page).click();
      await page.locator('#source').fill('Before: Button\nAfter: Change address, button\nEmail: 한글@example.invalid');
      await page.locator('#prepare').click();
      await expect(preview(page)).toHaveValue(/\[이메일 가림\]/);
      await preview(page).fill('Before: Button\nAfter: Change address, button');
    } else if (input === 'mixed draft') {
      await englishSample(page).click();
      await preview(page).fill('Before: Button\nAfter: 배송지 변경, button');
    } else {
      await page.locator('#source').fill('Before: Button\nAfter: Change address, button');
      await page.locator('#prepare').click();
    }
    await suggest(page).click();
    await expect(page.locator('#model-status')).toContainText('한국어·혼합 기록은 모델 없이');
    expect(await page.evaluate(() => window.providerReads)).toBe(0);
    await expect(page.locator('#proposal')).toBeHidden();
    const expected = input === 'Korean sample' ? ['버튼', '배송지 변경, 버튼']
      : ['Button', input === 'mixed draft' ? '배송지 변경, button' : 'Change address, button'];
    await consent(page).check();
    await makeCard(page).click();
    for (const lang of ['en', 'ko']) {
      expect(await page.locator(`#card-text article[lang=${lang}] [data-evidence]`).allTextContents()).toEqual(expected.map(q => `“${q}”`));
    }
    await checkNetwork();
  });
}

test('built page CSP blocks even same-origin fetch before it becomes a request', async ({ page }) => {
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  await page.goto('/#ko');
  const result = await page.evaluate(() => new Promise(resolve => {
    addEventListener('securitypolicyviolation', event => resolve(event.effectiveDirective), { once: true });
    fetch('/test-csp-canary').catch(() => {});
  }));
  expect(result).toBe('connect-src');
  expect(requests.some(url => url.endsWith('/test-csp-canary'))).toBe(false);
});

test('file import, free-form input, narrow viewport and axe rules', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#ko');
  await page.getByLabel('UTF-8 텍스트 파일 선택').setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('자유 형식: 버튼\n문의: replay@example.invalid') });
  await expect(preview(page)).toHaveValue('자유 형식: 버튼\n문의: [이메일 가림]');
  await expect(page.getByText('수정 전·후 표기가 없어도 초안을 검토할 수 있습니다.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
