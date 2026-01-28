import { QRCodeSVG } from 'qrcode.react'

interface QRCodeModalProps {
  link: string
  filename: string
  onClose: () => void
}

export function QRCodeModal({ link, filename, onClose }: QRCodeModalProps) {
  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = 512
    canvas.height = 512

    img.onload = () => {
      ctx!.fillStyle = '#ffffff'
      ctx!.fillRect(0, 0, 512, 512)
      ctx!.drawImage(img, 0, 0, 512, 512)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `qr-${filename.replace(/\.[^/.]+$/, '')}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>QR Code</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="qr-container">
            <QRCodeSVG
              id="qr-code-svg"
              value={link}
              size={256}
              bgColor="#ffffff"
              fgColor="#030303"
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="qr-info">
            <p className="qr-filename">{filename}</p>
            <p className="qr-link">{link}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={downloadQR}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  )
}
