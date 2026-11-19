import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const headings = {
  en: ['Summary', 'Environment', 'Steps to reproduce', 'Expected result', 'Actual result', 'Fix verification'],
  ko: ['요약', '환경', '재현 절차', '예상 결과', '실제 결과', '수정 검증'],
};

for (const locale of ['en', 'ko']) test(`public-case tracker, keyboard copy and axe in ${locale}`, async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async text => { if (window.copyFails) throw Error(); window.copied = text; } },
  }));
  await page.goto(locale === 'ko' ? '/#ko' : '/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('#sample-real')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#real-source')).toHaveAttribute('href', 'https://issues.chromium.org/issues/542033685');
  await page.locator('#consent').check();
  await page.locator('#make').press('Enter');
  const card = page.locator('#card');
  for (const lang of ['en', 'ko']) expect(await card.locator(`article[lang=${lang}] h4`).allTextContents()).toEqual(headings[lang]);
  await expect(card).toContainText('Confirmed resolved in 154.0.8029.0');
  await expect(card).toContainText('154.0.8026.0');
  await expect(card).toContainText('Search, button');
  await expect(card).toContainText('Search, Button');
  await page.keyboard.press('Tab');
  await expect(page.locator('#card-copy')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#card-copy-status')).toContainText(locale === 'en' ? 'copied' : '복사했습니다');
  const copied = await page.evaluate(() => window.copied);
  expect(copied.match(/^#### .+$/gm)).toEqual([...headings.en, ...headings.ko].map(h => `#### ${h}`));
  expect(copied).toContain('[Chromium 542033685]');
  await page.evaluate(() => window.copyFails = true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#card-copy-status')).toContainText(locale === 'en' ? 'Could not copy' : '복사하지 못했습니다');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
