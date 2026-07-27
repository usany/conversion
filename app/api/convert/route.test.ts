// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setContent = vi.fn().mockResolvedValue(undefined);
const emulateMedia = vi.fn().mockResolvedValue(undefined);
const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock'));
const closeBrowser = vi.fn().mockResolvedValue(undefined);
const launch = vi.fn();

// The route imports Playwright dynamically; vi.mock intercepts dynamic imports too.
vi.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => launch(...args),
  },
}));

import { POST } from './route';

function postRequest(body: unknown, { raw = false } = {}) {
  return new Request('http://localhost:3000/api/convert', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe('POST /api/convert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdf.mockResolvedValue(Buffer.from('%PDF-1.4 mock'));
    launch.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({ setContent, emulateMedia, pdf }),
      close: closeBrowser,
    });
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const response = await POST(postRequest('{ not json', { raw: true }));

    expect(response.status).toBe(400);
    expect(launch).not.toHaveBeenCalled();
  });

  it('returns 400 when files is missing', async () => {
    const response = await POST(postRequest({}));

    expect(response.status).toBe(400);
    expect(launch).not.toHaveBeenCalled();
  });

  it('returns 400 when files is empty', async () => {
    const response = await POST(postRequest({ files: [] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty('error');
    expect(launch).not.toHaveBeenCalled();
  });

  it('returns 400 when a file entry is malformed', async () => {
    const response = await POST(postRequest({ files: [{ name: 'a.md' }] }));

    expect(response.status).toBe(400);
    expect(launch).not.toHaveBeenCalled();
  });

  it('returns a PDF for a valid body', async () => {
    const response = await POST(
      postRequest({
        files: [
          { name: 'a.md', content: '# A' },
          { name: 'b.md', content: '# B' },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders every file into one document with a page break per file', async () => {
    await POST(
      postRequest({
        files: [
          { name: 'a.md', content: '# Alpha' },
          { name: 'b.md', content: '# Beta' },
        ],
      }),
    );

    expect(setContent).toHaveBeenCalledTimes(1);
    const html = setContent.mock.calls[0][0] as string;

    expect(html).toContain('Alpha');
    expect(html).toContain('Beta');
    expect(html).toMatch(/break-before:\s*page/);
    expect(html.match(/class="md-file"/g)).toHaveLength(2);
  });

  it('sanitizes script tags out of the printed document', async () => {
    await POST(
      postRequest({
        files: [{ name: 'x.md', content: '# Safe\n\n<script>alert(1)</script>' }],
      }),
    );

    const html = setContent.mock.calls[0][0] as string;
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('Safe');
  });

  it('closes the browser after a successful render', async () => {
    await POST(postRequest({ files: [{ name: 'a.md', content: '# A' }] }));

    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('returns 500 and still closes the browser when rendering throws', async () => {
    pdf.mockRejectedValue(new Error('chromium crashed'));

    const response = await POST(postRequest({ files: [{ name: 'a.md', content: '# A' }] }));

    expect(response.status).toBe(500);
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });
});
