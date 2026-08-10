import { useConverter } from '@/hooks/useConverter';
import { ConvertButton } from './ConvertButton';
import { DropZone } from './DropZone';
import { FileList } from './FileList';
import { PreviewArea } from './PreviewArea';
import { StatusBanner } from './StatusBanner';

export function ConverterPage() {
  const {
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
  } = useConverter();

  const isConverting = status === 'converting';
  const activeFile = files.find((file) => file.id === activeId) ?? null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Markdown to PDF</h1>
        <p className="mt-1 text-sm text-slate-500">
          Drop your markdown files, put them in the order you want, and every file starts on a new
          PDF page.
        </p>
      </header>

      <DropZone onFilesAdded={addFiles} disabled={isConverting} />

      <StatusBanner banner={banner} onDismiss={dismissBanner} />

      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section aria-label="Files" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Files</h2>
          <FileList
            files={files}
            activeId={activeId}
            onReorder={reorder}
            onRemove={removeFile}
            onSelect={selectFile}
            disabled={isConverting}
          />
        </section>

        <section aria-label="Preview" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Preview</h2>
          <PreviewArea file={activeFile} />
        </section>
      </div>

      <div className="flex justify-end">
        <ConvertButton fileCount={files.length} status={status} onConvert={convert} />
      </div>
    </main>
  );
}
