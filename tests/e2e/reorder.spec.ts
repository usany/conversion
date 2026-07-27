import { expect, test } from '@playwright/test';

import {
  addFiles,
  convertAndDownload,
  convertButton,
  dragRow,
  dropOntoZone,
  emptyState,
  expectOrder,
  fileItems,
  fixture,
  keyboardReorder,
  previewArea,
  repoFile,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('R1: accepts a genuine drag-and-drop onto the drop zone', async ({ page }) => {
  await dropOntoZone(page, [{ name: 'FILE1.md', content: '# Dropped One\n\nvia DataTransfer.\n' }]);

  await expectOrder(page, ['FILE1.md']);
  await expect(emptyState(page)).toHaveCount(0);
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Dropped One');
  await expect(convertButton(page)).toBeEnabled();
});

test('R1: highlights the drop zone while a drag is over it', async ({ page }) => {
  const zone = page.getByTestId('dropzone');
  await expect(zone).toHaveAttribute('data-drag-active', 'false');

  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['# x'], 'x.md', { type: 'text/markdown' }));
    document
      .querySelector('[data-testid="dropzone"]')
      ?.dispatchEvent(
        new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
  });
  await expect(zone).toHaveAttribute('data-drag-active', 'true');

  await page.evaluate(() => {
    document
      .querySelector('[data-testid="dropzone"]')
      ?.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
  });
  await expect(zone).toHaveAttribute('data-drag-active', 'false');
});

test('R1: dropping two files adds both, in drop order', async ({ page }) => {
  await dropOntoZone(page, [
    { name: 'FILE1.md', content: '# One\n' },
    { name: 'FILE2.md', content: '# Two\n' },
  ]);

  await expectOrder(page, ['FILE1.md', 'FILE2.md']);
});

test('R4: drag-and-drop reordering moves a file down', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);
  await expectOrder(page, ['alpha.md', 'beta.md', 'gamma.md']);

  await dragRow(page, 0, 2);

  await expectOrder(page, ['beta.md', 'gamma.md', 'alpha.md']);
});

test('R4: drag-and-drop reordering moves a file up', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);

  await dragRow(page, 2, 0);

  await expectOrder(page, ['gamma.md', 'alpha.md', 'beta.md']);
});

test('R4: swapping FILE1 and FILE2 changes the PDF page order', async ({ page }) => {
  await addFiles(page, [repoFile('FILE1.md'), repoFile('FILE2.md')]);
  await expectOrder(page, ['FILE1.md', 'FILE2.md']);

  await dragRow(page, 0, 1);
  await expectOrder(page, ['FILE2.md', 'FILE1.md']);

  // The reordered document still converts, and page separation is unaffected by order.
  const pdf = await convertAndDownload(page);
  expect(pdf.pages).toBe(3);
});

test('R4: keyboard reordering works from the drag handle', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);

  await keyboardReorder(page, 0, 'ArrowDown');
  await expectOrder(page, ['beta.md', 'alpha.md', 'gamma.md']);

  await keyboardReorder(page, 2, 'ArrowUp');
  await expectOrder(page, ['beta.md', 'gamma.md', 'alpha.md']);
});

test('reordering preserves the selected file', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);
  await fileItems(page).nth(2).click();
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Gamma Document');

  await dragRow(page, 2, 0);

  await expectOrder(page, ['gamma.md', 'alpha.md', 'beta.md']);
  // Selection follows the file, not the position.
  await expect(fileItems(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Gamma Document');
});

test('removing the active file promotes another into the preview', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md')]);
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Alpha Document');

  await fileItems(page).nth(0).locator('[data-testid^="remove-"]').click();

  await expectOrder(page, ['beta.md']);
  await expect(previewArea(page).getByRole('heading', { level: 1 })).toHaveText('Beta Document');
});

test('removing a row does not also select it', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md'), fixture('gamma.md')]);
  // alpha is active; removing gamma must leave alpha active.
  await fileItems(page).nth(2).locator('[data-testid^="remove-"]').click();

  await expectOrder(page, ['alpha.md', 'beta.md']);
  await expect(fileItems(page).nth(0)).toHaveAttribute('aria-selected', 'true');
});

test('removing every file returns to the empty state', async ({ page }) => {
  await addFiles(page, [fixture('alpha.md'), fixture('beta.md')]);

  await fileItems(page).first().locator('[data-testid^="remove-"]').click();
  await fileItems(page).first().locator('[data-testid^="remove-"]').click();

  await expect(fileItems(page)).toHaveCount(0);
  await expect(emptyState(page)).toBeVisible();
  await expect(convertButton(page)).toBeDisabled();
  await expect(previewArea(page)).toContainText('Select a file to preview');
});
