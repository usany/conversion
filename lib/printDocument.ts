import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export interface PrintableFile {
  name: string;
  content: string;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'del',
    'ins',
    'sup',
    'sub',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
};

/**
 * `class="md-file"` must appear once per file and nowhere else — the route test
 * counts occurrences to verify one page break per document.
 */
const PRINT_STYLESHEET = `
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
      'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #0f172a;
  }
  .md-file { break-before: page; }
  .md-file:first-child { break-before: auto; }
  h1, h2, h3, h4 { line-height: 1.3; break-after: avoid; }
  h1 { font-size: 1.9em; margin: 0 0 0.6em; }
  h2 { font-size: 1.45em; margin: 1.4em 0 0.5em; }
  h3 { font-size: 1.2em; margin: 1.2em 0 0.4em; }
  p, ul, ol, blockquote, table { margin: 0 0 0.9em; }
  ul, ol { padding-left: 1.4em; }
  li { margin: 0.2em 0; }
  blockquote {
    margin-left: 0;
    padding: 0.2em 1em;
    border-left: 3px solid #cbd5e1;
    color: #475569;
  }
  pre {
    background: #f1f5f9;
    padding: 0.9em 1.1em;
    border-radius: 6px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    break-inside: avoid;
  }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  :not(pre) > code { background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 4px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #cbd5e1; padding: 0.45em 0.7em; text-align: left; }
  th { background: #f8fafc; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 1.5em 0; }
`;

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPrintDocument(files: PrintableFile[]): string {
  const sections = files
    .map((file) => {
      const rendered = marked.parse(file.content, { async: false, gfm: true }) as string;
      const safe = sanitizeHtml(rendered, SANITIZE_OPTIONS);
      return `<section class="md-file" data-name="${escapeAttribute(file.name)}">${safe}</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Converted markdown</title>
<style>${PRINT_STYLESHEET}</style>
</head>
<body>
${sections}
</body>
</html>`;
}
