import React from 'react'
import { Box, Typography, Badge } from '@mui/material'
import { TrayStatus } from '../env.d'

interface HeaderProps {
  status: TrayStatus
}

export function Header({ status }: HeaderProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'idle': return 'success.main'
      case 'uploading': return 'warning.main'
      case 'success': return 'success.main'
      case 'error': return 'error.main'
      default: return 'text.secondary'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'idle': return 'Ready'
      case 'uploading': return 'Uploading...'
      case 'success': return 'Uploaded'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  return (
    <Box
      sx={{
        height: 50,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        WebkitAppRegion: 'drag' // Allow dragging window
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            bgcolor: 'primary.main',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: 14,
            color: 'white'
          }}
        >
          Q
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>
          QuickDrop
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: getStatusColor(),
            boxShadow: `0 0 8px ${status === 'uploading' ? 'orange' : 'transparent'}`
          }}
        />
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {getStatusLabel()}
        </Typography>
      </Box>
    </Box>
  )
}
