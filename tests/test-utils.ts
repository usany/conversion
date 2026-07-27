import type { MarkdownFile } from '@/lib/types';

let seq = 0;

/**
 * Factory for the domain object components receive as props.
 * Every call gets a distinct id so lists never collide on React keys.
 */
export function makeFile(overrides: Partial<MarkdownFile> = {}): MarkdownFile {
  seq += 1;
  return {
    id: `file-${seq}`,
    name: `doc-${seq}.md`,
    size: 1024,
    lastModified: 1700000000000,
    content: `# Heading ${seq}\n\nBody text ${seq}.`,
    ...overrides,
  };
}

export function makeFiles(count: number, overrides: Partial<MarkdownFile> = {}): MarkdownFile[] {
  return Array.from({ length: count }, () => makeFile(overrides));
}

/** A real browser File, for the DropZone / useConverter paths that read from disk. */
export function makeBrowserFile(
  name = 'doc.md',
  content = '# Hello',
  type = 'text/markdown',
): File {
  return new File([content], name, { type, lastModified: 1700000000000 });
}

/**
 * jsdom has no DataTransfer implementation, so drop events need a stand-in that
 * is FileList-shaped enough for `Array.from(e.dataTransfer.files)`.
 */
export function makeDataTransfer(files: File[]) {
  const fileList = {
    ...files,
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  };

  return {
    files: fileList as unknown as FileList,
    items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
    types: ['Files'],
    setData: () => {},
    getData: () => '',
    clearData: () => {},
  };
}

/** A fetch Response stub good enough for the convert() flow. */
export function makePdfResponse(bytes = '%PDF-1.4 fake') {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/pdf' }),
    blob: async () => new Blob([bytes], { type: 'application/pdf' }),
  } as unknown as Response;
}

export function makeErrorResponse(status = 500, message = 'Conversion failed') {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
    blob: async () => new Blob([], { type: 'application/json' }),
  } as unknown as Response;
}

/** Deferred promise, for observing intermediate state such as `status: 'converting'`. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
