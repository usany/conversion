import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import type { MarkdownFile } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { FileItem } from './FileItem';

export interface FileListProps {
  files: MarkdownFile[];
  activeId: string | null;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function FileList({
  files,
  activeId,
  onReorder,
  onRemove,
  onSelect,
  disabled = false,
}: FileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const fromIndex = files.findIndex((file) => file.id === active.id);
    const toIndex = files.findIndex((file) => file.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    onReorder(fromIndex, toIndex);
  };

  if (files.length === 0) {
    return (
      <div data-testid="file-list">
        <EmptyState />
      </div>
    );
  }

  return (
    <div data-testid="file-list" className="max-h-[28rem] overflow-y-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={files.map((file) => file.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: rows are single-select (they drive the preview), so the list is deliberately a listbox */}
          <ul role="listbox" aria-label="Files in page order" className="flex flex-col gap-2">
            {files.map((file, index) => (
              <FileItem
                key={file.id}
                file={file}
                index={index}
                isActive={file.id === activeId}
                onRemove={onRemove}
                onSelect={onSelect}
                disabled={disabled}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
