import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';

// `pnpm test:e2e` always runs from the package root, which keeps this correct
// under both the CJS and ESM loaders Playwright may pick for .ts files.
export const REPO_ROOT = process.cwd();
export const FIXTURES = path.join(REPO_ROOT, 'tests/e2e/fixtures');

export const fixture = (name: string) => path.join(FIXTURES, name);
export const repoFile = (name: string) => path.join(REPO_ROOT, name);

export const dropzone = (page: Page) => page.getByTestId('dropzone');
export const fileInput = (page: Page) => page.getByTestId('file-input');
export const fileList = (page: Page) => page.getByTestId('file-list');
export const previewArea = (page: Page) => page.getByTestId('preview-area');
export const convertButton = (page: Page) => page.getByTestId('convert-button');
export const statusBanner = (page: Page) => page.getByTestId('status-banner');
export const emptyState = (page: Page) => page.getByTestId('empty-state');

/** File ids are `crypto.randomUUID()`, so every lookup has to be positional. */
export const fileItems = (page: Page) => page.locator('[data-testid^="file-item-"]');

export async function addFiles(page: Page, paths: string[]) {
  await fileInput(page).setInputFiles(paths);
}

/** Whitespace-normalised row text, e.g. "⠿ 1 alpha.md 113 B ×". */
export async function rowTexts(page: Page): Promise<string[]> {
  const texts = await fileItems(page).allInnerTexts();
  return texts.map((text) => text.replace(/\s+/g, ' ').trim());
}

/** Asserts both the list order and the 1-based page-order badge on each row. */
export async function expectOrder(page: Page, names: string[]) {
  await expect(fileItems(page)).toHaveCount(names.length);
  await expect
    .poll(async () => rowTexts(page))
    .toEqual(names.map((name, index) => expect.stringContaining(`${index + 1} ${name}`)));
}

async function centre(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * dnd-kit's PointerSensor has `activationConstraint: { distance: 4 }` and needs a
 * real stream of pointer moves — Playwright's one-hop `dragTo` never activates it.
 */
export async function dragRow(page: Page, fromIndex: number, toIndex: number) {
  const rows = fileItems(page);
  const handle = rows.nth(fromIndex).locator('[data-testid^="drag-handle-"]');
  const from = await centre(handle);
  const to = await centre(rows.nth(toIndex));

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Clear the 4px activation threshold before aiming at the target.
  await page.mouse.move(from.x, from.y + 8, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  // Settle on the target so collision detection resolves a stable `over`.
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}

/** dnd-kit's KeyboardSensor: Space activates, arrows move, Space drops. */
export async function keyboardReorder(page: Page, fromIndex: number, key: 'ArrowDown' | 'ArrowUp') {
  const handle = fileItems(page).nth(fromIndex).locator('[data-testid^="drag-handle-"]');
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press(key);
  await page.keyboard.press('Space');
}

/**
 * Simulates a genuine OS drag onto the DropZone by building a real DataTransfer
 * in the page and dispatching the dragenter/dragover/drop sequence.
 */
export async function dropOntoZone(page: Page, files: { name: string; content: string }[]) {
  await page.evaluate((payload) => {
    const transfer = new DataTransfer();
    for (const file of payload) {
      transfer.items.add(new File([file.content], file.name, { type: 'text/markdown' }));
    }
    const zone = document.querySelector('[data-testid="dropzone"]');
    if (!zone) throw new Error('dropzone not found');
    for (const type of ['dragenter', 'dragover', 'drop']) {
      zone.dispatchEvent(
        new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    }
  }, files);
}

export interface ConvertedPdf {
  filename: string;
  bytes: Buffer;
  pages: number;
}

/**
 * Chromium writes the page tree with compressed object streams, so `/Type /Page`
 * never appears in plaintext — the page-tree `/Count` does, exactly once.
 */
export function pdfPageCount(bytes: Buffer): number {
  const match = bytes.toString('latin1').match(/\/Count\s+(\d+)/);
  if (!match) throw new Error('no /Count in PDF — page tree not found');
  return Number(match[1]);
}

export async function convertAndDownload(page: Page): Promise<ConvertedPdf> {
  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
  await convertButton(page).click();
  const download = await downloadPromise;

  const file = await download.path();
  if (!file) throw new Error('download produced no file');
  const bytes = await readFile(file);

  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  return { filename: download.suggestedFilename(), bytes, pages: pdfPageCount(bytes) };
}

/** Collects console errors and page exceptions for the lifetime of a test. */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}
