export const MAX_FILE_SIZE = {
  SVG: 10 * 1024 * 1024, // 10MB
  MARKDOWN: 5 * 1024 * 1024, // 5MB
};

export const ACCEPTED_FILE_TYPES = {
  SVG: {
    'image/svg+xml': ['.svg'],
  },
  MARKDOWN: {
    'text/markdown': ['.md', '.markdown'],
    'text/plain': ['.md', '.markdown'],
  },
};

export function validateFileSize(file: File, maxSize: number): string | null {
  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
    return `ファイルサイズが大きすぎます。最大${sizeMB}MBまでです。`;
  }
  return null;
}

export function validateFileType(file: File, acceptedTypes: Record<string, string[]>): string | null {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  // Check MIME type and extension
  const acceptedMimeTypes = Object.keys(acceptedTypes);
  let isValidType = false;
  
  for (const mimeType of acceptedMimeTypes) {
    if ((file.type === mimeType || file.type === '') && acceptedTypes[mimeType].includes(fileExtension)) {
      isValidType = true;
      break;
    }
  }
  
  if (!isValidType) {
    return '対応していないファイル形式です。';
  }
  
  return null;
}