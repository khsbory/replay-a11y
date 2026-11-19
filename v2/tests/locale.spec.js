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
  for (const id of ['sample-real', 'sample', 'sample-en']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${id}`)).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('#comparison')).toBeFocused();
  const draft = await page.locator('#draft').inputValue();
  for (const id of ['suggest', 'draft', 'tracker-device', 'tracker-os', 'tracker-browser', 'tracker-reader', 'tracker-notes', 'tracker-expected', 'tracker-tested', 'tracker-outcome', 'tracker-mask', 'consent']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${id}`)).toBeFocused();
  }
  await page.keyboard.press('Space');
  for (const id of ['make', 'cloud-preview-button']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${id}`)).toBeFocused();
  }
  await page.keyboard.press('Enter');
  const firstHeading = page.getByRole('heading', { name: locale === 'en' ? 'Utterances that will be sent' : '전송할 낭독 문구', exact: true });
  await expect(firstHeading).toBeFocused();
  await expect(page.locator('#cloud-utterances')).toBeVisible();
  const instructions = page.getByRole('heading', { name: locale === 'en' ? 'Metadata and instructions sent with them' : '함께 전송할 정보와 지시문', exact: true });
  await expect(instructions).toBeVisible();
  const readPrompt = () => page.locator('#cloud-utterances, #cloud-outgoing').allTextContents().then(parts => parts.join(''));
  const prompt = await readPrompt();
  await expect(page.locator('#cloud-outgoing')).toHaveAttribute('lang', 'en');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => {
    const clipboard = navigator.clipboard;
    const writeText = clipboard.writeText.bind(clipboard);
    clipboard.writeText = text => {
      window.clipboardWriteInput = text;
      return writeText(text);
    };
  });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: locale === 'en' ? 'Copy exact request text' : '정확한 요청 텍스트 복사' })).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.clipboardWriteInput)).toBe(prompt);
  // Only Windows' native clipboard conversion is normalized, never the SDK prompt.
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText().then(text => text.replace(/\r\n/g, String.fromCharCode(10))))).toBe(prompt);
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
  expect(await readPrompt()).toBe(prompt);
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
