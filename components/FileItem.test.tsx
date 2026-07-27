import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { formatFileSize } from '@/lib/format';
import { makeFile } from '@/tests/test-utils';
import { FileItem } from './FileItem';

// See FileList.test.tsx — dnd-kit needs real layout, which jsdom cannot provide.
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/sortable')>();
  return {
    ...actual,
    useSortable: () => ({
      attributes: { role: 'button', tabIndex: 0 },
      listeners: {},
      setNodeRef: () => {},
      setActivatorNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

describe('FileItem', () => {
  let onRemove: Mock<(id: string) => void>;
  let onSelect: Mock<(id: string) => void>;

  beforeEach(() => {
    onRemove = vi.fn<(id: string) => void>();
    onSelect = vi.fn<(id: string) => void>();
  });

  const renderItem = (props: Partial<React.ComponentProps<typeof FileItem>> = {}) => {
    const file = props.file ?? makeFile({ name: 'chapter-one.md', size: 2048 });
    render(
      <FileItem
        file={file}
        index={0}
        isActive={false}
        onRemove={onRemove}
        onSelect={onSelect}
        {...props}
      />,
    );
    return file;
  };

  it('displays the filename, formatted size and 1-based order badge', () => {
    const file = renderItem({ file: makeFile({ name: 'chapter-one.md', size: 2048 }), index: 2 });

    expect(screen.getByText('chapter-one.md')).toBeInTheDocument();
    expect(screen.getByText(formatFileSize(file.size))).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('flags itself as active when isActive is set', () => {
    const file = renderItem({ isActive: true });

    const item = screen.getByTestId(`file-item-${file.id}`);
    expect(item).toHaveAttribute('data-active', 'true');
    expect(item).toHaveAttribute('aria-selected', 'true');
  });

  it('is not flagged as active by default', () => {
    const file = renderItem();

    expect(screen.getByTestId(`file-item-${file.id}`)).toHaveAttribute('data-active', 'false');
  });

  it('gives the remove button an aria-label naming the file', () => {
    const file = renderItem({ file: makeFile({ name: 'notes.md' }) });

    const remove = screen.getByTestId(`remove-${file.id}`);
    expect(remove).toHaveAccessibleName(/remove/i);
    expect(remove).toHaveAccessibleName(/notes\.md/);
  });

  it('removes without also selecting (the click must not bubble to the row)', async () => {
    const user = userEvent.setup();
    const file = renderItem();

    await user.click(screen.getByTestId(`remove-${file.id}`));

    expect(onRemove).toHaveBeenCalledWith(file.id);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects when the row itself is clicked', async () => {
    const user = userEvent.setup();
    const file = renderItem();

    await user.click(screen.getByText(file.name));

    expect(onSelect).toHaveBeenCalledWith(file.id);
  });

  it('renders the drag handle as a focusable button with an accessible name', () => {
    const file = renderItem({ file: makeFile({ name: 'intro.md' }) });

    const handle = screen.getByTestId(`drag-handle-${file.id}`);
    expect(handle.tagName).toBe('BUTTON');
    expect(handle).toHaveAccessibleName(/reorder|drag|move/i);

    handle.focus();
    expect(handle).toHaveFocus();
  });

  it('disables the remove button and the drag handle when disabled', async () => {
    const user = userEvent.setup();
    const file = renderItem({ disabled: true });

    const remove = screen.getByTestId(`remove-${file.id}`);
    expect(remove).toBeDisabled();
    expect(screen.getByTestId(`drag-handle-${file.id}`)).toBeDisabled();

    await user.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
