import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ConverterPage } from './ConverterPage';
import { makeBrowserFile, makeFileList } from './story-fixtures';

/**
 * `ConverterPage` takes no props — state lives in `useConverter`. The variants below are
 * therefore reached by *driving* the page (uploading through the hidden file input, clicking
 * convert) rather than by passing args. That keeps the stories honest: they exercise the same
 * wiring the E2E suite does.
 */
const meta = {
  title: 'Converter/ConverterPage',
  component: ConverterPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          "Composition root: `'use client'`, calls `useConverter()`, passes everything down.",
          '',
          '**Layout** — `DropZone` on top, `StatusBanner` under it, then a two-column grid',
          '(`FileList` | `PreviewArea`), with `ConvertButton` anchored below.',
          '',
          '**A11y panel** — exactly one `<h1>` for the page. The two columns should be `<section>`s',
          'with accessible names ("Files", "Preview"). `StatusBanner` is the only live region on',
          'the page. Tab order must read: dropzone → banner dismiss → file rows → convert.',
          '',
          'Tailwind shell: `mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6`; the grid is',
          '`grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]` so it stacks on mobile and the',
          'preview column can shrink (`minmax(0,…)` prevents wide code blocks blowing out the grid).',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ConverterPage>;

export default meta;
type Story = StoryObj<typeof meta>;

async function uploadStoryFiles(canvasElement: HTMLElement) {
  const input = within(canvasElement).getByTestId('file-input') as HTMLInputElement;

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: makeFileList([
      makeBrowserFile('introduction.md', '# Introduction\n\n- point one\n- point two'),
      makeBrowserFile('chapter-one.md', '# Chapter One\n\nBody copy.'),
      makeBrowserFile('보고서.md', '# 문서 제목\n\n본문 내용입니다.'),
    ]),
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** First load: empty list, `EmptyState` visible, convert disabled. */
export const Initial: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('dropzone')).toBeInTheDocument();
    expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
    expect(canvas.getByTestId('convert-button')).toBeDisabled();
    expect(canvas.getByText(/select a file to preview/i)).toBeInTheDocument();
  },
};

/** Three files read in. The first is auto-selected, so the preview is populated. */
export const WithFiles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await uploadStoryFiles(canvasElement);

    await waitFor(() => expect(canvas.getAllByTestId(/^file-item-/)).toHaveLength(3));
    expect(canvas.getByTestId('convert-button')).toHaveTextContent('Convert 3 files to PDF');
    await waitFor(() =>
      expect(canvas.getByRole('heading', { level: 1, name: 'Introduction' })).toBeInTheDocument(),
    );
  },
};

/** Selecting a different row swaps the preview without changing the list order. */
export const PreviewSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await uploadStoryFiles(canvasElement);

    await waitFor(() => expect(canvas.getAllByTestId(/^file-item-/)).toHaveLength(3));
    await userEvent.click(canvas.getByText('chapter-one.md'));

    await waitFor(() =>
      expect(canvas.getByRole('heading', { level: 1, name: 'Chapter One' })).toBeInTheDocument(),
    );
  },
};

/**
 * Conversion in flight. `fetch` is stubbed with a promise that never settles, so the canvas
 * stays parked in the busy state for visual review.
 */
export const Converting: Story = {
  beforeEach: () => {
    const original = window.fetch;
    window.fetch = () => new Promise<Response>(() => {});
    return () => {
      window.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await uploadStoryFiles(canvasElement);

    await waitFor(() => expect(canvas.getByTestId('convert-button')).toBeEnabled());
    await userEvent.click(canvas.getByTestId('convert-button'));

    await waitFor(() => {
      const button = canvas.getByTestId('convert-button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
    expect(canvas.getByTestId('dropzone')).toHaveAttribute('aria-disabled', 'true');
  },
};

/** A `.txt` file is rejected: error banner, list stays empty, convert stays disabled. */
export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('file-input') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: makeFileList([new File(['plain text'], 'notes.txt', { type: 'text/plain' })]),
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      const banner = canvas.getByTestId('status-banner');
      expect(banner).toHaveAttribute('data-variant', 'error');
    });
    expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
    expect(canvas.getByTestId('convert-button')).toBeDisabled();
  },
};

/** The failure path: the request rejects and the page offers a retry. */
export const ConversionFailed: Story = {
  beforeEach: () => {
    const original = window.fetch;
    window.fetch = async () =>
      new Response(JSON.stringify({ error: 'Conversion failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    return () => {
      window.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await uploadStoryFiles(canvasElement);

    await waitFor(() => expect(canvas.getByTestId('convert-button')).toBeEnabled());
    await userEvent.click(canvas.getByTestId('convert-button'));

    await waitFor(() => {
      expect(canvas.getByTestId('status-banner')).toHaveAttribute('data-variant', 'error');
      expect(canvas.getByTestId('convert-button')).toBeEnabled();
    });
  },
};
