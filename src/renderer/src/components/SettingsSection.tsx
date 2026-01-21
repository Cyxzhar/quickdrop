import React from 'react'
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  Alert,
  InputAdornment,
  Chip
} from '@mui/material'
import { AppConfig } from '../env.d'

interface SettingsSectionProps {
  config: AppConfig
  onUpdateConfig: (key: keyof AppConfig, value: any) => void
  isCloudflareConfigured: boolean
}

export function SettingsSection({ config, onUpdateConfig, isCloudflareConfigured }: SettingsSectionProps) {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* General Settings */}
      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          General
        </Typography>
        <Paper sx={{ p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.autoUpload}
                onChange={(e) => onUpdateConfig('autoUpload', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Auto-upload Screenshots</Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatically upload when a screenshot is copied
                </Typography>
              </Box>
            }
            sx={{ width: '100%', mb: 2, alignItems: 'flex-start' }}
          />
          
          <Divider sx={{ my: 2 }} />

          <FormControl fullWidth size="small">
            <InputLabel>Expiry Time</InputLabel>
            <Select
              value={config.expiryHours}
              label="Expiry Time"
              onChange={(e) => onUpdateConfig('expiryHours', Number(e.target.value))}
            >
              <MenuItem value={1}>1 hour</MenuItem>
              <MenuItem value={12}>12 hours</MenuItem>
              <MenuItem value={24}>24 hours</MenuItem>
              <MenuItem value={168}>7 days</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              How long uploaded images stay active
            </Typography>
          </FormControl>
        </Paper>
      </Box>

      {/* Upload Mode */}
      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          Upload Mode
        </Typography>
        <Paper sx={{ p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.useMockUploader}
                onChange={(e) => onUpdateConfig('useMockUploader', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Use Mock Uploader</Typography>
                <Typography variant="caption" color="text.secondary">
                  For development/testing (links won't actually work)
                </Typography>
              </Box>
            }
            sx={{ width: '100%', alignItems: 'flex-start' }}
          />
        </Paper>
      </Box>

      {/* Cloudflare Config */}
      {!config.useMockUploader && (
        <Box>
          <Typography variant="h6" gutterBottom color="primary">
            Cloudflare R2 Configuration
          </Typography>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Account ID"
              value={config.cloudflareAccountId}
              onChange={(e) => onUpdateConfig('cloudflareAccountId', e.target.value)}
              placeholder="Your Cloudflare Account ID"
            />
            <TextField
              fullWidth
              size="small"
              label="Access Key ID"
              value={config.cloudflareAccessKeyId}
              onChange={(e) => onUpdateConfig('cloudflareAccessKeyId', e.target.value)}
              placeholder="R2 Access Key ID"
            />
            <TextField
              fullWidth
              size="small"
              label="Secret Access Key"
              type="password"
              value={config.cloudflareSecretAccessKey}
              onChange={(e) => onUpdateConfig('cloudflareSecretAccessKey', e.target.value)}
              placeholder="R2 Secret Access Key"
            />
            <TextField
              fullWidth
              size="small"
              label="R2 Bucket Name"
              value={config.cloudflareR2Bucket}
              onChange={(e) => onUpdateConfig('cloudflareR2Bucket', e.target.value)}
              placeholder="quickdrop"
            />
            <TextField
              fullWidth
              size="small"
              label="Worker URL"
              value={config.cloudflareWorkerUrl}
              onChange={(e) => onUpdateConfig('cloudflareWorkerUrl', e.target.value)}
              placeholder="https://your-worker.workers.dev"
            />

            <Alert severity={isCloudflareConfigured ? 'success' : 'warning'}>
              {isCloudflareConfigured
                ? 'Cloudflare R2 is configured and ready'
                : 'Complete all fields to enable cloud upload'}
            </Alert>

            <Alert severity="info" sx={{ mt: 1 }}>
              <strong>Privacy Note:</strong> Your keys are stored encrypted locally on your device. We do not have access to your credentials or your files.
            </Alert>
          </Paper>
        </Box>
      )}

      {/* Security */}
      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          Security
        </Typography>
        <Paper sx={{ p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.enablePasswordProtection || false}
                onChange={(e) => onUpdateConfig('enablePasswordProtection', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Password Protection</Typography>
                <Typography variant="caption" color="text.secondary">
                  Encrypt uploads with a password
                </Typography>
              </Box>
            }
            sx={{ width: '100%', mb: config.enablePasswordProtection ? 2 : 0, alignItems: 'flex-start' }}
          />

          {config.enablePasswordProtection && (
            <TextField
              fullWidth
              size="small"
              label="Default Password"
              type="password"
              value={config.defaultPassword || ''}
              onChange={(e) => onUpdateConfig('defaultPassword', e.target.value)}
              helperText="This password will be required to view your uploads."
            />
          )}
        </Paper>
      </Box>

      {/* Keyboard Shortcut */}
      <Box>
        <Typography variant="h6" gutterBottom color="primary">
          Keyboard Shortcut
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body1">Show/Hide Window</Typography>
              <Typography variant="caption" color="text.secondary">
                Quick access to QuickDrop
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label="⌘" size="small" variant="outlined" />
              <Chip label="⇧" size="small" variant="outlined" />
              <Chip label="Q" size="small" variant="outlined" />
            </Box>
          </Box>
        </Paper>
      </Box>
      
      <Box sx={{ height: 20 }} /> {/* Bottom spacing */}
    </Box>
  )
}
