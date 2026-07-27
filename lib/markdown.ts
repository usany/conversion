import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

/**
 * Both render paths inject HTML, so both must sanitize. This is the client one
 * (preview); the server print document sanitizes with `sanitize-html`.
 */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
