import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { makeBrowserFile, makeDataTransfer } from '@/tests/test-utils';
import { DropZone } from './DropZone';

describe('DropZone', () => {
  let onFilesAdded: Mock<(files: File[]) => void>;

  beforeEach(() => {
    onFilesAdded = vi.fn<(files: File[]) => void>();
  });

  it('renders instructional copy and a hidden multi-select markdown input', () => {
    render(<DropZone onFilesAdded={onFilesAdded} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
    expect(screen.getByText(/drag|drop/i)).toBeInTheDocument();

    const input = screen.getByTestId('file-input');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('multiple');
    expect(input.getAttribute('accept')).toContain('.md');
    // Visually hidden, but present in the a11y tree for setInputFiles / RTL upload.
    expect(input).not.toBeVisible();
  });

  it('calls onFilesAdded with the dropped files', () => {
    render(<DropZone onFilesAdded={onFilesAdded} />);
    const files = [makeBrowserFile('a.md'), makeBrowserFile('b.md')];

    fireEvent.drop(screen.getByTestId('dropzone'), {
      dataTransfer: makeDataTransfer(files),
    });

    expect(onFilesAdded).toHaveBeenCalledTimes(1);
    const received = onFilesAdded.mock.calls[0][0] as File[];
    expect(received.map((f) => f.name)).toEqual(['a.md', 'b.md']);
  });

  it('preventDefaults dragover so the browser does not navigate to the file', () => {
    render(<DropZone onFilesAdded={onFilesAdded} />);

    const dragOver = new Event('dragover', { bubbles: true, cancelable: true });
    fireEvent(screen.getByTestId('dropzone'), dragOver);

    expect(dragOver.defaultPrevented).toBe(true);
  });

  it('marks itself drag-active on dragenter and clears it on dragleave', () => {
    render(<DropZone onFilesAdded={onFilesAdded} />);
    const zone = screen.getByTestId('dropzone');

    expect(zone).toHaveAttribute('data-drag-active', 'false');

    fireEvent.dragEnter(zone, { dataTransfer: makeDataTransfer([]) });
    expect(zone).toHaveAttribute('data-drag-active', 'true');

    fireEvent.dragLeave(zone, { dataTransfer: makeDataTransfer([]) });
    expect(zone).toHaveAttribute('data-drag-active', 'false');
  });

  it('clears the drag-active state after a drop', () => {
    render(<DropZone onFilesAdded={onFilesAdded} />);
    const zone = screen.getByTestId('dropzone');

    fireEvent.dragEnter(zone, { dataTransfer: makeDataTransfer([]) });
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer([makeBrowserFile()]) });

    expect(zone).toHaveAttribute('data-drag-active', 'false');
  });

  it('calls onFilesAdded when files are chosen through the input', async () => {
    const user = userEvent.setup();
    render(<DropZone onFilesAdded={onFilesAdded} />);

    await user.upload(screen.getByTestId('file-input'), makeBrowserFile('picked.md'));

    expect(onFilesAdded).toHaveBeenCalledTimes(1);
    expect((onFilesAdded.mock.calls[0][0] as File[])[0].name).toBe('picked.md');
  });

  it('ignores drops while disabled', () => {
    render(<DropZone onFilesAdded={onFilesAdded} disabled />);
    const zone = screen.getByTestId('dropzone');

    fireEvent.dragEnter(zone, { dataTransfer: makeDataTransfer([]) });
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer([makeBrowserFile()]) });

    expect(onFilesAdded).not.toHaveBeenCalled();
    expect(zone).toHaveAttribute('data-drag-active', 'false');
    expect(zone).toHaveAttribute('aria-disabled', 'true');
  });

  it('opens the file picker when Enter is pressed on the focused zone', async () => {
    const user = userEvent.setup();
    render(<DropZone onFilesAdded={onFilesAdded} />);

    const zone = screen.getByTestId('dropzone');
    const clickSpy = vi.spyOn(screen.getByTestId('file-input') as HTMLInputElement, 'click');

    expect(zone).toHaveAttribute('role', 'button');
    zone.focus();
    expect(zone).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(clickSpy).toHaveBeenCalled();
  });

  it('opens the file picker on Space as well, and not while disabled', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DropZone onFilesAdded={onFilesAdded} />);

    // Toggling `disabled` updates the input in place rather than remounting it, and
    // re-spying an already-spied method hands back the same spy with its history.
    const clickSpy = vi.spyOn(screen.getByTestId('file-input') as HTMLInputElement, 'click');

    screen.getByTestId('dropzone').focus();
    await user.keyboard(' ');
    expect(clickSpy).toHaveBeenCalled();

    rerender(<DropZone onFilesAdded={onFilesAdded} disabled />);
    clickSpy.mockClear();
    screen.getByTestId('dropzone').focus();
    await user.keyboard('{Enter}');
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
