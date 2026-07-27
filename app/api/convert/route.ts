import { z } from 'zod';

import { buildPrintDocument } from '@/lib/printDocument';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1),
});

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: 'Expected a non-empty `files` array of { name, content }.' },
      { status: 400 },
    );
  }

  const html = buildPrintDocument(parsed.data.files);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="converted.pdf"',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'Failed to render the PDF.' }, { status: 500 });
  } finally {
    await browser.close();
  }
}
