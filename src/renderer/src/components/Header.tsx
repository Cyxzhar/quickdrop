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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* SVG Dotted Frame */}
          <Box 
            sx={{ 
              width: 16, 
              height: 16, 
              border: '1.5px dashed rgba(255,255,255,0.8)', 
              borderRadius: 0.5 
            }} 
          />
          {/* SVG Bolt */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-30%, -60%)',
              width: 12,
              height: 16,
              bgcolor: '#F59E0B',
              clipPath: 'polygon(70% 0%, 0% 55%, 45% 55%, 30% 100%, 100% 45%, 55% 45%)'
            }}
          />
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '1rem', 
            fontWeight: 800,
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
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
