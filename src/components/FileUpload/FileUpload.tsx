'use client'

import { useState, useRef, DragEvent } from 'react';
import { FileUploadProps } from '@/types/converter';
import { validateFileSize, validateFileType } from '@/lib/validators/file';

export default function FileUpload({ 
  accept, 
  maxSize, 
  onFileSelect, 
  onError,
  disabled = false 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Validate file size
    const sizeError = validateFileSize(file, maxSize);
    if (sizeError) {
      onError(sizeError);
      return;
    }

    // Validate file type
    const acceptedTypes = accept.split(',').reduce((acc, type) => {
      const trimmed = type.trim();
      if (trimmed.startsWith('.')) {
        // Extension-based accept
        if (trimmed === '.svg') {
          acc['image/svg+xml'] = acc['image/svg+xml'] || [];
          acc['image/svg+xml'].push(trimmed);
        } else if (trimmed === '.md' || trimmed === '.markdown') {
          acc['text/markdown'] = acc['text/markdown'] || [];
          acc['text/markdown'].push(trimmed);
          acc['text/plain'] = acc['text/plain'] || [];
          acc['text/plain'].push(trimmed);
        }
      }
      return acc;
    }, {} as Record<string, string[]>);

    const typeError = validateFileType(file, acceptedTypes);
    if (typeError) {
      onError(typeError);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`upload-area ${isDragging ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {accept.includes('svg') ? (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0095EB" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      ) : (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0095EB" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )}
      <p className="mt-2">
        {accept.includes('svg') ? 'SVGファイル' : 'Markdownファイル'}をドラッグ&ドロップ<br />
        または クリックして選択
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </div>
  );
}