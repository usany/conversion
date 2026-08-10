import { type DragEvent, type KeyboardEvent, useRef, useState } from 'react';

import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES } from '@/lib/constants';

export interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / 1024 / 1024;

export function DropZone({ onFilesAdded, disabled = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    // Without this the browser navigates away to the dropped file.
    event.preventDefault();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // Moving onto a child fires dragleave on the zone; ignore those.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (disabled) return;

    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) onFilesAdded(files);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPicker();
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a real button cannot contain the file input, and nesting one inside would swallow the drop events
    <div
      data-testid="dropzone"
      data-drag-active={isDragActive ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Drop markdown files here, or press Enter to browse"
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 text-center',
        'cursor-pointer transition-colors select-none hover:border-slate-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'data-[drag-active=true]:border-indigo-500 data-[drag-active=true]:bg-indigo-50',
        'data-[drag-active=true]:ring-4 data-[drag-active=true]:ring-indigo-500/10',
        'aria-disabled:cursor-not-allowed aria-disabled:border-slate-200 aria-disabled:bg-slate-100 aria-disabled:opacity-60',
      ].join(' ')}
    >
      <p className="text-base font-medium text-slate-800">
        Drag and drop markdown files here, or <span className="underline">browse</span>
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {ACCEPTED_EXTENSIONS.join(' or ')} — up to {MAX_FILES} files, {MAX_FILE_SIZE_MB} MB each
      </p>

      <input
        ref={inputRef}
        hidden
        data-testid="file-input"
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFilesAdded(files);
        }}
      />
    </div>
  );
}
