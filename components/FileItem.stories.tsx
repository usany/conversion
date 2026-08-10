import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { FileItem } from './FileItem';
import { appendixFile, chapterFile, introFile, koreanFile, longNameFile } from './story-fixtures';

const meta = {
  title: 'Converter/FileItem',
  component: FileItem,
  args: {
    file: introFile,
    index: 0,
    isActive: false,
    onRemove: fn(),
    onSelect: fn(),
  },
  argTypes: {
    file: { description: 'The `MarkdownFile` this row represents.', table: { category: 'Data' } },
    index: {
      description: 'Zero-based position. The badge renders `index + 1` — the PDF page order.',
      control: { type: 'number', min: 0, max: 49 },
      table: { category: 'Data' },
    },
    isActive: {
      description: 'Selected-for-preview marker. Sets `data-active` and `aria-selected`.',
      control: 'boolean',
      table: { category: 'State' },
    },
    disabled: {
      description: 'Disables the remove button and the drag handle.',
      control: 'boolean',
      table: { category: 'State' },
    },
    onRemove: {
      description: 'Called with `file.id`. Must `stopPropagation()`.',
      table: { category: 'Events' },
    },
    onSelect: {
      description: 'Called with `file.id` when the row is clicked.',
      table: { category: 'Events' },
    },
  },
  // `useSortable` reads from these contexts; without them dnd-kit warns and the handle is inert.
  decorators: [
    (Story) => (
      <DndContext>
        <SortableContext
          items={[introFile.id, chapterFile.id, appendixFile.id, longNameFile.id, koreanFile.id]}
          strategy={verticalListSortingStrategy}
        >
          <ul className="w-full max-w-md space-y-2">
            <Story />
          </ul>
        </SortableContext>
      </DndContext>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'One sortable row in `FileList`.',
          '',
          '**Contract** — testids `file-item-${id}`, `drag-handle-${id}`, `remove-${id}`.',
          'Exposes `data-active="true" | "false"` on the row.',
          '',
          '**A11y panel** — the drag handle is a real `<button>` whose accessible name matches',
          '`/reorder|drag|move/i` (dnd-kit keyboard reorder depends on it being focusable). The',
          'remove button needs `aria-label={`Remove ${file.name}`}` — matching both `/remove/i`',
          'and the filename. The row carries `aria-selected`, so it must sit inside a container',
          'with an appropriate role (`FileList` renders a `<ul>`/`listbox`). Contrast on the',
          'active row must stay ≥ 4.5:1.',
          '',
          '⚠️ Remove must `stopPropagation()` — otherwise the click bubbles to the row and also',
          'fires `onSelect`, which `FileItem.test.tsx` explicitly forbids.',
          '',
          'Tailwind row: `group flex items-center gap-3 rounded-lg border border-slate-200 bg-white',
          'p-3 shadow-sm transition-colors hover:border-slate-300`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof FileItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resting row: badge "1", filename, formatted size, drag handle, remove button. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId(`file-item-${introFile.id}`)).toHaveAttribute('data-active', 'false');
    expect(canvas.getByText('1')).toBeInTheDocument();
  },
};

/** Currently previewed. Should read as selected without relying on colour alone. */
export const Active: Story = {
  args: { isActive: true, index: 1 },
  parameters: {
    docs: {
      description: {
        story: [
          'Tailwind: `border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500`, driven by the',
          '`data-[active=true]:` variant. Pair the colour with a persistent left accent bar so the',
          'state survives greyscale and colour-blind viewing.',
        ].join('\n'),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByTestId(`file-item-${introFile.id}`);
    expect(row).toHaveAttribute('data-active', 'true');
    expect(row).toHaveAttribute('aria-selected', 'true');
  },
};

/** While a conversion is running the list is frozen. */
export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          'Both the handle and the remove button carry the real `disabled` attribute — not just dimmed styling.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId(`remove-${introFile.id}`)).toBeDisabled();
    expect(canvas.getByTestId(`drag-handle-${introFile.id}`)).toBeDisabled();
  },
};

/** The filename must truncate, not push the size and remove button out of the row. */
export const LongFilename: Story = {
  args: { file: longNameFile, index: 3 },
  parameters: {
    docs: {
      description: {
        story:
          'Tailwind: `min-w-0 flex-1 truncate` on the name, `shrink-0` on the badge, size and buttons.',
      },
    },
  },
};

/** CJK filenames come from the repo fixtures and must not break the layout. */
export const KoreanFilename: Story = {
  args: { file: koreanFile, index: 4 },
};

/** `formatFileSize` boundaries rendered side by side. */
export const FileSizeVariants: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: [
          'B / KB / MB, top to bottom. The size is secondary information —',
          '`text-xs tabular-nums text-slate-500` — so it never competes with the filename.',
        ].join('\n'),
      },
    },
  },
  render: (args) => (
    <>
      <FileItem {...args} file={longNameFile} index={0} />
      <FileItem {...args} file={chapterFile} index={1} />
      <FileItem {...args} file={appendixFile} index={2} />
    </>
  ),
};
