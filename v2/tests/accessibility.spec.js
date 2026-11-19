import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const trackerTabs = ['tracker-device', 'tracker-os', 'tracker-browser', 'tracker-reader', 'tracker-notes', 'tracker-expected', 'tracker-tested', 'tracker-outcome', 'tracker-mask'];
const project = 'replay-demo-invalid';
const appId = '1:000000000000:web:0000000000000000000000';
const cloudRecommendation = JSON.stringify({ fix: 'visible_label' });

// Use fresh Playwright contexts; fail closed for all page requests outside the test origin.
async function setup(page, baseURL, handler) {
  const requests = [];
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL || url.pathname === '/__/firebase/init.json') requests.push(url.origin + url.pathname);
    const intercepted = handler?.(route, url);
    return intercepted ?? (url.origin === baseURL ? route.continue() : route.abort());
  });
  await page.addInitScript(() => {
    const changes = [];
    window.a11yChanges = changes;
    document.addEventListener('DOMContentLoaded', () => {
      for (const status of document.querySelectorAll('[role=status]')) {
        new MutationObserver(() => {
          if (status.textContent) changes.push({ id: status.id, text: status.textContent, exposed: !status.closest('[hidden]') });
        }).observe(status, { childList: true, subtree: true, characterData: true });
      }
    });
  });
  return requests;
}

async function audit(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const focus = () => page.evaluate(() => ({
    id: document.activeElement.id || document.activeElement.getAttribute('href') || document.activeElement.tagName,
    outline: getComputedStyle(document.activeElement).outlineStyle,
    focusVisible: document.activeElement.matches(':focus-visible'),
  }));
  const key = async (key, expected) => {
    await page.keyboard.press(key);
    const actual = await focus();
    if (expected) expect.soft(actual.id, `${key} should focus ${expected}`).toBe(expected);
    if (expected) expect.soft(actual.outline, `${expected} has a visible outline`).not.toBe('none');
  };
  const live = async (id, text, { transient = false } = {}) => {
    if (!transient) await expect.soft(page.locator(`#${id}`)).toContainText(text);
    await expect.soft.poll(() => page.evaluate(({ id, text }) => window.a11yChanges.some(event =>
      event.id === id && event.exposed && event.text.includes(text)), { id, text }), { message: `exposed ${id} mutation: ${text}` }).toBe(true);
  };
  const state = async (stage, { scan = false, liveCount = 0 } = {}) => {
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const ax = nodes.filter(node => !node.ignored).map(node => ({
      id: node.nodeId,
      role: node.role.value,
      name: node.name?.value,
      description: node.description?.value,
      value: node.value?.value,
      children: node.childIds,
      properties: Object.fromEntries((node.properties ?? []).map(prop => [prop.name, prop.value.value])),
    }));
    const statuses = ax.filter(node => node.role === 'status');
    expect.soft(statuses.length, `AX status nodes at ${stage}`).toBeGreaterThanOrEqual(liveCount);
    for (const node of statuses) expect.soft(node.properties).toMatchObject({ live: 'polite', atomic: true });
    if (scan) {
      const report = await new AxeBuilder({ page }).analyze();
      expect.soft(report.violations, `axe at ${stage}`).toEqual([]);
    }
    return ax;
  };
  return { key, live, state, focus };
}

