import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { HistoryItem } from './HistoryItem'
import { UploadRecord } from '../env.d'

interface HistoryListProps {
  history: UploadRecord[]
  onCopy: (link: string) => void
  onOpen: (link: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onClearAll: () => void
  searchQuery: string
}

export function HistoryList({
  history,
  onCopy,
  onOpen,
  onDelete,
  onRename,
  onClearAll,
  searchQuery
}: HistoryListProps) {
  if (history.length === 0) {
    if (searchQuery) {
      return (
        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.7 }}>
          <Typography variant="h2" sx={{ mb: 2 }}>🔍</Typography>
          <Typography variant="h6">No results found</Typography>
          <Typography variant="body2" color="text.secondary">
            No uploads match your search "{searchQuery}"
          </Typography>
        </Box>
      )
    }

    return (
      <Box sx={{ textAlign: 'center', py: 8, opacity: 0.7 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>📸</Typography>
        <Typography variant="h6">No uploads yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mx: 'auto', mt: 1 }}>
          Take a screenshot and it will automatically be uploaded.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', pb: 10 }}>
      {history.map((item) => (
        <HistoryItem
          key={item.id}
          item={item}
          onCopy={onCopy}
          onOpen={onOpen}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
      
      {history.length > 0 && (
        <Box sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={onClearAll}
          >
            Clear All History
          </Button>
        </Box>
      )}
    </Box>
  )
}
