import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Convertly - Simple File Converter | SVG to PNG/JPEG | Markdown to PDF',
  description: 'Free online file converter. Convert SVG to PNG or JPEG with custom resolution. Transform Markdown to PDF with custom page sizes. Fast, simple, and reliable file conversion.',
  keywords: 'file converter, SVG to PNG, SVG to JPEG, Markdown to PDF, online converter, file transformation, document converter, image converter, convertly',
  authors: [{ name: 'Convertly Team' }],
  openGraph: {
    title: 'Convertly - Simple File Converter',
    description: 'Convert SVG to images and Markdown to PDF easily',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0095EB" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              'name': 'Convertly',
              'description': 'Simple and friendly online file converter for SVG to PNG/JPEG and Markdown to PDF',
              'applicationCategory': 'UtilityApplication',
              'operatingSystem': 'Any',
              'offers': {
                '@type': 'Offer',
                'price': '0',
                'priceCurrency': 'USD'
              },
              'featureList': [
                'Convert SVG to PNG with custom resolution',
                'Convert SVG to JPEG with quality control',
                'Convert Markdown to PDF with custom page sizes',
                'Support for Japanese text and emojis',
                'Real-time preview',
                'No file upload limits'
              ]
            })
          }}
        />
        <header className="header">
          <div className="container">
            <div className="header-content">
              <h1 style={{ margin: 0 }}>
                <img 
                  src="/logo.svg" 
                  alt="Convertly - Simple File Converter for SVG to Image and Markdown to PDF" 
                  title="Convertly - Convert files easily"
                  className="logo" 
                />
              </h1>
            </div>
          </div>
        </header>
        <main className="main">
          {children}
        </main>
        <footer className="footer">
          <div className="container">
          </div>
        </footer>
      </body>
    </html>
  )
}