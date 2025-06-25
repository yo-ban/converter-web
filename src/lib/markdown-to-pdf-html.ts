import { chromium } from 'playwright';
import { marked } from 'marked';

export async function markdownToPdfBuffer(
  markdown: string,
  options: {
    pageSize?: 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'Letter' | 'Legal' | 'Tabloid' | 'custom';
    width?: number;
    height?: number;
  }
): Promise<Buffer> {
  // Parse markdown to HTML
  const htmlContent = await marked(markdown);
  
  // Create full HTML document with styles
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Reset and base styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #333333;
      padding: 0;
      margin: 0;
      /* Ensure consistent rendering with preview */
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    
    /* Markdown styles - exactly matching the preview */
    h1 {
      font-size: 1.8em;
      font-weight: 700;
      margin-top: 0.67em;
      margin-bottom: 0.67em;
      border-bottom: 2px solid #E0E0E0;
      padding-bottom: 0.3em;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 1.4em;
      font-weight: 700;
      margin-top: 0.83em;
      margin-bottom: 0.83em;
      border-bottom: 1px solid #E0E0E0;
      padding-bottom: 0.2em;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 1.2em;
      font-weight: 700;
      margin-top: 1em;
      margin-bottom: 1em;
      page-break-after: avoid;
    }
    
    h4 {
      font-size: 1.1em;
      font-weight: 700;
      margin-top: 1.33em;
      margin-bottom: 1.33em;
      page-break-after: avoid;
    }
    
    h5 {
      font-size: 1.1em;
      font-weight: 700;
      margin-top: 1.67em;
      margin-bottom: 1.67em;
      page-break-after: avoid;
    }
    
    h6 {
      font-size: 1.1em;
      font-weight: 700;
      margin-top: 2.33em;
      margin-bottom: 2.33em;
      page-break-after: avoid;
    }
    
    p {
      margin-top: 0;
      margin-bottom: 1em;
      font-size: 1em;
      line-height: 1.7;
    }
    
    ul, ol {
      margin-top: 0;
      margin-bottom: 1em;
      padding-left: 2em;
    }
    
    ul li, ol li {
      margin-bottom: 0.25em;
      line-height: 1.7;
    }
    
    ul ul, ul ol, ol ul, ol ol {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }
    
    pre {
      background: #F5F5F5;
      border: 1px solid #E0E0E0;
      border-radius: 4px;
      padding: 1em;
      overflow-x: auto;
      margin-top: 0;
      margin-bottom: 1em;
      font-size: 0.9em;
      page-break-inside: avoid;
    }
    
    code {
      background: #F5F5F5;
      border: 1px solid #E0E0E0;
      border-radius: 3px;
      padding: 0.2em 0.4em;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre code {
      background: none;
      border: none;
      padding: 0;
      font-size: 1em;
    }
    
    blockquote {
      border-left: 4px solid #0095EB;
      padding-left: 1em;
      margin: 0 0 1em 0;
      color: #666666;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1em;
      overflow: auto;
      font-size: 0.95em;
      page-break-inside: avoid;
    }
    
    table th, table td {
      border: 1px solid #E0E0E0;
      padding: 0.5em 1em;
      text-align: left;
    }
    
    table th {
      background: #F5F5F5;
      font-weight: 700;
    }
    
    table tr:nth-child(even) {
      background: #F9F9F9;
    }
    
    hr {
      border: none;
      border-top: 2px solid #E0E0E0;
      margin: 2em 0;
      page-break-after: avoid;
    }
    
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em 0;
    }
    
    a {
      color: #0095EB;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    strong {
      font-weight: 700;
    }
    
    em {
      font-style: italic;
    }
    
    del {
      text-decoration: line-through;
    }
    
    /* Page break control */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }
    
    p {
      orphans: 3;
      widows: 3;
    }
    
    /* Print-specific styles */
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `;
  
  // Launch browser
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Set viewport to match PDF size for consistent rendering
    if (options.pageSize === 'A4') {
      await page.setViewportSize({ width: 794, height: 1123 }); // A4 at 96dpi
    } else if (options.pageSize === 'Letter') {
      await page.setViewportSize({ width: 816, height: 1056 }); // Letter at 96dpi
    } else if (options.pageSize === 'custom' && options.width && options.height) {
      const width = Math.round((options.width / 25.4) * 96);
      const height = Math.round((options.height / 25.4) * 96);
      await page.setViewportSize({ width, height });
    }
    
    // Set content
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    // Configure PDF options - matching preview padding (40px ≈ 11mm)
    const pdfOptions: any = {
      printBackground: true,
      margin: {
        top: '40px',
        right: '40px',
        bottom: '40px',
        left: '40px'
      }
    };
    
    // Set page size
    if (['A3', 'A4', 'A5', 'Letter', 'Legal', 'Tabloid'].includes(options.pageSize || '')) {
      pdfOptions.format = options.pageSize;
    } else if (options.width && options.height) {
      // For B4, B5, and custom sizes, use width/height in mm
      pdfOptions.width = `${options.width}mm`;
      pdfOptions.height = `${options.height}mm`;
    } else {
      pdfOptions.format = 'A4'; // Default
    }
    
    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);
    
    return Buffer.from(pdfBuffer);
  } finally {
    // Always cleanup browser
    await browser.close();
  }
}