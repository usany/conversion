import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REJECTION_MESSAGES } from '@/lib/constants';
import * as convertModule from '@/lib/convertMarkdownToPdf';
import { makeBrowserFile } from '@/tests/test-utils';
import { useConverter } from './useConverter';

// Mock the PDF conversion function
vi.mock('@/lib/convertMarkdownToPdf');

describe('useConverter', () => {
  let anchorClick: ReturnType<typeof vi.spyOn>;
  let mockConvert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the PDF conversion to return a dummy blob
    mockConvert = vi.fn().mockResolvedValue(new Blob(['PDF'], { type: 'application/pdf' }));
    vi.mocked(convertModule.convertMarkdownToPdf).mockImplementation(mockConvert);

    // The download is a synthetic <a>.click(); jsdom would otherwise warn about navigation.
    anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Renders the hook and adds the given browser Files through the public API. */
  async function setupWith(files: File[]) {
    const view = renderHook(() => useConverter());
    await act(async () => {
      await view.result.current.addFiles(files);
    });
    return view;
  }

  it('starts empty, idle and without a banner', () => {
    const { result } = renderHook(() => useConverter());

    expect(result.current.files).toEqual([]);
    expect(result.current.activeId).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.banner).toBeNull();
  });

  it('adds valid files and auto-selects the first one', async () => {
    const { result } = await setupWith([
      makeBrowserFile('a.md', '# A'),
      makeBrowserFile('b.markdown', '# B'),
    ]);

    expect(result.current.files.map((f) => f.name)).toEqual(['a.md', 'b.markdown']);
    expect(result.current.files[0].content).toContain('# A');
    expect(result.current.activeId).toBe(result.current.files[0].id);
  });

  it('appends to the existing list and keeps the original selection', async () => {
    const { result } = await setupWith([makeBrowserFile('a.md', '# A')]);
    const firstId = result.current.activeId;

    await act(async () => {
      await result.current.addFiles([makeBrowserFile('b.md', '# B')]);
    });

    expect(result.current.files.map((f) => f.name)).toEqual(['a.md', 'b.md']);
    expect(result.current.activeId).toBe(firstId);
  });

  it('rejects a .txt file with an error banner naming the reason', async () => {
    const { result } = await setupWith([makeBrowserFile('notes.txt', 'plain', 'text/plain')]);

    expect(result.current.files).toEqual([]);
    expect(result.current.banner).not.toBeNull();
    expect(result.current.banner?.variant).toBe('error');

    const details = result.current.banner?.details?.join(' ') ?? '';
    expect(details).toContain('notes.txt');
    expect(details).toContain(REJECTION_MESSAGES['invalid-extension']);
  });

  it('reassigns activeId when the active file is removed', async () => {
    const { result } = await setupWith([
      makeBrowserFile('a.md', '# A'),
      makeBrowserFile('b.md', '# B'),
    ]);
    const [first, second] = result.current.files;
    expect(result.current.activeId).toBe(first.id);

    act(() => {
      result.current.removeFile(first.id);
    });

    expect(result.current.files.map((f) => f.name)).toEqual(['b.md']);
    expect(result.current.activeId).toBe(second.id);

    act(() => {
      result.current.removeFile(second.id);
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.activeId).toBeNull();
  });

  it('keeps activeId when a non-active file is removed', async () => {
    const { result } = await setupWith([
      makeBrowserFile('a.md', '# A'),
      makeBrowserFile('b.md', '# B'),
    ]);
    const [first, second] = result.current.files;

    act(() => {
      result.current.removeFile(second.id);
    });

    expect(result.current.activeId).toBe(first.id);
  });

  it('reorders files without mutating identity of the moved entries', async () => {
    const { result } = await setupWith([
      makeBrowserFile('a.md', '# A'),
      makeBrowserFile('b.md', '# B'),
      makeBrowserFile('c.md', '# C'),
    ]);

    act(() => {
      result.current.reorder(0, 1);
    });

    expect(result.current.files.map((f) => f.name)).toEqual(['b.md', 'a.md', 'c.md']);

    act(() => {
      result.current.reorder(2, 0);
    });

    expect(result.current.files.map((f) => f.name)).toEqual(['c.md', 'b.md', 'a.md']);
  });

  it('selects a file by id', async () => {
    const { result } = await setupWith([
      makeBrowserFile('a.md', '# A'),
      makeBrowserFile('b.md', '# B'),
    ]);

    act(() => {
      result.current.selectFile(result.current.files[1].id);
    });

    expect(result.current.activeId).toBe(result.current.files[1].id);
  });

  it('moves through converting to success and triggers the download', async () => {
    const { result } = await setupWith([makeBrowserFile('a.md', '# A')]);

    act(() => {
      void result.current.convert();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('converts multiple files in their current order', async () => {
    const { result } = await setupWith([
      makeBrowserFile('a.md', '# A'),
      makeBrowserFile('b.md', '# B'),
      makeBrowserFile('c.md', '# C'),
    ]);

    act(() => {
      result.current.reorder(2, 0);
    });

    await act(async () => {
      await result.current.convert();
    });

    expect(result.current.status).toBe('success');
    expect(anchorClick).toHaveBeenCalled();
  });

  it('does not convert when there are no files', async () => {
    const { result } = renderHook(() => useConverter());

    await act(async () => {
      await result.current.convert();
    });

    expect(result.current.status).not.toBe('converting');
  });

  it('clears the banner on dismiss', async () => {
    const { result } = await setupWith([makeBrowserFile('notes.txt', 'plain', 'text/plain')]);
    expect(result.current.banner).not.toBeNull();

    act(() => {
      result.current.dismissBanner();
    });

    expect(result.current.banner).toBeNull();
  });
});