for (const outcome of ['suggestion', 'unavailable']) {
  test(`local keyboard and live status: ${outcome}`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const requests = await setup(page, baseURL);
    await page.addInitScript(mode => {
      Object.defineProperty(window, 'LanguageModel', { value: mode === 'unavailable' ? undefined : {
        availability: async () => 'available',
        create: async () => ({ prompt: () => new Promise(resolve => { window.finishPrompt = resolve; }), destroy() {} }),
      } });
    }, outcome);
    await page.goto('/#ko');
    const a = await audit(page);
    await a.state('initial', { scan: outcome === 'suggestion', liveCount: 1 });
    await a.key('Tab', 'ui-language');
    await a.key('Tab', 'sample-real');
    await a.key('Tab', 'sample');
    await a.key('Tab', 'sample-en');
    await a.key('Enter', 'comparison');
    await a.key('Tab', 'suggest');
    if (outcome === 'suggestion') {
      for (const id of ['draft', ...trackerTabs, 'consent']) await a.key('Tab', id);
      await a.key('Space', 'consent');
      for (const id of [...trackerTabs.toReversed(), 'draft', 'suggest']) await a.key('Shift+Tab', id);
    }
    await a.key('Enter', 'suggest');
    if (outcome === 'suggestion') {
      await a.live('model-status', '기기 내 모델을 준비하고 있습니다', { transient: true });
      await a.live('model-status', '기기에서 추가 가림 제안을 만드는 중');
      const pending = await a.state('model-pending', { scan: true, liveCount: 3 });
      expect.soft(pending.find(node => node.role === 'button' && node.name === '기기 내 모델 제안 받기')?.properties.disabled).toBe(true);
      await page.evaluate(() => window.finishPrompt('[{"text":"Avery Example"}]'));
      await a.live('model-status', '제안 문구를 검토');
      await a.state('model-ready', { scan: true });
      await expect(page.locator('#proposal-text')).toContainText('[Additional redaction]');
      await a.key('Tab', 'apply');
      await a.key('Enter', 'draft');
      await a.live('model-status', '추가 가림 제안을 적용했습니다. 문구가 바뀌어 동의를 취소했습니다');
      await expect(page.locator('#consent')).not.toBeChecked();
      for (const id of [...trackerTabs, 'consent']) await a.key('Tab', id);
      await a.key('Space', 'consent');
      await a.live('review-status', '현재 문구에 동의했습니다');
      for (const id of [...trackerTabs.toReversed(), 'draft']) await a.key('Shift+Tab', id);
      await a.key('End');
      await a.key('X', 'draft');
      await a.key('Y', 'draft');
      await a.live('review-status', '동의를 취소했습니다');
      await a.state('draft-edited', { liveCount: 3 });
      for (const id of [...trackerTabs, 'consent']) await a.key('Tab', id);
      await a.key('Space', 'consent');
      await a.key('Tab', 'make');
      await a.key('Enter', 'card-title');
      const card = await a.state('card-success', { scan: true });
      expect.soft(card.find(node => node.role === 'heading' && node.name.startsWith('4.'))?.properties.focused).toBe(true);
      expect.soft(card.some(node => node.role === 'heading' && node.name === 'English')).toBe(true);
      expect.soft(card.some(node => node.role === 'heading' && node.name === '한국어')).toBe(true);
      await a.key('Shift+Tab', 'cloud-preview-button');
      await a.key('Shift+Tab', 'make');
      await a.key('Shift+Tab', 'consent');
      await a.key('Space', 'consent');
      await a.live('review-status', '카드 만들기 동의를 취소했습니다');
      await expect(page.locator('#card')).toBeHidden();
      await a.key('Space', 'consent');
      // Editing the original hides the review; withdrawal must still be exposed.
      for (const id of [...trackerTabs.toReversed(), 'draft', 'suggest', 'prepare', 'english', 'source']) await a.key('Shift+Tab', id);
      await a.key('X', 'source');
      await a.key('Y', 'source');
      await a.live('input-status', '동의를 취소했습니다');
      await a.state('source-edited', { liveCount: 1 });
    } else {
      await a.live('model-status', '기기 내 모델을 사용할 수 없습니다');
      await a.state('model-unavailable', { scan: true, liveCount: 3 });
      await a.key('Tab', 'draft');
      await a.key('Control+a', 'draft');
      await a.key('Backspace', 'draft');
      for (const id of [...trackerTabs, 'consent']) await a.key('Tab', id);
      await a.key('Space', 'consent');
      await a.live('review-status', '동의하기 전에 카드 문구를 입력해 주세요');
      await expect(page.locator('#make')).toBeDisabled();
      await expect(page.locator('#card')).toBeHidden();
      await a.state('empty-card-refused', { scan: true });
      for (const id of [...trackerTabs.toReversed(), 'draft']) await a.key('Shift+Tab', id);
      await page.keyboard.type('Synthetic reviewed draft');
      for (const id of [...trackerTabs, 'consent']) await a.key('Tab', id);
      await a.key('Space', 'consent');
      await a.key('Tab', 'make');
      // A programmatic change without an input event exercises the stale-review guard.
      await page.locator('#draft').evaluate(draft => { draft.value = 'Synthetic stale draft'; });
      await a.key('Enter', 'consent');
      await a.live('review-status', '카드를 만들지 못했습니다');
      await expect(page.locator('#make')).toBeDisabled();
      await expect(page.locator('#card')).toBeHidden();
      await a.state('stale-card-refused', { liveCount: 3 });
    }
    expect(requests).toEqual([]);
  });
}

