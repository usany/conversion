import { expect, test } from '@playwright/test';

import {
  addFiles,
  convertAndDownload,
  convertButton,
  emptyState,
  expectOrder,
  fileItems,
  fixture,
  previewArea,
  repoFile,
  statusBanner,
  watchConsole,
} from './helpers';

// Each conversion launches a headless Chromium server-side.
test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('starts empty, with conversion disabled', async ({ page }) => {
  await expect(emptyState(page)).toBeVisible();
  await expect(fileItems(page)).toHaveCount(0);
  await expect(convertButton(page)).toBeDisabled();
  await expect(convertButton(page)).toHaveText(/Convert 0 files to PDF/);
  await expect(previewArea(page)).toContainText('Select a file to preview');
});

test('converts a single file and downloads a valid PDF', async ({ page }) => {
  const errors = watchConsole(page);
  await addFiles(page, [fixture('alpha.md')]);

  await expectOrder(page, ['alpha.md']);
  await expect(emptyState(page)).toHaveCount(0);
  await expect(convertButton(page)).toBeEnabled();
  // Singular noun, per the ConvertButton contract.
  await expect(convertButton(page)).toHaveText(/Convert 1 file to PDF/);

  const pdf = await convertAndDownload(page);
  expect(pdf.filename).toBe('converted.pdf');
  expect(pdf.bytes.byteLength).toBeGreaterThan(0);
  expect(pdf.pages).toBe(1);

  await expect(statusBanner(page)).toHaveAttribute('data-variant', 'success');
  await expect(statusBanner(page)).toHaveRole('status');
  await expect(statusBanner(page)).toContainText('converted.pdf');
  expect(errors).toEqual([]);
});

test('auto-selects the first file and previews its rendered markdown', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md')]);

  // addFiles auto-selects the first file.
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Alpha Document');
  await expect(fileItems(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(fileItems(page).nth(1)).toHaveAttribute('aria-selected', 'false');

  await fileItems(page).nth(1).click();
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Beta Document');
  await expect(fileItems(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  // Exactly one row is selected at a time.
  await expect(page.locator('[data-testid^="file-item-"][aria-selected="true"]')).toHaveCount(1);
});

test('renders lists and headings as real elements in the preview', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md')]);
  const preview = previewArea(page);

  await expect(preview.getByRole('heading', { level: 1 })).toHaveText('Alpha Document');
  await expect(preview.getByRole('listitem')).toHaveCount(2);
  await expect(preview.getByRole('listitem').first()).toHaveText('alpha item one');
});

test('R3: every file starts on a new PDF page', async ({ page }) => {
  // Three documents that would comfortably share one page without `break-before: page`,
  // so a page count of exactly 3 is the proof that the rule applied.
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);
  await expectOrder(page, ['alpha.md', 'beta.md', 'gamma.md']);

  const pdf = await convertAndDownload(page);
  expect(pdf.pages).toBe(3);
});

test('R3: a multi-page file still leaves the next file starting fresh', async ({ page }) => {
  // FILE1.md alone spans 2 pages; FILE2.md alone spans 1. Concatenated they must be 3,
  // which only holds if FILE2 begins on a new page rather than flowing after FILE1.
  await addFiles(page, [repoFile('FILE1.md'), repoFile('FILE2.md')]);
  await expectOrder(page, ['FILE1.md', 'FILE2.md']);

  const pdf = await convertAndDownload(page);
  expect(pdf.pages).toBe(3);
});

test('handles CJK content without mangling it', async ({ page }) => {
  await addFiles(page, [repoFile('FILE2.md')]);

  // Korean survives the client render path...
  await expect(previewArea(page)).toContainText('목표');
  await expect(previewArea(page)).toContainText('스킬을 사용하라');

  // ...and the server one produces a real PDF rather than failing on font embedding.
  const pdf = await convertAndDownload(page);
  expect(pdf.pages).toBe(1);
  expect(pdf.bytes.byteLength).toBeGreaterThan(1000);
});

test('scales to five files, one page each', async ({ page }) => {
  await addFiles(page, [
    fixture('alpha.md'),
    fixture('beta.md'),
    fixture('gamma.md'),
    repoFile('FILE2.md'),
    fixture('xss.md'),
  ]);
  await expect(fileItems(page)).toHaveCount(5);

  const pdf = await convertAndDownload(page);
  expect(pdf.pages).toBe(5);
});

test('disables the drop zone and file list while converting', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md')]);

  // Hold the response open so the in-flight state is observable.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/convert', async (route) => {
    await held;
    await route.continue();
  });

  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
  await convertButton(page).click();

  await expect(convertButton(page)).toHaveText(/Converting…/);
  await expect(convertButton(page)).toBeDisabled();
  await expect(convertButton(page)).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('dropzone')).toHaveAttribute('aria-disabled', 'true');
  await expect(fileItems(page).first().locator('[data-testid^="drag-handle-"]')).toBeDisabled();
  await expect(fileItems(page).first().locator('[data-testid^="remove-"]')).toBeDisabled();

  release();
  await downloadPromise;

  // Surfaces come back once the conversion resolves.
  await expect(convertButton(page)).toBeEnabled();
  await expect(convertButton(page)).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByTestId('dropzone')).toHaveAttribute('aria-disabled', 'false');
  await expect(fileItems(page).first().locator('[data-testid^="remove-"]')).toBeEnabled();
});

test('converts in the order shown after a removal', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);
  await fileItems(page).nth(1).locator('[data-testid^="remove-"]').click();

  await expectOrder(page, ['alpha.md', 'gamma.md']);
  await expect(convertButton(page)).toHaveText(/Convert 2 files to PDF/);

  const pdf = await convertAndDownload(page);
  expect(pdf.pages).toBe(2);
});
