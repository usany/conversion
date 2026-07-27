import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FileList } from './FileList';
import { chapterFile, introFile, threeFiles } from './story-fixtures';

const meta = {
  title: 'Converter/FileList',
  component: FileList,
  args: {
    files: threeFiles,
    activeId: null,
    onReorder: fn(),
    onRemove: fn(),
    onSelect: fn(),
  },
  argTypes: {
    files: {
      description: 'Current order — this *is* the PDF page order.',
      table: { category: 'Data' },
    },
    activeId: {
      description: 'Id of the file shown in `PreviewArea`, or `null`.',
      control: 'text',
      table: { category: 'State' },
    },
    disabled: {
      description: 'Freezes the list during conversion; disables every handle and remove button.',
      control: 'boolean',
      table: { category: 'State' },
    },
    onReorder: {
      description: 'Receives **indices**, `(fromIndex, toIndex)` — not dnd-kit ids.',
      table: { category: 'Events' },
    },
    onRemove: { description: 'Called with the removed file id.', table: { category: 'Events' } },
    onSelect: { description: 'Called with the clicked file id.', table: { category: 'Events' } },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Sortable list of `FileItem`s wrapped in `DndContext` + `SortableContext`. Testid `file-list`.',
          '',
          "`FileList` owns exactly one piece of logic: translating dnd-kit's",
          '`onDragEnd({ active, over })` into `onReorder(fromIndex, toIndex)`. Drops outside the',
          'list (`over === null`) and drops onto self are no-ops.',
          '',
          '**A11y panel** — render a `<ul>` (or `role="listbox"` if you keep `aria-selected` on rows;',
          'the two must agree, otherwise axe reports a required-parent violation). Give the list an',
          'accessible name such as `aria-label="Files, in PDF page order"`, and register dnd-kit\'s',
          '`KeyboardSensor` with `sortableKeyboardCoordinates` so the handles actually reorder.',
          '',
          'Tailwind: `space-y-2` on the list; the container gets `rounded-xl border border-slate-200 bg-white p-3`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof FileList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No files: `EmptyState` replaces the rows entirely. */
export const Empty: Story = {
  args: { files: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('empty-state')).toBeInTheDocument();
    expect(canvas.queryAllByTestId(/^file-item-/)).toHaveLength(0);
  },
};

/** A single file — reordering is possible but pointless; the handle still renders. */
export const SingleFile: Story = {
  args: { files: [introFile] },
};

/** Three files, badges reading 1, 2, 3 top to bottom. */
export const ThreeFiles: Story = {
  play: async ({ canvasElement }) => {
    const items = within(canvasElement).getAllByTestId(/^file-item-/);
    expect(items).toHaveLength(3);
    expect(items.map((el) => el.getAttribute('data-testid'))).toEqual(
      threeFiles.map((f) => `file-item-${f.id}`),
    );
  },
};

/** Exactly one row may be active at a time. */
export const WithActiveSelection: Story = {
  args: { activeId: chapterFile.id },
  play: async ({ canvasElement }) => {
    const active = within(canvasElement)
      .getAllByTestId(/^file-item-/)
      .filter((el) => el.getAttribute('data-active') === 'true');

    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute('data-testid', `file-item-${chapterFile.id}`);
  },
};

/** Frozen while `status === 'converting'`. */
export const Disabled: Story = {
  args: { disabled: true, activeId: introFile.id },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const file of threeFiles) {
      expect(canvas.getByTestId(`remove-${file.id}`)).toBeDisabled();
    }
  },
};

/** Clicking a row selects it; clicking its remove button must **not**. */
export const SelectionAndRemovalAreSeparate: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText(chapterFile.name));
    expect(args.onSelect).toHaveBeenCalledWith(chapterFile.id);

    await userEvent.click(canvas.getByTestId(`remove-${introFile.id}`));
    expect(args.onRemove).toHaveBeenCalledWith(introFile.id);
    expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

/** Near the 50-file cap: the list scrolls inside its column instead of growing the page. */
export const ManyFiles: Story = {
  args: {
    files: Array.from({ length: 12 }, (_, i) => ({
      ...introFile,
      id: `story-bulk-${i}`,
      name: `section-${String(i + 1).padStart(2, '0')}.md`,
      size: 1024 * (i + 1),
    })),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tailwind: `max-h-[28rem] overflow-y-auto` on the list wrapper, with `overscroll-contain`.',
      },
    },
  },
};
