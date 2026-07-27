import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { BannerState } from '@/lib/types';
import { StatusBanner } from './StatusBanner';

describe('StatusBanner', () => {
  let onDismiss: Mock<() => void>;

  beforeEach(() => {
    onDismiss = vi.fn<() => void>();
  });

  const banner = (overrides: Partial<BannerState> = {}): BannerState => ({
    variant: 'info',
    message: 'Something happened',
    ...overrides,
  });

  it('renders nothing when there is no banner', () => {
    const { container } = render(<StatusBanner banner={null} onDismiss={onDismiss} />);

    expect(screen.queryByTestId('status-banner')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('announces errors assertively with role="alert"', () => {
    render(
      <StatusBanner
        banner={banner({ variant: 'error', message: 'Conversion failed' })}
        onDismiss={onDismiss}
      />,
    );

    const region = screen.getByTestId('status-banner');
    expect(region).toHaveAttribute('role', 'alert');
    expect(region).toHaveAttribute('data-variant', 'error');
    expect(screen.getByText('Conversion failed')).toBeInTheDocument();
  });

  it('announces success politely with role="status"', () => {
    render(
      <StatusBanner
        banner={banner({ variant: 'success', message: 'PDF ready' })}
        onDismiss={onDismiss}
      />,
    );

    const region = screen.getByTestId('status-banner');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('data-variant', 'success');
    expect(screen.getByText('PDF ready')).toBeInTheDocument();
  });

  it('uses role="status" for the info variant too', () => {
    render(<StatusBanner banner={banner({ variant: 'info' })} onDismiss={onDismiss} />);

    expect(screen.getByTestId('status-banner')).toHaveAttribute('role', 'status');
  });

  it('renders rejection details as list items', () => {
    render(
      <StatusBanner
        banner={banner({
          variant: 'error',
          message: '2 files were rejected',
          details: [
            'notes.txt — Not a markdown file (.md or .markdown only)',
            'huge.md — Exceeds the 5 MB per-file limit',
          ],
        })}
        onDismiss={onDismiss}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('notes.txt');
    expect(items[1]).toHaveTextContent('Exceeds the 5 MB per-file limit');
  });

  it('renders no list when there are no details', () => {
    render(<StatusBanner banner={banner()} onDismiss={onDismiss} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('calls onDismiss when the dismiss button is pressed', async () => {
    const user = userEvent.setup();
    render(<StatusBanner banner={banner()} onDismiss={onDismiss} />);

    const dismiss = screen.getByTestId('dismiss-banner');
    expect(dismiss).toHaveAccessibleName(/dismiss|close/i);

    await user.click(dismiss);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
