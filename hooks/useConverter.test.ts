import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONVERT_ENDPOINT, REJECTION_MESSAGES } from '@/lib/constants';
import { deferred, makeBrowserFile, makeErrorResponse, makePdfResponse } from '@/tests/test-utils';
import { useConverter } from './useConverter';

describe('useConverter', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let anchorClick: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(makePdfResponse());
    vi.stubGlobal('fetch', fetchMock);
    // The download is a synthetic <a>.click(); jsdom would otherwise warn about navigation.
    anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);

    const { result } = await setupWith([makeBrowserFile('a.md', '# A')]);

    act(() => {
      void result.current.convert();
    });

    await waitFor(() => expect(result.current.status).toBe('converting'));

    await act(async () => {
      pending.resolve(makePdfResponse());
      await pending.promise;
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('sets status error and an error banner when the response is not ok', async () => {
    fetchMock.mockResolvedValue(makeErrorResponse(500, 'Conversion failed'));

    const { result } = await setupWith([makeBrowserFile('a.md', '# A')]);

    await act(async () => {
      await result.current.convert();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.banner?.variant).toBe('error');
    expect(result.current.banner?.message).toBeTruthy();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('sets status error when fetch itself rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const { result } = await setupWith([makeBrowserFile('a.md', '# A')]);

    await act(async () => {
      await result.current.convert();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.banner?.variant).toBe('error');
  });

  it('posts the files to CONVERT_ENDPOINT in their current order', async () => {
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(CONVERT_ENDPOINT);
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.files.map((f: { name: string }) => f.name)).toEqual(['c.md', 'a.md', 'b.md']);
    expect(body.files[0].content).toContain('# C');
  });

  it('does not call fetch when there are no files', async () => {
    const { result } = renderHook(() => useConverter());

    await act(async () => {
      await result.current.convert();
    });

    expect(fetchMock).not.toHaveBeenCalled();
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
