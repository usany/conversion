import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KeyboardEvent, MouseEvent } from 'react';

import { formatFileSize } from '@/lib/format';
import type { MarkdownFile } from '@/lib/types';

export interface FileItemProps {
  file: MarkdownFile;
  index: number;
  isActive: boolean;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function FileItem({
  file,
  index,
  isActive,
  onRemove,
  onSelect,
  disabled = false,
}: FileItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: file.id, disabled });

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    // Removing must not also select the row.
    event.stopPropagation();
    onRemove(file.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(file.id);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid={`file-item-${file.id}`}
      data-active={isActive ? 'true' : 'false'}
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: rows are the options of the parent listbox — selecting one drives the preview
      role="option"
      aria-selected={isActive}
      tabIndex={0}
      onClick={() => onSelect(file.id)}
      onKeyDown={handleKeyDown}
      className={[
        'relative flex items-center gap-3 rounded-lg border bg-white py-2 pr-2 pl-4 shadow-sm',
        'cursor-pointer transition-colors',
        'before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'data-[active=false]:border-slate-200 data-[active=false]:hover:border-slate-300',
        'data-[active=true]:border-indigo-300 data-[active=true]:bg-indigo-50/60',
        'data-[active=true]:before:bg-indigo-600',
      ].join(' ')}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        data-testid={`drag-handle-${file.id}`}
        aria-label={`Reorder ${file.name}`}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab rounded-md px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
        {index + 1}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-slate-800">{file.name}</span>
        <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
      </span>

      <button
        type="button"
        data-testid={`remove-${file.id}`}
        aria-label={`Remove ${file.name}`}
        disabled={disabled}
        onClick={handleRemove}
        className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
