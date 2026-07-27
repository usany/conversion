import { renderMarkdown } from '@/lib/markdown';
import type { MarkdownFile } from '@/lib/types';

export interface PreviewAreaProps {
  file: MarkdownFile | null;
}

export function PreviewArea({ file }: PreviewAreaProps) {
  if (!file) {
    return (
      <div
        data-testid="preview-area"
        className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-sm text-slate-500">Select a file to preview</p>
      </div>
    );
  }

  return (
    <div
      data-testid="preview-area"
      className="min-h-64 rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* renderMarkdown sanitizes before this point — see lib/markdown.ts. */}
      <article
        className="prose prose-slate max-w-none prose-pre:overflow-x-auto"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized by renderMarkdown
        dangerouslySetInnerHTML={{ __html: renderMarkdown(file.content) }}
      />
    </div>
  );
}
