export interface EmptyStateProps {
  message?: string;
}

const DEFAULT_MESSAGE = 'No files yet. Drop markdown files above to build your document.';

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"
    >
      <p className="mx-auto max-w-xs text-sm text-slate-500">{message ?? DEFAULT_MESSAGE}</p>
    </div>
  );
}
