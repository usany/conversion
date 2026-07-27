import type { ConversionStatus } from '@/lib/types';

export interface ConvertButtonProps {
  fileCount: number;
  status: ConversionStatus;
  onConvert: () => void;
}

export function ConvertButton({ fileCount, status, onConvert }: ConvertButtonProps) {
  const isConverting = status === 'converting';
  // Built from a whole word, not stem + "s" — the singular label must not contain "files".
  const noun = fileCount === 1 ? 'file' : 'files';

  return (
    <button
      type="button"
      data-testid="convert-button"
      disabled={fileCount === 0 || isConverting}
      aria-busy={isConverting}
      onClick={onConvert}
      className={[
        'inline-flex min-w-56 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3',
        'text-sm font-semibold text-white shadow-sm transition-colors',
        'hover:bg-indigo-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600',
      ].join(' ')}
    >
      {isConverting ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
          Converting…
        </>
      ) : (
        `Convert ${fileCount} ${noun} to PDF`
      )}
    </button>
  );
}
