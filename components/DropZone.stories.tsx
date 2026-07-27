import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES } from '@/lib/constants';
import { DropZone } from './DropZone';
import { makeBrowserFile, makeFileList } from './story-fixtures';

const meta = {
  title: 'Converter/DropZone',
  component: DropZone,
  args: {
    onFilesAdded: fn(),
  },
  argTypes: {
    onFilesAdded: {
      description: 'Called with the accepted `File[]` from either a drop or the file picker.',
      table: { category: 'Events' },
    },
    disabled: {
      description: 'Blocks both dropping and clicking. Also suppresses the drag-active highlight.',
      control: 'boolean',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Dashed drop target wrapping a hidden `<input type="file" multiple>`.',
          '',
          '**Contract** — testid `dropzone`, inner input testid `file-input`.',
          'Exposes `data-drag-active="true" | "false"` so tests assert state, not Tailwind classes.',
          '',
          '**A11y panel** — the zone is `role="button"` with `tabIndex={0}`; Enter *and* Space must',
          'call `input.click()`. When `disabled`, set `aria-disabled="true"` (do **not** remove the',
          'element from the tab order silently). Keep an `aria-label` or visible text as its',
          'accessible name.',
          '',
          '⚠️ **Hidden input** — `DropZone.test.tsx` asserts `expect(input).not.toBeVisible()`.',
          'jsdom loads no Tailwind CSS, so `className="sr-only"` or `"hidden"` will not satisfy it.',
          'Use the `hidden` **attribute** — Playwright `setInputFiles` and RTL `user.upload` both',
          'work on hidden inputs.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof DropZone>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Enabled and idle. Instruction copy should name the accepted extensions and the limits
 * pulled from `lib/constants.ts` — see the story description.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'Required copy, so users learn the constraints before they hit a rejection banner:',
          '',
          `- accepted extensions: \`${ACCEPTED_EXTENSIONS.join('`, `')}\``,
          `- up to **${MAX_FILES} files**, max **${MAX_FILE_SIZE / 1024 / 1024} MB** each`,
          '- a "browse" affordance for the click/keyboard path',
          '',
          'Tailwind: `rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10',
          'text-center transition-colors hover:border-slate-400`.',
        ].join('\n'),
      },
    },
  },
};

/** `disabled` is driven by the page while a conversion is in flight. */
export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story: [
          'Dropping and clicking are both inert, and `aria-disabled="true"` is set.',
          '`data-drag-active` must stay `"false"` even while a file is dragged over.',
          '',
          'Tailwind: `cursor-not-allowed border-slate-200 bg-slate-100 opacity-60`.',
        ].join('\n'),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const zone = within(canvasElement).getByTestId('dropzone');
    expect(zone).toHaveAttribute('aria-disabled', 'true');
    expect(zone).toHaveAttribute('data-drag-active', 'false');
  },
};

/**
 * Drag-active is internal state, not a prop — the story drives it with a real
 * `dragenter` event so the highlighted styling is visible in the canvas.
 */
export const DragActive: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'Entered via `dragenter`; cleared on `dragleave` and on `drop`.',
          '',
          'Tailwind: `border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10`, applied off the',
          '`data-[drag-active=true]:` variant rather than a React className branch.',
        ].join('\n'),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const zone = within(canvasElement).getByTestId('dropzone');

    zone.dispatchEvent(
      new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      }),
    );

    // A raw dispatchEvent is not wrapped in act(), so React flushes on a later tick.
    await waitFor(() => expect(zone).toHaveAttribute('data-drag-active', 'true'));
  },
};

/** Proves the picker is reachable without a pointer. */
export const KeyboardActivation: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'Tab to the zone, then Enter or Space opens the OS file picker.',
          'Space must also `preventDefault()` so the page does not scroll.',
          '',
          'Tailwind: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          'focus-visible:ring-offset-2`.',
        ].join('\n'),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zone = canvas.getByTestId('dropzone');

    await userEvent.tab();
    expect(zone).toHaveFocus();
    expect(zone).toHaveAttribute('role', 'button');
  },
};

/** The picker path: choosing files fires the same `onFilesAdded` callback as a drop. */
export const FilesSelected: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Drives the hidden input directly, which is exactly what Playwright `setInputFiles` does.',
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    const input = within(canvasElement).getByTestId('file-input') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: makeFileList([makeBrowserFile('introduction.md', '# Introduction')]),
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(args.onFilesAdded).toHaveBeenCalledTimes(1);
  },
};
