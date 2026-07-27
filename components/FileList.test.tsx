import type { DragEndEvent } from '@dnd-kit/core';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { makeFile } from '@/tests/test-utils';
import { FileList } from './FileList';

/**
 * @dnd-kit's sensors depend on real layout geometry, which jsdom does not produce
 * (every rect is 0x0, so collision detection never yields an `over`). We therefore
 * stub the context and capture `onDragEnd`, which lets us assert the part FileList
 * actually owns: translating a dnd-kit drag result into `onReorder(from, to)`.
 * True pointer/keyboard dragging is covered by the Playwright suite.
 */
let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd?: (event: DragEndEvent) => void;
    }) => {
      capturedOnDragEnd = onDragEnd;
      return <div data-testid="dnd-context">{children}</div>;
    },
  };
});

vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/sortable')>();
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      setActivatorNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

/** Emulates the event dnd-kit emits when `active` is dropped onto `over`. */
function fireDragEnd(activeId: string, overId: string | null) {
  act(() => {
    capturedOnDragEnd?.({
      active: { id: activeId },
      over: overId === null ? null : { id: overId },
    } as DragEndEvent);
  });
}

describe('FileList', () => {
  let onReorder: Mock<(fromIndex: number, toIndex: number) => void>;
  let onRemove: Mock<(id: string) => void>;
  let onSelect: Mock<(id: string) => void>;

  beforeEach(() => {
    capturedOnDragEnd = undefined;
    onReorder = vi.fn<(fromIndex: number, toIndex: number) => void>();
    onRemove = vi.fn<(id: string) => void>();
    onSelect = vi.fn<(id: string) => void>();
  });

  const renderList = (
    files = [makeFile(), makeFile(), makeFile()],
    activeId: string | null = null,
  ) => {
    const view = render(
      <FileList
        files={files}
        activeId={activeId}
        onReorder={onReorder}
        onRemove={onRemove}
        onSelect={onSelect}
      />,
    );
    return { ...view, files };
  };

  it('renders one item per file, in array order', () => {
    const { files } = renderList();

    const items = screen.getAllByTestId(/^file-item-/);
    expect(items).toHaveLength(3);
    expect(items.map((el) => el.getAttribute('data-testid'))).toEqual(
      files.map((f) => `file-item-${f.id}`),
    );
  });

  it('renders the empty state and no items when files is empty', () => {
    renderList([]);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^file-item-/)).toHaveLength(0);
  });

  it('numbers the order badges 1, 2, 3', () => {
    const { files } = renderList();

    files.forEach((file, i) => {
      const item = screen.getByTestId(`file-item-${file.id}`);
      expect(within(item).getByText(String(i + 1))).toBeInTheDocument();
    });
  });

  it('calls onSelect with the file id when an item is clicked', async () => {
    const user = userEvent.setup();
    const { files } = renderList();

    await user.click(screen.getByText(files[1].name));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(files[1].id);
  });

  it('calls onRemove — and not onSelect — when the remove button is clicked', async () => {
    const user = userEvent.setup();
    const { files } = renderList();

    await user.click(screen.getByTestId(`remove-${files[2].id}`));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(files[2].id);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('translates a drag from position 0 onto position 1 into onReorder(0, 1)', () => {
    const { files } = renderList();

    fireDragEnd(files[0].id, files[1].id);

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it('translates a drag from the last position onto the first into onReorder(2, 0)', () => {
    const { files } = renderList();

    fireDragEnd(files[2].id, files[0].id);

    expect(onReorder).toHaveBeenCalledWith(2, 0);
  });

  it('does not call onReorder when the drag is dropped outside or onto itself', () => {
    const { files } = renderList();

    fireDragEnd(files[0].id, null);
    fireDragEnd(files[1].id, files[1].id);

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('exposes a focusable, named drag handle per item so keyboard reorder is reachable', async () => {
    const user = userEvent.setup();
    const { files } = renderList();

    const handle = screen.getByTestId(`drag-handle-${files[0].id}`);
    expect(handle.tagName).toBe('BUTTON');
    expect(handle).toHaveAccessibleName();

    await user.tab();
    // The first tab stop inside the list must reach a control, not a dead div.
    expect(document.activeElement).not.toBe(document.body);
  });

  it('marks exactly one item as selected for a given activeId', () => {
    const files = [makeFile(), makeFile(), makeFile()];
    renderList(files, files[1].id);

    const selected = screen
      .getAllByTestId(/^file-item-/)
      .filter((el) => el.getAttribute('data-active') === 'true');

    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute('data-testid', `file-item-${files[1].id}`);
  });

  it('disables every remove button when the list is disabled', () => {
    const files = [makeFile(), makeFile()];
    render(
      <FileList
        files={files}
        activeId={null}
        onReorder={onReorder}
        onRemove={onRemove}
        onSelect={onSelect}
        disabled
      />,
    );

    for (const file of files) {
      expect(screen.getByTestId(`remove-${file.id}`)).toBeDisabled();
    }
  });
});
