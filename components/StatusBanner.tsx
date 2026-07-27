import type { BannerState } from '@/lib/types';

export interface StatusBannerProps {
  banner: BannerState | null;
  onDismiss: () => void;
}

const ICONS: Record<BannerState['variant'], string> = {
  info: 'i',
  success: '✓',
  error: '!',
};

export function StatusBanner({ banner, onDismiss }: StatusBannerProps) {
  if (!banner) return null;

  const { variant, message, details } = banner;

  return (
    <div
      data-testid="status-banner"
      data-variant={variant}
      role={variant === 'error' ? 'alert' : 'status'}
      className={[
        'flex items-start gap-3 rounded-xl border p-4 shadow-sm',
        'data-[variant=info]:border-slate-200 data-[variant=info]:bg-slate-50 data-[variant=info]:text-slate-800',
        'data-[variant=success]:border-emerald-200 data-[variant=success]:bg-emerald-50 data-[variant=success]:text-emerald-900',
        'data-[variant=error]:border-rose-200 data-[variant=error]:bg-rose-50 data-[variant=error]:text-rose-900',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
      >
        {ICONS[variant]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{message}</p>
        {details && details.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm opacity-90">
            {details.map((detail) => (
              <li key={detail} className="break-words">
                {detail}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        data-testid="dismiss-banner"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