for (const outcome of ['success', 'failure', 'withdraw', 'success-after-focus-moved']) {
  test(`approved demo keyboard and live status: ${outcome}`, async ({ page, baseURL }) => {
    const check = Promise.withResolvers();
    const inference = Promise.withResolvers();
    const requests = await setup(page, baseURL, (route, url) => {
      if (url.origin === baseURL && url.pathname === '/__/firebase/init.json') {
        return route.fulfill({ json: { projectId: project, appId, apiKey: `AIza${'x'.repeat(35)}` } });
      }
      if (url.href === 'https://www.google.com/recaptcha/enterprise.js?render=explicit') {
        return route.fulfill({ contentType: 'application/javascript', body: `window.grecaptcha = {enterprise: {ready: fn => fn(), render: (_, o) => {o.callback(); return 1}, execute: async () => 'fixture-recaptcha'}}` });
      }
      if (url.origin === 'https://content-firebaseappcheck.googleapis.com' && url.pathname === `/v1/projects/${project}/apps/${appId}:exchangeRecaptchaEnterpriseToken`) {
        return check.promise.then(() => route.fulfill({ json: { token: 'fixture-app-check', ttl: '3600s' } }));
      }
      if (url.href === `https://firebasevertexai.googleapis.com/v1beta/projects/${project}/models/gemini-3.5-flash-lite:generateContent`) {
        return inference.promise.then(() => outcome === 'failure'
          ? route.fulfill({ status: 500, json: { error: { message: 'Synthetic provider failure' } } })
          : route.fulfill({ json: { candidates: [{ content: { role: 'model', parts: [{ text: cloudRecommendation }] }, finishReason: 'STOP' }] } }));
      }
    });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/approved-demo.html');
    const a = await audit(page);
    try {
      await a.state('initial', { scan: outcome === 'success', liveCount: 1 });
      for (const id of ['ui-language', '/before.html', '/after.html', '/', 'select-figure']) await a.key('Tab', id);
      await a.key('Enter', 'preview-title');
      await expect(page.locator('#select-figure')).toHaveAttribute('aria-expanded', 'true');
      const preview = await a.state('preview', { scan: outcome === 'success', liveCount: 1 });
      expect.soft(preview.some(node => node.role === 'StaticText' && node.name.includes('Before: Button'))).toBe(true);
      await a.key('Tab', 'approve');
      await a.key('Space', 'approve');
      await a.live('cloud-status', 'Sample approved');
      if (outcome === 'withdraw') {
        await a.key('Space', 'approve');
        await a.live('cloud-status', 'Approval withdrawn. Nothing was sent with this approval.');
        expect(requests).toEqual([]);
        await a.key('Space', 'approve');
      }
      await a.key('Tab', 'send');
      await a.key('Enter', 'approve');
      await a.live('cloud-status', 'Preparing the approved cloud request', { transient: true });
      await a.live('cloud-status', 'Verifying this browser with App Check');
      expect.soft((await a.focus()).id).toBe('approve');
      await a.state('app-check-pending', { liveCount: 1 });
      check.resolve();
      await a.live('cloud-status', 'Waiting for Gemini in the cloud');
      await expect.poll(() => requests.filter(url => url.includes(':generateContent')).length).toBe(1);
      await a.state('inference-pending', { scan: outcome === 'success' });
      if (outcome === 'withdraw') {
        await a.key('Space', 'approve');
        await a.live('cloud-status', 'No card will be shown');
        inference.resolve();
        await expect(page.locator('#cloud-result')).toBeHidden();
        await expect(page.locator('#send')).toBeDisabled();
        await a.state('withdrawn', { scan: true });
        await a.key('Tab', 'SUMMARY');
      } else {
        if (outcome === 'success-after-focus-moved') await a.key('Tab', 'SUMMARY');
        inference.resolve();
        if (outcome === 'failure') {
          await a.live('cloud-status', 'No cloud card was generated');
          await expect(page.locator('#cloud-result')).toBeHidden();
          expect.soft((await a.focus()).id).toBe('approve');
          await a.key('Tab', 'SUMMARY');
          const failed = await a.state('failed', { scan: true });
          expect.soft(failed.find(node => node.name === 'View the saved bilingual example card' && node.properties.focused)?.properties.expanded).toBe(true);
        } else {
          await a.live('cloud-status', 'Cloud issue card received');
          await expect(page.locator('#cloud-result')).toBeVisible();
          const expected = outcome === 'success' ? 'result-title' : 'SUMMARY';
          expect.soft((await a.focus()).id).toBe(expected);
          const result = await a.state('success', { scan: outcome === 'success' });
          expect.soft(result.some(node => node.role === 'StaticText' && node.name === 'Change delivery address, Button')).toBe(true);
          expect.soft(result.some(node => node.name === (expected === 'result-title' ? '3. Bilingual issue card with a cloud recommendation' : 'View the saved bilingual example card') && node.properties.focused)).toBe(true);
        }
      }
    } finally {
      check.resolve();
      inference.resolve();
    }
  });
}
