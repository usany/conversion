const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const rounded = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
  return `${rounded} ${UNITS[unit]}`;
}
