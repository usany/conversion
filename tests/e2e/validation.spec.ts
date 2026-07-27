import { expect, test } from '@playwright/test';

import {
  addFiles,
  convertButton,
  emptyState,
  expectOrder,
  fileItems,
  fixture,
  previewArea,
  repoFile,
  statusBanner,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('rejects a .txt file with the constant rejection message', async ({ page }) => {
  await addFiles(page, [fixture('notes.txt')]);

  const banner = statusBanner(page);
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('data-variant', 'error');
  await expect(banner).toHaveRole('alert');
  // Verbatim from lib/constants.ts REJECTION_MESSAGES['invalid-extension'].
  await expect(banner).toContainText('Not a markdown file (.md or .markdown only)');
  await expect(banner).toContainText('notes.txt');

  await expect(fileItems(page)).toHaveCount(0);
  await expect(emptyState(page)).toBeVisible();
  await expect(convertButton(page)).toBeDisabled();
});

test('rejects a .pdf file', async ({ page }) => {
  await addFiles(page, [fixture('report.pdf')]);

  await expect(statusBanner(page)).toHaveAttribute('data-variant', 'error');
  await expect(statusBanner(page)).toContainText('report.pdf');
  await expect(fileItems(page)).toHaveCount(0);
});

test('accepts the valid half of a mixed drop and details each rejection', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('notes.txt'), fixture('report.pdf')]);

  await expectOrder(page, ['alpha.md']);

  const banner = statusBanner(page);
  // Partial acceptance is `info`, not `error`.
  await expect(banner).toHaveAttribute('data-variant', 'info');
  await expect(banner).toContainText('Added 1 of 3 files');
  await expect(banner.getByRole('listitem')).toHaveCount(2);
  await expect(banner).toContainText('notes.txt');
  await expect(banner).toContainText('report.pdf');

  await expect(convertButton(page)).toBeEnabled();
});

test('rejects a file over MAX_FILE_SIZE', async ({ page }) => {
  // 5 MB + 1 byte, built in the page so no oversized fixture lands in the repo.
  await page.evaluate(() => {
    const oversize = new File(['x'.repeat(5 * 1024 * 1024 + 1)], 'huge.md', {
      type: 'text/markdown',
    });
    const transfer = new DataTransfer();
    transfer.items.add(oversize);
    document
      .querySelector('[data-testid="dropzone"]')
      ?.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
  });

  const banner = statusBanner(page);
  await expect(banner).toHaveAttribute('data-variant', 'error');
  await expect(banner).toContainText('Exceeds the 5 MB per-file limit');
  await expect(banner).toContainText('huge.md');
  await expect(fileItems(page)).toHaveCount(0);
});

test('rejects a duplicate of an already-added file', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md')]);
  await expectOrder(page, ['alpha.md']);

  await addFiles(page, [fixture('alpha.md')]);

  await expect(statusBanner(page)).toContainText('Already added');
  // Still exactly one row.
  await expect(fileItems(page)).toHaveCount(1);
});

test('dismissing the banner hides it', async ({ page }) => {
  await addFiles(page, [fixture('notes.txt')]);
  await expect(statusBanner(page)).toBeVisible();

  await page.getByTestId('dismiss-banner').click();

  await expect(statusBanner(page)).toHaveCount(0);
});

test('surfaces a server failure as an error banner', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md')]);

  await page.route('**/api/convert', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Failed to render the PDF.' }),
    }),
  );

  await convertButton(page).click();

  const banner = statusBanner(page);
  await expect(banner).toHaveAttribute('data-variant', 'error');
  await expect(banner).toHaveRole('alert');
  await expect(banner).toContainText('Failed to render the PDF.');

  // The page stays usable after a failure.
  await expect(convertButton(page)).toBeEnabled();
  await expect(page.getByTestId('dropzone')).toHaveAttribute('aria-disabled', 'false');
});

test('surfaces a network failure gracefully', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md')]);
  await page.route('**/api/convert', (route) => route.abort('failed'));

  await convertButton(page).click();

  const banner = statusBanner(page);
  await expect(banner).toHaveAttribute('data-variant', 'error');
  await expect(banner).not.toHaveText('');
  await expect(convertButton(page)).toBeEnabled();
});

test('falls back to a status-derived message when the error body has no `error`', async ({
  page,
}) => {
  await addFiles(page, [fixture('alpha.md')]);
  await page.route('**/api/convert', (route) =>
    route.fulfill({ status: 503, contentType: 'text/plain', body: 'upstream down' }),
  );

  await convertButton(page).click();

  await expect(statusBanner(page)).toContainText('Conversion failed (503)');
});

test('sanitises script and event-handler payloads in the preview', async ({ page }) => {
  await addFiles(page, [fixture('xss.md')]);

  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('XSS Probe');

  // Nothing from the markdown executed.
  expect(await page.evaluate(() => (window as Window & { __pwned?: boolean }).__pwned)).toBe(
    undefined,
  );
  await expect(previewArea(page).locator('script')).toHaveCount(0);
  await expect(previewArea(page).locator('[onerror]')).toHaveCount(0);
  await expect(previewArea(page).locator('a[href^="javascript:"]')).toHaveCount(0);

  // Special characters still render as text rather than being dropped.
  await expect(previewArea(page)).toContainText('Special chars');
  await expect(previewArea(page)).toContainText('🎉');
});

test('a sanitised file still converts to a valid PDF', async ({ page }) => {
  await addFiles(page, [fixture('xss.md')]);

  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
  await convertButton(page).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('converted.pdf');
  expect(await page.evaluate(() => (window as Window & { __pwned?: boolean }).__pwned)).toBe(
    undefined,
  );
});

test('the convert endpoint rejects malformed payloads', async ({ request }) => {
  const empty = await request.post('/api/convert', { data: { files: [] } });
  expect(empty.status()).toBe(400);

  const malformed = await request.post('/api/convert', {
    headers: { 'content-type': 'application/json' },
    data: 'not json at all',
  });
  expect(malformed.status()).toBe(400);

  const wrongShape = await request.post('/api/convert', { data: { files: [{ name: '' }] } });
  expect(wrongShape.status()).toBe(400);
});

test('the convert endpoint returns a PDF for a valid payload', async ({ request }) => {
  const response = await request.post('/api/convert', {
    data: { files: [{ name: 'a.md', content: '# A' }] },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/pdf');
  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
});
