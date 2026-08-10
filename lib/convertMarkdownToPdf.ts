import { marked } from 'marked';
import html2pdf from 'html2pdf.js';

export interface MarkdownFile {
  name: string;
  content: string;
}

/**
 * Convert markdown files to a single PDF document.
 * Each file starts on a new page.
 */
export async function convertMarkdownToPdf(files: MarkdownFile[]): Promise<Blob> {
  // Create a container for all content
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.lineHeight = '1.6';
  container.style.color = '#000';
  container.style.backgroundColor = '#fff';

  // Process each markdown file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Convert markdown to HTML
    const htmlContent = marked(file.content) as string;

    // Create a section for this file
    const section = document.createElement('div');
    section.style.pageBreakAfter = 'always';
    section.style.marginBottom = '20px';

    // Add file name as heading
    const fileHeader = document.createElement('h1');
    fileHeader.textContent = file.name;
    fileHeader.style.marginBottom = '20px';
    fileHeader.style.borderBottom = '2px solid #333';
    fileHeader.style.paddingBottom = '10px';

    section.appendChild(fileHeader);

    // Add converted HTML content
    const content = document.createElement('div');
    content.innerHTML = htmlContent;
    // Style the converted HTML
    content.style.fontSize = '14px';
    section.appendChild(content);

    container.appendChild(section);
  }

  // Configure pdf options
  const options = {
    margin: 10,
    filename: 'converted.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  } as const;

  // Generate PDF and return as Blob
  return new Promise((resolve, reject) => {
    html2pdf()
      .set(options)
      .from(container)
      .output('blob')
      .then((blob: Blob) => {
        resolve(blob);
      })
      .catch((error: Error) => {
        reject(new Error(`PDF generation failed: ${error.message}`));
      });
  });
}
