import { useState, useEffect } from 'react'
import { Box, Snackbar, Alert } from '@mui/material'
import type { UploadRecord, AppConfig, UploadProgress, TrayStatus, SortBy, SortOrder } from './env.d'

// Components
import { Header } from './components/Header'
import { NavigationTabs } from './components/NavigationTabs'
import { UploadProgressBar } from './components/UploadProgressBar'
import { HistoryList } from './components/HistoryList'
import { HistoryControls } from './components/HistoryControls'
import { SettingsSection } from './components/SettingsSection'

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState('history')
  const [history, setHistory] = useState<UploadRecord[]>([])
  const [filteredHistory, setFilteredHistory] = useState<UploadRecord[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState<TrayStatus>('idle')
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isCloudflareConfigured, setIsCloudflareConfigured] = useState(false)

  // Enhanced history state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Event listeners
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

  // Filtering logic
  useEffect(() => {
    // 1. Filter
    let results = history
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase()
      results = results.filter(item => 
        item.link.toLowerCase().includes(lowerQuery) || 
        item.filename.toLowerCase().includes(lowerQuery)
      )
    }

    // 2. Sort
    results = [...results].sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })

    setFilteredHistory(results)
  }, [history, searchQuery, sortBy, sortOrder])

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
  }

  const handleCloseToast = () => {
    setToast(null)
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

  const deleteRecord = async (id: string) => {
    if (confirm('Delete this upload from history?')) {
      await window.api.deleteRecord(id)
      setHistory(prev => prev.filter(item => item.id !== id))
      showToast('Deleted from history', 'success')
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

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <Header status={status} />
      
      <NavigationTabs value={activeTab} onChange={setActiveTab} />
      
      {progress && status === 'uploading' && (
        <UploadProgressBar progress={progress} />
      )}

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'history' && (
          <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <HistoryControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onToggleSortOrder={toggleSortOrder}
            />
            
            <HistoryList
              history={filteredHistory}
              onCopy={copyToClipboard}
              onOpen={openLink}
              onDelete={deleteRecord}
              onClearAll={clearHistory}
              searchQuery={searchQuery}
            />
          </Box>
        )}

        {activeTab === 'settings' && config && (
          <Box sx={{ height: '100%', overflowY: 'auto' }}>
            <SettingsSection
              config={config}
              onUpdateConfig={updateConfig}
              isCloudflareConfigured={isCloudflareConfigured}
            />
          </Box>
        )}
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseToast} 
          severity={toast?.type} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default App