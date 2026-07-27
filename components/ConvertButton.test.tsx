import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { ConvertButton } from './ConvertButton';

describe('ConvertButton', () => {
  let onConvert: Mock<() => void>;

  beforeEach(() => {
    onConvert = vi.fn<() => void>();
  });

  it('is disabled when there are no files', () => {
    render(<ConvertButton fileCount={0} status="idle" onConvert={onConvert} />);

    expect(screen.getByTestId('convert-button')).toBeDisabled();
  });

  it('is enabled and pluralises the label for multiple files', () => {
    render(<ConvertButton fileCount={3} status="idle" onConvert={onConvert} />);

    const button = screen.getByTestId('convert-button');
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Convert 3 files to PDF');
  });

  it('uses the singular label for exactly one file', () => {
    render(<ConvertButton fileCount={1} status="idle" onConvert={onConvert} />);

    expect(screen.getByTestId('convert-button')).toHaveTextContent('Convert 1 file to PDF');
    expect(screen.getByTestId('convert-button')).not.toHaveTextContent('files');
  });

  it('shows a busy state while converting', () => {
    render(<ConvertButton fileCount={2} status="converting" onConvert={onConvert} />);

    const button = screen.getByTestId('convert-button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent(/converting/i);
  });

  it('is not busy in idle, success or error states', () => {
    const { rerender } = render(
      <ConvertButton fileCount={2} status="idle" onConvert={onConvert} />,
    );
    expect(screen.getByTestId('convert-button')).not.toHaveAttribute('aria-busy', 'true');

    rerender(<ConvertButton fileCount={2} status="success" onConvert={onConvert} />);
    expect(screen.getByTestId('convert-button')).toBeEnabled();

    rerender(<ConvertButton fileCount={2} status="error" onConvert={onConvert} />);
    expect(screen.getByTestId('convert-button')).toBeEnabled();
  });

  it('calls onConvert once per click when enabled', async () => {
    const user = userEvent.setup();
    render(<ConvertButton fileCount={2} status="idle" onConvert={onConvert} />);

    await user.click(screen.getByTestId('convert-button'));

    expect(onConvert).toHaveBeenCalledTimes(1);
  });

  it('does not call onConvert while converting or with no files', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ConvertButton fileCount={2} status="converting" onConvert={onConvert} />,
    );

    await user.click(screen.getByTestId('convert-button'));
    expect(onConvert).not.toHaveBeenCalled();

    rerender(<ConvertButton fileCount={0} status="idle" onConvert={onConvert} />);
    await user.click(screen.getByTestId('convert-button'));
    expect(onConvert).not.toHaveBeenCalled();
  });
});
