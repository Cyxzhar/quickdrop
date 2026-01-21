import React from 'react'
import {
  Card,
  CardContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Tooltip
} from '@mui/material'
import {
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Lock as LockIcon
} from '@mui/icons-material'
import { UploadRecord } from '../env.d'

interface HistoryItemProps {
  item: UploadRecord
  onCopy: (link: string) => void
  onOpen: (link: string) => void
  onDelete: (id: string) => void
}

export function HistoryItem({ item, onCopy, onOpen, onDelete }: HistoryItemProps) {
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

  const isEncrypted = item.filename.endsWith('.enc')

  return (
    <Card sx={{ mb: 1.5, position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '16px !important' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'background.paper',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          {isEncrypted ? <LockIcon color="secondary" /> : <ImageIcon color="primary" />}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="primary"
            noWrap
            sx={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onCopy(item.link)}
          >
            {item.link}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip
              label={formatSize(item.size)}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
            <Chip
              label={formatTime(item.timestamp)}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Copy Link">
            <IconButton size="small" onClick={() => onCopy(item.link)}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in Browser">
            <IconButton size="small" onClick={() => onOpen(item.link)}>
              <OpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(item.id)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  )
}
