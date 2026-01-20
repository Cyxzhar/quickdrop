import { useState, useEffect, useCallback } from 'react'
import './styles.css'
import type { UploadRecord, AppConfig, UploadProgress, TrayStatus } from './env.d'

type Tab = 'history' | 'settings'

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('history')
  const [history, setHistory] = useState<UploadRecord[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState<TrayStatus>('idle')
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isCloudflareConfigured, setIsCloudflareConfigured] = useState(false)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Setup event listeners
  useEffect(() => {
    window.api.onUploadSuccess((data) => {
      setHistory(prev => [data.record, ...prev])
      showToast('Link copied to clipboard!', 'success')
    })

    window.api.onStatusChange((newStatus) => {
      setStatus(newStatus)
      if (newStatus === 'idle') {
        setProgress(null)
      }
    })

    window.api.onUploadProgress((newProgress) => {
      setProgress(newProgress)
    })

    window.api.onNavigate((page) => {
      if (page === 'settings') {
        setActiveTab('settings')
      }
    })

    return () => {
      window.api.removeAllListeners('upload-success')
      window.api.removeAllListeners('status-change')
      window.api.removeAllListeners('upload-progress')
      window.api.removeAllListeners('navigate')
    }
  }, [])

  const loadData = async () => {
    try {
      const [historyData, configData, cloudflareStatus] = await Promise.all([
        window.api.getHistory(),
        window.api.getConfig(),
        window.api.isCloudflareConfigured()
      ])
      setHistory(historyData)
      setConfig(configData)
      setIsCloudflareConfigured(cloudflareStatus)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      showToast('Link copied!', 'success')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const openLink = (link: string) => {
    window.open(link, '_blank')
  }

  const clearHistory = async () => {
    if (confirm('Clear all upload history?')) {
      await window.api.clearHistory()
      setHistory([])
      showToast('History cleared', 'success')
    }
  }

  const updateConfig = async (key: keyof AppConfig, value: any) => {
    if (!config) return
    await window.api.setConfig(key, value)
    setConfig({ ...config, [key]: value })

    if (key === 'useMockUploader' || key.startsWith('cloudflare')) {
      const configured = await window.api.isCloudflareConfigured()
      setIsCloudflareConfigured(configured)
    }
  }

  const formatTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const getStatusLabel = (): string => {
    switch (status) {
      case 'idle': return 'Ready'
      case 'uploading': return 'Uploading...'
      case 'success': return 'Uploaded'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">Q</div>
          <h1>QuickDrop</h1>
        </div>
        <div className={`status-badge ${status}`}>
          <span className="status-dot"></span>
          <span>{getStatusLabel()}</span>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      {/* Content */}
      <main className="content">
        {/* Upload Progress */}
        {progress && status === 'uploading' && (
          <div className="upload-progress">
            <div className="progress-header">
              <span>Uploading...</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📸</div>
                <h3>No uploads yet</h3>
                <p>Take a screenshot and it will automatically be uploaded. The link will be copied to your clipboard.</p>
              </div>
            ) : (
              <>
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-item-icon">🖼️</div>
                      <div className="history-item-info">
                        <span
                          className="history-item-link"
                          onClick={() => copyToClipboard(item.link)}
                        >
                          {item.link}
                        </span>
                        <div className="history-item-meta">
                          <span>{formatSize(item.size)}</span>
                          <span>{formatTime(item.timestamp)}</span>
                        </div>
                      </div>
                      <div className="history-item-actions">
                        <button
                          className="btn-icon"
                          onClick={() => copyToClipboard(item.link)}
                          title="Copy link"
                        >
                          📋
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => openLink(item.link)}
                          title="Open in browser"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button className="btn btn-danger" onClick={clearHistory}>
                    Clear History
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && config && (
          <>
            <div className="settings-section">
              <h3>General</h3>
              <div className="settings-card">
                <div className="settings-item">
                  <div className="settings-item-info">
                    <div className="settings-item-label">Auto-upload Screenshots</div>
                    <div className="settings-item-desc">Automatically upload when a screenshot is copied</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.autoUpload}
                      onChange={(e) => updateConfig('autoUpload', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <div className="settings-item-label">Expiry Time</div>
                    <div className="settings-item-desc">How long uploaded images stay active</div>
                  </div>
                  <select
                    className="select"
                    value={config.expiryHours}
                    onChange={(e) => updateConfig('expiryHours', parseInt(e.target.value))}
                    style={{ width: '120px' }}
                  >
                    <option value={1}>1 hour</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Upload Mode</h3>
              <div className="settings-card">
                <div className="settings-item">
                  <div className="settings-item-info">
                    <div className="settings-item-label">Use Mock Uploader</div>
                    <div className="settings-item-desc">For development/testing (links won't actually work)</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.useMockUploader}
                      onChange={(e) => updateConfig('useMockUploader', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {!config.useMockUploader && (
              <div className="settings-section">
                <h3>Cloudflare R2 Configuration</h3>
                <div className="settings-card" style={{ padding: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Account ID</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Your Cloudflare Account ID"
                      value={config.cloudflareAccountId}
                      onChange={(e) => updateConfig('cloudflareAccountId', e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Access Key ID</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="R2 Access Key ID"
                      value={config.cloudflareAccessKeyId}
                      onChange={(e) => updateConfig('cloudflareAccessKeyId', e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Secret Access Key</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="R2 Secret Access Key"
                      value={config.cloudflareSecretAccessKey}
                      onChange={(e) => updateConfig('cloudflareSecretAccessKey', e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">R2 Bucket Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="quickdrop"
                      value={config.cloudflareR2Bucket}
                      onChange={(e) => updateConfig('cloudflareR2Bucket', e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Worker URL</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="https://your-worker.workers.dev"
                      value={config.cloudflareWorkerUrl}
                      onChange={(e) => updateConfig('cloudflareWorkerUrl', e.target.value)}
                    />
                  </div>
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: isCloudflareConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: isCloudflareConfigured ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {isCloudflareConfigured
                      ? '✓ Cloudflare R2 is configured and ready'
                      : '⚠ Complete all fields to enable cloud upload'}
                  </div>
                </div>
              </div>
            )}

            <div className="settings-section">
              <h3>Keyboard Shortcut</h3>
              <div className="settings-card">
                <div className="settings-item">
                  <div className="settings-item-info">
                    <div className="settings-item-label">Show/Hide Window</div>
                    <div className="settings-item-desc">Quick access to QuickDrop</div>
                  </div>
                  <div className="shortcut-hint">
                    <span className="shortcut-key">⌘</span>
                    <span className="shortcut-key">⇧</span>
                    <span className="shortcut-key">Q</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-text">
          QuickDrop v1.0.0 • {config?.useMockUploader ? 'Mock Mode' : 'Cloud Mode'}
        </span>
        <a
          href="https://github.com/quickdrop"
          className="footer-link"
          onClick={(e) => {
            e.preventDefault()
            openLink('https://github.com/quickdrop')
          }}
        >
          GitHub
        </a>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
