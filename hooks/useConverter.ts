'use client';

import { useCallback, useState } from 'react';

import { REJECTION_MESSAGES } from '@/lib/constants';
import { convertMarkdownToPdf } from '@/lib/convertMarkdownToPdf';
import { readMarkdownFiles } from '@/lib/readFiles';
import { reorderFiles } from '@/lib/reorder';
import type { BannerState, ConversionStatus, MarkdownFile, RejectedFile } from '@/lib/types';
import { validateFiles } from '@/lib/validate';

export interface UseConverter {
  files: MarkdownFile[];
  activeId: string | null;
  status: ConversionStatus;
  banner: BannerState | null;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  selectFile: (id: string) => void;
  convert: () => Promise<void>;
  dismissBanner: () => void;
}

const DOWNLOAD_FILENAME = 'converted.pdf';

const describe = (rejected: RejectedFile[]) =>
  rejected.map((file) => `${file.name} — ${REJECTION_MESSAGES[file.reason]}`);

function triggerDownload(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = DOWNLOAD_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useConverter(): UseConverter {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [banner, setBanner] = useState<BannerState | null>(null);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      const { accepted, rejected } = validateFiles(incoming, files);
      const read = accepted.length > 0 ? await readMarkdownFiles(accepted) : [];

      if (read.length > 0) {
        setFiles((previous) => [...previous, ...read]);
        setActiveId((current) => current ?? read[0].id);
      }

      if (rejected.length === 0) {
        setBanner(null);
        return;
      }

      const noun = rejected.length === 1 ? 'file' : 'files';
      setBanner(
        read.length === 0
          ? {
              variant: 'error',
              message: `${rejected.length} ${noun} could not be added.`,
              details: describe(rejected),
            }
          : {
              variant: 'info',
              message: `Added ${read.length} of ${read.length + rejected.length} files.`,
              details: describe(rejected),
            },
      );
    },
    [files],
  );

  const removeFile = useCallback(
    (id: string) => {
      const remaining = files.filter((file) => file.id !== id);
      setFiles(remaining);
      if (activeId === id) setActiveId(remaining[0]?.id ?? null);
    },
    [files, activeId],
  );

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((previous) => reorderFiles(previous, fromIndex, toIndex));
  }, []);

  const selectFile = useCallback((id: string) => setActiveId(id), []);

  const dismissBanner = useCallback(() => setBanner(null), []);

  const convert = useCallback(async () => {
    if (files.length === 0) return;

    setStatus('converting');
    setBanner(null);

    try {
      // Client-side conversion using html2pdf
      const pdfBlob = await convertMarkdownToPdf(
        files.map((file) => ({ name: file.name, content: file.content })),
      );

      triggerDownload(pdfBlob);
      setStatus('success');
      setBanner({
        variant: 'success',
        message: `${DOWNLOAD_FILENAME} is ready in your downloads.`,
      });
    } catch (error) {
      setStatus('error');
      setBanner({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Conversion failed.',
      });
    }
  }, [files]);

  return {
    files,
    activeId,
    status,
    banner,
    addFiles,
    removeFile,
    reorder,
    selectFile,
    convert,
    dismissBanner,
  };
}
