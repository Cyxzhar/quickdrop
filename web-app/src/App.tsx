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
      let ocrTextExtracted = ''

      // Compress if File and over 500KB
      if (fileOrBlob instanceof File && fileOrBlob.size > 500 * 1024) {
        uploadFile = await compressImage(fileOrBlob)
      }

      // Extract OCR text BEFORE upload (for AI processing)
      try {
        const extractText = await loadOCR()
        ocrTextExtracted = await extractText(uploadFile)
      } catch (err) {
        console.warn('[OCR] Pre-upload extraction failed:', err)
        // Non-fatal, continue with upload
      }

      // Create small thumbnail for localStorage (max 200x200, JPEG)
      const thumbnailDataUrl = await createSmallThumbnail(uploadFile)

      const formData = new FormData()
      formData.append('image', uploadFile, filename || (fileOrBlob as File).name || 'image.png')
      formData.append('expiryHours', expiryHours.toString())

      // Send OCR text to worker for AI processing
      if (ocrTextExtracted) {
        formData.append('ocrText', ocrTextExtracted)
      }

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
        expiresAt: timestamp + expiryHours * 60 * 60 * 1000,
        ocrText: ocrTextExtracted || undefined // Include OCR text if extracted
      }

      // Add to history immediately with small thumbnail
      setHistory(prev => {
        const updated = [record, ...prev]
        // Keep only last 20 items
        if (updated.length > 20) updated.splice(20)
        return updated
      })

      // Try to copy link to clipboard (non-blocking)
      try {
        await navigator.clipboard.writeText(link)
        showToast('Link copied to clipboard!', 'success')
      } catch (clipboardError) {
        // Clipboard access failed (document not focused), but upload succeeded
        console.warn('Clipboard write failed:', clipboardError)
        showToast('Upload successful! Click copy to get link.', 'success')
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
            <i className="ph-fill ph-lightning"></i>
            <span>QuickDrop</span>
          </div>
          <nav>
            <a href="https://quickdrop-landing.pages.dev" target="_blank" rel="noopener noreferrer">
              <i className="ph ph-info"></i>
              <span>About</span>
            </a>
            <a href="https://github.com/binodacharya/quickdrop" target="_blank" rel="noopener noreferrer">
              <i className="ph ph-github-logo"></i>
              <span>GitHub</span>
            </a>
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
                <i className="ph ph-upload-simple" style={{ fontSize: '64px' }}></i>
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
                <i className="ph-bold ph-monitor"></i>
                {isUploading ? 'Uploading...' : 'Capture Screenshot'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <i className="ph-bold ph-image"></i>
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
                <i className="ph-fill ph-keyboard"></i>
                <span>Paste image with <kbd>Ctrl+V</kbd> or <kbd>⌘V</kbd></span>
              </div>
              <div className="tip">
                <i className="ph-fill ph-clock-countdown"></i>
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
                              <i className="ph-bold ph-text-aa"></i>
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
                              <i className="ph-bold ph-copy"></i>
                            </button>
                          </div>
                          <pre className="ocr-text">{item.ocrText}</pre>
                        </div>
                      )}

                      <div className="actions">
                        <button onClick={() => copyLink(item.link)} title="Copy link">
                          <i className="ph-bold ph-copy"></i>
                        </button>
                        <button onClick={() => shareLink(item.link, item.filename)} title="Share">
                          <i className="ph-bold ph-share-network"></i>
                        </button>
                        <button onClick={() => openLink(item.link)} title="Open">
                          <i className="ph-bold ph-arrow-square-out"></i>
                        </button>
                        <button onClick={() => handleEditImage(item.link, item.filename)} title="Edit & Annotate">
                          <i className="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button onClick={() => setQrImage({ link: item.link, filename: item.filename })} title="Generate QR Code">
                          <i className="ph-bold ph-qr-code"></i>
                        </button>
                        <button onClick={() => deleteRecord(item.id)} className="btn-delete" title="Delete">
                          <i className="ph-bold ph-trash"></i>
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
            <i className="ph-fill ph-check-circle"></i>
          ) : (
            <i className="ph-fill ph-x-circle"></i>
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
