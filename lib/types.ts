export interface MarkdownFile {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  content: string;
}

export type ConversionStatus = 'idle' | 'converting' | 'success' | 'error';

export type RejectionReason =
  | 'invalid-extension'
  | 'duplicate'
  | 'file-too-large'
  | 'total-too-large'
  | 'too-many-files'
  | 'read-error';

export interface RejectedFile {
  name: string;
  reason: RejectionReason;
}

export interface BannerState {
  variant: 'info' | 'success' | 'error';
  message: string;
  details?: string[];
}
