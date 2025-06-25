export interface SVGConversionOptions {
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  quality?: number; // JPEG quality 1-100
}

export interface MarkdownConversionOptions {
  pageSize: 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'Letter' | 'Legal' | 'Tabloid' | 'custom';
  width?: number; // mm (for custom size)
  height?: number; // mm (for custom size)
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ConversionResult {
  success: boolean;
  data?: {
    url: string;
    filename: string;
    size: number;
    pages?: number; // For PDF
  };
  error?: string;
  warning?: string;
}

export interface FileUploadProps {
  accept: string;
  maxSize: number;
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}