import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_SIZE } from './constants';
import type { MarkdownFile, RejectedFile } from './types';

export interface ValidationResult {
  accepted: File[];
  rejected: RejectedFile[];
}

const hasMarkdownExtension = (name: string) =>
  ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

export function validateFiles(files: File[], existing: MarkdownFile[] = []): ValidationResult {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];

  let count = existing.length;
  let totalSize = existing.reduce((sum, file) => sum + file.size, 0);
  const seen = new Set(existing.map((file) => `${file.name}:${file.size}`));

  for (const file of files) {
    const key = `${file.name}:${file.size}`;

    if (!hasMarkdownExtension(file.name)) {
      rejected.push({ name: file.name, reason: 'invalid-extension' });
    } else if (seen.has(key)) {
      rejected.push({ name: file.name, reason: 'duplicate' });
    } else if (file.size > MAX_FILE_SIZE) {
      rejected.push({ name: file.name, reason: 'file-too-large' });
    } else if (count >= MAX_FILES) {
      rejected.push({ name: file.name, reason: 'too-many-files' });
    } else if (totalSize + file.size > MAX_TOTAL_SIZE) {
      rejected.push({ name: file.name, reason: 'total-too-large' });
    } else {
      accepted.push(file);
      seen.add(key);
      count += 1;
      totalSize += file.size;
    }
  }

  return { accepted, rejected };
}
