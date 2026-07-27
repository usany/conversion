import type { MarkdownFile } from '@/lib/types';

/**
 * Stable fixtures for stories. Unlike `tests/test-utils.ts#makeFile`, ids here are
 * fixed so Storybook URLs, testids and interaction tests stay reproducible.
 */

export const introFile: MarkdownFile = {
  id: 'story-intro',
  name: 'introduction.md',
  size: 1240,
  lastModified: 1_700_000_000_000,
  content: [
    '# Introduction',
    '',
    'This document explains how the converter turns markdown into a paginated PDF.',
    '',
    '- Each file starts on a **new page**',
    '- Order is controlled by drag-and-drop',
  ].join('\n'),
};

export const chapterFile: MarkdownFile = {
  id: 'story-chapter',
  name: 'chapter-one.md',
  size: 24_576,
  lastModified: 1_700_000_100_000,
  content: '# Chapter One\n\nBody copy for the first chapter.',
};

export const appendixFile: MarkdownFile = {
  id: 'story-appendix',
  name: 'appendix.md',
  size: 3_145_728,
  lastModified: 1_700_000_200_000,
  content: '# Appendix\n\n| Key | Value |\n| --- | ----- |\n| A   | 1     |',
};

export const longNameFile: MarkdownFile = {
  id: 'story-long-name',
  name: 'a-very-long-markdown-filename-that-should-truncate-rather-than-wrap.markdown',
  size: 512,
  lastModified: 1_700_000_300_000,
  content: '# Long name\n\nUsed to prove the row layout does not break.',
};

export const koreanFile: MarkdownFile = {
  id: 'story-korean',
  name: '보고서.md',
  size: 2048,
  lastModified: 1_700_000_400_000,
  content: '# 문서 제목\n\n본문 내용입니다. CJK 글리프가 PDF에서도 그대로 렌더링되어야 합니다.',
};

export const richFile: MarkdownFile = {
  id: 'story-rich',
  name: 'kitchen-sink.md',
  size: 4096,
  lastModified: 1_700_000_500_000,
  content: [
    '# Kitchen Sink',
    '',
    'Intro paragraph with **bold**, _italic_ and `inline code`.',
    '',
    '## Ordered steps',
    '',
    '1. Drop files',
    '2. Reorder them',
    '3. Convert',
    '',
    '## Unordered list',
    '',
    '- alpha',
    '- beta',
    '  - nested gamma',
    '',
    '## Code',
    '',
    '```ts',
    "const pdf = await fetch('/api/convert', { method: 'POST' });",
    '```',
    '',
    '> A blockquote, to check the prose styling.',
    '',
    '| Column | Value |',
    '| ------ | ----- |',
    '| pages  | 2     |',
    '',
    '---',
    '',
    '[A link](https://example.com)',
  ].join('\n'),
};

/** Raw HTML in the source must be sanitized before it reaches the DOM. */
export const unsafeFile: MarkdownFile = {
  id: 'story-unsafe',
  name: 'untrusted.md',
  size: 320,
  lastModified: 1_700_000_600_000,
  content: [
    '# Sanitized output',
    '',
    'The three lines below are hostile and must render inert:',
    '',
    '<script>window.__pwned = true;</script>',
    '',
    '<img src="x" onerror="window.__pwned = true">',
    '',
    '[click me](javascript:window.__pwned=true)',
    '',
    '<b>Safe inline HTML survives.</b>',
  ].join('\n'),
};

export const threeFiles: MarkdownFile[] = [introFile, chapterFile, appendixFile];

/** A real browser File — Storybook runs in a browser, so `DataTransfer` is available. */
export function makeBrowserFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/markdown' });
}

export function makeFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  return dataTransfer.files;
}
