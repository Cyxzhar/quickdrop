import React from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'
import { UploadProgress } from '../env.d'

interface UploadProgressBarProps {
  progress: UploadProgress
}

export function UploadProgressBar({ progress }: UploadProgressBarProps) {
  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.default', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="primary">Uploading...</Typography>
        <Typography variant="caption" color="text.secondary">{progress.percentage}%</Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={progress.percentage} 
        sx={{ borderRadius: 1, height: 6 }} 
      />
    </Box>
  )
}
