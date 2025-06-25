import { chromium } from 'playwright';

export async function svgToImage(
  svgString: string,
  width: number,
  height: number
): Promise<Buffer> {
  // Launch browser
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Convert SVG to base64 data URI
    const svgBase64 = Buffer.from(svgString).toString('base64');
    const dataUri = `data:image/svg+xml;charset=utf-8;base64,${svgBase64}`;

    // Create HTML with Canvas rendering
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <canvas id="canvas"></canvas>
        <script>
          async function renderSvg() {
            const img = new Image();
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            return new Promise((resolve, reject) => {
              img.onload = function() {
                // Set canvas size to user-specified dimensions
                canvas.width = ${width};
                canvas.height = ${height};
                
                // Draw SVG scaled to fit the canvas
                ctx.drawImage(img, 0, 0, ${width}, ${height});
                
                // Convert to blob
                canvas.toBlob((blob) => {
                  if (blob) {
                    // Convert blob to array buffer, then to Uint8Array
                    blob.arrayBuffer().then(buffer => {
                      // Convert to Uint8Array so it can be serialized
                      const uint8Array = new Uint8Array(buffer);
                      // Convert to regular array for serialization
                      const array = Array.from(uint8Array);
                      resolve(array);
                    });
                  } else {
                    reject(new Error('Failed to create blob'));
                  }
                }, 'image/png');
              };
              
              img.onerror = function() {
                reject(new Error('Failed to load SVG'));
              };
              
              img.src = '${dataUri}';
            });
          }
          
          // Expose function to Playwright
          window.renderSvg = renderSvg;
        </script>
      </body>
      </html>
    `;

    // Set content
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Execute the rendering function and get the array
    const array = await page.evaluate(async () => {
      return await (window as any).renderSvg();
    }) as number[];

    // Convert array back to Buffer
    const buffer = Buffer.from(array);

    return buffer;
  } finally {
    // Always cleanup browser
    await browser.close();
  }
}