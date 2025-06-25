import { NextRequest, NextResponse } from 'next/server';
import { markdownToPdfBuffer } from '@/lib/markdown-to-pdf-html';
import { MarkdownConversionOptions, ConversionResult } from '@/types/converter';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options: MarkdownConversionOptions = {
      pageSize: formData.get('pageSize') as MarkdownConversionOptions['pageSize'],
      width: formData.get('width') ? parseInt(formData.get('width') as string) : undefined,
      height: formData.get('height') ? parseInt(formData.get('height') as string) : undefined,
    };

    // Validate input
    if (!file) {
      return NextResponse.json<ConversionResult>({
        success: false,
        error: 'ファイルが提供されていません',
      }, { status: 400 });
    }

    if (options.pageSize === 'custom' && (!options.width || !options.height)) {
      return NextResponse.json<ConversionResult>({
        success: false,
        error: 'カスタムサイズの場合は幅と高さを指定してください',
      }, { status: 400 });
    }

    // Read markdown content
    const content = await file.text();

    // Convert to PDF using HTML rendering (marked + Playwright)
    const pdfBuffer = await markdownToPdfBuffer(content, {
      pageSize: options.pageSize,
      width: options.width,
      height: options.height,
    });

    // Create filename
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const filename = `${originalName}.pdf`;

    // Convert to base64 for download
    const base64 = pdfBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return NextResponse.json<ConversionResult>({
      success: true,
      data: {
        url: dataUrl,
        filename: filename,
        size: pdfBuffer.length,
      },
    });

  } catch (error) {
    console.error('Markdown conversion error:', error);
    return NextResponse.json<ConversionResult>({
      success: false,
      error: '変換中にエラーが発生しました',
    }, { status: 500 });
  }
}