import { NextRequest, NextResponse } from 'next/server';
import { SVGConversionOptions, ConversionResult } from '@/types/converter';
import { svgToImage } from '@/lib/svg-to-image';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options: SVGConversionOptions = {
      format: formData.get('format') as 'png' | 'jpeg',
      width: parseInt(formData.get('width') as string),
      height: parseInt(formData.get('height') as string),
      quality: formData.get('quality') ? parseInt(formData.get('quality') as string) : undefined,
    };

    // Validate input
    if (!file) {
      return NextResponse.json<ConversionResult>({
        success: false,
        error: 'ファイルが提供されていません',
      }, { status: 400 });
    }

    if (!options.width || !options.height) {
      return NextResponse.json<ConversionResult>({
        success: false,
        error: '幅と高さを指定してください',
      }, { status: 400 });
    }

    // Read SVG content
    const buffer = Buffer.from(await file.arrayBuffer());
    const svgString = buffer.toString('utf-8');
    
    // Convert SVG to image using browser-based rendering
    let outputBuffer = await svgToImage(
      svgString,
      options.width,
      options.height
    );
    
    // Convert to JPEG if needed
    if (options.format === 'jpeg') {
      const sharp = (await import('sharp')).default;
      outputBuffer = await sharp(outputBuffer)
        .jpeg({ quality: options.quality || 90 })
        .toBuffer();
    }
    
    // Set MIME type and extension
    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = options.format === 'jpeg' ? 'jpg' : 'png';

    // Create filename
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const filename = `${originalName}_${options.width}x${options.height}.${extension}`;

    // Convert to base64 for download
    const base64 = outputBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json<ConversionResult>({
      success: true,
      data: {
        url: dataUrl,
        filename: filename,
        size: outputBuffer.length,
      },
    });

  } catch (error) {
    console.error('SVG conversion error:', error);
    return NextResponse.json<ConversionResult>({
      success: false,
      error: '変換中にエラーが発生しました',
    }, { status: 500 });
  }
}