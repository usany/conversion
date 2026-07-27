import type { RejectionReason } from './types';

export const ACCEPTED_EXTENSIONS = ['.md', '.markdown'] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
export const MAX_FILES = 50;

export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  'invalid-extension': 'Not a markdown file (.md or .markdown only)',
  duplicate: 'Already added',
  'file-too-large': 'Exceeds the 5 MB per-file limit',
  'total-too-large': 'Would exceed the 20 MB total limit',
  'too-many-files': 'Exceeds the 50 file limit',
  'read-error': 'Could not be read',
};

export const CONVERT_ENDPOINT = '/api/convert';
