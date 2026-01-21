import React, { useState } from 'react'
import {
  Card,
  CardContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Tooltip,
  TextField,
  InputAdornment,
  Popover
} from '@mui/material'
import {
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  LocalOffer as TagIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { UploadRecord } from '../env.d'

interface HistoryItemProps {
  item: UploadRecord
  onCopy: (link: string) => void
  onOpen: (link: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
}

export function HistoryItem({ item, onCopy, onOpen, onDelete, onRename, onUpdateTags }: HistoryItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title || item.filename)
  
  // Tag state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [newTag, setNewTag] = useState('')

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

  // Title handlers
  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      onRename(item.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(item.title || item.filename)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveTitle()
    if (e.key === 'Escape') handleCancelEdit()
  }

  // Tag handlers
  const handleAddTagClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseTagPopover = () => {
    setAnchorEl(null)
    setNewTag('')
  }

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = item.tags || []
      if (!currentTags.includes(newTag.trim())) {
        onUpdateTags(item.id, [...currentTags, newTag.trim()])
      }
      handleCloseTagPopover()
    }
  }

  const handleDeleteTag = (tagToDelete: string) => {
    const currentTags = item.tags || []
    onUpdateTags(item.id, currentTags.filter(tag => tag !== tagToDelete))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag()
    }
  }

  return (
    <Card sx={{ mb: 1.5, position: 'relative', overflow: 'visible', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' } }}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: '12px 16px !important' }}>
        {/* Thumbnail or Icon */}
        <Box
          sx={{
            width: 56,
            height: 56,
            bgcolor: 'background.paper',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
            mt: 0.5
          }}
        >
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt="Thumbnail" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            isEncrypted ? <LockIcon color="secondary" /> : <ImageIcon color="primary" />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Title Area */}
          {isEditing ? (
            <TextField
              size="small"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              fullWidth
              variant="outlined"
              sx={{ mb: 0.5 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSaveTitle} color="success"><CheckIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={handleCancelEdit} color="error"><CloseIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                )
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ fontWeight: 600, maxWidth: '100%' }}
                title={item.title || item.filename}
              >
                {item.title || item.filename}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setIsEditing(true)}
                sx={{ opacity: 0, transition: 'opacity 0.2s', padding: 0.5 }}
                className="edit-btn"
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}

          {/* Link */}
          <Typography
            variant="caption"
            color="primary"
            sx={{ display: 'block', mb: 0.5, cursor: 'pointer', fontFamily: 'monospace' }}
            onClick={() => onCopy(item.link)}
          >
            {item.link}
          </Typography>
          
          {/* Meta & Tags */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
            <Chip
              label={formatSize(item.size)}
              size="small"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Chip
              label={formatTime(item.timestamp)}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            
            {/* Display Tags */}
            {item.tags?.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                color="secondary"
                variant="outlined"
                onDelete={() => handleDeleteTag(tag)}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            ))}

            {/* Add Tag Button */}
            <IconButton 
              size="small" 
              onClick={handleAddTagClick}
              sx={{ padding: 0.25, border: '1px dashed rgba(255,255,255,0.2)' }}
              title="Add Tag"
            >
              <AddIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
             <Tooltip title="Delete">
              <IconButton size="small" onClick={() => onDelete(item.id)} color="error" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>

      {/* Add Tag Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseTagPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="New tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            autoFocus
            variant="standard"
            sx={{ width: 100 }}
          />
          <IconButton size="small" onClick={handleAddTag} color="primary">
            <CheckIcon fontSize="small" />
          </IconButton>
        </Box>
      </Popover>

      <style>{`
        .MuiCard-root:hover .edit-btn { opacity: 0.5; }
        .edit-btn:hover { opacity: 1 !important; }
      `}</style>
    </Card>
  )
}
