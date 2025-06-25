'use client'

import { useState, useEffect } from 'react'
import { marked } from 'marked'
import FileUpload from '@/components/FileUpload/FileUpload'
import { SVGConversionOptions, MarkdownConversionOptions, ConversionResult } from '@/types/converter'
import { MAX_FILE_SIZE } from '@/lib/validators/file'
import { extractSVGDimensions } from '@/lib/svg-utils'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'svg' | 'markdown'>('svg')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Preview states
  const [svgPreviewUrl, setSvgPreviewUrl] = useState<string | null>(null)
  const [markdownHtml, setMarkdownHtml] = useState<string | null>(null)
  const [actualPages, setActualPages] = useState<number>(1)

  // SVG conversion options
  const [svgOptions, setSvgOptions] = useState<SVGConversionOptions>({
    format: 'png',
    width: 1920,
    height: 1080,
    quality: 85,
  })
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true)
  const [aspectRatio, setAspectRatio] = useState<number>(16/9) // Default aspect ratio

  // Markdown conversion options
  const [mdOptions, setMdOptions] = useState<MarkdownConversionOptions>({
    pageSize: 'A4',
    width: 210,
    height: 297,
  })
  
  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (svgPreviewUrl) {
        URL.revokeObjectURL(svgPreviewUrl)
      }
    }
  }, [svgPreviewUrl])
  
  // Update estimated pages when page size or content changes
  useEffect(() => {
    if (markdownHtml && typeof window !== 'undefined') {
      // Create a hidden div to measure actual content height
      const measureDiv = document.createElement('div');
      measureDiv.style.position = 'absolute';
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.left = '-9999px';
      measureDiv.style.top = '0';
      measureDiv.className = 'markdown-preview pdf-page'; // Include both classes for proper styling
      
      // Calculate actual page dimensions at 96dpi
      const scale = 96 / 25.4;
      const pageWidthPx = (mdOptions.width || 210) * scale;
      const pageHeightPx = (mdOptions.height || 297) * scale;
      
      // Apply the same styles as the actual preview
      const padding = 40; // Fixed padding
      measureDiv.style.width = `${pageWidthPx}px`; // Full page width
      measureDiv.style.padding = `${padding}px`;
      measureDiv.style.fontSize = '13px';
      measureDiv.style.lineHeight = '1.5';
      measureDiv.style.boxSizing = 'border-box';
      measureDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", "Roboto", "Helvetica Neue", Arial, sans-serif';
      
      measureDiv.innerHTML = markdownHtml;
      document.body.appendChild(measureDiv);
      
      // Force layout recalculation
      measureDiv.offsetHeight;
      
      // Measure the actual content height
      const contentHeight = measureDiv.scrollHeight - 2 * padding; // Subtract padding from total height
      
      // Calculate available height per page (minus padding)
      const availableHeightPerPage = pageHeightPx - 2 * padding;
      
      // Calculate actual pages needed
      const pages = Math.max(1, Math.ceil(contentHeight / availableHeightPerPage));
      setActualPages(pages);
      
      // Clean up
      document.body.removeChild(measureDiv);
    }
  }, [markdownHtml, mdOptions.pageSize, mdOptions.width, mdOptions.height])

  // Clear selected file and related states when switching tabs
  useEffect(() => {
    // Clean up previous preview URL if exists
    setSvgPreviewUrl(prevUrl => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl)
      }
      return null
    })
    
    setSelectedFile(null)
    setError(null)
    setConversionResult(null)
    setMarkdownHtml(null)
    setActualPages(1)
  }, [activeTab])

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setError(null)
    setConversionResult(null)
    
    // Reset previous previews
    setSvgPreviewUrl(null)
    setMarkdownHtml(null)
    
    // Generate preview based on file type
    if (activeTab === 'svg' && file.name.toLowerCase().endsWith('.svg')) {
      try {
        const text = await file.text()
        
        // Create preview URL
        const svgBlob = new Blob([text], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svgBlob)
        setSvgPreviewUrl(url)
        
        // Extract dimensions
        const dimensions = extractSVGDimensions(text)
        
        if (dimensions) {
          // Set the extracted dimensions as default
          setSvgOptions({
            ...svgOptions,
            width: Math.round(dimensions.width),
            height: Math.round(dimensions.height)
          })
          
          // Calculate and store aspect ratio
          setAspectRatio(dimensions.width / dimensions.height)
        }
      } catch (err) {
        // Silently fail - dimensions extraction is optional
        console.warn('Could not extract SVG dimensions:', err)
      }
    } else if (activeTab === 'markdown' && (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown'))) {
      try {
        const text = await file.text()
        
        // Parse markdown to HTML
        const html = await marked(text)
        setMarkdownHtml(html)
        
        // Initial rough estimate (will be refined after HTML rendering)
        // Count actual lines and estimate space for markdown formatting
        const lines = text.split('\n');
        let estimatedHeight = 0;
        
        lines.forEach(line => {
          if (line.startsWith('#')) {
            // Headers take more space
            estimatedHeight += 30;
          } else if (line.trim() === '') {
            // Empty lines
            estimatedHeight += 16;
          } else {
            // Regular lines (with wrapping)
            const wrappedLines = Math.ceil(line.length / 80);
            estimatedHeight += wrappedLines * 19.5; // 13px * 1.5 line-height
          }
        });
        
        // A4 page height minus padding
        const pageHeight = 1123 - 80;
        const estimated = Math.max(1, Math.ceil(estimatedHeight / pageHeight));
        setActualPages(estimated);
      } catch (err) {
        console.warn('Could not read Markdown file:', err)
      }
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleConvert = async () => {
    if (!selectedFile) return

    setIsConverting(true)
    setError(null)
    setConversionResult(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      let response: Response

      if (activeTab === 'svg') {
        formData.append('format', svgOptions.format)
        formData.append('width', svgOptions.width.toString())
        formData.append('height', svgOptions.height.toString())
        if (svgOptions.quality) {
          formData.append('quality', svgOptions.quality.toString())
        }
        response = await fetch('/api/convert/svg', {
          method: 'POST',
          body: formData,
        })
      } else {
        formData.append('pageSize', mdOptions.pageSize)
        if (mdOptions.width) {
          formData.append('width', mdOptions.width.toString())
        }
        if (mdOptions.height) {
          formData.append('height', mdOptions.height.toString())
        }
        response = await fetch('/api/convert/markdown', {
          method: 'POST',
          body: formData,
        })
      }

      const result: ConversionResult = await response.json()

      if (result.success && result.data) {
        setConversionResult(result)
      } else {
        setError(result.error || '変換に失敗しました')
      }
    } catch (err) {
      setError('変換中にエラーが発生しました')
    } finally {
      setIsConverting(false)
    }
  }

  const handleDownload = () => {
    if (!conversionResult?.data) return

    const link = document.createElement('a')
    link.href = conversionResult.data.url
    link.download = conversionResult.data.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <section style={{ 
        backgroundColor: '#FFFFFF', 
        borderBottom: '1px solid #E0E0E0',
        position: 'sticky',
        top: '60px',
        zIndex: 99
      }}>
        <div className="container" style={{ 
          padding: '24px 32px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          <div>
            <h1 style={{ textAlign: 'left', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>
              {activeTab === 'svg' ? 'SVG to Image Converter' : 'MD to PDF Converter'}
            </h1>
          </div>
          <div>
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value as 'svg' | 'markdown')}
            aria-label="Select converter type"
            title="Choose file conversion type"
            style={{
              padding: '10px 16px',
              fontSize: '16px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: '500',
              minWidth: '180px'
            }}
          >
            <option value="svg">SVG → Image</option>
            <option value="markdown">Markdown → PDF</option>
          </select>
        </div>
      </div>
    </section>

    <div className="container" style={{ paddingTop: '32px' }}>
      <div className="converter-card">
        {activeTab === 'svg' ? (
            <div id="svg-converter">
              <div className={selectedFile && activeTab === 'svg' && svgPreviewUrl ? "converter-grid" : ""}>
                {/* Left side - Settings */}
                <div style={{ maxWidth: selectedFile && activeTab === 'svg' && svgPreviewUrl ? 'none' : '700px', margin: selectedFile && activeTab === 'svg' && svgPreviewUrl ? '0' : '0 auto' }}>
                  <FileUpload
                    accept=".svg"
                    maxSize={MAX_FILE_SIZE.SVG}
                    onFileSelect={handleFileSelect}
                    onError={handleError}
                    disabled={isConverting}
                  />
                  
                  {/* Selected file display */}
                  {selectedFile && activeTab === 'svg' && (
                    <div style={{
                      background: '#E3F2FD',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '16px',
                      color: '#1976D2',
                      fontSize: '14px'
                    }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <span>選択されたファイル: {selectedFile.name}</span>
                    </div>
                  )}

                  {selectedFile && activeTab === 'svg' && (
                    <div className="converter-options mt-3">
                  <div className="form-group">
                    <label>出力形式</label>
                    <select 
                      value={svgOptions.format}
                      onChange={(e) => setSvgOptions({...svgOptions, format: e.target.value as 'png' | 'jpeg'})}
                    >
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                    </select>
                  </div>
                  
                  <div className="form-group mt-3">
                    <div style={{ 
                      border: '1px solid #E0E0E0', 
                      borderRadius: '6px', 
                      padding: '20px',
                      backgroundColor: '#FFFFFF'
                    }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#333333',
                        marginBottom: '16px'
                      }}>画像サイズ</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'end' }}>
                        <div>
                          <label style={{ fontSize: '13px', color: '#666666', marginBottom: '6px', display: 'block', fontWeight: '500' }}>幅 (px)</label>
                          <input 
                            type="number" 
                            value={svgOptions.width}
                            onChange={(e) => {
                              const newWidth = parseInt(e.target.value) || 0;
                              setSvgOptions({
                                ...svgOptions,
                                width: newWidth,
                                height: maintainAspectRatio && newWidth > 0 ? Math.round(newWidth / aspectRatio) : svgOptions.height
                              });
                            }}
                            min="1" 
                            max="10000"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[640, 1280, 1920].map(w => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => {
                                  setSvgOptions({
                                    ...svgOptions,
                                    width: w,
                                    height: maintainAspectRatio ? Math.round(w / aspectRatio) : svgOptions.height
                                  });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  border: '1px solid #E0E0E0',
                                  borderRadius: '3px',
                                  background: svgOptions.width === w ? '#0095EB' : '#FFFFFF',
                                  color: svgOptions.width === w ? '#FFFFFF' : '#666666',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  minWidth: '48px',
                                  textAlign: 'center'
                                }}
                                onMouseEnter={(e) => {
                                  if (svgOptions.width !== w) {
                                    e.currentTarget.style.background = '#F0F0F0';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (svgOptions.width !== w) {
                                    e.currentTarget.style.background = '#FFFFFF';
                                  }
                                }}
                              >
                                {w}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setMaintainAspectRatio(!maintainAspectRatio);
                            if (!maintainAspectRatio && svgOptions.width > 0 && svgOptions.height > 0) {
                              setAspectRatio(svgOptions.width / svgOptions.height);
                            }
                          }}
                          style={{ 
                            background: maintainAspectRatio ? '#E3F2FD' : 'transparent',
                            border: maintainAspectRatio ? '2px solid #0095EB' : '2px solid #E0E0E0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            padding: '8px',
                            marginBottom: '30px',
                            color: maintainAspectRatio ? '#0095EB' : '#999999',
                            transition: 'all 0.2s ease',
                            transform: maintainAspectRatio ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: maintainAspectRatio ? '0 2px 8px rgba(0, 149, 235, 0.2)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!maintainAspectRatio) {
                              e.currentTarget.style.background = '#F5F5F5';
                              e.currentTarget.style.borderColor = '#0095EB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!maintainAspectRatio) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = '#E0E0E0';
                            }
                          }}
                          title={maintainAspectRatio ? 'アスペクト比を維持中（クリックで解除）' : 'アスペクト比を維持しない（クリックで有効化）'}
                        >
                          {maintainAspectRatio ? '🔗' : '🔓'}
                        </button>
                        
                        <div>
                          <label style={{ fontSize: '13px', color: '#666666', marginBottom: '6px', display: 'block', fontWeight: '500' }}>高さ (px)</label>
                          <input 
                            type="number" 
                            value={svgOptions.height}
                            onChange={(e) => {
                              const newHeight = parseInt(e.target.value) || 0;
                              setSvgOptions({
                                ...svgOptions,
                                height: newHeight,
                                width: maintainAspectRatio && newHeight > 0 ? Math.round(newHeight * aspectRatio) : svgOptions.width
                              });
                            }}
                            min="1" 
                            max="10000"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[480, 720, 1080].map(h => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => {
                                  setSvgOptions({
                                    ...svgOptions,
                                    height: h,
                                    width: maintainAspectRatio ? Math.round(h * aspectRatio) : svgOptions.width
                                  });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  border: '1px solid #E0E0E0',
                                  borderRadius: '3px',
                                  background: svgOptions.height === h ? '#0095EB' : '#FFFFFF',
                                  color: svgOptions.height === h ? '#FFFFFF' : '#666666',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  minWidth: '48px',
                                  textAlign: 'center'
                                }}
                                onMouseEnter={(e) => {
                                  if (svgOptions.height !== h) {
                                    e.currentTarget.style.background = '#F0F0F0';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (svgOptions.height !== h) {
                                    e.currentTarget.style.background = '#FFFFFF';
                                  }
                                }}
                              >
                                {h}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        marginTop: '12px',
                        fontSize: '12px',
                        color: maintainAspectRatio ? '#0095EB' : '#999999',
                        textAlign: 'center',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '10px' }}>{maintainAspectRatio ? '●' : '○'}</span>
                        {maintainAspectRatio ? 'アスペクト比を維持中' : 'アスペクト比を自由に変更可能'}
                      </div>
                      
                      {svgOptions.format === 'jpeg' && (
                        <div style={{ 
                          marginTop: '20px',
                          paddingTop: '20px',
                          borderTop: '1px solid #E0E0E0'
                        }}>
                          <div style={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                          }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#333333' }}>品質</label>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0095EB' }}>{svgOptions.quality}%</span>
                          </div>
                          <input 
                            type="range"
                            value={svgOptions.quality}
                            onChange={(e) => setSvgOptions({...svgOptions, quality: parseInt(e.target.value) || 85})}
                            min="1" 
                            max="100"
                            style={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                              background: '#E0E0E0',
                              outline: 'none',
                              WebkitAppearance: 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

                  {selectedFile && activeTab === 'svg' && (
                    <button 
                      className="btn btn-primary mt-3" 
                      disabled={!selectedFile || isConverting || activeTab !== 'svg'}
                      onClick={handleConvert}
                    >
                      {isConverting ? '変換中...' : '変換開始'}
                    </button>
                  )}
                </div>

                {/* Right side - Preview */}
                {selectedFile && activeTab === 'svg' && svgPreviewUrl && (
                  <div>
                    {selectedFile && activeTab === 'svg' && svgPreviewUrl && (
                    <div style={{
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: '#F9F9F9',
                      height: 'fit-content'
                    }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333333',
                        marginBottom: '16px'
                      }}>
                        プレビュー
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '200px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        border: '1px solid #E0E0E0',
                        padding: '20px',
                        overflow: 'auto'
                      }}>
                        <img 
                          src={svgPreviewUrl} 
                          alt="SVG Preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div id="markdown-converter">
              <div className={selectedFile && activeTab === 'markdown' && markdownHtml ? "converter-grid" : ""}>
                {/* Left side - Settings */}
                <div style={{ maxWidth: selectedFile && activeTab === 'markdown' && markdownHtml ? 'none' : '700px', margin: selectedFile && activeTab === 'markdown' && markdownHtml ? '0' : '0 auto' }}>
                  <FileUpload
                    accept=".md,.markdown"
                    maxSize={MAX_FILE_SIZE.MARKDOWN}
                    onFileSelect={handleFileSelect}
                    onError={handleError}
                    disabled={isConverting}
                  />
                  
                  {/* Selected file display */}
                  {selectedFile && activeTab === 'markdown' && (
                    <div style={{
                      background: '#E3F2FD',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '16px',
                      color: '#1976D2',
                      fontSize: '14px'
                    }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <span>選択されたファイル: {selectedFile.name}</span>
                    </div>
                  )}

                  {/* Page Size Options */}
                  {selectedFile && activeTab === 'markdown' && (
                <div className="converter-options mt-3" style={{ marginBottom: '0' }}>
                  <div className="form-group">
                    <label>ページサイズ</label>
                    <select 
                      value={mdOptions.pageSize}
                      onChange={(e) => {
                        const newPageSize = e.target.value as MarkdownConversionOptions['pageSize'];
                        const sizes: Record<string, {width: number, height: number}> = {
                          'A3': { width: 297, height: 420 },
                          'A4': { width: 210, height: 297 },
                          'A5': { width: 148, height: 210 },
                          'B4': { width: 250, height: 353 },
                          'B5': { width: 176, height: 250 },
                          'Letter': { width: 216, height: 279 },
                          'Legal': { width: 216, height: 356 },
                          'Tabloid': { width: 279, height: 432 },
                        };
                        
                        if (sizes[newPageSize]) {
                          setMdOptions({
                            ...mdOptions,
                            pageSize: newPageSize,
                            width: sizes[newPageSize].width,
                            height: sizes[newPageSize].height,
                          });
                        } else {
                          setMdOptions({...mdOptions, pageSize: newPageSize});
                        }
                      }}
                    >
                      <option value="A3">A3 (297 × 420 mm)</option>
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="A5">A5 (148 × 210 mm)</option>
                      <option value="B4">B4 (250 × 353 mm)</option>
                      <option value="B5">B5 (176 × 250 mm)</option>
                      <option value="Letter">Letter (216 × 279 mm)</option>
                      <option value="Legal">Legal (216 × 356 mm)</option>
                      <option value="Tabloid">Tabloid (279 × 432 mm)</option>
                      <option value="custom">カスタム</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'end', marginTop: '16px' }}>
                    <div>
                      <label style={{ fontSize: '14px', color: '#374151', marginBottom: '4px', display: 'block', fontWeight: '500' }}>幅 (mm)</label>
                      <input 
                        type="number" 
                        value={mdOptions.width}
                        onChange={(e) => setMdOptions({...mdOptions, width: parseInt(e.target.value) || 0, pageSize: 'custom'})}
                        min="1" 
                        max="1000"
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    {/* Width/Height swap button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMdOptions({
                          ...mdOptions,
                          width: mdOptions.height,
                          height: mdOptions.width,
                          pageSize: 'custom',
                        });
                      }}
                      style={{
                        padding: '8px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s ease',
                        marginBottom: '2px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F5F5F5';
                        e.currentTarget.style.borderColor = '#0095EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E0E0E0';
                      }}
                      title="縦横の幅を入れ替える"
                    >
                      🔄
                    </button>
                    
                    <div>
                      <label style={{ fontSize: '14px', color: '#374151', marginBottom: '4px', display: 'block', fontWeight: '500' }}>高さ (mm)</label>
                      <input 
                        type="number" 
                        value={mdOptions.height}
                        onChange={(e) => setMdOptions({...mdOptions, height: parseInt(e.target.value) || 0, pageSize: 'custom'})}
                        min="1" 
                        max="1000"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedFile && activeTab === 'markdown' && (
                <button 
                  className="btn btn-primary mt-3" 
                  disabled={!selectedFile || isConverting || activeTab !== 'markdown'}
                  onClick={handleConvert}
                >
                  {isConverting ? '変換中...' : '変換開始'}
                </button>
              )}
                </div>

                {/* Right side - Preview */}
                {selectedFile && activeTab === 'markdown' && markdownHtml && (
                  <div>
                    {selectedFile && activeTab === 'markdown' && markdownHtml && (
                <div style={{
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#F9F9F9',
                  height: 'fit-content'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333333'
                      }}>
                        PDFプレビュー
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666666',
                        marginTop: '2px'
                      }}>
                        推定ページ数: {actualPages}ページ
                      </div>
                    </div>
                    <div style={{
                      textAlign: 'right'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#333333',
                        fontWeight: '500'
                      }}>
                        {mdOptions.pageSize === 'custom' ? 'カスタム' : mdOptions.pageSize}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666666'
                      }}>
                        {`${mdOptions.width} × ${mdOptions.height} mm`}
                      </div>
                    </div>
                  </div>
                  
                  {/* PDF Page Preview Container */}
                  <div style={{
                    backgroundColor: '#888888',
                    padding: '20px',
                    borderRadius: '4px',
                    maxHeight: '600px',
                    overflow: 'auto'
                  }}>
                    <div 
                      className="pdf-preview-pages"
                      style={{
                        margin: '0 auto'
                      }}
                    >
                      {/* Calculate page dimensions */}
                      {(() => {
                        // Convert mm to pixels using CSS pixels (96dpi)
                        // 1 inch = 25.4mm = 96px
                        const scale = 96 / 25.4; // ≈ 3.7795
                        // Use the actual page dimensions from mdOptions
                        let pageWidth = (mdOptions.width || 210) * scale;
                        let pageHeight = (mdOptions.height || 297) * scale;
                        
                        // Scale down to fit in preview area while maintaining aspect ratio
                        const maxWidth = 550;
                        const maxHeight = 750;
                        const scaleX = maxWidth / pageWidth;
                        const scaleY = maxHeight / pageHeight;
                        const finalScale = Math.min(scaleX, scaleY);
                        
                        pageWidth = pageWidth * finalScale;
                        pageHeight = pageHeight * finalScale;
                        
                        // Scale padding proportionally
                        const scaledPadding = 40 * finalScale;
                        
                        // Scale font size proportionally (base 13px)
                        const scaledFontSize = 13 * finalScale;
                        
                        // Create multiple pages manually
                        return (
                          <div>
                            {/* Render up to 5 pages */}
                            {Array.from({ length: Math.max(1, Math.min(actualPages, 5)) }, (_, i) => {
                                // Calculate the exact content offset for this page
                                const availableHeight = pageHeight - 2 * scaledPadding;
                                const contentOffset = i * availableHeight;
                                
                                return (
                                  <div key={i} style={{ position: 'relative', marginBottom: '20px' }}>
                                    <div 
                                      className="pdf-page markdown-preview"
                                      style={{
                                        backgroundColor: '#FFFFFF',
                                        width: `${pageWidth}px`,
                                        height: `${pageHeight}px`,
                                        padding: `${scaledPadding}px`,
                                        fontSize: `${scaledFontSize}px`,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        marginBottom: '8px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        lineHeight: '1.5',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                      }}
                                    >
                                      <div 
                                        style={{
                                          position: 'absolute',
                                          top: `${scaledPadding}px`,
                                          left: `${scaledPadding}px`,
                                          right: `${scaledPadding}px`,
                                          bottom: `${scaledPadding}px`,
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div 
                                          style={{
                                            position: 'absolute',
                                            top: `-${contentOffset}px`,
                                            left: 0,
                                            right: 0
                                          }}
                                          dangerouslySetInnerHTML={{ __html: markdownHtml }} 
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Page number */}
                                    <div style={{
                                      textAlign: 'center',
                                      fontSize: '11px',
                                      color: '#FFFFFF',
                                      marginTop: '8px'
                                    }}>
                                      ページ {i + 1} / {actualPages}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {actualPages > 5 && (
                                <div style={{
                                  textAlign: 'center',
                                  fontSize: '12px',
                                  color: '#FFFFFF',
                                  fontStyle: 'italic',
                                  marginTop: '20px',
                                  opacity: 0.9
                                }}>
                                  ･･･ 残り {actualPages - 5} ページは省略 ･･･
                                </div>
                              )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        
        {error && (
          <div className="error-message mt-3">
            {error}
          </div>
        )}

        {conversionResult && conversionResult.success && conversionResult.data && (
          <div className="success-message mt-3">
            <p>変換が完了しました！</p>
            <p className="text-sm" style={{ color: '#666666' }}>
              ファイルサイズ: {(conversionResult.data.size / 1024).toFixed(2)} KB
            </p>
            {conversionResult.warning && (
              <p className="text-sm mt-2" style={{ color: '#FF9800' }}>
                ⚠️ {conversionResult.warning}
              </p>
            )}
            <button className="btn btn-secondary mt-2" onClick={handleDownload}>
              ダウンロード
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}