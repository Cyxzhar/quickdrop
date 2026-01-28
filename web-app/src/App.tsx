import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import './App.css'
import { compressImage } from './utils/imageCompression'
import { ExpiryPicker } from './components/ExpiryPicker'

// Lazy load heavy components
const ImageEditor = lazy(() => import('./components/ImageEditor').then(m => ({ default: m.ImageEditor })))
const QRCodeModal = lazy(() => import('./components/QRCodeModal').then(m => ({ default: m.QRCodeModal })))

// Lazy load OCR service
const loadOCR = () => import('./services/ocr').then(m => m.extractText)

interface UploadRecord {
  id: string
  link: string
  filename: string
  thumbnail: string
  timestamp: number
  expiresAt: number
  ocrText?: string
}

const API_URL = 'https://quickdrop-worker.binodalgopro123.workers.dev'

function App() {
  const [history, setHistory] = useState<UploadRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editingImage, setEditingImage] = useState<{ url: string; filename: string } | null>(null)
  const [qrImage, setQrImage] = useState<{ link: string; filename: string } | null>(null)
  const [expiryHours, setExpiryHours] = useState<number>(24)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quickdrop-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only load last 20 items
        setHistory(Array.isArray(parsed) ? parsed.slice(0, 20) : [])
      }
    } catch (error) {
      console.error('[Storage] Failed to load history:', error)
      localStorage.removeItem('quickdrop-history')
    }

    // Listen for paste events
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            uploadImage(file)
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      // Only store last 20 items to prevent quota issues
      const historyToSave = history.slice(0, 20)
      localStorage.setItem('quickdrop-history', JSON.stringify(historyToSave))
    } catch (error) {
      console.error('[Storage] Failed to save history:', error)

      // If quota exceeded, clear old items and try again
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Storage] Quota exceeded, reducing history size')
        try {
          // Keep only last 10 items
          const reducedHistory = history.slice(0, 10)
          localStorage.setItem('quickdrop-history', JSON.stringify(reducedHistory))
          setHistory(reducedHistory)
          showToast('Storage limit reached - keeping recent 10 items', 'error')
        } catch (retryError) {
          console.error('[Storage] Still failed after cleanup:', retryError)
          localStorage.removeItem('quickdrop-history')
          showToast('Storage cleared due to limit', 'error')
        }
      }
    }
  }, [history])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const captureScreenshot = async () => {
    try {
      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      } as DisplayMediaStreamOptions)

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true

      await new Promise(resolve => {
        video.onloadedmetadata = resolve
      })

      // Create canvas and draw current frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)

      // Stop the stream
      stream.getTracks().forEach(track => track.stop())

      // Convert to blob and upload
      canvas.toBlob(blob => {
        if (blob) {
          uploadImage(blob, 'screenshot.png')
        }
      }, 'image/png')
    } catch (error) {
      console.error('Screen capture failed:', error)
      showToast('Screen capture cancelled or failed', 'error')
    }
  }

  const createSmallThumbnail = async (fileOrBlob: File | Blob): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.onload = () => {
          // Create small thumbnail (max 200x200)
          const canvas = document.createElement('canvas')
          const maxSize = 200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to JPEG with quality 0.7 for smaller size
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = e.target?.result as string
      }

      reader.readAsDataURL(fileOrBlob)
    })
  }

  const uploadImage = async (fileOrBlob: File | Blob, filename?: string) => {
    setIsUploading(true)

    try {
      let uploadFile = fileOrBlob

      // Compress if File and over 500KB
      if (fileOrBlob instanceof File && fileOrBlob.size > 500 * 1024) {
        uploadFile = await compressImage(fileOrBlob)
      }

      // Create small thumbnail for localStorage (max 200x200, JPEG)
      const thumbnailDataUrl = await createSmallThumbnail(uploadFile)

      const formData = new FormData()
      formData.append('image', uploadFile, filename || (fileOrBlob as File).name || 'image.png')
      formData.append('expiryHours', expiryHours.toString())

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { id, link } = await response.json()

      const timestamp = Date.now()

      const record: UploadRecord = {
        id,
        link,
        filename: filename || (fileOrBlob as File).name || 'screenshot.png',
        thumbnail: thumbnailDataUrl, // Use small local thumbnail for localStorage
        timestamp,
        expiresAt: timestamp + expiryHours * 60 * 60 * 1000
      }

      // Add to history immediately with small thumbnail
      setHistory(prev => {
        const updated = [record, ...prev]
        // Keep only last 20 items
        if (updated.length > 20) updated.splice(20)
        return updated
      })

      // Copy link to clipboard
      await navigator.clipboard.writeText(link)
      showToast('Link copied to clipboard!', 'success')

      // Extract OCR text in background (non-blocking)
      if (fileOrBlob) {
        loadOCR().then(extractText => {
          return extractText(fileOrBlob)
        }).then(ocrText => {
          if (ocrText && ocrText.length > 0) {
            // Update the record with OCR text
            setHistory(prev => prev.map(item =>
              item.id === id ? { ...item, ocrText } : item
            ))
            console.log(`[OCR] Extracted ${ocrText.length} characters for ${id}`)
          }
        }).catch(err => {
          console.error('[OCR] Extraction failed:', err)
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      uploadImage(files[0])
    } else {
      showToast('Please drop an image file', 'error')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      showToast('No valid image files selected', 'error')
      return
    }

    // Upload in parallel with concurrency limit of 3
    const batchSize = 3
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize)
      await Promise.all(batch.map(file => uploadImage(file)))
    }

    // Reset file input
    e.target.value = ''
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    showToast('Link copied!', 'success')
  }

  const shareLink = async (link: string, filename: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QuickDrop - ' + filename,
          text: 'Check out this screenshot',
          url: link
        })
        showToast('Shared successfully!', 'success')
      } catch (err) {
        // User cancelled or share failed
        if (err instanceof Error && err.name !== 'AbortError') {
          copyLink(link)
        }
      }
    } else {
      copyLink(link)
    }
  }

  const openLink = (link: string) => {
    window.open(link, '_blank')
  }

  const deleteRecord = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
    showToast('Deleted from history', 'success')
  }

  const clearHistory = () => {
    if (confirm('Clear all upload history?')) {
      setHistory([])
      showToast('History cleared', 'success')
    }
  }

  const handleEditImage = (link: string, filename: string) => {
    setEditingImage({ url: link, filename })
  }

  const handleSaveAnnotated = async (dataUrl: string) => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      // Upload annotated image
      const file = new File([blob], `annotated-${editingImage?.filename || 'image.png'}`, {
        type: 'image/png'
      })

      await uploadImage(file)
      setEditingImage(null)
      showToast('Annotated image uploaded!', 'success')
    } catch (error) {
      console.error('Failed to save annotated image:', error)
      showToast('Failed to save annotation', 'error')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="currentColor"/>
            </svg>
            <span>QuickDrop</span>
          </div>
          <nav>
            <a href="https://quickdrop-worker.binodalgopro123.workers.dev" target="_blank">About</a>
            <a href="https://github.com/binodacharya/quickdrop" target="_blank">GitHub</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Upload Section */}
          <section className="upload-section">
            <h1>Share Screenshots Instantly</h1>
            <p className="subtitle">
              Screenshot → Link → Auto-delete in 24h
            </p>

            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="drop-zone-content">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <h3>Drop image here</h3>
                <p>or use one of the options below</p>
              </div>
            </div>

            <ExpiryPicker value={expiryHours} onChange={setExpiryHours} />

            <div className="upload-actions">
              <button
                className="btn btn-primary"
                onClick={captureScreenshot}
                disabled={isUploading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                  <line x1="7" y1="2" x2="7" y2="22"/>
                  <line x1="17" y1="2" x2="17" y2="22"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="2" y1="7" x2="7" y2="7"/>
                  <line x1="2" y1="17" x2="7" y2="17"/>
                  <line x1="17" y1="17" x2="22" y2="17"/>
                  <line x1="17" y1="7" x2="22" y2="7"/>
                </svg>
                {isUploading ? 'Uploading...' : 'Capture Screenshot'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div className="tips">
              <div className="tip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 11H3v2h6v-2zm0 4H3v2h6v-2zm0-8H3v2h6V7zm0-4H3v2h6V3zm12 0h-8v6h8V3zm-2 4h-4V5h4v2zm2 2h-8v10h8V9zm-2 8h-4v-6h4v6z"/>
                </svg>
                <span>Paste image with <kbd>Ctrl+V</kbd> or <kbd>⌘V</kbd></span>
              </div>
              <div className="tip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Links auto-expire after 24 hours</span>
              </div>
            </div>
          </section>

          {/* History Section */}
          {history.length > 0 && (
            <section className="history-section">
              <div className="history-header">
                <h2>Recent Uploads</h2>
                <button className="btn-text" onClick={clearHistory}>
                  Clear All
                </button>
              </div>

              <div className="history-grid">
                {history.map(item => (
                  <div key={item.id} className="history-card">
                    <div className="thumbnail" onClick={() => window.open(item.link, '_blank')} style={{ cursor: 'pointer' }}>
                      <img
                        src={item.thumbnail}
                        alt={item.filename}
                        loading="eager"
                        decoding="async"
                        title="Click to view full image"
                      />
                    </div>
                    <div className="card-content">
                      <h4>{item.filename}</h4>
                      <p className="meta">{formatTime(item.timestamp)}</p>

                      {item.ocrText && (
                        <div className="ocr-section">
                          <div className="ocr-header">
                            <span className="ocr-badge">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 7h16M4 12h16M4 17h10"/>
                              </svg>
                              Text Extracted
                            </span>
                            <button
                              className="btn-copy-text"
                              onClick={() => {
                                navigator.clipboard.writeText(item.ocrText!)
                                showToast('Text copied!', 'success')
                              }}
                              title="Copy extracted text"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                          </div>
                          <pre className="ocr-text">{item.ocrText}</pre>
                        </div>
                      )}

                      <div className="actions">
                        <button onClick={() => copyLink(item.link)} title="Copy link">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                        <button onClick={() => shareLink(item.link, item.filename)} title="Share">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                        </button>
                        <button onClick={() => openLink(item.link)} title="Open">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </button>
                        <button onClick={() => handleEditImage(item.link, item.filename)} title="Edit & Annotate">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => setQrImage({ link: item.link, filename: item.filename })} title="Generate QR Code">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                          </svg>
                        </button>
                        <button onClick={() => deleteRecord(item.id)} className="btn-delete" title="Delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Image Editor Modal */}
      {editingImage && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading editor...</div>}>
          <ImageEditor
            imageUrl={editingImage.url}
            onSave={handleSaveAnnotated}
            onCancel={() => setEditingImage(null)}
          />
        </Suspense>
      )}

      {/* QR Code Modal */}
      {qrImage && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading QR code...</div>}>
          <QRCodeModal
            link={qrImage.link}
            filename={qrImage.filename}
            onClose={() => setQrImage(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
