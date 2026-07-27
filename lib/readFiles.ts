import type { MarkdownFile } from './types';

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}

export async function readMarkdownFiles(files: File[]): Promise<MarkdownFile[]> {
  const results = await Promise.allSettled(
    files.map(async (file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      content: await readAsText(file),
    })),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<MarkdownFile> => result.status === 'fulfilled',
    )
    .map((result) => result.value);
}
