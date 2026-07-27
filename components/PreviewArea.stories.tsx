import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { PreviewArea } from './PreviewArea';
import { introFile, koreanFile, richFile, unsafeFile } from './story-fixtures';

const meta = {
  title: 'Converter/PreviewArea',
  component: PreviewArea,
  args: { file: introFile },
  argTypes: {
    file: {
      description: 'The selected `MarkdownFile`, or `null` for the placeholder.',
      table: { category: 'Data' },
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Renders `renderMarkdown(file.content)` through `dangerouslySetInnerHTML`. Testid `preview-area`.',
          '',
          '⚠️ **Security** — `renderMarkdown` must sanitize (`isomorphic-dompurify` on the client)',
          '*before* the HTML reaches this component. The server uses `sanitize-html` on the same',
          'markdown, so preview and PDF stay in sync. See the `SanitizedHtml` story.',
          '',
          '**A11y panel** — the rendered markdown supplies its own heading levels, so the panel',
          'itself must not open with an `<h1>` that competes with the document heading; use a',
          '`<h2 class="sr-only">Preview</h2>` or an `aria-label` on the region. Because content is',
          'injected wholesale, axe will flag whatever the markdown contains (e.g. images without',
          "alt) — that is the *user's* markdown, not a component defect.",
          '',
          'Tailwind: `prose prose-slate max-w-none` (needs `@tailwindcss/typography`) inside',
          '`h-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-6`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof PreviewArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing selected — the required placeholder copy is "Select a file to preview". */
export const Empty: Story = {
  args: { file: null },
  parameters: {
    docs: {
      description: {
        story: 'Tailwind: `flex h-full items-center justify-center text-sm text-slate-400`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('preview-area')).toBeInTheDocument();
    expect(canvas.getByText(/select a file to preview/i)).toBeInTheDocument();
  },
};

/** A short, ordinary document. */
export const WithMarkdown: Story = {
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1, name: 'Introduction' });
    expect(heading).toBeInTheDocument();
  },
};

/** Headings, lists, code fences, blockquote, table, rule — the full `prose` surface. */
export const RichMarkdown: Story = {
  args: { file: richFile },
  parameters: {
    docs: {
      description: {
        story: [
          'Every element here also appears in the PDF, so the preview styling and the print',
          'stylesheet should agree. Wide tables and long code lines must scroll inside the panel',
          '(`overflow-x-auto` on `prose pre` and `prose table`), never widen the column.',
        ].join('\n'),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { level: 1, name: 'Kitchen Sink' })).toBeInTheDocument();
    expect(canvasElement.querySelector('pre > code')).not.toBeNull();
  },
};

/** Hostile markdown renders inert: no `<script>`, no `onerror`, no `javascript:` href. */
export const SanitizedHtml: Story = {
  args: { file: unsafeFile },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('script')).toBeNull();
    expect(canvasElement.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(canvasElement.querySelector('a')?.getAttribute('href') ?? '').not.toContain(
      'javascript:',
    );
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  },
};

/** CJK content from the repo fixtures — the reason PDF generation goes through Chromium. */
export const KoreanContent: Story = {
  args: { file: koreanFile },
};
