import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['en', 'ko']) test(`keyboard and axe: ${locale} workspace, consent and immutable preview`, async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('#ui-language');
  const audit = async () => expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(html).toHaveAttribute('lang', 'en');
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAccessibleName('한국어');
  if (locale === 'ko') await page.keyboard.press('Enter');
  await expect(html).toHaveAttribute('lang', locale);
  await audit();
  await page.locator('#sample-en').press('Enter');
  await expect(page.locator('#comparison')).toBeFocused();
  const draft = await page.locator('#draft').inputValue();
  await page.locator('#consent').press('Space');
  await page.locator('#cloud-preview-button').press('Enter');
  await expect(page.locator('#cloud-preview-title')).toBeFocused();
  const prompt = await page.locator('#cloud-outgoing').textContent();
  await expect(page.locator('#cloud-outgoing')).toHaveAttribute('lang', 'en');
  await page.keyboard.press('Tab');
  await expect(page.locator('#cloud-approve')).toBeFocused();
  await page.keyboard.press('Space');
  await audit();
  await toggle.press('Enter');
  await expect(toggle).toBeFocused();
  await expect(html).toHaveAttribute('lang', locale === 'en' ? 'ko' : 'en');
  await expect(page.locator('#consent')).toBeChecked();
  await expect(page.locator('#cloud-approve')).toBeChecked();
  await expect(page.locator('#cloud-send')).toBeEnabled();
  await expect(page.locator('#draft')).toHaveValue(draft);
  expect(await page.locator('#cloud-outgoing').textContent()).toBe(prompt);
  await audit();
  await page.locator('#draft').press('End');
  await page.keyboard.press('Space');
  await expect(page.locator('#consent')).not.toBeChecked();
  await expect(page.locator('#cloud-approve')).not.toBeChecked();
  await expect(page.locator('#cloud-preview')).toBeHidden();
  await audit();
});

test('keyboard file picker and invalid UTF-8 feedback have exact bilingual names', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#file')).toBeHidden(); // The browser's own file-input label cannot follow our switch.
  const picker = page.getByRole('button', { name: 'Choose a UTF-8 text file' });
  const file = page.waitForEvent('filechooser');
  await picker.press('Enter');
  await (await file).setFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from([255]) });
  await expect(page.locator('#input-status')).toContainText('Could not read the file');
  await page.locator('#ui-language').press('Space');
  await expect(page.getByRole('button', { name: 'UTF-8 텍스트 파일 선택' })).toBeVisible();
  await expect(page.locator('#input-status')).toContainText('파일을 읽지 못했습니다');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('independent sample changes language without changing its outgoing prompt', async ({ page }) => {
  await page.goto('/approved-demo.html');
  await page.locator('#select-figure').press('Enter');
  const exact = await page.locator('#outgoing-preview').textContent();
  await page.locator('#ui-language').press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('button', { name: '승인한 합성 샘플 선택' })).toBeVisible();
  expect(await page.locator('#outgoing-preview').textContent()).toBe(exact);
  await expect(page.locator('#outgoing-preview')).toHaveAttribute('lang', 'en');
});
